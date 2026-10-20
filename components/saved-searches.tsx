"use client";
import { useId, useRef, useState, type FormEvent } from 'react';
import { BookmarkPlus, Search, Trash2 } from 'lucide-react';
import type { WorkspaceData } from '@/lib/data';
import type { SavedDiscoveryFilters } from '@/lib/client-operations';
import { savedDiscoveryFilters } from '@/lib/client-operations';

export default function SavedSearches({ searches = [], filters, busy, onWrite, onApply }: {
  searches: NonNullable<WorkspaceData['savedSearches']>; filters: SavedDiscoveryFilters; busy: boolean;
  onWrite: (payload: unknown) => Promise<unknown>; onApply: (filters: SavedDiscoveryFilters) => void;
}) {
  const [name, setName] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const pending = useRef(false), id = useId();
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy || pending.current) return;
    pending.current = true; setError(''); setNotice('');
    try {
      const { search, ...criteria } = filters;
      await onWrite({ action: 'saveSearch', name: name.trim(), query: search, filters: JSON.stringify(criteria), alertsEnabled: false });
      setName(''); setNotice('Search saved. Open it below to use these filters again.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save this search.'); }
    finally { pending.current = false; }
  };
  const remove = async (searchId: string) => {
    if (busy || pending.current) return; pending.current = true; setError(''); setNotice('');
    try { await onWrite({ action: 'deleteSearch', id: searchId }); setNotice('Saved search removed.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to remove this search.'); }
    finally { pending.current = false; }
  };
  return <section className="saved-searches resource" aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`}><BookmarkPlus size={18} aria-hidden="true" />Saved searches</h2>
    <p className="subtle">Keep your current filters for another visit. Searches are private. Matching email alerts are not available yet.</p>
    <form onSubmit={event => void submit(event)} className="saved-search-form">
      <div className="field"><label htmlFor={`${id}-name`}>Name this search</label><input id={`${id}-name`} value={name} disabled={busy} onChange={event => setName(event.target.value)} required maxLength={60} placeholder="For example, climate ideas at prototype stage" /></div>
      <button type="submit" className="outline-button" disabled={busy || !name.trim() || searches.length >= 20}>Save current search</button>
    </form>
    {error ? <p role="alert" className="notice error-notice">{error}</p> : null}
    {notice ? <p role="status" className="subtle">{notice}</p> : null}
    {searches.length ? <ul className="saved-search-list">{searches.map(search => <li key={search.id}>
      <button type="button" className="text-button" disabled={busy} onClick={() => onApply(savedDiscoveryFilters(search.query, search.filters))}><Search size={15} aria-hidden="true" />{search.name}</button>
      <button type="button" className="text-button" disabled={busy} onClick={() => void remove(search.id)} aria-label={`Remove saved search ${search.name}`}><Trash2 size={15} aria-hidden="true" /></button>
    </li>)}</ul> : <p className="subtle">No saved searches yet. Choose your filters, then give the search a name.</p>}
    {searches.length >= 20 ? <p className="subtle">You have 20 saved searches. Remove one to save another.</p> : null}
  </section>;
}
