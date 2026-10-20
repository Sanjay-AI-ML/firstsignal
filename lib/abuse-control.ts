/**
 * Database-backed atomic quota enforcement across all Cloudflare Worker instances.
 * Prevents race conditions and bypasses caused by isolate recycling or multi-region routing.
 */

type DBLike = Pick<D1Database, 'prepare'>;

export async function consumeAtomicDailyQuota(
  db: DBLike,
  owner: string,
  quotaKey: string,
  maxDaily: number,
  nowIso = new Date().toISOString()
): Promise<{ allowed: boolean; remaining: number }> {
  if (!Number.isSafeInteger(maxDaily) || maxDaily < 1 || !/^\d{4}-\d{2}-\d{2}T/.test(nowIso)) throw new Error('Invalid quota configuration');
  const dateBucket = nowIso.slice(0, 10);

  const result = await db
    .prepare(
      `INSERT INTO daily_quotas (owner, quota_key, date_bucket, count)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(owner, quota_key, date_bucket)
       DO UPDATE SET count = count + 1
       WHERE count < ? RETURNING count`
    )
    .bind(owner, quotaKey, dateBucket, maxDaily)
    .first<{count:number}>();

  const allowed = result !== null;
  return { allowed, remaining: result ? Math.max(0,maxDaily-result.count) : 0 };
}
