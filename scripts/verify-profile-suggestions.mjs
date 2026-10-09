import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Load the same TypeScript helper while resolving its runtime import for native Node.
const source = await readFile(new URL('../lib/profile-suggestions.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  .replace("'./profile-fit'", JSON.stringify(new URL('../lib/profile-fit.ts', import.meta.url).href));
const { profileSuggestions } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
let checks = 0;
const check = (actual, expected) => { assert.deepEqual(actual, expected); checks += 1; };
const founder = { id: 'mine', kind: 'startup', name: 'My company', sector: 'Manufacturing SaaS', stage: 'Pre-product', fundingIntentINR: 500000, mine: true };
const investor = { id: 'investor', kind: 'investor', name: 'Investor', sector: 'Manufacturing SaaS', stage: 'Pre-product', demo: false, listed: true, checkRangeINR: [500000, 1000000] };
const example = { ...investor, id: 'sample', name: 'Example', demo: true };
const ids = result => result.matches.map(match => match.profile.id);

check(profileSuggestions(founder, [investor]).mode, 'members');
check(profileSuggestions(founder, [investor]).matches[0].alignedLabels, ['Sector', 'Product stage']);
check(ids(profileSuggestions(founder, [example, investor])), ['investor']);
check(profileSuggestions(founder, [example]).mode, 'samples');
check(profileSuggestions(founder, [{ ...investor, stage: 'Early traction' }]).mode, 'none');
check(profileSuggestions(founder, [{ ...investor, sector: 'Logistics SaaS' }]).mode, 'none');
check(profileSuggestions(founder, [{ ...investor, stages: ['Idea-stage', 'Pre-product'], stage: 'Idea-stage' }]).mode, 'members');
check(profileSuggestions(founder, [{ ...investor, sectors: ['Logistics SaaS', 'Manufacturing SaaS'], sector: 'Logistics SaaS' }]).mode, 'members');
check(profileSuggestions(founder, [{ ...investor, sectors: ['Manufacturing SaaS'], stages: ['Early traction'] }]).mode, 'none');
check(profileSuggestions(founder, [{ ...investor, sector: 'Other', stage: '' }]).mode, 'none');
check(profileSuggestions(founder, [{ ...investor, sector: 'Other' }]).matches[0].alignedLabels, ['Product stage']);
check(profileSuggestions(founder, [{ ...investor, stage: '' }]).matches[0].alignedLabels, ['Sector']);
check(profileSuggestions(founder, [{ ...investor, checkRangeINR: undefined, fundingIntentINR: 500000 }]).matches[0].signals[2].status, 'unknown');
check(profileSuggestions({ ...founder, fundingIntentINR: 0 }, [investor]).matches[0].signals[2].status, 'unknown');
check(profileSuggestions(founder, [{ ...investor, checkRangeINR: [1000000, 2000000] }]).matches[0].signals[2].status, 'different');
check(profileSuggestions(founder, [{ ...investor, checkRangeINR: [1000000, 500000] }]).matches[0].signals[2].status, 'unknown');
check(profileSuggestions(founder, [investor]).matches[0].signals[3].status, 'unknown');
check(profileSuggestions(founder, [investor]).matches[0].signals[4].status, 'unknown');
check(ids(profileSuggestions(founder, [investor, { ...example, mine: true }])), ['investor']);
check(profileSuggestions(founder, [{ ...investor, listed: false }]).mode, 'none');
check(profileSuggestions(founder, [{ ...investor, mine: true }]).mode, 'none');
check(profileSuggestions(founder, [{ ...founder, mine: false }]).mode, 'none');
check(ids(profileSuggestions(investor, [{ ...founder, mine: false, listed: true, demo: false }])), ['mine']);
check(ids(profileSuggestions(founder, [investor, investor])), ['investor']);
check(ids(profileSuggestions(founder, [{ ...investor, id: 'unknown-sector', sector: 'Other', name: 'A' }, investor])), ['investor', 'unknown-sector']);
check(ids(profileSuggestions(founder, [{ ...investor, stage: 'Early traction' }, example])), ['sample']);
check(ids(profileSuggestions(founder, [investor, { ...investor, id: 'second', name: 'A' }], 1)), ['second']);
check(ids(profileSuggestions(founder, [investor], -1)), []);
console.log(`${checks} profile-suggestion checks passed.`);
