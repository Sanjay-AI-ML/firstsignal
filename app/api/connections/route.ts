import { getAppUser } from '../../auth';
import { database } from '@/lib/database';
import { dispatchNotifications,notificationSettings,setNotificationPreferences,notificationStatements } from '@/lib/notifications';
import { notificationBody } from '@/lib/notification-security';
import { z } from 'zod';
import { membersBlocked } from '@/lib/member-safety';
import { validDate } from '@/lib/validation';
import { getRequestId, createTimingTracker } from '@/lib/monitoring';
import { makeOperation, readOperation, operationClaim, operationGuard, operationCleanup } from '@/lib/idempotency';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200,extraHeaders:Record<string,string>={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...extraHeaders}});
const activeAccountSql="NOT EXISTS (SELECT 1 FROM account_closures WHERE owner=? AND status='requested')";
const closureMessage='Your closure request is awaiting review. Cancel it in My profile before starting new activity.';
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('proposal'),id:z.string().min(1).max(100),version:z.number().int().min(0),amount:z.number().int().min(1).max(1000000000),terms:z.string().trim().min(20).max(3000),operationId:z.string().min(1).max(100).optional(),consent:z.literal(true)}),
 z.object({action:z.literal('decision'),id:z.string().min(1).max(100),version:z.number().int().min(1),status:z.enum(['acknowledged','declined','withdrawn']),consent:z.literal(true)}),
 z.object({action:z.literal('nextStep'),id:z.string().min(1).max(100),note:z.string().trim().max(500),date:z.string().refine(v=>v===''||validDate(v),'Choose a valid calendar date.')}),
 z.object({action:z.literal('preferences'),enabled:z.boolean()}),z.object({action:z.literal('retry')})]);
type Current={introduction_id:string;version:number;author:string;amount:number;terms:string;status:string;event_id:string;updated:string};
async function read(owner:string,id:string|null,user?:{userId:string;email:string;emailVerified:boolean}){
 const db=database();
 if(!id)return notificationSettings(user!);
 const intro=await db.prepare("SELECT sender,recipient FROM introductions WHERE id=? AND (sender=? OR recipient=?) AND status='accepted'").bind(id,owner,owner).first<{sender:string;recipient:string}>();
 if(!intro)return null;
 const current=await db.prepare('SELECT * FROM negotiations WHERE introduction_id=?').bind(id).first<Current>();
 const events=await db.prepare('SELECT version,author,author_name,amount,terms,status,created FROM negotiation_events WHERE introduction_id=? ORDER BY version').bind(id).all();
 const nextStep=await db.prepare('SELECT note,date FROM connection_next_steps WHERE owner=? AND introduction_id=?').bind(owner,id).first<{note:string;date:string}>();
 return {current:current?{version:current.version,amount:current.amount,terms:current.terms,status:current.status,mine:current.author===owner}:null,events:events.results.map(({author,...e})=>({...e,mine:author===owner})),blocked:await membersBlocked(owner,intro.sender===owner?intro.recipient:intro.sender),nextStep};
}
export async function GET(request:Request){try{const user=await getAppUser();if(!user)return json({error:'Sign in to view connections.'},401);const result=await read(user.userId,new URL(request.url).searchParams.get('id'),user);return result?json(result):json({error:'Accepted connection unavailable.'},404);}catch{return json({error:'Connections are temporarily unavailable.'},503);}}
export async function POST(request:Request){
 const timer=createTimingTracker();const requestId=getRequestId(request);const timingHeaders={'X-Request-Id':requestId,'Server-Timing':timer.header()};
 try{
 const user=await getAppUser();if(!user)return json({error:'Sign in to continue.'},401,timingHeaders);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Request origin could not be verified.'},403,timingHeaders);
 const raw=await notificationBody(request,12000);if(raw===null)return json({error:'Request too large.'},413,timingHeaders);
 let parsed;try{parsed=schema.safeParse(JSON.parse(raw));}catch{return json({error:'Invalid request.'},400,timingHeaders);}
 if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Check your input.'},400,timingHeaders);
 const a=parsed.data, db=database(), owner=user.userId;
 if(!(a.action==='preferences'&&!a.enabled)&&await db.prepare("SELECT 1 FROM account_closures WHERE owner=? AND status='requested'").bind(owner).first())return json({error:closureMessage},409,timingHeaders);
 if(a.action==='preferences'){
  const refused=await setNotificationPreferences(user,a.enabled);if(refused)return json({error:refused.error},refused.status,timingHeaders);
  return json(await read(owner,null,user),200,timingHeaders);
 }
 if(a.action==='retry'){await dispatchNotifications(owner,1);return json(await read(owner,null,user),200,timingHeaders);}
 const intro=await db.prepare("SELECT sender,recipient FROM introductions WHERE id=? AND (sender=? OR recipient=?) AND status='accepted'").bind(a.id,owner,owner).first<{sender:string;recipient:string}>();
 if(!intro)return json({error:'Only participants of an accepted connection can negotiate.'},404,timingHeaders);
 if(a.action==='nextStep'){
  // Another tab can request closure after the initial check. Each mutation
  // rechecks the durable account state in the same SQLite statement.
  const result=!a.note&&!a.date
   ?await db.prepare(`DELETE FROM connection_next_steps WHERE owner=? AND introduction_id=? AND ${activeAccountSql}`).bind(owner,a.id,owner).run()
   :await db.prepare(`INSERT INTO connection_next_steps (owner,introduction_id,note,date,updated) SELECT ?,?,?,?,? WHERE ${activeAccountSql} ON CONFLICT(owner,introduction_id) DO UPDATE SET note=excluded.note,date=excluded.date,updated=excluded.updated WHERE ${activeAccountSql}`).bind(owner,a.id,a.note,a.date,new Date().toISOString(),owner,owner).run();
  if(!result.meta.changes&&await db.prepare("SELECT 1 FROM account_closures WHERE owner=? AND status='requested'").bind(owner).first())return json({error:closureMessage},409,timingHeaders);
  return json(await read(owner,a.id),200,timingHeaders);
 }
 const other=intro.sender===owner?intro.recipient:intro.sender;
 if(await membersBlocked(owner,other))return json({error:'This member is blocked. New proposals and responses are disabled.'},403,timingHeaders);
 const operation=await makeOperation(owner,a.action==='proposal'?a.operationId:undefined,a.action,a,new Date().toISOString());
 const prior=await readOperation(db,operation);
 if(prior.kind==='conflict')return json({error:'This operation ID was used for different details. Start a new submission.'},409,timingHeaders);
 if(prior.kind==='replay')return json(await read(owner,a.id),200,timingHeaders);
 const guard=operationGuard(operation);
 const current=await db.prepare('SELECT * FROM negotiations WHERE introduction_id=?').bind(a.id).first<Current>();
 if((current?.version??0)!==a.version)return json({error:'The proposal changed. Refresh before responding.'},409,timingHeaders);
 if(a.version>=50)return json({error:'This connection has reached its proposal history limit.'},400,timingHeaders);
 if(a.action==='decision'&&(!current||current.status!=='open'))return json({error:'This proposal is no longer open.'},409,timingHeaders);
 if(a.action==='decision'&&(a.status==='withdrawn'?current!.author!==owner:current!.author===owner))return json({error:'You cannot make this decision on this proposal.'},403,timingHeaders);
 if(a.action==='proposal'&&current?.status==='open'&&current.author===owner)return json({error:'Withdraw your current proposal before replacing it.'},409,timingHeaders);
 const version=a.version+1,event=crypto.randomUUID(),now=new Date().toISOString(),status=a.action==='proposal'?'open':a.status, amount=a.action==='proposal'?a.amount:current!.amount,terms=a.action==='proposal'?a.terms:current!.terms;
 const write=db.prepare(`INSERT INTO negotiations (introduction_id,version,author,amount,terms,status,event_id,updated)
 SELECT ?,?,?,?,?,?,?,? WHERE ${guard.sql} AND ${activeAccountSql} AND NOT EXISTS (SELECT 1 FROM member_blocks WHERE (owner=? AND target_owner=?) OR (owner=? AND target_owner=?))
 ON CONFLICT(introduction_id) DO UPDATE SET version=excluded.version,author=excluded.author,amount=excluded.amount,terms=excluded.terms,status=excluded.status,event_id=excluded.event_id,updated=excluded.updated
 WHERE negotiations.version=? AND ${guard.sql} AND ${activeAccountSql} AND NOT EXISTS (SELECT 1 FROM member_blocks WHERE (owner=? AND target_owner=?) OR (owner=? AND target_owner=?))`)
 .bind(a.id,version,a.action==='proposal'?owner:current!.author,amount,terms,status,event,now,...guard.values,owner,owner,other,other,owner,a.version,...guard.values,owner,owner,other,other,owner);
 const history=db.prepare('INSERT INTO negotiation_events (id,introduction_id,version,author,author_name,amount,terms,status,created) SELECT ?,introduction_id,version,?,?,amount,terms,status,updated FROM negotiations WHERE introduction_id=? AND event_id=?').bind(event,owner,user.displayName.slice(0,120),a.id,event);
 const claims=operationClaim(db,operation,{proposalVersion:version});
 const results=await db.batch([...claims,write,history,...notificationStatements(other,a.id,a.action==='proposal'?'A new private proposal is ready to review':'Your private proposal has a response'),...operationCleanup(db,operation,'SELECT 1 FROM negotiations WHERE introduction_id=? AND event_id=?',[a.id,event])]);
 if(!results[claims.length].meta.changes){
  if(await db.prepare("SELECT 1 FROM account_closures WHERE owner=? AND status='requested'").bind(owner).first())return json({error:closureMessage},409,timingHeaders);
  const raced=await readOperation(db,operation);
  if(raced.kind==='replay')return json(await read(owner,a.id),200,timingHeaders);
  return json({error:raced.kind==='conflict'?'This operation ID was used for different details.':'Another response arrived first. Refresh your connection.'},409,timingHeaders);
 }
 const responseData=await read(owner,a.id);
 return json(responseData,200,{'X-Request-Id':requestId,'Server-Timing':timer.header()});
 }catch{console.error('Connection change failed');return json({error:'Unable to save this change. Please retry.'},503,timingHeaders);}
}
