import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import { transform } from 'esbuild';
import { z } from 'zod';

// Actual migrations, SQL and three API routes. Every identity and network response
// is synthetic. Never contacts Clerk/Resend and never sends an email.
let checks=0,dbCalls=0,clock=Date.parse('2026-10-19T10:00:00.000Z'),fail=false,beforeRun=null,afterFirst=null;
const equal=(a,b,label)=>{assert.equal(a,b,label);checks++;};
const ok=(a,label)=>{assert.ok(a,label);checks++;};
const same=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
class Clock extends Date { constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;} }
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
const migrations=(await fs.readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort();
for(const file of migrations.filter(n=>!n.startsWith('0006')))sql.exec(await fs.readFile(`drizzle/${file}`,'utf8'));
sql.prepare('INSERT INTO notification_preferences(owner,email,enabled) VALUES(?,?,?)').run('legacy','old@example.test',1);
sql.prepare('INSERT INTO notifications(id,owner,introduction_id,title,status,created) VALUES(?,?,?,?,?,?)').run('old-record','legacy','old-intro','Old in-app notice','submitted',new Clock().toISOString());
const legacy=JSON.stringify(sql.prepare('SELECT * FROM notifications').all());
sql.exec(await fs.readFile('drizzle/0006_notification_outbox.sql','utf8'));
equal(JSON.stringify(sql.prepare('SELECT * FROM notifications').all()),legacy,'Additive migration preserves every legacy notice');
equal(sql.prepare('SELECT enabled FROM notification_preferences WHERE owner=?').get('legacy').enabled,1);
const db={prepare(query){dbCalls++;if(fail)throw new Error('Synthetic storage failure');let args=[];const statement={bind(...v){ok(v.length<=100,'D1 bound parameter limit');args=v;return statement;},execute(){if(beforeRun)beforeRun(query,args);const compiled=sql.prepare(query);return compiled.columns().length?{results:compiled.all(...args),meta:{changes:0}}:{results:[],meta:{changes:compiled.run(...args).changes}};},async run(){return statement.execute();},async all(){return statement.execute();},async first(){const result=statement.execute().results[0]??null;if(afterFirst)await afterFirst(query,args,result);return result;}};return statement;},async batch(statements){sql.exec('BEGIN IMMEDIATE');try{const result=statements.map(s=>s.execute());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};
const environment={CLERK_SECRET_KEY:'synthetic-clerk',RESEND_API_KEY:'synthetic-resend',EMAIL_FROM:'FindIn <updates@example.test>',FIRSTSIGNAL_ORIGIN:'https://findin.example',NOTIFICATION_DISPATCH_SECRET:'synthetic-dispatch-secret-at-least-32-characters',RESEND_WEBHOOK_SECRET:`whsec_${btoa('synthetic-signing-key-with-32-bytes')}`};
let live=new Map(),sent=[],clerkCalls=0,resendMode=null,identityMode=null;
const network=async(url,init={})=>{
 if(url.startsWith('https://api.clerk.com/v1/users/')){clerkCalls++;if(identityMode)return identityMode(url,init);const id=decodeURIComponent(url.split('/').pop()),value=live.get(`clerk:${id}`);return value?Response.json({id,primary_email_address_id:'primary',email_addresses:[{id:'primary',email_address:value.email,verification:{status:value.verified?'verified':'unverified'}}],banned:value.banned??false}):Response.json({}, {status:404});}
 equal(url,'https://api.resend.com/emails','No unapproved network target');sent.push({body:init.body,key:init.headers['Idempotency-Key']});return resendMode?resendMode(url,init):Response.json({id:`provider_${sent.length}`});
};
async function load(file,modules={}){const {code}=await transform(await fs.readFile(file,'utf8'),{loader:'ts',format:'cjs'});const context={module:{exports:{}},exports:{},require:n=>{assert.ok(n in modules,`Unexpected module ${n}`);return modules[n];},console,Request,Response,Headers,URL,crypto,fetch:network,Date:Clock,AbortSignal,TextEncoder,TextDecoder,Uint8Array,atob,btoa};vm.runInNewContext(code,context);return context.module.exports;}
const auth=new AsyncLocalStorage();
const security=await load('lib/notification-security.ts');
const notifications=await load('lib/notifications.ts',{'cloudflare:workers':{env:environment},'./database':{database:()=>db}});
const monitoring=await load('lib/monitoring.ts');
const idempotency=await load('lib/idempotency.ts');
const safety=await load('lib/member-safety.ts',{'./database':{database:()=>db}});
const connection=await load('app/api/connections/route.ts',{'../../auth':{getAppUser:async()=>auth.getStore()},'@/lib/database':{database:()=>db},'@/lib/notifications':notifications,'@/lib/notification-security':security,zod:{z},'@/lib/member-safety':safety,'@/lib/validation':{validDate:()=>true},'@/lib/monitoring':monitoring,'@/lib/idempotency':idempotency});
const dispatch=await load('app/api/internal/notifications/dispatch/route.ts',{'cloudflare:workers':{env:environment},'@/lib/notifications':notifications,'@/lib/notification-security':security});
const webhook=await load('app/api/webhooks/resend/route.ts',{'cloudflare:workers':{env:environment},'@/lib/notifications':notifications,'@/lib/notification-security':security});
const sectors=await load('lib/sectors.ts');
const data=await load('lib/data.ts',{'./sectors':sectors,'./seed-startups.json':JSON.parse(await fs.readFile('lib/seed-startups.json','utf8')),'./seed-investors.json':JSON.parse(await fs.readFile('lib/seed-investors.json','utf8'))});
const validation=await load('lib/validation.ts',{zod:{z},'./data':data,'./sectors':sectors});
const streaming=await load('lib/streaming-request.ts');
const abuse=await load('lib/abuse-control.ts');
const revisions=await load('lib/revisions.ts');
const workspace=await load('app/api/workspace/route.ts',{'../../auth':{getAppUser:async()=>auth.getStore()},'@/lib/notifications':notifications,'@/lib/database':{database:()=>db},'@/lib/data':data,'@/lib/validation':validation,'@/lib/member-safety':safety,'@/lib/rate-limit':{checkRateLimit:()=>({success:true}),anonymousThrottleKey:()=>''},'@/lib/streaming-request':streaming,'@/lib/monitoring':monitoring,'@/lib/idempotency':idempotency,'@/lib/abuse-control':abuse,'@/lib/revisions':revisions});
const owner='clerk:user_Alpha1',other='clerk:user_Beta2',origin=environment.FIRSTSIGNAL_ORIGIN;
const member=(id=owner,email='founder@example.test',verified=true)=>({userId:id,email,emailVerified:verified,displayName:'Synthetic member'});
const account=member();
const time=()=>new Clock().toISOString();
function reset(){sql.exec('DELETE FROM idempotency_keys;DELETE FROM account_closures;DELETE FROM daily_quotas;DELETE FROM notification_email_events;DELETE FROM notification_emails;DELETE FROM notifications;DELETE FROM notification_email_controls;DELETE FROM notification_preferences;DELETE FROM notification_dispatch_lease;DELETE FROM negotiation_events;DELETE FROM negotiations;DELETE FROM messages;DELETE FROM connection_next_steps;DELETE FROM introductions;DELETE FROM profiles;DELETE FROM member_blocks');clock=Date.parse('2026-10-19T10:00:00.000Z');sent=[];clerkCalls=0;resendMode=null;identityMode=null;beforeRun=null;afterFirst=null;live=new Map([[owner,{email:account.email,verified:true}],[other,{email:'investor@example.test',verified:true}]]);sql.prepare('INSERT INTO profiles(id,owner,kind,data,listed,updated) VALUES(?,?,?,?,?,?)').run('idea',other,'startup',JSON.stringify({...data.seedProfiles[0],kind:'startup',name:'Synthetic idea'}),1,time());intro('intro');}
function intro(id,status='accepted',sender=other,recipient=owner){sql.prepare('INSERT INTO introductions(id,sender,recipient,profile_id,target_name,sender_name,message,status,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,sender,recipient,'idea','Member','Member','PRIVATE_MESSAGE_CANARY',status,time(),time());}
const row=()=>sql.prepare('SELECT * FROM notification_emails ORDER BY rowid DESC LIMIT 1').get();
async function callConnection(user,payload,expected=200,headers={}){const response=await auth.run(user,()=>connection.POST(new Request(`${origin}/api/connections`,{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(payload)})));equal(response.status,expected,await response.clone().text());equal(response.headers.get('cache-control'),'no-store');return response.json();}
async function settings(user=account){const response=await auth.run(user,()=>connection.GET(new Request(`${origin}/api/connections`)));equal(response.status,user?200:401);return response.json();}
async function workspacePost(user,payload,expected=200){const response=await auth.run(user,()=>workspace.POST(new Request(`${origin}/api/workspace`,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(payload)})));equal(response.status,expected,await response.clone().text());equal(response.headers.get('cache-control'),'no-store');return response.json();}
async function enable(user=account){await callConnection(user,{action:'preferences',enabled:true});}
async function queue(kind='message',id='intro',who=owner){const title={message:'You have a new connection message',introduction:'You have a new introduction request',response:'Your introduction request has an update',proposal:'A new private proposal is ready to review',decision:'Your private proposal has a response'}[kind]??'PRIVATE_ARBITRARY_TITLE_CANARY';await notifications.notify(who,id,title,kind);return row();}
async function job(body={},token=environment.NOTIFICATION_DISPATCH_SECRET,expected=200){const response=await dispatch.POST(new Request(`${origin}/api/internal/notifications/dispatch`,{method:'POST',headers:{authorization:`Bearer ${token}`},body:typeof body==='string'?body:JSON.stringify(body)}));equal(response.status,expected,await response.clone().text());equal(response.headers.get('cache-control'),'no-store');return response.json();}
let eventCount=0;
async function receipt(type,providerId='provider_1',options={}){const id=options.id??`msg_${++eventCount}`,timestamp=String(Math.floor(clock/1000)+(options.timestampOffset??0));const raw=options.raw??JSON.stringify({type,created_at:options.created??time(),data:{email_id:providerId,subject:'PRIVATE_EVENT_CANARY'}});const key=await crypto.subtle.importKey('raw',Uint8Array.from(atob(environment.RESEND_WEBHOOK_SECRET.slice(6)),c=>c.charCodeAt(0)),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${id}.${timestamp}.${raw}`));const signature=btoa(String.fromCharCode(...new Uint8Array(bytes)));const response=await webhook.POST(new Request(`${origin}/api/webhooks/resend`,{method:'POST',headers:{'svix-id':id,'svix-timestamp':timestamp,'svix-signature':options.signature??`v1,${signature}`},body:raw}));equal(response.status,options.status??200,await response.clone().text());equal(response.headers.get('cache-control'),'no-store');return response.json();}

reset();await settings(null);let calls=dbCalls;await callConnection(null,{action:'retry'},401);equal(dbCalls,calls,'Unauthenticated API performs no queries');await callConnection(account,{action:'retry'},403,{origin:'https://evil.example'});await callConnection(account,{action:'preferences',enabled:true,padding:'x'.repeat(13000)},413);await callConnection(member(owner,account.email,false),{action:'preferences',enabled:true},400);

// Opt-in, queue, real-route retry, private payload and truthful status projection.
await queue();equal(row().state,'skipped','Email defaults off');equal(sent.length,0,'Queue never sends synchronously');await enable();equal(row().state,'skipped','Opt-in cannot resend pre-consent notices');const queued=await queue();equal(queued.state,'pending');await callConnection(account,{action:'retry'});equal(row().state,'submitted');equal(sent.length,1);equal(clerkCalls,1,'Every send checks live primary email');const outgoing=JSON.parse(sent[0].body);same(outgoing.to,[account.email]);equal(outgoing.subject,'You have a new connection message');ok(outgoing.text.includes('https://findin.example/app#introductions'));ok(!sent[0].body.includes('PRIVATE_'),'No private terms or bodies reach email');let view=await settings();equal(view.notifications.find(n=>n.id===queued.notification_id).status,'submitted');ok(!JSON.stringify(view).includes('lease_token'));ok(!JSON.stringify(view).includes('request_body'));await callConnection(account,{action:'preferences',enabled:false});equal(sql.prepare('SELECT count(*) AS n FROM notifications').get().n,2,'Opt-out retains all in-app notices');equal(row().state,'submitted','Historic provider acceptance remains accurate when off');

// Re-saving identical opt-in does not clear queued notifications.
reset();await enable();const original=await queue();await enable();equal(row().state,'pending');equal(row().consent_version,original.consent_version);await callConnection(account,{action:'preferences',enabled:false});equal(row().state,'skipped');await enable();await notifications.dispatchNotifications(owner);equal(sent.length,0,'Renewing consent does not revive old notices');

// Only eligible, real, unblocked participants receive connection emails.
for(const scenario of ['blocked-sender','blocked-recipient','declined','outsider','missing','null-recipient','arbitrary-title','wrong-request-role']){
 reset();await enable();
 if(scenario==='blocked-sender'||scenario==='blocked-recipient'){const a=scenario==='blocked-sender'?owner:other,b=a===owner?other:owner;sql.prepare('INSERT INTO member_blocks(owner,target_owner,profile_id,target_name,created) VALUES(?,?,?,?,?)').run(a,b,'idea','Member',time());}
 if(scenario==='declined')sql.prepare("UPDATE introductions SET status='declined'").run();
 if(scenario==='outsider')sql.prepare("UPDATE introductions SET sender='clerk:user_Else1',recipient='clerk:user_Else2'").run();
 if(scenario==='missing')sql.prepare('DELETE FROM introductions').run();
 if(scenario==='null-recipient')sql.prepare('UPDATE introductions SET recipient=NULL').run();
 if(scenario==='wrong-request-role')sql.prepare("UPDATE introductions SET sender=?,recipient=?,status='pending'").run(owner,other);
 await queue(scenario==='arbitrary-title'?'legacy':scenario==='wrong-request-role'?'introduction':'message');await notifications.dispatchNotifications(owner);equal(sent.length,0,scenario);
}
reset();await enable();sql.prepare("UPDATE introductions SET status='pending'").run();await queue('introduction');equal((await job()).submitted,1,'Real pending recipient request sends');

// Live identity is revalidated; address changes and revocation cannot retarget a queued email.
for(const kind of ['changed','unverified','deleted','banned']){
 reset();await enable();await queue();
 if(kind==='changed')live.set(owner,{email:'new@example.test',verified:true});
 if(kind==='unverified')live.set(owner,{email:account.email,verified:false});
 if(kind==='deleted')live.delete(owner);
 if(kind==='banned')live.set(owner,{email:account.email,verified:true,banned:true});
 await notifications.dispatchNotifications(owner);equal(sent.length,0,kind);equal(row().state,'skipped');equal(sql.prepare('SELECT enabled FROM notification_preferences').get().enabled,0);
}
for(const change of ['optout','blocked','unaccepted']){
 reset();await enable();await queue();
 identityMode=async()=>{identityMode=null;if(change==='optout')await callConnection(account,{action:'preferences',enabled:false});if(change==='blocked')sql.prepare('INSERT INTO member_blocks(owner,target_owner,profile_id,target_name,created) VALUES(?,?,?,?,?)').run(other,owner,'idea','Member',time());if(change==='unaccepted')sql.prepare("UPDATE introductions SET status='declined'").run();return Response.json({id:'user_Alpha1',primary_email_address_id:'primary',email_addresses:[{id:'primary',email_address:account.email,verification:{status:'verified'}}]});};
 await notifications.dispatchNotifications(owner);equal(sent.length,0,`Fresh SQL permission after identity lookup: ${change}`);equal(row().state,'skipped');
}

// Provider uncertainty retries frozen bytes/key; no runtime-config or primary-email retargeting.
reset();await enable();await queue();resendMode=async()=>{throw new Error('Synthetic network timeout');};await notifications.dispatchNotifications(owner);equal(row().state,'retry');equal(row().attempts,1);const first={...sent[0]};await notifications.dispatchNotifications(owner);equal(sent.length,1,'Backoff prevents immediate retry');clock+=61000;environment.EMAIL_FROM='New sender <new@example.test>';environment.FIRSTSIGNAL_ORIGIN='https://new.example';resendMode=null;await notifications.dispatchNotifications(owner);equal(sent.length,2);same(sent[1],first,'Idempotency key, from, recipient and full payload remain frozen');equal(row().state,'submitted');environment.EMAIL_FROM='FindIn <updates@example.test>';environment.FIRSTSIGNAL_ORIGIN=origin;
reset();await enable();await queue();resendMode=async()=>Response.json({name:'invalid_idempotent_request'},{status:409});await notifications.dispatchNotifications(owner);equal(row().state,'failed','Changed-payload conflict is terminal');
for(const code of [429,500,503]){reset();await enable();await queue();resendMode=async()=>Response.json({}, {status:code});await notifications.dispatchNotifications(owner);equal(row().state,'retry',`Provider${code} retries`);}
reset();await enable();await queue();resendMode=async()=>Response.json({name:'concurrent_idempotent_requests'},{status:409});await notifications.dispatchNotifications(owner);equal(row().state,'retry');
reset();await enable();await queue();identityMode=async()=>Response.json({}, {status:503});await notifications.dispatchNotifications(owner);equal(sent.length,0);equal(row().state,'retry','Transient Clerk failures never send or disable consent');equal(sql.prepare('SELECT enabled FROM notification_preferences').get().enabled,1);
reset();await enable();await queue();resendMode=async()=>Response.json({}, {status:500});for(let i=0;i<5;i++){await notifications.dispatchNotifications(owner);clock+=3700000;}equal(sent.length,5);equal(row().state,'failed');await notifications.dispatchNotifications(owner);equal(sent.length,5,'Bounded attempt count');
reset();await enable();await queue();clock+=23*3600000;equal((await job()).expired,1);equal(sent.length,0,'Retry window ends before provider idempotency retention expires');equal(row().state,'expired');

// Two overlapping manual workers cannot submit the same claimed notice twice.
reset();await enable();await queue();let releaseIdentity,entered;const enteredPromise=new Promise(r=>entered=r);identityMode=async()=>{entered();await new Promise(r=>releaseIdentity=r);return Response.json({id:'user_Alpha1',primary_email_address_id:'primary',email_addresses:[{id:'primary',email_address:account.email,verification:{status:'verified'}}]});};const working=notifications.dispatchNotifications(owner);await enteredPromise;await notifications.dispatchNotifications(owner);equal(sent.length,0);releaseIdentity();await working;equal(sent.length,1);equal(row().state,'submitted');
reset();await enable();await queue();sql.prepare("UPDATE notification_emails SET state='sending',lease_until=?,lease_token='dead',request_body=?,recipient=?,attempts=1").run(new Clock(clock-1000).toISOString(),JSON.stringify({from:'Old sender',to:[account.email],subject:'Frozen subject',text:'Frozen generic text'}),account.email);await notifications.dispatchNotifications(owner);equal(sent.length,1,'Expired worker lease can recover');equal(JSON.parse(sent[0].body).from,'Old sender');

// Atomic queue creation: failure midway rolls back both rows and retains prior notices.
reset();await enable();await queue();const before=sql.prepare('SELECT count(*) AS n FROM notifications').get().n;beforeRun=query=>{if(query.startsWith('INSERT INTO notification_emails'))throw new Error('Synthetic insert failure');};await queue();beforeRun=null;equal(sql.prepare('SELECT count(*) AS n FROM notifications').get().n,before);equal(sql.prepare('SELECT count(*) AS n FROM notification_emails').get().n,before);

// Authenticated machine job: bounded body, durable lease across invocations, release.
reset();calls=dbCalls;await job({},'incorrect-token-that-is-long-enough-to-check',401);equal(dbCalls,calls);await job({limit:4},undefined,400);await job({limit:1,owner},undefined,400);await job('x'.repeat(1025),undefined,413);await job('not json',undefined,400);await job([],undefined,400);environment.NOTIFICATION_DISPATCH_SECRET='';await job({},'anything',503);environment.NOTIFICATION_DISPATCH_SECRET='synthetic-dispatch-secret-at-least-32-characters';await enable();await queue();sql.prepare('INSERT INTO notification_dispatch_lease(id,token,expires,updated) VALUES(?,?,?,?)').run('email','other',new Clock(clock+90000).toISOString(),time());await job({},undefined,409);equal(sent.length,0);clock+=91000;equal((await job()).submitted,1);equal(sql.prepare('SELECT count(*) AS n FROM notification_dispatch_lease').get().n,0,'Lease released only by its holder');
reset();await enable();await queue();let releaseJob,jobEntered;const jobEnteredPromise=new Promise(r=>jobEntered=r);identityMode=async()=>{jobEntered();await new Promise(r=>releaseJob=r);return Response.json({id:'user_Alpha1',primary_email_address_id:'primary',email_addresses:[{id:'primary',email_address:account.email,verification:{status:'verified'}}]});};const jobWorking=job();await jobEnteredPromise;await job({},undefined,409);releaseJob();await jobWorking;equal(sent.length,1);

// Signed raw-body webhook, rotation, replay window, delivery states and early receipt.
reset();await enable();await queue();let early;
resendMode=async()=>{early=await receipt('email.delivered','provider_early',{id:'msg_early',status:503});return Response.json({id:'provider_early'});};await notifications.dispatchNotifications(owner);ok(early.error);equal(row().state,'submitted');await receipt('email.delivered','provider_early',{id:'msg_early'});equal(row().state,'delivered','A receipt racing HTTP acceptance succeeds when retried');await receipt('email.sent','provider_early',{created:new Clock(clock-1000).toISOString()});equal(row().state,'delivered','Old sent event cannot downgrade delivery');await receipt('email.delivery_delayed','provider_early');equal(row().state,'delivered');const eventId='msg_once';await receipt('email.delivered','provider_early',{id:eventId});let eventRows=sql.prepare('SELECT count(*) AS n FROM notification_email_events').get().n;clock+=1000;await receipt('email.delivered','provider_early',{id:eventId});equal(sql.prepare('SELECT count(*) AS n FROM notification_email_events').get().n,eventRows,'Webhook replay is deduplicated');
calls=dbCalls;await receipt('email.delivered','provider_early',{signature:'v1,invalid',status:401});equal(dbCalls,calls,'Invalid signature never reaches storage');await receipt('email.delivered','provider_early',{timestampOffset:-301,status:401});await receipt('email.delivered','provider_early',{raw:'not json',status:400});await receipt('unknown.type','provider_early');
const huge=await webhook.POST(new Request(`${origin}/api/webhooks/resend`,{method:'POST',body:'x'.repeat(65537)}));equal(huge.status,413);
const raw=JSON.stringify({type:'email.delivered',created_at:time(),data:{email_id:'provider_early'}}),stamp=String(Math.floor(clock/1000)),svix='msg_rotation';const key=await crypto.subtle.importKey('raw',Uint8Array.from(atob(environment.RESEND_WEBHOOK_SECRET.slice(6)),c=>c.charCodeAt(0)),{name:'HMAC',hash:'SHA-256'},false,['sign']);const signature=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${svix}.${stamp}.${raw}`)))));equal(await security.verifyResendSignature(raw,new Headers({'svix-id':svix,'svix-timestamp':stamp,'svix-signature':`v1,!!! v1,${signature}`}),environment.RESEND_WEBHOOK_SECRET,clock),true,'Malformed obsolete signature does not hide valid rotation signature');equal(await security.verifyResendSignature(raw+' ',new Headers({'svix-id':svix,'svix-timestamp':stamp,'svix-signature':`v1,${signature}`}),environment.RESEND_WEBHOOK_SECRET,clock),false,'Signature binds exact raw bytes');

// Permanent suppression survives repeated consent, new primary and late old receipts.
reset();await enable();await queue();await notifications.dispatchNotifications(owner);await queue();await receipt('email.bounced');equal(sql.prepare('SELECT enabled FROM notification_preferences').get().enabled,0);equal(row().state,'skipped','Pending same-address email is stopped');view=await settings();equal(view.emailSuppressed,true);await callConnection(account,{action:'preferences',enabled:true},409);await receipt('email.sent');equal(sql.prepare("SELECT state FROM notification_emails WHERE provider_id='provider_1'").get().state,'bounced','Success event cannot reverse bounce');
const changed=member(owner,'new@example.test');live.set(owner,{email:changed.email,verified:true});await enable(changed);const fresh=await queue();await receipt('email.complained','provider_1',{id:'msg_old_complaint'});equal(sql.prepare('SELECT enabled FROM notification_preferences').get().enabled,1,'Old recipient complaint never disables new-address consent');equal(row().state,'pending','Late old-address event never skips new-address queue');await receipt('email.complained','provider_1',{id:'msg_old_complaint'});equal(row().state,'pending');await notifications.dispatchNotifications(owner);equal(row().state,'submitted');equal(JSON.parse(sent.at(-1).body).to[0],changed.email);await callConnection(account,{action:'preferences',enabled:true},409);ok(fresh.consent_version,'New address has explicit distinct consent');

// Reconciliation is safe for preexisting rows, opt-out history and unknown titles.
reset();sql.prepare('INSERT INTO notifications(id,owner,introduction_id,title,status,created) VALUES(?,?,?,?,?,?)').run('legacy-off',owner,'intro','You have a new connection message','pending',time());await notifications.dispatchNotifications(owner);equal(row().state,'skipped');equal(sent.length,0);await enable();await notifications.dispatchNotifications(owner);equal(sent.length,0,'Legacy opt-out notice never becomes deliverable after opt-in');sql.prepare('INSERT INTO notifications(id,owner,introduction_id,title,status,created) VALUES(?,?,?,?,?,?)').run('legacy-on',owner,'intro','You have a new connection message','pending',time());await notifications.dispatchNotifications(owner);equal(sent.length,1,'Previously opted-in recognized notice can be reconciled');
reset();await enable();await queue();fail=true;await job({},undefined,503);fail=false;equal(row().state,'pending','Storage failure leaves queued record recoverable');const keyBefore=environment.RESEND_API_KEY;environment.RESEND_API_KEY='';await job({},undefined,503);equal(sent.length,0);environment.RESEND_API_KEY=keyBefore;
// Business mutation + in-app notice + outbox are one real SQLite transaction.
for(const action of ['request','respond','message','proposal','decision']){
 reset();
 if(action==='request')sql.prepare('DELETE FROM introductions').run();
 if(action==='respond')sql.prepare("UPDATE introductions SET status='pending'").run();
 if(action==='decision'){
  await callConnection(member(other,'investor@example.test'),{action:'proposal',id:'intro',version:0,amount:500000,terms:'Synthetic non-binding private proposal terms.',consent:true});
 }
 const who=action==='respond'?account:action==='decision'?account:account;
 const payload={request:{action:'request',profileId:'idea',message:'A synthetic introduction to test atomic notifications.',consent:true},respond:{action:'respond',id:'intro',status:'accepted'},message:{action:'message',id:'intro',body:'PRIVATE_MESSAGE_CANARY'},proposal:{action:'proposal',id:'intro',version:0,amount:700000,terms:'PRIVATE_PROPOSAL_TERMS_CANARY',consent:true},decision:{action:'decision',id:'intro',version:1,status:'acknowledged',consent:true}}[action];
 const tables=['introductions','messages','negotiations','negotiation_events','notifications','notification_emails'];
 const snapshot=()=>JSON.stringify(tables.map(t=>[t,sql.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()]));
 const before=snapshot();
 beforeRun=query=>{if(query.startsWith('INSERT INTO notification_emails'))throw new Error('Synthetic outbox failure');};
 if(action==='proposal'||action==='decision')await callConnection(who,payload,503);else await workspacePost(who,payload,503);
 beforeRun=null;same(snapshot(),before,`${action}: notice failure rolls back business action, history and all alerts`);
 const noticeBefore=sql.prepare('SELECT count(*) AS n FROM notifications').get().n;
 if(action==='proposal'||action==='decision')await callConnection(who,payload);else await workspacePost(who,payload);
 equal(sql.prepare('SELECT count(*) AS n FROM notifications').get().n,noticeBefore+1,`${action}: exactly one durable notice on success`);
 equal(sql.prepare('SELECT count(*) AS n FROM notification_emails').get().n,noticeBefore+1,`${action}: matching outbox record`);
 equal(sent.length,0,'Business actions do not wait on providers');
 if(action!=='message'){
  if(action==='proposal'||action==='decision')await callConnection(who,payload,409);else await workspacePost(who,payload,409);
  equal(sql.prepare('SELECT count(*) AS n FROM notifications').get().n,noticeBefore+1,`${action}: stale/duplicate action cannot manufacture another notice`);
 }
}
reset();const noMutation=db.prepare("UPDATE introductions SET status='accepted' WHERE id='missing'");await db.batch([noMutation,...notifications.notificationStatements(owner,'intro','You have a new connection message')]);equal(sql.prepare('SELECT count(*) AS n FROM notifications').get().n,0,'changes()=0 cannot create a notice');
// Same-email re-consent during an older identity lookup must survive that stale result.
reset();await enable();await queue();identityMode=async()=>{identityMode=null;await callConnection(account,{action:'preferences',enabled:false});await enable();return Response.json({id:'user_Alpha1',primary_email_address_id:'primary',email_addresses:[{id:'primary',email_address:account.email,verification:{status:'unverified'}}]});};await notifications.dispatchNotifications(owner);equal(sql.prepare('SELECT enabled FROM notification_preferences').get().enabled,1,'Stale identity result does not overwrite newer explicit consent');equal(sent.length,0);
// Raw consent is exposed separately so stale/unverified addresses can still opt out.
reset();await enable();view=await settings(member(owner,'changed@example.test',false));equal(view.emailOptedIn,true);equal(view.emailEnabled,false);await callConnection(member(owner,'changed@example.test',false),{action:'preferences',enabled:false});equal((await settings(member(owner,'changed@example.test',false))).emailOptedIn,false);
for(const value of ['https://user:pass@findin.example','https://findin.example/','https://findin.example/path','https://findin.example?query=1','https://findin.example#fragment','http://findin.example','https://example.invalid']){environment.FIRSTSIGNAL_ORIGIN=value;equal(notifications.emailConfigured(),false,`Reject invalid delivery origin: ${value}`);}environment.FIRSTSIGNAL_ORIGIN=origin;
// Atomic claim rechecks a block that appears after selection, before the write.
reset();await enable();await queue();beforeRun=(query)=>{if(query.startsWith("UPDATE notification_emails SET state='sending'")){beforeRun=null;sql.prepare('INSERT INTO member_blocks(owner,target_owner,profile_id,target_name,created) VALUES(?,?,?,?,?)').run(owner,other,'idea','Member',time());}};await notifications.dispatchNotifications(owner);equal(sent.length,0);await notifications.dispatchNotifications(owner);equal(row().state,'skipped');
// Accepted request + failed receipt write remains recoverable using frozen idempotency.
reset();await enable();await queue();beforeRun=(query,args)=>{if(query.startsWith('UPDATE notification_emails SET state=?')&&args[0]==='submitted'){beforeRun=null;throw new Error('Synthetic receipt persistence failure');}};await notifications.dispatchNotifications(owner);equal(row().state,'retry');const uncertainRequest={...sent[0]};clock+=61000;await notifications.dispatchNotifications(owner);same(sent[1],uncertainRequest);equal(row().state,'submitted');
// No settings response exposes another account's notices or email address.
view=await settings(member(other,'investor@example.test'));equal(view.notifications.length,0);ok(!JSON.stringify(view).includes(account.email));
// All owner tasks settle before the global lease releases, even on partial failure.
reset();await enable();await enable(member(other,'investor@example.test'));await queue();await queue('message','intro',other);
let unlockOther,otherStarted;const otherStartedPromise=new Promise(r=>otherStarted=r);beforeRun=(query,args)=>{if(query.startsWith('SELECT n.id,n.owner')&&args[0]===owner)throw new Error('Synthetic one-owner storage failure');};identityMode=async url=>{otherStarted();await new Promise(r=>unlockOther=r);const id=url.split('/').pop();return Response.json({id,primary_email_address_id:'primary',email_addresses:[{id:'primary',email_address:live.get(`clerk:${id}`).email,verification:{status:'verified'}}]});};const partiallyFailed=job({},undefined,503);await otherStartedPromise;equal(sql.prepare('SELECT count(*) AS n FROM notification_dispatch_lease').get().n,1);await job({},undefined,409);unlockOther();await partiallyFailed;beforeRun=null;equal(sql.prepare('SELECT count(*) AS n FROM notification_dispatch_lease').get().n,0);equal(sent.length,1);
// One scheduler request is globally bounded to three owners × three notices.
reset();const third='clerk:user_Gamma3';live.set(third,{email:'third@example.test',verified:true});intro('third-intro','accepted',owner,third);
for(const who of [owner,other,third]){await enable(member(who,live.get(who).email));for(let i=0;i<4;i++)await queue('message',who===third?'third-intro':'intro',who);}
const bounded=await job();equal(bounded.processed,9);equal(bounded.submitted,9);equal(sent.length,9);equal(sql.prepare("SELECT count(*) AS n FROM notification_emails WHERE state='pending'").get().n,3);ok(JSON.stringify(bounded).length<1024);ok(!JSON.stringify(bounded).includes('@'));
// Versioned proposals share atomic operation receipts with workspace creation.
// The read barrier makes both requests observe an absent receipt before either
// proceeds to its transaction: this exercises the actual competing-claim path.
const proposalOperation={action:'proposal',id:'intro',version:0,amount:700000,terms:'A synthetic non-binding private proposal for retry tests.',consent:true,operationId:'proposal-operation'};
const proposalCounts=()=>Object.fromEntries(['negotiations','negotiation_events','notifications','notification_emails','idempotency_keys'].map(table=>[table,sql.prepare(`SELECT count(*) AS n FROM ${table}`).get().n]));
reset();let releaseProposalReads;const proposalReadsReady=new Promise(resolve=>releaseProposalReads=resolve);let competingReads=0;
afterFirst=async(query,args,result)=>{if(query.startsWith('SELECT action,payload_hash,response FROM idempotency_keys')&&args[0]===`${owner}:${proposalOperation.operationId}`&&result===null){competingReads++;if(competingReads===2){afterFirst=null;releaseProposalReads();}await proposalReadsReady;}};
const concurrentProposals=await Promise.all([callConnection(account,proposalOperation),callConnection(account,proposalOperation)]);
equal(competingReads,2,'Both real route requests passed the absent-receipt read barrier');
same(proposalCounts(),{negotiations:1,negotiation_events:1,notifications:1,notification_emails:1,idempotency_keys:1},'Competing operation claims create one proposal, history, in-app notice, email record and receipt');
for(const response of concurrentProposals){equal(response.current.version,1);equal(response.events.length,1);}
equal(sent.length,0,'Concurrent proposal creation never calls the email provider');
await callConnection(account,{...proposalOperation,amount:proposalOperation.amount+1},409);
await callConnection(account,{...proposalOperation,terms:proposalOperation.terms+' Changed.'},409);
same(proposalCounts(),{negotiations:1,negotiation_events:1,notifications:1,notification_emails:1,idempotency_keys:1},'Conflicting reused proposal ID changes no durable records');
// A committed proposal with a failed response must be safely recoverable.
reset();beforeRun=query=>{if(query.startsWith('SELECT sender,recipient FROM introductions')&&sql.prepare('SELECT count(*) AS n FROM negotiations').get().n===1){beforeRun=null;throw new Error('Synthetic response read failure after commit');}};
await callConnection(account,proposalOperation,503);
same(proposalCounts(),{negotiations:1,negotiation_events:1,notifications:1,notification_emails:1,idempotency_keys:1},'Response read failure occurs after durable proposal commit');
const recoveredProposal=await callConnection(account,proposalOperation);equal(recoveredProposal.current.version,1);equal(recoveredProposal.events.length,1);
same(proposalCounts(),{negotiations:1,negotiation_events:1,notifications:1,notification_emails:1,idempotency_keys:1},'Retry after lost response recovers current view without another proposal or notice');
// IDs occupy one owner namespace across APIs, not a separate namespace per route.
reset();await workspacePost(account,{action:'message',id:'intro',body:'Synthetic message to reserve an operation ID.',operationId:'shared-operation'});
const workspaceReceipt=sql.prepare('SELECT action,payload_hash,response FROM idempotency_keys WHERE owner=?').get(owner);equal(workspaceReceipt.action,'message');
const sharedBefore=proposalCounts();await callConnection(account,{...proposalOperation,operationId:'shared-operation'},409);same(proposalCounts(),sharedBefore,'A workspace operation ID cannot be reused for a proposal');
// An old successful receipt never bypasses current participant/block checks.
for(const actor of ['blocked-owner','blocked-counterpart','outsider','removed-participant']){
 reset();await callConnection(account,proposalOperation);const committedCounts=proposalCounts();
 if(actor==='blocked-owner'||actor==='blocked-counterpart')sql.prepare('INSERT INTO member_blocks(owner,target_owner,profile_id,target_name,created) VALUES(?,?,?,?,?)').run(actor==='blocked-owner'?owner:other,actor==='blocked-owner'?other:owner,'idea','Synthetic member',time());
 if(actor==='removed-participant')sql.prepare('UPDATE introductions SET recipient=? WHERE id=?').run('clerk:user_Replacement','intro');
 await callConnection(actor==='outsider'?member('clerk:user_Stranger'):account,proposalOperation,actor.startsWith('blocked')?403:404);
 same(proposalCounts(),committedCounts,`${actor}: replay cannot bypass current authorization or add alerts`);
}
// Requested closure stops contact and opt-in, while revoking old consent remains available.
reset();await enable();await queue();
sql.prepare('INSERT INTO account_closures(owner,status,requested_at,retention_until,reason,updated) VALUES(?,?,?,?,?,?)').run(owner,'requested',time(),'2026-11-18T10:00:00.000Z','Synthetic test request',time());
const closureCounts=proposalCounts();
for(const payload of [proposalOperation,{action:'decision',id:'intro',version:1,status:'acknowledged',consent:true},{action:'nextStep',id:'intro',note:'Synthetic follow-up.',date:''},{action:'retry'},{action:'preferences',enabled:true}])await callConnection(account,payload,409);
same(proposalCounts(),closureCounts,'Closure guard blocks proposal, decision, next step, dispatch and opt-in before mutations');
equal(sent.length,0,'Closed account cannot manually dispatch queued email');
equal(sql.prepare('SELECT count(*) AS n FROM connection_next_steps').get().n,0,'Closed account cannot add follow-up records');
await callConnection(account,{action:'preferences',enabled:false});equal(sql.prepare('SELECT enabled FROM notification_preferences WHERE owner=?').get(owner).enabled,0,'Closing account can revoke email consent');
equal((await settings()).emailOptedIn,false,'Read-only notification settings remain accessible after closure');
equal(row().state,'skipped','Closure opt-out stops its pending email');
// Deterministic cross-tab closure race: initial check observes an active
// account, then closure commits while the participant read is paused. Every
// later business statement must see the newly committed requested closure.
for(const scenario of ['first-proposal','counteroffer','acknowledge','withdraw','next-create','next-update','next-clear']){
 reset();
 if(['counteroffer','acknowledge','withdraw'].includes(scenario))await callConnection(scenario==='withdraw'?account:member(other,'investor@example.test'),{action:'proposal',id:'intro',version:0,amount:500000,terms:'Synthetic existing proposal before the closure race.',consent:true});
 if(['next-update','next-clear'].includes(scenario))await callConnection(account,{action:'nextStep',id:'intro',note:'Preserve this prior private note.',date:'2026-10-25'});
 const tables=['negotiations','negotiation_events','notifications','notification_emails','idempotency_keys','connection_next_steps'];
 const businessSnapshot=()=>JSON.stringify(tables.map(table=>[table,sql.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));
 const snapshotBeforeClosure=businessSnapshot();let initialClosureChecks=0,barrierReached=false,releaseParticipantRead;
 const participantBarrier=new Promise(resolve=>releaseParticipantRead=resolve);let participantPaused;
 const pausedParticipant=new Promise(resolve=>participantPaused=resolve);
 afterFirst=async(query,args,result)=>{
  if(query.startsWith('SELECT 1 FROM account_closures')&&args[0]===owner&&result===null)initialClosureChecks++;
  if(query.startsWith('SELECT sender,recipient FROM introductions')&&args[1]===owner){afterFirst=null;barrierReached=true;participantPaused();await participantBarrier;}
 };
 const payload=scenario==='first-proposal'?proposalOperation:scenario==='counteroffer'?{...proposalOperation,version:1}:scenario==='acknowledge'||scenario==='withdraw'?{action:'decision',id:'intro',version:1,status:scenario==='withdraw'?'withdrawn':'acknowledged',consent:true}:{action:'nextStep',id:'intro',note:scenario==='next-clear'?'':'A new private note after closure must not save.',date:''};
 const pendingClosureAction=callConnection(account,payload,409);
 await pausedParticipant;
 equal(initialClosureChecks,1,`${scenario}: initial closure precheck observed no pending closure`);
 sql.prepare('INSERT INTO account_closures(owner,status,requested_at,retention_until,reason,updated) VALUES(?,?,?,?,?,?)').run(owner,'requested',time(),'2026-11-18T10:00:00.000Z','Synthetic closure committed by another tab',time());
 releaseParticipantRead();
 const refused=await pendingClosureAction;
 equal(barrierReached,true,`${scenario}: action paused after precheck before mutation`);
 ok(refused.error.includes('closure request'),`${scenario}: explain closure conflict`);
 same(businessSnapshot(),snapshotBeforeClosure,`${scenario}: atomic account guard preserves proposal/history/notice/receipt/private note`);
 equal(sent.length,0,`${scenario}: no provider calls`);
}
// Consent enable races cannot re-enable a closing account after the route's
// and helper's active-account checks. Exercise both a new row and an UPSERT.
const requestClosureWithoutPreferenceCleanup=()=>sql.prepare('INSERT INTO account_closures(owner,status,requested_at,retention_until,reason,updated) VALUES(?,?,?,?,?,?)').run(owner,'requested',time(),'2026-11-18T10:00:00.000Z','Synthetic concurrent closure',time());
for(const existingPreference of [false,true]){
 reset();if(existingPreference)await callConnection(account,{action:'preferences',enabled:false});
 const initialConsent=JSON.stringify(sql.prepare('SELECT * FROM notification_email_controls').all());
 let releaseConsentRead,consentReadPaused,activePrechecks=0;
 const consentBarrier=new Promise(resolve=>releaseConsentRead=resolve),pausedConsent=new Promise(resolve=>consentReadPaused=resolve);
 afterFirst=async(query,args,result)=>{
  if(query.startsWith('SELECT 1 FROM account_closures')&&args[0]===owner&&result===null)activePrechecks++;
  if(query.startsWith('SELECT 1 WHERE EXISTS(SELECT 1 FROM notification_emails')){afterFirst=null;consentReadPaused();await consentBarrier;}
 };
 const savingConsent=callConnection(account,{action:'preferences',enabled:true},409);
 await pausedConsent;ok(activePrechecks>=2,'Route and helper both initially observed an active account');
 requestClosureWithoutPreferenceCleanup();sql.prepare('UPDATE notification_preferences SET enabled=0 WHERE owner=?').run(owner);releaseConsentRead();
 const refused=await savingConsent;ok(refused.error.includes('closure request'));
 equal(sql.prepare('SELECT enabled FROM notification_preferences WHERE owner=?').get(owner)?.enabled,existingPreference?0:undefined,'Atomic consent INSERT/UPSERT does not enable the closed account');
 equal(JSON.stringify(sql.prepare('SELECT * FROM notification_email_controls').all()),initialConsent,'Refused consent cannot rotate the durable consent version');
 equal(sql.prepare('SELECT count(*) AS n FROM notification_emails').get().n,0);equal(sent.length,0);
}
// Helpers must protect callers independently of the connections route. Simulate
// old enabled preferences left behind by a historical or interrupted closure.
reset();await enable();requestClosureWithoutPreferenceCleanup();
const helperRefusal=await notifications.setNotificationPreferences(account,true);equal(helperRefusal.status,409);ok(helperRefusal.error.includes('closure request'));
view=await settings();equal(view.emailOptedIn,true,'Raw stale consent remains visible so it can be explicitly revoked');equal(view.emailEnabled,false,'Closing accounts never show effective email enabled');
await queue();equal(row().state,'skipped','New notices for closing recipients never get pending email records');
await notifications.dispatchNotifications(owner);equal(sent.length,0);equal(clerkCalls,0,'Already closed recipient requires no live identity call');
equal(await notifications.setNotificationPreferences(account,false),null,'The actual helper always permits opting out during closure');equal(sql.prepare('SELECT enabled FROM notification_preferences WHERE owner=?').get(owner).enabled,0);
// Legacy notices reconciled after closure are skipped despite stale enabled prefs.
reset();await enable();requestClosureWithoutPreferenceCleanup();
sql.prepare('INSERT INTO notifications(id,owner,introduction_id,title,status,created) VALUES(?,?,?,?,?,?)').run('legacy-closed',owner,'intro','You have a new connection message','pending',time());
await notifications.dispatchNotifications(owner);equal(row().state,'skipped');equal(sent.length,0);equal(clerkCalls,0);
// A notice already queued before closure is rejected by delivery eligibility.
for(const phase of ['pending','retry','lease-recovery']){
 reset();await enable();await queue();
 if(phase==='retry')sql.prepare("UPDATE notification_emails SET state='retry',attempts=1,next_attempt_at=?").run(time());
 if(phase==='lease-recovery')sql.prepare("UPDATE notification_emails SET state='sending',lease_token='old',lease_until=?,attempts=1").run(new Clock(clock-1000).toISOString());
 const attemptsBefore=row().attempts;requestClosureWithoutPreferenceCleanup();
 await notifications.dispatchNotifications(owner);equal(row().state,'skipped',`${phase}: closed recipients cannot dispatch a prior queue item`);equal(row().attempts,attemptsBefore,'Closure rejection consumes no provider attempt');equal(sent.length,0);equal(clerkCalls,0);
}
// Closure that commits after initial eligibility still defeats atomic claiming.
reset();await enable();await queue();beforeRun=query=>{if(query.startsWith("UPDATE notification_emails SET state='sending'")){beforeRun=null;requestClosureWithoutPreferenceCleanup();}};
await notifications.dispatchNotifications(owner);equal(sent.length,0);equal(clerkCalls,0);equal(row().attempts,0,'Atomic lease claim rechecks requested closure');
await notifications.dispatchNotifications(owner);equal(row().state,'skipped');
// Closure during live identity lookup is caught by the final permission check.
reset();await enable();await queue();identityMode=async()=>{identityMode=null;requestClosureWithoutPreferenceCleanup();return Response.json({id:'user_Alpha1',primary_email_address_id:'primary',email_addresses:[{id:'primary',email_address:account.email,verification:{status:'verified'}}]});};
await notifications.dispatchNotifications(owner);equal(row().state,'skipped');equal(sent.length,0);equal(clerkCalls,1,'Fresh identity alone cannot override a newly closed account');
console.log(`Notification SQLite/route verification passed: ${checks} assertions; no real provider requests or emails.`);
