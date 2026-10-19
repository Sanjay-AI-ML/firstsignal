"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
type Settings={emailOptedIn:boolean;emailEnabled:boolean;emailConfigured:boolean;emailAutomationConfigured:boolean;emailReceiptsConfigured:boolean;emailAddress:string;emailVerified:boolean;emailAddressChanged:boolean;emailSuppressed:boolean;notifications:{id:string;title:string;status:string;created:string}[]};
const statuses:Record<string,string>={pending:'Email queued',retry:'Waiting to retry email',sending:'Sending email',submitted:'Accepted by email provider',delivered:'Accepted by receiving mail server',delayed:'Delivery delayed',bounced:'Email could not be delivered',complained:'Email marked as unwanted',suppressed:'Email blocked by provider',failed:'Delivery could not be confirmed — retries stopped',expired:'Delivery could not be confirmed — retry window ended',skipped:'Email updates stopped for this notice'};
export default function NotificationSettings(){
 const [data,setData]=useState<Settings|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const pending=useRef(false),mounted=useRef(true);
 const load=useCallback(async()=>{
  if(pending.current)return;pending.current=true;setBusy(true);
  try{const r=await fetch('/api/connections',{cache:'no-store'});const body=await r.json() as Settings&{error?:string};if(!r.ok)throw new Error(body.error||'Unable to load notifications.');if(mounted.current){setData(body);setError('');}}
  catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Unable to load notifications.');}
  finally{pending.current=false;if(mounted.current)setBusy(false);}
 },[]);
 useEffect(()=>{mounted.current=true;const timer=setTimeout(()=>void load(),0);return()=>{clearTimeout(timer);mounted.current=false;}},[load]);
 const write=async(payload:{action:'preferences';enabled:boolean}|{action:'retry'})=>{
  if(pending.current)return;pending.current=true;setBusy(true);setNotice('');
  try{const r=await fetch('/api/connections',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const body=await r.json() as Settings&{error?:string};if(!r.ok)throw new Error(body.error||'Unable to update notifications.');if(mounted.current){setData(body);setError('');setNotice(payload.action==='preferences'?'Email preference saved.':'Checked one queued email. Refresh to see later delivery updates.');}}
  catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Unable to update notifications.');}
  finally{pending.current=false;if(mounted.current)setBusy(false);}
 };
 return <section className="notification-settings" aria-busy={busy}>
  <div className="negotiation-heading"><h2>Connection notifications</h2><button className="text-button" aria-disabled={busy} onClick={()=>void load()}>Refresh notifications</button></div>
  {error?<p className="notice error-notice" role="alert">{error}</p>:null}{notice?<p className="subtle" role="status">{notice}</p>:null}
  {data?<>
   <p className="subtle">Updates for introductions, messages and private proposals. Email includes a link, never private messages or proposal terms.</p>
   {!data.emailConfigured?<p className="notice">Email delivery is being set up. Connection updates still appear below.</p>:!data.emailAutomationConfigured?<p className="notice">Automatic email delivery is being set up. You can check queued emails manually below.</p>:null}
   {data.emailConfigured&&!data.emailReceiptsConfigured?<p className="subtle">Delivery receipts are being set up. “Accepted by email provider” does not confirm delivery.</p>:null}
   {data.emailAddressChanged?<p className="notice">Your primary email address changed or needs confirmation. Enable updates again after confirming your current address.</p>:null}
   {data.emailSuppressed?<p className="notice">Updates to this address stopped after a delivery failure or unwanted-email report. Choose a different verified primary email address in your account settings to enable them again.</p>:null}
   <label className="consent"><input type="checkbox" checked={data.emailEnabled} aria-disabled={busy||(!data.emailEnabled&&(!data.emailVerified||data.emailSuppressed))} disabled={!data.emailEnabled&&(!data.emailVerified||data.emailSuppressed)} onClick={e=>{if(pending.current)e.preventDefault();}} onChange={e=>{if(!pending.current)void write({action:'preferences',enabled:e.target.checked});}}/><span>Email me connection updates{data.emailAddress?` at ${data.emailAddress}`:''}. I can turn this off anytime.</span></label>
   {data.emailOptedIn&&!data.emailEnabled?<button className="outline-button" aria-disabled={busy} onClick={()=>void write({action:'preferences',enabled:false})}>Turn off email updates</button>:null}
   <p className="subtle">Use a confirmed primary email address from your sign-in account. This does not verify your founder or investor profile. Turning email off keeps your in-app updates. Emails already submitted may still arrive.</p>
   {data.emailConfigured&&data.emailEnabled?<button className="outline-button" aria-disabled={busy} onClick={()=>void write({action:'retry'})}>Check queued email</button>:null}
   <ul className="notification-list">{data.notifications.map(n=><li key={n.id}><strong>{n.title}</strong><span>{new Date(n.created).toLocaleString('en-IN')} · {statuses[n.status]||'Connection update saved'}</span></li>)}</ul>
   {!data.notifications.length?<p className="subtle">No connection updates yet.</p>:null}
  </>:<p role="status">{error?'Notifications unavailable. Use Refresh notifications to retry.':'Loading notifications…'}</p>}
 </section>;
}
