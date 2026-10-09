import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {transform} from 'esbuild';

const owner='test-owner',now='2026-10-09T00:00:00.000Z';
const publicRows=Array.from({length:200},(_,i)=>({id:`public-${i}`,owner:`member-${i}`,kind:'startup',data:JSON.stringify({name:`Public ${i}`}),listed:1,updated:now}));
const ownRows=Array.from({length:2},(_,i)=>({id:`private-${i}`,owner,kind:i?'investor':'startup',data:JSON.stringify({name:`Private ${i}`}),listed:0,updated:now}));
const requestRows=Array.from({length:100},(_,i)=>({id:`intro-${i}`,sender:owner,recipient:`other-${i}`,profile_id:`public-${i}`,target_name:'Member',sender_name:'Me',message:'Request',status:'accepted',created:now,updated:now,activity:now,blocked:0}));
let progressChunks=[],messageIds=[];
const database=()=>({
 prepare(sql){
  let args=[];
  const statement={bind(...values){assert.ok(values.length<=100,`D1 limits bound parameters to100; got ${values.length}`);args=values;return statement;},
   async all(){
    if(sql.includes('FROM progress_updates'))return {results:args.map(id=>({id:`update-${id}`,profile_id:id,date:'2026-10-08',title:'Progress',body:'Dated progress',created:now}))};
    if(sql.includes('SELECT p.* FROM profiles')){assert.ok(sql.includes('member_blocks'));return {results:publicRows};}
    if(sql.includes('SELECT * FROM profiles WHERE owner='))return {results:ownRows};
    if(sql.includes('FROM introductions r')){assert.ok(sql.includes('LIMIT 100'));return {results:requestRows};}
    if(sql.includes('FROM messages WHERE introduction_id IN')){messageIds=args;assert.ok(sql.includes('LIMIT 10000'));return {results:args.map(id=>({id:`message-${id}`,introduction_id:id,sender:owner,sender_name:'Me',body:'Private message',created:now}))};}
    return {results:[]};
   },async first(){return null;},async run(){return {meta:{changes:1}};},values:()=>args};
  return statement;
 },
 async batch(statements){progressChunks=statements.map(s=>s.values().length);return Promise.all(statements.map(s=>s.all()));}
});
const source=(await fs.readFile(new URL('../app/api/workspace/route.ts',import.meta.url),'utf8'))+'\nexport {state as testState};';
const {code}=await transform(source,{loader:'ts',format:'cjs'});
const modules={
 '../../auth':{getAppUser:async()=>null},'@/lib/notifications':{notify:async()=>{}},'@/lib/database':{database},
 '@/lib/data':{seedProfiles:[]},'@/lib/validation':{actionSchema:{}},'@/lib/member-safety':{membersBlocked:async()=>false}
};
const context={module:{exports:{}},exports:{},require:id=>{assert.ok(id in modules,`Unexpected dependency ${id}`);return modules[id];},console,Response};
vm.runInNewContext(code,context);
const state=await context.module.exports.testState(owner);
assert.deepEqual(Array.from(progressChunks),[100,100,2]);
assert.equal(state.profiles.length,200);
assert.equal(state.myProfiles.length,2);
assert.ok([...state.profiles,...state.myProfiles].every(p=>p.updates.length===1),'Every visible profile must retain its updates across query batches');
assert.deepEqual(Array.from(messageIds),requestRows.map(r=>r.id));
assert.ok(state.requests.every(r=>r.messages.length===1));
assert.ok(!JSON.stringify(state).includes('test-owner'),'Account IDs must stay private');
console.log('Workspace 202-profile D1 parameter limits, progress batching, bounded conversation messages and private account identifiers passed.');
