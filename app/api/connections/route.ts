import { getAppUser } from '../../auth';
import { database } from '@/lib/database';
import { dispatchNotifications,emailConfigured,notify } from '@/lib/notifications';
import { z } from 'zod';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('proposal'),id:z.string().min(1).max(100),version:z.number().int().min(0),amount:z.number().int().min(1).max(1000000000),terms:z.string().trim().min(20).max(3000),consent:z.literal(true)}),
 z.object({action:z.literal('decision'),id:z.string().min(1).max(100),version:z.number().int().min(1),status:z.enum(['acknowledged','declined','withdrawn']),consent:z.literal(true)}),
 z.object({action:z.literal('preferences'),enabled:z.boolean()}),z.object({action:z.literal('retry')})]);
type Current={introduction_id:string;version:number;author:string;amount:number;terms:string;status:string;event_id:string;updated:string};
async function read(owner:string,id:string|null){
 const db=database();
 if(!id){const pref=await db.prepare('SELECT enabled FROM notification_preferences WHERE owner=?').bind(owner).first<{enabled:number}>();const notices=await db.prepare('SELECT id,introduction_id,title,status,created FROM notifications WHERE owner=? ORDER BY created DESC LIMIT 30').bind(owner).all();return {emailEnabled:!!pref?.enabled,emailConfigured:emailConfigured(),notifications:notices.results};}
 const intro=await db.prepare("SELECT * FROM introductions WHERE id=? AND (sender=? OR recipient=?) AND status='accepted'").bind(id,owner,owner).first();
 if(!intro)return null;
 const current=await db.prepare('SELECT * FROM negotiations WHERE introduction_id=?').bind(id).first<Current>();
 const events=await db.prepare('SELECT version,author,author_name,amount,terms,status,created FROM negotiation_events WHERE introduction_id=? ORDER BY version').bind(id).all();
 return {current:current?{version:current.version,amount:current.amount,terms:current.terms,status:current.status,mine:current.author===owner}:null,events:events.results.map(e=>({...e,mine:e.author===owner}))};
}
export async function GET(request:Request){try{const user=await getAppUser();if(!user)return json({error:'Sign in to view connections.'},401);const result=await read(user.userId,new URL(request.url).searchParams.get('id'));return result?json(result):json({error:'Accepted connection unavailable.'},404);}catch{return json({error:'Connections are temporarily unavailable.'},503);}}
export async function POST(request:Request){
 try{
 const user=await getAppUser();if(!user)return json({error:'Sign in to continue.'},401);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Request origin could not be verified.'},403);
 if(Number(request.headers.get('content-length')||0)>12000)return json({error:'Request too large.'},413);
 const raw=await request.text();if(raw.length>12000)return json({error:'Request too large.'},413);
 let parsed;try{parsed=schema.safeParse(JSON.parse(raw));}catch{return json({error:'Invalid request.'},400);}
 if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Check your input.'},400);
 const a=parsed.data, db=database(), owner=user.userId;
 if(a.action==='preferences'){
  if(a.enabled&&(!user.email||!user.emailVerified))return json({error:'Verify your primary email in your sign-in account before enabling notifications.'},400);
  await db.batch([db.prepare("UPDATE notifications SET status='skipped' WHERE owner=? AND status='pending'").bind(owner),db.prepare('INSERT INTO notification_preferences (owner,email,enabled) VALUES (?,?,?) ON CONFLICT(owner) DO UPDATE SET email=excluded.email,enabled=excluded.enabled').bind(owner,user.email,a.enabled?1:0)]);
  return json(await read(owner,null));
 }
 if(a.action==='retry'){await dispatchNotifications(owner);return json(await read(owner,null));}
 const intro=await db.prepare("SELECT sender,recipient FROM introductions WHERE id=? AND (sender=? OR recipient=?) AND status='accepted'").bind(a.id,owner,owner).first<{sender:string;recipient:string}>();
 if(!intro)return json({error:'Only participants of an accepted connection can negotiate.'},404);
 const current=await db.prepare('SELECT * FROM negotiations WHERE introduction_id=?').bind(a.id).first<Current>();
 if((current?.version??0)!==a.version)return json({error:'The proposal changed. Refresh before responding.'},409);
 if(a.version>=50)return json({error:'This connection has reached its proposal history limit.'},400);
 if(a.action==='decision'&&(!current||current.status!=='open'))return json({error:'This proposal is no longer open.'},409);
 if(a.action==='decision'&&(a.status==='withdrawn'?current!.author!==owner:current!.author===owner))return json({error:'You cannot make this decision on this proposal.'},403);
 if(a.action==='proposal'&&current?.status==='open'&&current.author===owner)return json({error:'Withdraw your current proposal before replacing it.'},409);
 const version=a.version+1,event=crypto.randomUUID(),now=new Date().toISOString(),status=a.action==='proposal'?'open':a.status, amount=a.action==='proposal'?a.amount:current!.amount,terms=a.action==='proposal'?a.terms:current!.terms;
 const write=db.prepare('INSERT INTO negotiations (introduction_id,version,author,amount,terms,status,event_id,updated) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(introduction_id) DO UPDATE SET version=excluded.version,author=excluded.author,amount=excluded.amount,terms=excluded.terms,status=excluded.status,event_id=excluded.event_id,updated=excluded.updated WHERE negotiations.version=?').bind(a.id,version,a.action==='proposal'?owner:current!.author,amount,terms,status,event,now,a.version);
 const history=db.prepare('INSERT INTO negotiation_events (id,introduction_id,version,author,author_name,amount,terms,status,created) SELECT ?,introduction_id,version,?,?,amount,terms,status,updated FROM negotiations WHERE introduction_id=? AND event_id=?').bind(event,owner,user.displayName.slice(0,120),a.id,event);
 const results=await db.batch([write,history]);if(!results[0].meta.changes)return json({error:'Another response arrived first. Refresh your connection.'},409);
 await notify(intro.sender===owner?intro.recipient:intro.sender,a.id,a.action==='proposal'?'A new private proposal is ready to review':'Your private proposal has a response');
 return json(await read(owner,a.id));
 }catch{console.error('Connection change failed');return json({error:'Unable to save this change. Please retry.'},503);}
}
