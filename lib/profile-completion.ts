import type { Profile } from "./data";

export type ProfileCompletionItem = {
  id: string;
  label: string;
  complete: boolean;
  step: number;
};

const has = (value: string | undefined, minimum = 2) =>
  (value?.trim().length ?? 0) >= minimum;

/** A writing checklist, never a measure of investability or verified claims. */
export function getProfileCompletion(profile: Profile) {
  const identity = has(profile.name) && has(profile.founder) && has(profile.city);
  const items: ProfileCompletionItem[] = profile.kind === "startup"
    ? [
        { id: "identity", label: "Name and location", complete: identity, step: 0 },
        { id: "summary", label: "One-line idea, sector and stage", complete: has(profile.tagline) && !!profile.sector && !!profile.stage, step: 0 },
        { id: "idea", label: "Problem and proposed solution", complete: has(profile.problem, 10) && has(profile.solution, 10), step: 1 },
        { id: "background", label: "Relevant founder background", complete: has(profile.experience, 10), step: 1 },
        { id: "learning", label: "Dated customer learning", complete: has(profile.validation, 10) && !!profile.evidenceDate, step: 1 },
        { id: "uncertainty", label: "An assumption still to test", complete: has(profile.uncertainty, 10), step: 1 },
        { id: "milestone", label: "A concrete next milestone", complete: has(profile.nextMilestone, 10), step: 2 },
        { id: "budget", label: "Planning budget and assumptions", complete: profile.fundingIntentINR > 0 && has(profile.budget, 10), step: 2 },
      ]
    : [
        { id: "identity", label: "Name and location", complete: identity, step: 0 },
        { id: "thesis", label: "Investment thesis", complete: has(profile.tagline) && has(profile.solution, 10), step: 0 },
        { id: "preferences", label: "Sector and stage interests", complete: !!(profile.sectors?.length || profile.sector) && !!(profile.stages?.length || profile.stage), step: 1 },
        { id: "background", label: "Investing role and background", complete: has(profile.experience, 10), step: 1 },
        { id: "evidence", label: "Evidence sought from founders", complete: has(profile.requiredEvidence || profile.validation, 10), step: 1 },
        { id: "range", label: "Indicative check range", complete: profile.checkRangeINR?.length === 2 && profile.checkRangeINR[0] > 0 && profile.checkRangeINR[0] <= profile.checkRangeINR[1], step: 2 },
        { id: "availability", label: "Availability for introductions", complete: has(profile.uncertainty, 10), step: 2 },
      ];
  const missing = items.filter(item => !item.complete);
  return {
    items,
    completed: items.length - missing.length,
    total: items.length,
    missing,
    nextStep: missing[0]?.step ?? 3,
  };
}
