import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import { transform } from 'esbuild';
import { z } from 'zod';

// Actual SQL migrations and route handlers, synthetic accounts, memory-only D1.
// This script never contacts Clerk, a provider, the live site, or an email service.
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys=ON');
let checks = 0;
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++; };
const ok = (value, message) => { assert.ok(value, message); checks++; };
const deepEqual = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
const plain = value => JSON.parse(JSON.stringify(value));
const migrations = (await fs.readdir('drizzle')).filter(file => file.endsWith('.sql')).sort();
const migrationIndex = migrations.findIndex(file => file.startsWith('0005_'));
ok(migrationIndex > 0, 'The additive experiment migration exists');
for (const file of migrations.slice(0, migrationIndex)) sqlite.exec(await fs.readFile(`drizzle/${file}`, 'utf8'));
const oldTime = '2026-10-01T00:00:00.000Z';
const insertProfile = (id, owner, listed = 1, kind = 'startup') => sqlite.prepare('INSERT INTO profiles(id,owner,kind,data,listed,updated) VALUES(?,?,?,?,?,?)').run(id, owner, kind, JSON.stringify({ kind, name: `Idea ${id}`, founder: 'Synthetic founder', city: 'Chennai', sector: 'Manufacturing & Hardware', stage: 'Pre-product', tagline: 'A synthetic idea for an isolated SQL test.' }), listed, oldTime);
insertProfile('idea-a', 'founder');
insertProfile('idea-b', 'founder');
insertProfile('private-idea', 'private-founder', 0);
insertProfile('other-idea', 'other-founder');
insertProfile('investor-profile', 'investor', 1, 'investor');
sqlite.prepare('INSERT INTO progress_updates(id,profile_id,date,title,body,created) VALUES(?,?,?,?,?,?)').run('existing-progress', 'idea-a', '2026-10-01', 'Existing progress', 'Existing progress must survive the additive migration.', oldTime);
sqlite.prepare('INSERT INTO saves(owner,profile_id,created) VALUES(?,?,?)').run('investor', 'idea-a', oldTime);
sqlite.prepare('INSERT INTO introductions(id,sender,recipient,profile_id,target_name,sender_name,message,status,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?)').run('existing-intro', 'investor', 'founder', 'idea-a', 'Idea idea-a', 'Synthetic investor', 'An existing connection survives this migration.', 'accepted', oldTime, oldTime);
sqlite.prepare('INSERT INTO messages(id,introduction_id,sender,sender_name,body,created) VALUES(?,?,?,?,?,?)').run('existing-message', 'existing-intro', 'founder', 'Synthetic founder', 'Keep this private message exactly as it is.', oldTime);
sqlite.prepare('INSERT INTO negotiations(introduction_id,version,author,amount,terms,status,event_id,updated) VALUES(?,?,?,?,?,?,?,?)').run('existing-intro', 1, 'investor', 300000, 'Keep the existing non-binding discussion.', 'open', 'existing-event', oldTime);
sqlite.prepare('INSERT INTO negotiation_events(id,introduction_id,version,author,author_name,amount,terms,status,created) VALUES(?,?,?,?,?,?,?,?,?)').run('existing-event', 'existing-intro', 1, 'investor', 'Synthetic investor', 300000, 'Keep the existing non-binding discussion.', 'open', oldTime);
sqlite.prepare('INSERT INTO connection_next_steps(owner,introduction_id,note,date,updated) VALUES(?,?,?,?,?)').run('investor', 'existing-intro', 'Keep this private follow-up.', '2026-10-20', oldTime);
sqlite.prepare('INSERT INTO member_reports(id,owner,target_owner,profile_id,reason,details,status,created) VALUES(?,?,?,?,?,?,?,?)').run('existing-report', 'investor', 'founder', 'idea-a', 'other', 'Keep this existing member report unchanged.', 'submitted', oldTime);
sqlite.prepare('INSERT INTO profile_moderation(profile_id,hidden,reason,version,event_id,updated) VALUES(?,?,?,?,?,?)').run('other-idea', 0, 'An existing moderation record.', 1, 'existing-audit', oldTime);
sqlite.prepare('INSERT INTO admin_audit(id,actor,action,target_id,reason,previous_state,next_state,created) VALUES(?,?,?,?,?,?,?,?)').run('existing-audit', 'operator', 'moderateProfile', 'other-idea', 'Existing reason.', '{}', '{}', oldTime);
const preservedTables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row => row.name);
const beforeMigration = new Map(preservedTables.map(table => [table, plain(sqlite.prepare(`SELECT * FROM ${table}`).all())]));
for (const file of migrations.slice(migrationIndex)) sqlite.exec(await fs.readFile(`drizzle/${file}`, 'utf8'));
for (const [table, rows] of beforeMigration) deepEqual(plain(sqlite.prepare(`SELECT * FROM ${table}`).all()), rows, `${table}: migration retains every old field and row`);
equal(sqlite.prepare('PRAGMA foreign_key_check').all().length, 0, 'Migration preserves existing relationships');

const auth = new AsyncLocalStorage();
let maxBindings = 0;
let beforeWrite = null;
let beforeReadAll = null;
let failNextWrite = false;
const db = { prepare(sql) {
  const query = sqlite.prepare(sql); let values = [];
  const execute = () => {
    if (!/^\s*SELECT\b/i.test(sql)) {
      if (beforeWrite) { const hook = beforeWrite; beforeWrite = null; hook(sql, values); }
      if (failNextWrite) { failNextWrite = false; throw new Error('Synthetic D1 write failure'); }
    }
    return query.columns().length ? { results: query.all(...values), meta: { changes: 0 } } : { results: [], meta: { changes: query.run(...values).changes } };
  };
  const statement = {
    bind(...args) { maxBindings = Math.max(maxBindings, args.length); assert.ok(args.length <= 100, 'D1 parameter limit'); values = args; return statement; },
    async run() { return execute(); }, async all() {
      if (beforeReadAll) { const hook = beforeReadAll; beforeReadAll = null; hook(sql, values); }
      return execute();
    }, async first() { return query.get(...values) ?? null; }, execute,
  };
  return statement;
}, async batch(statements) {
  sqlite.exec('BEGIN IMMEDIATE');
  try { const results = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return results; }
  catch (error) { sqlite.exec('ROLLBACK'); throw error; }
} };
async function load(file, modules) {
  const { code } = await transform(await fs.readFile(file, 'utf8'), { loader: 'ts', format: 'cjs' });
  const context = { module: { exports: {} }, exports: {}, require: name => { assert.ok(name in modules, `Unexpected dependency ${name}`); return modules[name]; }, Response, Request, URL, crypto, console, TextDecoder, TextEncoder, Uint8Array, Date };
  vm.runInNewContext(code, context); return context.module.exports;
}
const experiments = await load('lib/experiments.ts', { zod: { z } });
const route = await load('app/api/experiments/route.ts', { '../../auth': { getAppUser: async () => auth.getStore() }, '@/lib/database': { database: () => db }, '@/lib/experiments': experiments });
const origin = 'http://localhost';
async function request(owner, payload, expected = 200, profileId = 'idea-a', overrides = {}) {
  const isPost = payload !== null;
  const url = `${origin}/api/experiments${profileId === null ? '' : `?profile=${encodeURIComponent(profileId)}`}`;
  const headers = isPost ? { origin, 'content-type': 'application/json', ...(overrides.headers || {}) } : { ...(overrides.headers || {}) };
  const raw = overrides.raw ?? (isPost ? JSON.stringify(payload) : undefined);
  const response = await auth.run(owner ? { userId: owner, displayName: 'Synthetic member', email: 'member@example.test', emailVerified: true } : null, () => {
    const req = new Request(overrides.url || url, { method: isPost ? 'POST' : 'GET', headers, ...(isPost ? { body: raw } : {}) });
    return isPost ? route.POST(req) : route.GET(req);
  });
  const body = await response.json();
  if (Array.isArray(expected)) ok(expected.includes(response.status), `${response.status}: ${JSON.stringify(body)}`);
  else equal(response.status, expected, `${response.status}: ${JSON.stringify(body)}`);
  ok(response.headers.get('cache-control')?.includes('no-store'), 'Every experiment response is never cached');
  return { ...body, httpStatus: response.status };
}
const read = (owner, id = 'idea-a', expected = 200) => request(owner, null, expected, id);
const plan = { title: 'Try a workshop handover', assumption: 'Workshop leads will reuse a simple handover checklist.', method: 'Invite workshop leads to try a manual handover for one week.', audience: 'Five consenting workshop leads in Chennai.', successCriterion: 'At least three leads reuse the checklist without a reminder.', dueDate: '2026-11-01' };
const result = { observations: 'Three of five workshop leads reused it; two did not.', learning: 'A handover helps some teams but this does not establish willingness to pay.', decision: 'continue', nextStep: 'Test a paid pilot with the teams who asked to continue.', evidenceUrl: 'https://example.test/consent-safe-summary' };
const write = (owner, action, profileId, id, version, extra = {}, expected = 200) => request(owner, { action, profileId, ...(id ? { id } : {}), ...(version !== undefined ? { version } : {}), ...extra }, expected, profileId);
const create = (owner = 'founder', profileId = 'idea-a', candidate = plan, expected = 200) => write(owner, 'create', profileId, null, undefined, { plan: candidate }, expected);
const rows = profileId => plain(sqlite.prepare('SELECT * FROM idea_experiments WHERE profile_id=? ORDER BY created,id').all(profileId));
const row = id => plain(sqlite.prepare('SELECT * FROM idea_experiments WHERE id=?').get(id));
const find = (response, id) => response.experiments.find(item => item.id === id);
async function created(owner = 'founder', profileId = 'idea-a', candidate = plan) {
  const before = new Set(rows(profileId).map(item => item.id));
  const response = await create(owner, profileId, candidate);
  const item = response.experiments.find(item => !before.has(item.id));
  ok(item?.id, 'Create returns the newly persisted experiment');
  return item;
}
async function completed(profileId = 'idea-a', owner = 'founder', candidate = plan, outcome = result) {
  let item = await created(owner, profileId, candidate);
  item = find(await write(owner, 'start', profileId, item.id, item.version), item.id);
  return find(await write(owner, 'complete', profileId, item.id, item.version, { result: outcome }), item.id);
}
function assertPublicShape(item) {
  ok(!('owner' in item) && !('profile_id' in item) && !('plan' in item) && !('result' in item), 'API exposes an explicit projection, not database ownership or JSON columns');
  deepEqual(Object.keys(item).sort(), ['id', 'profileId', 'title', 'assumption', 'method', 'audience', 'successCriterion', 'dueDate', 'status', 'observations', 'learning', 'decision', 'nextStep', 'evidenceUrl', 'shared', 'version', 'created', 'startedAt', 'completedAt', 'updated'].sort(), 'Only the documented public fields are returned');
}

try {
  // Request envelope, auth and strict input rules.
  await create(null, 'idea-a', plan, 401);
  await request('founder', { action: 'create', profileId: 'idea-a', plan }, 403, 'idea-a', { headers: { origin: 'https://hostile.example' } });
  await request('founder', { action: 'create', profileId: 'idea-a', plan }, 403, 'idea-a', { headers: { origin: '' } });
  await request('founder', {}, 400, 'idea-a', { raw: '{invalid JSON' });
  await request('founder', {}, 400, 'idea-a', { raw: 'null' });
  await request('founder', {}, 413, 'idea-a', { raw: ' '.repeat(40001) });
  await request('founder', {}, 413, 'idea-a', { raw: '{}', headers: { 'content-length': '40001' } });
  await request('founder', {}, 413, 'idea-a', { raw: '🙂'.repeat(10001), headers: { 'content-length': '1' } });
  await request('founder', { action: 'unknown', profileId: 'idea-a' }, 400);
  await request('founder', { action: 'create', profileId: 'idea-a', plan, owner: 'attacker' }, 400);
  await create('founder', 'idea-a', { ...plan, extra: 'unsupported field' }, 400);
  await create('founder', 'idea-a', { ...plan, title: '  ' }, 400);
  await create('founder', 'idea-a', { ...plan, assumption: 'short' }, 400);
  await create('founder', 'idea-a', { ...plan, title: 'a'.repeat(101) }, 400);
  await create('founder', 'idea-a', { ...plan, dueDate: '2026-02-30' }, 400);
  await create('founder', 'idea-a', { ...plan, dueDate: '01/11/2026' }, 400);
  await create('founder', 'idea-a', { ...plan, dueDate: '2026-11-01<script>' }, 400);
  await read('founder', null, 400);
  await read('founder', 'x'.repeat(101), 400);
  await read(null, 'missing-profile', 404);
  await read(null, 'private-idea', 404);
  await read('investor', 'investor-profile', 404);
  await create('founder', 'investor-profile', plan, 404);
  await create('attacker', 'idea-a', plan, 404);
  equal(rows('idea-a').length, 0, 'Invalid, unauthorized and oversized requests make no experiment rows');

  // Multiple ideas under one founder retain fully independent plans and results.
  let a = await created();
  let b = await created('founder', 'idea-b', { ...plan, title: 'Try a learning workshop', audience: 'Five consenting tutors in Madurai.' });
  ok(a.id !== b.id, 'Each idea gets an independently addressable experiment');
  equal(a.version, 0);
  equal(a.status, 'draft');
  equal(a.shared, false);
  for (const key of ['observations', 'learning', 'decision', 'nextStep', 'evidenceUrl']) equal(a[key], '', `${key} stays empty before completion`);
  assertPublicShape(a);
  deepEqual((await read('founder', 'idea-a')).experiments.map(item => item.id), [a.id]);
  deepEqual((await read('founder', 'idea-b')).experiments.map(item => item.id), [b.id]);
  equal((await read(null)).experiments.length, 0, 'Drafts are private even when their idea is listed');
  equal((await read('investor')).experiments.length, 0, 'An accepted introduction does not expose a founder draft');
  const originalB = row(b.id);
  const editedPlan = { ...plan, title: 'Try one manual shift', dueDate: '' };
  a = find(await write('founder', 'edit', 'idea-a', a.id, a.version, { plan: editedPlan }), a.id);
  equal(a.title, editedPlan.title);
  equal(a.version, 1);
  deepEqual(row(b.id), originalB, 'Editing A cannot alter B');
  await write('founder', 'edit', 'idea-a', a.id, 0, { plan }, 409);
  await write('founder', 'edit', 'idea-b', a.id, a.version, { plan }, 404);
  await write('attacker', 'edit', 'idea-a', a.id, a.version, { plan }, 404);
  await write('founder', 'edit', 'idea-a', 'missing-id', 0, { plan }, 404);
  await write('founder', 'start', 'idea-a', a.id, -1, {}, 400);
  await write('founder', 'start', 'idea-a', a.id, 0.5, {}, 400);
  await write('founder', 'complete', 'idea-a', a.id, a.version, { result }, 409);
  await write('founder', 'share', 'idea-a', a.id, a.version, { shared: true, consent: true }, 409);

  // Running locks the test plan; completed records cannot rewrite history.
  a = find(await write('founder', 'start', 'idea-a', a.id, a.version), a.id);
  equal(a.status, 'running');
  equal(a.version, 2);
  const running = row(a.id);
  await write('founder', 'start', 'idea-a', a.id, a.version, {}, 409);
  await write('founder', 'edit', 'idea-a', a.id, a.version, { plan }, 409);
  await write('founder', 'remove', 'idea-a', a.id, a.version, {}, 409);
  await write('founder', 'complete', 'idea-a', a.id, a.version, { result: { ...result, decision: 'guaranteed' } }, 400);
  await write('founder', 'complete', 'idea-a', a.id, a.version, { result: { ...result, observations: '' } }, 400);
  await write('founder', 'complete', 'idea-a', a.id, a.version, { result: { ...result, verified: true } }, 400);
  for (const evidenceUrl of ['javascript:alert(1)', 'http://example.test/evidence', 'data:text/html,secret', 'file:///C:/secret', 'https://user:secret@example.test/evidence', 'https://']) {
    await write('founder', 'complete', 'idea-a', a.id, a.version, { result: { ...result, evidenceUrl } }, 400);
  }
  deepEqual(row(a.id), running, 'Invalid results and forbidden running actions leave the plan untouched');
  a = find(await write('founder', 'complete', 'idea-a', a.id, a.version, { result }), a.id);
  equal(a.status, 'complete');
  equal(a.version, 3);
  equal(a.observations, result.observations);
  equal(a.successCriterion, editedPlan.successCriterion, 'The original predeclared threshold remains attached to the result');
  const completedRecord = row(a.id);
  await write('founder', 'edit', 'idea-a', a.id, a.version, { plan }, 409);
  await write('founder', 'complete', 'idea-a', a.id, a.version, { result: { ...result, observations: 'Rewrite the result after seeing it.' } }, 409);
  await write('founder', 'remove', 'idea-a', a.id, a.version, {}, 409);
  deepEqual(row(a.id), completedRecord, 'Completed plan and findings are immutable');
  equal((await read('investor')).experiments.length, 0, 'Completed does not imply shared');
  await write('founder', 'share', 'idea-a', a.id, a.version, { shared: true }, 400);
  await write('founder', 'share', 'idea-a', a.id, a.version, { shared: true, consent: false }, 400);
  a = find(await write('founder', 'share', 'idea-a', a.id, a.version, { shared: true, consent: true }), a.id);
  equal(a.shared, true);
  const publicResult = (await read(null)).experiments;
  equal(publicResult.length, 1);
  equal(publicResult[0].id, a.id);
  assertPublicShape(publicResult[0]);
  ok(!JSON.stringify(publicResult).includes('founder'), 'Public results contain no raw account identifier');
  deepEqual(plain((await read('investor')).experiments), plain(publicResult));

  // A visibility change after the first SELECT must still hide shared results.
  beforeReadAll = () => sqlite.prepare('UPDATE profiles SET listed=0 WHERE id=?').run('idea-a');
  equal((await read('investor')).experiments.length, 0, 'A concurrent unlisting cannot leak a result after the initial access check');
  sqlite.prepare('UPDATE profiles SET listed=1 WHERE id=?').run('idea-a');
  beforeReadAll = () => sqlite.prepare('INSERT INTO member_blocks(owner,target_owner,profile_id,target_name,created) VALUES(?,?,?,?,?)').run('investor', 'founder', 'idea-b', 'Sibling idea', oldTime);
  equal((await read('investor')).experiments.length, 0, 'A concurrent sibling-account block cannot leak a result');
  sqlite.prepare('DELETE FROM member_blocks').run();
  beforeReadAll = () => sqlite.prepare('INSERT INTO profile_moderation(profile_id,hidden,reason,version,event_id,updated) VALUES(?,?,?,?,?,?)').run('idea-a', 1, 'Concurrent restriction.', 1, 'concurrent-audit', oldTime);
  equal((await read('investor')).experiments.length, 0, 'A concurrent moderation restriction cannot leak a result');
  sqlite.prepare('DELETE FROM profile_moderation WHERE profile_id=?').run('idea-a');

  // Per-idea visibility, restriction and account-wide block rules hold on reads.
  sqlite.prepare('UPDATE profiles SET listed=0 WHERE id=?').run('idea-a');
  await read(null, 'idea-a', 404);
  await read('investor', 'idea-a', 404);
  equal((await read('founder')).experiments.length, 1, 'The owner can still manage a private idea');
  await write('founder', 'share', 'idea-a', a.id, a.version, { shared: true, consent: true }, 409);
  sqlite.prepare('UPDATE profiles SET listed=1 WHERE id=?').run('idea-a');
  sqlite.prepare('INSERT INTO profile_moderation(profile_id,hidden,reason,version,event_id,updated) VALUES(?,?,?,?,?,?)').run('idea-a', 1, 'Synthetic restriction.', 1, 'synthetic-audit', oldTime);
  await read(null, 'idea-a', 404);
  await read('investor', 'idea-a', 404);
  equal((await read('founder')).experiments.length, 1, 'Restricted owners retain access to their own private work');
  await write('founder', 'share', 'idea-a', a.id, a.version, { shared: true, consent: true }, 409);
  sqlite.prepare('UPDATE profile_moderation SET hidden=0 WHERE profile_id=?').run('idea-a');
  sqlite.prepare('INSERT INTO member_blocks(owner,target_owner,profile_id,target_name,created) VALUES(?,?,?,?,?)').run('investor', 'founder', 'idea-b', 'Sibling idea', oldTime);
  await read('investor', 'idea-a', 404);
  await read('investor', 'idea-b', 404);
  equal((await read('unrelated', 'idea-a')).experiments.length, 1, 'A different member is unaffected by another member block');
  sqlite.prepare('DELETE FROM member_blocks').run();
  sqlite.prepare('INSERT INTO member_blocks(owner,target_owner,profile_id,target_name,created) VALUES(?,?,?,?,?)').run('founder', 'investor', 'investor-profile', 'Investor', oldTime);
  await read('investor', 'idea-a', 404);
  sqlite.prepare('DELETE FROM member_blocks').run();
  a = find(await write('founder', 'share', 'idea-a', a.id, a.version, { shared: false, consent: true }), a.id);
  equal(a.shared, false);
  equal((await read(null)).experiments.length, 0, 'A founder can withdraw a shared learning');
  const withdrawnRecord = row(a.id);
  equal(withdrawnRecord.plan, completedRecord.plan);
  equal(withdrawnRecord.result, completedRecord.result);
  equal(withdrawnRecord.completed_at, completedRecord.completed_at);

  // Deleting a draft requires the correct owner, idea and current version.
  await write('attacker', 'remove', 'idea-b', b.id, b.version, {}, 404);
  await write('founder', 'remove', 'idea-a', b.id, b.version, {}, 404);
  await write('founder', 'remove', 'idea-b', b.id, b.version + 1, {}, 409);
  await write('founder', 'remove', 'idea-b', b.id, b.version);
  equal(rows('idea-b').length, 0);
  equal(rows('idea-a').length, 1, 'Removing B never deletes A');

  // Two identical versions racing to edit/start produce one winner.
  let concurrent = await created('founder', 'idea-b');
  const concurrentEdits = await Promise.all([
    write('founder', 'edit', 'idea-b', concurrent.id, concurrent.version, { plan: { ...plan, title: 'Concurrent edit one' } }, [200, 409]),
    write('founder', 'edit', 'idea-b', concurrent.id, concurrent.version, { plan: { ...plan, title: 'Concurrent edit two' } }, [200, 409]),
  ]);
  deepEqual(concurrentEdits.map(response => response.httpStatus).sort(), [200, 409], 'Atomic edit CAS admits only one matching version');
  concurrent = (await read('founder', 'idea-b')).experiments[0];
  const starts = await Promise.all([
    write('founder', 'start', 'idea-b', concurrent.id, concurrent.version, {}, [200, 409]),
    write('founder', 'start', 'idea-b', concurrent.id, concurrent.version, {}, [200, 409]),
  ]);
  deepEqual(starts.map(response => response.httpStatus).sort(), [200, 409], 'Atomic start CAS admits only one transition');
  concurrent = (await read('founder', 'idea-b')).experiments[0];
  const completes = await Promise.all([
    write('founder', 'complete', 'idea-b', concurrent.id, concurrent.version, { result }, [200, 409]),
    write('founder', 'complete', 'idea-b', concurrent.id, concurrent.version, { result: { ...result, decision: 'inconclusive' } }, [200, 409]),
  ]);
  deepEqual(completes.map(response => response.httpStatus).sort(), [200, 409], 'Atomic completion keeps exactly one immutable outcome');

  // Plain strings remain plain evidence; no runtime HTML interpretation or fetching.
  const unsafeText = '<img src=x onerror=alert(1)> Customer said <script>alert(1)</script>';
  const textItem = await completed('idea-b', 'founder', { ...plan, title: '<script>alert(1)</script>', assumption: unsafeText }, { ...result, observations: unsafeText, decision: 'inconclusive', evidenceUrl: '' });
  equal(textItem.assumption, unsafeText);
  equal(textItem.observations, unsafeText);
  equal(textItem.evidenceUrl, '');
  equal(textItem.decision, 'inconclusive');
  // Rendering is tested separately in the browser; the API must not invent markup or verification.
  ok(!('verified' in textItem) && !('score' in textItem), 'A recorded result does not claim verification or investment readiness');

  // A private idea can run and complete tests without publishing any learning.
  const privateItem = await completed('private-idea', 'private-founder');
  equal(privateItem.status, 'complete');
  await write('private-founder', 'share', 'private-idea', privateItem.id, privateItem.version, { shared: true, consent: true }, 409);
  await read(null, 'private-idea', 404);
  await read('founder', 'private-idea', 404);

  // Repeat ownership, sharing and CAS predicates in the mutation itself.
  insertProfile('race-idea', 'race-founder');
  let raceItem = await completed('race-idea', 'race-founder');
  const raceBefore = row(raceItem.id);
  beforeWrite = () => sqlite.prepare('UPDATE profiles SET listed=0 WHERE id=?').run('race-idea');
  await write('race-founder', 'share', 'race-idea', raceItem.id, raceItem.version, { shared: true, consent: true }, 409);
  deepEqual(row(raceItem.id), raceBefore, 'A concurrent unlisting blocks the sharing UPDATE atomically');
  sqlite.prepare('UPDATE profiles SET listed=1 WHERE id=?').run('race-idea');
  beforeWrite = () => sqlite.prepare('UPDATE profiles SET owner=? WHERE id=?').run('new-owner', 'race-idea');
  await write('race-founder', 'share', 'race-idea', raceItem.id, raceItem.version, { shared: true, consent: true }, 409);
  deepEqual(row(raceItem.id), raceBefore, 'A changed owner cannot pass a stale ownership precheck');
  sqlite.prepare('UPDATE profiles SET owner=? WHERE id=?').run('race-founder', 'race-idea');
  beforeWrite = () => sqlite.prepare('UPDATE idea_experiments SET version=version+1 WHERE id=?').run(raceItem.id);
  await write('race-founder', 'share', 'race-idea', raceItem.id, raceItem.version, { shared: true, consent: true }, 409);
  equal(row(raceItem.id).shared, 0, 'A version change after the precheck cannot bypass write CAS');
  equal(row(raceItem.id).result, raceBefore.result);
  raceItem = find(await read('race-founder', 'race-idea'), raceItem.id);
  // Revocation remains available while a listing is unavailable.
  raceItem = find(await write('race-founder', 'share', 'race-idea', raceItem.id, raceItem.version, { shared: true, consent: true }), raceItem.id);
  sqlite.prepare('UPDATE profiles SET listed=0 WHERE id=?').run('race-idea');
  raceItem = find(await write('race-founder', 'share', 'race-idea', raceItem.id, raceItem.version, { shared: false, consent: true }), raceItem.id);
  equal(raceItem.shared, false, 'An owner can revoke a shared result after unlisting the idea');

  insertProfile('race-create', 'create-founder');
  beforeWrite = () => sqlite.prepare('UPDATE profiles SET owner=? WHERE id=?').run('different-owner', 'race-create');
  await create('create-founder', 'race-create', plan, 409);
  equal(rows('race-create').length, 0, 'Create rechecks ownership in its INSERT predicate');

  for (const decision of ['change', 'stop']) {
    const decided = await completed('idea-b', 'founder', plan, { ...result, decision });
    equal(decided.decision, decision, 'Negative or changed-direction findings can be recorded honestly');
  }

  // Count cap is enforced inside INSERT, including two requests for the last slot.
  insertProfile('limit-idea', 'limit-founder');
  for (let index = 0; index < 49; index++) await create('limit-founder', 'limit-idea', { ...plan, title: `Plan ${index}` });
  equal(rows('limit-idea').length, 49);
  const lastSlot = await Promise.all([
    create('limit-founder', 'limit-idea', { ...plan, title: 'Last slot one' }, [200, 409]),
    create('limit-founder', 'limit-idea', { ...plan, title: 'Last slot two' }, [200, 409]),
  ]);
  deepEqual(lastSlot.map(response => response.httpStatus).sort(), [200, 409], 'Concurrent creates cannot exceed the cap');
  equal(rows('limit-idea').length, 50);
  await create('limit-founder', 'limit-idea', plan, 409);
  equal((await read('limit-founder', 'limit-idea')).experiments.length, 50, 'Owner sees the full bounded history');
  const unusedDraft = (await read('limit-founder', 'limit-idea')).experiments[0];
  await write('limit-founder', 'remove', 'limit-idea', unusedDraft.id, unusedDraft.version);
  equal(rows('limit-idea').length, 49);
  await create('limit-founder', 'limit-idea', { ...plan, title: 'A replacement for a removed unused draft' });
  equal(rows('limit-idea').length, 50, 'Removing an unused draft makes one bounded slot available');

  // A write failure cannot partially change lifecycle or report a false success.
  const failureItem = await created('founder', 'idea-b');
  const failureBefore = row(failureItem.id);
  failNextWrite = true;
  await write('founder', 'start', 'idea-b', failureItem.id, failureItem.version, {}, 503);
  deepEqual(row(failureItem.id), failureBefore);
  for (const id of ['idea-a', 'idea-b', 'private-idea', 'other-idea', 'investor-profile', 'limit-idea']) equal(sqlite.prepare('SELECT updated FROM profiles WHERE id=?').get(id).updated, oldTime, 'Private testing activity never bumps public profile freshness');
  equal(sqlite.prepare('PRAGMA foreign_key_check').all().length, 0);
  ok(maxBindings <= 100);
  console.log(`Passed ${checks} experiment checks: additive migration; authentication and strict input; independent ideas; private-by-default lifecycle and immutable completion; exact ownership and CAS; controlled sharing; public/private/moderation/block boundaries; bounded concurrent creates; unchanged profile freshness.`);
} finally { sqlite.close(); }
