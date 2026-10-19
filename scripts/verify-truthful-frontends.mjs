import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';

// Exercise real React SSR and the actual export helpers. Browser APIs, network,
// auth providers and production records are deliberately absent.
const require = createRequire(import.meta.url);
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks++; }
function equal(actual, expected, message) { assert.equal(actual, expected, message); checks++; }
async function load(entryPoint) {
  const result = await build({ entryPoints: [entryPoint], bundle: true, packages: 'external', platform: 'node', format: 'cjs', write: false, loader: { '.css': 'empty' }, logLevel: 'silent' });
  const context = { module: { exports: {} }, exports: {}, require, console, URL };
  vm.runInNewContext(result.outputFiles[0].text, context, { filename: entryPoint });
  return context.module.exports;
}
const [ticker, comparison, canvas, preparation, memo, boundary, writing] = await Promise.all([
  'components/marketing-signal-ticker.tsx', 'components/marketing-signal-vs-deck.tsx', 'components/marketing-pitch-canvas.tsx',
  'components/virtual-data-room.tsx', 'components/diligence-memo.tsx', 'components/error-boundary.tsx', 'components/founder-readiness.tsx',
].map(load));
const render = (Component, props = {}) => renderToStaticMarkup(React.createElement(Component, props));
const base = { id: 'actual-startup', kind: 'startup', name: 'Member <img src=x onerror=alert(1)>', tagline: 'A member-written description.', founder: 'Founder', city: 'Chennai', sector: 'Manufacturing & Hardware', stage: 'Pre-product', problem: 'A stated problem with substantial detail that cannot establish authenticity.', solution: 'A proposed service, not a proven result.', experience: 'A long description of experience must not automatically mark any review complete.', validation: 'A member-reported observation with important limits.', uncertainty: 'Willingness to pay is unknown.', nextMilestone: 'Test the layout with consenting participants.', fundingIntentINR: 900000, budget: 'A planning estimate for an early prototype.', incorporationStatus: 'Not incorporated', productStatus: '', revenueStatus: '', evidenceDate: '', updates: [{ id: 'one', date: '2026-10-01', title: 'A public update', body: 'An update is not a verification.' }], demo: false, listed: true };

const tickerHtml = render(ticker.default);
ok(tickerHtml.includes('Fictional examples'), 'Example list is labelled before someone opens a detail');
equal((tickerHtml.match(/data-slot="dialog-trigger"/g) ?? []).length, 4, 'Each educational example has one accessible dialog trigger, without duplicate marquee controls');
ok(!/Live ecosystem|NETWORK SIGNALS|Verified Milestone|FindIn Network|16 Mo Avg|100%/i.test(tickerHtml), 'No invented live network metrics or identity badge is rendered');
equal(ticker.illustrativeQuestions.length, 4);
for (const example of ticker.illustrativeQuestions) { ok(example.question.endsWith('?')); ok(example.next.length > 20); ok(!('verified' in example), 'A demonstration cannot become verified through a boolean flag'); }

const comparisonHtml = render(comparison.default);
ok(comparisonHtml.includes('Fictional example'));
equal((comparisonHtml.match(/role="tab"/g) ?? []).length, 2, 'Comparison is honestly a two-part story, not a stage benchmark');
ok(!/83%|16\.2 Months|Zero Disputes|2026 BENCHMARK|Verified Venture/i.test(comparisonHtml));
ok(comparisonHtml.includes('does not prove demand or predict investment'));

const canvasHtml = render(canvas.default);
ok(canvasHtml.includes('FICTIONAL WALKTHROUGH'));
equal((canvasHtml.match(/role="tab"/g) ?? []).length, 4);
ok(canvasHtml.includes('Step 1 of 4'), 'Displayed step count describes navigation, not investability');
ok(!/conviction|validated signal|signal strength|\d+%/i.test(canvasHtml));
equal(canvas.learningWalkthrough.length, 4);
ok(canvas.learningWalkthrough[2].detail.includes('needed help'));
ok(canvas.learningWalkthrough[2].context.includes('did not meet'));
ok(canvas.learningWalkthrough[3].detail.includes('Willingness to pay is still unknown'));

for (const profile of [base, { ...base, id: 'actual-investor', kind: 'investor', name: 'Investor', requiredEvidence: 'Please explain the source and limits of customer observations.', checkRangeINR: [200000, 700000] }, { ...base, id: 'sample', demo: true }]) {
  const preparationHtml = render(preparation.default, { profile });
  ok(preparationHtml.includes('preparation checklist, not a file vault or document review'));
  ok(preparationHtml.includes('Selections are not saved to your account'));
  ok(!/NDA|Encrypted|Verified Record|12 Slides|2\.4 MB|Zero prior debt|18 user discovery|3 letters of intent/i.test(preparationHtml), 'No fabricated document, NDA or security assertion survives for either role');
  equal((preparationHtml.match(/type="checkbox"/g) ?? []).length, 4);
  ok(!/checked=""/.test(preparationHtml), 'Preparation begins entirely unchecked');
  equal(preparation.default({ profile }).key, profile.id, 'Profile-specific key prevents preparation marks crossing to another profile');
  if (profile.kind === 'startup') ok(preparationHtml.includes('Not incorporated'), 'A nonempty company-status field remains literal self-report, not a verification');
  else ok(preparationHtml.includes('Evidence the investor says they want'));

  const memoHtml = render(memo.default, { profile });
  ok(memoHtml.includes('All items start unchecked'));
  ok(memoHtml.includes('not saved to your account or shared'));
  ok(!/checked=""/.test(memoHtml), 'Long experience, budget and updates do not auto-check a review');
  ok(!/High Conviction|Gates Cleared|Diligence Score|Ready for substantive/i.test(memoHtml));
  equal(memo.default({ profile }).key, profile.id, 'Personal notes are keyed to their profile');
  const markdown = memo.personalMemoMarkdown(profile, [], 'My own question about a missing assumption.');
  ok(markdown.includes('My own question about a missing assumption.'));
  ok(markdown.includes('not verification or an investment assessment'));
  ok(markdown.includes('not saved in FindIn or sent to the profile owner'));
  equal((markdown.match(/- \[ \]/g) ?? []).length, memo.personalReviewTopics(profile.kind).length);
  ok(!/Conviction|Diligence Score|Gates Cleared|Evaluated By/i.test(markdown));
  ok(memo.profileMemoFacts(profile).some(fact => fact.value === profile.nextMilestone || fact.value === profile.uncertainty));
}
const escaped = render(memo.default, { profile: base });
ok(!escaped.includes('<img src=x onerror='), 'Member-provided text is escaped by real React SSR');
ok(escaped.includes('&lt;img'), 'Escaped member text stays visible');
const partial = memo.personalMemoMarkdown(base, [true], '');
equal((partial.match(/- \[x\]/g) ?? []).length, 1, 'Only the writer’s explicit selected mark appears in the export');
ok(partial.includes('No notes entered.'));

const writingHtml = render(writing.default, { idea: base, onEdit() {}, onTests() {}, onProgress() {} });
ok(writingHtml.includes('PROFILE WRITING HELPER'));
ok(writingHtml.includes('sections filled'));
ok(writingHtml.includes('does not assess their accuracy, customer demand or investment suitability'));
ok(writingHtml.includes('Plan a small test'));
ok(writingHtml.includes('Write a progress update'));
ok(!/Investor-Ready|Developing Traction|Signal Strength|Readiness Score|prove demand|increase investor response|High clarity/i.test(writingHtml));
ok(!writingHtml.includes('role="progressbar"'), 'Writing helper has no investment-style percentage gauge');
const withExtraUpdates = render(writing.default, { idea: { ...base, updates: [...base.updates, ...base.updates, ...base.updates] } });
const count = html => html.match(/\d+ of \d+ sections filled/)?.[0];
equal(count(withExtraUpdates), count(writingHtml), 'Adding updates cannot raise a readiness or quality score');
const emptyWriting = render(writing.default, { idea: { ...base, name: '', tagline: '', city: '', problem: '', solution: '', experience: '', validation: '', uncertainty: '', nextMilestone: '', fundingIntentINR: 0, budget: '' }, onEdit() {} });
ok(emptyWriting.includes('0 of 8 sections filled'));
ok(emptyWriting.includes('Next writing step: Name and location'));
ok(emptyWriting.includes('Continue writing'));

const error = new boundary.default({ children: null });
error.state = { hasError: true, error: new Error('Fixture render failure') };
const fallback = renderToStaticMarkup(error.render());
ok(fallback.includes('You may need to enter unsaved values again'));
ok(!fallback.includes('Your input was preserved'));
ok(fallback.includes('Try again'));

for (const path of ['components/marketing-signal-ticker.css', 'components/marketing-signal-vs-deck.css', 'components/marketing-pitch-canvas.css', 'components/virtual-data-room.css', 'components/diligence-memo.css']) {
  const source = await fs.readFile(path, 'utf8'); postcss.parse(source, { from: path }); checks++;
  ok(source.includes('var(--fi-'), `${path} uses the shared semantic design tokens`);
  ok(source.includes('focus-visible'), `${path} includes visible keyboard focus`);
}
const canvasSource = await fs.readFile('components/marketing-pitch-canvas.tsx', 'utf8');
ok(canvasSource.includes('buttons.current[next]?.focus()'), 'Arrow navigation moves focus to the selected canvas tab');
console.log(`Passed ${checks} truthful frontend checks: actual React SSR, factual profile projection, initially unchecked personal review, role-specific preparation, safe memo exports, profile-key isolation and CSS parsing. No browser, interaction geometry, legal certification or production data was tested.`);
