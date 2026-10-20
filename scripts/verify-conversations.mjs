import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { AsyncLocalStorage } from 'node:async_hooks';
import { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';
import { build, transform } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Actual route handlers + SQLite migrations and React SSR. Synthetic identities;
// no browser, Clerk, provider calls, product messages, or production writes.
let checks = 0, calls = 0, failStorage = false;
const eq = (actual, expected, label) => { assert.equal(actual, expected, label); checks++; };
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const sql = new DatabaseSync(':memory:');
sql.exec('PRAGMA foreign_keys=ON');
for (const file of (await fs.readdir('drizzle')).filter(name => name.endsWith('.sql')).sort()) sql.exec(await fs.readFile(`drizzle/${file}`, 'utf8'));
const db = { prepare(query) { calls++; if (failStorage) throw new Error('Synthetic database fault'); let args = []; const s = { bind(...values) { ok(values.length <= 100, 'D1 parameter bound'); args = values; return s; }, async all() { return { results: sql.prepare(query).all(...args) }; }, async first() { return sql.prepare(query).get(...args) ?? null; }, async run() { return { meta: { changes: sql.prepare(query).run(...args).changes } }; } }; return s; } };
const auth = new AsyncLocalStorage();
const modules = { '@/app/auth': { getAppUser: async () => auth.getStore() }, '@/lib/database': { database: () => db } };
async function load(file, extra = {}) {
  const compiled = await transform(await fs.readFile(file, 'utf8'), { loader: 'ts', format: 'cjs' });
  const scope = { module: { exports: {} }, exports: {}, require: id => { const value = { ...modules, ...extra }[id]; assert.ok(value, `Unexpected module ${id}`); return value; }, Request, Response, Headers, URL, crypto, performance, TextDecoder, TextEncoder, Uint8Array, Date, console: { error() {} } };
  vm.runInNewContext(compiled.code, scope); return scope.module.exports;
}
const helpers = await load('lib/conversation-messages.ts');
modules['@/lib/conversation-messages'] = helpers;
modules['@/lib/monitoring'] = await load('lib/monitoring.ts');
modules['@/lib/streaming-request'] = await load('lib/streaming-request.ts');
const messages = await load('app/api/conversations/[id]/messages/route.ts');
const read = await load('app/api/conversations/[id]/read/route.ts');
const A = { userId: 'clerk:Alpha' }, B = { userId: 'clerk:Beta' }, outsider = { userId: 'clerk:Stranger' }, origin = 'https://findin.example';
const time = '2026-10-20T10:00:00.000Z';
sql.prepare('INSERT INTO profiles(id,owner,kind,data,listed,updated) VALUES(?,?,?,?,?,?)').run('idea', B.userId, 'startup', '{}', 1, time);
function intro(id, sender = A.userId, recipient = B.userId, status = 'accepted') { sql.prepare('INSERT INTO introductions(id,sender,recipient,profile_id,target_name,sender_name,message,status,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id, sender, recipient, `${id}-profile`, 'Member B', 'Member A', 'Private request', status, time, time); }
function note(id, conversation = 'thread', sender = B.userId, created = time, body = 'PRIVATE_BODY') { sql.prepare('INSERT INTO messages(id,introduction_id,sender,sender_name,body,created) VALUES(?,?,?,?,?,?)').run(id, conversation, sender, '<Private member>', body, created); }
intro('thread'); intro('empty'); intro('other'); intro('draft', A.userId, null, 'draft');
for (let n = 0; n < 127; n++) note(`m${String(n).padStart(3, '0')}`, 'thread', n % 7 === 0 ? A.userId : B.userId);
note('foreign', 'other'); note('draft-note', 'draft', A.userId);
async function get(user = A, query = '', id = 'thread', expected = 200) { const response = await auth.run(user, () => messages.GET(new Request(`${origin}/api/conversations/${id}/messages${query}`), { params: Promise.resolve({ id }) })); eq(response.status, expected); eq(response.headers.get('cache-control'), 'no-store'); ok(response.headers.get('x-request-id')); return response.json(); }
async function acknowledge(user = A, messageId = 'm100', id = 'thread', expected = 200, overrides = {}) { const response = await auth.run(user, () => read.POST(new Request(`${origin}/api/conversations/${id}/read`, { method: 'POST', headers: { origin, 'content-type': 'application/json', ...overrides.headers }, body: overrides.body ?? JSON.stringify({ messageId }) }), { params: Promise.resolve({ id }) })); eq(response.status, expected); eq(response.headers.get('cache-control'), 'no-store'); return response.json(); }
const before = calls;
await get(null, '', 'thread', 401); await acknowledge(null, 'm100', 'thread', 401); eq(calls, before, 'No unauthenticated storage');
await get(outsider, '', 'thread', 404); await acknowledge(outsider, 'm100', 'thread', 404);
await acknowledge(A, 'foreign', 'thread', 404); await acknowledge(A, 'not-found', 'thread', 404);
for (const query of ['?limit=0', '?limit=51', '?limit=NaN', '?limit=2.5', '?cursor=', '?cursor=%5B%22invalid%22%2C%22m001%22%5D', '?cursor='+encodeURIComponent(JSON.stringify(['2026-02-30T10:00:00.000Z', 'm001']))]) await get(A, query, 'thread', 400);
for (const bad of ['../private', 'a'.repeat(101), '<x>']) { await get(A, '', bad, 400); await acknowledge(A, 'm001', bad, 400); }
await acknowledge(A, '', 'thread', 400); await acknowledge(A, 'm001', 'thread', 400, { body: '{' });
await acknowledge(A, 'm001', 'thread', 413, { body: JSON.stringify({ messageId: 'm001', padding: 'x'.repeat(1024) }) });
await acknowledge(A, 'm001', 'thread', 403, { headers: { origin: 'https://other.example' } });
await acknowledge(A, 'm001', 'thread', 403, { headers: { origin: '' } });

let page = await get(); eq(page.messages.length, 30); eq(page.messages[0].id, 'm097'); eq(page.messages.at(-1).id, 'm126'); eq(page.hasMore, true);
eq(sql.prepare('SELECT COUNT(*) n FROM conversation_read_positions').get().n, 0, 'GET and prefetch never mark read');
const ids = [], cursors = new Set();
while (true) { ids.push(...page.messages.map(m => m.id)); ok(page.messages.every((m, i, arr) => i === 0 || arr[i - 1].id < m.id), 'Every tied page chronological and stable'); ok(page.messages.every(m => !('sender' in m) && !('introduction_id' in m)), 'No account identifiers in projection'); if (!page.hasMore) { eq(page.nextCursor, null); break; } ok(!cursors.has(page.nextCursor)); cursors.add(page.nextCursor); page = await get(A, '?cursor='+encodeURIComponent(page.nextCursor)); }
eq(ids.length, 127, 'All history beyond old 100-message cap reachable'); eq(new Set(ids).size, 127, 'No timestamp-tie duplicate or skipped history');
same([...ids].sort(), Array.from({ length: 127 }, (_, n) => `m${String(n).padStart(3, '0')}`));
page = await get(A, '?limit=50'); eq(page.messages.length, 50);
page = await get(A, '', 'empty'); eq(page.messages.length, 0); eq(page.hasMore, false); eq(page.nextCursor, null);
await get(A, '', 'draft'); await get(B, '', 'draft', 404);
sql.prepare('INSERT INTO member_blocks(owner,target_owner,profile_id,target_name,created) VALUES(?,?,?,?,?)').run(B.userId, A.userId, 'idea', 'Member', time);
eq((await get()).messages.length, 30, 'Bilateral block retains participant history');

let result = await acknowledge(A, 'm100'); eq(result.lastReadMessageId, 'm100');
const unreadAfter = sql.prepare('SELECT COUNT(*) n FROM messages WHERE introduction_id=? AND sender<>? AND id>?').get('thread', A.userId, 'm100').n;
eq(result.unreadCount, unreadAfter, 'Unread excludes own messages with tied timestamps');
eq(sql.prepare('SELECT last_read_at FROM conversation_read_positions WHERE user_id=?').get(A.userId).last_read_at, time, 'Position stores message order, not acknowledgement wall-clock');
result = await acknowledge(A, 'm050'); eq(result.lastReadMessageId, 'm100', 'Older tab cannot regress position'); eq(result.unreadCount, unreadAfter);
result = await acknowledge(A, 'm100'); eq(result.unreadCount, unreadAfter, 'Duplicate acknowledgement is safe');
note('m127'); result = await acknowledge(A, 'm126'); eq(result.unreadCount, 1, 'Message arriving beyond displayed ID stays unread');
result = await acknowledge(B, 'm050'); eq(result.lastReadMessageId, 'm050', 'Independent participant read position');
result = await acknowledge(A, 'm126'); eq(result.lastReadMessageId, 'm126'); eq(result.unreadCount, 1);
note('new-time', 'thread', B.userId, '2026-10-20T11:00:00.000Z'); result = await acknowledge(A, 'm127'); eq(result.unreadCount, 1, 'Newer timestamp remains unread');
result = await acknowledge(A, 'new-time'); eq(result.unreadCount, 0); result = await acknowledge(A, 'm127'); eq(result.lastReadMessageId, 'new-time');
await Promise.all([acknowledge(A, 'm050'), acknowledge(A, 'new-time'), acknowledge(A, 'm100')]);
eq(sql.prepare('SELECT last_read_message_id FROM conversation_read_positions WHERE user_id=?').get(A.userId).last_read_message_id, 'new-time', 'Overlapping stale acknowledgements retain the highest position');
sql.prepare('INSERT INTO account_closures(owner,status,requested_at,retention_until,reason,updated) VALUES(?,?,?,?,?,?)').run(A.userId,'requested',time,'2026-11-19T10:00:00.000Z','Synthetic closure',time);
eq((await get()).messages.length,30,'Requested closure retains read-only participant history');
result=await acknowledge(A,'new-time');eq(result.lastReadMessageId,'new-time','Private read tracking remains available during closure');
sql.prepare('DELETE FROM account_closures WHERE owner=?').run(A.userId);
sql.prepare('UPDATE conversation_read_positions SET last_read_message_id=?,last_read_at=? WHERE user_id=?').run('deleted-legacy-message', '2099-01-01T00:00:00.000Z', A.userId);
result = await acknowledge(A, 'm100'); eq(result.lastReadMessageId, 'm100', 'Missing legacy reference recovers without wall-clock false-read');
failStorage = true; await get(A, '', 'thread', 500); await acknowledge(A, 'm100', 'thread', 500); failStorage = false;

for (const value of ['x', '[]', '[1,2]', JSON.stringify([time, '../x']), JSON.stringify([time, 'x', 'extra'])]) eq(helpers.decodeMessageCursor(value), null);
const make = (id, mine = false, body = '<script>alert(1)</script>') => ({ id, created: time, senderName: '<member>', mine, body });
const merged = helpers.mergeConversationMessages([make('Z'), make('a')], [make('0'), make('Z', true), make('_')]);
same(Array.from(merged.map(m => m.id)), ['0', 'Z', '_', 'a'], 'UI uses SQLite binary tie order, not locale collation'); eq(merged.find(m => m.id === 'Z').mine, true);
ok(helpers.validMessagePage({ conversationId: 'thread', messages: [make('m1')], nextCursor: null, hasMore: false }, 'thread'));
for (const invalid of [null, {}, { conversationId: 'wrong', messages: [], nextCursor: null, hasMore: false }, { conversationId: 'thread', messages: [], nextCursor: null, hasMore: true }, { conversationId: 'thread', messages: Array.from({ length: 51 }, () => make('m1')), nextCursor: null, hasMore: false }]) eq(helpers.validMessagePage(invalid, 'thread'), false);
const require = createRequire(import.meta.url);
const compiled = await build({ entryPoints: ['components/conversation-messages.tsx'], bundle: true, packages: 'external', platform: 'node', format: 'cjs', write: false, logLevel: 'silent', jsx: 'automatic' });
const scope = { module: { exports: {} }, exports: {}, require, console };
vm.runInNewContext(compiled.outputFiles[0].text, scope);
const initial = renderToStaticMarkup(React.createElement(scope.module.exports.default, { conversationId: 'thread', blocked: true }));
ok(initial.includes('Loading this conversation')); ok(initial.includes('Previous messages remain available')); ok(initial.includes('aria-busy="true"')); ok(!initial.includes('PRIVATE_BODY'), 'No conversation bundled into initial render');
const history = renderToStaticMarkup(React.createElement(scope.module.exports.ConversationMessageHistory, { messages: [make('first'), make('second', true, 'Sent message')] }));
ok(history.includes('role="region"') && history.includes('tabindex="0"'), 'Overflow history keyboard focusable and named'); ok(history.includes('Message history')); ok(history.includes('&lt;script&gt;')); ok(!history.includes('<script>')); ok(history.includes('message mine')); ok(history.toLowerCase().includes('datetime="'+time.toLowerCase()+'"'));
const empty = renderToStaticMarkup(React.createElement(scope.module.exports.ConversationMessageHistory, { messages: [] })); ok(empty.includes('No messages yet'));
const component = await fs.readFile('components/conversation-messages.tsx', 'utf8');
ok(component.includes('key={props.conversationId}'), 'Identity change remounts history'); ok(component.includes('request.current?.abort()') && component.includes('token !== sequence.current'), 'Stale selected-thread response ignored'); ok(component.includes('messageId: newest.id'), 'Acknowledgement targets displayed ID, never inferred latest from server'); ok(component.includes('aria-disabled={saving || loading}'), 'Busy acknowledgement retains keyboard focus');
console.log(`Conversation SQLite/routes, paging/read-order and React SSR checks passed: ${checks}. No browser or provider test claimed.`);
