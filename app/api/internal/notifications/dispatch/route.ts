import { env } from 'cloudflare:workers';
import { dispatchNotificationBatch } from '@/lib/notifications';
import { notificationBody, notificationTokenMatches } from '@/lib/notification-security';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function POST(request: Request) {
  try {
    const secret = (env as unknown as Record<string, string>).NOTIFICATION_DISPATCH_SECRET || '';
    if (secret.length < 32 || secret.length > 256) return json({ configured: false, error: 'Notification dispatch is not configured.' }, 503);
    const bearer = request.headers.get('authorization') || '';
    if (!bearer.startsWith('Bearer ') || !await notificationTokenMatches(bearer.slice(7), secret)) return json({ error: 'Unauthorized dispatch.' }, 401);
    const raw = await notificationBody(request, 1024);
    if (raw === null) return json({ error: 'Request too large.' }, 413);
    let payload: { limit?: number };
    try { payload = JSON.parse(raw); } catch { return json({ error: 'Invalid request.' }, 400); }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).some(key => key !== 'limit') || (payload.limit !== undefined && (!Number.isInteger(payload.limit) || payload.limit < 1 || payload.limit > 3))) return json({ error: 'Choose a dispatch limit from 1 to 3.' }, 400);
    const result = await dispatchNotificationBatch(payload.limit ?? 3);
    return json(result, 'busy' in result && result.busy ? 409 : result.configured === false ? 503 : 200);
  } catch { console.error('Notification dispatch could not complete'); return json({ configured: false, error: 'Notification dispatch is temporarily unavailable.' }, 503); }
}
