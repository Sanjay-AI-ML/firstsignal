"use client";
import { useState } from 'react';
import { AlertCircle, Check, HelpCircle } from 'lucide-react';
import type { Profile } from '@/lib/data';
import { profileFit } from '@/lib/profile-fit';

export default function ProfileFit({ profile, candidates }: { profile: Profile; candidates: Profile[] }) {
  const choices = [...new Map(candidates.filter(p => p.kind !== profile.kind).map(p => [p.id, p])).values()];
  const [selected, setSelected] = useState(() => choices.find(choice => choice.mine)?.id ?? '');
  const counterpart = choices.find(p => p.id === selected);
  const signals = counterpart ? profileFit(profile.kind === 'startup' ? profile : counterpart, profile.kind === 'investor' ? profile : counterpart) : [];
  const alignedCount = signals.filter(s => s.status === 'aligned').length;
  const differentCount = signals.filter(s => s.status === 'different').length;

  return <section className="profile-fit" aria-labelledby="profile-fit-title">
    <h3 id="profile-fit-title">Compare profiles</h3>
    <p>Compare stated interests before starting a conversation.</p>
    <label htmlFor="fit-counterpart">{profile.kind === 'startup' ? 'Compare with an investor' : 'Compare with a startup'}</label>
    <select id="fit-counterpart" value={selected} onChange={e => setSelected(e.target.value)}>
      <option value="">Choose a profile</option>
      {choices.map(p => <option key={p.id} value={p.id}>{p.name}{p.mine ? ' · My profile' : ''}{p.demo ? ' · Sample' : ' · Member'}</option>)}
    </select>
    {!choices.length ? <p>No profiles are available to compare yet.</p> : null}
    {counterpart ? <div aria-live="polite">
      {profile.demo || counterpart.demo ? <p className="fit-sample">Illustrative comparison: includes a fictional sample profile.</p> : null}
      <div className="fit-radar-summary">
        <div>
          <span className="fit-radar-kicker">STATED PREFERENCES</span>
          <h4 className="fit-radar-score">{alignedCount} of {signals.length} criteria aligned</h4>
        </div>
        <span className="fit-radar-badge moderate">{differentCount} different · {signals.length - alignedCount - differentCount} to discuss</span>
      </div>
      <ul>{signals.map((s, index) => {
        const Icon = s.status === 'aligned' ? Check : s.status === 'different' ? AlertCircle : HelpCircle;
        return <li key={s.label}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#7a6b88', fontFamily: 'monospace' }}>0{index + 1}</span>
              <Icon size={14} style={{ color: s.status === 'aligned' ? '#1b7a4f' : s.status === 'different' ? '#b45309' : '#7136bd' }} aria-hidden="true" />
              <strong>{s.label}</strong>
            </div>
            <span className={`fit-status ${s.status}`}>{s.status === 'aligned' ? 'Matches' : s.status === 'different' ? 'Different' : 'Ask about this'}</span>
          </div>
          <p>{s.explanation}</p>
        </li>;
      })}</ul>
      <p className="fit-caption">Based on self-reported profile information. A match does not mean FindIn recommends an investment or that funding is likely.</p>
    </div> : <p className="fit-caption">You can compare listed profiles and your own private drafts. No information is sent to the other person.</p>}
  </section>;
}
