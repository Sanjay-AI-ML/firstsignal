# FindIn design audit and implementation

18 October 2026. Product: a founder–investor discovery and relationship workspace, with a public marketing site. The user requested research, a coherent design system, implementation and verification of the existing product. The brief was applied to FindIn's actual workflows; it was not treated as a request to add an unrelated enterprise suite.

This record distinguishes inspected reference patterns, design decisions, implemented behaviour and verification still pending. The aim is a clearer, more consistent product. No conversion uplift, investment outcome, production performance result or complete accessibility certification has been established by this work.

## Before: provisional assessment

These scores are qualitative design judgments on a ten-point scale, based on the existing source and the preceding release's rendered captures, including [`outputs/findin-live.jpg`](outputs/findin-live.jpg) and [`outputs/findin-workspace-local.jpg`](outputs/findin-workspace-local.jpg), the latter explicitly a synthetic local account. The additional before-marketing capture is [`outputs/design-before-marketing-2026-10-18.jpg`](outputs/design-before-marketing-2026-10-18.jpg). They are not usability-study results or measured market benchmarks. Functionality already implemented and tested in prior releases was preserved. Performance is deliberately unscored because a visual inspection cannot measure it.

| Category | Before | Observed issue or qualification |
| --- | ---: | --- |
| Visual identity | 7 | The lavender identity and F mark were recognisable. Marketing and application styling needed a shared foundation. |
| Typography | 6 | Marketing used Manrope while active application styles still included Segoe UI and older serif declarations. Repeated small text sizes weakened hierarchy. |
| Layout | 6 | Useful profile content existed, but the workspace's accumulated panels and rails competed with the main evaluation task. |
| Spacing | 6 | Several generations of local CSS produced uneven insets and large gaps around related facts. |
| Colours | 7 | A coherent lavender direction existed; multiple local purple, muted-text and outline values complicated maintenance and contrast review. |
| Components | 6 | Working forms, controls and disclosures existed. Buttons, input boundaries, surface treatment and profile presentation varied across screens. |
| Navigation | 7 | Main destinations and direct links worked. There was no single keyboard-accessible way to find a loaded profile or jump to a page. |
| Responsiveness | 7 | Earlier phone and comparison checks existed. A more deliberate intermediate-width and compact workspace composition was still useful. |
| Interactions | 7 | Requests, comparison and protected edits were functional. Finding a conversation required scanning the list. |
| Motion | 7 | Reduced-motion handling and specialty-card movement already existed. Additional motion needed to preserve legibility and task control. |
| Accessibility | 6 | Required stars, accessible optional help, labels and focus states existed. Shared contrast and typography still needed consistency; full conformance remained unverified. |
| Performance | Unscored | No current field or lab loading measurements were available. The existing logo asset is comparatively large for its displayed size. |
| Content | 7 | Fictional and self-reported labels were present. The marketing demonstration could make more of the working discovery/comparison workflow tangible. |
| Conversion | 6 | Role-specific entry routes existed. An interactive first-screen product example could provide a clearer route into the implemented workspace; its business effect remains untested. |
| Trust | 7 | Consent, private drafts and non-binding labels were useful. Real pilot proof and production operational activation remain outstanding. |

There is no numeric “after” score. The changes below should be assessed through rendered behaviour and user feedback rather than an invented increase in ratings.

Specific prior solid-colour pairs motivated the contrast work: small `.subtle` text `#777081` on `#f8f7fc` calculated at 4.46:1; marketing tour numerals `#967aab` on white at 3.70:1; the old input outline `#aaa0b8` on white at 2.49:1. These are scoped colour calculations, not a finding that every use or full page failed. The previous primary `#7136cf` on white already had strong contrast at 6.71:1.

## Research and practical interpretation

Primary references were selected for relevant interaction and layout principles rather than their popularity. The research does not establish that copying an established product's surface treatment increases funding or conversion. FindIn retains its own identity and content.

| Reference | Inspected pattern | FindIn decision |
| --- | --- | --- |
| [Linear's interface refresh](https://linear.app/now/behind-the-latest-design-refresh) | Its account of the refresh describes quieter navigation, fewer icon backgrounds/separators and consistent action placement. | Reduce competing workspace decoration; give the profile list and decision facts a clear main column. |
| [Stripe India](https://stripe.com/in) | Retrieved page content presents a strong product/action hierarchy and concrete destinations. This reference was retrieved as text, not visually audited by this team in this pass. | Make the marketing promise readable and the role-specific next step direct; connect demonstration controls to real workspace routes. |
| [Notion product experience](https://www.notion.com/product) | Product-led explanation and recognisable navigation. The root agent visually inspected this reference in the browser. | Show a small, interactive version of implemented discovery and comparison rather than implying unsupported future features. |
| [OpenVC CRM investor search](https://docs.openvc.app/en/articles/13762371-search-investors-in-your-crm) | Retrieved guidance explains finding investors within a CRM. This is a workflow reference, not evidence of unrestricted investor-database access. | Make an existing loaded profile easy to find and keep search scope clear. Preserve explainable facts rather than adding a popularity score. |
| [Intercom inbox guidance](https://www.intercom.com/help/en/articles/6274899-get-started-with-intercom-inbox) | Retrieved guidance describes workflow areas, views and keyboard actions that support finding work in an inbox. | Add local conversation search with a clear empty result and recovery path. Preserve private-note boundaries and the existing connection states. |

These are design inferences from the references, not claims of endorsement, feature parity or comparative superiority. Exact source links are recorded in the reference register below.

## Creative direction and implementation

The direction is continuity with more precision: keep the selected light lavender FindIn identity, use the existing self-hosted Manrope consistently, make surfaces calm, and group information around the next real decision. Marketing remains expressive; the workspace prioritises readable facts and useful density.

### One foundation

[`app/design-system.css`](app/design-system.css), imported globally after `globals.css`, defines semantic colours, typography, a four-pixel spacing scale, radii, elevation, density and motion. Existing shadcn/Tailwind variables alias the same palette. [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) documents the contract and its limits.

Primary actions, secondary actions, fields, status colours and focus indicators use shared tokens. The existing Manrope file is reused; no font service, animation package or alternative framework was added. Calculated solid-colour contrast is 5.84:1 for muted text on white, 4.71:1 on the selected lavender surface, 7.61:1 for white on the primary action, and 3.82:1 for the strong input border on white. Those calculations cover specific pairs, not every rendered element.

### A workspace that supports evaluation

- A compact role-aware overview groups useful next actions without duplicating the main page title.
- Profile rows group identity, idea/interests, learning, next step, planning budget or preferred investment amount, and actions. Desktop users can choose a card view; the phone layout keeps the content in a single reading flow.
- Discovery controls combine search and meaningful filters, with existing copied searches, direct links, profile comparison and sample/member distinctions preserved.
- A lightweight workspace search opens from the header or the supported keyboard shortcut. It searches profiles already authorised and loaded for that session, including the user's own private profile, and offers workspace-page destinations. Results are deduplicated and capped at 20 profiles. This is not an unrestricted database search and adds no access to other members' private profiles.
- Conversation search filters the authorised connection data already loaded in the page: member names, request/message text and the current user's private next-step note. Search is local; entering a query sends no message to another member. Existing filter choices still apply. A useful empty state can clear the query and recover the list.

These changes reuse existing backend permissions. Search does not create a new privilege, change a request's status or send contact information externally. Selection opens the actual profile or page; Escape dismissal restores focus to the search trigger, while selecting a result leaves focus with the destination.

### A tangible public introduction

The marketing hero now contains an interactive discovery/comparison preview using the same explicitly fictional records as the public workspace. Visitors can change the displayed stage, select sample profiles, compare their stage/budget/next step, and open the corresponding filtered workspace search or a sample profile. Preview selection remains on the page and saves nothing.

Founder and investor calls to action retain their role-specific setup destinations through the existing sign-in flow. Trust explanations describe implemented control over drafts, introductions and private proposals. They do not substitute illustrative profiles, contextual avatar colours or stock photography for real customer proof.

### Product rules preserved

The redesign preserves one founder **or** investor profile per account, broad industries with Other/custom entry, the founder's **Ideology** field and required proposed solution, private/public consent, existing saved profiles and direct links, mutual introductions, accepted conversations, non-binding proposals, block/report controls and edit-discard protection. There is no new investment processing, verified-investor claim or guaranteed funding promise.

## Verification status

This records scoped checks completed for the integrated update; it is not a certification.

| Check | Status and evidence |
| --- | --- |
| TypeScript | Passed with `--noEmit` for the current implementation at the time of this note. |
| New component and marketing lint | Zero errors in new components and modified marketing files; image optimisation warnings remain. |
| Foundation CSS | Parsed successfully with the installed Lightning CSS compiler; 8,614 minified bytes at foundation completion. Scoped tracked diff whitespace check passed. |
| Regression checks | Workbench (including 15 new conversation-search assertions), saved/direct access, 402-profile database bounds, single-profile/required-solution rules, broad/custom sectors, profile-fit (12) and suggestions (28) passed. |
| Baseline lint comparison | Existing baseline remains 11 errors across `app/platform.tsx` and `components/connection-dashboard.tsx`; no added errors in that comparison. Platform warnings decreased from five to three. The local ignored report is `outputs/premium-lint-comparison.json`. This is not a clean-lint claim. |
| Workspace at 320px | Browser checks covered readable cards, long INR facts/actions and the comparison flow without horizontal overflow. |
| Workspace at 768px, 1024px and 1440px | Browser checks covered card layouts without horizontal overflow. |
| Workspace search | Root browser checks found the account's own private profile; keyboard Enter opened the result and Escape dismissal restored focus. |
| Conversation search | Root browser checks covered filtering, an empty result and recovery. |
| Unsaved edits | Root browser check covered the existing dirty-form guard. |
| Final marketing review | Root browser checks at 320, 390, 768 and 1024px found no horizontal overflow. The narrow hero was refined to three lines; preview comparison focus and stage-filter deep links worked, and the investor anchor settled at its intended section. |
| Laptop marketing action | Root browser check found the main CTA fully visible in a 720px-high laptop viewport (its bottom at 650px). |
| Role and sign-in handoff | Root browser check preserved investor setup intent through sign-in and confirmed visible Clerk Manrope styling. At 320px, fields and primary actions measure 44px high and the complete Google sign-in label fits. Clerk's development-mode indication remains; this is not production OAuth verification. |
| 390px and 768px integrated review | Marketing widths checked as above. Other complete end-to-end flows at those sizes were not exhaustively audited. |
| Built-Worker route/security smoke | Homepage, workspace, sign-in/up, privacy and all three template routes returned 200; temporary QA route returned 404; anonymous workspace write returned 401; workspace responses retain no-store. |
| Final production build | Passed after the final source edits; the temporary fixture route is absent from the built route table. |

Synthetic/local fixtures used for checks were removed before the final build. No QA step in this note establishes real-user investment outcomes or production OAuth behaviour.

## Remaining work and limits

- Full keyboard, reduced-motion and image/font behaviour beyond the specific checked interactions should not be described as exhaustively certified. Existing reduced-motion CSS remains in place; no device-wide preference was changed during these checks.
- The public pilot still uses Clerk development authentication. An owned domain, production Clerk setup and live email sender/provider activation remain separate launch work.
- Loading and interaction performance have not been measured in this release. The existing logo file is 598,071 bytes and is a known optimisation target; keep its visual identity while assessing an appropriately sized asset. No Core Web Vitals improvement is claimed. Below-fold photographs retain lazy loading, dimensions and asynchronous decoding; quick search loads on demand. No new dependencies were added.
- Address the documented lint baseline deliberately. Do not describe unchanged pre-existing errors as passing lint.
- Full accessibility conformance, real phone/network performance, operational monitoring, tested database restore, support and report/deletion handling still require their own verification.
- Test the clearer workspace and public preview with founders and investors. Record completion, abandoned steps and repeat use with consent before making outcome or conversion claims. Genuine permissioned pilot evidence remains more valuable than additional decorative proof.

## Reference register

1. Linear, [Behind the latest design refresh](https://linear.app/now/behind-the-latest-design-refresh), published 12 March 2026; retrieved by the audit agent.
2. [Stripe India](https://stripe.com/in); page text retrieved by the root agent.
3. [Notion product](https://www.notion.com/product); visually inspected in the browser by the root agent.
4. OpenVC, [Search investors in your CRM](https://docs.openvc.app/en/articles/13762371-search-investors-in-your-crm); text retrieved by the root agent.
5. Intercom, [Get started with Intercom Inbox](https://www.intercom.com/help/en/articles/6274899-get-started-with-intercom-inbox); text retrieved by the audit agent.
6. Stripe, [Dashboard basics](https://docs.stripe.com/dashboard/basics); text retrieved by the audit agent as a supplementary example of task-based navigation and prominent home actions/notifications.

An existing detail-sheet React warning was traced to three sibling elements sharing the profile ID as their key. Fit and safety keys now have distinct namespaces; no account or profile data was changed. A fresh built-Worker browser check opened direct-linked Tracegrid and Stockloom via lazy quick search with no observed errors from that local origin; the authenticated fixture had already been removed.

The older research remains useful context in `../DESIGN_RESEARCH.md`, `../MARKETING_BENCHMARKS_2026-10-09.md` and `../PRODUCT_IMPROVEMENTS_2026-10-17.md`. It is not represented as a fresh live inspection in this release.

7. Clerk, [Bring your own CSS](https://clerk.com/docs/js-frontend/guides/customizing-clerk/appearance-prop/bring-your-own-css); official customisation documentation retrieved for the `appearance.elements` presentation refinements.
