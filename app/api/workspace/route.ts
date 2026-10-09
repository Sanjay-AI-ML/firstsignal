import { getAppUser } from '../../auth';
import { notify } from '@/lib/notifications';
import { database } from '@/lib/database';
import { seedProfiles,type Profile } from '@/lib/data';
import { actionSchema } from '@/lib/validation';
import { membersBlocked } from '@/lib/member-safety';
export const dynamic='force-dynamic';
type Stored={id:string;owner:string;kind:string;data:string;listed:number;updated:string};
type RequestRow={id:string;sender:string;recipient:string|null;profile_id:string;target_name:string;sender_name:string;message:string;status:string;created:string;updated:string;activity?:string;blocked?:number;proposal_status?:string;proposal_amount?:number;proposal_author?:string;proposal_version?:number;next_note?:string;next_date?:string};
type Progress={id:string;profile_id:string;date:string;title:string;body:string;created:string};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
function profile(row:Stored,userId?:string,updates:Profile['updates']=[]):Profile{const data=JSON.parse(row.data);return {...data,id:row.id,kind:row.kind,updates,demo:false,mine:row.owner===userId,listed:!!row.listed,updated:row.updated,evidenceDate:data.evidenceDate??''};}
async function state(userId?:string){
 const db=database();
 const rows=await (userId?db.prepare('SELECT p.* FROM profiles p WHERE listed=1 AND NOT EXISTS (SELECT 1 FROM member_blocks b WHERE (b.owner=? AND b.target_owner=p.owner) OR (b.owner=p.owner AND b.target_owner=?)) ORDER BY updated DESC LIMIT 200').bind(userId,userId):db.prepare('SELECT * FROM profiles WHERE listed=1 ORDER BY updated DESC LIMIT 200')).all<Stored>();
 const owned=userId?await db.prepare('SELECT * FROM profiles WHERE owner=? ORDER BY updated DESC').bind(userId).all<Stored>():{results:[]};
 const visibleIds=[...new Set([...rows.results,...owned.results].map(r=>r.id))];
 const progressQueries=[];
 for(let offset=0;offset<visibleIds.length;offset+=100){const ids=visibleIds.slice(offset,offset+100);progressQueries.push(db.prepare(`SELECT id,profile_id,date,title,body,created FROM progress_updates WHERE profile_id IN (${ids.map(()=>'?').join(',')}) ORDER BY date DESC,created DESC LIMIT 2000`).bind(...ids));}
 const progress=progressQueries.length?(await db.batch<Progress>(progressQueries)).flatMap(result=>result.results):[];
 const updates=(id:string)=>progress.filter(p=>p.profile_id===id).map(({id,date,title,body,created})=>({id,date,title,body,created}));
 const all=rows.results.map(r=>profile(r,userId,updates(r.id)));
 if(!userId)return {profiles:[...all,...seedProfiles],savedIds:[],myProfiles:[],requests:[],blockedProfiles:[],reports:[]};
 const [saved,requests,blocked,reports]=await Promise.all([
 db.prepare('SELECT profile_id FROM saves WHERE owner=?').bind(userId).all<{profile_id:string}>(),
 db.prepare(`SELECT r.*,n.status AS proposal_status,n.amount AS proposal_amount,n.author AS proposal_author,n.version AS proposal_version,ns.note AS next_note,ns.date AS next_date,
 MAX(r.updated,COALESCE(n.updated,r.updated),COALESCE((SELECT MAX(m.created) FROM messages m WHERE m.introduction_id=r.id),r.updated),COALESCE(ns.updated,r.updated)) AS activity,
 EXISTS(SELECT 1 FROM member_blocks b WHERE (b.owner=? AND b.target_owner=CASE WHEN r.sender=? THEN r.recipient ELSE r.sender END) OR (b.target_owner=? AND b.owner=CASE WHEN r.sender=? THEN r.recipient ELSE r.sender END)) AS blocked
 FROM introductions r LEFT JOIN negotiations n ON n.introduction_id=r.id LEFT JOIN connection_next_steps ns ON ns.introduction_id=r.id AND ns.owner=? WHERE r.sender=? OR r.recipient=? ORDER BY activity DESC LIMIT 100`).bind(userId,userId,userId,userId,userId,userId,userId).all<RequestRow>(),
 db.prepare('SELECT profile_id,target_name,created FROM member_blocks WHERE owner=? ORDER BY created DESC LIMIT 100').bind(userId).all<{profile_id:string;target_name:string;created:string}>(),
 db.prepare('SELECT id,profile_id,reason,status,created FROM member_reports WHERE owner=? ORDER BY created DESC LIMIT 100').bind(userId).all()
 ]);
 const requestIds=requests.results.map(r=>r.id);
 const notes=requestIds.length?await db.prepare(`SELECT id,introduction_id,sender,sender_name,body,created FROM messages WHERE introduction_id IN (${requestIds.map(()=>'?').join(',')}) ORDER BY created ASC LIMIT 10000`).bind(...requestIds).all<{id:string;introduction_id:string;sender:string;sender_name:string;body:string;created:string}>():{results:[]};
 return {profiles:[...all,...seedProfiles],myProfiles:owned.results.map(r=>profile(r,userId,updates(r.id))),savedIds:saved.results.map(r=>r.profile_id),blockedProfiles:blocked.results.map(r=>({profileId:r.profile_id,name:r.target_name,created:r.created})),reports:reports.results.map(r=>({id:r.id,profileId:r.profile_id,reason:r.reason,status:r.status,created:r.created})),requests:requests.results.map(r=>({id:r.id,profileId:r.profile_id,targetName:r.target_name,senderName:r.sender_name,message:r.message,status:r.status,created:r.created,updated:r.activity??r.updated,blocked:!!r.blocked,proposal:r.proposal_status?{status:r.proposal_status,amount:r.proposal_amount,mine:r.proposal_author===userId,version:r.proposal_version}:undefined,nextStep:r.next_note||r.next_date?{note:r.next_note??'',date:r.next_date??''}:undefined,direction:r.recipient===userId?'incoming':'outgoing',messages:notes.results.filter(m=>m.introduction_id===r.id).map(m=>({id:m.id,body:m.body,senderName:m.sender_name,created:m.created,mine:m.sender===userId}))}))};
}
export async function GET(){try{const user=await getAppUser();return json(await state(user?.userId));}catch(e){console.error('Workspace read failed',e);return json({error:"We couldn't load your workspace. Please retry."},503);}}
export async function POST(request:Request){
 let user;try{user=await getAppUser();}catch{console.error('Authentication service unavailable');return json({error:'Sign-in is temporarily unavailable. Please retry.'},503);}if(!user)return json({error:'Sign in to save changes.'},401);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:"This request couldn't be verified. Reload and try again."},403);
 if(Number(request.headers.get('content-length')??0)>20000)return json({error:'This request is too large.'},413);
 let raw:string;try{raw=await request.text();}catch{return json({error:'Unable to read your request.'},400);}if(raw.length>20000)return json({error:'This request is too large.'},413);
 let parsed;try{parsed=actionSchema.safeParse(JSON.parse(raw));}catch{return json({error:'Please submit valid form information.'},400);}if(!parsed.success)return json({error:parsed.error.issues[0]?.message??'Check your form.'},400);
 try{
 const db=database(),a=parsed.data,now=new Date().toISOString(),owner=user.userId;
 if(a.action==='profile'){
  const current=await db.prepare('SELECT id FROM profiles WHERE owner=? AND kind=?').bind(owner,a.profile.kind).first<{id:string}>();
  await db.prepare('INSERT INTO profiles (id,owner,kind,data,listed,updated) VALUES (?,?,?,?,?,?) ON CONFLICT(owner,kind) DO UPDATE SET data=excluded.data,listed=excluded.listed,updated=excluded.updated').bind(current?.id??crypto.randomUUID(),owner,a.profile.kind,JSON.stringify(a.profile),a.listed?1:0,now).run();
 }
 if(a.action==='progress'||a.action==='removeProgress'){
  const own=await db.prepare("SELECT id FROM profiles WHERE id=? AND owner=? AND kind='startup'").bind(a.profileId,owner).first();
  if(!own)return json({error:'Only the founder who owns this profile can change its updates.'},404);
  if(a.action==='progress'){
   const result=await db.prepare('INSERT INTO progress_updates (id,profile_id,date,title,body,created) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM progress_updates WHERE profile_id=?)<20').bind(crypto.randomUUID(),a.profileId,a.date,a.title,a.body,now,a.profileId).run();
   if(!result.meta.changes)return json({error:'This profile has 20 updates. Remove an old update before adding another.'},400);
  }else{
   const result=await db.prepare('DELETE FROM progress_updates WHERE id=? AND profile_id=?').bind(a.updateId,a.profileId).run();
   if(!result.meta.changes)return json({error:'This update is unavailable.'},404);
  }
  await db.prepare('UPDATE profiles SET updated=? WHERE id=? AND owner=?').bind(now,a.profileId,owner).run();
 }
 if(a.action==='block'||a.action==='report'||a.action==='blockConnection'||a.action==='reportConnection'){
  if(a.action==='block'&&!a.blocked){await db.prepare('DELETE FROM member_blocks WHERE owner=? AND profile_id=?').bind(owner,a.profileId).run();return json(await state(owner));}
  let target:{id:string;owner:string;name:string}|null=null;
  if(a.action==='blockConnection'||a.action==='reportConnection'){
   const intro=await db.prepare("SELECT sender,recipient,sender_name,target_name FROM introductions WHERE id=? AND status='accepted' AND recipient IS NOT NULL AND (sender=? OR recipient=?)").bind(a.id,owner,owner).first<{sender:string;recipient:string;sender_name:string;target_name:string}>();
   if(intro)target={id:`connection:${a.id}`,owner:intro.sender===owner?intro.recipient:intro.sender,name:intro.sender===owner?intro.target_name:intro.sender_name};
  }else{
   const stored=await db.prepare(`SELECT p.* FROM profiles p WHERE p.id=? AND (p.listed=1 OR EXISTS (SELECT 1 FROM introductions i WHERE i.status='accepted' AND ((i.sender=? AND i.recipient=p.owner) OR (i.recipient=? AND i.sender=p.owner))))`).bind(a.profileId,owner,owner).first<Stored>();
   if(stored)target={id:stored.id,owner:stored.owner,name:profile(stored).name};
  }
  if(!target)return json({error:'This member profile is unavailable.'},404);
  if(target.owner===owner)return json({error:'You cannot report or block your own profile.'},400);
  if(a.action==='block'||a.action==='blockConnection'){
   if(!a.blocked){await db.prepare('DELETE FROM member_blocks WHERE owner=? AND target_owner=?').bind(owner,target.owner).run();return json(await state(owner));}
   const result=await db.prepare('INSERT INTO member_blocks (owner,target_owner,profile_id,target_name,created) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM member_blocks WHERE owner=?)<100 ON CONFLICT(owner,target_owner) DO NOTHING').bind(owner,target.owner,target.id,target.name,now,owner).run();
   if(!result.meta.changes&&!await db.prepare('SELECT 1 FROM member_blocks WHERE owner=? AND target_owner=?').bind(owner,target.owner).first())return json({error:'Your block list is full. Unblock a member before adding another.'},400);
   await db.batch([db.prepare('DELETE FROM saves WHERE (owner=? AND profile_id IN (SELECT id FROM profiles WHERE owner=?)) OR (owner=? AND profile_id IN (SELECT id FROM profiles WHERE owner=?))').bind(owner,target.owner,target.owner,owner),db.prepare("UPDATE notifications SET status='skipped' WHERE status='pending' AND introduction_id IN (SELECT id FROM introductions WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?))").bind(owner,target.owner,target.owner,owner)]);
  }else{
   const result=await db.prepare("INSERT INTO member_reports (id,owner,target_owner,profile_id,reason,details,status,created) SELECT ?,?,?,?,?,?,'submitted',? WHERE (SELECT COUNT(*) FROM member_reports WHERE owner=? AND created>?)<10").bind(crypto.randomUUID(),owner,target.owner,target.id,a.reason,a.details,now,owner,new Date(Date.now()-86400000).toISOString()).run();
   if(!result.meta.changes)return json({error:"You've reached today's report limit. Try again tomorrow."},429);
  }
 }
 if(a.action==='save'||a.action==='request'){
  const seed=seedProfiles.find(p=>p.id===a.profileId),stored=seed?null:await db.prepare('SELECT * FROM profiles WHERE id=? AND listed=1').bind(a.profileId).first<Stored>();
  if((!seed&&!stored||stored&&await membersBlocked(owner,stored.owner))&&!(a.action==='save'&&!a.saved))return json({error:'This profile is no longer available.'},404);
  if(a.action==='save'){
   if(a.saved){const count=await db.prepare('SELECT COUNT(*) AS n FROM saves WHERE owner=?').bind(owner).first<{n:number}>();if((count?.n??0)>=200)return json({error:'Your shortlist is full. Remove a saved profile first.'},400);await db.prepare('INSERT INTO saves (owner,profile_id,created) VALUES (?,?,?) ON CONFLICT(owner,profile_id) DO NOTHING').bind(owner,a.profileId,now).run();}
   else await db.prepare('DELETE FROM saves WHERE owner=? AND profile_id=?').bind(owner,a.profileId).run();
  }else{
   if(stored?.owner===owner)return json({error:'You cannot request an introduction to your own profile.'},400);
   const target=seed??profile(stored!),existing=await db.prepare('SELECT id,status FROM introductions WHERE sender=? AND profile_id=?').bind(owner,a.profileId).first();if(existing)return json({error:'You already have a request for this profile. Find it in Connections.'},409);
   const count=await db.prepare('SELECT COUNT(*) AS n FROM introductions WHERE sender=? AND created>?').bind(owner,new Date(Date.now()-86400000).toISOString()).first<{n:number}>();if((count?.n??0)>=20)return json({error:"You've reached today's request limit. Try again tomorrow."},429);
   const introductionId=crypto.randomUUID();
   const result=await db.prepare('INSERT INTO introductions (id,sender,recipient,profile_id,target_name,sender_name,message,status,created,updated) SELECT ?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM member_blocks WHERE (owner=? AND target_owner=?) OR (owner=? AND target_owner=?))').bind(introductionId,owner,stored?.owner??null,target.id,target.name,user.displayName.slice(0,120),a.message,seed?'draft':'pending',now,now,owner,stored?.owner??null,stored?.owner??null,owner).run();
   if(!result.meta.changes)return json({error:'This member connection is unavailable.'},403);
   await notify(stored?.owner??null,introductionId,'You have a new introduction request');
  }
 }
 if(a.action==='respond'||a.action==='message'){
  const intro=await db.prepare('SELECT * FROM introductions WHERE id=? AND (sender=? OR recipient=?)').bind(a.id,owner,owner).first<RequestRow>();if(!intro)return json({error:'This conversation is unavailable.'},404);
  const other=intro.sender===owner?intro.recipient:intro.sender;
  if(await membersBlocked(owner,other))return json({error:'This member is blocked. New requests, messages and proposals are disabled.'},403);
  if(a.action==='respond'){
   if(intro.status!=='pending')return json({error:'This request is no longer pending.'},409);if(a.status==='withdrawn'?intro.sender!==owner:intro.recipient!==owner)return json({error:'You cannot change this request.'},403);
   const result=await db.prepare("UPDATE introductions SET status=?,updated=? WHERE id=? AND status='pending' AND NOT EXISTS (SELECT 1 FROM member_blocks WHERE (owner=? AND target_owner=?) OR (owner=? AND target_owner=?))").bind(a.status,now,a.id,owner,other,other,owner).run();if(!result.meta.changes)return json({error:'The request changed. Reload to see its status.'},409);await notify(other,a.id,'Your introduction request has an update');
  }else{
   if(intro.status!=='accepted')return json({error:'Both parties must accept before messaging.'},403);
   const result=await db.prepare("INSERT INTO messages (id,introduction_id,sender,sender_name,body,created) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM messages WHERE introduction_id=?)<100 AND NOT EXISTS (SELECT 1 FROM member_blocks WHERE (owner=? AND target_owner=?) OR (owner=? AND target_owner=?))").bind(crypto.randomUUID(),a.id,owner,user.displayName.slice(0,120),a.body,now,a.id,owner,other,other,owner).run();if(!result.meta.changes)return json({error:'Messaging is unavailable or this conversation has reached its message limit.'},400);await notify(other,a.id,'You have a new connection message');
  }
 }
 return json(await state(owner));
 }catch(e){console.error('Workspace write failed',e);return json({error:"We couldn't save that change. Your input is still here; please retry."},503);}
}
