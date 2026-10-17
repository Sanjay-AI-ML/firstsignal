import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import { transform } from 'esbuild';
import { z } from 'zod';

// Exercise the real route, validation and SQL against an isolated SQLite database.
// Authentication is supplied per request; no remote accounts or production data are used.
const sqlite = new DatabaseSync(':memory:');
for (const file of (await fs.readdir('drizzle')).filter(file => file.endsWith('.sql')).sort()) sqlite.exec(await fs.readFile(`drizzle/${file}`, 'utf8'));
const auth = new AsyncLocalStorage();
const db = { prepare(sql) {
  const query = sqlite.prepare(sql); let args = [];
  const statement = { bind(...values) { args = values; return statement; },
    async run() { return {meta: {changes: query.run(...args).changes}}; },
    async first() { return query.get(...args) ?? null; },
    async all() { return {results: query.all(...args)}; }
  }; return statement;
}, async batch(statements) { return Promise.all(statements.map(statement => statement.all())); } };
async function load(file, modules) {
  const {code} = await transform(await fs.readFile(file, 'utf8'), {loader:'ts', format:'cjs'});
  const context = {module:{exports:{}},exports:{},require:id=>{assert.ok(id in modules, `Unexpected dependency: ${id}`);return modules[id];},Response,Request,URL,crypto,console};
  vm.runInNewContext(code,context); return context.module.exports;
}
const sectorModule = await load('lib/sectors.ts', {});
const data = await load('lib/data.ts', {
  './sectors': sectorModule,
  './seed-startups.json': JSON.parse(await fs.readFile('lib/seed-startups.json','utf8')),
  './seed-investors.json': JSON.parse(await fs.readFile('lib/seed-investors.json','utf8'))
});
const validation = await load('lib/validation.ts', {zod:{z}, './data':data, './sectors':sectorModule});
const route = await load('app/api/workspace/route.ts', {
  '../../auth': {getAppUser: async()=>auth.getStore()}, '@/lib/notifications': {notify:async()=>{}},
  '@/lib/database': {database:()=>db}, '@/lib/data':data, '@/lib/validation':validation,
  '@/lib/member-safety': {membersBlocked:async()=>false}
});
const base = {kind:'startup', name:'Profile policy test', founder:'Test Founder', city:'Chennai', sector:data.sectors[0], stage:data.stages[0], tagline:'A profile used only in local tests', problem:'Testing one profile per account without touching real data.', fundingIntentINR:0};
async function save(owner, profile, extras={}) {
  const request = new Request('http://localhost/api/workspace',{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify({action:'profile',profile,listed:false,consent:true,...extras})});
  const response = await auth.run(owner?{userId:owner,displayName:'Test Owner'}:null,()=>route.POST(request));
  return {status:response.status,body:await response.json()};
}
try {
  assert.equal((await save(null,base)).status,401);
  assert.equal((await save('founder',base,{consent:false})).status,400);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM profiles').get().n,0);
  const first = await save('founder',base); assert.equal(first.status,200);
  const id = first.body.myProfiles[0].id;
  const secondRole = await save('founder',{...base,kind:'investor'});
  assert.equal(secondRole.status,409); assert.match(secondRole.body.error,/one founder or investor profile/);
  sqlite.prepare('INSERT INTO progress_updates (id,profile_id,date,title,body,created) VALUES (?,?,?,?,?,?)').run('progress',id,'2026-10-01','Saved progress','Retain this update','2026-10-01');
  const edit = await save('founder',{...base,name:'Updated founder',id:'forged-id',owner:'other'}, {listed:true});
  assert.equal(edit.status,200);assert.equal(edit.body.myProfiles.length,1);assert.equal(edit.body.myProfiles[0].id,id);assert.equal(edit.body.myProfiles[0].updates[0].id,'progress');
  assert.equal(sqlite.prepare('SELECT owner FROM profiles WHERE id=?').get(id).owner,'founder');
  const investor = await save('investor',{...base,kind:'investor'});assert.equal(investor.status,200);
  assert.equal((await save('investor',base)).status,409);
  const race = await Promise.all([save('race',base),save('race',{...base,kind:'investor'})]);
  assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM profiles WHERE owner=?').get('race').n,1);
  const sameRole = await Promise.all([save('same',base),save('same',base)]);
  assert.deepEqual(sameRole.map(r=>r.status),[200,200]);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM profiles WHERE owner=?').get('same').n,1);
  for(const kind of ['startup','investor'])sqlite.prepare('INSERT INTO profiles(id,owner,kind,data,listed,updated) VALUES(?,?,?,?,?,?)').run(`legacy-${kind}`,'legacy',kind,JSON.stringify({...base,kind}),0,'2026-10-01');
  for(const kind of ['startup','investor']){const result=await save('legacy',{...base,kind,name:`Edited ${kind}`});assert.equal(result.status,200);assert.equal(result.body.myProfiles.length,2);assert.equal(result.body.myProfiles.find(p=>p.kind===kind).id,`legacy-${kind}`);}
  const customFounder=await save('custom-founder',{...base,sector:'Other',customSector:'  Textile   Recycling  '});
  assert.equal(customFounder.status,200);assert.equal(customFounder.body.myProfiles[0].customSector,'Textile Recycling');
  const customId=customFounder.body.myProfiles[0].id;
  const editedCustom=await save('custom-founder',{...base,sector:'Other',customSector:'Textile Recycling',name:'Edited custom founder'});
  assert.equal(editedCustom.body.myProfiles[0].id,customId);assert.equal(editedCustom.body.myProfiles[0].customSector,'Textile Recycling');
  const customInvestor=await save('custom-investor',{...base,kind:'investor',sector:'Healthcare & Life Sciences',sectors:['Healthcare & Life Sciences','Other'],customSector:'Pet Care'});
  assert.equal(customInvestor.status,200);assert.deepEqual(customInvestor.body.myProfiles[0].sectors,['Healthcare & Life Sciences','Other']);assert.equal(customInvestor.body.myProfiles[0].customSector,'Pet Care');
  assert.equal((await save('blank-custom',{...base,sector:'Other',customSector:' '})).status,400);
  assert.equal((await save('long-custom',{...base,sector:'Other',customSector:'x'.repeat(81)})).status,400);
  console.log('Passed: account/profile policy, ownership and legacy preservation; custom founder/investor sector persistence, edits and validation.');
} finally { sqlite.close(); }
