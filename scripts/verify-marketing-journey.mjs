import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { transform } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';

// Pure geometry/link checks and real React server rendering only.
// No simulated DOM, browser interaction, scroll measurements or provider writes.
const require = createRequire(import.meta.url);
let checks = 0;
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks++; };
const deepEqual = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const ok = (condition, label) => { assert.ok(condition, label); checks++; };
const plain = value => JSON.parse(JSON.stringify(value));
async function load(file, imports = {}) {
  const { code } = await transform(await fs.readFile(file, 'utf8'), { loader: file.endsWith('.tsx') ? 'tsx' : 'ts', format: 'cjs', jsx: 'automatic' });
  const context = {
    module: { exports: {} }, exports: {}, URL,
    require(name) {
      if (Object.hasOwn(imports, name)) return imports[name];
      if (['react', 'react/jsx-runtime', 'lucide-react'].includes(name)) return require(name);
      if (name.endsWith('.css')) return {};
      throw new Error(`Unexpected server-render dependency: ${name}`);
    },
  };
  // Browser globals are intentionally absent. SSR must use server snapshots and
  // must not read localStorage, matchMedia, document, window or run effects.
  vm.runInNewContext(code, context, { filename: file });
  return context.module.exports;
}

const journey = await load('lib/marketing-journey.ts');
const { marketingChapters, currentChapterIndex, chapterNeighbors, sameDocumentTarget } = journey;
const chapters = plain(marketingChapters);
equal(chapters.length, 9, 'The journey extends beyond the product tour through the final invitation');
deepEqual(chapters.map(item => item.id), ['start', 'why-firstsignal', 'how-it-works', 'founders', 'investors', 'learning', 'templates', 'questions', 'your-next-step']);
equal(new Set(chapters.map(item => item.id)).size, chapters.length, 'Each chapter has one distinct fragment destination');
for (const item of chapters) {
  ok(/^[a-z][a-z0-9-]*$/.test(item.id), 'A chapter destination is an internal fragment ID, never a URL');
  ok(typeof item.label === 'string' && item.label.trim().length > 0, 'Every chapter has a readable label');
}

// Activation means the nearest already-crossed heading, not the nearest array
// entry or the next future heading. Keep source indexes for the matching link.
const positions = Object.freeze([0, 600, 1400, 2300, 3200, 4100, 5000, 5900, 6800]);
equal(currentChapterIndex(positions, 0, 140), 0, 'Introduction is active at the top');
equal(currentChapterIndex(positions, 459, 140), 0, 'A heading remains inactive before crossing the activation line');
equal(currentChapterIndex(positions, 460, 140), 1, 'A heading activates exactly on its boundary');
equal(currentChapterIndex(positions, 461, 140), 1);
equal(currentChapterIndex(positions, 1259, 140), 1);
equal(currentChapterIndex(positions, 1260, 140), 2);
equal(currentChapterIndex(positions, 3059, 140), 3);
equal(currentChapterIndex(positions, 3060, 140), 4, 'Investor navigation follows actual heading position');
equal(currentChapterIndex(positions, 3960, 140), 5, 'Learning remains a tracked chapter after investor content');
equal(currentChapterIndex(positions, 4860, 140), 6, 'Templates are tracked in the lower page');
equal(currentChapterIndex(positions, 5760, 140), 7, 'Questions are tracked rather than retaining the investor chapter');
equal(currentChapterIndex(positions, 6660, 140), 8, 'The closing invitation has its own tracked chapter');
equal(currentChapterIndex(positions, 9000, 140), 8, 'Footer scrolling keeps the final meaningful chapter selected');
equal(currentChapterIndex(positions, -200, 140), 0, 'Negative overscroll never invents a negative index');
equal(currentChapterIndex(positions, 1400, 0), 2, 'A zero activation offset is valid');
equal(currentChapterIndex(positions, 1400, -1), 1, 'The helper respects a supplied negative offset');
equal(currentChapterIndex(positions, 1259.75, 140.25), 2, 'Subpixel geometry activates at the correct boundary');
equal(currentChapterIndex([], 1000, 140), 0, 'Before measurements exist the introduction remains the safe fallback');
equal(currentChapterIndex([null, null, null], 1000, 140), 0, 'Missing page sections do not crash navigation');
equal(currentChapterIndex([0, null, 1000, null, 2000], 1200, 0), 2, 'Missing middle sections preserve their siblings’ source indexes');
equal(currentChapterIndex([0, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 600], 700, 0), 4, 'Non-finite measurements cannot win chapter selection');
equal(currentChapterIndex([0, 600], Number.NaN, 140), 0, 'Invalid scroll geometry retains the fallback chapter');
equal(currentChapterIndex([0, 600], 700, Number.NaN), 0, 'Invalid activation geometry retains the fallback chapter');
const unsorted = Object.freeze([1200, 0, 800, null, 400]);
equal(currentChapterIndex(unsorted, 900, 0), 2, 'Unsorted measurements use the latest crossed position, not iteration order');
equal(currentChapterIndex(unsorted, 450, 0), 4);
equal(currentChapterIndex(unsorted, 1300, 0), 0, 'Unsorted geometry returns the original chapter index');
deepEqual([...unsorted], [1200, 0, 800, null, 400], 'Geometry selection never sorts or mutates the measured array');
equal(currentChapterIndex([0, 600, 600, 1400], 700, 0), 1, 'Coincident headings have a deterministic first-source tie break');
for (let index = 1; index < positions.length; index++) {
  equal(currentChapterIndex(positions, positions[index] - 141, 140), index - 1, 'Each previous chapter remains active immediately before a boundary');
  equal(currentChapterIndex(positions, positions[index] - 140, 140), index, 'Every chapter activates at its own measured boundary');
}

// Previous/next are bounded, finite and consistent with the chapter order.
deepEqual(plain(chapterNeighbors(0)), { previous: null, next: chapters[1] });
deepEqual(plain(chapterNeighbors(3)), { previous: chapters[2], next: chapters[4] });
deepEqual(plain(chapterNeighbors(8)), { previous: chapters[7], next: null });
deepEqual(plain(chapterNeighbors(-100)), plain(chapterNeighbors(0)), 'Negative indexes clamp at the beginning');
deepEqual(plain(chapterNeighbors(100)), plain(chapterNeighbors(8)), 'Large indexes clamp at the end');
deepEqual(plain(chapterNeighbors(3.9)), plain(chapterNeighbors(3)), 'Fractional indexes truncate to a stable chapter');
for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) deepEqual(plain(chapterNeighbors(value)), plain(chapterNeighbors(0)), 'Non-finite chapter state falls back safely');
for (let index = 0; index < chapters.length; index++) {
  const neighbors = chapterNeighbors(index);
  equal(neighbors.previous?.id ?? null, chapters[index - 1]?.id ?? null);
  equal(neighbors.next?.id ?? null, chapters[index + 1]?.id ?? null);
}

// Anchor focus enhancement must never capture an auth/app/external navigation.
const current = 'https://findin.example/?preview=1#start';
for (const item of chapters) equal(sameDocumentTarget(`#${item.id}`, current), item.id);
equal(sameDocumentTarget('https://findin.example/?preview=1#founders', current), 'founders');
equal(sameDocumentTarget('/?preview=1#investors', current), 'investors');
equal(sameDocumentTarget('?preview=1#questions', current), 'questions');
equal(sameDocumentTarget('#space%20in%20id', current), 'space in id', 'Encoded fragments decode to their actual ID');
equal(sameDocumentTarget('#%E0%AE%95%E0%AE%B1%E0%AF%8D%E0%AE%B1%E0%AE%B2%E0%AF%8D', current), 'கற்றல்', 'Valid Unicode fragment IDs are preserved');
for (const href of ['', '#', 'https://elsewhere.example/#founders', '//elsewhere.example/#founders', 'http://findin.example/?preview=1#founders', '/app#discover', '/signin?return_to=%2Fapp#founders', '/?preview=2#founders', '/#founders', 'javascript:alert(1)', 'data:text/html,hello#founders', '#%E0%A4%A', 'https://[invalid/#founders']) {
  equal(sameDocumentTarget(href, current), null, `Ordinary navigation remains untouched: ${href}`);
}
equal(sameDocumentTarget('#founders', 'not an absolute URL'), null, 'Malformed current locations fail closed');

// Render the real component with React’s server dispatcher. No hook mock or
// fake browser is used: all chapter links must exist before hydration.
const scrollScene = await load('lib/scroll-scene.ts');
const { default: MarketingMotion } = await load('components/marketing-motion.tsx', { '@/lib/marketing-journey': journey, '@/lib/scroll-scene': scrollScene });
const html = renderToStaticMarkup(React.createElement(MarketingMotion));
ok(html.includes('aria-label="On this page"'), 'SSR contains a labelled native chapter navigation');
ok(html.includes('<details') && html.includes('<summary'), 'The chapter picker has a native disclosure baseline');
const nav = html.match(/<nav\b[^>]*aria-label="On this page"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
ok(nav, 'The server HTML includes the complete chapter menu');
const anchors = [...nav.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
equal(anchors.length, chapters.length, 'SSR does not hide lower-page chapters behind effects');
for (const [index, item] of chapters.entries()) {
  const [attributes, content] = [anchors[index][1], anchors[index][2]];
  ok(attributes.includes(`href="#${item.id}"`), 'Each visible menu item has a normal internal link');
  ok(content.includes(item.label), 'Each server-rendered menu item includes its readable label');
  equal(attributes.includes('aria-current="location"'), index === 0, 'Only the initial chapter is current before layout measurements');
}
ok(html.includes('aria-label="Next chapter: Difference"'), 'Next chapter has a useful accessible name');
ok(!html.includes('aria-label="Previous chapter:'), 'No previous link points outside the start of the journey');
ok(html.includes('aria-label="Pause animations"'), 'The page-wide pause button exists in the initial server HTML');
ok(html.includes('aria-pressed="false"'), 'SSR uses the unpaused snapshot without reading browser storage');
ok(!html.includes('style="display:none"') && !html.includes('hidden=""'), 'The SSR controller is present without a JavaScript visibility gate');

// Static CSS guardrails, not computed dimensions or visual accessibility proof.
const stylesheet = postcss.parse(await fs.readFile('app/marketing-motion.css', 'utf8'), { from: 'app/marketing-motion.css' });
function declared(selectorFragment, property, valid) {
  let found = false;
  stylesheet.walkRules(rule => {
    if (!rule.selector.includes(selectorFragment)) return;
    rule.walkDecls(property, declaration => { if (valid(declaration.value)) found = true; });
  });
  return found;
}
const atLeast44px = value => /^\d+(\.\d+)?px$/.test(value) && Number.parseFloat(value) >= 44;
ok(declared('.marketing-journey-menu > summary', 'min-height', atLeast44px), 'CSS declares a 44px minimum chapter disclosure target');
ok(declared('.marketing-journey-menu nav > a', 'min-height', atLeast44px), 'CSS declares 44px minimum chapter links');
ok(declared('.marketing-journey-arrows > a', 'height', atLeast44px), 'CSS declares 44px arrow target heights');
ok(declared('.marketing-journey-arrows > a', 'width', atLeast44px), 'CSS declares 44px arrow target widths');
ok(declared('.marketing-motion-toggle', 'min-height', atLeast44px), 'CSS declares a 44px minimum pause target');
ok(declared(':focus-visible', 'outline', value => !['none', '0', '0px'].includes(value)), 'Keyboard focus has an explicit visible outline rule');

console.log(`Passed ${checks} marketing journey checks: pure chapter geometry and boundaries; missing/unsorted measurements; bounded previous/next; same-document-only anchors; real React SSR with complete native chapter links and pause control; static CSS target/focus guardrails. These are code/SSR checks, not browser or visual verification.`);
