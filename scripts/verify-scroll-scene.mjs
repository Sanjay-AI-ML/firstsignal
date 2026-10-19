import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { transform } from 'esbuild';

// Geometry checks, not a browser simulation: native sticky positioning,
// hit-testing, viewport input and preference changes still need real-browser QA.
const source = await fs.readFile('lib/scroll-scene.ts', 'utf8');
const { code } = await transform(source, { loader: 'ts', format: 'cjs' });
const context = { module: { exports: {} }, exports: {} };
vm.runInNewContext(code, context);
const { sceneUnfolding, readerAnchorDelta, resumedSceneDelta, resumedScenesDelta } = context.module.exports;
let checks = 0;
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++; };
const close = (actual, expected, message) => { assert.ok(Math.abs(actual - expected) < .000001, message); checks++; };

equal(sceneUnfolding(0, 200, 800).unfolded, 0, 'Before the scene: closed');
equal(sceneUnfolding(200, 200, 800).unfolded, 0, 'At scene entry: closed');
close(sceneUnfolding(472, 200, 800).unfolded, .5, 'Opening uses the bounded eased halfway value');
equal(sceneUnfolding(744, 200, 800).unfolded, 1, 'Opening finishes before the final reading interval');
equal(sceneUnfolding(1000, 200, 800).unfolded, 1, 'Scene end remains fully open');
equal(sceneUnfolding(2000, 200, 800).progress, 1, 'Progress never exceeds one');
equal(sceneUnfolding(200, 200, 0).progress, 0, 'Zero measured travel never divides by zero');

equal(readerAnchorDelta(240, -520, 2500, 8000), -760, 'Removing space above the reader preserves following content');
equal(readerAnchorDelta(240, 1000, 2500, 8000), 760, 'Adding space above the reader preserves following content');
equal(readerAnchorDelta(240, 240, 3260, 8000), 0, 'Native scroll anchoring already corrected the position');
equal(readerAnchorDelta(240, 280, 2500, 8000), 40, 'Only remaining movement is corrected');
equal(readerAnchorDelta(240, -520, 50, 8000), -50, 'Correction stops at the document start');
equal(readerAnchorDelta(240, 1000, 7900, 8000), 100, 'Correction stops at the document end');
equal(readerAnchorDelta(240, 243.25, 2500, 8000), 3.25, 'Fractional pixel movement is retained');
equal(readerAnchorDelta(240, NaN, 2500, 8000), 0, 'Invalid layout measurements cannot scroll the document');
equal(readerAnchorDelta(240, 900, 0, 0), 0, 'A short document cannot be scrolled');

const resume = { wasEnabled: false, enabled: true, beforeTop: -120, stickyTop: 92,
  beforeHeight: 610, afterHeight: 1370, beforeScroll: 2400, scroll: 2400, maximumScroll: 8000 };
equal(resumedSceneDelta(resume), 760, 'Resume a scene already being read at its exit position');
equal(resumedSceneDelta({ ...resume, scroll: 3160 }), 0, 'Native anchoring on resume is not applied twice');
equal(resumedSceneDelta({ ...resume, scroll: 2800 }), 360, 'Partial native correction receives only the remainder');
equal(resumedSceneDelta({ ...resume, beforeTop: 300 }), 0, 'A scene below the reading position does not change scroll');
equal(resumedSceneDelta({ ...resume, beforeTop: 92 }), 0, 'A scene exactly at entry uses its normal opening position');
equal(resumedSceneDelta({ ...resume, wasEnabled: true }), 0, 'Repeated full-motion notifications do not shift an active scene');
equal(resumedSceneDelta({ ...resume, enabled: false }), 0, 'Disabling relies on the measured content anchor, not an invented travel offset');
equal(resumedSceneDelta({ ...resume, afterHeight: 610 }), 0, 'No added space means no resume offset');
equal(resumedSceneDelta({ ...resume, maximumScroll: 2600 }), 200, 'Resume offset is bounded by the document end');
equal(resumedSceneDelta({ ...resume, afterHeight: NaN }), 0, 'Invalid resume measurements cannot move the page');

const passedFan = { wasEnabled: false, enabled: true, beforeTop: -500, stickyTop: 92, beforeHeight: 610, afterHeight: 1370 };
const passedTour = { wasEnabled: false, enabled: true, beforeTop: -100, stickyTop: 92, beforeHeight: 600, afterHeight: 2100 };
equal(resumedScenesDelta(4000, 4000, 10000, [passedFan, passedTour]), 2260, 'One global correction includes both passed scenes');
equal(resumedScenesDelta(4000, 6260, 10000, [passedFan, passedTour]), 0, 'Combined native correction is never applied twice');
equal(resumedScenesDelta(4000, 4000, 10000, [passedFan, { ...passedTour, beforeTop: 1200 }]), 760, 'A future tour does not add an offset before the reader');
equal(resumedScenesDelta(4000, 4000, 10000, [{ ...passedFan, enabled: false }, { ...passedTour, enabled: false }]), 0, 'Global pause uses only the actual visible content movement');
equal(resumedScenesDelta(4000, 4000, 5000, [passedFan, passedTour]), 1000, 'Combined resume stops at the real document end');
equal(resumedScenesDelta(4000, 4000, 10000, []), 0, 'A page without scenes never receives a resume offset');

console.log(`Scroll scene geometry: ${checks} assertions passed. Browser layout/input checks remain required.`);
