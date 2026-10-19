import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Pure input/export checks and actual React SSR. No browser events or provider writes.
const require = createRequire(import.meta.url);
async function load(file) {
  const compiled = await build({ entryPoints: [file], bundle: true, packages: 'external', platform: 'node', format: 'cjs', write: false, loader: { '.css': 'empty' }, logLevel: 'silent' });
  const context = { module: { exports: {} }, exports: {}, require, URL, console };
  vm.runInNewContext(compiled.outputFiles[0].text, context, { filename: file });
  return context.module.exports;
}
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++; };
const { emptyFounderUpdate, buildFounderUpdate } = await load('lib/founder-update.ts');
const empty = emptyFounderUpdate(new Date('2026-10-19T12:00:00Z'));
equal(empty.period, '2026-10');
for (const field of ['burn', 'cash', 'mrr', 'growth', 'wins', 'headwinds', 'asks']) equal(empty[field], '', 'No invented metric or milestone is inserted');
equal(buildFounderUpdate(empty, 'Idea A').ok, false, 'Blank draft cannot become a meaningful progress update');
const draft = { ...empty, wins: 'Three people tried our initial prototype; willingness to pay remains unknown.' };
const missing = buildFounderUpdate(draft, 'Idea A');
ok(missing.ok);
ok(missing.body.includes('Cash available: Not provided'), 'Empty is distinct from zero');
ok(missing.body.includes('Estimated runway: Not calculated'));
ok(missing.body.includes('Monthly revenue change: Not provided'));
ok(!/enterprise|85,000|35,00,000|24%/.test(missing.body));
ok(missing.markdown.includes('Idea A'));
ok(!missing.body.includes('Idea A'), 'Posting target comes from exact profile ID, not body parsing');
const modeled = buildFounderUpdate({ ...draft, cash: '100000', burn: '25000', mrr: '0', growth: '-12.5', asks: 'Feedback on our next prototype test.' }, 'Idea B');
ok(modeled.ok);
ok(modeled.body.includes('4.0 months (constant net burn assumption)'));
ok(modeled.body.includes('Monthly recurring revenue: ₹0'));
ok(modeled.body.includes('Monthly revenue change: -12.5%'), 'Negative growth never receives an invented plus sign');
ok(modeled.markdown.startsWith('# Idea B'));
for (const burn of ['', '0']) {
  const result = buildFounderUpdate({ ...draft, cash: '100000', burn }, 'Idea A');
  ok(result.ok); ok(result.body.includes('Estimated runway: Not calculated'), 'Zero or missing burn does not invent unlimited runway');
}
const zeroCash = buildFounderUpdate({ ...draft, cash: '0', burn: '25000' }, 'Idea A');
ok(zeroCash.ok); ok(zeroCash.body.includes('0.0 months'));
for (const field of ['cash', 'burn', 'mrr']) for (const value of ['-1', 'NaN', 'Infinity', '1000000000001', 'not a number']) equal(buildFounderUpdate({ ...draft, [field]: value }, 'Idea A').ok, false, `${field}: invalid amount is rejected, not converted or clamped`);
for (const growth of ['-101', '10001', 'Infinity', 'not a number']) equal(buildFounderUpdate({ ...draft, growth }, 'Idea A').ok, false);
for (const growth of ['-100', '0', '10000']) equal(buildFounderUpdate({ ...draft, growth }, 'Idea A').ok, true);
for (const period of ['', '2026-00', '2026-13', '2026-1', 'anything']) equal(buildFounderUpdate({ ...draft, period }, 'Idea A').ok, false);
for (const field of ['wins', 'headwinds', 'asks']) equal(buildFounderUpdate({ ...draft, [field]: 'x'.repeat(501) }, 'Idea A').ok, false, 'Overlong content is refused rather than silently truncated');
const maximum = buildFounderUpdate({ ...draft, wins: 'w'.repeat(500), headwinds: 'h'.repeat(500), asks: 'a'.repeat(500), cash: '1000000000000', burn: '1', mrr: '1000000000000', growth: '10000' }, 'Idea A');
ok(maximum.ok); ok(maximum.body.length <= 2000); ok(maximum.body.includes('a'.repeat(500)), 'Full final ask survives export and posting');
const { default: FounderUpdate } = await load('components/founder-ir-update.tsx');
for (const listed of [true, false]) {
  const html = renderToStaticMarkup(React.createElement(FounderUpdate, { idea: { id: `idea-${listed}`, name: 'Idea <A>', listed, moderation: null }, onWrite: async () => {} }));
  ok(html.includes('Idea &lt;A&gt;'), 'Member name is escaped by React');
  ok(html.includes('This tool does not send emails'));
  equal((html.match(/type="number"/g) ?? []).length, 4);
  equal((html.match(/placeholder="Not provided"/g) ?? []).length, 4);
  ok(!/type="checkbox"[^>]*checked/.test(html), 'Visibility consent starts unchecked');
  ok(new RegExp(`disabled=""[^>]*>.*?(?:${listed ? 'Publish to Progress' : 'Save private update'})`, 's').test(html), 'Publishing starts disabled for a blank unreviewed draft');
  ok(!/₹35|₹85|enterprise pilot|tenant workspace/.test(html));
  ok(html.includes(listed ? 'including any financial figures' : 'becomes public if I list this idea later'));
}
const { ventureTools } = await load('lib/venture-tools.ts');
const sources = await Promise.all(['app/page.tsx', 'components/marketing-templates.tsx'].map(file => fs.readFile(file, 'utf8')));
equal(ventureTools.length, 7);
equal(new Set(ventureTools.map(tool => tool.id)).size, 7);
for (const tool of ventureTools) {
  equal((sources.join('\n').match(new RegExp(`id="tool-${tool.id}"`, 'g')) ?? []).length, 1, `${tool.name} has exactly one actual frontend anchor`);
  ok(tool.description.length > 15);
}
const platform = await fs.readFile('app/platform.tsx', 'utf8');
ok(!platform.includes('<CustomerSignals'), 'Fictional customer records are never injected into member evidence');
const ideas = await fs.readFile('components/founder-ideas.tsx', 'utf8');
ok(ideas.includes('key={`ir:${activeIdea.id}`}'), 'Monthly drafts remount for a different idea');
ok(ideas.includes('onDirtyChange={setProgressDirty}') && ideas.includes('onBusyChange={setTestBusy}'), 'Monthly editor participates in existing discard and navigation protection');
const { default: Signals } = await load('components/customer-signals.tsx');
const actual = renderToStaticMarkup(React.createElement(Signals, { startupName: 'Actual member' }));
ok(!actual.includes('Lead Machining Supervisor'), 'Absent customer records stay absent by default');
ok(!actual.includes('NaN'));
const example = renderToStaticMarkup(React.createElement(Signals, { example: true }));
ok(example.includes('FICTIONAL EXAMPLE') && example.includes('ALL RECORDS ARE FICTIONAL'));
ok(!example.includes('Validated Interviews') && !example.includes('Written proof secured'));
const [{ default: Opportunity }, { seedProfiles }] = await Promise.all([load('components/opportunity-card.tsx'), load('lib/data.ts')]);
const sampleIdea = seedProfiles.find(profile => profile.kind === 'startup');
for (const fundingIntentINR of [800000, 5000000]) {
  const html = renderToStaticMarkup(React.createElement(Opportunity, { profile: { ...sampleIdea, demo: false, fundingIntentINR }, saved: false, selected: false, busy: false, onCompare: () => {}, onSave: () => {}, onOpen: () => {}, onContact: () => {} }));
  ok(!html.includes('14–18 mo') && !html.includes('8–12 mo'), 'A planning budget alone cannot establish runway for a real profile');
  ok(html.includes('Self-reported · Unverified'));
}
ok(ideas.includes('beforeunload'), 'Unsaved monthly text and pending saves participate in the native departure warning');
console.log(`Founder update, tools and customer-record checks passed: ${checks} (pure logic + React SSR; no browser interaction).`);
