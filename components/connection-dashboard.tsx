"use client";

import { useEffect, useId, useState } from 'react';
import { ArrowUpRight, Check, Clock3, Handshake, MessageCircle } from 'lucide-react';
import { formatINR, initials, type Intro } from '@/lib/data';

type Connection = Intro & { updated?: string; blocked?: boolean; proposal?: { status: string; amount: number; mine: boolean; version: number; updated?: string } | null };
type Filter = 'all' | 'attention' | 'pending' | 'connected' | 'archive';
const filters: { value: Filter; label: string }[] = [{ value: 'all', label: 'All' }, { value: 'attention', label: 'Your next step' }, { value: 'pending', label: 'Pending' }, { value: 'connected', label: 'Connected' }, { value: 'archive', label: 'Past & practice' }];
const proposalStatus = (status: string) => ({ open: 'Open proposal', acknowledged: 'Interest acknowledged', declined: 'Proposal declined', withdrawn: 'Proposal withdrawn' }[status] ?? 'Proposal updated');
const requestStatus = (status: string) => ({ pending: 'Pending', accepted: 'Connected', declined: 'Declined', withdrawn: 'Withdrawn', draft: 'Private practice note' }[status] ?? 'Request updated');
function timestamp(value?: string) { const parsed = value ? Date.parse(value) : NaN; return Number.isFinite(parsed) ? parsed : 0; }
function lastActivity(connection: Connection) { return Math.max(timestamp(connection.updated), timestamp(connection.created), timestamp(connection.proposal?.updated), ...connection.messages.map(message => timestamp(message.created))); }
function lastMessage(connection: Connection) { return connection.messages.reduce<Connection['messages'][number] | undefined>((latest, message) => timestamp(message.created) >= timestamp(latest?.created) ? message : latest, undefined); }
function followUpDue(connection: Connection, today: string) { return !!today && !!connection.nextStep?.date && /^\d{4}-\d{2}-\d{2}$/.test(connection.nextStep.date) && connection.nextStep.date <= today; }
function needsAction(connection: Connection, today: string) {
  if (connection.blocked) return false;
  return (connection.status === 'pending' && connection.direction === 'incoming') ||
    (connection.status === 'accepted' && ((connection.proposal?.status === 'open' && !connection.proposal.mine) || lastMessage(connection)?.mine === false || followUpDue(connection, today)));
}
function nextStep(connection: Connection) {
  if (connection.blocked) return 'This connection is paused. You can review its existing history.';
  if (connection.status === 'pending') return connection.direction === 'incoming' ? 'Review the request and choose whether to connect.' : 'Waiting for the other member to accept your request.';
  if (connection.status === 'draft') return 'Saved only in your account. No one has been contacted.';
  if (connection.status !== 'accepted') return 'This request is closed.';
  if (connection.proposal?.status === 'open') return connection.proposal.mine ? 'Your indicative proposal is awaiting a response.' : 'Review their indicative proposal, then reply or counteroffer.';
  const latest = lastMessage(connection);
  return latest ? latest.mine ? 'You sent the latest message. Follow up when it is useful.' : 'The latest message is from the other member. Continue the conversation.' : 'Start with a message or discuss a private proposal.';
}

export default function ConnectionDashboard({ requests, busy, onOpen, onRespond, onDiscover }: {
  requests: Connection[]; busy: boolean; onOpen: (connection: Intro) => void; onRespond: (connection: Intro, status: string) => void; onDiscover: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [today, setToday] = useState('');
  useEffect(() => { const date = new Date(); setToday(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`); }, [requests]);
  const sectionId = useId();
  const count = (value: Filter) => requests.filter(connection => value === 'all' || value === 'attention' && needsAction(connection, today) || value === 'pending' && connection.status === 'pending' || value === 'connected' && connection.status === 'accepted' || value === 'archive' && !['pending', 'accepted'].includes(connection.status)).length;
  const visible = requests.filter(connection => filter === 'all' || filter === 'attention' && needsAction(connection, today) || filter === 'pending' && connection.status === 'pending' || filter === 'connected' && connection.status === 'accepted' || filter === 'archive' && !['pending', 'accepted'].includes(connection.status)).sort((a, b) => lastActivity(b) - lastActivity(a) || a.id.localeCompare(b.id));
  return <section className="connection-dashboard" aria-labelledby={sectionId}>
    <div className="connection-overview"><div><p className="eyebrow">Keep things moving</p><h2 id={sectionId}>Your conversations, in one place.</h2><p>Review requests, pick up a conversation and keep track of private proposals.</p></div><div className="connection-stats"><div><strong>{requests.filter(connection => !connection.blocked && connection.status === 'pending' && connection.direction === 'incoming').length}</strong><span>Requests to review</span></div><div><strong>{count('connected')}</strong><span>Connected</span></div><div><strong>{requests.filter(connection => !connection.blocked && connection.status === 'accepted' && connection.proposal?.status === 'open' && !connection.proposal.mine).length}</strong><span>Proposals to review</span></div></div></div>
    <div className="connection-filters" role="group" aria-label="Filter connections">{filters.map(({ value, label }) => <button key={value} type="button" aria-pressed={filter === value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}<span>{count(value)}</span></button>)}</div>
    {filter === 'attention' ? <p className="connection-filter-note">Includes incoming requests, their open proposals, their latest messages and your follow-up dates due today or earlier. These are next-step prompts, not unread counts.</p> : null}
    <div className="connection-results" aria-live="polite"><p className="subtle">{visible.length} {visible.length === 1 ? 'connection' : 'connections'}{filter !== 'all' ? ` · ${filters.find(item => item.value === filter)?.label}` : ''}</p></div>
    {visible.length ? <div className="connection-list">{visible.map(connection => {
      const name = connection.direction === 'incoming' ? connection.senderName : connection.targetName;
      const latest = lastMessage(connection), date = lastActivity(connection);
      return <article className={`connection-card${connection.blocked ? ' connection-paused' : ''}`} key={connection.id}>
        <div className="connection-card-heading"><div className="connection-person"><span className="founder-avatar" aria-hidden="true">{initials(name)}</span><div><h3>{name}</h3><p>{connection.direction === 'incoming' ? `About ${connection.targetName}` : connection.status === 'draft' ? 'Fictional profile · Private practice' : 'Your introduction request'}</p></div></div><span className={`tag ${connection.status === 'accepted' && !connection.blocked ? 'accepted' : ''}`}>{connection.blocked ? 'Connection paused' : requestStatus(connection.status)}</span></div>
        <p className="connection-next"><span aria-hidden="true">{connection.status === 'pending' ? <Clock3 size={16} /> : <MessageCircle size={16} />}</span>{nextStep(connection)}</p>
        {connection.status === 'accepted' && latest ? <div className="connection-message-preview"><small>{latest.mine ? 'You' : latest.senderName} · Latest message</small><p>{latest.body}</p></div> : null}
        {connection.status === 'accepted' && connection.proposal ? <div className="connection-proposal"><Handshake size={17} aria-hidden="true" /><div><strong>{formatINR(connection.proposal.amount)} <span>indicative</span></strong><small>{proposalStatus(connection.proposal.status)} · {connection.proposal.mine ? 'Your proposal' : 'Their proposal'} · v{connection.proposal.version}</small></div><span className="tag">Non-binding</span></div> : null}
        {connection.nextStep && (connection.nextStep.note || connection.nextStep.date) ? <div className={`connection-follow-up${followUpDue(connection, today) ? ' due' : ''}`}><div><strong>Private next step</strong>{connection.nextStep.date ? <span>{today && connection.nextStep.date < today ? 'Follow-up overdue' : connection.nextStep.date === today ? 'Follow-up today' : 'Follow-up'} · <time dateTime={connection.nextStep.date}>{new Date(`${connection.nextStep.date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</time></span> : null}</div>{connection.nextStep.note ? <p>{connection.nextStep.note}</p> : null}<small>Only you see this note.</small></div> : null}
        <details className="connection-request"><summary>{connection.status === 'draft' ? 'Read practice note' : 'Original request'}</summary><p>{connection.message}</p></details>
        <div className="connection-card-footer"><span className="subtle">Last activity {date ? <time dateTime={new Date(date).toISOString()}>{new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</time> : 'not available'}</span><div className="connection-card-actions">
          {connection.status === 'pending' && !connection.blocked && connection.direction === 'incoming' ? <><button type="button" className="primary-button" disabled={busy} onClick={() => onRespond(connection, 'accepted')}><Check size={15} aria-hidden="true" />Accept connection</button><button type="button" className="outline-button" disabled={busy} onClick={() => onRespond(connection, 'declined')}>Decline</button></> : null}
          {connection.status === 'pending' && !connection.blocked && connection.direction === 'outgoing' ? <button type="button" className="outline-button" disabled={busy} onClick={() => onRespond(connection, 'withdrawn')}>Withdraw request</button> : null}
          {connection.status === 'accepted' ? <button type="button" className={connection.blocked ? 'outline-button' : 'primary-button'} onClick={() => onOpen(connection)}>{connection.blocked ? 'Review connection' : connection.proposal?.status === 'open' && !connection.proposal.mine ? 'Review proposal' : 'Open connection'}<ArrowUpRight size={15} aria-hidden="true" /></button> : null}
        </div></div>
      </article>;
    })}</div> : <div className="connection-empty"><Handshake size={27} aria-hidden="true" /><h3>{requests.length ? filter === 'attention' ? 'You’re up to date on next steps.' : 'No connections in this view.' : 'A thoughtful introduction starts here.'}</h3><p>{requests.length ? 'Try another filter to see your requests and conversations.' : 'Find a profile with shared interests and explain why you would like to connect. Messaging opens after acceptance.'}</p><button type="button" className="outline-button" onClick={requests.length ? () => setFilter('all') : onDiscover}>{requests.length ? 'View all connections' : 'Explore profiles'}</button></div>}
    <p className="connection-caption">Requests require mutual consent. Private proposals express non-binding interest; they do not record a completed investment.</p>
  </section>;
}
