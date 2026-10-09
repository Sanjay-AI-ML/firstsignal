"use client";

import { useId, useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { initials, type Profile } from '@/lib/data';
import { profileSuggestions } from '@/lib/profile-suggestions';

export default function RelevantSuggestions({ profiles, myProfiles, onOpen, onCreate }: {
  profiles: Profile[]; myProfiles: Profile[]; onOpen: (profile: Profile) => void; onCreate: () => void;
}) {
  const titleId = useId(), selectId = useId();
  const [selected, setSelected] = useState('');
  const anchor = myProfiles.find(profile => profile.id === selected) ?? myProfiles[0];
  const suggestions = anchor ? profileSuggestions(anchor, profiles) : null;
  return <section className="rail-section relevant-suggestions" aria-labelledby={titleId}>
    <Sparkles size={19} aria-hidden="true" />
    <h2 id={titleId}>Suggested conversations</h2>
    {!anchor ? <><p>Add your interests to see founders or investors with a stated sector or stage in common.</p><button type="button" className="outline-button" onClick={onCreate}>Create a profile</button></> : <>
      {myProfiles.length > 1 ? <div className="suggestion-selector"><label htmlFor={selectId}>Use my profile</label><select id={selectId} value={anchor.id} onChange={event => setSelected(event.target.value)}>{myProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name} · {profile.kind === 'startup' ? 'Founder' : 'Investor'}</option>)}</select></div> : <p className="suggestion-anchor">For {anchor.name}</p>}
      {suggestions?.mode === 'samples' ? <p className="suggestion-example">No member profiles fit these interests yet. These fictional examples show how comparisons work; they cannot be contacted.</p> : null}
      {suggestions?.matches.length ? <div className="suggestion-list">{suggestions.matches.map(({ profile, signals }) => <article key={profile.id} className="suggestion-item">
        <button type="button" className="suggestion-identity" onClick={() => onOpen(profile)}><span className="founder-avatar" aria-hidden="true">{initials(profile.name)}</span><span><strong>{profile.name}</strong><small>{profile.demo ? 'Fictional example' : 'Member · Self-reported'}</small></span><ArrowUpRight size={15} aria-hidden="true" /></button>
        <ul className="suggestion-reasons">{signals.slice(0, 2).map(signal => <li key={signal.label}><span className={signal.status === 'aligned' ? 'suggestion-aligned' : ''}>{signal.status === 'aligned' ? `${signal.label} aligns` : `${signal.label}: confirm together`}</span><small>{signal.explanation}</small></li>)}</ul>
        <p className="suggestion-budget">{signals[2].status === 'unknown' ? 'Budget range unknown. Confirm the amount together.' : signals[2].status === 'aligned' ? 'Planning budget is within the stated check range. Confirm the actual funding need.' : 'Planning budget differs from the stated check range. Discuss the amount first.'}</p>
        <button type="button" className="text-button" onClick={() => onOpen(profile)}>{profile.demo ? 'Compare example' : 'Review profile'}<ArrowUpRight size={13} aria-hidden="true" /></button>
      </article>)}</div> : <div className="suggestion-empty"><p>No stated sector or stage fit yet. Explore profiles or refine your interests as the network grows.</p></div>}
      <p className="suggestion-caption">Based on stated sector and stage. Confirm evidence, geography and availability together. This is not an endorsement or a prediction of funding.</p>
    </>}
  </section>;
}
