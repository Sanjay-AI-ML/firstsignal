import { getAppUser } from '../../auth';
import { database } from '@/lib/database';
import {
  experimentActionSchema, experimentLimits, experimentProfileIdSchema, projectExperiment,
  type StoredExperiment,
} from '@/lib/experiments';

export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
});
const unavailable = () => json({ error: 'This idea is unavailable.' }, 404);
const columns = 'e.id,e.profile_id,e.plan,e.result,e.status,e.shared,e.version,e.created,e.started_at,e.completed_at,e.updated';

async function ownedExperiments(profileId: string, owner: string) {
  const rows = await database().prepare(`SELECT ${columns} FROM idea_experiments e
    INNER JOIN profiles p ON p.id=e.profile_id
    WHERE p.id=? AND p.owner=? AND p.kind='startup'
    ORDER BY e.created DESC,e.id DESC LIMIT ?`).bind(profileId, owner, experimentLimits.perIdea).all<StoredExperiment>();
  return { experiments: rows.results.map(projectExperiment) };
}

export async function GET(request: Request) {
  try {
    const parsed = experimentProfileIdSchema.safeParse(new URL(request.url).searchParams.get('profile'));
    if (!parsed.success) return json({ error: 'Choose a valid idea to view its tests.' }, 400);
    const profileId = parsed.data, user = await getAppUser(), db = database();
    if (user && await db.prepare("SELECT id FROM profiles WHERE id=? AND owner=? AND kind='startup'").bind(profileId, user.userId).first()) {
      return json(await ownedExperiments(profileId, user.userId));
    }
    // Repeat visibility in the results query, so a concurrent unlisting or block
    // cannot expose results after the first existence check.
    const visibility = `p.id=? AND p.kind='startup' AND p.listed=1
      AND NOT EXISTS (SELECT 1 FROM profile_moderation m WHERE m.profile_id=p.id AND m.hidden=1)
      AND NOT EXISTS (SELECT 1 FROM member_blocks b WHERE (b.owner=? AND b.target_owner=p.owner) OR (b.owner=p.owner AND b.target_owner=?))`;
    const viewer = user?.userId ?? '';
    if (!await db.prepare(`SELECT p.id FROM profiles p WHERE ${visibility}`).bind(profileId, viewer, viewer).first()) return unavailable();
    const rows = await db.prepare(`SELECT ${columns} FROM idea_experiments e INNER JOIN profiles p ON p.id=e.profile_id
      WHERE ${visibility} AND e.status='complete' AND e.shared=1
      ORDER BY e.completed_at DESC,e.id DESC LIMIT ?`).bind(profileId, viewer, viewer, experimentLimits.perIdea).all<StoredExperiment>();
    return json({ experiments: rows.results.map(projectExperiment) });
  } catch {
    console.error('Idea tests read failed');
    return json({ error: 'Tests are temporarily unavailable. Please try again.' }, 503);
  }
}

// Content-Length is only a hint. Stop reading the actual stream at the byte
// limit, including requests that omit or understate their Content-Length.
async function boundedBody(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > experimentLimits.bodyBytes) return null;
  if (!request.body) return '';
  const reader = request.body.getReader(), decoder = new TextDecoder();
  let bytes = 0, text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > experimentLimits.bodyBytes) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}

export async function POST(request: Request) {
  try {
    const user = await getAppUser();
    if (!user) return json({ error: 'Sign in to manage your idea tests.' }, 401);
    if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Request origin could not be verified.' }, 403);
    const raw = await boundedBody(request);
    if (raw === null) return json({ error: 'This test is too large. Shorten the text and try again.' }, 413);
    let input: unknown;
    try { input = JSON.parse(raw); } catch { return json({ error: 'This request is invalid. Please try again.' }, 400); }
    const parsed = experimentActionSchema.safeParse(input);
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Check the test details.' }, 400);
    const action = parsed.data, owner = user.userId, db = database(), now = new Date().toISOString();
    const profile = await db.prepare("SELECT id FROM profiles WHERE id=? AND owner=? AND kind='startup'").bind(action.profileId, owner).first();
    if (!profile) return unavailable();

    if (action.action === 'create') {
      const result = await db.prepare(`INSERT INTO idea_experiments
        (id,profile_id,plan,result,status,shared,version,created,started_at,completed_at,updated)
        SELECT ?,p.id,?,'{}','draft',0,0,?,'','',? FROM profiles p
        WHERE p.id=? AND p.owner=? AND p.kind='startup'
        AND (SELECT COUNT(*) FROM idea_experiments e WHERE e.profile_id=p.id)<?`)
        .bind(crypto.randomUUID(), JSON.stringify(action.plan), now, now, action.profileId, owner, experimentLimits.perIdea).run();
      if (!result.meta.changes) return json({ error: 'This idea has reached its 50-test limit, or the idea changed. Remove an unused draft or refresh.' }, 409);
    } else {
      const row = await db.prepare(`SELECT e.id,e.status,e.version FROM idea_experiments e INNER JOIN profiles p ON p.id=e.profile_id
        WHERE e.id=? AND p.id=? AND p.owner=? AND p.kind='startup'`).bind(action.id, action.profileId, owner).first<{ id: string; status: string; version: number }>();
      if (!row) return json({ error: 'This test is unavailable.' }, 404);
      if (row.version !== action.version) return json({ error: 'This test changed in another window. Refresh before trying again.' }, 409);
      const requiredStatus = action.action === 'complete' ? 'running' : action.action === 'share' ? 'complete' : 'draft';
      if (row.status !== requiredStatus) return json({ error: action.action === 'edit' || action.action === 'remove' ? 'Only a draft can be edited or removed. Started plans and completed results stay on record.' : action.action === 'complete' ? 'Start this test before recording its result.' : action.action === 'share' ? 'Complete this test before sharing a result.' : 'This test has already started. Refresh to see its status.' }, 409);
      const owned = "EXISTS (SELECT 1 FROM profiles p WHERE p.id=idea_experiments.profile_id AND p.owner=? AND p.kind='startup')";
      const identity = [action.id, action.profileId, action.version, requiredStatus, owner] as const;
      let write: D1PreparedStatement;
      if (action.action === 'remove') {
        write = db.prepare(`DELETE FROM idea_experiments WHERE id=? AND profile_id=? AND version=? AND status=? AND ${owned}`).bind(...identity);
      } else if (action.action === 'edit') {
        write = db.prepare(`UPDATE idea_experiments SET plan=?,version=version+1,updated=? WHERE id=? AND profile_id=? AND version=? AND status=? AND ${owned}`)
          .bind(JSON.stringify(action.plan), now, ...identity);
      } else if (action.action === 'start') {
        write = db.prepare(`UPDATE idea_experiments SET status='running',started_at=?,version=version+1,updated=? WHERE id=? AND profile_id=? AND version=? AND status=? AND ${owned}`)
          .bind(now, now, ...identity);
      } else if (action.action === 'complete') {
        write = db.prepare(`UPDATE idea_experiments SET result=?,status='complete',completed_at=?,version=version+1,updated=? WHERE id=? AND profile_id=? AND version=? AND status=? AND ${owned}`)
          .bind(JSON.stringify(action.result), now, now, ...identity);
      } else {
        // Sharing a completed result is separate from completing it. A private
        // or moderated idea may always revoke sharing, but cannot newly share.
        write = db.prepare(`UPDATE idea_experiments SET shared=?,version=version+1,updated=? WHERE id=? AND profile_id=? AND version=? AND status=? AND ${owned}
          AND (?=0 OR EXISTS (SELECT 1 FROM profiles p WHERE p.id=idea_experiments.profile_id AND p.listed=1
            AND NOT EXISTS (SELECT 1 FROM profile_moderation m WHERE m.profile_id=p.id AND m.hidden=1)))`)
          .bind(action.shared ? 1 : 0, now, ...identity, action.shared ? 1 : 0);
      }
      const result = await write.run();
      if (!result.meta.changes) return json({ error: action.action === 'share' && action.shared ? 'The idea must be public and available before you share a result. Refresh to check its status.' : 'This test changed before your update was saved. Refresh and try again.' }, 409);
    }
    return json(await ownedExperiments(action.profileId, owner));
  } catch {
    console.error('Idea tests write failed');
    return json({ error: 'We could not save this test. Your text is still here; please try again.' }, 503);
  }
}
