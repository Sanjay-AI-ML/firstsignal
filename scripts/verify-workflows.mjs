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
owner=await call(alice,{action:'progress',profileId:id,title:'Customer discovery completed',body:'Interviewed prospective customers and recorded adoption assumptions for the next experiment.',date:'2026-10-01',consent:true});const updateId=owner.myProfiles[0].updates[0].id;assert.ok(updateId);checks++;
let visitor=await call(bob);assert.equal(visitor.myProfiles.length,0);assert.ok(!visitor.profiles.some(p=>p.id===id));checks+=2;
await call(bob,{action:"request",profileId:id,message:"I would like to discuss this fictional workflow.",consent:true},404);
owner=await call(alice,{action:"profile",profile:{...profile,city:"Chennai"},listed:true,consent:true});assert.equal(owner.myProfiles[0].id,id);assert.equal(owner.myProfiles[0].evidenceDate,"2026-10-01");checks+=2;
assert.equal(owner.myProfiles[0].updates[0].id,updateId,'Profile edits must retain independent progress records');checks++;
visitor=await call(bob);assert.ok(visitor.profiles.some(p=>p.id===id&&!p.mine));checks++;
assert.equal(visitor.profiles.find(p=>p.id===id).updates[0].id,updateId,'Listed progress must be available to interested members');checks++;
await call(other,{action:'progress',profileId:id,title:'Forged update',body:'An unrelated account must never write another founder’s progress.',date:'2026-10-01',consent:true},404);
await call(other,{action:'removeProgress',profileId:id,updateId},404);
await call(alice,{action:'progress',profileId:id,title:'Invalid date',body:'Progress must reject an impossible calendar date, even if JavaScript normalizes it.',date:'2026-02-31',consent:true},400);
await call(alice,{action:'progress',profileId:id,title:'Future achievement',body:'Future milestones must not be represented as already completed progress.',date:'2099-01-01',consent:true},400);
await call(alice,{action:'progress',profileId:id,title:'Missing consent',body:'A founder must consent to publishing their progress with their profile.',date:'2026-10-01',consent:false},400);
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
// Investor preferences are persisted and validated rather than inferred from one sector.
const investor={...profile,kind:'investor',name:'Local investor test',problem:'',sectors:['Manufacturing SaaS','Supply-chain SaaS'],stages:['Idea-stage','Pre-product'],checkRangeINR:[100000,500000],requiredEvidence:'Dated customer conversations and an explicit next experiment.'};
visitor=await call(bob,{action:'profile',profile:investor,listed:true,consent:true});const investorId=visitor.myProfiles.find(p=>p.kind==='investor').id;
assert.deepEqual(visitor.myProfiles[0].sectors,investor.sectors);assert.deepEqual(visitor.myProfiles[0].stages,investor.stages);assert.deepEqual(visitor.myProfiles[0].checkRangeINR,investor.checkRangeINR);assert.equal(visitor.myProfiles[0].requiredEvidence,investor.requiredEvidence);checks+=4;
await call(bob,{action:'profile',profile:{...investor,sectors:['Unknown sector']},listed:true,consent:true},400);
await call(bob,{action:'profile',profile:{...investor,checkRangeINR:[500000,100000]},listed:true,consent:true},400);
await call(bob,{action:'profile',profile:{...investor,checkRangeINR:[0,100000]},listed:true,consent:true},400);
await call(bob,{action:'progress',profileId:investorId,title:'Investor progress',body:'Progress updates are intentionally scoped to founder profiles.',date:'2026-10-01',consent:true},404);
// Follow-up notes and dates belong only to the account writing them.
let ownConnection=await connection(bob,{action:'nextStep',id:intro.id,note:'Privately review the customer interview notes.',date:'2026-10-15'});assert.equal(ownConnection.nextStep.note,'Privately review the customer interview notes.');checks++;
let otherConnection=await connection(alice,null,200,intro.id);assert.equal(otherConnection.nextStep,null);assert.ok(!JSON.stringify(otherConnection).includes('clerk:'),'Connection responses must not expose account identifiers');checks+=2;
visitor=await call(bob);assert.equal(visitor.requests.find(r=>r.id===intro.id).nextStep.date,'2026-10-15');assert.equal(visitor.requests.find(r=>r.id===intro.id).proposal.status,'declined');assert.ok(visitor.requests.find(r=>r.id===intro.id).updated);checks+=3;
owner=await call(alice);assert.equal(owner.requests.find(r=>r.id===intro.id).nextStep,undefined);checks++;
await connection(other,{action:'nextStep',id:intro.id,note:'A stranger cannot write a private follow-up.',date:''},404);
await connection(bob,{action:'nextStep',id:intro.id,note:'Impossible date',date:'2026-02-31'},400);
await connection(bob,{action:'nextStep',id:intro.id,note:'x'.repeat(501),date:''},400);
// Reports are durable and private; "submitted" never claims a completed review.
await call(alice,{action:'report',profileId:id,reason:'misleading',details:'An account cannot report its own profile.'},400);
await call(bob,{action:'report',profileId:'tracegrid',reason:'spam',details:'Sample profiles must never create operational reports.'},404);
visitor=await call(bob,{action:'report',profileId:id,reason:'misleading',details:'A fictional test concern recorded only for local quality assurance.'});assert.equal(visitor.reports.length,1);assert.equal(visitor.reports[0].status,'submitted');checks+=2;
assert.equal((await call(alice)).reports.length,0);assert.equal((await call(other)).reports.length,0);checks+=2;
assert.equal((await call(bob)).reports[0].id,visitor.reports[0].id);checks++;
// Accepted connections resolve safety controls even when the other account has no profile.
await call(other,{action:'blockConnection',id:intro.id,blocked:true},404);
await call(other,{action:'reportConnection',id:intro.id,reason:'spam',details:'An outsider cannot report a private connection.'},404);
const practiceId=(await call(bob)).requests.find(r=>r.profileId==='tracegrid').id;
await call(bob,{action:'blockConnection',id:practiceId,blocked:true},404);
await call(bob,{action:'reportConnection',id:practiceId,reason:'spam',details:'Fictional practice requests must never create operational reports.'},404);
const withoutProfile=await call(other,{action:'request',profileId:id,message:'A real test member without a profile requests a mutually accepted introduction.',consent:true});const noProfileIntro=withoutProfile.requests.find(r=>r.profileId===id);
await call(alice,{action:'respond',id:noProfileIntro.id,status:'accepted'});
owner=await call(alice,{action:'reportConnection',id:noProfileIntro.id,reason:'harassment',details:'A private test report about a connected account that has no profile.'});assert.equal(owner.reports[0].profileId,`connection:${noProfileIntro.id}`);assert.equal(owner.reports[0].status,'submitted');checks+=2;
assert.equal((await call(other)).reports.length,0);checks++;
owner=await call(alice,{action:'blockConnection',id:noProfileIntro.id,blocked:true});assert.equal(owner.blockedProfiles[0].profileId,`connection:${noProfileIntro.id}`);assert.ok(owner.blockedProfiles[0].name);checks+=2;
await call(other,{action:'message',id:noProfileIntro.id,body:'A blocked real member cannot message even without owning a profile.'},403);
await call(other,{action:'request',profileId:investorId,message:'An unrelated member profile should remain accessible outside this block.',consent:true});
await connection(other,{action:'proposal',id:noProfileIntro.id,version:0,amount:100000,terms:'A blocked account cannot initiate private proposal discussions.',consent:true},403);
await call(other,{action:'blockConnection',id:noProfileIntro.id,blocked:false});assert.equal((await connection(alice,null,200,noProfileIntro.id)).blocked,true);checks++;
await call(alice,{action:'block',profileId:`connection:${noProfileIntro.id}`,blocked:false});assert.equal((await connection(other,null,200,noProfileIntro.id)).blocked,false);checks++;
await call(other,{action:'message',id:noProfileIntro.id,body:'The member without a profile can message again after the blocking account unblocks.'});
// A block applies to both participants and all profiles belonging to those accounts.
await call(alice,{action:'block',profileId:id,blocked:true},400);
await call(bob,{action:'block',profileId:'tracegrid',blocked:true},404);
owner=await call(alice,{action:'request',profileId:investorId,message:'A second direction verifies that pending requests respect blocks.',consent:true});const reverseIntro=owner.requests.find(r=>r.profileId===investorId);
owner=await call(alice,{action:'block',profileId:investorId,blocked:true});assert.equal(owner.blockedProfiles[0].profileId,investorId);assert.ok(!owner.profiles.some(p=>p.id===investorId));assert.equal(owner.requests.find(r=>r.id===intro.id).blocked,true);checks+=3;
visitor=await call(bob);assert.ok(!visitor.profiles.some(p=>p.id===id));assert.ok(!visitor.savedIds.includes(id));assert.equal(visitor.requests.find(r=>r.id===intro.id).blocked,true);assert.deepEqual(visitor.blockedProfiles,[]);checks+=4;
assert.ok(!JSON.stringify(visitor).includes('clerk:'),'Workspace responses must not reveal account identifiers');checks++;
await call(bob,{action:'save',profileId:id,saved:true},404);
await call(bob,{action:'request',profileId:id,message:'Blocked members cannot initiate another contact.',consent:true},404);
await call(bob,{action:'message',id:intro.id,body:'A block must prevent an existing connection from messaging.'},403);
await call(alice,{action:'message',id:intro.id,body:'Messaging must be disabled in both directions.'},403);
await call(bob,{action:'respond',id:reverseIntro.id,status:'accepted'},403);
await connection(bob,proposal(8),403);await connection(alice,decision(8,'acknowledged'),403);
ownConnection=await connection(bob,null,200,intro.id);assert.equal(ownConnection.blocked,true);assert.equal(ownConnection.events.length,8);checks+=2;
ownConnection=await connection(bob,{action:'nextStep',id:intro.id,note:'Private records stay editable after a member is blocked.',date:''});assert.equal(ownConnection.nextStep.note,'Private records stay editable after a member is blocked.');checks++;
assert.ok((await connection(bob,null)).notifications.filter(n=>n.introduction_id===intro.id||n.introduction_id===reverseIntro.id).every(n=>n.status!=='pending'));checks++;
const unaffected=await call(other);assert.ok(unaffected.profiles.some(p=>p.id===id));assert.ok(unaffected.profiles.some(p=>p.id===investorId));checks+=2;
await call(other,{action:'block',profileId:investorId,blocked:false});assert.equal((await connection(bob,null,200,intro.id)).blocked,true);checks++;
owner=await call(alice,{action:'block',profileId:investorId,blocked:false});assert.deepEqual(owner.blockedProfiles,[]);assert.ok(owner.profiles.some(p=>p.id===investorId));checks+=2;
await call(bob,{action:'message',id:intro.id,body:'Unblocking restores messaging for a mutually accepted connection.'});assert.equal((await connection(bob,null,200,intro.id)).blocked,false);checks++;
ownConnection=await connection(bob,{action:'nextStep',id:intro.id,note:'',date:''});assert.equal(ownConnection.nextStep,null);checks++;
await call(alice,{action:'removeProgress',profileId:id,updateId:'missing-update'},404);
owner=await call(alice,{action:'removeProgress',profileId:id,updateId});assert.deepEqual(owner.myProfiles[0].updates,[]);checks++;
await call(alice,{action:"profile",profile:{...profile,evidenceDate:"2026-02-31"},listed:false,consent:true},400);
await call(alice,{action:"profile",profile,listed:false,consent:true});await call(bob,{action:"save",profileId:id,saved:false});
await call(bob,{action:'profile',profile:investor,listed:false,consent:true});
console.log(JSON.stringify({result:"passed",checks,scope:"Local Worker with verified Clerk development sessions; consent, persistence, investor preferences, progress visibility, private next steps, reports, bidirectional blocking and account isolation",testProfiles:"Retained privately in local database; never deployed"}));
