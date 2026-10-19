# A complete scrolling journey for FindIn

Research and source audit: 19 October 2026. This continues the user's V3 motion brief. Earlier work added a three-card fan, a bounded product walkthrough, native reading progress, restrained entrances and responsive fallbacks. Those effects were useful but left the longer page without one clear reading route or an early way to pause motion.

## Current reference research

| Reference, checked 19 October 2026 | What the primary page supports | FindIn adaptation |
| --- | --- | --- |
| [Apple AirPods Pro](https://www.apple.com/airpods-pro/) | The page separates highlights, a closer look, feature chapters and comparison. | A clear chapter route and visual continuity from a broad introduction to product details. No Apple assets, branding or proprietary animation code copied. |
| [Linear homepage](https://linear.app/homepage) | Groups product explanation by workflow with substantial UI demonstrations and optional detail. | One explicitly fictional Tracegrid example through the existing walkthrough; keep interactive controls available and stationary. |
| [Framer scroll transforms lesson](https://www.framer.com/academy/lessons/scroll-transforms) | Explains bounded transforms and testing intermediate overlap, responsive states and reading hierarchy. | Framed illustration-to-content handoffs, with independent captions and normal image flow on small/reduced-motion screens. |
| [Framer's ++hellohello case study](https://www.framer.com/stories/hellohello/) | Describes a chaptered interactive AI in Design 2026 report. | A small persistent chapter index, direct section access and a clear continuation after the walkthrough. |
| [Framer Awards](https://www.framer.com/awards/) | Official page identifies its 2025 winners and editorial/geometric design approaches. | Principle-level reference only. FindIn has no award claim. The Panton winner link now redirects, so its original animation was not inspected. |

These are fetched-content observations, not newly measured interactions with those websites. Local browser use is disabled in Work settings. Earlier browser observations are documented separately in `MOTION_RESEARCH_2026-10-18.md` and `SCROLL_SCENE_2026-10-19.md`; their evidence does not automatically verify this new pass.

## Technique and implementation matrix

| Technique | Purpose / placement | Implementation and support | Cost / accessibility / phone behavior | Decision |
| --- | --- | --- | --- | --- |
| Whole-page chapter index | Orient the reader; jump directly to relevant founder/investor/learning chapters. | Nine native fragment links and a details popup inside the existing sticky header; one cached-position/passive/rAF controller. | Small DOM/JS; 44px controls, Escape/focus handling, no announcements on every scroll; 88px chapter/pause pair on phones. No extra sticky row or content overlay. | Implement |
| Accessible motion control | Pause from the beginning rather than only after reaching the footer. | One shared controller, persisted manual preference and OS reduced-motion priority. | No external service; storage failure falls back safely. Active location still works when motion is paused. | Implement |
| Card fan and sticky product narrative | Make three principles and four product steps tangible. | Preserve bounded existing scenes and measured fit gates. | Do not trap scrolling. Short/phone/reduced-motion layouts use ordinary flow/tabs. | Preserve and refine |
| Framed image handoffs | Connect the large workshop, founder and conversation images to adjacent content. | Named CSS view timelines, bounded transforms and modest clip framing under feature detection. | Uses existing optimized images; captions/links stay outside transformed layers. Full static images on phones, pause and reduced motion. | Implement |
| Scroll-linked versus triggered entrances | Continuous artwork progress versus a short entrance after a threshold. | [Native scroll timelines](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline) are progressive enhancement; existing IntersectionObserver entrances remain the fallback. | No content is permanently hidden; essential text is available without JavaScript. | Keep both roles distinct |
| View transitions | Shared-element route changes. | [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) reviewed. | The task concerns one marketing document; altering Clerk/account/admin navigation adds risk without improving this story. | Defer |
| Native CSS carousel pseudo-controls and scroll-state queries | Galleries or contextual sticky state. | [MDN carousel guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Overflow/Carousels); browser support varies. | Essential story already has direct chapter links/tabs. A carousel would hide content or duplicate navigation. | Defer |
| `animation-trigger` | Declarative threshold entrances. | [Current MDN reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-trigger) marks limited/experimental support. | Do not rely on it for visibility. Existing observer fallback is appropriate. | Defer |
| GSAP ScrollTrigger / Motion React | Complex cross-element choreography. | Reviewed official [GSAP](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) and [Motion](https://motion.dev/docs/react-scroll-animations) APIs. | Existing small CSS/JS system covers this scope; another runtime creates overlapping ownership. | No new dependency |
| Horizontal scroll, smooth-scroll replacement | A gallery or altered scrolling feel. | Native scrolling/anchors retained. | No wheel/touch interception, forced horizontal essential content, new inertia or scroll snapping. | Reject for this page |
| WebGL, scrubbed video/frame sequences, particles/cursor effects | Immersive visual display. | Considered against the actual product and V3 brief. | Heavy media/GPU work and pointer-only interaction do not clarify founder–investor workflows. Existing imagery and HTML UI are more useful. | Reject for this scope |
| Typographic and section rhythm | Connect chapters without obstructing reading. | Existing semantic headings, consistent motion tokens, image reveals and explicit chapter continuations. | No character splitting or delayed text reading. | Refine |

Native scroll timelines remain progressively enhanced, not a universal compatibility promise. We did not install a new animation package. Follow [web.dev animation guidance](https://web.dev/articles/animations-guide): prioritize bounded transforms/opacity, avoid permanent layer promotion and measure real devices before claiming smooth frame rates. Clip framing is a small desktop-only enhancement; its actual paint cost has not been measured.

## Product narrative and preservation

The clean, straight hero preview stays intact. Tracegrid remains explicitly fictional; its current handover test has a predetermined success condition, a contrary observation and a human next decision. Neither interviews nor a small test establish funding readiness. The new Test & learn backend and multi-idea founder support remain unchanged. Stock/generated image credits and claim labels remain in place.

## Verification and release status

- 162 marketing-journey checks pass: actual React server rendering, nine chapters, boundary/unsorted/missing geometry, bounded previous/next links, same-document focus-target rules and static target/focus CSS declarations.
- 32 scene-geometry checks pass: bounded unfolding, native-anchor correction, page-edge clamping and combined space changes across both scenes. These test geometry, not actual browser layout.
- Scoped motion/page lint passes with zero errors and five existing responsive-image advisories. All five changed/new motion stylesheets parse. TypeScript and production build pass.
- The built local Worker returns 200 for the landing page and all six referenced CSS assets. HTTP/SSR checks confirm all nine real chapter targets/links, one header controller, three image frames, both walkthrough exit links, retained credits/disclosures and 404 for the removed local fixture. This is a real compiled-page check, not a browser layout/input test.
- One global reader capture coordinates fan/tour changes. Turning off motion while the tour is visible preserves the selected panel; automatic progression resumes only through its explicit Resume scroll control. Scene layout reacts to the root motion policy so an OS preference event cannot collapse it before the capture.
- Deliberate chapter activation keeps native fragment/history scrolling and then focuses the destination without another scroll. Ordinary scrolling does not move focus or announce every chapter.
- Browser testing, device/OS preference interaction, screenshots, measured frame rates and Core Web Vitals remain unavailable while Work disables local browser use. No substitute browser driver was used. Static CSS and SSR checks do not establish phone layout or visual quality.
- The user explicitly chose “Finish the code and GitHub first.” Existing Site lookup still returns `Sites project not found`; no replacement project, domain, audience or database is created to work around that access boundary. This additional pass is not published. Source work is retained in the existing checkout and saved separately to the user's GitHub repository. Owned local preview servers are stopped after checks.
