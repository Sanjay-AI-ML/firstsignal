import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import { transform } from 'esbuild';
import { z } from 'zod';

// Real routes/services and SQLite, isolated from Clerk, network and live data.
const sqlite = new DatabaseSync(':memory:');
for (const file of (await fs.readdir('drizzle')).filter(file => file.endsWith('.sql')).sort()) sqlite.exec(await fs.readFile(`drizzle/${file}`, 'utf8'));
const auth = new AsyncLocalStorage();
const env = { FINDIN_ADMIN_USER_ID: 'user_Owner123', CLERK_SECRET_KEY: 'sk_test_fixture', FIRSTSIGNAL_ORIGIN: 'https://findin.example' };
let dbCalls = 0;
const db = { prepare(sql) {
  dbCalls++;
  const query = sqlite.prepare(sql); let args = [];
  const execute = () => query.columns().length ? { results: query.all(...args), meta: { changes: 0 } } : { results: [], meta: { changes: query.run(...args).changes } };
  const statement = { bind(...values) { assert.ok(values.length <= 100); args = values; return statement; }, async run() { return execute(); }, async all() { return execute(); }, async first() { return query.get(...args) ?? null; }, execute };
  return statement;
}, async batch(statements) {
  sqlite.exec('BEGIN IMMEDIATE');
  try { const rows = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return rows; }
  catch (error) { sqlite.exec('ROLLBACK'); throw error; }
} };
async function load(file, modules) {
  const { code } = await transform(await fs.readFile(file, 'utf8'), { loader: 'ts', format: 'cjs' });
  const context = { module: { exports: {} }, exports: {}, require: id => { assert.ok(id in modules, `Unexpected dependency ${id}`); return modules[id]; }, Response, Request, URL, crypto, console, TextDecoder, Uint8Array };
  vm.runInNewContext(code, context); return context.module.exports;
}
const types = await load('lib/admin-types.ts', {});
const access = await load('lib/admin-access.ts', { 'cloudflare:workers': { env } });
const service = await load('lib/admin-service.ts', { 'cloudflare:workers': { env }, './database': { database: () => db }, './admin-access': access, './admin-types': types });
const route = await load('app/api/admin/route.ts', { zod: { z }, '@/app/auth': { getAppUser: async () => auth.getStore() }, '@/lib/admin-access': access, '@/lib/admin-types': types, '@/lib/admin-service': service });
const sectors = await load('lib/sectors.ts', {});
const data = await load('lib/data.ts', { './sectors': sectors, './seed-startups.json': JSON.parse(await fs.readFile('lib/seed-startups.json', 'utf8')), './seed-investors.json': JSON.parse(await fs.readFile('lib/seed-investors.json', 'utf8')) });
const validation = await load('lib/validation.ts', { zod: { z }, './data': data, './sectors': sectors });
const workspace = await load('app/api/workspace/route.ts', { '../../auth': { getAppUser: async () => auth.getStore() }, '@/lib/notifications': { notify: async () => {} }, '@/lib/database': { database: () => db }, '@/lib/data': data, '@/lib/validation': validation, '@/lib/member-safety': { membersBlocked: async () => false } });
const owner = { userId: 'clerk:user_Owner123', displayName: 'Operator', email: 'owner@example.test', emailVerified: true };
const member = { ...owner, userId: 'clerk:user_Member123', displayName: 'Member' };
const origin = 'https://findin.example';
let checks = 0;
function equal(actual, expected, label) { assert.equal(actual, expected, label); checks++; }
async function get(user, query = '') { const response = await auth.run(user, () => route.GET(new Request(`${origin}/api/admin${query}`))); return { status: response.status, body: await response.json(), headers: response.headers }; }
async function post(user, payload, headers = {}, raw) {
  const request = new Request(`${origin}/api/admin`, { method: 'POST', headers: { origin, 'content-type': 'application/json', ...headers }, body: raw ?? JSON.stringify(payload) });
  const response = await auth.run(user, () => route.POST(request)); return { status: response.status, body: await response.json() };
}
async function state(user, id = '') { const response = await auth.run(user, () => workspace.GET(new Request(`${origin}/api/workspace${id ? `?profile=${id}` : ''}`))); equal(response.status, 200); return response.json(); }
const profile = { ...data.seedProfiles[0], demo: false, name: 'Public fixture', founder: 'Founder', solution: 'A working proposed solution for local verification.', kind: 'startup' };
function addProfile(id, account, listed, name = id) { sqlite.prepare('INSERT INTO profiles (id,owner,kind,data,listed,updated) VALUES (?,?,?,?,?,?)').run(id, account, 'startup', JSON.stringify({ ...profile, id, name }), listed, '2026-10-18'); }
try {
  equal(access.isAdminAccount(owner), true);
  env.FINDIN_ADMIN_USER_ID = 'user_Owner123,user_Other'; equal(access.isAdminAccount(owner), false);
  env.FINDIN_ADMIN_USER_ID = 'user_Owner123';
  equal(access.isAdminAccount(member), false);
  equal(access.isAdminAccount({ ...owner, userId: 'user_Owner123' }), false);
  equal(access.isAdminAccount({ ...member, role: 'admin', email: owner.email }), false);
  env.FINDIN_ADMIN_USER_ID = '';
  equal(access.isAdminAccount(owner), false);
  equal((await get(owner)).status, 403);
  env.FINDIN_ADMIN_USER_ID = 'user_Owner123';
  const before = dbCalls;
  equal((await get(null)).status, 401);
  equal((await get(member)).status, 403);
  equal((await post(member, {})).status, 403);
  equal(dbCalls, before, 'Denied requests must not read the database');
  equal((await post(owner, {}, { origin: 'https://attacker.test' })).status, 403);
  equal((await post(owner, {}, { origin: '' })).status, 403);
  equal((await post(owner, {}, { 'content-type': 'text/plain' })).status, 415);
  equal((await post(owner, {}, {}, '{broken')).status, 400);
  equal((await post(owner, {}, {}, 'x'.repeat(8001))).status, 413);
  equal((await get(owner, '?view=messages')).status, 400);
  equal((await get(owner, '?view=profiles&page=-1')).status, 400);
  equal((await get(owner, '?view=reports&q=' + 'x'.repeat(101))).status, 400);
  addProfile('public-one', member.userId, 1, 'Public Fixture');
  addProfile('private-one', 'clerk:user_Private', 0, 'PRIVATE_DRAFT_CANARY');
  addProfile('public-two', 'clerk:user_Second', 1, 'Other Public');
  sqlite.prepare("INSERT INTO introductions (id,sender,recipient,profile_id,target_name,sender_name,message,status,created,updated) VALUES ('intro',?,?,?,'Public Fixture','Other','PRIVATE_REQUEST_CANARY','accepted','2026-10-18','2026-10-18')").run(owner.userId, member.userId, 'public-one');
  sqlite.prepare("INSERT INTO messages (id,introduction_id,sender,sender_name,body,created) VALUES ('msg','intro',?,'Other','PRIVATE_MESSAGE_CANARY','2026-10-18')").run(member.userId);
  sqlite.prepare("INSERT INTO connection_next_steps (owner,introduction_id,note,date,updated) VALUES (?,'intro','PRIVATE_NOTE_CANARY','','2026-10-18')").run(member.userId);
  sqlite.prepare("INSERT INTO member_reports (id,owner,target_owner,profile_id,reason,details,status,created) VALUES ('report-one',?,?,?,'Misleading claims','A submitted allegation for review.','submitted','2026-10-18')").run(owner.userId, member.userId, 'public-one');
  sqlite.prepare("INSERT INTO member_reports (id,owner,target_owner,profile_id,reason,details,status,created) VALUES ('report-private',?,?,?,'Other','Member supplied report only.','submitted','2026-10-18')").run(owner.userId, 'clerk:user_Private', 'private-one');
  const overview = await get(owner);
  equal(overview.body.profiles.total, 3); equal(overview.body.profiles.private, 1); equal(overview.body.profiles.public, 2);
  equal(overview.body.reports.open, 2); equal(overview.body.configuration.clerkMode, 'development');
  assert.match(overview.headers.get('cache-control'), /no-store/); checks++;
  const listed = await get(owner, '?view=profiles'); equal(listed.body.items.length, 2);
  const reports = await get(owner, '?view=reports'); equal(reports.body.items.find(r => r.id === 'report-private').target, null);
  sqlite.prepare("INSERT INTO member_reports (id,owner,target_owner,profile_id,reason,details,status,created) VALUES ('report-connection',?,?,?,'Other',?,'submitted','2026-10-18')").run(owner.userId, member.userId, 'connection:intro', 'x'.repeat(1490) + 'TAIL_PROOF');
  const connectionReports = await get(owner, '?view=reports');
  equal(connectionReports.body.items.find(r => r.id === 'report-connection').target.id, 'public-one');
  equal(connectionReports.body.items.find(r => r.id === 'report-connection').details.endsWith('TAIL_PROOF'), true);
  sqlite.prepare('INSERT INTO profiles (id,owner,kind,data,listed,updated) VALUES (?,?,?,?,?,?)').run('legacy-investor', member.userId, 'investor', JSON.stringify({ ...profile, kind: 'investor', name: 'Listed legacy investor' }), 1, '2026-10-19');
  const legacyReports = await get(owner, '?view=reports');
  equal(legacyReports.body.items.filter(r => r.id === 'report-connection').length, 1);
  equal(legacyReports.body.items.find(r => r.id === 'report-connection').target.id, 'legacy-investor');
  sqlite.prepare('DELETE FROM profiles WHERE id=?').run('legacy-investor');
  const combined = JSON.stringify([overview.body, listed.body, reports.body]);
  for (const canary of ['PRIVATE_DRAFT_CANARY', 'PRIVATE_REQUEST_CANARY', 'PRIVATE_MESSAGE_CANARY', 'PRIVATE_NOTE_CANARY', 'sk_test_fixture', member.userId]) { equal(combined.includes(canary), false, canary); }
  equal((await post(owner, { action: 'moderateProfile', profileId: 'public-one', hidden: true, reason: 'too short', expectedVersion: 0 })).status, 400);
  const hide = { action: 'moderateProfile', profileId: 'public-one', hidden: true, reason: 'Reviewing an unresolved listing report.', expectedVersion: 0 };
  equal((await post(owner, { ...hide, role: 'admin' })).status, 400);
  equal((await post(owner, hide)).status, 200);
  equal(sqlite.prepare('SELECT hidden FROM profile_moderation WHERE profile_id=?').get('public-one').hidden, 1);
  equal(sqlite.prepare('SELECT COUNT(*) n FROM admin_audit').get().n, 1);
  equal((await post(owner, hide)).status, 409);
  equal(sqlite.prepare('SELECT COUNT(*) n FROM admin_audit').get().n, 1);
  for (const identity of [null, owner, member]) { const current = await state(identity, 'public-one'); equal(current.profiles.some(p => p.id === 'public-one'), false); }
  const own = await state(member, 'public-one'); equal(own.myProfiles.find(p => p.id === 'public-one').moderation.hidden, true);
  const editHidden = new Request(`${origin}/api/workspace`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'profile', profile: { ...profile, name: 'Edited while hidden' }, listed: true, consent: true }) });
  const editResult = await auth.run(member, () => workspace.POST(editHidden)); equal(editResult.status, 200);
  equal((await state(null, 'public-one')).profiles.some(p => p.id === 'public-one'), false, 'Owner republish cannot bypass restriction');
  const ownAfterEdit = await state(member); equal(ownAfterEdit.myProfiles[0].moderation.hidden, true);
  equal(ownAfterEdit.myProfiles[0].name, 'Edited while hidden');
  sqlite.prepare('INSERT INTO saves(owner,profile_id,created) VALUES (?,?,?)').run(owner.userId, 'public-one', '2026-10-18');
  equal((await state(owner)).profiles.some(p => p.id === 'public-one'), false);
  const request = new Request(`${origin}/api/workspace`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'request', profileId: 'public-one', message: 'A thoughtful introduction request for a hidden listing.', consent: true }) });
  const rejection = await auth.run({ ...member, userId: 'clerk:user_New' }, () => workspace.POST(request)); equal(rejection.status, 404);
  const review = { action: 'reviewReport', reportId: 'report-one', status: 'reviewing', operatorNote: 'Checked the public listing and started review.', expectedVersion: 0 };
  equal((await post(owner, review)).status, 200);
  equal((await post(owner, review)).status, 409);
  equal(sqlite.prepare('SELECT COUNT(*) n FROM admin_audit').get().n, 2);
  // A failed audit insert must roll back the report change in the same batch.
  sqlite.exec("CREATE TRIGGER reject_audit BEFORE INSERT ON admin_audit BEGIN SELECT RAISE(ABORT,'fixture audit failure'); END");
  equal((await post(owner, { ...review, status: 'resolved', expectedVersion: 1 })).status, 503);
  equal(sqlite.prepare('SELECT version FROM member_reports WHERE id=?').get('report-one').version, 1);
  sqlite.exec('DROP TRIGGER reject_audit');
  equal((await post(owner, { ...hide, hidden: false, expectedVersion: 1, reason: 'Review complete; lifting the listing restriction.' })).status, 200);
  equal((await state(null, 'public-one')).profiles.some(p => p.id === 'public-one'), true);
  const race = await Promise.all([post(owner, { ...hide, expectedVersion: 2 }), post(owner, { ...hide, expectedVersion: 2 })]);
  equal(race.map(result => result.status).sort().join(','), '200,409');
  equal(sqlite.prepare('SELECT version FROM profile_moderation WHERE profile_id=?').get('public-one').version, 3);
  equal(sqlite.prepare("SELECT COUNT(*) n FROM admin_audit WHERE target_id='public-one'").get().n, 3);
  equal((await post(owner, { ...hide, hidden: false, expectedVersion: 3 })).status, 200);
  // Lifting a restriction never changes an owner's private sharing choice.
  equal((await post(owner, { ...hide, expectedVersion: 4 })).status, 200);
  sqlite.prepare('UPDATE profiles SET listed=0,data=? WHERE id=?').run(JSON.stringify({ ...profile, name: 'PRIVATE_MODERATED_CANARY', tagline: 'PRIVATE_TAGLINE_CANARY' }), 'public-one');
  const restrictedRows = await get(owner, '?view=profiles');
  const restricted = restrictedRows.body.items.find(p => p.id === 'public-one');
  equal(restricted.ownerListed, false); equal(restricted.hidden, true);
  equal(restricted.name, 'Private profile with a restriction');
  equal(JSON.stringify(restrictedRows.body).includes('PRIVATE_MODERATED_CANARY'), false);
  equal(JSON.stringify(restrictedRows.body).includes('PRIVATE_TAGLINE_CANARY'), false);
  equal((await get(owner, '?view=profiles&q=PRIVATE_MODERATED_CANARY')).body.total, 0, 'Search cannot infer a private name');
  equal((await get(owner, '?view=profiles&q=public-one')).body.total, 1, 'Known restriction ID is searchable without exposing draft');
  equal((await post(owner, { ...hide, hidden: false, expectedVersion: 5 })).status, 200);
  equal(sqlite.prepare('SELECT listed FROM profiles WHERE id=?').get('public-one').listed, 0);
  equal((await state(null, 'public-one')).profiles.some(p => p.id === 'public-one'), false);
  for (let i = 0; i < 30; i++) addProfile(`pagination-${i}`, `clerk:user_Page${i}`, 1, `Search row ${i}`);
  const page1 = await get(owner, '?view=profiles&q=Search'); const page2 = await get(owner, '?view=profiles&q=Search&page=2');
  equal(page1.body.items.length, 25); equal(page2.body.items.length, 5); equal(page1.body.total, 30);
  equal(new Set([...page1.body.items, ...page2.body.items].map(p => p.id)).size, 30);
  equal((await get(owner, '?view=profiles&q=%25')).body.total, 0, 'Search wildcard is literal');
  const eventSearch = await get(owner, '?view=audit&q=profile_hidden');
  equal(eventSearch.body.items.every(item => item.action === 'profile_hidden'), true);
  equal(eventSearch.body.total, 3);
  equal((await get(owner, '?view=audit&q=absolutely-no-event')).body.total, 0);
  equal((await get(owner, '?view=profiles&q=%27%20OR%201%3D1--')).body.total, 0, 'Search remains parameterized');
  console.log(`Passed ${checks} owner portal checks: fail-closed identity, authorization-before-query, origin/body/schema bounds, private-data exclusion, pagination, report review, hidden listing visibility, stale writes and atomic audit rollback.`);
} finally { sqlite.close(); }
