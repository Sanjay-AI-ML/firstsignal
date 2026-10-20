export type ConversationMessage = { id: string; body: string; senderName: string; created: string; mine: boolean };
export type MessagePage = { conversationId: string; messages: ConversationMessage[]; nextCursor: string | null; hasMore: boolean };
type MessageCursor = { created: string; id: string };
export function validConversationId(id: unknown): id is string { return typeof id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(id); }
export function encodeMessageCursor(cursor: MessageCursor) { return JSON.stringify([cursor.created, cursor.id]); }
export function decodeMessageCursor(raw: string): MessageCursor | null {
  if (raw.length > 250) return null;
  try { const value: unknown = JSON.parse(raw); if (!Array.isArray(value) || value.length !== 2 || typeof value[0] !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value[0]) || !Number.isFinite(Date.parse(value[0])) || new Date(value[0]).toISOString() !== value[0] || !validConversationId(value[1])) return null; return { created: value[0], id: value[1] }; } catch { return null; }
}
export function mergeConversationMessages(previous: ConversationMessage[], incoming: ConversationMessage[]) {
  const merged = new Map(previous.map(message => [message.id, message]));
  for (const message of incoming) merged.set(message.id, message);
  const order = (a: string, b: string) => a === b ? 0 : a < b ? -1 : 1;
  return [...merged.values()].sort((a, b) => order(a.created, b.created) || order(a.id, b.id));
}
export function validMessagePage(value: unknown, conversationId: string): value is MessagePage {
  if (!value || typeof value !== 'object') return false;
  const page = value as Partial<MessagePage>;
  return page.conversationId === conversationId && typeof page.hasMore === 'boolean' && (page.nextCursor === null || typeof page.nextCursor === 'string' && !!decodeMessageCursor(page.nextCursor)) && (!page.hasMore || page.nextCursor !== null) && Array.isArray(page.messages) && page.messages.length <= 50 && page.messages.every(message => message && validConversationId(message.id) && typeof message.body === 'string' && message.body.length <= 2000 && typeof message.senderName === 'string' && typeof message.mine === 'boolean' && typeof message.created === 'string' && Number.isFinite(Date.parse(message.created)));
}
