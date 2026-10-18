# FindIn marketing assets

Updated 18 October 2026. The current visual direction remains light lavender, Manrope and the existing abstract F mark. Assets explain the actual product or provide clearly labelled context; they do not stand in for real member evidence, testimonials or investment outcomes.

## Original FindIn editorial imagery — 18 October 2026

Responding to the user's request for actual new imagery, two original wide artworks were generated with the built-in image tool and integrated into `app/page.tsx`. **The First Workshop** is a full-width image immediately after the hero, under “Good ideas don’t fit one category.” It shows food/seedlings, product design and clean energy in connected workshops. **A Thoughtful First Conversation** replaces the investor section's stock photograph. Both keep the selected warm ivory/lavender identity and present early work rather than invented investment outcomes. The founder section's credited stock photograph remains.

Both images are visibly captioned **AI-generated concept illustration**. Their people are fictional; the artworks are not evidence of actual members, endorsement, verification or funding. The FAQ states this distinction. The images contain no supplied member data, credentials or third-party logos. They are served from the project without runtime image-provider requests.

| Local delivery asset | Dimensions | File size |
| --- | --- | ---: |
| `public/images/findin-first-workshop-640.webp` | 640 × 360 | 53,306 bytes |
| `public/images/findin-first-workshop-1080.webp` | 1,080 × 608 | 120,128 bytes |
| `public/images/findin-first-workshop-1672.webp` | 1,672 × 941 | 221,200 bytes |
| `public/images/findin-first-conversation-640.webp` | 640 × 360 | 61,788 bytes |
| `public/images/findin-first-conversation-1080.webp` | 1,080 × 608 | 140,748 bytes |
| `public/images/findin-first-conversation-1672.webp` | 1,672 × 941 | 257,540 bytes |

Sharp performed only proportional resizing and WebP encoding (quality82, effort6), with no content edits or crops. Responsive `srcSet`/`sizes`, explicit dimensions, lazy loading and asynchronous decoding are implemented. The full composition remains visible on phones; captions sit below the artwork rather than covering people. Neither new image animates. Larger original PNGs are preserved both at their generated source paths and in ignored `outputs/generated-originals/`.

### Generated originals and prompts

- Workshop source: `C:/Users/sanja/.codex/generated_images/01a11a0d-3e11-7c80-a217-c43e9f72e547/exec-1a422083-12ad-43b0-adf2-874254733c63.png` (1,672 × 941; 2,551,213 bytes).
- Conversation source: `C:/Users/sanja/.codex/generated_images/01a11a0d-3e11-7c80-a217-c43e9f72e547/exec-94125870-a68c-4fe0-98f8-79740d2295be.png` (1,672 × 941; 2,687,644 bytes). The workshop image was supplied as its visual style reference.

**Workshop prompt:** Use case: illustration-story. Asset type: a finished premium landscape website editorial artwork for FindIn, a light-theme founder–investor platform welcoming early ideas from every industry. Create a wide 16:9 art-directed scene called The First Workshop. A beautifully constructed architectural cross-section of an airy contemporary Indian makers' courtyard: three connected open work bays with a small diverse group of adult South Asian founders quietly developing early projects. One woman at the central timber table works on a simple unbranded physical product prototype and paper sketches; a second founder at the left tends small green seedlings and food containers; an engineer at the right examines a small clean energy device, with a laptop showing only abstract color shapes. These are concept scenes, not real customers or proof of success. Strong horizontal composition, coherent spacious pale-ivory architecture with rounded doorways, three subtle lavender columns, tactile white plaster and pale wood, lavender #ede3f8 and rich restrained violet #6934b5 accents, sage plants, one warm clay accent. Sophisticated editorial miniature architectural model mixed with lifelike paper sculpture, physical material detail, believable hands and proportions, soft warm side daylight, long gentle shadows, quiet optimistic human atmosphere. Refined high-end design magazine quality, crisp purposeful objects, not a cartoon, no childish plastic people. Keep all important people and objects within the central 75% of the image for responsive cropping, leave airy top and edges. No text, no lettering, no logos, no money, no charts, no flying cards, no glowing gradients, no particles, no robots, no trophies, no handshakes, no certificates or investment claims. Output one polished wide image.

**Conversation prompt:** Use case: illustration-story. Asset type: a finished premium landscape website editorial artwork for FindIn, a light-theme platform connecting early startup founders and investors. The reference image supplies visual style, ivory architecture, lavender accents and realistic editorial miniature materials only. Create a different complementary scene called A Thoughtful First Conversation. In an airy contemporary Indian meeting studio opening onto a planted courtyard, an adult South Asian woman founder and two adult South Asian investors of different ages sit at equal eye level around an oval pale wood table, thoughtfully discussing a small unbranded physical clean-energy prototype and a few paper sketches. Quiet active listening and natural gestures, believable hands and proportions, no handshake or celebration. Founder points to prototype, investor listens with notebook, third person studies simple sketches. This is a concept illustration, not a real customer meeting or evidence of funding. Strong wide 3:2 or 16:9 horizontal composition, subjects and table centered with generous breathing space and all important people inside central 75% for cropping. Pale ivory plaster, softly rounded architectural openings, restrained lavender #ede3f8 and violet #6934b5 chair details, sage courtyard plants, a warm clay accent, tactile materials, soft sunny side daylight, long gentle shadows. Sophisticated architectural model mixed with lifelike paper sculpture, crisp physical detail, refined high-end design magazine art direction, warm credible human atmosphere. Match the reference's elegant material vocabulary and lighting without repeating the workshop scene. No text, lettering, logos, financial charts, screens with interfaces, money, badges, trophies, certificates, flying cards, particles, robots, glowing gradients or promises of investment. Output one polished wide image.

### Verification and publication state

TypeScript, scoped `app/page.tsx` lint (zero errors; five native-image advisories), Lightning CSS parsing and production build passed. Built local Worker HTML includes both new image families, concept labels and the correct section order, while retaining the credited founder photo. All six image URLs returned200 with `image/webp` and byte counts matching their source files. The optimized 1,080px workshop and640px conversation were visually inspected as individual assets. Source review found no blocking layout conflicts; full-page browser rendering and responsive interaction remain unverified because browser control is disabled in Work settings.

The update is source/local-preview work pending publication. The existing Sites project lookup returns `project_not_found`; no new project, deployment or public URL was created. Last confirmed public version remains26. The local built preview is available at `http://127.0.0.1:4310/` while its development process runs.

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

A lightweight code-native diagram explains the sequence of visibility and contact decisions. It remains alongside the subsequent original editorial artwork and interactive product preview. The earlier diagram-only pass did not satisfy the user's request for new imagery; the two artworks above address that explicitly.

Verification for this pass: native SVG and optimized logo visually inspected as individual assets; marketing CSS parsed with the installed Lightning CSS compiler; scoped marketing lint has zero errors with native-image advisories. Full-page rendering, responsive visual inspection and real keyboard interaction remain unverified in this pass because browser control is disabled in Work settings. The integrated release report records final TypeScript/build and server-render results separately.

## Marketing photograph source history

Updated 8 October 2026. Two generated illustrations were replaced with photographs sourced online. Photographer: Vitaly Gariev. Both source pages explicitly state free use under the [Unsplash License](https://unsplash.com/license). Visible captions credit the photographer and label stock photography. These people are not represented as FirstSignal members, investors or endorsers. No claim about completed funding or an actual member meeting is made.

| Local asset | Original source |
| --- | --- |
| public/images/founder-work-photo.webp | https://unsplash.com/photos/woman-working-on-laptop-in-modern-office-setting-O9PEo38zOss |
| public/images/project-discussion-photo.webp | https://unsplash.com/photos/two-colleagues-collaborating-on-a-project-at-a-laptop-tRvuRPE8cr4 |

Downloaded from source image endpoints at 1400 px wide and encoded as WebP for first-party serving. The founder photograph remains displayed with its credit. On 18 October the investor photograph was replaced by the new concept artwork documented above; its file and attribution history are retained. The earlier generated artwork below remains local and is not displayed.

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
