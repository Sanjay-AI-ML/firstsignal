/** Owner-only content snapshots; listing and moderation are deliberately not restored. */
type DBLike = Pick<D1Database, 'prepare'>;
export function computeChangeSummary(oldData: Record<string, unknown>, newData: Record<string, unknown>): string {
  const keys = ['name','tagline','sector','customSector','stage','problem','solution','experience','validation','uncertainty','nextMilestone','fundingIntentINR','budget','productStatus','revenueStatus','incorporationStatus'];
  const changed = keys.filter(key => JSON.stringify(oldData[key]) !== JSON.stringify(newData[key]));
  return changed.length ? `Updated ${changed.join(', ')}`.slice(0, 200) : 'Updated profile details or visibility';
}
export function ideaRevisionStatement(db: DBLike, profileId: string, version: number, data: string, listed: number, summary: string, author: string, created: string, event: string) {
  return db.prepare(`INSERT INTO idea_revisions(id,profile_id,version,data,listed,change_summary,created,author) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM profile_versions v INNER JOIN profiles p ON p.id=v.profile_id WHERE v.profile_id=? AND p.owner=? AND v.last_operation=?) ON CONFLICT(profile_id,version) DO NOTHING`).bind(crypto.randomUUID(), profileId, version, data, listed, summary, created, author, profileId, author, event);
}
export function pruneIdeaRevisionsStatement(db: DBLike, profileId: string) {
  return db.prepare('DELETE FROM idea_revisions WHERE profile_id=? AND id NOT IN (SELECT id FROM idea_revisions WHERE profile_id=? ORDER BY version DESC LIMIT 50)').bind(profileId, profileId);
}
export async function listIdeaRevisions(db: DBLike, profileId: string, owner: string) {
  const rows = await db.prepare(`SELECT r.id,r.version,r.data,r.listed,r.change_summary AS changeSummary,r.created FROM idea_revisions r INNER JOIN profiles p ON p.id=r.profile_id WHERE r.profile_id=? AND p.owner=? AND p.kind='startup' ORDER BY r.version DESC LIMIT 50`).bind(profileId, owner).all<{ id: string; version: number; data: string; listed: number; changeSummary: string; created: string }>();
  return rows.results.map(row => ({ ...row, data: JSON.parse(row.data), listed: !!row.listed }));
}
export async function getRevisionToRestore(db: DBLike, profileId: string, revisionId: string, owner: string) {
  return db.prepare(`SELECT r.data,r.version FROM idea_revisions r INNER JOIN profiles p ON p.id=r.profile_id WHERE r.id=? AND r.profile_id=? AND p.owner=? AND p.kind='startup'`).bind(revisionId, profileId, owner).first<{ data: string; version: number }>();
}
