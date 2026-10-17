"use client";

import { useId, useState } from 'react';
import { ArrowUpRight, Bookmark, Columns3, Minus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { initials, type Profile } from '@/lib/data';
import { comparisonProfiles, compareRows } from '@/lib/profile-comparison';

type ProfileComparisonProps = {
  profiles: Profile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: (id: string) => void;
  onView: (profile: Profile) => void;
  onSave: (profile: Profile) => void;
  savedIds: string[];
  busy: boolean;
};

export default function ProfileComparison({ profiles, open, onOpenChange, onRemove, onView, onSave, savedIds, busy }: ProfileComparisonProps) {
  const choices = comparisonProfiles(profiles);
  const rows = compareRows(choices);
  const helpId = useId();
  const criterionId = useId();
  const [criterion, setCriterion] = useState('sector');
  const selectedRow = rows.find(row => row.id === criterion) ?? rows[0];
  const startups = choices[0]?.kind !== 'investor';
  const profileActions = (profile: Profile) => {
    const saved = savedIds.includes(profile.id);
    return <div className="profile-comparison-actions">
      <button type="button" onClick={() => { onOpenChange(false); onView(profile); }} aria-label={`View ${profile.name}`}>View profile<ArrowUpRight size={14} aria-hidden="true" /></button>
      <button type="button" disabled={busy} aria-label={`${saved ? 'Unsave' : 'Save'} ${profile.name}`} aria-pressed={saved} onClick={() => onSave(profile)}><Bookmark size={14} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />{saved ? 'Saved' : 'Save'}</button>
      <button type="button" className="profile-comparison-remove" aria-label={`Remove ${profile.name} from comparison`} onClick={() => onRemove(profile.id)}><Minus size={14} aria-hidden="true" />Remove</button>
    </div>;
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="profile-comparison-dialog">
      <DialogHeader className="profile-comparison-heading">
        <span className="profile-comparison-eyebrow"><Columns3 size={17} aria-hidden="true" />A closer look</span>
        <DialogTitle>Compare {startups ? 'startups' : 'investors'}</DialogTitle>
        <DialogDescription>Review what each profile shares. Keep the questions that matter to your next conversation.</DialogDescription>
      </DialogHeader>
      {choices.length ? <>
        <div className="profile-comparison-context"><span>{choices.length} of 3 profiles</span><p id={helpId}>Scroll across to compare. Use arrow keys when the table is focused.</p></div>
        <div className="profile-comparison-scroll" role="region" aria-label={`${startups ? 'Startup' : 'Investor'} comparison table`} aria-describedby={helpId} tabIndex={0}>
          <table className="profile-comparison-table">
            <caption className="sr-only">{startups ? 'Startup' : 'Investor'} profile details side by side. Information is self-reported. Fictional examples are labelled.</caption>
            <colgroup><col className="profile-comparison-label-column" />{choices.map(profile => <col key={profile.id} className="profile-comparison-profile-column" />)}</colgroup>
            <thead><tr><th scope="col" className="profile-comparison-corner"><span>What matters<br />to you?</span><small>No scores. Just the details.</small></th>{choices.map(profile => {
              return <th scope="col" key={profile.id}>
                <div className="profile-comparison-identity"><span className="profile-comparison-avatar" aria-hidden="true">{initials(profile.name)}</span><span className={`profile-comparison-source${profile.demo ? ' is-sample' : ''}`}>{profile.demo ? 'Fictional sample' : 'Member · Self-reported'}</span></div>
                <strong className="profile-comparison-name">{profile.name}</strong>
                <p className="profile-comparison-tagline">{profile.tagline || 'Introduction not added yet'}</p>
                {profileActions(profile)}
              </th>;
            })}</tr></thead>
            <tbody>{rows.map(row => <tr key={row.id}><th scope="row">{row.label}</th>{row.values.map((value, index) => <td key={choices[index].id} className={value === 'Not added yet' || value === 'Not shared' ? 'profile-comparison-missing' : undefined}>{value}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <div className="profile-comparison-mobile">
          <div className="profile-comparison-criterion"><label htmlFor={criterionId}>Compare by</label><select id={criterionId} value={selectedRow.id} onChange={event => setCriterion(event.target.value)}>{rows.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}</select><p>One detail, across all {choices.length} profiles.</p></div>
          <div className="profile-comparison-mobile-cards">{choices.map((profile, index) => {
            const value = selectedRow.values[index];
            return <article className="profile-comparison-mobile-card" key={profile.id}>
              <div className="profile-comparison-identity"><span className="profile-comparison-avatar" aria-hidden="true">{initials(profile.name)}</span><span className={`profile-comparison-source${profile.demo ? ' is-sample' : ''}`}>{profile.demo ? 'Fictional sample' : 'Member · Self-reported'}</span></div>
              <strong className="profile-comparison-name">{profile.name}</strong>
              <div className="profile-comparison-mobile-value"><h3>{selectedRow.label}</h3><p className={value === 'Not added yet' || value === 'Not shared' ? 'profile-comparison-missing' : undefined}>{value}</p></div>
              {profileActions(profile)}
            </article>;
          })}</div>
        </div>
        <p className="profile-comparison-footnote">{choices.some(profile => profile.demo) ? 'Fictional samples show how comparison works and cannot be contacted. ' : ''}Member information has not been independently checked. {startups ? 'A planning budget is not necessarily a fundraising target. ' : 'Location does not establish where someone can invest. '}Comparison is not an investment recommendation.</p>
      </> : <div className="profile-comparison-empty"><Columns3 size={28} aria-hidden="true" /><h3>Your comparison is clear.</h3><p>Choose up to three startups or three investors to compare their details.</p><button className="outline-button" type="button" onClick={() => onOpenChange(false)}>Back to discovery</button></div>}
    </DialogContent>
  </Dialog>;
}
