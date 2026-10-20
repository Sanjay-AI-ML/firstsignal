import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

console.log('Running static CSS/ARIA source guardrails; no physical device or screen reader is exercised.');

// 1. Viewport & Layout Bounds Check
// Ensure no CSS files introduce breaking fixed widths (e.g. width: 400px without max-width / min())
const cssFiles = [
  'components/term-sheet-generator.css',
  'components/syndicate-room.css',
  'components/virtual-data-room.css',
  'components/founder-ir-update.css',
  'components/floating-venture-toolkit.css',
  'app/marketing-motion.css',
  'app/admin/admin.css'
];

let checksPassed = 0;

for (const file of cssFiles) {
  const content = await fs.readFile(path.resolve(file), 'utf8');

  // Rule A: No fixed pixel width > 320px unless accompanied by min() / max-width / @media
  const fixedWidthMatches = content.match(/(?<![a-zA-Z-])width:\s*([4-9]\d{2,}|\d{4,})px/g) || [];
  for (const match of fixedWidthMatches) {
    // If it's width: 500px, it could cause horizontal scroll on a 320px phone unless bounded
    assert.fail(`File ${file} contains potentially breaking fixed width: ${match}`);
  }
  checksPassed++;

  // Rule B: Safe area inset or mobile-friendly positioning on floating elements
  if (file.includes('floating-venture-toolkit')) {
    assert.ok(content.includes('safe-area-inset-bottom'), 'Floating toolkit must respect hardware safe-area-inset-bottom');
    assert.ok(content.includes('100dvh') || content.includes('100vh'), 'Expanded panel must use dynamic viewport height');
    checksPassed += 2;
  }
}

// 2. Component ARIA & Form Field Associations
const componentsToCheck = [
  'components/term-sheet-generator.tsx',
  'components/syndicate-room.tsx',
  'components/virtual-data-room.tsx',
  'components/founder-ir-update.tsx',
  'components/floating-venture-toolkit.tsx'
];

for (const comp of componentsToCheck) {
  const code = await fs.readFile(path.resolve(comp), 'utf8');

  // Check: Form inputs must have matching id and htmlFor or explicit aria-label
  if (comp.includes('term-sheet-generator.tsx') || comp.includes('syndicate-room.tsx')) {
    assert.ok(code.includes('htmlFor='), `${comp} must use htmlFor on labels`);
    assert.ok(code.includes('useId()'), `${comp} must use unique React useId for accessible form bindings`);
    checksPassed += 2;
  }

  // Check: Icons must have aria-hidden="true" so screen readers don't read raw SVGs
  const svgOrLucideIcons = (code.match(/<[A-Z][A-Za-z]+ size=\{/g) || []);
  if (svgOrLucideIcons.length > 0) {
    assert.ok(code.includes('aria-hidden="true"'), `${comp} Lucide icons must have aria-hidden="true"`);
    checksPassed++;
  }

  // Check: Status updates must use role="status" or aria-live for screen reader announcements
  if (comp.includes('term-sheet-generator.tsx') || comp.includes('syndicate-room.tsx')) {
    assert.ok(code.includes('role="status"'), `${comp} must have live status announcements`);
    checksPassed++;
  }

  // Check: Icon-only buttons must have aria-label
  if (comp.includes('syndicate-room.tsx')) {
    assert.ok(code.includes('aria-label='), `${comp} ticket buttons must have aria-label`);
    checksPassed++;
  }
}

// 3. Touch Target and Safe Tap Evaluation
const floatingCss = await fs.readFile(path.resolve('components/floating-venture-toolkit.css'), 'utf8');
assert.ok(/min-height:\s*(44|48)px/.test(floatingCss), 'Primary touch target must be at least 44px-48px');
checksPassed++;

const vdrCss = await fs.readFile(path.resolve('components/virtual-data-room.css'), 'utf8');
assert.ok(/min-height:\s*(44|48)px/.test(vdrCss), 'VDR checklist touch targets must be at least 44px');
checksPassed++;

console.log(`Passed ${checksPassed} static CSS/ARIA source checks. Browser layout, physical-device and screen-reader verification remain separate.`);
