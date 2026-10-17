import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import { transform } from 'esbuild';
import { z } from 'zod';

// Real route + real SQLite queries. This uses no remote accounts or site data.
const sqlite = new DatabaseSync(':memory:');
for (const file of (await fs.readdir('drizzle')).filter(file => file.endsWith('.sql')).sort()) sqlite.exec(await fs.readFile(`drizzle/${file}`, 'utf8'));
const auth = new AsyncLocalStorage();
let maxBindings = 0;
let requestedLookups = 0;
const progressBatches = [];
const db = { prepare(sql) {
  const query = sqlite.prepare(sql); let args = [];
  const statement = { bind(...values) {
    maxBindings = Math.max(maxBindings, values.length);
    assert.ok(values.length <= 100, `D1 supports at most 100 bound parameters; received ${values.length}`);
    args = values; return statement;
  }, async run() { return { meta: { changes: query.run(...args).changes } }; },
  async first() { return query.get(...args) ?? null; },
  async all() {
    if (sql.includes('FROM progress_updates')) progressBatches.push(args.length);
    if (sql.includes('LIMIT 1') && (sql.includes('WHERE p.id=') || sql.includes('WHERE id='))) requestedLookups++;
    return { results: query.all(...args) };
  } }; return statement;
}, async batch(statements) { return Promise.all(statements.map(statement => statement.all())); } };
async function load(file, modules) {
  const { code } = await transform(await fs.readFile(file, 'utf8'), { loader: 'ts', format: 'cjs' });
  const context = { module: { exports: {} }, exports: {}, require: id => {
    assert.ok(id in modules, `Unexpected dependency: ${id}`); return modules[id];
  }, Response, Request, URL, crypto, console };
  vm.runInNewContext(code, context); return context.module.exports;
}
const sectors = await load('lib/sectors.ts', {});
const data = await load('lib/data.ts', {
  './sectors': sectors,
  './seed-startups.json': JSON.parse(await fs.readFile('lib/seed-startups.json', 'utf8')),
  './seed-investors.json': JSON.parse(await fs.readFile('lib/seed-investors.json', 'utf8')),
});
const validation = await load('lib/validation.ts', { zod: { z }, './data': data, './sectors': sectors });
const safety = await load('lib/member-safety.ts', { './database': { database: () => db } });
const route = await load('app/api/workspace/route.ts', {
  '../../auth': { getAppUser: async () => auth.getStore() },
  '@/lib/notifications': { notify: async () => {} }, '@/lib/database': { database: () => db },
  '@/lib/data': data, '@/lib/validation': validation, '@/lib/member-safety': safety,
});
const base = { kind: 'startup', name: 'Saved member', founder: 'Local founder', city: 'Chennai',
  sector: data.sectors[0], stage: data.stages[0], tagline: 'An isolated test opportunity',
  problem: 'A customer problem being investigated.', solution: 'A proposed service for early customers.',
  experience: '', validation: '', uncertainty: '', nextMilestone: '', fundingIntentINR: 0,
  budget: '', productStatus: '', revenueStatus: '', incorporationStatus: '', evidenceDate: '', updates: [],
};
const insertProfile = sqlite.prepare('INSERT INTO profiles(id,owner,kind,data,listed,updated) VALUES(?,?,?,?,?,?)');
const insertSave = sqlite.prepare('INSERT INTO saves(owner,profile_id,created) VALUES(?,?,?)');
const insertProgress = sqlite.prepare('INSERT INTO progress_updates(id,profile_id,date,title,body,created) VALUES(?,?,?,?,?,?)');
const viewer = 'saved-viewer';
function saveId(id) { insertSave.run(viewer, id, '2026-10-17T00:00:00.000Z'); }
async function read(owner, profileId) {
  const request = profileId === undefined ? undefined : new Request(`http://localhost/api/workspace?profile=${encodeURIComponent(profileId)}`);
  const response = await auth.run(owner ? { userId: owner, displayName: 'Local viewer' } : null, () => route.GET(request));
  assert.equal(response.status, 200); return response.json();
}
async function toggleSaved(id, saved) {
  const response = await auth.run({ userId: viewer, displayName: 'Local viewer' }, () => route.POST(new Request('http://localhost/api/workspace', {
    method: 'POST', headers: { Origin: 'http://localhost', 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', profileId: id, saved }),
  })));
  assert.equal(response.status, 200); return response.json();
}
const removeSaved = id => toggleSaved(id, false);
try {
  for (let index = 0; index < 450; index++) insertProfile.run(`public-${index}`, `member-${index}`, 'startup', JSON.stringify({ ...base, name: `Member ${index}` }), 1, new Date(Date.UTC(2026, 9, 1, 0, 0, index)).toISOString());
  insertProfile.run('own-draft', viewer, 'startup', JSON.stringify({ ...base, name: 'My private draft' }), 0, '2026-10-01T00:00:00.000Z');
  insertProfile.run('foreign-draft', 'private-member', 'startup', JSON.stringify({ ...base, name: 'PRIVATE_PROFILE_SENTINEL' }), 0, '2026-10-01T00:00:00.000Z');
  for (const [id, title] of [['public-0', 'Old saved progress'], ['own-draft', 'Own private progress'], ['foreign-draft', 'PRIVATE_PROGRESS_SENTINEL']]) insertProgress.run(`update-${id}`, id, '2026-10-01', title, 'Only accessible profile updates may be returned.', '2026-10-01T00:00:00.000Z');
  sqlite.prepare('INSERT INTO member_blocks(owner,target_owner,profile_id,target_name,created) VALUES(?,?,?,?,?)').run(viewer, 'member-448', 'public-448', 'Blocked member', '2026-10-17');
  sqlite.prepare('INSERT INTO member_blocks(owner,target_owner,profile_id,target_name,created) VALUES(?,?,?,?,?)').run('member-447', viewer, 'own-draft', 'Local viewer', '2026-10-17');
  const exampleId = data.seedProfiles[0].id;
  for (const id of ['public-0', 'public-449', 'own-draft', 'foreign-draft', 'public-448', 'public-447', 'deleted-profile', exampleId]) saveId(id);

  const workspace = await read(viewer);
  const members = workspace.profiles.filter(profile => !profile.demo);
  assert.equal(members.length, 202, 'Recent 200 plus old saved profile and own draft, with overlaps de-duplicated');
  assert.equal(new Set(workspace.profiles.map(profile => profile.id)).size, workspace.profiles.length);
  assert.equal(members.find(profile => profile.id === 'public-0')?.updates[0].title, 'Old saved progress');
  assert.equal(members.find(profile => profile.id === 'own-draft')?.mine, true);
  assert.equal(members.find(profile => profile.id === 'own-draft')?.listed, false);
  assert.equal(members.find(profile => profile.id === 'own-draft')?.updates[0].title, 'Own private progress');
  for (const id of ['foreign-draft', 'public-448', 'public-447', 'deleted-profile']) assert.ok(!members.some(profile => profile.id === id), `${id} must not be exposed through saves`);
  assert.ok(!JSON.stringify(workspace).includes('PRIVATE_PROFILE_SENTINEL'));
  assert.ok(!JSON.stringify(workspace).includes('PRIVATE_PROGRESS_SENTINEL'));
  assert.ok(workspace.savedIds.includes(exampleId) && workspace.profiles.some(profile => profile.id === exampleId && profile.demo));
  const anonymous = await read(null), unrelated = await read('unrelated-viewer');
  for (const state of [anonymous, unrelated]) {
    assert.ok(!state.profiles.some(profile => profile.id === 'public-0' || profile.id === 'own-draft'));
    assert.equal(state.savedIds.length, 0);
  }

  // A copied public profile link must work beyond the latest 200 rows, even
  // without a saved profile or a signed-in account. It grants no extra access.
  for (const owner of [null, 'unrelated-viewer', viewer]) {
    const linked = await read(owner, 'public-0');
    assert.equal(linked.profiles.filter(profile => profile.id === 'public-0').length, 1);
    assert.equal(linked.profiles.find(profile => profile.id === 'public-0')?.updates[0].title, 'Old saved progress');
    assert.ok(!JSON.stringify(linked).includes('member-0'), 'Direct links never expose internal owner IDs');
  }
  for (const saved of [false, true, false]) {
    const after = await toggleSaved('public-0', saved);
    assert.equal(after.savedIds.includes('public-0'), saved);
    assert.equal(after.profiles.filter(profile => profile.id === 'public-0').length, 1, 'Save and unsave responses retain an open old public profile');
    assert.equal(after.profiles.find(profile => profile.id === 'public-0')?.updates[0].title, 'Old saved progress');
  }
  const introResponse = await auth.run({ userId: viewer, displayName: 'Local viewer' }, () => route.POST(new Request('http://localhost/api/workspace', {
    method: 'POST', headers: { Origin: 'http://localhost', 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'request', profileId: 'public-0', message: 'I would like to discuss your next customer-learning step.', consent: true }),
  })));
  assert.equal(introResponse.status, 200);
  const introduced = await introResponse.json();
  assert.ok(!introduced.savedIds.includes('public-0'));
  assert.equal(introduced.profiles.filter(profile => profile.id === 'public-0').length, 1, 'Introduction response retains the unsaved old target profile');
  assert.ok(introduced.requests.some(connection => connection.profileId === 'public-0' && connection.status === 'pending'));
  saveId('public-0');
  const ownUnsave = await removeSaved('own-draft');
  assert.ok(ownUnsave.profiles.some(profile => profile.id === 'own-draft' && profile.mine), 'Unsave may retain the owner’s directly requested private draft');
  assert.ok(!(await read(viewer)).profiles.some(profile => profile.id === 'own-draft'), 'Own unsaved draft is outside the public discovery payload');
  const ownLinked = await read(viewer, 'own-draft');
  assert.equal(ownLinked.profiles.filter(profile => profile.id === 'own-draft').length, 1);
  assert.equal(ownLinked.profiles.find(profile => profile.id === 'own-draft')?.mine, true);
  saveId('own-draft');
  for (const owner of [null, 'unrelated-viewer']) {
    const hidden = await read(owner, 'own-draft');
    assert.ok(!hidden.profiles.some(profile => profile.id === 'own-draft'));
    assert.ok(!JSON.stringify(hidden).includes('Own private progress'));
  }
  for (const id of ['foreign-draft', 'public-448', 'public-447', 'deleted-profile']) {
    const hidden = await read(viewer, id);
    assert.ok(!hidden.profiles.some(profile => profile.id === id), `Direct link ${id} respects privacy and bilateral blocks`);
    assert.ok(!JSON.stringify(hidden).includes('PRIVATE_PROFILE_SENTINEL'));
    assert.ok(!JSON.stringify(hidden).includes('PRIVATE_PROGRESS_SENTINEL'));
  }
  const overlap = await read(viewer, 'public-449');
  assert.equal(overlap.profiles.filter(profile => profile.id === 'public-449').length, 1, 'Recent, saved and requested profile is returned once');
  const beforeInvalid = requestedLookups;
  for (const invalid of ['', 'x', 'x'.repeat(101)]) await read(viewer, invalid);
  assert.equal(requestedLookups, beforeInvalid, 'Only profile IDs of 2–100 characters reach direct lookup');

  sqlite.prepare('UPDATE profiles SET listed=0 WHERE id=?').run('public-0');
  const unlisted = await read(viewer);
  assert.ok(unlisted.savedIds.includes('public-0'), 'Unavailable saved IDs remain removable');
  assert.ok(!unlisted.profiles.some(profile => profile.id === 'public-0'));
  assert.ok(!JSON.stringify(unlisted).includes('Old saved progress'));
  for (const owner of [null, viewer, 'unrelated-viewer']) {
    const hidden = await read(owner, 'public-0');
    assert.ok(!hidden.profiles.some(profile => profile.id === 'public-0'), 'Direct link cannot reopen an unlisted foreign profile');
  }
  for (const id of ['public-0', 'foreign-draft', 'public-448', 'public-447', 'deleted-profile']) {
    const after = await removeSaved(id);
    assert.ok(!after.savedIds.includes(id), `Unavailable or blocked save ${id} can be removed`);
    assert.ok(!after.profiles.some(profile => profile.id === id), 'Removing an unavailable save does not grant direct profile access');
  }

  // Exercise the largest ordinary discovery/shortlist union, including private
  // own-profile progress, without exceeding D1's parameter limit.
  sqlite.prepare('DELETE FROM saves WHERE owner=?').run(viewer);
  sqlite.prepare('UPDATE profiles SET listed=1 WHERE id=?').run('public-0');
  sqlite.prepare('DELETE FROM member_blocks').run();
  for (let index = 0; index < 200; index++) saveId(`public-${index}`);
  progressBatches.length = 0;
  const full = await read(viewer);
  assert.equal(full.profiles.filter(profile => !profile.demo).length, 400);
  assert.deepEqual(progressBatches, [100, 100, 100, 100, 1]);
  assert.equal(full.myProfiles[0].updates[0].title, 'Own private progress');
  assert.ok(maxBindings <= 100);
  assert.ok(!JSON.stringify(full).includes('saved-viewer'), 'Internal account IDs stay private');
  console.log('Passed: old saved/direct-link profiles and progress; de-duplication; own drafts; private/bilateral-block isolation; bounded profile IDs; unavailable-save removal; sample compatibility; 400-profile D1 batching.');
} finally { sqlite.close(); }
