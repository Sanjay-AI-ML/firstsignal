import { getAppUser } from '../../auth';
import { notificationStatements } from '@/lib/notifications';
import { database } from '@/lib/database';
import { seedProfiles, type Profile } from '@/lib/data';
import { actionSchema, profileSchema } from '@/lib/validation';
import { membersBlocked } from '@/lib/member-safety';
import { checkRateLimit, anonymousThrottleKey } from '@/lib/rate-limit';
import { readBoundedBody } from '@/lib/streaming-request';
import { getRequestId, createTimingTracker, logSafeError } from '@/lib/monitoring';
import { makeOperation, readOperation, operationClaim, operationGuard, operationCleanup } from '@/lib/idempotency';
import { consumeAtomicDailyQuota } from '@/lib/abuse-control';
import { computeChangeSummary, ideaRevisionStatement, pruneIdeaRevisionsStatement, listIdeaRevisions, getRevisionToRestore } from '@/lib/revisions';

export const dynamic = 'force-dynamic';

type Stored = {
  id: string;
  owner: string;
  kind: string;
  data: string;
  listed: number;
  updated: string;
  version?: number;
  moderation_hidden?: number;
  moderation_reason?: string;
  moderation_updated?: string;
};

type RequestRow = {
  id: string;
  sender: string;
  recipient: string | null;
  profile_id: string;
  source_profile_id: string | null;
  source_name: string | null;
  target_name: string;
  sender_name: string;
  message: string;
  status: string;
  created: string;
  updated: string;
  activity?: string;
  blocked?: number;
  proposal_status?: string;
  proposal_amount?: number;
  proposal_author?: string;
  proposal_version?: number;
  unread_count?: number;
  last_read_message_id?: string;
  latest_message?: string;
  next_note?: string;
  next_date?: string;
};

type Progress = {
  id: string;
  profile_id: string;
  date: string;
  title: string;
  body: string;
  created: string;
};

const json = (data: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', ...extraHeaders },
  });

function profile(row: Stored, userId?: string, updates: Profile['updates'] = [], version = 1): Profile {
  const data = JSON.parse(row.data);
  return {
    ...data,
    id: row.id,
    kind: row.kind,
    updates,
    demo: false,
    mine: row.owner === userId,
    listed: !!row.listed,
    updated: row.updated,
    version,
    evidenceDate: data.evidenceDate ?? '',
    ...(row.owner === userId && row.moderation_hidden
      ? { moderation: { hidden: true, reason: row.moderation_reason ?? '', updated: row.moderation_updated ?? '' } }
      : {}),
  };
}

async function state(
  userId?: string,
  requestedProfileId?: string,
  options?: { cursor?: string; limit?: number; conversationCursor?: string; conversationLimit?: number }
) {
  const db = database();
  const limit = Math.min(Math.max(options?.limit ?? 200, 1), 200);
  const conversationLimit = Math.min(Math.max(options?.conversationLimit ?? 100, 1), 100);

  const discoveryCursor=options?.cursor?JSON.parse(options.cursor) as [string,string]:null;
  const discoveryValues: unknown[]=[];
  const discoveryConditions=['p.listed=1','NOT EXISTS(SELECT 1 FROM profile_moderation m WHERE m.profile_id=p.id AND m.hidden=1)'];
  if(userId){discoveryConditions.push('NOT EXISTS(SELECT 1 FROM member_blocks b WHERE (b.owner=? AND b.target_owner=p.owner) OR (b.owner=p.owner AND b.target_owner=?))');discoveryValues.push(userId,userId)}
  if(discoveryCursor){discoveryConditions.push('(p.updated<? OR (p.updated=? AND p.id<?))');discoveryValues.push(discoveryCursor[0],discoveryCursor[0],discoveryCursor[1])}
  const discoveryResult=await db.prepare(`SELECT p.* FROM profiles p WHERE ${discoveryConditions.join(' AND ')} ORDER BY p.updated DESC,p.id DESC LIMIT ?`).bind(...discoveryValues,limit+1).all<Stored>();
  const discoveryPage=discoveryResult.results.slice(0,limit);
  const discoveryMore=discoveryResult.results.length>limit;
  const discoveryLast=discoveryPage[discoveryPage.length-1];
  const rows={results:discoveryPage};

  const owned = userId
    ? await db
        .prepare(
          'SELECT p.*,COALESCE(v.version,1) AS version,m.hidden AS moderation_hidden,m.reason AS moderation_reason,m.updated AS moderation_updated FROM profiles p LEFT JOIN profile_moderation m ON m.profile_id=p.id LEFT JOIN profile_versions v ON v.profile_id=p.id WHERE owner=? ORDER BY p.updated DESC,p.id DESC'
        )
        .bind(userId)
        .all<Stored>()
    : { results: [] };

  const savedRows = userId
    ? await db
        .prepare(
          `SELECT p.* FROM profiles p INNER JOIN saves s ON s.profile_id=p.id
     WHERE s.owner=? AND ((p.listed=1 AND NOT EXISTS (SELECT 1 FROM profile_moderation m WHERE m.profile_id=p.id AND m.hidden=1)) OR p.owner=?)
     AND NOT EXISTS (SELECT 1 FROM member_blocks b WHERE (b.owner=? AND b.target_owner=p.owner) OR (b.owner=p.owner AND b.target_owner=?))
     ORDER BY s.created DESC LIMIT 200`
        )
        .bind(userId, userId, userId, userId)
        .all<Stored>()
    : { results: [] };

  const requestedRows = requestedProfileId
    ? await (userId
        ? db
            .prepare(
              `SELECT p.* FROM profiles p WHERE p.id=? AND ((p.listed=1 AND NOT EXISTS (SELECT 1 FROM profile_moderation m WHERE m.profile_id=p.id AND m.hidden=1)) OR p.owner=?)
     AND NOT EXISTS (SELECT 1 FROM member_blocks b WHERE (b.owner=? AND b.target_owner=p.owner) OR (b.owner=p.owner AND b.target_owner=?)) LIMIT 1`
            )
            .bind(requestedProfileId, userId, userId, userId)
        : db
            .prepare(
              'SELECT p.* FROM profiles p WHERE id=? AND listed=1 AND NOT EXISTS (SELECT 1 FROM profile_moderation m WHERE m.profile_id=p.id AND m.hidden=1) LIMIT 1'
            )
            .bind(requestedProfileId)
      ).all<Stored>()
    : { results: [] };

  const ownHidden = new Set(owned.results.filter(row => row.moderation_hidden).map(row => row.id));
  const accessibleRows = [
    ...new Map(
      [...rows.results, ...savedRows.results, ...requestedRows.results]
        .filter(row => !ownHidden.has(row.id))
        .map(row => [row.id, row])
    ).values(),
  ];

  const visibleIds = [...new Set([...accessibleRows, ...owned.results].map(r => r.id))];
  const progressQueries = [];
  for (let offset = 0; offset < visibleIds.length; offset += 100) {
    const ids = visibleIds.slice(offset, offset + 100);
    progressQueries.push(
      db
        .prepare(
          `SELECT id,profile_id,date,title,body,created FROM progress_updates WHERE profile_id IN (${ids
            .map(() => '?')
            .join(',')}) ORDER BY date DESC,created DESC LIMIT 2000`
        )
        .bind(...ids)
    );
  }
  const progress = progressQueries.length
    ? (await db.batch<Progress>(progressQueries)).flatMap(result => result.results)
    : [];
  const updates = (id: string) =>
    progress.filter(p => p.profile_id === id).map(({ id, date, title, body, created }) => ({ id, date, title, body, created }));

  const verMap=new Map(owned.results.map(row=>[row.id,row.version??1]));
  const all = accessibleRows.map(r => profile(r, userId, updates(r.id), verMap.get(r.id) ?? 1));

  if (!userId) {
    return {
      profiles: [...all, ...seedProfiles],
      savedIds: [],
      myProfiles: [],
      requests: [],
      blockedProfiles: [],
      reports: [],
      nextCursor: discoveryMore && discoveryLast ? JSON.stringify([discoveryLast.updated,discoveryLast.id]) : null,
      hasMore: discoveryMore,
    };
  }

  const conversationCursor=options?.conversationCursor?JSON.parse(options.conversationCursor) as [string,string]:null;
  const introValues: unknown[]=[userId,userId,userId,userId,userId,userId,userId,userId,userId];
  if(conversationCursor) introValues.push(conversationCursor[0],conversationCursor[0],conversationCursor[1]);
  introValues.push(conversationLimit+1);
  const introsQuery=db.prepare(`WITH conversations AS (
    SELECT r.*,n.status AS proposal_status,n.amount AS proposal_amount,n.author AS proposal_author,n.version AS proposal_version,ns.note AS next_note,ns.date AS next_date,
    MAX(r.updated,COALESCE(n.updated,r.updated),COALESCE((SELECT MAX(m.created) FROM messages m WHERE m.introduction_id=r.id),r.updated),COALESCE(ns.updated,r.updated)) AS activity,
    EXISTS(SELECT 1 FROM member_blocks b WHERE (b.owner=? AND b.target_owner=CASE WHEN r.sender=? THEN r.recipient ELSE r.sender END) OR (b.target_owner=? AND b.owner=CASE WHEN r.sender=? THEN r.recipient ELSE r.sender END)) AS blocked,
    (SELECT COUNT(*) FROM messages m WHERE m.introduction_id=r.id AND m.sender<>? AND (m.created>COALESCE(rp.last_read_at,'') OR (m.created=rp.last_read_at AND m.id>rp.last_read_message_id))) AS unread_count,
    rp.last_read_message_id,
    (SELECT json_object('id',m.id,'body',m.body,'senderName',m.sender_name,'created',m.created,'sender',m.sender) FROM messages m WHERE m.introduction_id=r.id ORDER BY m.created DESC,m.id DESC LIMIT 1) AS latest_message
    FROM introductions r LEFT JOIN negotiations n ON n.introduction_id=r.id LEFT JOIN connection_next_steps ns ON ns.introduction_id=r.id AND ns.owner=? LEFT JOIN conversation_read_positions rp ON rp.introduction_id=r.id AND rp.user_id=? WHERE r.sender=? OR r.recipient=?
  ) SELECT * FROM conversations ${conversationCursor?'WHERE (activity<? OR (activity=? AND id<?))':''} ORDER BY activity DESC,id DESC LIMIT ?`).bind(...introValues).all<RequestRow>();

  const [saved, requestsResult, blocked, reports, savedSearches, closure] = await Promise.all([
    db.prepare('SELECT profile_id FROM saves WHERE owner=?').bind(userId).all<{ profile_id: string }>(),
    introsQuery,
    db
      .prepare('SELECT profile_id,target_name,created FROM member_blocks WHERE owner=? ORDER BY created DESC LIMIT 100')
      .bind(userId)
      .all<{ profile_id: string; target_name: string; created: string }>(),
    db.prepare('SELECT id,profile_id,reason,status,created FROM member_reports WHERE owner=? ORDER BY created DESC LIMIT 100').bind(userId).all(),
    db
      .prepare('SELECT id, name, query, filters, alerts_enabled, created FROM saved_searches WHERE owner=? ORDER BY created DESC LIMIT 20')
      .bind(userId)
      .all<{ id: string; name: string; query: string; filters: string; alerts_enabled: number; created: string }>(),
    db
      .prepare('SELECT status, requested_at, retention_until, reason FROM account_closures WHERE owner=?')
      .bind(userId)
      .first<{ status: string; requested_at: string; retention_until: string; reason: string }>(),
  ]);

  const requests={results:requestsResult.results.slice(0,conversationLimit)};
  const conversationsMore=requestsResult.results.length>conversationLimit;
  const conversationsLast=requests.results[requests.results.length-1];

  return {
    profiles: [...all, ...seedProfiles],
    myProfiles: owned.results.map(r => profile(r, userId, updates(r.id), verMap.get(r.id) ?? 1)),
    savedIds: saved.results.map(r => r.profile_id),
    blockedProfiles: blocked.results.map(r => ({ profileId: r.profile_id, name: r.target_name, created: r.created })),
    reports: reports.results.map(r => ({ id: r.id, profileId: r.profile_id, reason: r.reason, status: r.status, created: r.created })),
    requests: requests.results.map(r => {
      return {
        id: r.id,
        profileId: r.profile_id,
        ...(r.source_profile_id ? { sourceProfileId: r.source_profile_id, sourceName: r.source_name ?? '' } : {}),
        targetName: r.target_name,
        senderName: r.sender_name,
        message: r.message,
        status: r.status,
        created: r.created,
        updated: r.activity ?? r.updated,
        activity: r.activity ?? r.updated,
        blocked: !!r.blocked,
        unreadCount:r.unread_count??0,
        lastReadMessageId:r.last_read_message_id||undefined,
        ...(r.latest_message ? (() => {const message=JSON.parse(r.latest_message);return {latestMessage:{id:message.id,body:message.body,senderName:message.senderName,created:message.created,mine:message.sender===userId}}})() : {}),
        proposal: r.proposal_status
          ? { status: r.proposal_status, amount: r.proposal_amount, mine: r.proposal_author === userId, version: r.proposal_version }
          : undefined,
        nextStep: r.next_note || r.next_date ? { note: r.next_note ?? '', date: r.next_date ?? '' } : undefined,
        direction: r.recipient === userId ? 'incoming' : 'outgoing',
        messages: [],
      };
    }),
    nextCursor: discoveryMore && discoveryLast ? JSON.stringify([discoveryLast.updated,discoveryLast.id]) : null,
    hasMore: discoveryMore,
    nextConversationCursor: conversationsMore && conversationsLast ? JSON.stringify([conversationsLast.activity??conversationsLast.updated,conversationsLast.id]) : null,
    hasMoreConversations: conversationsMore,
    savedSearches: (savedSearches.results ?? []).map(s => ({
      id: s.id,
      name: s.name,
      query: s.query,
      filters: s.filters,
      alertsEnabled: !!s.alerts_enabled,
      created: s.created,
    })),
    accountClosure: closure ? { status: closure.status, requestedAt: closure.requested_at, retentionUntil: closure.retention_until, reason: closure.reason } : null,
  };
}

export async function GET(request?: Request) {
  const timer = createTimingTracker();
  const requestId = getRequestId(request);
  const timingHeaders = { 'X-Request-Id': requestId, 'Server-Timing': timer.header() };

  try {
    const user = await getAppUser();
    timer.mark('auth');
    const rate = checkRateLimit('get:' + (user?.userId ?? anonymousThrottleKey(request)), 300);
    if (!rate.success) return json({ error: 'Too many refreshes. Please wait a minute before trying again.' }, 429, timingHeaders);

    const url = request ? new URL(request.url) : null;
    const id = url ? url.searchParams.get('profile') : null;
    const requestedProfileId = id && id.length >= 2 && id.length <= 100 ? id : undefined;

    const cursor=url?.searchParams.get('cursor')??undefined;
    const conversationCursor=url?.searchParams.get('conversationCursor')??undefined;
    const limit=url?.searchParams.has('limit')?Number(url.searchParams.get('limit')):undefined;
    const conversationLimit=url?.searchParams.has('conversationLimit')?Number(url.searchParams.get('conversationLimit')):undefined;
    const validCursor=(value:string|undefined)=>{if(value===undefined)return true;if(value.length>500)return false;try{const tuple=JSON.parse(value);return Array.isArray(tuple)&&tuple.length===2&&typeof tuple[0]==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(tuple[0])&&Number.isFinite(Date.parse(tuple[0]))&&typeof tuple[1]==='string'&&tuple[1].length>0&&tuple[1].length<=100}catch{return false}};
    if(!validCursor(cursor)||!validCursor(conversationCursor)||[limit,conversationLimit].some(n=>n!==undefined&&(!Number.isInteger(n)||n<1||n>200))||(conversationLimit!==undefined&&conversationLimit>100)) return json({error:'Choose valid page limits and cursors.'},400,timingHeaders);

    const result = await state(user?.userId, requestedProfileId, { cursor, limit, conversationCursor, conversationLimit });
    timer.mark('state');

    return json(result, 200, { 'X-Request-Id': requestId, 'Server-Timing': timer.header() });
  } catch (e) {
    logSafeError('Workspace read failed', e, { requestId });
    return json({ error: "We couldn't load your workspace. Please retry." }, 503, timingHeaders);
  }
}

export async function POST(request: Request) {
  const timer = createTimingTracker();
  const requestId = getRequestId(request);
  const timingHeaders = { 'X-Request-Id': requestId, 'Server-Timing': timer.header() };

  let user;
  try {
    user = await getAppUser();
  } catch {
    logSafeError('Authentication service unavailable', null, { requestId });
    return json({ error: 'Sign-in is temporarily unavailable. Please retry.' }, 503, timingHeaders);
  }
  if (!user) return json({ error: 'Sign in to save changes.' }, 401, timingHeaders);
  timer.mark('auth');

  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return json({ error: "This request couldn't be verified. Reload and try again." }, 403, timingHeaders);
  }

  if (!checkRateLimit('post:' + user.userId, 120).success) {
    return json({ error: 'Too many actions submitted. Please wait a minute before trying again.' }, 429, timingHeaders);
  }

  const bounded = await readBoundedBody(request, 20000);
  if (!bounded.ok) return json({ error: bounded.error }, bounded.status, timingHeaders);
  const raw = bounded.body;
  timer.mark('stream_body');

  let parsed;
  try {
    parsed = actionSchema.safeParse(JSON.parse(raw));
  } catch {
    return json({ error: 'Please submit valid form information.' }, 400, timingHeaders);
  }
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Check your form.' }, 400, timingHeaders);
  }

  const db = database(),
    a = parsed.data,
    now = new Date().toISOString(),
    owner = user.userId;

  // Refuse legacy wipe without identity revocation
  if (a.action === 'deleteAccount') {
    return json(
      {
        error:
          'Account deletion is not available in this version. No records were changed. You can unlist your ideas to hide them from discovery, or schedule reviewed account closure.',
      },
      409,
      timingHeaders
    );
  }

  try {
    const supportedOperations = ['profile','progress','message','request','saveSearch','restoreRevision'];
    const operation = await makeOperation(owner, 'operationId' in a && supportedOperations.includes(a.action) ? a.operationId : undefined, a.action, a, now);
    const claimed = operationGuard(operation);
    const guard = {sql:`(${claimed.sql}) AND NOT EXISTS(SELECT 1 FROM account_closures WHERE owner=?)`,values:[...claimed.values,owner]};
    const replay = async () => {
      const receipt = await readOperation(db, operation);
      if (receipt.kind === 'conflict') return json({ error: 'This operation ID was already used for different information. Start a new action.', operationConflict: true }, 409, timingHeaders);
      if (receipt.kind === 'replay') return json({ ...(await state(owner)), ...receipt.response, idempotentReplay: true }, 200, timingHeaders);
      return null;
    };
    const existingReceipt = await replay();
    if (existingReceipt) return existingReceipt;
    const atomic = async (statements: D1PreparedStatement[], metadata: Record<string, unknown>, successSql: string, values: unknown[]) => {
      const results = await db.batch([...operationClaim(db, operation, metadata), ...statements, ...operationCleanup(db, operation, successSql, values)]);
      const result = results[operation ? 1 : 0];
      return { result, replayed: !result.meta.changes ? await replay() : null };
    };
    const closure = await db.prepare('SELECT status FROM account_closures WHERE owner=?').bind(owner).first<{status: string}>();
    if (closure && !['cancelAccountClosure','requestAccountClosure','exportData','getRevisions','markConversationRead'].includes(a.action)) return json({ error: 'Cancel your account closure request before making new changes.' }, 409, timingHeaders);
    if (a.action === 'requestAccountClosure') {
      const retentionUntil = '';
      await db.batch([
        db.prepare(`INSERT INTO account_closures(owner,status,requested_at,retention_until,reason,updated) VALUES(?,'requested',?,'',?,?) ON CONFLICT(owner) DO NOTHING`).bind(owner, now, a.reason ?? '', now),
        db.prepare('UPDATE profiles SET listed=0,updated=? WHERE owner=?').bind(now, owner),
        db.prepare("UPDATE introductions SET status='withdrawn',updated=? WHERE sender=? AND status='pending'").bind(now, owner),
        db.prepare('UPDATE notification_preferences SET enabled=0 WHERE owner=?').bind(owner),
      ]);
      const updatedState = await state(owner);
      return json(
        {
          success: true,
          message: 'Closure requested for review. Your profiles are unlisted, outgoing pending requests withdrawn, and email updates turned off. Your sign-in and records remain until reviewed.',
          accountClosure: { status: 'requested', requestedAt: now, retentionUntil, reason: a.reason ?? '' },
          ...updatedState,
        },
        200,
        { 'X-Request-Id': requestId, 'Server-Timing': timer.header() }
      );
    }

    if (a.action === 'cancelAccountClosure') {
      await db.prepare('DELETE FROM account_closures WHERE owner=?').bind(owner).run();
      const updatedState = await state(owner);
      return json(
        {
          success: true,
          message: 'Account closure cancelled. Your account remains active.',
          accountClosure: null,
          ...updatedState,
        },
        200,
        { 'X-Request-Id': requestId, 'Server-Timing': timer.header() }
      );
    }

    if (a.action === 'markConversationRead') {
      return json({ error: 'Use the displayed-message read endpoint.' }, 400, timingHeaders);
    }

    if (a.action === 'getRevisions') {
      const revisions = await listIdeaRevisions(db, a.profileId, owner);
      return json({ profileId: a.profileId, revisions }, 200, {
        'X-Request-Id': requestId,
        'Server-Timing': timer.header(),
      });
    }

    if (a.action === 'restoreRevision') {
      const toRestore = await getRevisionToRestore(db, a.profileId, a.revisionId, owner);
      if (!toRestore) return json({ error: 'Revision unavailable or not found.' }, 404, timingHeaders);
      const current = await db.prepare("SELECT p.data,p.listed,COALESCE(v.version,1) AS version FROM profiles p LEFT JOIN profile_versions v ON v.profile_id=p.id WHERE p.id=? AND p.owner=? AND p.kind='startup'").bind(a.profileId, owner).first<{ version:number; data:string; listed:number }>();
      if (!current) return json({ error: 'Idea unavailable.' }, 404, timingHeaders);
      if (current.version !== a.expectedVersion) return await replay() ?? json({ error: 'This idea changed. Load the latest version before restoring.', conflict:true, currentVersion:current.version },409,timingHeaders);
      const restored = profileSchema.safeParse(JSON.parse(toRestore.data));
      if (!restored.success || restored.data.kind !== 'startup') return json({error:'This older revision needs updating before it can be restored. Copy the details into your current form instead.'},409,timingHeaders);
      const event = crypto.randomUUID();
      const {result,replayed} = await atomic([
        db.prepare(`UPDATE profiles SET data=?,updated=? WHERE id=? AND owner=? AND kind='startup' AND COALESCE((SELECT version FROM profile_versions WHERE profile_id=profiles.id),1)=? AND ${guard.sql}`).bind(JSON.stringify(restored.data),now,a.profileId,owner,a.expectedVersion,...guard.values),
        db.prepare(`INSERT INTO profile_versions(profile_id,version,last_operation,updated) SELECT ?,?,?,? WHERE changes()=1 ON CONFLICT(profile_id) DO UPDATE SET version=excluded.version,last_operation=excluded.last_operation,updated=excluded.updated`).bind(a.profileId,current.version+1,event,now),
        ideaRevisionStatement(db,a.profileId,current.version,current.data,current.listed,`Before restoring version ${toRestore.version}`,owner,now,event),
        pruneIdeaRevisionsStatement(db,a.profileId),
      ],{savedProfileId:a.profileId,restoredVersion:toRestore.version},'SELECT 1 FROM profile_versions WHERE profile_id=? AND last_operation=?',[a.profileId,event]);
      if(replayed) return replayed;
      if(!result.meta.changes) return json({error:'This idea changed. Load the latest version before restoring.',conflict:true},409,timingHeaders);
      return json({...(await state(owner,a.profileId)),savedProfileId:a.profileId,restoredVersion:toRestore.version},200,timingHeaders);
    }

    if (a.action === 'saveSearch') {
      if(a.alertsEnabled) return json({error:'Saved-search email alerts are not available yet. Save this search without alerts.'},400,timingHeaders);
      const searchId = crypto.randomUUID();
      const {result:res,replayed} = await atomic([
        db.prepare(`INSERT INTO saved_searches(id,owner,name,query,filters,alerts_enabled,created) SELECT ?,?,?,?,?,0,? WHERE (SELECT COUNT(*) FROM saved_searches WHERE owner=?)<20 AND ${guard.sql}`).bind(searchId,owner,a.name,a.query,a.filters,now,owner,...guard.values)
      ],{searchId},'SELECT 1 FROM saved_searches WHERE id=? AND owner=?',[searchId,owner]);
      if(replayed) return replayed;
      if (!res.meta.changes) return json({ error: 'You can save up to 20 searches. Remove an old search before adding another.' }, 400, timingHeaders);
      const updatedState = await state(owner);
      return json({ success: true, searchId, ...updatedState }, 200, {
        'X-Request-Id': requestId,
        'Server-Timing': timer.header(),
      });
    }

    if (a.action === 'deleteSearch') {
      await db.prepare('DELETE FROM saved_searches WHERE id=? AND owner=?').bind(a.id, owner).run();
      const updatedState = await state(owner);
      return json({ success: true, ...updatedState }, 200, {
        'X-Request-Id': requestId,
        'Server-Timing': timer.header(),
      });
    }

    if (a.action === 'toggleSearchAlert') {
      if(a.alertsEnabled) return json({error:'Saved-search email alerts are not available yet.'},400,timingHeaders);
      await db.prepare('UPDATE saved_searches SET alerts_enabled=? WHERE id=? AND owner=?').bind(a.alertsEnabled ? 1 : 0, a.id, owner).run();
      const updatedState = await state(owner);
      return json({ success: true, ...updatedState }, 200, {
        'X-Request-Id': requestId,
        'Server-Timing': timer.header(),
      });
    }

    if (a.action === 'exportData') {
      const chunk = a.chunk ?? 'all';
      let dataArchive: Record<string, unknown> = {
        formatVersion: 1,
        chunk,
        exportedAt: now,
        scope:
          "Your currently stored FindIn workspace records and conversations you participate in. This is not a copy of Clerk-managed authentication records, operator-only reviews, or other members' private follow-up notes. Records can change while the archive is generated.",
        user: { id: owner, name: user.displayName, email: user.email },
      };

      if (chunk === 'all' || chunk === 'profiles') {
        const [userProfiles, updates, userSaves, userBlocks, userReports, userExperiments, preferences, notices, restrictions, closures, searches] =
          await Promise.all([
            db.prepare('SELECT p.id,p.kind,p.data,p.listed,p.updated,COALESCE(v.version,1) AS version FROM profiles p LEFT JOIN profile_versions v ON v.profile_id=p.id WHERE owner=? ORDER BY p.updated,p.id').bind(owner).all<Omit<Stored, 'owner'>>(),
            db
              .prepare(
                'SELECT u.id,u.profile_id AS profileId,u.date,u.title,u.body,u.created FROM progress_updates u INNER JOIN profiles p ON p.id=u.profile_id WHERE p.owner=? ORDER BY u.created,u.id'
              )
              .bind(owner)
              .all<{ id: string; profileId: string; date: string; title: string; body: string; created: string }>(),
            db.prepare('SELECT profile_id AS profileId,created FROM saves WHERE owner=? ORDER BY created,profile_id').bind(owner).all(),
            db.prepare('SELECT profile_id AS profileId,target_name AS name,created FROM member_blocks WHERE owner=? ORDER BY created,profile_id').bind(owner).all(),
            db.prepare('SELECT id,profile_id AS profileId,reason,details,status,created,updated FROM member_reports WHERE owner=? ORDER BY created,id').bind(owner).all(),
            db
              .prepare(
                'SELECT e.id,e.profile_id AS profileId,e.plan,e.result,e.status,e.shared,e.version,e.created,e.started_at AS startedAt,e.completed_at AS completedAt,e.updated FROM idea_experiments e INNER JOIN profiles p ON p.id=e.profile_id WHERE p.owner=? ORDER BY e.created,e.id'
              )
              .bind(owner)
              .all<{ id: string; profileId: string; plan: string; result: string; status: string; shared: number; version: number; created: string; startedAt: string; completedAt: string; updated: string }>(),
            db.prepare('SELECT email,enabled FROM notification_preferences WHERE owner=?').bind(owner).all<{ email: string; enabled: number }>(),
            db.prepare('SELECT id,introduction_id AS introductionId,title,status,created FROM notifications WHERE owner=? ORDER BY created,id').bind(owner).all(),
            db.prepare('SELECT m.profile_id AS profileId,m.hidden,m.reason,m.updated FROM profile_moderation m INNER JOIN profiles p ON p.id=m.profile_id WHERE p.owner=?').bind(owner).all<{ profileId: string; hidden: number; reason: string; updated: string }>(),
            db.prepare('SELECT status,requested_at,retention_until,reason,updated FROM account_closures WHERE owner=?').bind(owner).all(),
            db.prepare('SELECT id,name,query,filters,alerts_enabled,created FROM saved_searches WHERE owner=?').bind(owner).all(),
          ]);

        dataArchive = {
          ...dataArchive,
          profiles: userProfiles.results.map(r => ({
            id: r.id,
            kind: r.kind,
            listed: !!r.listed,
            version: r.version ?? 1,
            data: JSON.parse(r.data),
            updated: r.updated,
            progressUpdates: updates.results.filter(u => u.profileId === r.id),
            restriction: restrictions.results.filter(m => m.profileId === r.id).map(m => ({ ...m, hidden: !!m.hidden }))[0] ?? null,
          })),
          experiments: userExperiments.results.map(e => ({ ...e, plan: JSON.parse(e.plan), result: JSON.parse(e.result), shared: !!e.shared })),
          shortlist: userSaves.results,
          memberBlocks: userBlocks.results,
          memberReports: userReports.results,
          notificationPreferences: preferences.results.map(p => ({ ...p, enabled: !!p.enabled }))[0] ?? null,
          notifications: notices.results,
          savedSearches: searches.results,
          accountClosures: closures.results,
        };
      }

      if (chunk === 'all' || chunk === 'connections') {
        const [userIntros, notes, negotiations, events, nextSteps] = await Promise.all([
          db
            .prepare(
              "SELECT id,profile_id AS profileId,source_profile_id AS sourceProfileId,source_name AS sourceName,target_name AS targetName,sender_name AS senderName,message,status,created,updated,CASE WHEN sender=? THEN 'outgoing' ELSE 'incoming' END AS direction FROM introductions WHERE sender=? OR recipient=? ORDER BY created,id"
            )
            .bind(owner, owner, owner)
            .all<{ id: string; profileId: string; sourceProfileId: string | null; sourceName: string | null; targetName: string; senderName: string; message: string; status: string; created: string; updated: string; direction: string }>(),
          db
            .prepare(
              'SELECT m.id,m.introduction_id AS introductionId,m.sender_name AS senderName,m.body,m.created,CASE WHEN m.sender=? THEN 1 ELSE 0 END AS mine FROM messages m INNER JOIN introductions i ON i.id=m.introduction_id WHERE i.sender=? OR i.recipient=? ORDER BY m.created,m.id'
            )
            .bind(owner, owner, owner)
            .all<{ id: string; introductionId: string; senderName: string; body: string; created: string; mine: number }>(),
          db
            .prepare(
              'SELECT n.introduction_id AS introductionId,n.version,n.amount,n.terms,n.status,n.updated,CASE WHEN n.author=? THEN 1 ELSE 0 END AS mine FROM negotiations n INNER JOIN introductions i ON i.id=n.introduction_id WHERE i.sender=? OR i.recipient=?'
            )
            .bind(owner, owner, owner)
            .all<{ introductionId: string; version: number; amount: number; terms: string; status: string; updated: string; mine: number }>(),
          db
            .prepare(
              'SELECT e.id,e.introduction_id AS introductionId,e.version,e.author_name AS authorName,e.amount,e.terms,e.status,e.created,CASE WHEN e.author=? THEN 1 ELSE 0 END AS mine FROM negotiation_events e INNER JOIN introductions i ON i.id=e.introduction_id WHERE i.sender=? OR i.recipient=? ORDER BY e.created,e.id'
            )
            .bind(owner, owner, owner)
            .all<{ id: string; introductionId: string; version: number; authorName: string; amount: number; terms: string; status: string; created: string; mine: number }>(),
          db
            .prepare(
              'SELECT n.introduction_id AS introductionId,n.note,n.date,n.updated FROM connection_next_steps n INNER JOIN introductions i ON i.id=n.introduction_id WHERE n.owner=? AND (i.sender=? OR i.recipient=?)'
            )
            .bind(owner, owner, owner)
            .all<{ introductionId: string; note: string; date: string; updated: string }>(),
        ]);

        dataArchive = {
          ...dataArchive,
          connections: userIntros.results.map(i => ({
            ...i,
            messages: notes.results.filter(m => m.introductionId === i.id).map(m => ({ ...m, mine: !!m.mine })),
            negotiation: negotiations.results.filter(n => n.introductionId === i.id).map(n => ({ ...n, mine: !!n.mine }))[0] ?? null,
            negotiationHistory: events.results.filter(e => e.introductionId === i.id).map(e => ({ ...e, mine: !!e.mine })),
            nextStep: nextSteps.results.find(ns => ns.introductionId === i.id) ?? null,
          })),
        };
      }

      return json({ dataArchive, ...(await state(owner)) }, 200, {
        'X-Request-Id': requestId,
        'Server-Timing': timer.header(),
      });
    }

    let savedProfileId: string | undefined;

    if (a.action === 'profile') {
      if (a.profileId) {
        const current = await db.prepare('SELECT p.data,p.listed,COALESCE(v.version,1) AS version FROM profiles p LEFT JOIN profile_versions v ON v.profile_id=p.id WHERE p.id=? AND p.owner=? AND p.kind=?').bind(a.profileId,owner,a.profile.kind).first<{data:string; listed:number; version:number}>();
        if(!current) return json({error:'This idea or profile is unavailable. You can edit only your own entries.'},404,timingHeaders);
        if(a.expectedVersion === undefined || current.version !== a.expectedVersion) return await replay() ?? json({error:'This profile changed or was opened before version checks were available. Load its latest version before saving.',conflict:true,currentVersion:current.version},409,timingHeaders);
        const event=crypto.randomUUID();
        const summary=a.changeSummary || computeChangeSummary(JSON.parse(current.data),a.profile);
        const {result,replayed}=await atomic([
          db.prepare(`UPDATE profiles SET data=?,listed=?,updated=? WHERE id=? AND owner=? AND kind=? AND COALESCE((SELECT version FROM profile_versions WHERE profile_id=profiles.id),1)=? AND ${guard.sql}`).bind(JSON.stringify(a.profile),a.listed?1:0,now,a.profileId,owner,a.profile.kind,a.expectedVersion,...guard.values),
          db.prepare(`INSERT INTO profile_versions(profile_id,version,last_operation,updated) SELECT ?,?,?,? WHERE changes()=1 ON CONFLICT(profile_id) DO UPDATE SET version=excluded.version,last_operation=excluded.last_operation,updated=excluded.updated`).bind(a.profileId,current.version+1,event,now),
          ...(a.profile.kind==='startup'?[ideaRevisionStatement(db,a.profileId,current.version,current.data,current.listed,summary,owner,now,event),pruneIdeaRevisionsStatement(db,a.profileId)]:[]),
        ],{savedProfileId:a.profileId},'SELECT 1 FROM profile_versions WHERE profile_id=? AND last_operation=?',[a.profileId,event]);
        if(replayed) return replayed;
        if(!result.meta.changes) return json({error:'This profile changed. Load the latest version before saving.',conflict:true},409,timingHeaders);
        savedProfileId=a.profileId;
      } else {
        const ideaQuota=await consumeAtomicDailyQuota(db,owner,'ideas',10,now);
        if(!ideaQuota.allowed) return await replay() ?? json({error:"You've reached today's limit for creating ideas (10). Try again tomorrow."},429,timingHeaders);
        const id=crypto.randomUUID();
        const {result,replayed}=await atomic([
          db.prepare(`INSERT INTO profiles(id,owner,kind,data,listed,updated) SELECT ?,?,?,?,?,? WHERE (NOT EXISTS(SELECT 1 FROM profiles WHERE owner=? AND kind<>?) OR EXISTS(SELECT 1 FROM profiles WHERE owner=? AND kind=?)) AND (?='startup' OR NOT EXISTS(SELECT 1 FROM profiles WHERE owner=? AND kind='investor')) AND ${guard.sql} ON CONFLICT DO NOTHING`).bind(id,owner,a.profile.kind,JSON.stringify(a.profile),a.listed?1:0,now,owner,a.profile.kind,owner,a.profile.kind,a.profile.kind,owner,...guard.values),
          db.prepare('INSERT INTO profile_versions(profile_id,version,last_operation,updated) SELECT ?,1,?,? WHERE changes()=1 ON CONFLICT(profile_id) DO NOTHING').bind(id,operation?.token??'',now),
        ],{savedProfileId:id},'SELECT 1 FROM profiles WHERE id=? AND owner=?',[id,owner]);
        if(replayed) return replayed;
        if(!result.meta.changes) return json({error:'Your account uses one role: founder or investor. Founders can add multiple ideas; investors can edit their existing profile.'},409,timingHeaders);
        savedProfileId=id;
      }
    }

    if (a.action === 'progress' || a.action === 'removeProgress') {
      const own = await db.prepare("SELECT id FROM profiles WHERE id=? AND owner=? AND kind='startup'").bind(a.profileId, owner).first();
      if (!own) return json({ error: 'Only the founder who owns this profile can change its updates.' }, 404, timingHeaders);

      if (a.action === 'progress') {
        const updateId=crypto.randomUUID();
        const {result,replayed}=await atomic([
          db.prepare(`INSERT INTO progress_updates(id,profile_id,date,title,body,created) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM progress_updates WHERE profile_id=?)<20 AND EXISTS(SELECT 1 FROM profiles WHERE id=? AND owner=? AND kind='startup') AND ${guard.sql}`).bind(updateId,a.profileId,a.date,a.title,a.body,now,a.profileId,a.profileId,owner,...guard.values),
        ],{updateId},'SELECT 1 FROM progress_updates WHERE id=? AND profile_id=?',[updateId,a.profileId]);
        if(replayed) return replayed;
        if(!result.meta.changes) return json({error:'This profile has 20 updates or is unavailable. Remove an old update before adding another.'},400,timingHeaders);
      } else {
        const result = await db.prepare('DELETE FROM progress_updates WHERE id=? AND profile_id=?').bind(a.updateId, a.profileId).run();
        if (!result.meta.changes) return json({ error: 'This update is unavailable.' }, 404, timingHeaders);
      }
      await db.prepare('UPDATE profiles SET updated=? WHERE id=? AND owner=?').bind(now, a.profileId, owner).run();
    }

    if (a.action === 'block' || a.action === 'report' || a.action === 'blockConnection' || a.action === 'reportConnection') {
      if (a.action === 'block' && !a.blocked) {
        await db.prepare('DELETE FROM member_blocks WHERE owner=? AND profile_id=?').bind(owner, a.profileId).run();
        return json(await state(owner), 200, timingHeaders);
      }

      let target: { id: string; owner: string; name: string } | null = null;
      if (a.action === 'blockConnection' || a.action === 'reportConnection') {
        const intro = await db
          .prepare("SELECT sender,recipient,sender_name,target_name FROM introductions WHERE id=? AND status='accepted' AND recipient IS NOT NULL AND (sender=? OR recipient=?)")
          .bind(a.id, owner, owner)
          .first<{ sender: string; recipient: string; sender_name: string; target_name: string }>();
        if (intro) target = { id: `connection:${a.id}`, owner: intro.sender === owner ? intro.recipient : intro.sender, name: intro.sender === owner ? intro.target_name : intro.sender_name };
      } else {
        const stored = await db
          .prepare(
            `SELECT p.* FROM profiles p WHERE p.id=? AND ((p.listed=1 AND NOT EXISTS (SELECT 1 FROM profile_moderation m WHERE m.profile_id=p.id AND m.hidden=1)) OR EXISTS (SELECT 1 FROM introductions i WHERE i.status='accepted' AND (i.profile_id=p.id OR i.source_profile_id=p.id) AND ((i.sender=? AND i.recipient=p.owner) OR (i.recipient=? AND i.sender=p.owner))))`
          )
          .bind(a.profileId, owner, owner)
          .first<Stored>();
        if (stored) target = { id: stored.id, owner: stored.owner, name: profile(stored).name };
      }

      if (!target) return json({ error: 'This member profile is unavailable.' }, 404, timingHeaders);
      if (target.owner === owner) return json({ error: 'You cannot report or block your own profile.' }, 400, timingHeaders);

      if (a.action === 'block' || a.action === 'blockConnection') {
        if (!a.blocked) {
          await db.prepare('DELETE FROM member_blocks WHERE owner=? AND target_owner=?').bind(owner, target.owner).run();
          return json(await state(owner), 200, timingHeaders);
        }
        const result = await db
          .prepare(
            'INSERT INTO member_blocks (owner,target_owner,profile_id,target_name,created) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM member_blocks WHERE owner=?)<100 ON CONFLICT(owner,target_owner) DO NOTHING'
          )
          .bind(owner, target.owner, target.id, target.name, now, owner)
          .run();
        if (!result.meta.changes && !(await db.prepare('SELECT 1 FROM member_blocks WHERE owner=? AND target_owner=?').bind(owner, target.owner).first())) {
          return json({ error: 'Your block list is full. Unblock a member before adding another.' }, 400, timingHeaders);
        }
        await db.batch([
          db.prepare('DELETE FROM saves WHERE (owner=? AND profile_id IN (SELECT id FROM profiles WHERE owner=?)) OR (owner=? AND profile_id IN (SELECT id FROM profiles WHERE owner=?))').bind(owner, target.owner, target.owner, owner),
          db.prepare("UPDATE notifications SET status='skipped' WHERE status='pending' AND introduction_id IN (SELECT id FROM introductions WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?))").bind(owner, target.owner, target.owner, owner),
        ]);
      } else {
        const reportQuota = await consumeAtomicDailyQuota(db, owner, 'reports', 10, now);
        if (!reportQuota.allowed) {
          return json({ error: "You've reached today's report limit. Try again tomorrow." }, 429, timingHeaders);
        }
        const result = await db
          .prepare("INSERT INTO member_reports (id,owner,target_owner,profile_id,reason,details,status,created) SELECT ?,?,?,?,?,?,'submitted',? WHERE (SELECT COUNT(*) FROM member_reports WHERE owner=? AND created>?)<10")
          .bind(crypto.randomUUID(), owner, target.owner, target.id, a.reason, a.details, now, owner, new Date(Date.now() - 86400000).toISOString())
          .run();
        if (!result.meta.changes) return json({ error: "You've reached today's report limit. Try again tomorrow." }, 429, timingHeaders);
      }
    }

    if (a.action === 'save' || a.action === 'request') {
      const seed = seedProfiles.find(p => p.id === a.profileId),
        stored = seed
          ? null
          : await db
              .prepare('SELECT p.* FROM profiles p WHERE id=? AND listed=1 AND NOT EXISTS (SELECT 1 FROM profile_moderation m WHERE m.profile_id=p.id AND m.hidden=1)')
              .bind(a.profileId)
              .first<Stored>();

      if ((!seed && !stored || stored && (await membersBlocked(owner, stored.owner))) && !(a.action === 'save' && !a.saved)) {
        return json({ error: 'This profile is no longer available.' }, 404, timingHeaders);
      }

      if (a.action === 'save') {
        if (a.saved) {
          const count = await db.prepare('SELECT COUNT(*) AS n FROM saves WHERE owner=?').bind(owner).first<{ n: number }>();
          if ((count?.n ?? 0) >= 200) return json({ error: 'Your shortlist is full. Remove a saved profile first.' }, 400, timingHeaders);
          await db
            .prepare(
              'INSERT INTO saves (owner,profile_id,created) SELECT ?,?,? WHERE NOT EXISTS (SELECT 1 FROM profile_moderation m WHERE m.profile_id=? AND m.hidden=1) AND (?=1 OR EXISTS (SELECT 1 FROM profiles p WHERE p.id=? AND p.listed=1)) ON CONFLICT(owner,profile_id) DO NOTHING'
            )
            .bind(owner, a.profileId, now, a.profileId, seed ? 1 : 0, a.profileId)
            .run();
        } else {
          await db.prepare('DELETE FROM saves WHERE owner=? AND profile_id=?').bind(owner, a.profileId).run();
        }
      } else {
        if (stored?.owner === owner) return json({ error: 'You cannot request an introduction to your own profile.' }, 400, timingHeaders);
        const source = a.sourceProfileId
          ? await db
              .prepare(
                "SELECT p.* FROM profiles p WHERE p.id=? AND p.owner=? AND p.kind='startup' AND p.listed=1 AND NOT EXISTS (SELECT 1 FROM profile_moderation m WHERE m.profile_id=p.id AND m.hidden=1)"
              )
              .bind(a.sourceProfileId, owner)
              .first<Stored>()
          : null;
        if (a.sourceProfileId && !source) return json({ error: 'Choose one of your public, available ideas before sending this request.' }, 404, timingHeaders);

        const target = seed ?? profile(stored!),
          existing = await db.prepare("SELECT id,status FROM introductions WHERE sender=? AND profile_id=? AND coalesce(source_profile_id,'')=?").bind(owner, a.profileId, a.sourceProfileId ?? '').first();
        if (existing) return await replay() ?? json({ error: 'You already have a request for this profile and idea. Find it in Connections.' }, 409, timingHeaders);

        const inviteQuota = await consumeAtomicDailyQuota(db, owner, 'invitations', 20, now);
        if (!inviteQuota.allowed) {
          return await replay() ?? json({ error: "You've reached today's request limit. Try again tomorrow." }, 429, timingHeaders);
        }

        const count = await db.prepare('SELECT COUNT(*) AS n FROM introductions WHERE sender=? AND created>?').bind(owner, new Date(Date.now() - 86400000).toISOString()).first<{ n: number }>();
        if ((count?.n ?? 0) >= 20) return await replay() ?? json({ error: "You've reached today's request limit. Try again tomorrow." }, 429, timingHeaders);

        const introductionId = crypto.randomUUID();
        const write = db
          .prepare(
            `INSERT INTO introductions (id,sender,recipient,profile_id,source_profile_id,source_name,target_name,sender_name,message,status,created,updated)
             SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM member_blocks WHERE (owner=? AND target_owner=?) OR (owner=? AND target_owner=?))
             AND NOT EXISTS (SELECT 1 FROM profile_moderation m WHERE m.profile_id=? AND m.hidden=1)
             AND (?=1 OR EXISTS (SELECT 1 FROM profiles p WHERE p.id=? AND p.listed=1))
             AND (? IS NULL OR EXISTS (SELECT 1 FROM profiles p WHERE p.id=? AND p.owner=? AND p.kind='startup' AND p.listed=1 AND NOT EXISTS (SELECT 1 FROM profile_moderation m WHERE m.profile_id=p.id AND m.hidden=1)))
             AND ${guard.sql} ON CONFLICT DO NOTHING`
          )
          .bind(
            introductionId,
            owner,
            stored?.owner ?? null,
            target.id,
            source?.id ?? null,
            source ? profile(source).name : null,
            target.name,
            user.displayName.slice(0, 120),
            a.message,
            seed ? 'draft' : 'pending',
            now,
            now,
            owner,
            stored?.owner ?? null,
            stored?.owner ?? null,
            owner,
            a.profileId,
            seed ? 1 : 0,
            a.profileId,
            source?.id ?? null,
            source?.id ?? null,
            owner,
            ...guard.values
          );

        const {result,replayed}=await atomic([write,...notificationStatements(stored?.owner??null,introductionId,'You have a new introduction request')],{introductionId},'SELECT 1 FROM introductions WHERE id=? AND sender=?',[introductionId,owner]);
        if(replayed) return replayed;
        if (!result.meta.changes) {
          if (await db.prepare("SELECT 1 FROM introductions WHERE sender=? AND profile_id=? AND coalesce(source_profile_id,'')=?").bind(owner, a.profileId, a.sourceProfileId ?? '').first()) {
            return json({ error: 'You already have a request for this profile and idea. Find it in Connections.' }, 409, timingHeaders);
          }
          return json({ error: 'This member connection or selected idea is unavailable.' }, 403, timingHeaders);
        }
      }
    }

    if (a.action === 'respond' || a.action === 'message') {
      const intro = await db.prepare('SELECT * FROM introductions WHERE id=? AND (sender=? OR recipient=?)').bind(a.id, owner, owner).first<RequestRow>();
      if (!intro) return json({ error: 'This conversation is unavailable.' }, 404, timingHeaders);
      const other = intro.sender === owner ? intro.recipient : intro.sender;
      if (await membersBlocked(owner, other)) return json({ error: 'This member is blocked. New requests, messages and proposals are disabled.' }, 403, timingHeaders);

      if (a.action === 'respond') {
        if (intro.status !== 'pending') return json({ error: 'This request is no longer pending.' }, 409, timingHeaders);
        if (a.status === 'withdrawn' ? intro.sender !== owner : intro.recipient !== owner) return json({ error: 'You cannot change this request.' }, 403, timingHeaders);

        const [result] = await db.batch([
          db
            .prepare("UPDATE introductions SET status=?,updated=? WHERE id=? AND status='pending' AND NOT EXISTS (SELECT 1 FROM member_blocks WHERE (owner=? AND target_owner=?) OR (owner=? AND target_owner=?))")
            .bind(a.status, now, a.id, owner, other, other, owner),
          ...notificationStatements(other, a.id, 'Your introduction request has an update'),
        ]);
        if (!result.meta.changes) return json({ error: 'The request changed. Reload to see its status.' }, 409, timingHeaders);
      } else {
        if (intro.status !== 'accepted') return json({ error: 'Both parties must accept before messaging.' }, 403, timingHeaders);

        const messageId=crypto.randomUUID();
        const {result,replayed}=await atomic([
          db.prepare(`INSERT INTO messages(id,introduction_id,sender,sender_name,body,created) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM messages WHERE introduction_id=?)<100 AND EXISTS(SELECT 1 FROM introductions WHERE id=? AND status='accepted' AND (sender=? OR recipient=?)) AND NOT EXISTS(SELECT 1 FROM member_blocks WHERE (owner=? AND target_owner=?) OR (owner=? AND target_owner=?)) AND ${guard.sql}`).bind(messageId,a.id,owner,user.displayName.slice(0,120),a.body,now,a.id,a.id,owner,owner,owner,other,other,owner,...guard.values),
          ...notificationStatements(other,a.id,'You have a new connection message'),
        ],{messageId},'SELECT 1 FROM messages WHERE id=? AND sender=?',[messageId,owner]);
        if(replayed) return replayed;
        if (!result.meta.changes) return json({ error: 'Messaging is unavailable or this conversation has reached its message limit.' }, 400, timingHeaders);
      }
    }

    const responsePayload = {
      ...(await state(owner, a.action === 'save' || a.action === 'request' ? a.profileId : undefined)),
      ...(savedProfileId ? { savedProfileId } : {}),
    };

    timer.mark('complete');
    return json(responsePayload, 200, { 'X-Request-Id': requestId, 'Server-Timing': timer.header() });
  } catch (e) {
    logSafeError('Workspace write failed', e, { requestId });
    return json({ error: "We couldn't save that change. Your input is still here; please retry." }, 503, timingHeaders);
  }
}
