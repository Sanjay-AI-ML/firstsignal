import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { transform } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Local arithmetic and real server rendering. No DOM simulation, transactions,
// provider writes, document signing or claim of browser/visual verification.
const require = createRequire(import.meta.url);
let checks = 0;
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks++; };
const ok = (value, label) => { assert.ok(value, label); checks++; };
const deepEqual = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const close = (actual, expected, label) => { assert.ok(Math.abs(actual - expected) < .00000001, `${label}: ${actual} != ${expected}`); checks++; };
const plain = value => JSON.parse(JSON.stringify(value));
async function load(file, modules = {}) {
  const { code } = await transform(await fs.readFile(file, 'utf8'), { loader: file.endsWith('.tsx') ? 'tsx' : 'ts', format: 'cjs', jsx: 'automatic' });
  const context = { module: { exports: {} }, exports: {}, require(name) {
    if (Object.hasOwn(modules, name)) return modules[name];
    if (['react', 'react/jsx-runtime', 'lucide-react'].includes(name)) return require(name);
    if (name.endsWith('.css')) return {};
    throw new Error(`Unexpected planning component dependency: ${name}`);
  } };
  vm.runInNewContext(code, context, { filename: file });
  return context.module.exports;
}
const helpers = await load('lib/planning-tools.ts');
const { fundingScenario, allocationScenario, nextFounderId, founderAllocation, vestingFraction } = helpers;

// Three pricing variants use only the fields they advertise. The result is
// deliberately the disclosed simplified arithmetic, never a legal SAFE model.
const inputs = Object.freeze({ mode: 'cap-discount', investmentINR: 1000000, capINR: 100000000, discountPercent: 20, nextRoundPriceINR: 100, fullyDilutedShares: 1000000 });
let result = fundingScenario(inputs);
equal(result.capPrice, 100);
equal(result.discountPrice, 80);
equal(result.conversionPrice, 80);
equal(result.newShares, 12500);
close(result.illustrativeOwnership, 12500 / 1012500 * 100, 'Ownership divides new shares by existing plus modeled new shares');
result = fundingScenario({ ...inputs, mode: 'cap-only', discountPercent: NaN, nextRoundPriceINR: NaN });
equal(result.capPrice, 100);
equal(result.discountPrice, null, 'Cap-only never applies or requires a discount');
equal(result.conversionPrice, 100);
equal(result.newShares, 10000);
result = fundingScenario({ ...inputs, mode: 'discount-only', capINR: NaN });
equal(result.capPrice, null, 'Discount-only never applies or requires a cap');
equal(result.discountPrice, 80);
equal(result.conversionPrice, 80);
equal(fundingScenario({ ...inputs, capINR: 50000000 }).conversionPrice, 50, 'A lower cap price beats the discount when both are selected');
equal(fundingScenario({ ...inputs, discountPercent: 0 }).discountPrice, 100, 'A zero discount is a valid explicit assumption');
close(fundingScenario({ ...inputs, discountPercent: 99 }).discountPrice, 1, 'A99% discount leaves1% of the entered price');
equal(fundingScenario({ ...inputs, mode: 'unknown' }), null);
for (const [key, values] of Object.entries({ investmentINR: [0, -1, NaN, Infinity], capINR: [0, -1, NaN, Infinity], discountPercent: [-1, 100, NaN, Infinity], nextRoundPriceINR: [0, -1, NaN, Infinity], fullyDilutedShares: [0, -1, NaN, Infinity] })) {
  for (const value of values) equal(fundingScenario({ ...inputs, [key]: value }), null, `Invalid ${key} cannot produce an apparent successful scenario`);
}
equal(fundingScenario({ ...inputs, investmentINR: Number.MAX_VALUE, capINR: Number.MIN_VALUE }), null, 'Arithmetic overflow cannot leak Infinity into displayed results');
deepEqual(plain(inputs), { mode: 'cap-discount', investmentINR: 1000000, capINR: 100000000, discountPercent: 20, nextRoundPriceINR: 100, fullyDilutedShares: 1000000 }, 'Calculations do not mutate inputs');

const tiers = Object.freeze([{ amountINR: 1000000, count: 2 }, { amountINR: 500000, count: 1 }, { amountINR: 250000, count: 1 }]);
result = allocationScenario(5000000, 1500000, tiers);
equal(result.totalINR, 4250000);
equal(result.additionalINR, 2750000);
equal(result.additionalSlots, 4);
equal(result.slots, 5);
equal(result.differenceINR, 750000);
equal(result.percent, 85);
equal(result.status, 'under');
equal(allocationScenario(4250000, 1500000, tiers).status, 'equal');
result = allocationScenario(4000000, 1500000, tiers);
equal(result.status, 'over', 'An over-target scenario must not claim a filled or committed round');
equal(result.differenceINR, -250000);
equal(result.percent, 106.25);
equal(allocationScenario(5000000, 0, []).slots, 0, 'A zero lead creates no phantom investor slot');
equal(allocationScenario(5000000, 0, tiers).slots, 4);
equal(allocationScenario(1000000, 1500000, []).status, 'over', 'A lead amount above target remains visible rather than silently clamped');
for (const [target, lead] of [[0, 0], [-1, 0], [NaN, 0], [Infinity, 0], [100, -1], [100, NaN], [100, Infinity]]) equal(allocationScenario(target, lead, tiers), null);
for (const tier of [{ amountINR: -1, count: 1 }, { amountINR: NaN, count: 1 }, { amountINR: 100, count: -1 }, { amountINR: 100, count: 1.5 }, { amountINR: 100, count: Number.MAX_SAFE_INTEGER + 1 }]) equal(allocationScenario(1000, 0, [tier]), null);
equal(allocationScenario(1000, 0, [{ amountINR: Number.MAX_VALUE, count: 2 }]), null, 'Allocation overflow is invalid');

// Regression: removing the middle founder then adding used to reuse an occupied
// ID and cause one slider update to change more than one founder.
let identities = [{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }];
identities = identities.filter(item => item.id !== 'f2');
const added = nextFounderId(identities);
ok(!identities.some(item => item.id === added));
identities.push({ id: added });
equal(new Set(identities.map(item => item.id)).size, 3);
equal(identities.filter(item => item.id === added).length, 1, 'An update target identifies exactly one local founder');
equal(nextFounderId([]), 'f1');
equal(nextFounderId([{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }]), 'f4');
const founder = id => ({ id, name: id, role: 'Co-founder', ideaGenesis: 50, timeCommitment: 50, technicalExecution: 50, domainNetwork: 50, cashContributed: 0 });
const two = Object.freeze([founder('a'), founder('b')]);
deepEqual(plain(founderAllocation(two, 10)).map(item => item.calculatedEquity), [45, 45], 'Equal ratings produce equal modeled allocation');
const three = founderAllocation([founder('a'), founder('b'), founder('c')], 10);
deepEqual(plain(three).map(item => item.calculatedEquity), [30, 30, 30]);
const rounded = founderAllocation([founder('a'), founder('b'), founder('c')], 0);
deepEqual(plain(rounded).map(item => item.calculatedEquity), [33.4, 33.3, 33.3]);
close(rounded.reduce((sum, item) => sum + item.calculatedEquity, 0), 100, 'Rounding does not invent or lose displayed equity');
for (const pool of [0, 5, 10, 10.5, 20, 99.9, 100]) {
  const allocation = founderAllocation([founder('a'), { ...founder('b'), technicalExecution: 100 }, { ...founder('c'), cashContributed: 500000 }], pool);
  close(allocation.reduce((sum, item) => sum + item.calculatedEquity, 0) + pool, 100, 'Founder allocations plus reserve total100%');
  ok(allocation.every(item => Number.isFinite(item.calculatedEquity) && item.calculatedEquity >= 0));
}
equal(founderAllocation([], 10), null);
equal(founderAllocation([founder('a'), founder('a')], 10), null, 'Duplicate founder identities are rejected');
for (const pool of [-1, 101, NaN, Infinity, 10.05]) equal(founderAllocation(two, pool), null);
for (const bad of [{ ideaGenesis: -1 }, { technicalExecution: 101 }, { domainNetwork: Infinity }, { cashContributed: -1 }]) equal(founderAllocation([{ ...founder('a'), ...bad }], 10), null);
equal(two[0].ideaGenesis, 50, 'Allocation scoring does not overwrite entered founder ratings');
equal(vestingFraction(11, 48, 12), 0);
equal(vestingFraction(12, 48, 12), .25);
equal(vestingFraction(24, 48, 12), .5);
equal(vestingFraction(60, 48, 12), 1);
equal(vestingFraction(6, 36, 6), 1 / 6, 'A six-month cliff on a three-year schedule is not hardcoded25%');
equal(vestingFraction(1, 60, 0), 1 / 60, 'A no-cliff schedule accrues from monthone');
equal(vestingFraction(0, 48, 0), 0);
for (const args of [[-1, 48, 12], [1, 0, 0], [1, 48, -1], [1, 48, 49], [NaN, 48, 12]]) equal(vestingFraction(...args), null);

// Actual server-rendered components mounted twice prove headings and field
// labels use instance IDs, including the previously static equity title.
const components = [];
for (const file of ['components/term-sheet-generator.tsx', 'components/syndicate-room.tsx', 'components/equity-calculator.tsx']) {
  const component = (await load(file, { '@/lib/planning-tools': helpers })).default;
  components.push(component);
}
const html = renderToStaticMarkup(React.createElement(React.Fragment, null, ...components.flatMap((component, index) => [React.createElement(component, { key: `${index}-a` }), React.createElement(component, { key: `${index}-b` })])));
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
equal(ids.length, new Set(ids).size, 'Repeated mounted planning tools have no duplicate DOM IDs in SSR');
for (const match of html.matchAll(/\bfor="([^"]+)"/g)) ok(ids.includes(match[1]), 'Each explicit field label targets a rendered field');
ok(html.includes('Funding scenario worksheet') && html.includes('Co-investment planning worksheet') && html.includes('Founder allocation &amp; vesting worksheet'));
const reviewInputs = [...html.matchAll(/<input\b[^>]*type="checkbox"[^>]*>/g)];
equal(reviewInputs.length, 10, 'Both co-investment examples render five personal review topics');
ok(reviewInputs.every(match => !/\bchecked(?:=|\s|>)/.test(match[0])), 'No review topic is preselected as completed or verified');
for (const claim of ['India-Compliant', 'Section 42 Compliant', 'Safe-Harbor', 'SAFE HARBOR', 'Verified Record', 'Live Indian Market Metrics', '100% Round Filled', 'primary cause of co-founder disputes']) ok(!html.includes(claim), 'Removed unsupported legal or success claims do not render');
ok(!html.includes('Term Sheet') && !html.includes('Accord'), 'The rendered planning tools do not pose as issued agreements');
ok(html.includes('Nothing is saved') && html.includes('No money, securities, signatures or invitations'), 'Local-only scope is visible before interaction');
console.log(`Passed ${checks} planning-tool checks: cap/discount variants and arithmetic; over/under-target allocation; zero-lead slots; immutable inputs; remove/add founder identity; rounding totals; variable vesting/cliffs; repeated-instance SSR labels; unchecked review topics and accurate planning scope. These are unit/SSR checks, not browser or legal certification.`);
