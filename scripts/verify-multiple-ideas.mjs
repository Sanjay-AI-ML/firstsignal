import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import { transform } from 'esbuild';
import { z } from 'zod';

// Exercise real migrations, validation, routes and SQL with synthetic identities.
// No provider accounts, network calls, production database or email is used.
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys=ON');
const migrations = (await fs.readdir('drizzle')).filter(name => name.endsWith('.sql')).sort();
const nextMigration = migrations.findIndex(name => name.startsWith('0004_'));
assert.ok(nextMigration > 0, 'The non-destructive multiple-ideas migration must exist');
for (const file of migrations.slice(0, nextMigration)) sqlite.exec(await fs.readFile(`drizzle/${file}`, 'utf8'));
let checks = 0;
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++; };
const ok = (actual, message) => { assert.ok(actual, message); checks++; };
const deepEqual = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
const historical = { kind: 'startup', name: 'Existing idea', founder: 'Existing Founder', city: 'Chennai', sector: 'Manufacturing SaaS', stage: 'Pre-product', tagline: 'An existing project retained across a schema change.', problem: 'Preserve this historical ideology and every linked record.', solution: 'Keep stable project IDs while allowing new sibling ideas.', fundingIntentINR: 600000, evidenceDate: '2026-10-01' };
const oldTime = '2026-10-01T00:00:00.000Z';
sqlite.prepare('INSERT INTO profiles(id,owner,kind,data,listed,updated) VALUES(?,?,?,?,?,?)').run('legacy-idea', 'legacy-founder', 'startup', JSON.stringify(historical), 1, oldTime);
sqlite.prepare('INSERT INTO progress_updates(id,profile_id,date,title,body,created) VALUES(?,?,?,?,?,?)').run('legacy-progress', 'legacy-idea', '2026-10-01', 'Existing progress', 'Retain this dated learning independently of newer ideas.', oldTime);
sqlite.prepare('INSERT INTO saves(owner,profile_id,created) VALUES(?,?,?)').run('legacy-investor', 'legacy-idea', oldTime);
sqlite.prepare('INSERT INTO introductions(id,sender,recipient,profile_id,target_name,sender_name,message,status,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?)').run('legacy-intro', 'legacy-investor', 'legacy-founder', 'legacy-idea', historical.name, 'Existing Investor', 'An existing mutually accepted introduction.', 'accepted', oldTime, oldTime);
sqlite.prepare('INSERT INTO messages(id,introduction_id,sender,sender_name,body,created) VALUES(?,?,?,?,?,?)').run('legacy-message', 'legacy-intro', 'legacy-founder', 'Existing Founder', 'Existing private message that must be retained.', oldTime);
sqlite.prepare('INSERT INTO negotiations(introduction_id,version,author,amount,terms,status,event_id,updated) VALUES(?,?,?,?,?,?,?,?)').run('legacy-intro', 1, 'legacy-investor', 600000, 'Existing private discussion with non-binding terms.', 'open', 'legacy-event', oldTime);
sqlite.prepare('INSERT INTO negotiation_events(id,introduction_id,version,author,author_name,amount,terms,status,created) VALUES(?,?,?,?,?,?,?,?,?)').run('legacy-event', 'legacy-intro', 1, 'legacy-investor', 'Existing Investor', 600000, 'Existing private discussion with non-binding terms.', 'open', oldTime);
sqlite.prepare('INSERT INTO connection_next_steps(owner,introduction_id,note,date,updated) VALUES(?,?,?,?,?)').run('legacy-investor', 'legacy-intro', 'Existing private follow-up.', '2026-10-15', oldTime);
sqlite.prepare('INSERT INTO profile_moderation(profile_id,hidden,reason,version,event_id,updated) VALUES(?,?,?,?,?,?)').run('legacy-idea', 1, 'Existing listing restriction retained.', 1, 'legacy-audit', oldTime);
sqlite.prepare('INSERT INTO admin_audit(id,actor,action,target_id,reason,previous_state,next_state,created) VALUES(?,?,?,?,?,?,?,?)').run('legacy-audit', 'operator', 'moderateProfile', 'legacy-idea', 'Existing listing restriction retained.', '{}', '{"hidden":true}', oldTime);
sqlite.prepare('INSERT INTO member_reports(id,owner,target_owner,profile_id,reason,details,status,created) VALUES(?,?,?,?,?,?,?,?)').run('legacy-report', 'legacy-investor', 'legacy-founder', 'legacy-idea', 'other', 'An existing member concern retained for review.', 'submitted', oldTime);
const preservedTables = ['profiles', 'progress_updates', 'saves', 'introductions', 'messages', 'negotiations', 'negotiation_events', 'connection_next_steps', 'profile_moderation', 'admin_audit', 'member_reports'];
const beforeMigration = new Map(preservedTables.map(table => [table, sqlite.prepare(`SELECT * FROM ${table}`).all()]));
for (const file of migrations.slice(nextMigration)) sqlite.exec(await fs.readFile(`drizzle/${file}`, 'utf8'));
for (const [table, before] of beforeMigration) {
  const after = sqlite.prepare(`SELECT * FROM ${table}`).all();
  equal(after.length, before.length, `${table} row count survives migration`);
  deepEqual(after.map((row, index) => Object.fromEntries(Object.keys(before[index]).map(key => [key, row[key]]))), before.map(row => ({ ...row })), `${table} existing fields survive byte-for-byte`);
}
equal(sqlite.prepare('SELECT source_profile_id FROM introductions WHERE id=?').get('legacy-intro').source_profile_id, null, 'Legacy introductions keep an unambiguous account-level source');
equal(sqlite.prepare('PRAGMA foreign_key_check').all().length, 0, 'All preserved relationships stay valid');

const auth = new AsyncLocalStorage();
let maxBindings = 0;
const db = { prepare(sql) {
  const query = sqlite.prepare(sql); let values = [];
  const execute = () => query.columns().length ? { results: query.all(...values), meta: { changes: 0 } } : { results: [], meta: { changes: query.run(...values).changes } };
  const statement = { bind(...args) { maxBindings = Math.max(maxBindings, args.length); assert.ok(args.length <= 100, 'D1 bound parameter limit'); values = args; return statement; }, async run() { return execute(); }, async all() { return execute(); }, async first() { return query.get(...values) ?? null; }, execute };
  return statement;
}, async batch(statements) {
  sqlite.exec('BEGIN IMMEDIATE');
  try { const results = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return results; }
  catch (error) { sqlite.exec('ROLLBACK'); throw error; }
} };
async function load(file, modules) {
  const { code } = await transform(await fs.readFile(file, 'utf8'), { loader: 'ts', format: 'cjs' });
  const context = { module: { exports: {} }, exports: {}, require: name => { assert.ok(name in modules, `Unexpected dependency ${name}`); return modules[name]; }, Response, Request, URL, crypto, console, TextDecoder, Uint8Array };
  vm.runInNewContext(code, context); return context.module.exports;
}
const sectors = await load('lib/sectors.ts', {});
const data = await load('lib/data.ts', { './sectors': sectors, './seed-startups.json': JSON.parse(await fs.readFile('lib/seed-startups.json', 'utf8')), './seed-investors.json': JSON.parse(await fs.readFile('lib/seed-investors.json', 'utf8')) });
const validation = await load('lib/validation.ts', { zod: { z }, './data': data, './sectors': sectors });
const safety = await load('lib/member-safety.ts', { './database': { database: () => db } });
const notifications = { notify: async () => {}, dispatchNotifications: async () => {}, emailConfigured: () => false };
const workspace = await load('app/api/workspace/route.ts', { '../../auth': { getAppUser: async () => auth.getStore() }, '@/lib/notifications': notifications, '@/lib/database': { database: () => db }, '@/lib/data': data, '@/lib/validation': validation, '@/lib/member-safety': safety });
const connections = await load('app/api/connections/route.ts', { '../../auth': { getAppUser: async () => auth.getStore() }, '@/lib/database': { database: () => db }, '@/lib/notifications': notifications, zod: { z }, '@/lib/member-safety': safety, '@/lib/validation': validation });
const origin = 'http://localhost';
async function request(owner, payload, expected = 200, route = workspace, id = '') {
  const path = route === workspace ? '/api/workspace' : '/api/connections';
  const response = await auth.run(owner ? { userId: owner, displayName: 'Synthetic member', email: 'member@example.test', emailVerified: true } : null, () => {
    const req = new Request(`${origin}${path}${id ? `?${route === workspace ? 'profile' : 'id'}=${encodeURIComponent(id)}` : ''}`, { method: payload ? 'POST' : 'GET', headers: payload ? { origin, 'content-type': 'application/json' } : {}, body: payload ? JSON.stringify(payload) : undefined });
    return payload ? route.POST(req) : route.GET(req);
  });
  const body = await response.json();
  if (Array.isArray(expected)) ok(expected.includes(response.status), JSON.stringify(body));
  else equal(response.status, expected, JSON.stringify(body));
  ok(response.headers.get('cache-control')?.includes('no-store'), 'Account-specific responses are never cached');
  return { ...body, httpStatus: response.status };
}
const save = (owner, profile, listed = false, profileId, expected = 200) => request(owner, { action: 'profile', profile, listed, consent: true, ...(profileId ? { profileId } : {}) }, expected);
const read = (owner, id) => request(owner, null, 200, workspace, id);
const base = { ...historical, sector: data.sectors[0], stage: data.stages[0], name: 'Foundry planning', problem: 'Small manufacturers need clearer, simpler production handovers.', solution: 'A visual production-handover service for workshop teams.', fundingIntentINR: 300000 };
const row = id => ({ ...sqlite.prepare('SELECT * FROM profiles WHERE id=?').get(id) });
try {
  const legacyState = await read('legacy-founder');
  equal(legacyState.myProfiles[0].id, 'legacy-idea');
  equal(legacyState.myProfiles[0].updates[0].id, 'legacy-progress');
  equal(legacyState.myProfiles[0].moderation.hidden, true);
  const legacyConnection = await request('legacy-investor', null, 200, connections, 'legacy-intro');
  equal(legacyConnection.current.amount, 600000);
  equal(legacyConnection.events.length, 1);
  equal(legacyConnection.nextStep.note, 'Existing private follow-up.');
  const legacySibling = await save('legacy-founder', { ...base, name: 'New idea beside historical one' }, false);
  equal(legacySibling.myProfiles.length, 2);
  equal(legacySibling.myProfiles.find(profile => profile.id === 'legacy-idea').moderation.hidden, true);

  await save(null, base, false, undefined, 401);
  const first = await save('founder', base, true);
  const a = first.savedProfileId;
  ok(a, 'Create identifies the newly saved idea without relying on array order');
  const initialA = row(a);
  const second = await save('founder', { ...base, id: a, owner: 'attacker', name: 'Food circle', sector: 'Other', customSector: 'Community food exchange', city: 'Madurai', stage: data.stages[1], fundingIntentINR: 900000 }, false);
  const b = second.savedProfileId;
  ok(b && b !== a, 'Creating another idea never overwrites an ID supplied inside project details');
  equal(second.myProfiles.length, 2);
  deepEqual(row(a), initialA, 'Creating B leaves every stored field of A unchanged');
  equal(row(b).owner, 'founder', 'An owner field in untrusted details never grants or transfers ownership');
  equal(row(b).listed, 0);
  let visible = await read(null);
  ok(visible.profiles.some(profile => profile.id === a));
  ok(!visible.profiles.some(profile => profile.id === b), 'A private sibling is not accidentally published with another idea');
  ok(!(await read('stranger', b)).profiles.some(profile => profile.id === b));
  ok((await read('founder', b)).profiles.some(profile => profile.id === b && profile.mine));

  await save('stranger', { ...base, name: 'Stolen project' }, true, a, 404);
  await save('founder', { ...base, kind: 'investor' }, true, a, 404);
  await save('founder', base, true, 'not-an-existing-idea', 404);
  deepEqual(row(a), initialA, 'Forged or wrong-kind edits cannot alter A');
  const editedB = await save('founder', { ...base, name: 'Food circle revised', sector: 'Other', customSector: 'Community food exchange', city: 'Madurai', stage: data.stages[1], fundingIntentINR: 800000 }, true, b);
  equal(editedB.savedProfileId, b);
  equal(editedB.myProfiles.find(profile => profile.id === b).fundingIntentINR, 800000);
  deepEqual(row(a), initialA, 'Editing B changes neither A details nor its sharing choice');
  equal((await read('founder')).myProfiles.length, 2, 'Both ideas survive a fresh workspace read');
  visible = await read(null); ok(visible.profiles.some(profile => profile.id === a) && visible.profiles.some(profile => profile.id === b));

  const progress = (profileId, title) => ({ action: 'progress', profileId, date: '2026-10-01', title, body: 'A dated observation specific to this idea and its next experiment.', consent: true });
  const withA = await request('founder', progress(a, 'Workshop handover interviews'));
  const updateA = withA.myProfiles.find(profile => profile.id === a).updates[0].id;
  const withB = await request('founder', progress(b, 'Community exchange interviews'));
  const updateB = withB.myProfiles.find(profile => profile.id === b).updates[0].id;
  equal(withB.myProfiles.find(profile => profile.id === a).updates.length, 1);
  equal(withB.myProfiles.find(profile => profile.id === b).updates.length, 1);
  await request('stranger', progress(b, 'Unauthorized progress'), 404);
  await request('founder', { action: 'removeProgress', profileId: b, updateId: updateA }, 404);
  const removedB = await request('founder', { action: 'removeProgress', profileId: b, updateId: updateB });
  equal(removedB.myProfiles.find(profile => profile.id === b).updates.length, 0);
  equal(removedB.myProfiles.find(profile => profile.id === a).updates[0].id, updateA);

  const parallel = await Promise.all([save('parallel-founder', { ...base, name: 'Concurrent idea one' }), save('parallel-founder', { ...base, name: 'Concurrent idea two' })]);
  ok(parallel[0].savedProfileId !== parallel[1].savedProfileId);
  equal((await read('parallel-founder')).myProfiles.length, 2);
  const roles = await Promise.all([save('role-race', base, false, undefined, [200, 409]), save('role-race', { ...base, kind: 'investor' }, false, undefined, [200, 409])]);
  deepEqual(roles.map(result => result.httpStatus).sort(), [200, 409], 'Concurrent creates cannot give an account two roles');
  equal((await read('role-race')).myProfiles.length, 1);

  const investorState = await save('investor', { ...base, kind: 'investor', name: 'Industrial opportunities', sectors: [base.sector], stages: [base.stage] }, true);
  const investorId = investorState.savedProfileId;
  await save('investor', { ...base, kind: 'investor' }, false, undefined, 409);
  await save('investor', base, false, undefined, 409);
  await save('founder', { ...base, kind: 'investor' }, false, undefined, 409);
  const intro = (sourceProfileId, target = investorId) => ({ action: 'request', profileId: target, message: 'I would like to discuss this specific idea and its next experiment.', consent: true, ...(sourceProfileId ? { sourceProfileId } : {}) });
  await request('stranger', intro(a), 404);
  await request('founder', intro(investorId), 404);
  const introAState = await request('founder', intro(a));
  const introA = introAState.requests.find(item => item.sourceProfileId === a && item.profileId === investorId);
  ok(introA, 'The first introduction records its selected idea');
  equal(introA.sourceName, base.name);
  const introBState = await request('founder', intro(b));
  const introB = introBState.requests.find(item => item.sourceProfileId === b && item.profileId === investorId);
  ok(introB && introB.id !== introA.id, 'A second idea can independently approach the same investor');
  await request('founder', intro(a), 409);
  const accountThread = await request('founder', intro());
  ok(accountThread.requests.some(item => item.profileId === investorId && !item.sourceProfileId), 'Legacy account-level requests remain supported');
  const incoming = await read('investor');
  equal(incoming.requests.find(item => item.id === introA.id).sourceName, base.name);
  equal(incoming.requests.find(item => item.id === introB.id).sourceName, 'Food circle revised');
  ok(!(await read('stranger')).requests.some(item => item.id === introA.id));
  for (const id of [introA.id, introB.id]) await request('investor', { action: 'respond', id, status: 'accepted' });
  await request('founder', { action: 'message', id: introA.id, body: 'Only the manufacturing idea receives this message.' });
  await request('founder', { action: 'message', id: introB.id, body: 'Only the food exchange idea receives this message.' });
  const ownThreads = await read('founder');
  equal(ownThreads.requests.find(item => item.id === introA.id).messages[0].body, 'Only the manufacturing idea receives this message.');
  equal(ownThreads.requests.find(item => item.id === introB.id).messages[0].body, 'Only the food exchange idea receives this message.');
  const proposal = (id, amount) => ({ action: 'proposal', id, version: 0, amount, terms: 'A non-binding discussion scoped only to the selected project.', consent: true });
  await request('investor', proposal(introA.id, 300000), 200, connections);
  await request('investor', proposal(introB.id, 800000), 200, connections);
  equal((await request('founder', null, 200, connections, introA.id)).current.amount, 300000);
  equal((await request('founder', null, 200, connections, introB.id)).current.amount, 800000);
  await request('stranger', proposal(introA.id, 1), 404, connections);
  await request('founder', { action: 'nextStep', id: introA.id, note: 'Review workshop interviews.', date: '2026-10-15' }, 200, connections);
  equal((await request('founder', null, 200, connections, introB.id)).nextStep, null, 'Private next steps cannot bleed into a sibling idea thread');
  equal((await request('investor', null, 200, connections, introA.id)).nextStep, null, 'Next steps stay private to their author');

  // Removing a single listing does not hide or alter the founder's other idea.
  sqlite.prepare('INSERT INTO profile_moderation(profile_id,hidden,reason,version,event_id,updated) VALUES(?,?,?,?,?,?)').run(b, 1, 'Local moderation fixture for one listing only.', 1, 'test-moderation', oldTime);
  visible = await read('stranger'); ok(visible.profiles.some(profile => profile.id === a)); ok(!visible.profiles.some(profile => profile.id === b));
  await save('founder', { ...base, name: 'Edited hidden food idea' }, true, b);
  ok(!(await read(null, b)).profiles.some(profile => profile.id === b), 'Editing cannot bypass a listing restriction');
  ok((await read('founder')).myProfiles.find(profile => profile.id === b).moderation.hidden);
  const restrictedTarget = await save('other-investor', { ...base, kind: 'investor', name: 'Another investor' }, true);
  await request('founder', intro(b, restrictedTarget.savedProfileId), 404);
  sqlite.prepare('UPDATE profile_moderation SET hidden=0 WHERE profile_id=?').run(b);
  await save('founder', { ...base, name: 'Private food idea' }, false, b);
  await request('founder', intro(b, restrictedTarget.savedProfileId), 404);
  ok((await read(null)).profiles.some(profile => profile.id === a), 'Unlisting B leaves A discoverable');
  ok(!(await read(null, b)).profiles.some(profile => profile.id === b));
  await save('founder', { ...base, name: 'Food idea public again' }, true, b);

  // Member blocks apply to all that member's ideas, not merely the clicked card.
  await request('investor', { action: 'save', profileId: a, saved: true });
  await request('investor', { action: 'save', profileId: b, saved: true });
  const blocked = await request('investor', { action: 'block', profileId: a, blocked: true });
  ok(!blocked.profiles.some(profile => profile.id === a || profile.id === b));
  ok(!blocked.savedIds.includes(a) && !blocked.savedIds.includes(b));
  ok(blocked.requests.filter(item => item.id === introA.id || item.id === introB.id).every(item => item.blocked));
  await request('founder', { action: 'message', id: introB.id, body: 'A blocked sibling thread cannot send.' }, 403);
  await request('investor', { action: 'save', profileId: b, saved: true }, 404);
  await request('founder', intro(a, restrictedTarget.savedProfileId));
  ok((await read('other-investor')).requests.some(item => item.sourceProfileId === a), 'An unrelated investor remains unaffected by another member block');
  await request('investor', { action: 'block', profileId: a, blocked: false });
  ok((await read('investor')).profiles.some(profile => profile.id === a) && (await read('investor')).profiles.some(profile => profile.id === b));
  const privateData = JSON.stringify(await read('stranger'));
  ok(!privateData.includes('Only the manufacturing idea receives this message.'));
  ok(!privateData.includes('Review workshop interviews.'));
  ok(!privateData.includes('legacy-founder'), 'Internal account ownership stays private');
  // One founder can cross a discovery page boundary without losing owned ideas
  // or their independent updates, and progress queries still fit D1 bindings.
  for (let index = 0; index < 205; index++) {
    const id = `many-idea-${index}`;
    sqlite.prepare('INSERT INTO profiles(id,owner,kind,data,listed,updated) VALUES(?,?,?,?,?,?)').run(id, 'many-founder', 'startup', JSON.stringify({ ...base, name: `Owned idea ${index}` }), 0, oldTime);
    sqlite.prepare('INSERT INTO progress_updates(id,profile_id,date,title,body,created) VALUES(?,?,?,?,?,?)').run(`many-update-${index}`, id, '2026-10-01', `Learning ${index}`, `Independent progress for owned idea ${index}.`, oldTime);
  }
  const manyOwned = await read('many-founder');
  equal(manyOwned.myProfiles.length, 205, 'All ideas belonging to one founder load beyond the 200 discovery cutoff');
  equal(new Set(manyOwned.myProfiles.map(profile => profile.id)).size, 205);
  ok(manyOwned.myProfiles.every(profile => profile.updates.length === 1 && profile.updates[0].id === `many-update-${profile.id.slice('many-idea-'.length)}`));
  ok(!(await read('stranger')).profiles.some(profile => profile.id.startsWith('many-idea-')), 'A large private portfolio does not leak to other members');
  ok(maxBindings <= 100);
  equal(sqlite.prepare('PRAGMA foreign_key_check').all().length, 0);
  console.log(`Passed ${checks} multiple-idea checks: non-destructive migration; distinct creates/exact owned edits; independent details, listing and progress; idea-scoped introductions/messages/proposals/notes; legacy threads; per-idea moderation and account-wide blocks.`);
} finally { sqlite.close(); }
