import { z } from 'zod';
import { getAppUser } from '@/app/auth';
import { isAdminAccount } from '@/lib/admin-access';
import { reportStatuses } from '@/lib/admin-types';
import { adminAudit, adminOverview, adminProfiles, adminReports, applyAdminAction, AdminConflict } from '@/lib/admin-service';

export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const querySchema = z.object({ view: z.enum(['overview', 'profiles', 'reports', 'audit']).default('overview'), page: z.coerce.number().int().min(1).max(10000).default(1), q: z.string().trim().max(100).default(''), status: z.enum(reportStatuses).default('submitted') }).strict();
const version = z.number().int().min(0).max(2147483646);
export const adminActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('moderateProfile'), profileId: z.string().min(1).max(100), hidden: z.boolean(), reason: z.string().trim().min(10).max(500), expectedVersion: version }).strict(),
  z.object({ action: z.literal('reviewReport'), reportId: z.string().min(1).max(100), status: z.enum(reportStatuses), operatorNote: z.string().trim().min(10).max(1000), expectedVersion: version }).strict(),
]);
async function authorize() {
  const user = await getAppUser();
  if (!user) return { response: json({ error: 'Sign in to continue.' }, 401) };
  if (!isAdminAccount(user)) return { response: json({ error: 'This account cannot open the owner portal.' }, 403) };
  return { user };
}
async function readBody(request: Request) {
  const limit = 8000;
  if (Number(request.headers.get('content-length') ?? 0) > limit) return null;
  const reader = request.body?.getReader();
  if (!reader) return '';
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}
export async function GET(request: Request) {
  try {
    const auth = await authorize();
    if (auth.response) return auth.response;
    const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!query.success) return json({ error: 'Check the portal filters.' }, 400);
    const { view, page, q, status } = query.data;
    return json(view === 'profiles' ? await adminProfiles(page, q) : view === 'reports' ? await adminReports(page, status, q) : view === 'audit' ? await adminAudit(page, q) : await adminOverview());
  } catch { console.error('Owner portal read failed'); return json({ error: 'The owner portal is temporarily unavailable. Please retry.' }, 503); }
}
export async function POST(request: Request) {
  try {
    const auth = await authorize();
    if (auth.response) return auth.response;
    if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Request origin could not be verified.' }, 403);
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return json({ error: 'Submit a JSON request.' }, 415);
    const raw = await readBody(request);
    if (raw === null) return json({ error: 'This request is too large.' }, 413);
    let payload: unknown;
    try { payload = JSON.parse(raw); } catch { return json({ error: 'Submit a valid request.' }, 400); }
    const parsed = adminActionSchema.safeParse(payload);
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Check your input.' }, 400);
    await applyAdminAction(auth.user!.userId, parsed.data);
    return json({ ok: true });
  } catch (error) {
    if (error instanceof AdminConflict) return json({ error: error.message }, error.status);
    console.error('Owner portal change failed');
    return json({ error: 'The change could not be saved. Reload and retry.' }, 503);
  }
}
