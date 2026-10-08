import { env } from 'cloudflare:workers';
import { database } from './database';
const config=()=>env as unknown as Record<string,string>;
export function emailConfigured(){const e=config();return !!(e.RESEND_API_KEY&&e.EMAIL_FROM&&e.FIRSTSIGNAL_ORIGIN);}
export async function dispatchNotifications(owner:string){
  if(!emailConfigured())return;
  const db=database(), e=config();
  const pref=await db.prepare('SELECT email,enabled FROM notification_preferences WHERE owner=?').bind(owner).first<{email:string;enabled:number}>();
  if(!pref?.enabled)return;
  const rows=await db.prepare("SELECT * FROM notifications WHERE owner=? AND status='pending' AND created>? ORDER BY created LIMIT 3").bind(owner,new Date(Date.now()-86400000).toISOString()).all<{id:string;title:string}>();
  for(const row of rows.results){
    try{
      const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(5000),headers:{Authorization:`Bearer ${e.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`firstsignal-${row.id}`},body:JSON.stringify({from:e.EMAIL_FROM,to:[pref.email],subject:row.title,text:`${row.title}\n\nOpen FirstSignal to review your private connection:\n${e.FIRSTSIGNAL_ORIGIN}/app#introductions\n\nNo message content or proposal terms are included in email. Proposals are non-binding. Manage email notifications in My profiles.`})});
      if(!response.ok)break;
      const receipt=await response.json() as {id?:string};
      if(!receipt.id)break;
      await db.prepare("UPDATE notifications SET status='submitted' WHERE id=? AND owner=?").bind(row.id,owner).run();
    }catch{break;}
  }
}
export async function notify(owner:string|null,id:string,title:string){
  if(!owner)return;
  try{await database().prepare("INSERT INTO notifications (id,owner,introduction_id,title,status,created) VALUES (?,?,?,?,'pending',?)").bind(crypto.randomUUID(),owner,id,title,new Date().toISOString()).run();await dispatchNotifications(owner);}catch{console.error('Connection notification could not be queued');}
}
