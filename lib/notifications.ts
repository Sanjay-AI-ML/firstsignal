import { env } from 'cloudflare:workers';
import { database } from './database';
const config = () => env as unknown as Record<string, string>;
const AGE = 23 * 60 * 60 * 1000, ATTEMPTS = 5;
const titles = { introduction: 'You have a new introduction request', response: 'Your introduction request has an update', message: 'You have a new connection message', proposal: 'A new private proposal is ready to review', decision: 'Your private proposal has a response' } as const;
type Kind = keyof typeof titles | 'legacy';
type Member = { userId: string; email: string; emailVerified: boolean };
type Email = { id: string; owner: string; introduction_id: string; title: string; created: string; kind: Kind; state: string; recipient: string; request_body: string; consent_version: string; attempts: number; first_attempt_at: string; lease_token: string; email: string; enabled: number; current_consent: string; provider_id: string };
export type DispatchCounts = { processed: number; submitted: number; retrying: number; skipped: number; failed: number; expired: number };
const counts = (): DispatchCounts => ({ processed: 0, submitted: 0, retrying: 0, skipped: 0, failed: 0, expired: 0 });
const iso = () => new Date().toISOString();
const normalize = (email: string) => email.trim().toLowerCase();
const kindFor = (title: string): Kind => (Object.entries(titles).find(([, value]) => value === title)?.[0] as Kind) ?? 'legacy';
const due = "(e.state IN ('pending','retry') AND e.next_attempt_at<=? OR e.state='sending' AND e.lease_until<=?)";
// Repeat this predicate inside the atomic claim and immediately before sending.
const eligible = `(p.enabled=1 AND p.email<>'' AND e.consent_version=coalesce(c.consent_version,'')
 AND (e.recipient='' OR lower(e.recipient)=lower(p.email))
 AND (c.suppressed_email IS NULL OR lower(c.suppressed_email)<>lower(p.email))
 AND i.recipient IS NOT NULL AND (i.sender=n.owner OR i.recipient=n.owner)
 AND ((e.kind='introduction' AND i.recipient=n.owner AND i.status='pending')
 OR (e.kind='response' AND i.status IN ('accepted','declined','withdrawn'))
 OR (e.kind IN ('message','proposal','decision') AND i.status='accepted'))
 AND NOT EXISTS (SELECT 1 FROM member_blocks b WHERE (b.owner=i.sender AND b.target_owner=i.recipient) OR (b.owner=i.recipient AND b.target_owner=i.sender)))`;
const joins = `FROM notifications n JOIN notification_emails e ON e.notification_id=n.id JOIN introductions i ON i.id=n.introduction_id LEFT JOIN notification_preferences p ON p.owner=n.owner LEFT JOIN notification_email_controls c ON c.owner=n.owner`;
const historicSuppression = `EXISTS(SELECT 1 FROM notification_emails se JOIN notifications sn ON sn.id=se.notification_id LEFT JOIN notification_email_events sv ON sv.notification_id=se.notification_id WHERE sn.owner=? AND lower(se.recipient)=lower(?) AND (se.state IN('bounced','complained','suppressed') OR sv.type IN('email.bounced','email.complained','email.suppressed')))`;

export function emailConfigured() {
  const e = config();
  try { const origin=new URL(e.FIRSTSIGNAL_ORIGIN);return !!(e.RESEND_API_KEY && e.CLERK_SECRET_KEY && e.EMAIL_FROM && !/[\r\n]/.test(e.EMAIL_FROM) && origin.protocol === 'https:' && origin.origin===e.FIRSTSIGNAL_ORIGIN && !origin.hostname.endsWith('.invalid')); } catch { return false; }
}
export function notificationDeliveryReadiness() {
  const e = config();
  const length=e.NOTIFICATION_DISPATCH_SECRET?.length ?? 0;
  return { emailConfigured: emailConfigured(), emailAutomationConfigured: length >= 32 && length <= 256, emailReceiptsConfigured: !!e.RESEND_WEBHOOK_SECRET };
}
function queueStatements(owner: string | null,introduction:string,title:string,kind:Kind,guard:boolean){
  if(!owner)return [];
  const id = crypto.randomUUID(), now = iso(), db = database();
  const safeKind = kind !== 'legacy' && titles[kind] === title ? kind : kindFor(title);
  return [
      db.prepare(`INSERT INTO notifications(id,owner,introduction_id,title,status,created) SELECT ?,?,?,?,'pending',? WHERE ${guard?'changes()=1 AND ':''}EXISTS (SELECT 1 FROM introductions i WHERE i.id=? AND i.recipient IS NOT NULL AND (i.sender=? OR i.recipient=?) AND NOT EXISTS(SELECT 1 FROM member_blocks b WHERE (b.owner=i.sender AND b.target_owner=i.recipient) OR (b.owner=i.recipient AND b.target_owner=i.sender)))`).bind(id, owner, introduction, title.slice(0, 200), now, introduction, owner, owner),
      db.prepare(`INSERT INTO notification_emails(notification_id,kind,state,consent_version,created,updated) SELECT n.id,?,CASE WHEN p.enabled=1 AND ?<>'legacy' THEN 'pending' ELSE 'skipped' END,coalesce(c.consent_version,''),?,? FROM notifications n LEFT JOIN notification_preferences p ON p.owner=n.owner LEFT JOIN notification_email_controls c ON c.owner=n.owner WHERE n.id=?`).bind(safeKind, safeKind, now, now, id),
      db.prepare("UPDATE notifications SET status=(SELECT state FROM notification_emails WHERE notification_id=?) WHERE id=?").bind(id, id),
    ];
}
/** Append immediately after the guarded business mutation/history in the same D1 batch. */
export function notificationStatements(owner:string|null,introduction:string,title:string,kind:Kind=kindFor(title)){
  return queueStatements(owner,introduction,title,kind,true);
}
/** Standalone queue only; business actions use notificationStatements atomically. */
export async function notify(owner:string|null,introduction:string,title:string,kind:Kind=kindFor(title)){
  if(!owner)return;
  try {await database().batch(queueStatements(owner,introduction,title,kind,false));}
  catch {console.error('Connection notification could not be queued');}
}
export async function setNotificationPreferences(user: Member, enabled: boolean) {
  if (enabled && (!user.emailVerified || !user.email)) return { error: 'Confirm your primary email address through sign-in before enabling email updates.', status: 400 };
  const db = database(), now = iso(), email = user.email.trim(), owner = user.userId;
  const old = await db.prepare('SELECT email,enabled FROM notification_preferences WHERE owner=?').bind(owner).first<{ email: string; enabled: number }>();
  const control = await db.prepare('SELECT suppressed_email FROM notification_email_controls WHERE owner=?').bind(owner).first<{ suppressed_email: string }>();
  const suppressed = enabled && await db.prepare(`SELECT 1 WHERE ${historicSuppression}`).bind(owner,email).first();
  if (enabled && (suppressed || (control?.suppressed_email && normalize(control.suppressed_email) === normalize(email)))) return { error: 'Email updates stopped because this address bounced or reported unwanted email. Use a different verified primary email address before enabling updates.', status: 409 };
  if (old && old.enabled === Number(enabled) && normalize(old.email) === normalize(email)) return null;
  const consent=crypto.randomUUID();
  const result = await db.batch([
    db.prepare(`INSERT INTO notification_preferences(owner,email,enabled) SELECT ?,?,? WHERE ?=0 OR (NOT EXISTS(SELECT 1 FROM notification_email_controls WHERE owner=? AND lower(suppressed_email)=lower(?)) AND NOT ${historicSuppression}) ON CONFLICT(owner) DO UPDATE SET email=excluded.email,enabled=excluded.enabled`).bind(owner, email, Number(enabled), Number(enabled), owner, email, owner,email),
    db.prepare(`INSERT INTO notification_email_controls(owner,consent_version,updated) SELECT ?,?,? WHERE changes()=1 ON CONFLICT(owner) DO UPDATE SET consent_version=excluded.consent_version,suppressed_email=CASE WHEN lower(suppressed_email)<>lower(?) THEN '' ELSE suppressed_email END,suppression_reason=CASE WHEN lower(suppressed_email)<>lower(?) THEN '' ELSE suppression_reason END,updated=excluded.updated`).bind(owner, consent, now, email, email),
    db.prepare("UPDATE notification_emails SET state='skipped',last_error='preference_changed',updated=? WHERE notification_id IN(SELECT id FROM notifications WHERE owner=?) AND state IN('pending','retry') AND EXISTS(SELECT 1 FROM notification_email_controls WHERE owner=? AND consent_version=?)").bind(now, owner,owner,consent),
    db.prepare("UPDATE notifications SET status='skipped' WHERE owner=? AND status IN('pending','retry') AND EXISTS(SELECT 1 FROM notification_email_controls WHERE owner=? AND consent_version=?)").bind(owner,owner,consent),
  ]);
  if (!result[0].meta.changes) return { error: 'Email settings changed while saving. Refresh and try again.', status: 409 };
  return null;
}
export async function notificationSettings(user: Member) {
  const db = database();
  const pref = await db.prepare('SELECT email,enabled FROM notification_preferences WHERE owner=?').bind(user.userId).first<{ email: string; enabled: number }>();
  const control = await db.prepare('SELECT suppressed_email FROM notification_email_controls WHERE owner=?').bind(user.userId).first<{ suppressed_email: string }>();
  const notices = await db.prepare(`SELECT n.id,n.introduction_id,n.title,coalesce(e.state,n.status) AS status,n.created FROM notifications n LEFT JOIN notification_emails e ON e.notification_id=n.id WHERE n.owner=? ORDER BY n.created DESC,n.id DESC LIMIT 30`).bind(user.userId).all();
  const current = !!(user.emailVerified && user.email && pref && normalize(pref.email) === normalize(user.email));
  const suppressed = !!await db.prepare(`SELECT 1 WHERE ${historicSuppression}`).bind(user.userId,user.email).first();
  return { ...notificationDeliveryReadiness(), emailOptedIn:!!pref?.enabled,emailEnabled: !!pref?.enabled && current && !suppressed, emailAddress: user.email, emailVerified: user.emailVerified, emailAddressChanged: !!pref?.enabled && !current, emailSuppressed: suppressed || !!control?.suppressed_email && normalize(control.suppressed_email) === normalize(user.email), notifications: notices.results };
}
// Reconcile recognized, pending legacy notices; never resubmit old submitted rows.
async function reconcile(owner?: string) {
  const db = database(), now = iso();
  const kind = `CASE n.title ${Object.entries(titles).map(([key, value]) => `WHEN '${value}' THEN '${key}'`).join(' ')} ELSE 'legacy' END`;
  await db.prepare(`INSERT OR IGNORE INTO notification_emails(notification_id,kind,state,consent_version,created,updated) SELECT n.id,${kind},CASE WHEN p.enabled=1 AND ${kind}<>'legacy' THEN 'pending' ELSE 'skipped' END,coalesce(c.consent_version,''),n.created,? FROM notifications n LEFT JOIN notification_preferences p ON p.owner=n.owner LEFT JOIN notification_email_controls c ON c.owner=n.owner WHERE n.status='pending' ${owner ? 'AND n.owner=?' : ''} AND NOT EXISTS(SELECT 1 FROM notification_emails e WHERE e.notification_id=n.id) ORDER BY n.created LIMIT 100`).bind(now, ...(owner ? [owner] : [])).run();
}
async function verifiedPrimary(owner: string): Promise<string | null> {
  if (!/^clerk:user_[A-Za-z0-9]+$/.test(owner)) return null;
  const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(owner.slice(6))}`, { headers: { Authorization: `Bearer ${config().CLERK_SECRET_KEY}` }, signal: AbortSignal.timeout(5000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('identity_unavailable');
  const user = await response.json() as { id?: string; banned?: boolean; locked?: boolean; primary_email_address_id?: string; email_addresses?: { id: string; email_address: string; verification?: { status?: string } }[] };
  if (user.id !== owner.slice(6) || user.banned || user.locked) return null;
  return user.email_addresses?.find(address => address.id === user.primary_email_address_id && address.verification?.status === 'verified')?.email_address || null;
}
async function finish(id: string, token: string, state: string, error = '', provider = '', next = '') {
  const db = database();
  await db.batch([
    db.prepare(`UPDATE notification_emails SET state=?,last_error=?,provider_id=CASE WHEN ?<>'' THEN ? ELSE provider_id END,next_attempt_at=?,lease_token='',lease_until='',updated=? WHERE notification_id=? AND lease_token=? AND state='sending'`).bind(state, error, provider, provider, next, iso(), id, token),
    db.prepare('UPDATE notifications SET status=(SELECT state FROM notification_emails WHERE notification_id=?) WHERE id=?').bind(id, id),
  ]);
}
const requestBody = (row: Email) => JSON.stringify({ from: config().EMAIL_FROM, to: [row.email], subject: titles[row.kind as keyof typeof titles], text: `${titles[row.kind as keyof typeof titles]}\n\nOpen FindIn to review your private connection:\n${new URL('/app', config().FIRSTSIGNAL_ORIGIN).href}#introductions\n\nNo message content or proposal terms are included in email. Proposals are non-binding. Manage email notifications in My profile.` });
export async function dispatchNotifications(owner: string, maximum = 1): Promise<DispatchCounts> {
  const total = counts(); if (!emailConfigured()) return total;
  const db = database(); await reconcile(owner);
  const now = iso(), cutoff = new Date(Date.now() - AGE).toISOString();
  const rows = await db.prepare(`SELECT n.id,n.owner,n.introduction_id,n.title,n.created,e.*,p.email,p.enabled,coalesce(c.consent_version,'') AS current_consent FROM notifications n JOIN notification_emails e ON e.notification_id=n.id LEFT JOIN notification_preferences p ON p.owner=n.owner LEFT JOIN notification_email_controls c ON c.owner=n.owner WHERE n.owner=? AND ${due} ORDER BY n.created,n.id LIMIT ?`).bind(owner, now, now, Math.max(1, Math.min(3, maximum))).all<Email>();
  for (const row of rows.results) {
    total.processed++;
    if (row.created <= cutoff || row.attempts >= ATTEMPTS) {
      const state = row.created <= cutoff ? 'expired' : 'failed';
      await db.batch([db.prepare(`UPDATE notification_emails SET state=?,last_error=?,updated=? WHERE notification_id=? AND ${due.replaceAll('e.', '')}`).bind(state, state === 'expired' ? 'retry_window_ended' : 'attempt_limit', iso(), row.id, now, now), db.prepare('UPDATE notifications SET status=(SELECT state FROM notification_emails WHERE notification_id=?) WHERE id=?').bind(row.id, row.id)]);
      total[state]++; continue;
    }
    if (!await db.prepare(`SELECT n.id ${joins} WHERE n.id=? AND n.owner=? AND ${eligible}`).bind(row.id, owner).first()) {
      await db.batch([db.prepare(`UPDATE notification_emails SET state='skipped',last_error='permission_changed',updated=? WHERE notification_id=? AND ${due.replaceAll('e.', '')}`).bind(iso(), row.id, now, now), db.prepare('UPDATE notifications SET status=(SELECT state FROM notification_emails WHERE notification_id=?) WHERE id=?').bind(row.id, row.id)]); total.skipped++; continue;
    }
    const token = crypto.randomUUID(), body = row.request_body || requestBody(row);
    const claim = await db.prepare(`UPDATE notification_emails SET state='sending',lease_token=?,lease_until=?,attempts=attempts+1,first_attempt_at=CASE WHEN first_attempt_at='' THEN ? ELSE first_attempt_at END,recipient=CASE WHEN recipient='' THEN ? ELSE recipient END,request_body=CASE WHEN request_body='' THEN ? ELSE request_body END,updated=? WHERE notification_id=? AND ${due.replaceAll('e.', '')} AND EXISTS(SELECT 1 ${joins} WHERE n.id=? AND n.owner=? AND ${eligible})`).bind(token, new Date(Date.now() + 60000).toISOString(), now, row.email, body, now, row.id, now, now, row.id, owner).run();
    if (!claim.meta.changes) continue;
    try {
      const primary = await verifiedPrimary(owner);
      if (!primary || normalize(primary) !== normalize(row.email) || (row.recipient && normalize(primary) !== normalize(row.recipient))) {
        await db.prepare("UPDATE notification_preferences SET enabled=0 WHERE owner=? AND lower(email)=lower(?) AND coalesce((SELECT consent_version FROM notification_email_controls WHERE owner=?),'')=?").bind(owner, row.email,owner,row.consent_version).run();
        await finish(row.id, token, 'skipped', 'primary_email_changed'); total.skipped++; continue;
      }
      if (!await db.prepare(`SELECT n.id ${joins} WHERE n.id=? AND n.owner=? AND e.lease_token=? AND e.state='sending' AND ${eligible}`).bind(row.id, owner, token).first()) { await finish(row.id, token, 'skipped', 'permission_changed'); total.skipped++; continue; }
      const response = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(5000), headers: { Authorization: `Bearer ${config().RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `firstsignal-${row.id}` }, body });
      if (response.ok) {
        const receipt = await response.json() as { id?: string };
        if (!receipt.id || !/^[A-Za-z0-9_-]{1,200}$/.test(receipt.id)) throw new Error('receipt_unavailable');
        await finish(row.id, token, 'submitted', '', receipt.id); total.submitted++; continue;
      }
      let code = ''; try { code = ((await response.json()) as { name?: string }).name || ''; } catch { /* Never persist provider response bodies. */ }
      if (response.status < 500 && response.status !== 429 && !(response.status === 409 && code === 'concurrent_idempotent_requests')) { await finish(row.id, token, 'failed', `provider_${response.status}`); total.failed++; continue; }
      throw new Error('provider_temporarily_unavailable');
    } catch {
      const attempts = row.attempts + 1, state = attempts >= ATTEMPTS ? 'failed' : 'retry';
      const next = new Date(Date.now() + [60000, 300000, 1800000, 3600000][Math.min(attempts - 1, 3)]).toISOString();
      await finish(row.id, token, state, state === 'failed' ? 'attempt_limit' : 'temporary_delivery_failure', '', next);
      if (state === 'retry') total.retrying++; else total.failed++;
    }
  }
  return total;
}
export async function dispatchNotificationBatch(limit = 3) {
  if (!emailConfigured()) return { configured: false, error: 'Email delivery is not configured.' };
  const db = database(), now = iso(), token = crypto.randomUUID();
  const lease = await db.prepare(`INSERT INTO notification_dispatch_lease(id,token,expires,updated) VALUES('email',?,?,?) ON CONFLICT(id) DO UPDATE SET token=excluded.token,expires=excluded.expires,updated=excluded.updated WHERE notification_dispatch_lease.expires<=?`).bind(token, new Date(Date.now() + 90000).toISOString(), now, now).run();
  if (!lease.meta.changes) return { busy: true, error: 'A notification dispatch is already running.' };
  try {
    await reconcile();
    const owners = await db.prepare(`SELECT n.owner FROM notifications n JOIN notification_emails e ON e.notification_id=n.id WHERE ${due} GROUP BY n.owner ORDER BY min(n.created) LIMIT ?`).bind(now, now, Math.max(1, Math.min(3, limit))).all<{ owner: string }>();
    // Wait for every owner before releasing the shared lease, including failures.
    const results = await Promise.allSettled(owners.results.map(row => dispatchNotifications(row.owner, 3)));
    if(results.some(result=>result.status==='rejected'))throw new Error('Notification storage temporarily unavailable');
    const total = counts(); for (const result of results) if(result.status==='fulfilled')for (const key of Object.keys(total) as (keyof DispatchCounts)[]) total[key] += result.value[key];
    return { configured: true, busy: false, ...total };
  } finally { await db.prepare("DELETE FROM notification_dispatch_lease WHERE id='email' AND token=?").bind(token).run(); }
}
const eventStates: Record<string, string> = { 'email.sent': 'submitted', 'email.delivered': 'delivered', 'email.delivery_delayed': 'delayed', 'email.bounced': 'bounced', 'email.complained': 'complained', 'email.suppressed': 'suppressed', 'email.failed': 'failed' };
/** Only called after signature verification; stores identifiers, never the raw event. */
export async function recordNotificationReceipt(eventId: string, payload: unknown) {
  if (!payload || typeof payload !== 'object') return { status: 400, error: 'Invalid event.' };
  const value = payload as { type?: string; created_at?: string; data?: { email_id?: string } }, state = typeof value.type === 'string' && Object.hasOwn(eventStates,value.type) ? eventStates[value.type] : undefined;
  if (!state) return { status: 200, ignored: true };
  if (typeof value.data?.email_id !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(value.data.email_id) || typeof value.created_at !== 'string' || !Number.isFinite(Date.parse(value.created_at))) return { status: 400, error: 'Invalid email event.' };
  const db = database(), now = iso(), eventAt = new Date(value.created_at).toISOString();
  if (await db.prepare('SELECT id FROM notification_email_events WHERE id=?').bind(eventId).first()) return {status:200,received:true};
  if (eventAt > new Date(Date.now() + 300000).toISOString()) return { status: 400, error: 'Invalid event time.' };
  const row = await db.prepare('SELECT e.notification_id,e.recipient,n.owner FROM notification_emails e JOIN notifications n ON n.id=e.notification_id WHERE e.provider_id=?').bind(value.data.email_id).first<{ notification_id: string; recipient: string; owner: string }>();
  if (!row) return { status: 503, error: 'Email receipt is not ready. Retry later.' };
  const negative = ['bounced', 'complained', 'suppressed'].includes(state), sticky = "state IN ('bounced','complained','suppressed')";
  const statements = [
    db.prepare('INSERT OR IGNORE INTO notification_email_events(id,notification_id,provider_id,type,event_at,received) VALUES(?,?,?,?,?,?)').bind(eventId, row.notification_id, value.data.email_id, value.type, eventAt, now),
    db.prepare(`UPDATE notification_emails SET state=?,event_at=?,event_id=?,updated=? WHERE notification_id=? AND EXISTS(SELECT 1 FROM notification_email_events WHERE id=? AND received=?) AND (event_id<>? OR event_id='') AND (state<>'complained' OR ?='complained') AND (?=1 OR (NOT (${sticky}) AND event_at<=? AND (state<>'delivered' OR ?='delivered') AND (state<>'failed' OR ?='failed')))`)
      .bind(state, eventAt, eventId, now, row.notification_id, eventId, now, eventId, state, Number(negative), eventAt, state, state),
    db.prepare('UPDATE notifications SET status=(SELECT state FROM notification_emails WHERE notification_id=?) WHERE id=?').bind(row.notification_id, row.notification_id),
  ];
  if (negative) statements.push(
    db.prepare(`INSERT INTO notification_email_controls(owner,consent_version,suppressed_email,suppression_reason,updated) SELECT owner,?,email,?,? FROM notification_preferences WHERE owner=? AND lower(email)=lower(?) ON CONFLICT(owner) DO UPDATE SET suppressed_email=excluded.suppressed_email,suppression_reason=excluded.suppression_reason,updated=excluded.updated`).bind(crypto.randomUUID(), state, now, row.owner, row.recipient),
    db.prepare('UPDATE notification_preferences SET enabled=0 WHERE owner=? AND lower(email)=lower(?)').bind(row.owner, row.recipient),
    db.prepare("UPDATE notification_emails SET state='skipped',last_error='address_suppressed',updated=? WHERE notification_id IN(SELECT id FROM notifications WHERE owner=?) AND state IN('pending','retry') AND EXISTS(SELECT 1 FROM notification_preferences WHERE owner=? AND lower(email)=lower(?))").bind(now, row.owner, row.owner, row.recipient),
  );
  await db.batch(statements);
  return { status: 200, received: true };
}
