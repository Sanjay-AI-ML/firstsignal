"use client";
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { History, RefreshCw, RotateCcw } from 'lucide-react';
import type { Profile } from '@/lib/data';
import { revisionDifferences } from '@/lib/client-operations';

type Revision = { id: string; version: number; changeSummary: string; created: string; data: Record<string, unknown> | string };
export default function IdeaHistory({ idea, busy, onWrite, onPendingChange }: {
  idea: Profile; busy: boolean; onWrite: (payload: unknown) => Promise<unknown>; onPendingChange?: (value: boolean) => void;
}) {
  const [revisions, setRevisions] = useState<Revision[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState(''), [selectedId, setSelectedId] = useState(''), [confirmation, setConfirmation] = useState(''), [restoring, setRestoring] = useState(false);
  const mounted = useRef(true), pending = useRef(false), heading = useRef<HTMLHeadingElement>(null), id = useId();
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch('/api/workspace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getRevisions', profileId: idea.id }), signal, cache: 'no-store' });
      const body = await response.json() as { error?: string; revisions?: Revision[] };
      if (!response.ok) throw new Error(body.error || 'Unable to load idea history.');
      if (mounted.current && !signal?.aborted) { setRevisions(body.revisions ?? []); setError(''); }
    } catch (cause) { if (mounted.current && !signal?.aborted) setError(cause instanceof Error ? cause.message : 'Unable to load idea history.'); }
    finally { if (mounted.current && !signal?.aborted) setLoading(false); }
  }, [idea.id]);
  useEffect(() => { mounted.current = true; const controller = new AbortController(); const timer = setTimeout(() => void load(controller.signal), 0); return () => { mounted.current = false; clearTimeout(timer); controller.abort(); }; }, [load]);
  useEffect(() => { onPendingChange?.(restoring); return () => onPendingChange?.(false); }, [restoring, onPendingChange]);
  const selected = revisions.find(revision => revision.id === selectedId);
  const confirmationKey = JSON.stringify([idea.id, selectedId, idea.version ?? 1]);
  const confirmed = confirmation === confirmationKey;
  let previous: Record<string, unknown> = {};
  try { previous = typeof selected?.data === 'string' ? JSON.parse(selected.data) : selected?.data ?? {}; } catch { /* Ignore malformed historical snapshots. */ }
  const changes = selected ? revisionDifferences(idea, previous) : [];
  const restore = async () => {
    if (!selected || !confirmed || busy || pending.current) return;
    pending.current = true; setRestoring(true); setError(''); setNotice('');
    try {
      await onWrite({ action: 'restoreRevision', profileId: idea.id, revisionId: selected.id, expectedVersion: idea.version ?? 1 });
      setSelectedId(''); setConfirmation(''); setNotice('Earlier details restored as a new version. Sharing settings and related records are unchanged.');
      await load();
      heading.current?.focus();
    } catch (cause) { if (mounted.current) { setConfirmation(''); setError(cause instanceof Error ? cause.message : 'Unable to restore these details. Refresh your workspace and review the latest version before trying again.'); } }
    finally { pending.current = false; if (mounted.current) setRestoring(false); }
  };
  return <section className="idea-history" aria-labelledby={`${id}-heading`} aria-busy={loading || restoring}>
    <div className="history-heading"><div><h4 ref={heading} tabIndex={-1} id={`${id}-heading`}><History size={18} aria-hidden="true" />Saved idea history</h4><p className="subtle">Current version {idea.version ?? 1}. Earlier details are private to you. Restoring creates a new version and keeps the idea’s current sharing choice.</p></div><button type="button" className="text-button" disabled={loading || restoring || busy} onClick={() => void load()}><RefreshCw size={15} aria-hidden="true" />Refresh history</button></div>
    {error ? <p role="alert" className="notice error-notice">{error}</p> : null}{notice ? <p role="status" className="notice">{notice}</p> : null}
    {loading ? <p role="status" className="subtle">Loading earlier versions…</p> : revisions.length ? <div className="history-layout"><ul className="history-list">{revisions.map(revision => <li key={revision.id}><button type="button" disabled={restoring || busy} className="history-version" aria-pressed={selectedId === revision.id} onClick={() => { setSelectedId(revision.id); setConfirmation(''); setNotice(''); }}><strong>Version {revision.version}</strong><span>{new Date(revision.created).toLocaleString('en-IN')}</span><small>{revision.changeSummary}</small></button></li>)}</ul>{selected ? <div className="history-comparison"><h5>Compare version {selected.version} with current details</h5>{changes.length ? changes.map(change => <div className="history-change" key={change.key}><h6>{change.label}</h6><div><p><strong>Current</strong><span>{change.current}</span></p><p><strong>Version {selected.version}</strong><span>{change.previous}</span></p></div></div>) : <p className="subtle">The displayed details match this version.</p>}<label className="consent"><input type="checkbox" checked={confirmed} disabled={restoring || busy} onChange={event => setConfirmation(event.target.checked ? confirmationKey : '')} /><span>Replace this idea’s details with version {selected.version}. Its visibility, updates, tests and conversations stay as they are.</span></label><button type="button" className="outline-button" disabled={!confirmed || restoring || busy} onClick={() => void restore()}><RotateCcw size={15} aria-hidden="true" />{restoring ? 'Restoring…' : `Restore version ${selected.version}`}</button></div> : <p className="subtle">Choose an earlier version to review its changes.</p>}</div> : <p className="subtle">No earlier versions yet. Saving an edit keeps the previous details here.</p>}
  </section>;
}
