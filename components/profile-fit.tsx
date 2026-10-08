"use client";
import { useState } from 'react';
import type { Profile } from '@/lib/data';
import { profileFit } from '@/lib/profile-fit';

export default function ProfileFit({ profile, candidates }: { profile: Profile; candidates: Profile[] }) {
  const choices = [...new Map(candidates.filter(p => p.kind !== profile.kind).map(p => [p.id, p])).values()];
  const [selected, setSelected] = useState('');
  const counterpart = choices.find(p => p.id === selected);
  const signals = counterpart ? profileFit(profile.kind === 'startup' ? profile : counterpart, profile.kind === 'investor' ? profile : counterpart) : [];
  return <section className="profile-fit" aria-labelledby="profile-fit-title">
    <h3 id="profile-fit-title">Check profile fit</h3>
    <p>Compare stated interests before starting a conversation.</p>
    <label htmlFor="fit-counterpart">{profile.kind === 'startup' ? 'Compare with an investor' : 'Compare with a startup'}</label>
    <select id="fit-counterpart" value={selected} onChange={e => setSelected(e.target.value)}>
      <option value="">Choose a profile</option>
      {choices.map(p => <option key={p.id} value={p.id}>{p.name}{p.mine ? ' · My profile' : ''}{p.demo ? ' · Sample' : ' · Member'}</option>)}
    </select>
    {!choices.length ? <p>No profiles are available to compare yet.</p> : null}
    {counterpart ? <div aria-live="polite">
      {profile.demo || counterpart.demo ? <p className="fit-sample">Illustrative comparison: includes a fictional sample profile.</p> : null}
      <ul>{signals.map(s => <li key={s.label}><div><strong>{s.label}</strong><span className={`fit-status ${s.status}`}>{s.status === 'aligned' ? 'Aligned' : s.status === 'different' ? 'Different' : 'Confirm together'}</span></div><p>{s.explanation}</p></li>)}</ul>
      <p className="fit-caption">Based on self-reported profile information. Alignment is not an endorsement or a prediction of funding.</p>
    </div> : <p className="fit-caption">You can compare listed profiles and your own private drafts. No information is sent to the other person.</p>}
  </section>;
}
