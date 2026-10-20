/** Bounded diagnostics. Private content, credentials and SQL errors are omitted. */
export function getRequestId(request?: Request): string {
  void request;
  // A server-generated identifier cannot be forged or reused through an input header.
  return crypto.randomUUID();
}
const getNow = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
export function createTimingTracker() {
  const start = getNow(), marks: { name: string; dur: number; desc?: string }[] = [];
  const duration = () => Math.max(0, Math.round((getNow() - start) * 10) / 10);
  return {
    mark(name: string, desc?: string) {
      if (marks.length >= 20 || !/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(name)) return;
      marks.push({ name, dur: duration(), desc: desc && /^[A-Za-z0-9 _-]{1,60}$/.test(desc) ? desc : undefined });
    },
    header() {
      return [...marks.map(mark => `${mark.name};dur=${mark.dur}${mark.desc ? `;desc="${mark.desc}"` : ''}`), `total;dur=${duration()}`].join(', ');
    },
  };
}
const contexts: Record<string, string> = {
  'Workspace read failed': 'workspace_read_failed',
  'Workspace write failed': 'workspace_write_failed',
  'Authentication service unavailable': 'authentication_unavailable',
};
export function logSafeError(context: string, error: unknown, meta?: { requestId?: string; path?: string; userId?: string }) {
  // Error messages/stacks can contain bound SQL, provider tokens or member input.
  // Do not pseudonymize account IDs with an unsalted reversible hash.
  const errorName = error instanceof Error && ['Error', 'TypeError', 'RangeError', 'SyntaxError', 'AbortError', 'TimeoutError'].includes(error.name) ? error.name : 'UnknownError';
  const requestId = meta?.requestId && /^[A-Za-z0-9_-]{8,64}$/.test(meta.requestId) ? meta.requestId : 'unknown';
  console.error('[MONITORING_ERROR]', JSON.stringify({ context: Object.hasOwn(contexts, context) ? contexts[context] : 'application_request_failed', requestId, errorName }));
}
interface DBLike {
  prepare(sql: string): { first(): Promise<{ oldest: string | null; count: number } | null> };
}
export type QueueHealth = {
  status: 'ok' | 'delayed' | 'unavailable'; queueAgeSeconds: number | null;
  pendingCount: number | null; alert: boolean | null;
};
export async function checkOutboxQueueHealth(db: DBLike): Promise<QueueHealth> {
  const unavailable: QueueHealth = { status: 'unavailable', queueAgeSeconds: null, pendingCount: null, alert: null };
  try {
    const row = await db.prepare("SELECT MIN(created) AS oldest, COUNT(*) AS count FROM notification_emails WHERE state IN ('pending','retry','sending')").first();
    if (!row || !Number.isSafeInteger(row.count) || row.count < 0) return unavailable;
    if (row.count === 0) return { status: 'ok', queueAgeSeconds: 0, pendingCount: 0, alert: false };
    const oldest = row.oldest ? new Date(row.oldest).getTime() : NaN;
    if (!Number.isFinite(oldest)) return unavailable;
    const queueAgeSeconds = Math.max(0, Math.floor((Date.now() - oldest) / 1000)), alert = queueAgeSeconds > 900;
    // This is a local log event only. No external alert destination is configured here.
    if (alert) console.warn('[MONITORING_QUEUE_DELAY]', JSON.stringify({ queueAgeSeconds, pendingCount: row.count }));
    return { status: alert ? 'delayed' : 'ok', queueAgeSeconds, pendingCount: row.count, alert };
  } catch { return unavailable; }
}
