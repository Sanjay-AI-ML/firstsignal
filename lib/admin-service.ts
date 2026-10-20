import { env } from 'cloudflare:workers';
import { database } from './database';
import { isAdminConfigured } from './admin-access';
import { adminPageSize, reportStatuses, type AdminAction, type AdminAudit, type AdminOverview, type AdminPage, type AdminProfile, type AdminProfileDetail, type AdminProfileFilters, type AdminReport, type ReportStatus, type AdminEmailOperations, type AdminEmailState } from './admin-types';

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
      COUNT(DISTINCT CASE WHEN p.kind='startup' THEN p.owner END) AS founders,
      COUNT(DISTINCT CASE WHEN p.kind='investor' THEN p.owner END) AS investors
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
  let originConfigured = false;
  try { const origin = new URL(settings.FIRSTSIGNAL_ORIGIN ?? ''); originConfigured = origin.protocol === 'https:' && origin.origin === settings.FIRSTSIGNAL_ORIGIN && !origin.hostname.endsWith('.invalid'); } catch { /* Missing or malformed origin is not configured. */ }
  const dispatchLength = settings.NOTIFICATION_DISPATCH_SECRET?.length ?? 0;
  const emailAutomationConfigured = dispatchLength >= 32 && dispatchLength <= 256;
  const emailReceiptsConfigured = !!settings.RESEND_WEBHOOK_SECRET;
  const profileCounts = results[0].results[0] ?? {};
  return {
    profiles: { total: Number(profileCounts.total ?? 0), public: Number(profileCounts.public ?? 0), private: Number(profileCounts.private ?? 0), hidden: Number(profileCounts.hidden ?? 0), founders: Number(profileCounts.founders ?? 0), investors: Number(profileCounts.investors ?? 0) },
    introductions: groups(1),
    reports: { ...reports, open: reports.submitted + reports.reviewing, total: Object.values(reportCounts).reduce((a, b) => a + b, 0) },
    notifications: groups(3),
    configuration: { adminConfigured: isAdminConfigured(), clerkMode: clerkKey?.startsWith('sk_live_') ? 'production' : clerkKey?.startsWith('sk_test_') ? 'development' : 'unconfigured', emailActive: emailProviderConfigured && emailSenderConfigured && !!clerkKey && originConfigured && !/[\r\n]/.test(settings.EMAIL_FROM ?? ''), emailProviderConfigured, emailSenderConfigured, originConfigured, emailAutomationConfigured, emailReceiptsConfigured },
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
        THEN (SELECT linked.id FROM introductions i JOIN profiles linked ON (linked.id=i.profile_id OR linked.id=i.source_profile_id)
          WHERE i.id=substr(r.profile_id,12) AND linked.owner=r.target_owner AND linked.listed=1
          AND ((i.sender=r.owner AND i.recipient=r.target_owner) OR (i.recipient=r.owner AND i.sender=r.target_owner)) LIMIT 1)
        ELSE r.profile_id END AND p.listed=1 AND p.owner=r.target_owner
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

// Never return provider response bodies, recipient addresses, message contents or
// frozen send payloads. Only known diagnostic codes can leave the service.
function safeEmailError(code: string | null): string {
  const labels: Record<string, string> = {
    retry_window_ended: 'The retry window ended; delivery may be unconfirmed.',
    attempt_limit: 'The attempt limit was reached; delivery may be unconfirmed.',
    preference_changed: 'The member changed their email preference.',
    permission_changed: 'Connection or email permission changed.',
    primary_email_changed: 'The verified primary email address changed.',
    address_suppressed: 'This address is blocked from further delivery.',
    temporary_delivery_failure: 'A temporary delivery issue will be retried within the safety window.',
  };
  if (!code) return '';
  if (Object.hasOwn(labels, code)) return labels[code];
  return /^provider_[1-5][0-9]{2}$/.test(code) ? `Email provider returned HTTP ${code.slice(9)}.` : 'A delivery issue was recorded. Review restricted service logs.';
}
export async function adminEmails(page = 1, state: AdminEmailState = 'all'): Promise<AdminEmailOperations> {
  const db = database();
  const [counts, oldest, total] = await Promise.all([
    db.prepare(`SELECT
      COALESCE(SUM(state IN ('pending','retry','sending')),0) AS backlog,
      COALESCE(SUM(state='delivered'),0) AS delivered,
      COALESCE(SUM(state IN ('failed','expired')),0) AS failed,
      COALESCE(SUM(state='suppressed'),0) AS suppressed,
      COALESCE(SUM(state='retry'),0) AS retrying,
      COALESCE(SUM(state='sending'),0) AS sending,
      COALESCE(SUM(state='bounced'),0) AS bounced,
      COALESCE(SUM(state='complained'),0) AS complained,
      COALESCE(SUM(state='submitted'),0) AS submitted
      FROM notification_emails`).first<Record<string, number>>(),
    db.prepare("SELECT MIN(created) AS oldest FROM notification_emails WHERE state IN ('pending','retry','sending')").first<{ oldest: string | null }>(),
    db.prepare("SELECT COUNT(*) AS n FROM notification_emails WHERE ?='all' OR state=?").bind(state, state).first<Count>(),
  ]);
  const safePage = Math.min(page, Math.max(1, Math.ceil((total?.n ?? 0) / adminPageSize)));
  const recent = await db.prepare(`SELECT notification_id,kind,state,attempts,next_attempt_at,event_at,last_error,created,updated
      FROM notification_emails WHERE ?='all' OR state=? ORDER BY updated DESC,notification_id DESC LIMIT ? OFFSET ?`)
      .bind(state, state, adminPageSize, (safePage - 1) * adminPageSize).all<{
        notification_id: string; kind: string; state: string; attempts: number;
        next_attempt_at: string; event_at: string; last_error: string; created: string; updated: string;
      }>();
  const oldestTime = oldest?.oldest ? new Date(oldest.oldest).getTime() : NaN;
  const queueAgeSeconds = Number(counts?.backlog ?? 0) === 0 ? 0 : Number.isFinite(oldestTime) ? Math.max(0, Math.floor((Date.now() - oldestTime) / 1000)) : null;
  return {
    backlog: Number(counts?.backlog ?? 0), delivered: Number(counts?.delivered ?? 0),
    failed: Number(counts?.failed ?? 0), suppressed: Number(counts?.suppressed ?? 0),
    retrying: Number(counts?.retrying ?? 0), sending: Number(counts?.sending ?? 0),
    bounced: Number(counts?.bounced ?? 0), complained: Number(counts?.complained ?? 0),
    submitted: Number(counts?.submitted ?? 0), queueAgeSeconds, alert: queueAgeSeconds === null ? null : queueAgeSeconds > 900,
    records: pageResult((recent.results ?? []).map(row => ({
      notificationId: row.notification_id, kind: row.kind, state: row.state, attempts: row.attempts,
      nextAttemptAt: row.next_attempt_at, eventAt: row.event_at, lastError: safeEmailError(row.last_error),
      created: row.created, updated: row.updated,
    })), safePage, total?.n ?? 0),
  };
}
