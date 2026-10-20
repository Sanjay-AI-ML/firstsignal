import { getAppUser } from '@/app/auth';
import { database } from '@/lib/database';
import { readBoundedBody } from '@/lib/streaming-request';
import { validConversationId } from '@/lib/conversation-messages';
import { getRequestId } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId } });
  try {
    const user = await getAppUser();
    if (!user) return json({ error: 'Sign in to update read messages.' }, 401);
    if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'This request is not allowed.' }, 403);
    const { id } = await params;
    if (!validConversationId(id)) return json({ error: 'Invalid conversation.' }, 400);
    const body = await readBoundedBody(request, 1024);
    if (!body.ok) return json({ error: body.error }, body.status);
    let value: unknown;
    try { value = JSON.parse(body.body); } catch { return json({ error: 'Invalid read position.' }, 400); }
    const messageId = value && typeof value === 'object' && !Array.isArray(value) ? (value as { messageId?: unknown }).messageId : undefined;
    if (!validConversationId(messageId)) return json({ error: 'Choose a displayed message.' }, 400);
    const db = database();
    const intro = await db.prepare('SELECT id FROM introductions WHERE id=? AND (sender=? OR recipient=?)').bind(id, user.userId, user.userId).first();
    if (!intro) return json({ error: 'Conversation unavailable.' }, 404);
    const message = await db.prepare('SELECT id,created FROM messages WHERE id=? AND introduction_id=?').bind(messageId, id).first<{ id: string; created: string }>();
    if (!message) return json({ error: 'This message is unavailable.' }, 404);
    // A stale tab cannot regress a position. Concurrent newer messages stay unread.
    await db.prepare(`INSERT INTO conversation_read_positions (introduction_id,user_id,last_read_message_id,last_read_at) VALUES (?,?,?,?)
      ON CONFLICT(introduction_id,user_id) DO UPDATE SET last_read_message_id=excluded.last_read_message_id,last_read_at=excluded.last_read_at
      WHERE NOT EXISTS (SELECT 1 FROM messages previous WHERE previous.id=conversation_read_positions.last_read_message_id AND previous.introduction_id=excluded.introduction_id)
      OR excluded.last_read_at>(SELECT previous.created FROM messages previous WHERE previous.id=conversation_read_positions.last_read_message_id AND previous.introduction_id=excluded.introduction_id)
      OR (excluded.last_read_at=(SELECT previous.created FROM messages previous WHERE previous.id=conversation_read_positions.last_read_message_id AND previous.introduction_id=excluded.introduction_id) AND excluded.last_read_message_id>conversation_read_positions.last_read_message_id)`)
      .bind(id, user.userId, message.id, message.created).run();
    const result = await db.prepare(`SELECT r.last_read_message_id, (SELECT COUNT(*) FROM messages m WHERE m.introduction_id=r.introduction_id AND m.sender<>r.user_id AND (m.created>p.created OR (m.created=p.created AND m.id>p.id))) AS unread_count FROM conversation_read_positions r LEFT JOIN messages p ON p.id=r.last_read_message_id AND p.introduction_id=r.introduction_id WHERE r.introduction_id=? AND r.user_id=?`).bind(id, user.userId).first<{ last_read_message_id: string; unread_count: number }>();
    return json({ conversationId: id, lastReadMessageId: result?.last_read_message_id ?? message.id, unreadCount: result?.unread_count ?? 0 });
  } catch {
    console.error('Conversation read update unavailable', { requestId });
    return json({ error: 'Could not save the read position. Please retry.' }, 500);
  }
}
