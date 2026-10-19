import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { transform } from 'esbuild';

// Exercise exported calculations from the actual components. No UI is mounted;
// these checks establish arithmetic and claim-label boundaries, not browser QA.
async function load(file) {
  const { code } = await transform(await fs.readFile(file, 'utf8'), { loader: 'tsx', format: 'cjs' });
  const modules = { react: {}, 'react/jsx-runtime': {}, 'lucide-react': {}, '@/lib/data': {} };
  const context = { module: { exports: {} }, exports: {}, require: name => {
    if (name.endsWith('.css')) return {};
    assert.ok(name in modules, `Unexpected dependency ${name}`); return modules[name];
  } };
  vm.runInNewContext(code, context); return context.module.exports;
}
let checks = 0;
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks++; };
const ok = (actual, label) => { assert.ok(actual, label); checks++; };
const close = (actual, expected, label) => { assert.ok(Math.abs(actual - expected) <= 1e-8, label); checks++; };
const throws = (operation, message) => { assert.throws(operation, message); checks++; };
const { modelRunway } = await load('components/runway-simulator.tsx');
const { modelUnitEconomics } = await load('components/unit-economics.tsx');
const { matchFictionalOpportunity, planExampleAllocation } = await load('components/thesis-radar.tsx');
const { scorePitchExamples } = await load('components/pitch-audit.tsx');

const budget = { capital: 2500000, foundersCount: 2, founderStipend: 45000, engHires: 0, engSalary: 60000, infraCloud: 20000, pilotBudgetPercent: 15, legalBufferPercent: 10 };
let runway = modelRunway(budget);
equal(runway.totalMonthlyBurn, 110000);
equal(runway.operationalCapital, 1875000);
equal(runway.runwayMonths, 17);
close(runway.exactRunwayMonths, 1875000 / 110000);
const tiny = { ...budget, capital: 500, foundersCount: 1, founderStipend: 1000, infraCloud: 0, pilotBudgetPercent: 0, legalBufferPercent: 0 };
runway = modelRunway(tiny);
equal(runway.runwayMonths, 0, 'A half-month budget must not claim one full month');
equal(runway.phases.length, 0, 'An unaffordable timeline is not invented');
equal(modelRunway({ ...tiny, capital: 0 }).runwayMonths, 0);
equal(modelRunway({ ...tiny, founderStipend: 5 }).totalMonthlyBurn, 5, 'No artificial 10,000 monthly spend floor');
equal(modelRunway({ ...tiny, founderStipend: 0 }).runwayMonths, null, 'Zero spend has no finite modeled time horizon');
const penny = modelRunway({ ...tiny, capital: 1, pilotBudgetPercent: 50, legalBufferPercent: 50 });
equal(penny.pilotReserve + penny.legalReserve, 1, 'Reserve rounding cannot allocate more than the available capital');
for (let months = 0; months <= 36; months++) {
  const modeled = modelRunway({ ...tiny, capital: months * 1000 + 250 });
  equal(modeled.runwayMonths, months);
  equal(modeled.phases.length, Math.min(4, months));
  let previous = 0;
  for (const phase of modeled.phases) {
    equal(phase.start, previous + 1, 'Proposed phases are contiguous');
    ok(phase.end >= phase.start, 'No reversed month interval');
    ok(phase.end <= modeled.runwayMonths, 'No proposed phase extends beyond the affordable horizon');
    previous = phase.end;
  }
  if (months) equal(previous, months, 'Proposed phases stop at the modeled full-month horizon');
  ok(modeled.runwayMonths * modeled.totalMonthlyBurn <= modeled.operationalCapital);
  ok((modeled.runwayMonths + 1) * modeled.totalMonthlyBurn > modeled.operationalCapital);
}
throws(() => modelRunway({ ...budget, capital: NaN }), /nonnegative finite/);
throws(() => modelRunway({ ...budget, pilotBudgetPercent: 95, legalBufferPercent: 10 }), /100%/);

let economics = modelUnitEconomics(6500, 18000, 75, 3);
equal(economics.monthlyGrossProfit, 4875);
close(economics.customerLifetimeMonths, 100 / 3);
close(economics.ltv, 162500);
close(economics.ltvCacRatio, 162500 / 18000);
close(economics.paybackMonths, 18000 / 4875);
equal(modelUnitEconomics(100, 200, 50, .1).customerLifetimeMonths, 1000, 'Small churn is used as entered rather than silently clamped');
economics = modelUnitEconomics(100, 200, 50, 0);
equal(economics.customerLifetimeMonths, null);
equal(economics.ltv, null);
equal(economics.ltvCacRatio, null);
equal(economics.paybackMonths, 4, 'Payback remains estimable independently of zero churn');
economics = modelUnitEconomics(100, 200, 0, 5);
equal(economics.ltv, 0);
equal(economics.paybackMonths, null, 'No gross profit means no finite payback, not 999 months');
economics = modelUnitEconomics(100, 0, 50, 5);
equal(economics.ltvCacRatio, null, 'A ratio cannot divide by zero acquisition cost');
equal(economics.paybackMonths, 0, 'No acquisition cost needs to be recovered');
equal(modelUnitEconomics(100, 200, 50, 100).customerLifetimeMonths, 1);
throws(() => modelUnitEconomics(-1, 200, 50, 5), /nonnegative finite/);
throws(() => modelUnitEconomics(100, 200, 50, 101), /percentages/);
throws(() => modelUnitEconomics(100, Infinity, 50, 5), /nonnegative finite/);

const example = { id: 'fictional', name: 'Fictional idea', sector: 'Agriculture', stage: 'Pre-product', budgetINR: 2500000, evidenceType: 'interviews', evidenceCount: 10, tagline: 'Fictional example.' };
equal(matchFictionalOpportunity(example, 'all', 'all', 2500000, 'interviews').matchScore, 100);
equal(matchFictionalOpportunity({ ...example, evidenceCount: 9 }, 'all', 'all', 2500000, 'interviews').matchScore, 75);
for (const kind of ['pilot', 'loi', 'prototype']) {
  const matched = matchFictionalOpportunity({ ...example, evidenceType: kind, evidenceCount: 100 }, 'all', 'all', 2500000, 'interviews');
  equal(matched.matchScore, 75, 'Other activity counts are never treated as interview counts');
  ok(matched.reasons.includes('Interview count is not provided in this example'));
}
equal(matchFictionalOpportunity({ ...example, evidenceType: 'loi', evidenceCount: 1 }, 'all', 'all', 2500000, 'pilot_loi').matchScore, 100);
equal(matchFictionalOpportunity({ ...example, evidenceType: 'pilot', evidenceCount: 0 }, 'all', 'all', 2500000, 'pilot_loi').matchScore, 75);
equal(matchFictionalOpportunity(example, 'Manufacturing', 'Idea-stage', 10000000, 'pilot_loi').matchScore, 10, 'Preset penalties are not hidden by an artificial minimum match score');
equal(planExampleAllocation(5000000, 10000000, 40).estimatedDeals, 0, 'An unaffordable ticket is not rounded up to one investment');
equal(planExampleAllocation(10000000, 2500000, 40).estimatedDeals, 2);
equal(planExampleAllocation(10000000, 2500000, 40).unallocatedCapital, 1000000);
for (const reserve of [0, 30, 40, 50, 100]) {
  const plan = planExampleAllocation(10000000, 1750000, reserve);
  ok(plan.estimatedDeals * 1750000 <= plan.initialCapital, 'Whole tickets never exceed the available initial budget');
  close(plan.estimatedDeals * 1750000 + plan.unallocatedCapital + plan.followOnReserve, 10000000);
}
throws(() => planExampleAllocation(10000000, 0, 40), /positive ticket/);
throws(() => planExampleAllocation(10000000, 2500000, 101), /0 to 100%/);

equal(scorePitchExamples({}).score, 0);
equal(scorePitchExamples({}).answered, 0);
equal(scorePitchExamples({ problem: 'grounded', evidence: 'behavior', milestone: 'concrete', uncertainty: 'transparent' }).score, 100);
equal(scorePitchExamples({ problem: 'macro', evidence: 'opinions', milestone: 'vague', uncertainty: 'defensive' }).score, 10);
equal(scorePitchExamples({ evidence: 'unknown-option' }).answered, 0);
const files = ['pitch-audit', 'runway-simulator', 'thesis-radar', 'unit-economics'];
const text = (await Promise.all(files.map(file => fs.readFile(`components/${file}.tsx`, 'utf8')))).join('\n');
for (const unsupported of ['High-Conviction Signal', 'Institutional Grade', 'Verified Signals', 'Top-Decile Efficiency', 'Venture-Fundable', 'historical early-stage angel syndicate conversion', '7.5%–12% per check', 'Investor-De-risked Path']) ok(!text.includes(unsupported), `${unsupported} is not claimed`);
console.log(`Planning models: ${checks} assertions passed across writing examples, fractional runway and bounded phases, evidence types, portfolio arithmetic and zero-value economics. Browser interaction was not tested.`);
