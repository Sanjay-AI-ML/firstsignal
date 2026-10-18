# FindIn marketing assets

Updated 18 October 2026. The current visual direction remains light lavender, Manrope and the existing abstract F mark. Assets explain the actual product or provide clearly labelled context; they do not stand in for real member evidence, testimonials or investment outcomes.

## V2 connection map and delivery assets

The short workflow strip is now an original HTML/SVG connection map. Its four selectable stages explain the actual choices: a private draft is listed deliberately; discovery/save/compare does not contact a person; an introduction must be accepted before private messaging and proposals; discussion and proposals remain non-binding. This is a workflow explanation, not a live profile or a simulation of funding. Selection changes only the explanatory panel. It performs no request, write or external contact.

| Asset | Source and purpose | Delivery size |
| --- | --- | ---: |
| `public/illustrations/connection-path.svg` | Original project SVG, authored directly for this diagram. A curved path connects the four HTML controls. It contains no embedded text, third-party artwork or raster image. | 506 bytes |
| `public/illustrations/findin-mark-64.webp` | Unchanged existing generated F logo, resized with Sharp for small brand placements. Transparent background retained. | 2,500 bytes |
| `public/illustrations/findin-mark-128.webp` | Same source and composition, higher-density option for the small brand placements. | 4,926 bytes |
| `public/illustrations/findin-mark-256.webp` | Same source, available for larger/high-density project placements. | 10,106 bytes |
| `public/findin-logo.png` | Existing project mark generated with the built-in image tool at the user's request, initially named FirstSignal. Retained as the 1,254 × 1,254 original. Its provenance is recorded in root `MEMORY.md`. | 598,071 bytes |

The header and footer use local 64/128px WebP `srcSet` options with accurate `sizes`, explicit width/height and an empty alt beside the FindIn wordmark. The footer image is lazy-loaded. No crop, recolouring, semantic edit or replacement of the chosen logo was made. A 128px response is approximately 99.2% smaller than the old PNG by file bytes; this is an asset comparison, not a measured page-speed improvement. The original remains for metadata/other routes until those uses are updated deliberately.

The connection map retains accessible real text and native buttons instead of a raster mockup. Its tablist supports arrows, Home/End and roving keyboard focus; the selected panel has a programmatic relationship to its button. The responsive layout shows short step names on narrow screens. Motion is a brief panel transition and icon hover, disabled for reduced motion. Its SVG is decorative to assistive technology because the ordered controls and detail text convey the workflow.

### Current research and creative decisions

Primary pages were opened on 18 October 2026. This pass inspected their accessible page content; it did not run their authenticated products or claim new live visual browser inspection.

- [Linear: A calmer interface for a product in motion](https://linear.app/now/behind-the-latest-design-refresh), 12 March 2026: hierarchy, quieter supporting elements and restrained structure. Adaptation: one focused explanation changes with the selected decision; supporting lines and step numbers stay quiet.
- [Stripe India](https://stripe.com/in): product explanation tied to concrete user tasks and relevant next actions. Adaptation: the map shows what each state means and links to FindIn's existing hands-on product tour rather than decorating the page with unrelated imagery.
- [Notion product](https://www.notion.com/product): the product is explained through connected work and contextual demonstrations. Adaptation: a single continuous path relates the separate profile, discovery, introduction and discussion steps. This is an original diagram; no Notion illustration, branding or implementation was copied.

A lightweight code-native diagram was chosen because the missing information is the sequence of visibility and contact decisions. A generated photograph or an invented UI screenshot would not explain those states as accurately. Existing audience photographs, their captions and the interactive product preview remain in place.

Verification for this pass: native SVG and optimized logo visually inspected as individual assets; marketing CSS parsed with the installed Lightning CSS compiler; scoped marketing lint has zero errors with native-image advisories. Full-page rendering, responsive visual inspection and real keyboard interaction remain unverified in this pass because browser control is disabled in Work settings. The integrated release report records final TypeScript/build and server-render results separately.

## Current marketing photographs

Updated 8 October 2026. Two generated illustrations were replaced with photographs sourced online. Photographer: Vitaly Gariev. Both source pages explicitly state free use under the [Unsplash License](https://unsplash.com/license). Visible captions credit the photographer and label stock photography. These people are not represented as FirstSignal members, investors or endorsers. No claim about completed funding or an actual member meeting is made.

| Local asset | Original source |
| --- | --- |
| public/images/founder-work-photo.webp | https://unsplash.com/photos/woman-working-on-laptop-in-modern-office-setting-O9PEo38zOss |
| public/images/project-discussion-photo.webp | https://unsplash.com/photos/two-colleagues-collaborating-on-a-project-at-a-laptop-tRvuRPE8cr4 |

Downloaded from source image endpoints at 1400 px wide and encoded as WebP for first-party serving. Dimensions and lazy loading are retained. Original generated artwork is retained locally but is no longer displayed on the marketing page.

## Previous generated assets

# Marketing imagery

Two original illustrations created with the built-in image generation tool for the light lavender FirstSignal marketing page. They are illustrative scenes, not photographs of members, evidence of funding, or testimonials. WebP delivery assets retain the generated compositions; original PNGs remain in the local generated-images directory.

- `public/images/founder-progress.webp`: founder working with customer research, a prototype, and milestones.
- `public/images/investor-conversation.webp`: founder and investor discussing an early project.

Both use a warm white and lavender setting, rich violet accents, soft three-dimensional illustration, and professional South Asian characters. Assets load lazily with explicit dimensions and descriptive alternative text.

The product walkthrough is illustrative UI. Its private drafts and acceptance-before-chat claims correspond to existing functionality. No funding outcomes, certifications, endorsements, testimonials, or member counts are asserted.

## Final prompts

### Founder progress

Create a premium editorial illustration for FirstSignal, an early-stage founder and investor network. Landscape 3:2 composition, pale warm white and lavender background, rich violet #7136bd accents. Sophisticated soft three-dimensional paper sculpture illustration, cohesive rounded shapes, subtle grain and soft daylight shadows, generous breathing room. A stylized South Asian woman founder at a tidy desk with a laptop and small prototype, thoughtfully arranging customer interview notes and a simple milestone board. Contemporary professional atmosphere, optimism and real work. No readable text, no letters, no brand marks, no numbers, no money, no certification seals, no fake testimonials. This is an illustration, not a photograph of a real customer. Clean elegant product-marketing art with restrained color and strong visual hierarchy.

### Investor conversation

Create a premium editorial illustration for FirstSignal, an early-stage founder and investor network. Landscape 3:2 composition. Sophisticated soft three-dimensional illustration with tactile paper details, subtly stylized people, gentle daylight shadows, lavender and warm white setting with rich violet #7136bd accents. A South Asian woman founder and South Asian man investor having an attentive, friendly discussion across a small round table in an airy modern studio. Laptop and simple prototype on the table, neatly arranged research cards with abstract marks, green indoor plants and an arched window. Emphasize listening and collaborative discussion, relaxed professional confidence, equal eye level. Cohesive polished restrained product-marketing illustration, not a customer photograph. No readable text, no logos, no numbers, no money, no certificates or funding promises. Wide spacious framing with both people fully in composition.

## Marketing typography (9 October 2026)

Manrope normal variable Latin, weights 200–800, is served locally from `public/fonts/manrope-latin-variable.woff2` (24,836 bytes) with `font-display: swap`. The SIL Open Font License is included as `public/fonts/Manrope-OFL.txt`. Official source: https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap ; asset: https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggexSg.woff2 ; license: https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt . The subset uses the system fallback for characters outside Latin, including the rupee symbol. The page makes no runtime request to Google Fonts.

The interactive product walkthrough uses explicitly fictional data. Its preview controls change only local component state, never submit investment offers, publish profiles, save records or contact members. Founder and investor sections remain separate native anchor destinations.
