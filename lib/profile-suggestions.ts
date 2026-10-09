import type { Profile } from './data';
import { profileFit, type FitSignal } from './profile-fit';

export type ProfileSuggestion = { profile: Profile; signals: FitSignal[]; alignedLabels: string[] };
export type ProfileSuggestions = { mode: 'members' | 'samples' | 'none'; matches: ProfileSuggestion[] };

/** Suggest a conversation only when a stated sector or stage aligns and neither contradicts it. */
export function profileSuggestions(anchor: Profile, candidates: Profile[], limit = 3): ProfileSuggestions {
  const unique = [...new Map(candidates.map(profile => [profile.id, profile])).values()];
  const eligible = unique
    .filter(profile => profile.kind !== anchor.kind && profile.id !== anchor.id && !profile.mine && profile.listed !== false)
    .map(profile => {
      const signals = profileFit(anchor.kind === 'startup' ? anchor : profile, anchor.kind === 'investor' ? anchor : profile);
      return { profile, signals, alignedLabels: signals.slice(0, 2).filter(signal => signal.status === 'aligned').map(signal => signal.label) };
    })
    .filter(match => match.alignedLabels.length > 0 && !match.signals.slice(0, 2).some(signal => signal.status === 'different'));
  const members = eligible.filter(match => !match.profile.demo);
  const matches = (members.length ? members : eligible.filter(match => match.profile.demo)).sort((a, b) =>
    b.alignedLabels.length - a.alignedLabels.length || a.profile.name.localeCompare(b.profile.name, 'en') || a.profile.id.localeCompare(b.profile.id));
  return { mode: members.length ? 'members' : matches.length ? 'samples' : 'none', matches: matches.slice(0, Math.max(0, limit)) };
}
