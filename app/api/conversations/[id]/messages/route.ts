import { getAppUser } from '@/app/auth';
import { database } from '@/lib/database';
import { getRequestId, createTimingTracker } from '@/lib/monitoring';
import { decodeMessageCursor, encodeMessageCursor, validConversationId } from '@/lib/conversation-messages';

export const dynamic = 'force-dynamic';
type MessageRow = { id: string; sender: string; sender_name: string; body: string; created: string };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const timer = createTimingTracker(), requestId = getRequestId(request);
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId, 'Server-Timing': timer.header() } });
  try {
    const user = await getAppUser();
    timer.mark('auth');
    if (!user) return json({ error: 'Sign in to view messages.' }, 401);
    const { id } = await params;
    const url = new URL(request.url), rawLimit = url.searchParams.get('limit');
    const limit = rawLimit === null ? 30 : Number(rawLimit);
    const rawCursor = url.searchParams.get('cursor'), cursor = rawCursor === null ? null : decodeMessageCursor(rawCursor);
    if (!validConversationId(id) || !Number.isInteger(limit) || limit < 1 || limit > 50 || (rawCursor !== null && !cursor)) return json({ error: 'Invalid conversation page.' }, 400);
    const db = database();
    const intro = await db.prepare('SELECT id FROM introductions WHERE id=? AND (sender=? OR recipient=?)').bind(id, user.userId, user.userId).first();
    if (!intro) return json({ error: 'Conversation unavailable.' }, 404);
    // A block stops new contact, but each participant retains their own history.
    // Reads never modify positions: prefetching is not evidence of reading.
    const statement = db.prepare(`SELECT id,sender,sender_name,body,created FROM messages WHERE introduction_id=?${cursor ? ' AND (created<? OR (created=? AND id<?))' : ''} ORDER BY created DESC,id DESC LIMIT ?`);
    const rows = await statement.bind(...(cursor ? [id, cursor.created, cursor.created, cursor.id, limit + 1] : [id, limit + 1])).all<MessageRow>();
    const hasMore = rows.results.length > limit;
    const page = rows.results.slice(0, limit), oldest = page[page.length - 1];
    timer.mark('messages');
    return json({ conversationId: id, messages: page.reverse().map(m => ({ id: m.id, body: m.body, senderName: m.sender_name, created: m.created, mine: m.sender === user.userId })), hasMore, nextCursor: hasMore && oldest ? encodeMessageCursor(oldest) : null });
  } catch {
    console.error('Conversation messages unavailable', { requestId });
    return json({ error: 'Could not load messages. Please retry.' }, 500);
  }
}
