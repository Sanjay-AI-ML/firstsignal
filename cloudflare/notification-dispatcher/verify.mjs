import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

// Pure handler/HTTP-boundary tests. fetch is always a local stub; no provider,
// application, or Cloudflare API requests are made by this verification script.
const source = await fs.readFile(new URL('./src/index.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const token = 'test_only_dispatch_secret_0123456789abcdef';
const env = { FIRSTSIGNAL_ORIGIN: 'https://findin.test', NOTIFICATION_DISPATCH_SECRET: token };
const summary = { configured: true, busy: false, processed: 9, submitted: 5, retrying: 1, skipped: 1, failed: 0, expired: 2 };
let checks = 0;
const check = (value, expected, message) => { assert.deepEqual(value, expected, message); checks++; };
const rejects = async (promise, pattern) => { await assert.rejects(promise, pattern); checks++; };

function harness(reply = () => Response.json(summary)) {
  const calls = [], logs = [], errors = [], timers = [], pending = [];
  const moduleHolder = { exports: {} };
  const context = vm.createContext({
    module: moduleHolder, exports: moduleHolder.exports, URL, TextDecoder, Uint8Array, AbortController,
    fetch: async (...args) => { calls.push(args); return reply(...args); },
    console: { log: value => logs.push(JSON.parse(value)), error: value => errors.push(JSON.parse(value)) },
    setTimeout: (callback, delay) => { const timer = { callback, delay, cleared: false }; timers.push(timer); return timer; },
    clearTimeout: timer => { timer.cleared = true; },
  });
  vm.runInContext(compiled, context, { filename: 'notification-dispatcher.ts' });
  const ctx = { waitUntil(promise) { pending.push(promise); promise.catch(() => {}); } };
  const tick = (settings = env) => { moduleHolder.exports.default.scheduled({ cron: '*/5 * * * *', scheduledTime: 0 }, settings, ctx); return pending.at(-1); };
  return { api: moduleHolder.exports, calls, logs, errors, timers, pending, tick };
}

const successful = harness();
const task = successful.tick();
check(successful.pending.length, 1, 'scheduled work is attached to waitUntil');
await task;
check(successful.calls.length, 1);
check(successful.calls[0][0], 'https://findin.test/api/internal/notifications/dispatch');
const options = successful.calls[0][1];
check(options.method, 'POST');
check(options.redirect, 'manual', 'credentials cannot follow a redirect');
check(options.headers.Authorization, `Bearer ${token}`);
check(options.headers['Content-Type'], 'application/json');
check(JSON.parse(options.body), { limit: 3 });
check(options.signal.aborted, false);
check(successful.timers[0].delay, 45_000);
check(successful.timers[0].cleared, true);
check(successful.errors, []);
check(successful.logs, [{ event: 'notification_dispatch', outcome: 'complete', httpStatus: 200, ...summary }]);
check(Object.keys(successful.api.default), ['scheduled'], 'there is no public HTTP trigger');

for (const origin of [undefined, '', 'http://findin.test', ' https://findin.test', 'https://findin.test ', 'https://findin.test/', 'https://findin.test/path', 'https://findin.test/?x=1', 'https://findin.test?x=1', 'https://findin.test#fragment', 'https://user:password@findin.test', 'https://findin.test:443', 'https://FINDIN.test', 'https://findin.test/../', 'https://findin.example.invalid', '//findin.test', 'https:\\findin.test', `https://findin.test\n`]) {
  const h = harness();
  await rejects(h.tick({ ...env, FIRSTSIGNAL_ORIGIN: origin }), /failed \(configuration\)/);
  check(h.calls.length, 0, 'bad origin must fail before sending its credential');
  check(h.timers.length, 0);
  check(h.errors, [{ event: 'notification_dispatch', outcome: 'failed', reason: 'configuration' }]);
}
for (const secret of [undefined, null, '', 'short', 'a'.repeat(31), 'a'.repeat(257), 'a'.repeat(513), 'a'.repeat(32) + '\r\nx-injected: true', 'a'.repeat(32) + ' ', 'a'.repeat(32) + '/']) {
  const h = harness();
  await rejects(h.tick({ ...env, NOTIFICATION_DISPATCH_SECRET: secret }), /failed \(configuration\)/);
  check(h.calls.length, 0);
  check(h.errors, [{ event: 'notification_dispatch', outcome: 'failed', reason: 'configuration' }], 'logs contain no rejected credential');
}

for (const length of [32, 256]) {
  const boundary = harness();
  await boundary.tick({ ...env, NOTIFICATION_DISPATCH_SECRET: 'a'.repeat(length) });
  check(boundary.calls.length, 1, 'the dispatcher accepts the application secret boundaries');
}

for (const status of [301, 302, 303, 307, 308, 400, 401, 403, 404, 409, 429, 500, 503]) {
  const h = harness(() => new Response(`upstream body must stay private: ${token}`, { status, headers: { Location: 'https://attacker.test/steal' } }));
  await rejects(h.tick(), new RegExp(`HTTP ${status}`));
  check(h.calls.length, 1, 'non-2xx and busy responses do not cause an immediate retry');
  check(h.errors, [{ event: 'notification_dispatch', outcome: 'failed', reason: 'http', httpStatus: status }]);
  check(h.logs, []);
  check(h.timers[0].cleared, true);
}

const down = harness(() => { throw new Error(`private request error ${token} https://user:password@private.test`); });
await rejects(down.tick(), /^DispatchFailure: Notification dispatcher failed \(request\)\.$/);
check(down.errors, [{ event: 'notification_dispatch', outcome: 'failed', reason: 'request' }]);
check(down.calls.length, 1);

const timedOut = harness(() => new Promise(() => {}));
const timeoutTask = timedOut.tick();
check(timedOut.calls.length, 1);
timedOut.timers[0].callback();
await rejects(timeoutTask, /failed \(timeout\)/);
check(timedOut.calls[0][1].signal.aborted, true);
check(timedOut.timers[0].cleared, true);
check(timedOut.logs, []);
check(timedOut.errors, [{ event: 'notification_dispatch', outcome: 'failed', reason: 'timeout' }]);

const streamTimeout = harness((_url, options) => new Response(new ReadableStream({
  start(controller) { options.signal.addEventListener('abort', () => controller.error(new Error('aborted')), { once: true }); },
}), { headers: { 'Content-Type': 'application/json' } }));
const streamTask = streamTimeout.tick();
await Promise.resolve();
streamTimeout.timers[0].callback();
await rejects(streamTask, /failed \(timeout\)/);
check(streamTimeout.logs, [], 'a response that stalls after its headers is also bounded');

for (const body of [null, [], {}, { ...summary, configured: false }, { ...summary, busy: true }, { ...summary, processed: 10 }, { ...summary, processed: 3 }, { ...summary, submitted: 10 }, { ...summary, submitted: 6 }, { ...summary, submitted: -1 }, { ...summary, retrying: 0.5 }, { ...summary, failed: '0' }, { ...summary, expired: Number.MAX_SAFE_INTEGER + 1 }]) {
  const h = harness(() => Response.json(body));
  await rejects(h.tick(), /failed \(response; HTTP 200\)/);
  check(h.calls.length, 1);
  check(h.logs, []);
}
for (const [body, type] of [['<html>Sign in first</html>', 'text/html'], ['not json', 'application/json'], ['{"configured":', 'application/json'], ['x'.repeat(4097), 'application/json']]) {
  const h = harness(() => new Response(body, { headers: { 'Content-Type': type } }));
  await rejects(h.tick(), /failed \(response; HTTP 200\)/);
  check(h.logs, []);
}
const extra = harness(() => Response.json({ ...summary, email: 'private@example.test', token, message: 'private terms' }));
await extra.tick();
check(extra.logs, successful.logs, 'only the explicit aggregate projection is logged');
check(JSON.stringify(extra.logs).includes(token), false);
const empty = harness(() => Response.json({ configured: true, busy: false, processed: 0, submitted: 0, retrying: 0, skipped: 0, failed: 0, expired: 0 }));
await empty.tick();
check(empty.logs[0].processed, 0, 'an empty outbox is a valid completed invocation');
check(empty.errors, []);

const recovering = harness(() => recovering.calls.length === 1 ? new Response('Busy', { status: 409 }) : Response.json(summary));
await rejects(recovering.tick(), /HTTP 409/);
await recovering.tick();
check(recovering.calls.length, 2, 'a later tick can run after a failed/busy tick');
check(recovering.logs.length, 1);

const configText = await fs.readFile(new URL('./wrangler.jsonc', import.meta.url), 'utf8');
const parsed = ts.parseConfigFileTextToJson('wrangler.jsonc', configText);
assert.equal(parsed.error, undefined); checks++;
check(parsed.config.triggers.crons, ['*/5 * * * *']);
check(parsed.config.workers_dev, false);
check(parsed.config.preview_urls, false);
check(parsed.config.secrets.required, ['NOTIFICATION_DISPATCH_SECRET']);
check(Object.keys(parsed.config.vars), ['FIRSTSIGNAL_ORIGIN']);
check(parsed.config.observability.logs.enabled, true);
check(parsed.config.observability.traces.enabled, true);
check(parsed.config.compatibility_date, '2026-10-19');

console.log(`Notification dispatcher: ${checks} checks passed (local mocked HTTP; no network calls).`);
