import { env } from 'cloudflare:workers';
import { database } from './database';
import { isAdminConfigured } from './admin-access';
import { adminPageSize, reportStatuses, type AdminAction, type AdminAudit, type AdminOverview, type AdminPage, type AdminProfile, type AdminProfileDetail, type AdminProfileFilters, type AdminReport, type ReportStatus } from './admin-types';

type Count = { n: number };
type PublicRow = Omit<AdminProfile, 'ownerListed' | 'hidden' | 'moderationReason' | 'moderationUpdated'> & { owner_listed: number; hidden: number; moderation_reason: string | null; moderation_updated: string | null };
type ReportRow = { id: string; profile_id: string; reason: string; details: string; status: ReportStatus; created: string; updated: string; version: number; operator_note: string; target_id: string | null; target_name: string | null; target_kind: 'startup' | 'investor' | null; target_hidden: number };
export class AdminConflict extends Error {
  constructor(message: string, public status: 404 | 409) { super(message); }
}
const pageResult = <T>(items: T[], page: number, total: number): AdminPage<T> => ({ items, page, pageSize: adminPageSize, total, pages: Math.max(1, Math.ceil(total / adminPageSize)) });
const like = (query: string) => `%${query.replace(/[\\%_]/g, '\\$&')}%`;
// CASE protects both malformed legacy JSON and private owner-unlisted fields.
// Only text from named public fields can enter an operator response or search.
const listedText = (key: string) => `CASE WHEN p.listed=1 AND json_valid(p.data) THEN CASE WHEN json_type(p.data,'$.${key}')='text' THEN json_extract(p.data,'$.${key}') ELSE '' END ELSE '' END`;
const profileColumns = `p.id,p.kind,CASE WHEN p.listed=1 THEN substr(${listedText('name')},1,120) ELSE 'Private profile with a restriction' END AS name,
  substr(${listedText('founder')},1,120) AS founder,
  substr(${listedText('city')},1,120) AS city,
  substr(CASE WHEN ${listedText('sector')}='Other' THEN COALESCE(NULLIF(${listedText('customSector')},''),'Other') ELSE ${listedText('sector')} END,1,120) AS sector,
  substr(${listedText('stage')},1,120) AS stage,
  substr(${listedText('tagline')},1,240) AS tagline,
  CASE WHEN p.listed=1 THEN p.updated ELSE m.updated END AS updated,p.listed AS owner_listed,
  COALESCE(m.hidden,0) AS hidden,substr(COALESCE(m.reason,''),1,500) AS moderation_reason,m.updated AS moderation_updated,COALESCE(m.version,0) AS version`;
const profileFromRow = (row: PublicRow): AdminProfile => ({
  id: row.id, kind: row.kind, name: row.name, founder: row.founder, city: row.city,
  sector: row.sector, stage: row.stage, tagline: row.tagline, updated: row.updated,
  ownerListed: !!row.owner_listed, hidden: !!row.hidden, moderationReason: row.moderation_reason ?? '',
  moderationUpdated: row.moderation_updated, version: row.version,
});

export async function adminOverview(): Promise<AdminOverview> {
  const db = database();
  const results = await db.batch<Record<string, string | number>>([
    db.prepare(`SELECT COUNT(*) AS total,
      COALESCE(SUM(p.listed=1 AND COALESCE(m.hidden,0)=0),0) AS public,
      COALESCE(SUM(p.listed=0 AND COALESCE(m.hidden,0)=0),0) AS private,
      COALESCE(SUM(m.hidden=1),0) AS hidden,
      COALESCE(SUM(p.kind='startup'),0) AS founders,
      COALESCE(SUM(p.kind='investor'),0) AS investors
      FROM profiles p LEFT JOIN profile_moderation m ON m.profile_id=p.id`),
    db.prepare('SELECT status,COUNT(*) AS n FROM introductions GROUP BY status'),
    db.prepare('SELECT status,COUNT(*) AS n FROM member_reports GROUP BY status'),
    db.prepare('SELECT status,COUNT(*) AS n FROM notifications GROUP BY status'),
  ]);
  const groups = (index: number) => Object.fromEntries(results[index].results.map(row => [String(row.status), Number(row.n)]));
  const reportCounts = groups(2);
  const reports = Object.fromEntries(reportStatuses.map(status => [status, reportCounts[status] ?? 0])) as Record<ReportStatus, number>;
  const settings = env as unknown as Record<string, string | undefined>;
  const clerkKey = settings.CLERK_SECRET_KEY;
  const emailProviderConfigured = !!settings.RESEND_API_KEY;
  const emailSenderConfigured = !!settings.EMAIL_FROM;
  const originConfigured = !!settings.FIRSTSIGNAL_ORIGIN;
  const profileCounts = results[0].results[0] ?? {};
  return {
    profiles: { total: Number(profileCounts.total ?? 0), public: Number(profileCounts.public ?? 0), private: Number(profileCounts.private ?? 0), hidden: Number(profileCounts.hidden ?? 0), founders: Number(profileCounts.founders ?? 0), investors: Number(profileCounts.investors ?? 0) },
    introductions: groups(1),
    reports: { ...reports, open: reports.submitted + reports.reviewing, total: Object.values(reportCounts).reduce((a, b) => a + b, 0) },
    notifications: groups(3),
    configuration: { adminConfigured: isAdminConfigured(), clerkMode: clerkKey?.startsWith('sk_live_') ? 'production' : clerkKey?.startsWith('sk_test_') ? 'development' : 'unconfigured', emailActive: emailProviderConfigured && emailSenderConfigured && originConfigured, emailProviderConfigured, emailSenderConfigured, originConfigured },
  };
}

export async function adminProfiles(page: number, query: string, filters: AdminProfileFilters = { kind: 'all', visibility: 'all' }): Promise<AdminPage<AdminProfile>> {
  const db = database();
  // A current restriction remains reversible after its owner unlists. CASE
  // guards every JSON read for those private rows, including search matches.
  // Only the restriction ID/reason and fixed placeholders are available then.
  const where = `(p.listed=1 OR m.hidden=1) AND (?='all' OR p.kind=?)
    AND (?='all' OR (?='visible' AND p.listed=1 AND COALESCE(m.hidden,0)=0) OR (?='removed' AND m.hidden=1))
    AND (?='' OR p.id LIKE ? ESCAPE '\\' OR COALESCE(m.reason,'') LIKE ? ESCAPE '\\'
    OR ${listedText('name')} LIKE ? ESCAPE '\\' OR ${listedText('founder')} LIKE ? ESCAPE '\\'
    OR ${listedText('city')} LIKE ? ESCAPE '\\' OR ${listedText('sector')} LIKE ? ESCAPE '\\'
    OR ${listedText('customSector')} LIKE ? ESCAPE '\\')`;
  const params = [filters.kind, filters.kind, filters.visibility, filters.visibility, filters.visibility, query, ...Array(7).fill(like(query))];
  const [count, rows] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM profiles p LEFT JOIN profile_moderation m ON m.profile_id=p.id WHERE ${where}`).bind(...params).first<Count>(),
    db.prepare(`SELECT ${profileColumns}
      FROM profiles p LEFT JOIN profile_moderation m ON m.profile_id=p.id WHERE ${where}
      ORDER BY updated DESC,p.id ASC LIMIT ? OFFSET ?`).bind(...params, adminPageSize, (page - 1) * adminPageSize).all<PublicRow>(),
  ]);
  return pageResult(rows.results.map(profileFromRow), page, count?.n ?? 0);
}

export async function adminProfile(profileId: string): Promise<AdminProfileDetail> {
  const db = database();
  type DetailRow = PublicRow & Pick<AdminProfileDetail, 'ideology' | 'proposedSolution' | 'learning' | 'nextExperiment'>;
  const row = await db.prepare(`SELECT ${profileColumns},
    substr(${listedText('problem')},1,1500) AS ideology,
    substr(${listedText('solution')},1,1500) AS proposedSolution,
    substr(CASE WHEN p.kind='investor' AND ${listedText('requiredEvidence')}<>'' THEN ${listedText('requiredEvidence')} ELSE ${listedText('validation')} END,1,1500) AS learning,
    substr(${listedText('nextMilestone')},1,1000) AS nextExperiment
    FROM profiles p LEFT JOIN profile_moderation m ON m.profile_id=p.id
    WHERE p.id=? AND (p.listed=1 OR m.hidden=1)`).bind(profileId).first<DetailRow>();
  if (!row) throw new AdminConflict('This listing is unavailable.', 404);
  // An owner can unlist a previously removed entry. Its restriction remains
  // reversible, but this endpoint never opens that private draft or its updates.
  const progress = row.owner_listed ? (await db.prepare(`SELECT substr(u.id,1,100) AS id,substr(u.date,1,10) AS date,
    substr(u.title,1,100) AS title,substr(u.body,1,2000) AS body,substr(u.created,1,40) AS created
    FROM progress_updates u WHERE u.profile_id=? AND EXISTS (SELECT 1 FROM profiles p WHERE p.id=u.profile_id AND p.listed=1)
    ORDER BY u.date DESC,u.created DESC,u.id ASC LIMIT 20`).bind(profileId).all<AdminProfileDetail['progress'][number]>()).results : [];
  return { ...profileFromRow(row), ideology: row.ideology, proposedSolution: row.proposedSolution,
    learning: row.learning, nextExperiment: row.nextExperiment, progress, redacted: !row.owner_listed };
}

export async function adminReports(page: number, status: ReportStatus, query: string): Promise<AdminPage<AdminReport>> {
  const db = database();
  const where = `r.status=? AND (?='' OR r.reason LIKE ? ESCAPE '\\' OR r.details LIKE ? ESCAPE '\\' OR r.id LIKE ? ESCAPE '\\')`;
  const params = [status, query, like(query), like(query), like(query)];
  const [count, rows] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM member_reports r WHERE ${where}`).bind(...params).first<Count>(),
    db.prepare(`SELECT r.id,r.profile_id,substr(r.reason,1,120) AS reason,substr(r.details,1,1500) AS details,
      r.status,r.created,COALESCE(NULLIF(r.updated,''),r.created) AS updated,r.version,substr(r.operator_note,1,1000) AS operator_note,
      p.id AS target_id,substr(${listedText('name')},1,120) AS target_name,p.kind AS target_kind,COALESCE(m.hidden,0) AS target_hidden
      FROM member_reports r LEFT JOIN profiles p ON p.id=CASE WHEN substr(r.profile_id,1,11)='connection:'
        THEN (SELECT linked.id FROM profiles linked WHERE linked.owner=r.target_owner AND linked.listed=1 ORDER BY linked.updated DESC,linked.id ASC LIMIT 1)
        ELSE r.profile_id END AND p.listed=1
      LEFT JOIN profile_moderation m ON m.profile_id=p.id WHERE ${where}
      ORDER BY r.created DESC,r.id ASC LIMIT ? OFFSET ?`).bind(...params, adminPageSize, (page - 1) * adminPageSize).all<ReportRow>(),
  ]);
  return pageResult(rows.results.map(row => ({ id: row.id, profileId: row.profile_id, reason: row.reason, details: row.details, status: row.status, created: row.created, updated: row.updated, version: row.version, operatorNote: row.operator_note, target: row.target_id && row.target_kind ? { id: row.target_id, name: row.target_name ?? '', kind: row.target_kind, hidden: !!row.target_hidden } : null })), page, count?.n ?? 0);
}

export async function adminAudit(page: number, query = ''): Promise<AdminPage<AdminAudit>> {
  const db = database();
  const where = `?='' OR action LIKE ? ESCAPE '\\' OR target_id LIKE ? ESCAPE '\\' OR reason LIKE ? ESCAPE '\\' OR actor LIKE ? ESCAPE '\\'`;
  const params = [query, ...Array(4).fill(like(query))];
  const [count, rows] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM admin_audit WHERE ${where}`).bind(...params).first<Count>(),
    db.prepare(`SELECT id,actor,action,target_id AS targetId,reason,previous_state AS previousState,next_state AS nextState,created
      FROM admin_audit WHERE ${where} ORDER BY created DESC,id ASC LIMIT ? OFFSET ?`).bind(...params, adminPageSize, (page - 1) * adminPageSize).all<AdminAudit>(),
  ]);
  return pageResult(rows.results, page, count?.n ?? 0);
}

export async function applyAdminAction(actor: string, action: AdminAction) {
  const db = database(), event = crypto.randomUUID(), now = new Date().toISOString();
  if (action.action === 'reviewReport') {
    const previous = await db.prepare('SELECT status,version FROM member_reports WHERE id=?').bind(action.reportId).first<{ status: string; version: number }>();
    if (!previous) throw new AdminConflict('This report is unavailable.', 404);
    if (previous.version !== action.expectedVersion) throw new AdminConflict('This report changed. Reload before saving.', 409);
    // D1 batch is transactional. The event marker prevents a stale/no-op write
    // from producing an audit record, including concurrent same-version saves.
    const results = await db.batch([
      db.prepare(`UPDATE member_reports SET status=?,operator_note=?,version=version+1,updated=?,last_admin_event=? WHERE id=? AND version=?`)
        .bind(action.status, action.operatorNote, now, event, action.reportId, action.expectedVersion),
      db.prepare(`INSERT INTO admin_audit (id,actor,action,target_id,reason,previous_state,next_state,created)
        SELECT ?,?,'report_reviewed',id,?,?,status,? FROM member_reports WHERE id=? AND last_admin_event=?`)
        .bind(event, actor, action.operatorNote, previous.status, now, action.reportId, event),
    ]);
    if (!results[0].meta.changes) throw new AdminConflict('Another review arrived first. Reload before saving.', 409);
    return;
  }
  const previous = await db.prepare(`SELECT p.listed,COALESCE(m.hidden,0) AS hidden,COALESCE(m.version,0) AS version
    FROM profiles p LEFT JOIN profile_moderation m ON m.profile_id=p.id WHERE p.id=?`).bind(action.profileId).first<{ listed: number; hidden: number; version: number }>();
  if (!previous || (!previous.listed && !previous.hidden)) throw new AdminConflict('This public listing is unavailable.', 404);
  if (previous.version !== action.expectedVersion) throw new AdminConflict('This listing changed. Reload before saving.', 409);
  const results = await db.batch([
    db.prepare(`INSERT INTO profile_moderation (profile_id,hidden,reason,version,event_id,updated)
      SELECT ?,?,?,1,?,? WHERE ?=0 AND EXISTS (SELECT 1 FROM profiles WHERE id=? AND listed=1)
      ON CONFLICT(profile_id) DO UPDATE SET hidden=excluded.hidden,reason=excluded.reason,version=profile_moderation.version+1,event_id=excluded.event_id,updated=excluded.updated
      WHERE profile_moderation.version=?`)
      .bind(action.profileId, action.hidden ? 1 : 0, action.reason, event, now, action.expectedVersion, action.profileId, action.expectedVersion),
    db.prepare(`UPDATE profile_moderation SET hidden=?,reason=?,version=version+1,event_id=?,updated=?
      WHERE profile_id=? AND version=? AND ?<>0`)
      .bind(action.hidden ? 1 : 0, action.reason, event, now, action.profileId, action.expectedVersion, action.expectedVersion),
    db.prepare(`INSERT INTO admin_audit (id,actor,action,target_id,reason,previous_state,next_state,created)
      SELECT ?,?,?,profile_id,?, ?,CASE WHEN hidden=1 THEN 'hidden' ELSE 'visible' END,? FROM profile_moderation WHERE profile_id=? AND event_id=?`)
      .bind(event, actor, action.hidden ? 'profile_hidden' : 'profile_restored', action.reason, previous.hidden ? 'hidden' : 'visible', now, action.profileId, event),
  ]);
  if (!results[0].meta.changes && !results[1].meta.changes) throw new AdminConflict('Another listing change arrived first. Reload before saving.', 409);
}
