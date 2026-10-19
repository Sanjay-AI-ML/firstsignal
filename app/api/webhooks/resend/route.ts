import { env } from 'cloudflare:workers';
import { recordNotificationReceipt } from '@/lib/notifications';
import { notificationBody, verifyResendSignature } from '@/lib/notification-security';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function POST(request: Request) {
  try {
    const secret = (env as unknown as Record<string, string>).RESEND_WEBHOOK_SECRET || '';
    if (!secret) return json({ error: 'Email receipts are not configured.' }, 503);
    const raw = await notificationBody(request, 65536);
    if (raw === null) return json({ error: 'Request too large.' }, 413);
    if (!await verifyResendSignature(raw, request.headers, secret)) return json({ error: 'Invalid webhook signature.' }, 401);
    let payload: unknown;
    try { payload = JSON.parse(raw); } catch { return json({ error: 'Invalid event.' }, 400); }
    const result = await recordNotificationReceipt(request.headers.get('svix-id')!, payload);
    return json(result, result.status);
  } catch { console.error('Email receipt could not be recorded'); return json({ error: 'Email receipts are temporarily unavailable.' }, 503); }
}
