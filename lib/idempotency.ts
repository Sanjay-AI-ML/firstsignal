/** Compact operation receipts commit with their resource, never a stale private workspace. */
type DBLike = Pick<D1Database, 'prepare'>;
export type Operation = { key: string; owner: string; id: string; action: string; hash: string; token: string; created: string };
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([key]) => key !== 'operationId').sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export async function operationFingerprint(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function makeOperation(owner: string, id: string | undefined, action: string, payload: unknown, created: string): Promise<Operation | null> {
  return id ? { key: `${owner}:${id}`, owner, id, action, hash: await operationFingerprint(payload), token: crypto.randomUUID(), created } : null;
}
export async function readOperation(db: DBLike, operation: Operation | null) {
  if (!operation) return { kind: 'new' as const };
  const row = await db.prepare('SELECT action,payload_hash,response FROM idempotency_keys WHERE id=? AND owner=?').bind(operation.key, operation.owner).first<{ action: string; payload_hash: string; response: string }>();
  if (!row) return { kind: 'new' as const };
  if (row.action !== operation.action || row.payload_hash !== operation.hash) return { kind: 'conflict' as const };
  return { kind: 'replay' as const, response: JSON.parse(row.response) as Record<string, unknown> };
}
export function operationClaim(db: DBLike, operation: Operation | null, response: Record<string, unknown>) {
  return operation ? [db.prepare('INSERT INTO idempotency_keys(id,owner,operation_id,action,resource_id,response,created,payload_hash) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(operation.key, operation.owner, operation.id, operation.action, operation.token, JSON.stringify(response), operation.created, operation.hash)] : [];
}
export function operationGuard(operation: Operation | null) {
  return operation ? { sql: 'EXISTS(SELECT 1 FROM idempotency_keys WHERE id=? AND resource_id=?)', values: [operation.key, operation.token] } : { sql: '1=1', values: [] as string[] };
}
/** Remove a failed claim within the same transaction, before any retry can observe it. */
export function operationCleanup(db: DBLike, operation: Operation | null, successSql: string, values: unknown[]) {
  return operation ? [db.prepare(`DELETE FROM idempotency_keys WHERE id=? AND resource_id=? AND NOT EXISTS(${successSql})`).bind(operation.key, operation.token, ...values)] : [];
}
// Kept for the separate versioned proposal route.
export async function getExistingIdempotencyResponse<T = unknown>(db: DBLike, owner: string, operationId?: string): Promise<T | null> {
  if (!operationId) return null;
  const row = await db.prepare('SELECT response FROM idempotency_keys WHERE id=? AND owner=?').bind(`${owner}:${operationId}`, owner).first<{ response: string }>();
  return row ? JSON.parse(row.response) as T : null;
}
export function saveIdempotencyStatement(db: DBLike, owner: string, operationId: string, action: string, resourceId: string, response: unknown, created: string, payloadHash = '') {
  return db.prepare('INSERT INTO idempotency_keys(id,owner,operation_id,action,resource_id,response,created,payload_hash) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(`${owner}:${operationId}`, owner, operationId, action, resourceId, JSON.stringify(response), created, payloadHash);
}
