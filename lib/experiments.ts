import { z } from 'zod';

export const experimentLimits = { perIdea: 50, bodyBytes: 40_000 } as const;

const required = (label: string, minimum: number, maximum: number) => z.string().trim()
  .min(minimum, `Add at least ${minimum} characters for ${label}.`)
  .max(maximum, `Use ${maximum} characters or fewer for ${label}.`);
const optional = (label: string, maximum: number) => z.string().trim()
  .max(maximum, `Use ${maximum} characters or fewer for ${label}.`).default('');

function calendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function evidenceAddress(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}

export const experimentProfileIdSchema = z.string().trim().min(1, 'Choose an idea.').max(100, 'This idea link is invalid.');
const recordIdSchema = z.string().trim().min(1, 'Choose a test.').max(100, 'This test link is invalid.');
const versionSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

export const experimentPlanSchema = z.object({
  title: required('the test name', 3, 100),
  assumption: required('what needs to be true', 10, 1000),
  method: required('the test method', 10, 1000),
  audience: required('who will take part', 3, 500),
  successCriterion: required('the result you are looking for', 10, 1000),
  dueDate: z.string().refine(value => value === '' || calendarDate(value), 'Choose a valid calendar date.').default(''),
}).strict();

export const experimentResultSchema = z.object({
  observations: required('what happened', 10, 2000),
  learning: required('what you learned', 10, 1500),
  decision: z.enum(['continue', 'change', 'stop', 'inconclusive'], { errorMap: () => ({ message: 'Choose your next decision.' }) }),
  nextStep: optional('your next step', 1000),
  evidenceUrl: optional('the supporting link', 1000).refine(evidenceAddress, 'Use an HTTPS link without a username or password.'),
}).strict();

const identity = { profileId: experimentProfileIdSchema, id: recordIdSchema, version: versionSchema };
export const experimentActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), profileId: experimentProfileIdSchema, plan: experimentPlanSchema }).strict(),
  z.object({ action: z.literal('edit'), ...identity, plan: experimentPlanSchema }).strict(),
  z.object({ action: z.literal('start'), ...identity }).strict(),
  z.object({ action: z.literal('complete'), ...identity, result: experimentResultSchema }).strict(),
  z.object({ action: z.literal('share'), ...identity, shared: z.boolean(), consent: z.literal(true) }).strict(),
  z.object({ action: z.literal('remove'), ...identity }).strict(),
]);

export type ExperimentPlan = z.infer<typeof experimentPlanSchema>;
export type ExperimentResult = z.infer<typeof experimentResultSchema>;
export type ExperimentAction = z.infer<typeof experimentActionSchema>;
export type Experiment = ExperimentPlan & Omit<ExperimentResult, 'decision'> & {
  id: string;
  profileId: string;
  status: 'draft' | 'running' | 'complete';
  decision: ExperimentResult['decision'] | '';
  shared: boolean;
  version: number;
  created: string;
  startedAt: string;
  completedAt: string;
  updated: string;
};

export type StoredExperiment = {
  id: string;
  profile_id: string;
  plan: string;
  result: string;
  status: Experiment['status'];
  shared: number;
  version: number;
  created: string;
  started_at: string;
  completed_at: string;
  updated: string;
};

// Deliberate field projection: stored JSON and future columns cannot add account
// identifiers, hidden draft fields, or arbitrary properties to a public record.
export function projectExperiment(row: StoredExperiment): Experiment {
  const plan = experimentPlanSchema.parse(JSON.parse(row.plan));
  const result = row.status === 'complete' ? experimentResultSchema.parse(JSON.parse(row.result)) : null;
  return {
    id: row.id, profileId: row.profile_id,
    title: plan.title, assumption: plan.assumption, method: plan.method,
    audience: plan.audience, successCriterion: plan.successCriterion, dueDate: plan.dueDate,
    status: row.status,
    observations: result?.observations ?? '', learning: result?.learning ?? '',
    decision: result?.decision ?? '', nextStep: result?.nextStep ?? '', evidenceUrl: result?.evidenceUrl ?? '',
    shared: !!row.shared, version: row.version,
    created: row.created, startedAt: row.started_at, completedAt: row.completed_at, updated: row.updated,
  };
}
