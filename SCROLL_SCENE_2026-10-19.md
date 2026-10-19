# FindIn marketing scroll scene — 19 October 2026

The user asked for visible scroll interactions on the existing marketing page. This change is limited to `app/page.tsx`, `app/marketing-scroll-scene.css` and `components/marketing-scroll-scene.tsx`; existing product, account and database behavior is unchanged.

## Pattern and implementation

- [Framer's scroll-transform lesson](https://www.framer.com/academy/lessons/scroll-transforms) describes mapping section progress to position, scale and rotation, then checking intermediate overlap, breakpoints and reduced motion. Adapted this technique to the existing three substance/relevance/choice cards; no competitor artwork or branding was copied.
- A short sticky scene opens an overlapping fan into left, middle and right columns. Opening finishes at 68% of its scroll distance, leaving the rest for reading. Ordinary browser scrolling continues into the existing product tour.
- A hero anchor makes the sequence easy to find. A keyboard-accessible Show all three / Enable scroll effect toggle provides an immediate static reading option and retains focus.
- The existing page-wide Pause animations control and OS reduced motion both remove the new scene. Phones, narrow windows, short windows and layouts whose measured stage cannot fit use ordinary document flow. Without JavaScript, the existing content remains visible.
- No dependency, image, font or third-party network service was added. One passive scroll listener runs only near the active scene; requestAnimationFrame batches transform writes. Resize, proximity and preference observers/listeners are cleaned up on unmount. See [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API).
- Existing fictional, illustrative and self-reported labels remain. Movement makes no validation or funding claim.

## Checks

TypeScript (no incremental cache), scoped ESLint, CSS parsing, whitespace checks and the production build passed. Page lint retains five existing responsive-image advisories and no errors.

Actual in-app browser verification covered 1280×720 and 1440×900 unfolding, midpoint transforms, readable final columns, a stable sticky position and natural release. Enter on Show all three displayed the full static layout and kept focus on the same toggle. The global Pause/Resume animations control removed/restored the scene; investor navigation settled at its section with the correct current link. The isolated production bundle was rechecked for these behaviors and at 1280×600 (static fallback), 390×844 and 320×740 (all cards in normal flow; no document overflow). No browser error was observed in that production-preview session.

Screenshots in ignored `outputs/`: `findin-scroll-fan-local-2026-10-19.jpg` and `findin-scroll-columns-local-2026-10-19.jpg` show the local production build, not a production-account workflow. OS reduced motion was code-reviewed; the equivalent manual pause was browser-tested. Safari/Firefox, physical devices, full screen-reader coverage, frame-rate traces and Core Web Vitals were not measured.

An isolated source checkout based on published version31 was used for release so concurrent Test & learn work in the main directory would not be included in this marketing update. No main-checkout Git operation, database migration or hosted environment change is part of this release.
