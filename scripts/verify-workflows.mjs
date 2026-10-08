import assert from "node:assert/strict";
const origin=process.env.TEST_ORIGIN??"http://127.0.0.1:8787";
if(!["127.0.0.1","localhost"].includes(new URL(origin).hostname))throw new Error("This test is restricted to the local built Worker.");
const suffix=crypto.randomUUID();const alice=`qa-founder-${suffix}`,bob=`qa-investor-${suffix}`,other=`qa-other-${suffix}`;
let checks=0;
const tokens = JSON.parse(process.env.CLERK_QA_TOKENS || "null");
if (!tokens) throw new Error("Run verify-clerk-workflows.mjs to obtain verified development sessions.");
async function call(user,payload,expected=200,originHeader=origin){const headers={};if(user){headers.Authorization=`Bearer ${tokens[user===alice?'alice':user===bob?'bob':'other']}`}if(payload){headers["Content-Type"]="application/json";headers.Origin=originHeader}const r=await fetch(`${origin}/api/workspace`,{method:payload?"POST":"GET",headers,body:payload?JSON.stringify(payload):undefined});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={error:text}}if(Array.isArray(expected))assert.ok(expected.includes(r.status),JSON.stringify(data));else assert.equal(r.status,expected,JSON.stringify(data));checks++;return data;}

async function connection(user,payload,expected=200,id=null){const headers={};if(user)headers.Authorization=`Bearer ${tokens[user===alice?'alice':user===bob?'bob':'other']}`;if(payload){headers['Content-Type']='application/json';headers.Origin=origin}const r=await fetch(`${origin}/api/connections${id?'?id='+encodeURIComponent(id):''}`,{method:payload?'POST':'GET',headers,body:payload?JSON.stringify(payload):undefined});const data=await r.json();if(Array.isArray(expected))assert.ok(expected.includes(r.status),JSON.stringify(data));else assert.equal(r.status,expected,JSON.stringify(data));checks++;return {...data,httpStatus:r.status};}
const profile={kind:"startup",name:"Local workflow test",founder:"Test Founder",city:"Bengaluru",sector:"Manufacturing SaaS",stage:"Pre-product",tagline:"A local test profile for workflow verification",problem:"A fictional problem used only for local quality checks.",solution:"Test workflow",experience:"Fictional",validation:"Test evidence",evidenceDate:"2026-10-01",uncertainty:"Test assumptions",nextMilestone:"Verify private access",fundingIntentINR:500000,budget:"Test budget",productStatus:"No product",revenueStatus:"No revenue",incorporationStatus:"Not incorporated"};
const initial=await call();assert.equal(initial.profiles.filter(p=>p.demo).length,9);checks++;
await call(null,{action:"save",profileId:"tracegrid",saved:true},401);
// Vinext may reject cross-origin requests before the application handler.
await call(alice,{action:"save",profileId:"tracegrid",saved:true},[403,503],"https://example.invalid");
await call(alice,{action:"profile",profile,listed:false,consent:false},400);
let owner=await call(alice,{action:"profile",profile,listed:false,consent:true});const id=owner.myProfiles[0].id;assert.deepEqual(owner.myProfiles[0].updates,[]);assert.equal(owner.myProfiles[0].evidenceDate,"2026-10-01");checks+=2;
let visitor=await call(bob);assert.equal(visitor.myProfiles.length,0);assert.ok(!visitor.profiles.some(p=>p.id===id));checks+=2;
await call(bob,{action:"request",profileId:id,message:"I would like to discuss this fictional workflow.",consent:true},404);
owner=await call(alice,{action:"profile",profile:{...profile,city:"Chennai"},listed:true,consent:true});assert.equal(owner.myProfiles[0].id,id);assert.equal(owner.myProfiles[0].evidenceDate,"2026-10-01");checks+=2;
visitor=await call(bob);assert.ok(visitor.profiles.some(p=>p.id===id&&!p.mine));checks++;
await call(alice,{action:"request",profileId:id,message:"I would like to discuss this fictional workflow.",consent:true},400);
visitor=await call(bob,{action:"save",profileId:id,saved:true});assert.ok(visitor.savedIds.includes(id));checks++;
let again=await call(bob);assert.ok(again.savedIds.includes(id));checks++;
visitor=await call(bob,{action:"request",profileId:id,message:"I can help test this workflow and discuss the next milestone.",consent:true});const intro=visitor.requests.find(i=>i.profileId===id);assert.equal(intro.status,"pending");checks++;
await call(bob,{action:"request",profileId:id,message:"This repeated request should be prevented.",consent:true},409);
await call(bob,{action:"message",id:intro.id,body:"Cannot message before consent."},403);
await connection(null,null,401);await connection(bob,{action:'proposal',id:intro.id,version:0,amount:500000,terms:'Discuss funding after validating customer interest.',consent:true},404);
await call(other,{action:"respond",id:intro.id,status:"accepted"},404);
await call(bob,{action:"respond",id:intro.id,status:"accepted"},403);
owner=await call(alice);assert.equal(owner.requests[0].direction,"incoming");checks++;
owner=await call(alice,{action:"respond",id:intro.id,status:"accepted"});assert.equal(owner.requests[0].status,"accepted");checks++;
visitor=await call(bob,{action:"message",id:intro.id,body:"Thanks for accepting. What would disprove the hypothesis?"});assert.equal(visitor.requests[0].messages.length,1);checks++;
owner=await call(alice);assert.equal(owner.requests[0].messages[0].mine,false);checks++;
owner=await call(alice,{action:"message",id:intro.id,body:"The next experiment tests adoption before software investment."});assert.equal(owner.requests[0].messages.length,2);checks++;
const outsider=await call(other);assert.equal(outsider.requests.length,0);assert.equal(outsider.savedIds.length,0);checks+=2;
await call(other,{action:"message",id:intro.id,body:"This account must not enter the conversation."},404);
visitor=await call(bob,{action:"request",profileId:"tracegrid",message:"A private practice note about the fictional founder's evidence.",consent:true});assert.equal(visitor.requests.find(i=>i.profileId==="tracegrid").status,"draft");checks++;
await call(bob,{action:"message",id:visitor.requests.find(i=>i.profileId==="tracegrid").id,body:"No imaginary recipient should be messaged."},403);

const proposal=(version,amount=500000)=>({action:'proposal',id:intro.id,version,amount,terms:'Discuss funding after validating customer interest.',consent:true});
const decision=(version,status)=>({action:'decision',id:intro.id,version,status,consent:true});
await connection(other,null,404,intro.id);await connection(other,proposal(0),404);
await connection(bob,{...proposal(0),consent:false},400);await connection(bob,proposal(0,-1),400);
let negotiations=await connection(bob,proposal(0));assert.equal(negotiations.current.version,1);assert.equal(negotiations.current.mine,true);checks+=2;
await connection(bob,proposal(1),409);await connection(bob,decision(1,'acknowledged'),403);await connection(alice,decision(1,'withdrawn'),403);
await connection(alice,proposal(0),409);
negotiations=await connection(alice,proposal(1,400000));assert.equal(negotiations.current.amount,400000);assert.equal(negotiations.events.length,2);checks+=2;
negotiations=await connection(bob,null,200,intro.id);assert.equal(negotiations.current.mine,false);checks++;
// Both responses share version 2; only one may commit and create history.
const race=await Promise.all([connection(bob,proposal(2,450000),[200,409]),connection(bob,proposal(2,460000),[200,409])]);assert.deepEqual(race.map(r=>r.httpStatus).sort(),[200,409]);checks++;
// Arrival order is nondeterministic: verify actual state independently below.
negotiations=await connection(bob,null,200,intro.id);assert.equal(negotiations.current.version,3);assert.equal(negotiations.events.length,3);checks+=2;

negotiations=await connection(alice,decision(3,'acknowledged'));assert.equal(negotiations.current.status,'acknowledged');assert.equal(negotiations.events[3].mine,true);checks+=2;
await connection(bob,decision(4,'withdrawn'),409);
negotiations=await connection(bob,proposal(4));negotiations=await connection(bob,decision(5,'withdrawn'));assert.equal(negotiations.current.status,'withdrawn');checks++;
negotiations=await connection(alice,proposal(6));negotiations=await connection(bob,decision(7,'declined'));assert.equal(negotiations.current.status,'declined');assert.equal(negotiations.events.length,8);checks+=2;
const settings=await connection(alice,null);assert.ok(settings.notifications.length>=4);assert.equal(settings.emailEnabled,false);checks+=2;
const isolated=await connection(other,null);assert.equal(isolated.notifications.length,0);checks++;
const disabled=await connection(alice,{action:'preferences',enabled:false});assert.ok(disabled.notifications.every(n=>n.status==='skipped'));checks++;
await connection(alice,{action:'retry'});
await call(alice,{action:"profile",profile:{...profile,evidenceDate:"2026-02-31"},listed:false,consent:true},400);
await call(alice,{action:"profile",profile,listed:false,consent:true});await call(bob,{action:"save",profileId:id,saved:false});
console.log(JSON.stringify({result:"passed",checks,scope:"Local Worker with verified Clerk development sessions; two-party consent, persistence, validation, and account isolation",testProfiles:"Retained privately in local database; never deployed"}));
