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
let checks = 0, dbCalls = 0, maximumBindings = 0, failReads = false;
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks++; };
const ok = (actual, label) => { assert.ok(actual, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const db = { prepare(sql) {
  dbCalls++;
  if (failReads) throw new Error('Synthetic database failure');
  const query = sqlite.prepare(sql); let args = [];
  const execute = () => query.columns().length ? { results: query.all(...args), meta: { changes: 0 } } : { results: [], meta: { changes: query.run(...args).changes } };
  const statement = { bind(...values) { maximumBindings = Math.max(maximumBindings, values.length); assert.ok(values.length <= 100, 'D1 binding limit'); args = values; return statement; }, async all() { return execute(); }, async run() { return execute(); }, async first() { return query.get(...args) ?? null; }, execute };
  return statement;
}, async batch(statements) {
  sqlite.exec('BEGIN IMMEDIATE');
  try { const result = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return result; }
  catch (error) { sqlite.exec('ROLLBACK'); throw error; }
} };
async function load(file, modules = {}) {
  const { code } = await transform(await fs.readFile(file, 'utf8'), { loader: 'ts', format: 'cjs' });
  const context = { module: { exports: {} }, exports: {}, require: name => { assert.ok(name in modules, `Unexpected dependency ${name}`); return modules[name]; }, console, Response, Request, URL, crypto, TextDecoder, Uint8Array };
  vm.runInNewContext(code, context); return context.module.exports;
}
const auth = new AsyncLocalStorage();
const throttle = await load('lib/rate-limit.ts');
const sectors = await load('lib/sectors.ts');
const data = await load('lib/data.ts', { './sectors': sectors, './seed-startups.json': JSON.parse(await fs.readFile('lib/seed-startups.json', 'utf8')), './seed-investors.json': JSON.parse(await fs.readFile('lib/seed-investors.json', 'utf8')) });
const validation = await load('lib/validation.ts', { zod: { z }, './data': data, './sectors': sectors });
const route = await load('app/api/workspace/route.ts', { '../../auth': { getAppUser: async () => auth.getStore() }, '@/lib/notifications': { notify: async () => {} }, '@/lib/database': { database: () => db }, '@/lib/data': data, '@/lib/validation': validation, '@/lib/member-safety': { membersBlocked: async () => false }, '@/lib/rate-limit': throttle });
const origin = 'https://findin.example', now = '2026-10-19T10:00:00.000Z';
const owner = 'clerk:synthetic-export-founder', other = 'clerk:synthetic-other', outsider = 'clerk:synthetic-outsider';
const account = id => id ? { userId: id, displayName: 'Synthetic member', email: 'member@example.test', emailVerified: true } : null;
async function post(id, payload, expected = 200, headers = {}) {
  const response = await auth.run(account(id), () => route.POST(new Request(`${origin}/api/workspace`, { method: 'POST', headers: { origin, 'content-type': 'application/json', ...headers }, body: JSON.stringify(payload) })));
  const body = await response.json();
  equal(response.status, expected, JSON.stringify(body));
  equal(response.headers.get('cache-control'), 'no-store', 'Private export and refusal responses are not cached');
  return body;
}
const profile = { ...data.seedProfiles[0], name: 'Owned synthetic idea', founder: 'Synthetic founder', demo: false };
function addIdea(id, member, listed = 0, canary = '') { sqlite.prepare('INSERT INTO profiles(id,owner,kind,data,listed,updated) VALUES(?,?,?,?,?,?)').run(id, member, 'startup', JSON.stringify({ ...profile, name: id, validation: canary }), listed, now); }
function addIntro(id, sender, recipient, profileId) { sqlite.prepare('INSERT INTO introductions(id,sender,recipient,profile_id,target_name,sender_name,message,status,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id, sender, recipient, profileId, 'Other member', 'Synthetic founder', 'A synthetic introduction used to test archive privacy.', 'accepted', now, now); }

try {
  for (let i = 0; i < 205; i++) {
    addIdea(`owned-${i}`, owner);
    sqlite.prepare('INSERT INTO progress_updates(id,profile_id,date,title,body,created) VALUES(?,?,?,?,?,?)').run(`update-${i}`, `owned-${i}`, '2026-10-19', `Progress ${i}`, `Owned progress content ${i}`, now);
  }
  addIdea('other-private', other, 0, 'OTHER_PRIVATE_PROFILE_CANARY');
  addIdea('outsider-private', outsider, 0, 'OUTSIDER_PRIVATE_PROFILE_CANARY');
  for (let i = 0; i < 105; i++) {
    const id = `connection-${i}`;
    addIntro(id, i % 2 ? other : owner, i % 2 ? owner : other, `owned-${i}`);
    sqlite.prepare('INSERT INTO messages(id,introduction_id,sender,sender_name,body,created) VALUES(?,?,?,?,?,?)').run(`message-${i}`, id, other, 'Other member', `Conversation message ${i}`, now);
    sqlite.prepare('INSERT INTO connection_next_steps(owner,introduction_id,note,date,updated) VALUES(?,?,?,?,?)').run(other, id, 'COUNTERPARTY_PRIVATE_NOTE_CANARY', '2026-10-20', now);
    sqlite.prepare('INSERT INTO connection_next_steps(owner,introduction_id,note,date,updated) VALUES(?,?,?,?,?)').run(owner, id, `My private next step ${i}`, '2026-10-21', now);
    sqlite.prepare('INSERT INTO negotiations(introduction_id,version,author,amount,terms,status,event_id,updated) VALUES(?,?,?,?,?,?,?,?)').run(id, 1, other, 500000, 'Shared non-binding discussion terms.', 'open', `event-${i}`, now);
    sqlite.prepare('INSERT INTO negotiation_events(id,introduction_id,version,author,author_name,amount,terms,status,created) VALUES(?,?,?,?,?,?,?,?,?)').run(`event-${i}`, id, 1, other, 'Other member', 500000, 'Shared non-binding discussion terms.', 'open', now);
  }
  addIntro('unrelated-connection', other, outsider, 'other-private');
  sqlite.prepare('INSERT INTO messages(id,introduction_id,sender,sender_name,body,created) VALUES(?,?,?,?,?,?)').run('unrelated-message', 'unrelated-connection', other, 'Other member', 'UNRELATED_CONVERSATION_CANARY', now);
  sqlite.prepare('INSERT INTO member_blocks(owner,target_owner,profile_id,target_name,created) VALUES(?,?,?,?,?)').run(other, owner, 'owned-0', 'Synthetic founder', now);
  sqlite.prepare('INSERT INTO member_blocks(owner,target_owner,profile_id,target_name,created) VALUES(?,?,?,?,?)').run(owner, outsider, 'outsider-private', 'Blocked member', now);
  sqlite.prepare('INSERT INTO saves(owner,profile_id,created) VALUES(?,?,?)').run(owner, 'outsider-private', now);
  sqlite.prepare('INSERT INTO member_reports(id,owner,target_owner,profile_id,reason,details,status,created,operator_note,last_admin_event) VALUES(?,?,?,?,?,?,?,?,?,?)').run('own-report', owner, other, 'other-private', 'spam', 'My submitted report details.', 'reviewed', now, 'INTERNAL_OPERATOR_NOTE_CANARY', 'INTERNAL_ADMIN_EVENT_CANARY');
  sqlite.prepare('INSERT INTO member_reports(id,owner,target_owner,profile_id,reason,details,status,created) VALUES(?,?,?,?,?,?,?,?)').run('other-report', other, owner, 'owned-0', 'other', 'OTHER_REPORT_DETAILS_CANARY', 'submitted', now);
  sqlite.prepare('INSERT INTO profile_moderation(profile_id,hidden,reason,version,event_id,updated) VALUES(?,?,?,?,?,?)').run('owned-0', 1, 'A listing restriction visible to its owner.', 1, 'audit-one', now);
  sqlite.prepare('INSERT INTO admin_audit(id,actor,action,target_id,reason,previous_state,next_state,created) VALUES(?,?,?,?,?,?,?,?)').run('audit-one', 'operator', 'moderateProfile', 'owned-0', 'INTERNAL_AUDIT_CANARY', '{}', '{}', now);
  sqlite.prepare('INSERT INTO notification_preferences(owner,email,enabled) VALUES(?,?,?)').run(owner, 'member@example.test', 1);
  sqlite.prepare('INSERT INTO notifications(id,owner,introduction_id,title,status,created) VALUES(?,?,?,?,?,?)').run('own-notification', owner, 'connection-0', 'A connection has an update.', 'pending', now);
  sqlite.prepare('INSERT INTO notifications(id,owner,introduction_id,title,status,created) VALUES(?,?,?,?,?,?)').run('other-notification', other, 'unrelated-connection', 'OTHER_NOTIFICATION_CANARY', 'pending', now);
  const plan = { title: 'Private synthetic test', assumption: 'An owned assumption requiring a small test.', method: 'Observe a prototype task with consenting people.', audience: 'Five consenting participants.', successCriterion: 'Three participants complete the task without help.', dueDate: '' };
  sqlite.prepare('INSERT INTO idea_experiments(id,profile_id,plan,result,status,shared,version,created,started_at,completed_at,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('own-test', 'owned-0', JSON.stringify(plan), '{}', 'draft', 0, 0, now, '', '', now);
  sqlite.prepare('INSERT INTO idea_experiments(id,profile_id,plan,result,status,shared,version,created,started_at,completed_at,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('other-test', 'other-private', JSON.stringify({ ...plan, title: 'OTHER_PRIVATE_TEST_CANARY' }), '{}', 'draft', 0, 0, now, '', '', now);
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row => row.name);
  const snapshot = () => JSON.stringify(tables.map(table => [table, sqlite.prepare(`SELECT * FROM ${table}`).all()]));
  const before = snapshot();

  const callsBeforeDenial = dbCalls;
  await post(null, { action: 'exportData' }, 401);
  await post(owner, { action: 'exportData' }, 403, { origin: 'https://other.example' });
  equal(dbCalls, callsBeforeDenial, 'Unauthorized exports never query storage');
  const archive = (await post(owner, { action: 'exportData', owner: other })).dataArchive;
  equal(archive.formatVersion, 1);
  equal(archive.user.id, owner, 'Export identity comes from the authenticated account');
  equal(archive.profiles.length, 205, 'Every owned idea is exported beyond the old 100-binding cutoff');
  equal(archive.profiles.flatMap(item => item.progressUpdates).length, 205, 'All owned progress is exported');
  equal(archive.connections.length, 105, 'Connection export is independent of the workspace latest-100 window');
  equal(archive.connections.flatMap(item => item.messages).length, 105);
  equal(archive.connections.flatMap(item => item.negotiationHistory).length, 105, 'Proposal history is included');
  ok(archive.connections.every(item => item.nextStep?.note.startsWith('My private next step ')), 'Only the exporter’s follow-up notes are included');
  equal(archive.connections.filter(item => item.direction === 'incoming').length, 52);
  equal(archive.experiments.length, 1);
  equal(archive.experiments[0].id, 'own-test');
  equal(archive.experiments[0].plan.title, plan.title);
  equal(archive.experiments[0].shared, false);
  equal(archive.memberReports.length, 1);
  equal(archive.memberReports[0].details, 'My submitted report details.');
  equal(archive.memberBlocks.length, 1, 'Another member’s safety block is not exported');
  equal(archive.shortlist.length, 1);
  equal(archive.notificationPreferences.enabled, true);
  equal(archive.notifications.length, 1);
  ok(archive.profiles.find(item => item.id === 'owned-0').restriction.hidden);
  const serialized = JSON.stringify(archive);
  for (const canary of ['COUNTERPARTY_PRIVATE_NOTE_CANARY', 'INTERNAL_OPERATOR_NOTE_CANARY', 'INTERNAL_ADMIN_EVENT_CANARY', 'INTERNAL_AUDIT_CANARY', 'OTHER_PRIVATE_PROFILE_CANARY', 'OUTSIDER_PRIVATE_PROFILE_CANARY', 'UNRELATED_CONVERSATION_CANARY', 'OTHER_REPORT_DETAILS_CANARY', 'OTHER_NOTIFICATION_CANARY', 'OTHER_PRIVATE_TEST_CANARY', other, outsider]) ok(!serialized.includes(canary), `${canary} stays out of the archive`);
  for (const field of ['operator_note', 'last_admin_event', 'target_owner', 'recipient', 'sender', 'author']) ok(!serialized.includes(`"${field}":`), `Internal identity field ${field} is excluded`);
  ok(archive.scope.includes('Clerk-managed') && archive.scope.includes('Records can change'), 'Archive limits and consistency are explicit');
  same(snapshot(), before, 'Export does not modify stored data');

  for (const id of [owner, other, outsider]) {
    const calls = dbCalls;
    const refused = await post(id, { action: 'deleteAccount', consent: true }, 409);
    ok(refused.error.includes('No records were changed'));
    equal(dbCalls, calls, 'Deletion refusal performs no storage operation');
    same(snapshot(), before, 'Every table and both members’ safety records remain unchanged');
  }
  await post(null, { action: 'deleteAccount', consent: true }, 401);
  await post(owner, { action: 'deleteAccount' }, 400);
  same(snapshot(), before, 'Malformed and unsigned deletion requests are also harmless');
  failReads = true;
  await post(owner, { action: 'exportData' }, 503);
  failReads = false;
  same(snapshot(), before, 'A failed export cannot erase or alter data');
  ok(maximumBindings <= 100);

  let clock = 0;
  const windows = throttle.createFixedWindowThrottle(3, () => clock);
  equal(windows.check('one', 2, 1000).success, true);
  equal(windows.check('one', 2, 1000).remaining, 0);
  equal(windows.check('one', 2, 1000).success, false);
  clock = 1000;
  equal(windows.check('one', 2, 1000).success, true, 'A fixed window resets at its exact boundary');
  for (let i = 0; i < 100; i++) windows.check(`key-${i}`);
  equal(windows.size, 3, 'Unique keys cannot grow isolate memory beyond capacity');
  equal(throttle.anonymousThrottleKey(new Request(origin, { headers: { 'x-forwarded-for': 'untrusted' } })), 'anonymous');
  equal(throttle.anonymousThrottleKey(new Request(origin, { headers: { 'x-forwarded-for': 'untrusted', 'cf-connecting-ip': '192.0.2.1' } })), '192.0.2.1');
  equal(throttle.anonymousThrottleKey(new Request(origin, { headers: { 'cf-connecting-ip': 'x'.repeat(500) } })), 'anonymous');
  for (let i = 0; i < 120; i++) {
    const response = await auth.run(account('throttled-member'), () => route.POST(new Request(`${origin}/api/workspace`, { method: 'POST', headers: { origin, 'x-forwarded-for': `forged-${i}` }, body: JSON.stringify({ action: 'deleteAccount', consent: true }) })));
    assert.equal(response.status, 409);
  }
  await post('throttled-member', { action: 'deleteAccount', consent: true }, 429, { 'x-forwarded-for': 'another-forged-address' });
  await post('different-member', { action: 'deleteAccount', consent: true }, 409, { 'x-forwarded-for': 'another-forged-address' });
  same(snapshot(), before, 'Throttle checks and refusal leave every record intact');
  const ui = await fs.readFile('components/member-controls.tsx', 'utf8');
  ok(!ui.includes('action: "deleteAccount"'), 'The UI provides no working destructive wipe action');
  ok(ui.includes('Account deletion is not available'), 'The UI states the erasure limitation');
  ok(!ui.includes('DPDP Act 2023'), 'The UI does not claim statutory compliance');
  console.log(`Workspace data controls: ${checks} assertions passed; 205 ideas, 105 conversations, owner-only archives, deletion refusal and bounded isolate throttling.`);
} finally { sqlite.close(); }
