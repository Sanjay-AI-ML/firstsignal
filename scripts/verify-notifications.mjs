import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {transform} from 'esbuild';
const env={RESEND_API_KEY:'test-only',EMAIL_FROM:'FirstSignal <updates@example.test>',FIRSTSIGNAL_ORIGIN:'https://example.test'};
let enabled=false, attempts=[], mode='success';
const notices=[{id:'test-notice',title:'A new private proposal is ready to review',status:'pending'}];
const database=()=>({prepare(sql){return {bind(...args){return {
 first:async()=>({email:'verified@example.test',enabled:enabled?1:0}),
 all:async()=>({results:notices.filter(n=>n.status==='pending')}),
 run:async()=>{if(sql.startsWith('UPDATE')){assert.equal(args[1],'owner');notices.find(n=>n.id===args[0]).status='submitted';}return {success:true};}
};}};}});
const source=await fs.readFile(new URL('../lib/notifications.ts',import.meta.url),'utf8');
const {code}=await transform(source,{loader:'ts',format:'cjs'});
const context={module:{exports:{}},exports:{},require:id=>id==='cloudflare:workers'?{env}:{database},AbortSignal,Date,console,
 fetch:async(url,request)=>{attempts.push({url,...request});if(mode==='throw')throw new Error('timeout');return {ok:mode==='success',json:async()=>({id:'provider-receipt'})};}};
vm.runInNewContext(code,context);
const {dispatchNotifications,emailConfigured}=context.module.exports;
assert.equal(emailConfigured(),true);
await dispatchNotifications('owner');assert.equal(attempts.length,0,'No sending without opt-in');
enabled=true;mode='throw';await dispatchNotifications('owner');assert.equal(notices[0].status,'pending');
mode='failure';await dispatchNotifications('owner');assert.equal(notices[0].status,'pending');
mode='success';await dispatchNotifications('owner');assert.equal(notices[0].status,'submitted');
assert.equal(new Set(attempts.map(a=>a.headers['Idempotency-Key'])).size,1,'Retries must reuse the same key');
const payload=JSON.parse(attempts.at(-1).body);assert.deepEqual(payload.to,['verified@example.test']);assert.ok(payload.text.includes('/app#introductions'));assert.ok(!payload.text.includes('500000'));assert.equal(attempts.at(-1).url,'https://api.resend.com/emails');
await dispatchNotifications('owner');assert.equal(attempts.length,3,'Submitted notices must not be resent');
delete env.RESEND_API_KEY;assert.equal(emailConfigured(),false);await dispatchNotifications('owner');assert.equal(attempts.length,3);
console.log('Notification opt-in, missing configuration, provider failure, retry idempotency and generic payload checks passed. No emails sent.');
