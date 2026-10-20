import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createRequire } from 'node:module';
import { transform } from 'esbuild';
import { z } from 'zod';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';

// Actual SQLite migrations, authorized routes and React SSR. No provider calls,
// real accounts, browser simulation or outbound emails are involved.
const require = createRequire(import.meta.url), auth = new AsyncLocalStorage();
const sql = new DatabaseSync(':memory:'); sql.exec('PRAGMA foreign_keys=ON');
for (const file of (await fs.readdir('drizzle')).filter(name => name.endsWith('.sql')).sort()) sql.exec(await fs.readFile(`drizzle/${file}`, 'utf8'));
let checks = 0, reads = 0, unavailable = false;
const equal = (a,b,label) => { assert.equal(a,b,label); checks++; };
const ok = (value,label) => { assert.ok(value,label); checks++; };
const env = { FINDIN_ADMIN_USER_ID: 'user_Owner123', CLERK_SECRET_KEY: 'sk_test_fixture', FIRSTSIGNAL_ORIGIN: 'https://findin.example' };
const db = { async batch(statements) {return Promise.all(statements.map(statement=>statement.all()));}, prepare(query) { reads++; if (unavailable) throw new Error('SQL_AND_TOKEN_PRIVATE_CANARY'); const statement=sql.prepare(query); let args=[]; return { bind(...values) {args=values;return this;}, async first(){return statement.get(...args) ?? null;}, async all(){return {results:statement.all(...args)};}, async run(){return {meta:{changes:statement.run(...args).changes}};} }; } };
const logs = [], errors = [];
async function load(file, imports = {}, supplied = {}) {
 const {code}=await transform(await fs.readFile(file,'utf8'),{loader:file.endsWith('.tsx')?'tsx':'ts',format:'cjs',jsx:'automatic'});
 const context={ module:{exports:{}}, exports:{}, Request, Response, URL, crypto, TextDecoder, Uint8Array, performance,
 console:{error:(...args)=>errors.push(args),warn:(...args)=>logs.push(args)},
 require(name){if(Object.hasOwn(imports,name))return imports[name];if(['react','react/jsx-runtime','lucide-react'].includes(name))return require(name);if(name.endsWith('.css'))return {};throw new Error(`Unexpected dependency ${name}`);}, ...supplied};
 vm.runInNewContext(code,context,{filename:file}); return context.module.exports;
}
const types=await load('lib/admin-types.ts');
const access=await load('lib/admin-access.ts',{'cloudflare:workers':{env}});
const service=await load('lib/admin-service.ts',{'cloudflare:workers':{env},'./database':{database:()=>db},'./admin-access':access,'./admin-types':types});
const route=await load('app/api/admin/route.ts',{zod:{z},'@/app/auth':{getAppUser:async()=>auth.getStore()},'@/lib/admin-access':access,'@/lib/admin-types':types,'@/lib/admin-service':service});
const owner={userId:'clerk:user_Owner123'}, member={userId:'clerk:user_Member123'};
async function get(user,query='view=emails'){const response=await auth.run(user,()=>route.GET(new Request(`https://findin.example/api/admin?${query}`)));return {status:response.status,headers:response.headers,body:await response.json()};}
function add(id,state,attempts=0,error='') {
 const now=new Date(Date.now()-1200000).toISOString();
 sql.prepare('INSERT INTO notifications(id,owner,introduction_id,title,status,created) VALUES(?,?,?,?,?,?)').run(id,'PRIVATE_OWNER_CANARY','PRIVATE_THREAD_CANARY','PRIVATE_TITLE_CANARY',state,now);
 sql.prepare('INSERT INTO notification_emails(notification_id,kind,state,attempts,last_error,recipient,request_body,provider_id,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,'message',state,attempts,error,'PRIVATE_EMAIL_CANARY@example.test','PRIVATE_BODY_CANARY',`PRIVATE_PROVIDER_CANARY_${id}`,now,now);
}
try {
 const before=reads;
 equal((await get(null)).status,401); equal((await get(member)).status,403);equal(reads,before,'Authorization precedes any database query');
 env.FINDIN_ADMIN_USER_ID='';equal((await get(owner)).status,403);equal(reads,before);env.FINDIN_ADMIN_USER_ID='user_Owner123';
 equal((await get(owner,'view=emails&emailState=arbitrary')).status,400);
 equal((await get(owner,'view=emails&page=10001')).status,400);
 let result=await get(owner);equal(result.status,200);equal(result.headers.get('cache-control'),'no-store');equal(result.body.backlog,0);equal(result.body.alert,false);equal(result.body.records.total,0);
 for(const state of types.adminEmailStates.filter(value=>value!=='all'))add(`state-${state}`,state,state==='delivered'?5:state==='retry'?4:0,state==='failed'?'PRIVATE_ERROR_CANARY':state==='retry'?'provider_429':'');
 result=await get(owner);
 equal(result.body.backlog,3,'Retry and sending count in backlog');equal(result.body.failed,2,'Delivered on attempt five is not failed');equal(result.body.delivered,1);equal(result.body.retrying,1);equal(result.body.sending,1);equal(result.body.bounced,1);equal(result.body.complained,1);equal(result.body.suppressed,1);equal(result.body.submitted,1);equal(result.body.alert,true);ok(result.body.queueAgeSeconds>=1200);
 const serialized=JSON.stringify(result.body);
 for(const canary of ['PRIVATE_OWNER_CANARY','PRIVATE_THREAD_CANARY','PRIVATE_TITLE_CANARY','PRIVATE_EMAIL_CANARY','PRIVATE_BODY_CANARY','PRIVATE_PROVIDER_CANARY','PRIVATE_ERROR_CANARY'])ok(!serialized.includes(canary),`No private field or arbitrary error leaks: ${canary}`);
 equal(result.body.records.items.find(row=>row.state==='retry').lastError,'Email provider returned HTTP 429.');
 sql.prepare("UPDATE notification_emails SET created='!invalid' WHERE notification_id='state-pending'").run();
 const unknownAge=await get(owner);equal(unknownAge.body.queueAgeSeconds,null);equal(unknownAge.body.alert,null);
 sql.prepare('UPDATE notification_emails SET created=? WHERE notification_id=?').run(new Date(Date.now()-1200000).toISOString(),'state-pending');
 for(const state of types.adminEmailStates.filter(value=>value!=='all')){
  const filtered=await get(owner,`view=emails&emailState=${state}`);equal(filtered.status,200);equal(filtered.body.records.total,1);equal(filtered.body.records.items[0].state,state);equal(filtered.body.backlog,3,'Metrics remain environment-wide');
 }
 for(let i=0;i<60;i++)add(`extra-${String(i).padStart(2,'0')}`,'submitted');
 const pages=[];
 for(let page=1;page<=3;page++){const r=await get(owner,`view=emails&page=${page}`);equal(r.body.records.page,page);equal(r.body.records.pages,3);equal(r.body.records.total,72);pages.push(...r.body.records.items.map(row=>row.notificationId));}
 equal(new Set(pages).size,72,'Stable tied timestamps do not duplicate or lose rows');
 const clamped=await get(owner,'view=emails&page=10000');equal(clamped.body.records.page,3);equal(clamped.body.records.items.length,22);
 const prior=JSON.stringify(sql.prepare('SELECT * FROM notification_emails').all());
 const response=await auth.run(owner,()=>route.POST(new Request('https://findin.example/api/admin',{method:'POST',headers:{origin:'https://findin.example','content-type':'application/json'},body:JSON.stringify({action:'retryEmail',notificationId:'state-delivered'})})));
 equal(response.status,400,'No forced retry mutation exists');equal(JSON.stringify(sql.prepare('SELECT * FROM notification_emails').all()),prior,'Rejected retry preserves all safety state');
 unavailable=true;const failed=await get(owner);equal(failed.status,503);ok(!JSON.stringify(failed.body).includes('SQL_AND_TOKEN'));unavailable=false;
 env.RESEND_API_KEY='fake';env.EMAIL_FROM='FindIn <alerts@example.test>';env.NOTIFICATION_DISPATCH_SECRET='x'.repeat(32);env.RESEND_WEBHOOK_SECRET='fake';
 const config=(await get(owner,'view=overview')).body.configuration;equal(config.emailActive,true);equal(config.emailAutomationConfigured,true);equal(config.emailReceiptsConfigured,true);
 env.FIRSTSIGNAL_ORIGIN='https://findin.example/path';equal((await get(owner,'view=overview')).body.configuration.originConfigured,false);env.FIRSTSIGNAL_ORIGIN='https://findin.example';
 const ui=await load('components/admin-portal.tsx',{'./project-icon':{default:()=>null},'next/link':{default:()=>null},'@/components/auth-form':{SignOutButton:()=>null},'@/components/ui/dialog':{},'@/components/ui/sheet':{},'@/lib/admin-types':types});
 const html=renderToStaticMarkup(React.createElement(ui.EmailOperationsPanel,{data:result.body,onPage:()=>{}}));
 ok(html.includes('Accepted by recipient server'));ok(html.includes('does not confirm inbox placement or reading'));ok(html.includes('does not send an alert'));ok(!html.includes('Retry dispatch'));ok(!html.includes('PRIVATE_EMAIL_CANARY'));ok(html.includes('aria-label="Next page"'));ok(html.includes('Waiting to retry'));ok(html.includes('Attempts stopped'));
 const escaped={...result.body,records:{...result.body.records,items:[{...result.body.records.items[0],notificationId:'<img src=x onerror=alert(1)>',state:'<unsafe>',kind:'<unsafe>',lastError:'<private>'}]}};
 const escapedHtml=renderToStaticMarkup(React.createElement(ui.EmailOperationsPanel,{data:escaped,onPage:()=>{}}));ok(!escapedHtml.includes('<img src=x'));ok(escapedHtml.includes('&lt;img'));ok(escapedHtml.includes('Unrecognized state'));
 const css=postcss.parse(await fs.readFile('app/admin/admin.css','utf8'));ok(css.nodes.length>0);
 const monitoring=await load('lib/monitoring.ts');
 const id1=monitoring.getRequestId(new Request('https://findin.example',{headers:{'x-request-id':'spoofed_request'}})),id2=monitoring.getRequestId();ok(id1!=='spoofed_request');ok(id1!==id2);
 monitoring.logSafeError('PRIVATE_CONTEXT_CANARY',new Error('PRIVATE_SQL_TOKEN_CANARY'),{requestId:'legitimate_id',path:'/PRIVATE_PATH_CANARY',userId:'PRIVATE_USER_CANARY'});
 const logged=JSON.stringify(errors);for(const canary of ['PRIVATE_CONTEXT_CANARY','PRIVATE_SQL_TOKEN_CANARY','PRIVATE_PATH_CANARY','PRIVATE_USER_CANARY'])ok(!logged.includes(canary));
 const tracker=monitoring.createTimingTracker();tracker.mark('db','valid');tracker.mark('evil\r\nheader','SECRET');tracker.mark('ok','bad"\r\ncanary');ok(tracker.header().includes('db;dur='));ok(!tracker.header().includes('evil'));ok(!tracker.header().includes('canary'));
 let health=await monitoring.checkOutboxQueueHealth(db);equal(health.status,'delayed');equal(health.pendingCount,3);equal(health.alert,true);
 unavailable=true;health=await monitoring.checkOutboxQueueHealth(db);equal(health.status,'unavailable');equal(health.alert,null);equal(health.pendingCount,null);unavailable=false;
 health=await monitoring.checkOutboxQueueHealth({prepare:()=>({first:async()=>({count:1,oldest:'invalid'})})});equal(health.status,'unavailable');
 sql.prepare('DELETE FROM notification_emails').run();health=await monitoring.checkOutboxQueueHealth(db);equal(health.status,'ok');equal(health.pendingCount,0);equal(health.queueAgeSeconds,0);
 console.log(`Passed ${checks} owner email operations and monitoring checks: real SQLite/route authorization, immutable safety state, all delivery states, paging/redaction, honest configuration and React SSR, bounded metadata and unavailable queue health.`);
} finally {sql.close();}
