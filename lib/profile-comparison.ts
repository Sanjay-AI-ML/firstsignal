import { formatINR, type Profile } from './data';
import { profileSectorNames } from './sectors';

export type ComparisonRow = { id: string; label: string; values: string[] };

/** Comparison keeps a single profile type so the row labels stay meaningful. */
export function comparisonProfiles(profiles: Profile[]): Profile[] {
  const kind = profiles[0]?.kind;
  return [...new Map(profiles.filter(profile => profile.kind === kind).map(profile => [profile.id, profile])).values()].slice(0, 3);
}

const text = (value: string | undefined) => value?.trim() || 'Not added yet';
const amount = (value: number) => Number.isFinite(value) && value > 0 ? formatINR(value) : 'Not shared';
function investmentRange(profile: Profile) {
  const range = profile.checkRangeINR;
  if (range?.length === 2 && range.every(value => Number.isFinite(value) && value > 0) && range[0] <= range[1]) {
    return `${formatINR(range[0])}–${formatINR(range[1])} · Preferred range`;
  }
  return profile.fundingIntentINR > 0 && Number.isFinite(profile.fundingIntentINR)
    ? `${formatINR(profile.fundingIntentINR)} · Single preferred amount; no range added`
    : 'Not shared';
}

/** Display only the information supplied; this helper never ranks opportunities. */
export function compareRows(profiles: Profile[]): ComparisonRow[] {
  const choices = comparisonProfiles(profiles);
  if (!choices.length) return [];
  const definitions: { id: string; label: string; read: (profile: Profile) => string }[] = choices[0].kind === 'startup'
    ? [
        { id: 'sector', label: 'Sector', read: profile => text(profileSectorNames(profile).join(', ')) },
        { id: 'stage', label: 'Current stage', read: profile => text(profile.stage) },
        { id: 'location', label: 'Location', read: profile => text(profile.city) },
        { id: 'ideology', label: 'Ideology', read: profile => text(profile.problem) },
        { id: 'solution', label: 'Proposed solution', read: profile => text(profile.solution) },
        { id: 'learning', label: 'What they have learned', read: profile => text(profile.validation) },
        { id: 'uncertainty', label: 'Still to test', read: profile => text(profile.uncertainty) },
        { id: 'milestone', label: 'Next step', read: profile => text(profile.nextMilestone) },
        { id: 'amount', label: 'Planning budget', read: profile => amount(profile.fundingIntentINR) },
        { id: 'budget', label: 'Budget assumptions', read: profile => text(profile.budget) },
        { id: 'product', label: 'What is built', read: profile => text(profile.productStatus) },
        { id: 'revenue', label: 'Revenue status', read: profile => text(profile.revenueStatus) },
        { id: 'incorporation', label: 'Company status', read: profile => text(profile.incorporationStatus) },
        { id: 'background', label: 'Founder background', read: profile => text(profile.experience) },
      ]
    : [
        { id: 'sector', label: 'Sectors considered', read: profile => text(profileSectorNames(profile).join(', ')) },
        { id: 'stage', label: 'Stages considered', read: profile => text((profile.stages?.length ? profile.stages : [profile.stage]).filter(Boolean).join(', ')) },
        { id: 'location', label: 'Location', read: profile => text(profile.city) },
        { id: 'interests', label: 'Investment interests', read: profile => text(profile.solution || profile.tagline) },
        { id: 'evidence', label: 'What they want to see', read: profile => text(profile.requiredEvidence || profile.validation) },
        { id: 'range', label: 'Investment amount', read: investmentRange },
        { id: 'availability', label: 'Availability', read: profile => text(profile.uncertainty) },
        { id: 'background', label: 'Investing role & background', read: profile => text(profile.experience || profile.role) },
      ];
  return definitions.map(({ id, label, read }) => ({ id, label, values: choices.map(read) }));
}
