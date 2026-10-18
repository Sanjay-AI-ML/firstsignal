# FindIn motion direction — 18 October 2026

## Intent and observed references

Make the early-founder → discovery → discussion workflow easier to understand. Keep the recently simplified hero, real controls, readable server HTML and ordinary scrolling. Motion must not imply verified claims or investment success.

- [Framer](https://www.framer.com/): actual browser scrolling and DOM measurements found a fixed 64px navigation and a demo column that settled at `top:120px` beside scrolling feature copy (y819 at scroll720; y120 at scroll2160). Adapt the bounded sticky demonstration, not the visual identity.
- [Linear](https://linear.app/homepage): header stayed at y0 after scrolling1440px; clicking Customer Requests + opened a bounded detail dialog. Headings remained readable. Adapt deliberate disclosure and a stable navigation frame.
- These are browser DOM/interaction observations; the research subagent could not capture visual frames. No award or measured frame-rate claim is made. Awwwards animation-directory retrieval failed; it is not evidence used for the design.

## Technique decisions

| Technique / primary reference | Purpose and placement | Implementation and support | Cost, accessibility and mobile | Decision |
| --- | --- | --- | --- | --- |
| [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) | Reveal section introductions once; gate walkthrough work while near the viewport | Shared observers, disconnect on cleanup. Navigation uses cached section positions in a passive/rAF scheduler because ratio thresholds do not reliably track heading crossings | Small JS; no hidden baseline content. No automatic chapter changes while a user is interacting | Implement |
| [CSS scroll/view timelines](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline) | Reading strip, workshop illustration settling, three specialty cards | `@supports` and complete static fallback. Declare timeline after animation shorthand. Chrome115+, Safari26+; not universal stable support | Transform/opacity only. Decorative, disabled for reduced motion and manual pause; illustration stays complete on phones | Progressive enhancement |
| [CSS animation-trigger](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-trigger) | Native threshold-triggered entrances | Experimental; current BCD Chrome146, Safari/Firefox unsupported | No essential UI may depend on it | Defer; use IO |
| [Native carousel controls](https://developer.chrome.com/blog/carousels-with-css) | Potential gallery navigation | Buttons/markers Chromium135; no current Safari/Firefox support in BCD | No useful new carousel for this product; real links/buttons remain the baseline | Defer |
| [CSS scroll snap](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-snap-type) | A short optional gallery could use proximity snapping | Widely available | Essential content must not require horizontal swiping; no section snapping or scroll capture | Not needed |
| [Scroll-state queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Conditional_rules/Container_scroll-state_queries) | Decorative stuck/overflow cues | Chromium133; Safari/Firefox unsupported in current BCD | A normal sticky header already communicates location | Defer |
| [Same-document view transitions](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition) | Deliberate state transitions | Baseline2025, feature detection still needed | Existing small panel entrances suffice; auto-scroll transitions would add interruption | Defer for this pass |
| [Cross-document transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@view-transition) | Future route continuity | Chrome126+, Safari18.2+; Firefox unsupported | Auth/navigation boundaries need separate testing. Keep immediate ordinary navigation | Defer |
| [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) and [matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia%28%29/) | Complex scrubbed or pinned timelines | Maintained powerful tooling; use matchMedia/useGSAP cleanup if introduced | Added dependency and lifecycle surface without a current need | Defer |
| [Motion for React](https://motion.dev/docs/react-scroll-animations) | Future layout/presence choreography | useScroll/useTransform, viewport triggers, native timeline acceleration where supported | Valuable if choreography becomes more complex; current scope works with platform APIs | Defer |
| Sticky CSS + short chapters | Keep the working example alongside its explanation | Wide/tall viewport and measured panel fit; ResizeObserver rechecks | ~three-screen bounded section; no wheel capture. Manual selection pauses automatic switching. Mobile/short/reduced motion uses existing tabs | Implement |
| Hover, press and focus states | Make deliberate controls feel responsive | Shared duration/easing tokens; transform only for small affordances | Focus is always visible; no hover-only information; motion preference disables movement | Implement |
| WebGL, inertial scrolling, background video, image sequences | Cinematic spectacle | Technically possible | Extra download/render cost, distraction and no useful explanation of FindIn | Reject for this product |

Compatibility checked against official documentation and MDN browser data. Firefox159 appears in timeline compatibility data but is beta on this execution date (release scheduled27October); current stable is158. Sources: [timeline BCD](https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/properties/animation-timeline.json), [Firefox release metadata](https://raw.githubusercontent.com/mdn/browser-compat-data/main/browsers/firefox.json), [animation-trigger BCD](https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/properties/animation-trigger.json).

## Implementation contract

No new animation dependency. Keep typography, original artwork, truthful fictional labels and the single clean hero frame. Use a consistent easing curve, a short control transition and a slower section entrance. No perpetual loops, pointer followers, word-by-word text hiding or scroll hijacking. Root motion preference combines the OS setting and a page-level pause control. All listeners, observers and animation frames clean up on unmount.

Transform/opacity guidance: [web.dev animation performance](https://web.dev/articles/animations-guide). Preference requirements: [MDN reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion). Do not promise 60fps or cross-browser validation without measurements and actual tests.

## Validation

Implemented in `components/marketing-motion.tsx`, `components/marketing-product-tour.tsx`, `app/marketing-motion.css`, `app/marketing-tour-motion.css` and `app/page.tsx`. Desktop story activates at >=1101px wide and >=860px tall only when the measured example fits below navigation. Its rail is bounded to min(245vh,2500px), then releases naturally. Existing fields, stage comparison and proposal examples are retained. A stable Pause/Resume scroll control preserves keyboard focus. The footer animation toggle applies only to this page instance; OS reduced motion takes precedence.

Actual local browser checks:

- At1440×1000: story activated; preview stuck at y103; natural scrolling advanced steps2→3→4 and released at the section end. Changing the investor stage to Prototype froze the preview while scrolling. Explicit Resume immediately selected the current chapter and retained focus on the stable control.
- Counteroffer preview showed version2 and explicitly confirmed nothing was sent.
- Pause animations set root mode paused, hid the reading strip, disabled card animations, switched smooth scrolling to auto and removed the sticky story. Resume restored motion.
- At390×844 and320×740: ordinary tabs, static cards, no horizontal document overflow. End key selected the fourth tab, retained tab focus and a visible solid focus ring. At1280×720: preview remained static with no long story rail.
- Investor link settled at the correct section (y129.75) with Investors marked current. FAQ expansion remained functional. Native reading progress advanced with document scrolling. One pre-existing Clerk development-instance warning appeared; no client error was observed in this local session.

TypeScript and both changed client components pass scoped ESLint. Page lint has zero errors and five existing img-element warnings; responsive, self-hosted image assets remain in place. Both new stylesheets parse successfully with PostCSS. Final production build passed after the navigation review correction. Independent read-only review found the navigation-observer threshold issue; final implementation uses cached coordinates and writes aria-current only on actual changes.

Limits: tested in the available in-app browser, not Safari/Firefox or physical phones. Native timeline fallback and OS reduced-motion paths were code-reviewed; manual pause was browser-tested. No OS setting was changed. Core Web Vitals, frame-rate traces and exhaustive screen-reader testing were not measured. No new animation dependency, image, font, network service or backend/schema change was introduced.
