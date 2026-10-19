import type { ExportedHandler } from '@cloudflare/workers-types';

export const DISPATCH_TIMEOUT_MS = 45_000;
const MAX_RESPONSE_BYTES = 4_096;
const OUTCOMES = ['submitted', 'retrying', 'skipped', 'failed', 'expired'] as const;
const COUNTERS = ['processed', ...OUTCOMES] as const;
type DispatchSummary = { configured: true; busy: false } & Record<(typeof COUNTERS)[number], number>;
type FailureKind = 'configuration' | 'request' | 'timeout' | 'http' | 'response';

class DispatchFailure extends Error {
  constructor(readonly kind: FailureKind, readonly httpStatus?: number) {
    // This error can appear in Cloudflare's scheduled-event history. Never retain
    // upstream exception messages, request headers, URLs, or response bodies.
    super(`Notification dispatcher failed (${kind}${httpStatus ? `; HTTP ${httpStatus}` : ''}).`);
    this.name = 'DispatchFailure';
  }
}

function dispatchSettings(env: NotificationDispatcherEnv) {
  const origin = env.FIRSTSIGNAL_ORIGIN;
  const secret = env.NOTIFICATION_DISPATCH_SECRET;
  let parsed: URL;
  try { parsed = new URL(origin); } catch { throw new DispatchFailure('configuration'); }
  if (parsed.protocol !== 'https:' || parsed.origin !== origin || parsed.username || parsed.password ||
      parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.hostname.endsWith('.invalid')) {
    throw new DispatchFailure('configuration');
  }
  // A generated hexadecimal or base64url token is safe in a Bearer header.
  // Validation also rejects accidental whitespace/newline injection.
  if (typeof secret !== 'string' || !/^[A-Za-z0-9_-]{32,256}$/.test(secret)) {
    throw new DispatchFailure('configuration');
  }
  return { endpoint: `${origin}/api/internal/notifications/dispatch`, secret };
}

async function responseSummary(response: Response): Promise<DispatchSummary> {
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/json') || !response.body) {
    throw new DispatchFailure('response', response.status);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) throw new DispatchFailure('response', response.status);
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let value: Record<string, unknown>;
  try { value = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new DispatchFailure('response', response.status); }
  if (!value || typeof value !== 'object' || value.configured !== true || value.busy !== false ||
      COUNTERS.some(key => !Number.isSafeInteger(value[key]) || (value[key] as number) < 0) ||
      // limit=3 bounds owners, not notices: up to three notices per owner.
      (value.processed as number) > 9 ||
      OUTCOMES.some(key => (value[key] as number) > (value.processed as number)) ||
      OUTCOMES.reduce((total, key) => total + (value[key] as number), 0) > (value.processed as number)) {
    throw new DispatchFailure('response', response.status);
  }
  // Explicit projection: extra upstream fields can never be logged.
  return {
    configured: true, busy: false,
    processed: value.processed as number, submitted: value.submitted as number,
    retrying: value.retrying as number, skipped: value.skipped as number,
    failed: value.failed as number, expired: value.expired as number,
  };
}

export async function dispatch(env: NotificationDispatcherEnv): Promise<void> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const { endpoint, secret } = dispatchSettings(env);
    const deadline = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new DispatchFailure('timeout'));
      }, DISPATCH_TIMEOUT_MS);
    });
    // One bounded application request per invocation. The application owns the
    // durable global job lease and per-email claims; no isolate-local fake lock.
    const operation = async () => {
      const response = await fetch(endpoint, {
        method: 'POST', redirect: 'manual', signal: controller.signal,
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ limit: 3 }),
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        throw new DispatchFailure('http', response.status);
      }
      return { summary: await responseSummary(response), httpStatus: response.status };
    };
    const { summary, httpStatus } = await Promise.race([operation(), deadline]);
    console.log(JSON.stringify({ event: 'notification_dispatch', outcome: 'complete', httpStatus, ...summary }));
  } catch (cause) {
    const failure = cause instanceof DispatchFailure ? cause : new DispatchFailure(controller.signal.aborted ? 'timeout' : 'request');
    console.error(JSON.stringify({ event: 'notification_dispatch', outcome: 'failed', reason: failure.kind, ...(failure.httpStatus ? { httpStatus: failure.httpStatus } : {}) }));
    // A rejected waitUntil promise records a failed Cron invocation. An operator
    // still needs to configure their alert destination; this does not send one.
    throw failure;
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

export default {
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(dispatch(env));
  },
} satisfies ExportedHandler<NotificationDispatcherEnv>;
