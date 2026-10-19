/** Best-effort fixed-window throttling in one Worker isolate. State can reset
 * when an isolate restarts and is not shared across locations or instances.
 * This is not a distributed abuse-prevention or denial-of-service boundary.
 */
export type RateLimitResult = { success: boolean; limit: number; remaining: number; resetSeconds: number };
type WindowRecord = { count: number; resetAt: number };

export function createFixedWindowThrottle(maximumKeys = 2048, clock: () => number = Date.now) {
  const records = new Map<string, WindowRecord>();
  const capacity = Math.max(1, Math.floor(maximumKeys));
  return {
    get size() { return records.size; },
    check(identifier: string, limit = 120, windowMs = 60_000): RateLimitResult {
      const now = clock();
      let record = records.get(identifier);
      if (!record || now >= record.resetAt) {
        if (!record && records.size >= capacity) {
          for (const [key, value] of records) if (now >= value.resetAt) records.delete(key);
          // Eviction bounds memory, so this remains a best-effort throttle.
          if (records.size >= capacity) {
            const oldest = records.keys().next().value;
            if (oldest !== undefined) records.delete(oldest);
          }
        }
        record = { count: 0, resetAt: now + windowMs };
        records.set(identifier, record);
      }
      record.count = Math.min(record.count + 1, limit + 1);
      return { success: record.count <= limit, limit, remaining: Math.max(0, limit - record.count), resetSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)) };
    },
  };
}

const isolateThrottle = createFixedWindowThrottle();
export const checkRateLimit = (identifier: string, limit = 120, windowMs = 60_000) => isolateThrottle.check(identifier, limit, windowMs);

// Cloudflare supplies this header at its edge. Ignore forwarded-for chains;
// local requests without an edge address share an anonymous bucket.
export function anonymousThrottleKey(request?: Request) {
  const address = request?.headers.get('cf-connecting-ip')?.trim() ?? '';
  return address.length <= 64 && /^[0-9a-f:.]+$/i.test(address) ? address : 'anonymous';
}
