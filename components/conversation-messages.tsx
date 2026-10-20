"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { mergeConversationMessages, validMessagePage, type MessagePage } from '@/lib/conversation-messages';

type Props = {
  conversationId: string;
  blocked?: boolean;
  refreshKey?: string | number;
  onRead?: (conversationId: string, unreadCount: number, lastReadMessageId: string) => void;
};

export default function ConversationMessages(props: Props) {
  // A different connection must never display or acknowledge the previous one's messages.
  return <MessageThread key={props.conversationId} {...props} />;
}

function MessageThread({ conversationId, blocked, refreshKey, onRead }: Props) {
  const [page, setPage] = useState<MessagePage | null>(null);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [error, setError] = useState(''), [readError, setReadError] = useState(''), [readSaved, setReadSaved] = useState('');
  const request = useRef<AbortController | null>(null), readRequest = useRef<AbortController | null>(null);
  const retryCursor = useRef<string | undefined>(undefined);
  const readPending = useRef(false), sequence = useRef(0);
  const cancelLoad = useCallback(() => { ++sequence.current; request.current?.abort(); }, []);
  const load = useCallback(async (cursor?: string) => {
    const token = ++sequence.current;
    retryCursor.current = cursor;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLoading(true); setError('');
    try {
      const query = new URLSearchParams({ limit: '30', ...(cursor ? { cursor } : {}) });
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages?${query}`, { cache: 'no-store', signal: controller.signal });
      const data: unknown = await response.json();
      if (!response.ok || !validMessagePage(data, conversationId)) throw new Error('Could not load messages. Please retry.');
      if (token !== sequence.current) return;
      setPage(previous => cursor && previous ? { ...data, messages: mergeConversationMessages(previous.messages, data.messages) } : data);
    } catch {
      if (token === sequence.current) setError('Could not load messages. Your existing history is still here. Please retry.');
    } finally {
      clearTimeout(timeout);
      if (token === sequence.current) { request.current = null; setLoading(false); }
    }
  }, [conversationId]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load(); });
    return () => { active = false; cancelLoad(); };
  }, [load, cancelLoad, refreshKey]);
  useEffect(() => () => readRequest.current?.abort(), []);
  const markRead = async () => {
    const newest = page?.messages[page.messages.length - 1];
    if (!newest || readPending.current || loading) return;
    readPending.current = true; setSaving(true); setReadError(''); setReadSaved('');
    const controller = new AbortController(); readRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId: newest.id }), signal: controller.signal });
      const data = await response.json() as { conversationId?: string; unreadCount?: number; lastReadMessageId?: string };
      if (!response.ok || data.conversationId !== conversationId || !Number.isInteger(data.unreadCount) || (data.unreadCount ?? -1) < 0 || typeof data.lastReadMessageId !== 'string') throw new Error('Read position unavailable');
      if (controller.signal.aborted) return;
      setReadSaved('Read position saved. Newer messages remain unread.');
      onRead?.(conversationId, data.unreadCount!, data.lastReadMessageId);
    } catch {
      if (!controller.signal.aborted || readRequest.current === controller) setReadError('Could not save your read position. Your messages are still here. Please retry.');
    } finally {
      clearTimeout(timeout); readPending.current = false;
      if (!controller.signal.aborted) setSaving(false);
      else if (readRequest.current === controller) setSaving(false);
      if (readRequest.current === controller) readRequest.current = null;
    }
  };
  return <section className="conversation-thread" aria-label="Connection messages" aria-busy={loading || saving}>
    <div className="flex flex-wrap items-center justify-between gap-3 my-3">
      <h3 className="font-semibold">Messages</h3>
      <button type="button" className="outline-button" aria-disabled={loading} onClick={() => { if (!loading) void load(); }}>{loading ? 'Loading messages…' : 'Refresh messages'}</button>
    </div>
    {blocked ? <p className="subtle">Previous messages remain available. New contact is paused.</p> : null}
    {error ? <p className="notice error-notice" role="alert">{error} <button type="button" className="text-button" aria-disabled={loading} onClick={() => { if (!loading) void load(retryCursor.current); }}>Retry loading</button></p> : null}
    {page?.hasMore ? <button type="button" className="outline-button" aria-disabled={loading} onClick={() => { if (!loading && page.nextCursor) void load(page.nextCursor); }}>Load older messages</button> : null}
    {loading && !page ? <p role="status" className="subtle">Loading this conversation…</p> : null}
    {page ? <><ConversationMessageHistory messages={page.messages} />{page.messages.length ? <div className="my-3"><button type="button" className="outline-button" aria-disabled={saving || loading} onClick={() => void markRead()}>{saving ? 'Saving read position…' : 'Mark read through newest shown'}</button><p className="subtle mt-2">Marks the newest message shown and all earlier messages as read. Messages arriving later stay unread.</p></div> : null}</> : null}
    {readError ? <p className="notice error-notice" role="alert">{readError}</p> : null}
    {readSaved ? <p className="subtle" role="status">{readSaved}</p> : null}
  </section>;
}

export function ConversationMessageHistory({ messages }: { messages: MessagePage['messages'] }) {
  return <div className="conversation-messages" tabIndex={0} role="region" aria-label="Message history">
    {messages.length ? messages.map(message => <div className={`message${message.mine ? ' mine' : ''}`} key={message.id}><small>{message.mine ? 'You' : message.senderName} · <time dateTime={message.created}>{new Date(message.created).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></small>{message.body}</div>) : <p className="subtle">No messages yet. Your original introduction appears above.</p>}
  </div>;
}
