import type { DiscoveryState } from './discovery-state';

/** Keep an unchanged failed creation's key for an explicit retry in this tab. */
export function createOperationTracker(makeId: () => string = () => crypto.randomUUID()) {
  const operations = new Map<string, string>();
  return {
    prepare(payload: Record<string, unknown>) {
      const fingerprint = JSON.stringify(payload);
      let operationId = operations.get(fingerprint);
      if (!operationId) {
        operationId = makeId();
        if (operations.size >= 50) operations.delete(operations.keys().next().value!);
        operations.set(fingerprint, operationId);
      }
      return { fingerprint, payload: { ...payload, operationId } };
    },
    complete(fingerprint: string) { operations.delete(fingerprint); },
  };
}

export type SavedDiscoveryFilters = DiscoveryState & { signalsOnly: boolean };
export function savedDiscoveryFilters(query: string, raw: string): SavedDiscoveryFilters {
  let value: Record<string, unknown> = {};
  try { const parsed = JSON.parse(raw); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) value = parsed; } catch { /* A legacy malformed filter falls back to a usable search. */ }
  const text = (key: string, fallback: string, maximum: number) => typeof value[key] === 'string' ? (value[key] as string).slice(0, maximum) || fallback : fallback;
  return {
    kind: value.kind === 'investor' ? 'investor' : 'startup', search: query.slice(0, 100),
    sector: text('sector', 'all', 100), stage: text('stage', 'all', 80),
    sort: ['curated', 'name', 'budget'].includes(String(value.sort)) ? String(value.sort) : 'curated',
    membersOnly: value.membersOnly === true, signalsOnly: value.signalsOnly === true,
  };
}

const revisionFields = [
  ['name', 'Name'], ['tagline', 'Introduction'], ['founder', 'Founder'], ['city', 'Location'],
  ['sector', 'Sector'], ['customSector', 'Other sector'], ['stage', 'Stage'], ['problem', 'Ideology'],
  ['solution', 'Proposed solution'], ['experience', 'Experience'], ['validation', 'Learning'],
  ['uncertainty', 'Open questions'], ['nextMilestone', 'Next step'], ['fundingIntentINR', 'Funding intent (INR)'],
  ['budget', 'Budget plan'], ['productStatus', 'Product status'], ['revenueStatus', 'Revenue status'],
  ['incorporationStatus', 'Incorporation status'],
] as const;
export function revisionDifferences(current: Record<string, unknown>, previous: Record<string, unknown>) {
  const display = (value: unknown) => typeof value === 'string' ? value || 'Not provided' : typeof value === 'number' ? String(value) : 'Not provided';
  return revisionFields.filter(([key]) => JSON.stringify(current[key] ?? '') !== JSON.stringify(previous[key] ?? ''))
    .map(([key, label]) => ({ key, label, current: display(current[key]), previous: display(previous[key]) }));
}
