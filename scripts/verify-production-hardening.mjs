import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import { transform } from 'esbuild';
import { z } from 'zod';

// Actual schemas, route and SQL; synthetic identities and in-memory storage.
// No Clerk account, production request, external email or live erasure is used.
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys=ON');
for (const file of (await fs.readdir('drizzle')).filter(file => file.endsWith('.sql')).sort()) sqlite.exec(await fs.readFile(`drizzle/${file}`, 'utf8'));
let checks=0,dbCalls=0,maximumBindings=0,failReads=false,failRevision=false,failStateOnce=false,beforeBatch=null;
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks++; };
const ok = (actual, label) => { assert.ok(actual, label); checks++; };
const db = { prepare(sql) {
  dbCalls++;
  if(failStateOnce && sql.includes('SELECT p.* FROM profiles p WHERE')){failStateOnce=false;throw new Error('Synthetic read fault')}
 if (failReads) throw new Error('Synthetic database failure');
  const query = sqlite.prepare(sql); let args = [];
  const execute = () => {if(failRevision && sql.startsWith('INSERT INTO idea_revisions'))throw new Error('Synthetic revision fault');return query.columns().length ? { results: query.all(...args), meta: { changes: 0 } } : { results: [], meta: { changes: query.run(...args).changes } }; };
  const statement = { bind(...values) { maximumBindings = Math.max(maximumBindings, values.length); assert.ok(values.length <= 100, 'D1 binding limit'); args = values; return statement; }, async all() { return execute(); }, async run() { return execute(); }, async first() { return query.get(...args) ?? null; }, execute };
  return statement;
}, async batch(statements) {
  if(beforeBatch){const callback=beforeBatch;beforeBatch=null;callback()}
  sqlite.exec('BEGIN IMMEDIATE');
  try { const result = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return result; }
  catch (error) { sqlite.exec('ROLLBACK'); throw error; }
} };
async function load(file, modules = {}) {
  const { code } = await transform(await fs.readFile(file, 'utf8'), { loader: 'ts', format: 'cjs' });
  const context = { module: { exports: {} }, exports: {}, require: name => { assert.ok(name in modules, `Unexpected dependency ${name}`); return modules[name]; }, console, Response, Request, URL, crypto, TextDecoder, TextEncoder, Uint8Array };
  vm.runInNewContext(code, context); return context.module.exports;
}
const auth = new AsyncLocalStorage();
const throttle = await load('lib/rate-limit.ts');
const sectors = await load('lib/sectors.ts');
const data = await load('lib/data.ts', { './sectors': sectors, './seed-startups.json': JSON.parse(await fs.readFile('lib/seed-startups.json', 'utf8')), './seed-investors.json': JSON.parse(await fs.readFile('lib/seed-investors.json', 'utf8')) });
const validation = await load('lib/validation.ts', { zod: { z }, './data': data, './sectors': sectors });
const streaming = await load('lib/streaming-request.ts');
const monitoring = await load('lib/monitoring.ts');
const idempotency = await load('lib/idempotency.ts');
const abuse = await load('lib/abuse-control.ts');
const revisions = await load('lib/revisions.ts');
const route = await load('app/api/workspace/route.ts', { '../../auth': { getAppUser: async () => auth.getStore() }, '@/lib/notifications': { notificationStatements: () => [] }, '@/lib/database': { database: () => db }, '@/lib/data': data, '@/lib/validation': validation, '@/lib/member-safety': { membersBlocked: async () => false }, '@/lib/rate-limit': throttle, '@/lib/streaming-request': streaming, '@/lib/monitoring': monitoring, '@/lib/idempotency': idempotency, '@/lib/abuse-control': abuse, '@/lib/revisions': revisions });

const origin='https://findin.example';
async function post(owner,payload,expected=200){const res=await auth.run(owner?{userId:owner,displayName:'Synthetic member',email:'member@example.test',emailVerified:true}:null,()=>route.POST(new Request(`${origin}/api/workspace`,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(payload)})));const body=await res.json();if(Array.isArray(expected))ok(expected.includes(res.status),JSON.stringify(body));else equal(res.status,expected,JSON.stringify(body));equal(res.headers.get('cache-control'),'no-store');return body}
async function get(owner='',query='',expected=200){const res=await auth.run(owner?{userId:owner,displayName:'Synthetic member'}:null,()=>route.GET(new Request(`${origin}/api/workspace${query}`)));const body=await res.json();equal(res.status,expected,JSON.stringify(body));return body}
const base={kind:'startup',name:'Synthetic handovers',founder:'Synthetic Founder',city:'Chennai',sector:data.sectors[0],stage:data.stages[0],tagline:'Clearer handovers for small workshop teams.',problem:'Manufacturing teams lose important shift information.',solution:'A structured handover service with transparent updates.',fundingIntentINR:0};
const create=(operationId,name=base.name)=>({action:'profile',profile:{...base,name},listed:true,consent:true,operationId});
const count=(table,where='',...args)=>sqlite.prepare(`SELECT COUNT(*) n FROM ${table} ${where}`).get(...args).n;
try{
 const both=await Promise.all([post('founder-a',create('create-a')),post('founder-a',create('create-a'))]);
 equal(both[0].savedProfileId,both[1].savedProfileId,'Overlapping retries return one idea ID');equal(count('profiles','WHERE owner=?','founder-a'),1);equal(count('idempotency_keys'),1);
 const id=both[0].savedProfileId;
 await post('founder-a',create('create-a','Different payload'),409);
 await post('founder-a',{action:'saveSearch',name:'different action',query:'',filters:'{}',alertsEnabled:false,operationId:'create-a'},409);
 const second=await post('founder-a',create('create-b','Independent second idea'));ok(second.savedProfileId!==id);equal(count('profiles','WHERE owner=?','founder-a'),2);
 const edit={action:'profile',profileId:id,profile:{...base,name:'Changed original'},listed:false,consent:true,expectedVersion:1,operationId:'edit-a'};
 const edits=await Promise.all([post('founder-a',edit),post('founder-a',edit)]);equal(edits[0].myProfiles.find(p=>p.id===id).version,2);equal(count('idea_revisions','WHERE profile_id=?',id),1);
 await post('founder-a',{...edit,operationId:'stale-edit',profile:{...base,name:'Stale overwrite'}},409);
 equal(JSON.parse(sqlite.prepare('SELECT data FROM profiles WHERE id=?').get(id).data).name,'Changed original');
 await post('founder-a',{action:'profile',profileId:id,profile:base,listed:true,consent:true},409);
 const history=await post('founder-a',{action:'getRevisions',profileId:id});equal(history.revisions.length,1);equal(history.revisions[0].data.name,base.name);equal(history.revisions[0].listed,true);
 const outsider=await post('outsider',{action:'getRevisions',profileId:id});equal(outsider.revisions.length,0);
 await post('outsider',{action:'restoreRevision',profileId:id,revisionId:history.revisions[0].id,expectedVersion:2},404);
 await post('founder-a',{action:'restoreRevision',profileId:id,revisionId:history.revisions[0].id,expectedVersion:1},409);
 const restore={action:'restoreRevision',profileId:id,revisionId:history.revisions[0].id,expectedVersion:2,operationId:'restore-a'};
 const restored=await post('founder-a',restore);equal(restored.myProfiles.find(p=>p.id===id).name,base.name);equal(restored.myProfiles.find(p=>p.id===id).listed,false,'Restore keeps visibility');equal(restored.myProfiles.find(p=>p.id===id).version,3);equal(count('idea_revisions','WHERE profile_id=?',id),2);
 await post('founder-a',restore);equal(count('idea_revisions','WHERE profile_id=?',id),2);
 failRevision=true;await post('founder-a',{...edit,expectedVersion:3,operationId:'revision-fault'},503);failRevision=false;equal(sqlite.prepare('SELECT version FROM profile_versions WHERE profile_id=?').get(id).version,3);equal(count('idempotency_keys','WHERE operation_id=?','revision-fault'),0);
 const progress={action:'progress',profileId:id,title:'Synthetic update',body:'A useful synthetic progress observation for retry tests.',date:'2026-10-19',consent:true,operationId:'progress-a'};await Promise.all([post('founder-a',progress),post('founder-a',progress)]);equal(count('progress_updates','WHERE profile_id=?',id),1);
 const search={action:'saveSearch',name:'Manufacturing ideas',query:'handover',filters:JSON.stringify({kind:'startup',sector:'all',stage:'all',sort:'curated',membersOnly:true,signalsOnly:false}),alertsEnabled:false,operationId:'search-a'};await Promise.all([post('founder-a',search),post('founder-a',search)]);equal(count('saved_searches','WHERE owner=?','founder-a'),1);
 await post('founder-a',{...search,operationId:'bad-search',filters:'{broken'},400);await post('founder-a',{...search,operationId:'bad-alert',alertsEnabled:true},400);
 const archive=await post('founder-a',{action:'exportData',chunk:'profiles'});equal(archive.dataArchive.profiles.length,2);equal(archive.dataArchive.profiles.find(p=>p.id===id).version,3);ok(!('connections'in archive.dataArchive));
 failStateOnce=true;await post('failure-owner',create('response-read-fault'),503);equal(count('profiles','WHERE owner=?','failure-owner'),1);await post('failure-owner',create('response-read-fault'));equal(count('profiles','WHERE owner=?','failure-owner'),1,'Post-commit read failure can retry safely');
 const target=await post('target-owner',{action:'profile',profile:{...base,kind:'investor'},listed:true,consent:true,operationId:'target'});
 const request={action:'request',profileId:target.savedProfileId,sourceProfileId:second.savedProfileId,message:'A synthetic introduction to discuss this specific idea.',consent:true,operationId:'request-a'};await Promise.all([post('founder-a',request),post('founder-a',request)]);equal(count('introductions','WHERE sender=?','founder-a'),1);const intro=sqlite.prepare('SELECT id FROM introductions WHERE sender=?').get('founder-a').id;
 await post('target-owner',{action:'respond',id:intro,status:'accepted'});
 const msg={action:'message',id:intro,body:'A synthetic message saved once after overlapping retries.',operationId:'message-a'};await Promise.all([post('founder-a',msg),post('founder-a',msg)]);equal(count('messages','WHERE introduction_id=?',intro),1);
 const inbox=await get('target-owner');const summary=inbox.requests.find(r=>r.id===intro);equal(summary.unreadCount,1);equal(summary.messages.length,0);equal(summary.latestMessage.body,msg.body);
 await post('target-owner',{action:'markConversationRead',id:intro},400);
 const time='2026-10-19T00:00:00.000Z';for(let i=0;i<205;i++)sqlite.prepare('INSERT INTO profiles(id,owner,kind,data,listed,updated) VALUES(?,?,?,?,?,?)').run(`page-${String(i).padStart(3,'0')}`,`page-owner-${i}`,'startup',JSON.stringify(base),1,time);
 let cursor=null,seen=new Set(),pages=0;do{const state=await get('',`?limit=37${cursor?'&cursor='+encodeURIComponent(cursor):''}`);for(const p of state.profiles.filter(p=>!p.demo)){ok(!seen.has(p.id),'No repeated real profile across pages');seen.add(p.id)}cursor=state.nextCursor;pages++;ok(pages<20)}while(cursor);equal(seen.size,count('profiles','WHERE listed=1'));
 await get('','?limit=NaN',400);await get('','?limit=-1',400);await get('','?cursor=garbage',400);await get('','?conversationLimit=101',400);
 sqlite.prepare('INSERT INTO notification_preferences(owner,email,enabled) VALUES(?,?,1)').run('founder-a','member@example.test');
 const closure=await post('founder-a',{action:'requestAccountClosure',reason:'Please review my closure request.',consent:true});equal(closure.accountClosure.status,'requested');equal(closure.accountClosure.retentionUntil,'');equal(count('profiles','WHERE owner=? AND listed=1','founder-a'),0);equal(sqlite.prepare('SELECT enabled FROM notification_preferences WHERE owner=?').get('founder-a').enabled,0);
 await post('founder-a',create('blocked-closure'),409);await post('founder-a',{...edit,expectedVersion:3,operationId:'blocked-edit'},409);await post('founder-a',{action:'cancelAccountClosure'});equal(count('profiles','WHERE owner=? AND listed=1','founder-a'),0,'Cancel never republishes ideas');
 const mismatch=await Promise.all([post('mismatch-owner',create('same-key','First contender'),[200,409]),post('mismatch-owner',create('same-key','Second contender'),[200,409])]);equal(mismatch.filter(item=>item.operationConflict).length,1);equal(count('profiles','WHERE owner=?','mismatch-owner'),1);
 const cas=await Promise.all([{...edit,expectedVersion:3,operationId:'race-one',profile:{...base,name:'CAS contender one'}},{...edit,expectedVersion:3,operationId:'race-two',profile:{...base,name:'CAS contender two'}}].map(payload=>post('founder-a',payload,[200,409])));equal(cas.filter(item=>item.conflict).length,1);equal(sqlite.prepare('SELECT version FROM profile_versions WHERE profile_id=?').get(id).version,4);equal(count('idea_revisions','WHERE profile_id=?',id),3);
 const quotas=await Promise.all(Array.from({length:12},()=>abuse.consumeAtomicDailyQuota(db,'quota-owner','invitations',3,'2026-10-20T00:00:00.000Z')));equal(quotas.filter(q=>q.allowed).length,3);equal(sqlite.prepare('SELECT count FROM daily_quotas WHERE owner=?').get('quota-owner').count,3);equal(quotas.filter(q=>q.allowed).at(-1).remaining,0);const nextDay=await abuse.consumeAtomicDailyQuota(db,'quota-owner','invitations',3,'2026-10-21T00:00:00.000Z');equal(nextDay.allowed,true);equal(nextDay.remaining,2);
 const unicode='\u3053\u3093\u306b\u3061\u306f',encoded=new TextEncoder().encode(unicode);let pulls=0,cancelled=false;const stream=new ReadableStream({pull(controller){pulls++;controller.enqueue(new Uint8Array(20))},cancel(){cancelled=true}});const oversized=await streaming.readBoundedBody(new Request(origin,{method:'POST',body:stream,duplex:'half'}),21);equal(oversized.ok,false);equal(oversized.status,413);ok(cancelled);ok(pulls<=3);
 const split=new ReadableStream({start(controller){controller.enqueue(encoded.slice(0,2));controller.enqueue(encoded.slice(2));controller.close()}});const decoded=await streaming.readBoundedBody(new Request(origin,{method:'POST',body:split,duplex:'half'}),encoded.length);equal(decoded.ok,true);equal(decoded.body,unicode);
 const invalid=new ReadableStream({start(controller){controller.enqueue(new Uint8Array([0xff]));controller.close()}});const malformed=await streaming.readBoundedBody(new Request(origin,{method:'POST',body:invalid,duplex:'half'}),10);equal(malformed.ok,false);equal(malformed.status,400);
 const raceOwner=await post('closure-race',create('closure-race-create'));
 beforeBatch=()=>{sqlite.prepare("INSERT INTO account_closures(owner,status,requested_at,retention_until,reason,updated) VALUES(?,'requested',?,'','',?)").run('closure-race',time,time);sqlite.prepare('UPDATE profiles SET listed=0 WHERE owner=?').run('closure-race')};
 await post('closure-race',{action:'profile',profileId:raceOwner.savedProfileId,profile:{...base,name:'Forbidden concurrent relist'},listed:true,consent:true,expectedVersion:1,operationId:'closure-race-edit'},409);
 equal(sqlite.prepare('SELECT listed FROM profiles WHERE id=?').get(raceOwner.savedProfileId).listed,0);equal(sqlite.prepare('SELECT version FROM profile_versions WHERE profile_id=?').get(raceOwner.savedProfileId).version,1);equal(count('idempotency_keys','WHERE operation_id=?','closure-race-edit'),0);
 // Pre-existing profiles have no version row: read as version one, then
 // initialize the version and snapshot atomically on the first owned edit.
 sqlite.prepare('INSERT INTO profiles(id,owner,kind,data,listed,updated) VALUES(?,?,?,?,?,?)').run('legacy-unversioned','legacy-owner','startup',JSON.stringify(base),1,time);
 equal(count('profile_versions','WHERE profile_id=?','legacy-unversioned'),0);
 equal((await get('legacy-owner')).myProfiles[0].version,1);
 const legacyEdit=await post('legacy-owner',{action:'profile',profileId:'legacy-unversioned',profile:{...base,name:'Legacy idea updated'},listed:false,consent:true,expectedVersion:1,operationId:'legacy-first-edit'});
 equal(legacyEdit.myProfiles[0].version,2);equal(legacyEdit.myProfiles[0].name,'Legacy idea updated');
 const legacyHistory=await post('legacy-owner',{action:'getRevisions',profileId:'legacy-unversioned'});
 equal(legacyHistory.revisions.length,1);equal(legacyHistory.revisions[0].version,1);equal(legacyHistory.revisions[0].data.name,base.name);
 equal(sqlite.prepare('PRAGMA foreign_key_check').all().length,0);ok(maximumBindings<=100);ok(dbCalls>0);console.log(`Production hardening: ${checks} actual route/SQLite assertions passed.`);
}finally{sqlite.close()}
