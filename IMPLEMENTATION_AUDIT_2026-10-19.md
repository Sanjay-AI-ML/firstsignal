# FindIn implementation and frontend audit

Checked 19 October 2026 against the user's pasted end-to-end overview. The attachment is a set of claims to verify, not a release certificate. This document supersedes its implementation, security, compliance and test claims where they differ.

**Finding:** the named components were connected to the frontend, but several were local demonstrations presented as live services, verified evidence or legal/security controls. There were also reproducible privacy and deletion defects. The source now corrects those defects and describes the tools' actual scope. This does not establish production readiness or mean the changes are on the hosted site.

## What exists and where to find it

| Claimed feature | Actual frontend entry | Checked implementation and present limits |
| --- | --- | --- |
| React/Vinext, Clerk, D1 | Marketing, sign-in and `/app` | Existing architecture confirmed. Clerk production activation, hosted data and operational readiness require their separate checks. |
| Nine-chapter scrolling journey | Homepage header; start through final invitation | Implemented, with native anchors, pause controls and static/reduced-motion fallbacks. Geometry/SSR checks pass; latest browser motion/device checks remain pending. |
| Multiple founder ideas | `/app#profiles` → My ideas | Real independent records and exact-owner edits, per-idea progress, introduction source selection and Test & learn remain implemented. Existing records are preserved. |
| Live signal ticker | Homepage after hero | Four selectable **fictional planning examples**. It has no live feed, real network metrics or verified members. Removed fabricated verification, average runway and activity claims. |
| Signal versus Deck stage selector | Homepage comparison section | Two educational views, not pre-seed/seed/Series-A selection. Removed unsupported percentages and dispute statistics. Both an introduction and a learning record can be useful; neither proves demand. |
| One-minute pitch builder | Homepage Learning section | A four-step fictional learning walkthrough, **not** an editable industry/audience/differentiator pitch generator. An editable pitch builder remains absent. Removed arbitrary investability percentages. |
| Floating toolkit | Homepage → Planning tools | Seven real, unique tool destinations, including valuation. Uses the existing accessible dialog rather than an incorrectly marked modal. Homepage only; it does not launch saved workspace tools from every route. |
| Valuation, equity and vesting | Homepage → Templates / Planning tools | Working local scenarios with copy/download where provided. They do not value an actual company, save a cap table or recommend a fair ownership split. Fixed remove-middle/add founder ID collisions and vesting/rounding edge cases. Assumptions are disclosed. |
| iSAFE/CCD term-sheet generator | Homepage → Funding scenario worksheet | Replaced unsupported legal-document claims with cap-only, discount-only and combined pricing arithmetic. Inactive terms are excluded. No issued agreement, stamp-duty calculation, MCA approval or India-compliance certification. |
| Shared angel syndicate room | Homepage → Co-investment planning | Personal hypothetical allocation worksheet. Correct under/over-target totals; all discussion topics start unchecked. No shared investors, commitments, consensus, pooled funds or execution backend. |
| Confidential VDR and NDA | Profile → Diligence → Information to discuss | Actual member-reported context and an unchecked preparation checklist. **No document storage, confidential-file permissions, signed NDA or encrypted watermark exists.** Removed fake decks, file sizes, incorporation verification, customer LOIs and financial metrics from real profiles. |
| Discovery summaries | Discover and profile comparison | Progress counts and supplied dates are literal, self-reported facts. Removed invented 8–12/14–18-month runway badges derived from budget alone and positive fit ratings for unknown preferences. The learning/updates presence filter is session-only and is not included in copied search URLs. |
| Diligence memo / founder readiness | Profile → Diligence; My ideas | Personal browser-only review notes and literal field-completion guidance. Removed automatic authenticity, conviction, traction and investor-readiness ratings based on text length. Personal notes are not persisted to an account. |
| Customer discovery matrix | Homepage Learning section only | Clearly fictional, filterable examples with labelled exports. No invented interview data is injected into member evidence. Actual member learning remains the founder-written summary and explicitly shared Test & learn results. |
| Monthly investor update | My ideas → IR update | Real owner-scoped Progress write. Starts with blank amounts and narratives, previews exact content, requires explicit visibility/financial-sharing confirmation, and supports local copy/download. Drafts are keyed to the idea and guarded during navigation/pending saves. No email is sent. Missing values remain unknown; no silent text truncation. |
| Data export | My profile → Your safety & privacy controls → Export workspace | Authenticated JSON of currently stored workspace records and participated conversations. Includes **only the requesting member's private follow-up notes**. Excludes operator-only report notes and Clerk-managed records. Includes tests, progress, negotiation history, notifications and preferences. The archive is not a transactionally frozen snapshot or a complete copy of every provider/retained audit record. |
| Complete account erasure | My profile data controls | **Unavailable.** The unsafe wipe control was removed and the server refuses the legacy action before touching storage. A proper deletion workflow still needs Clerk/session handling, retention policy and preserved abuse-prevention boundaries. |
| Rate limiting | `/api/workspace` | Bounded, isolate-local **fixed-window** throttle. Authenticated writes use account identity; forwarded-for chains are ignored. State is not distributed and can reset or be evicted. This is not sliding-window or comprehensive anti-scraping/DoS protection. |
| Error boundary | Profile Diligence subtree | Real render-error isolation/retry for that subtree. It does not cover the entire app or asynchronous/event errors. Retry may lose a child's unsaved input; wording now states that accurately. |
| Uniform theme / mobile certification | Core light lavender design and new tool styles | Existing theme preserved, with responsive CSS and meaningful labels. No full dark-mode, physical-device, 320px final visual, screen-reader, frame-rate or Core Web Vitals certification is established by this pass. |

## Defects reproduced and corrected

- The old export selected follow-up notes by conversation ID without their owner, exposing another participant's private note. Actual route/SQLite fixtures reproduced this. Queries now enforce owner scope and use explicit projections; internal operator notes are excluded.
- Expanding every idea/conversation ID into bound parameters made export/deletion fail above D1's binding limit. Owner-scoped joins/subqueries now export 205 ideas and 105 conversations without expanding those ID lists.
- The old deletion action removed other members' blocks and private follow-up notes while leaving the same Clerk identity active. A synthetic account could immediately recreate a listing. The action now returns a clear refusal with no database calls or mutations; safety records remain intact.
- Real profiles were receiving invented documents and customer results. A nonempty incorporation field, even “Not incorporated,” triggered “Verified Record.” These records and security badges have been removed.
- Monthly updates initially contained fictional cash, revenue, growth and customer wins, then posted with automatic consent. Drafts could also move from Idea A to Idea B. Blank inputs, explicit review/consent, exact per-idea keys, dirty/pending guards and native unload protection address those source defects.

## Legal and privacy claim checks

No legal approval, statutory safe harbor or compliance certification is established by a disclaimer or a calculator. The app's proposal labels now describe the actual non-binding discussion behavior, without asserting that this alone determines a transaction's legal classification.

Official references used to check the pasted claims:

- [Companies Act 2013, section 42](https://www.indiacode.nic.in/bitstream/123456789/2114/5/A2013-18.pdf): substantive private-placement requirements cannot be supplied by a UI notice.
- [SEBI collective investment scheme FAQ](https://www.sebi.gov.in/sebi_data/docfiles/20623_t.html): the arrangement's actual characteristics matter; calling a worksheet non-binding does not establish a safe harbor.
- [100X.VC's iSAFE resource](https://www.100x.vc/isafe) and [Y Combinator's SAFE resources](https://www.ycombinator.com/safe): these do not support presenting our generic output as an approved Indian instrument. The tool now exports planning arithmetic only.
- [DPDP Act, sections 11–12](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023-1.pdf): access information and erasure with applicable retention exceptions do not establish the advertised blanket portability/complete-wipe claims. The [official commencement notification](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf) phases sections 11–17 eighteen months after its November 2025 publication; they are not presented here as already-operative statutory export rights on 19 October 2026.
- [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): a local React toggle is not server-enforced access control.

## Verification and release boundary

Seventeen suites pass, with 2,203 explicitly counted assertions across the suites that report counts, plus the five remaining passing suites. New checks exercise actual route/SQLite data privacy and refusal behavior, pure financial/input logic, real React server rendering, per-profile state keys, blank/unchecked defaults and tool destinations. Existing multi-idea, admin, experiments, discovery/privacy and scroll suites were rerun. These are assertions, not 2,203 browser scenarios or independent security reviews.

TypeScript and the production build pass. Thirty-six scoped source/helper/test files have zero lint errors and five existing homepage image advisories. A separate lint check of the two legacy workspace/proposal files has nine errors and three warnings; the clean GitHub baseline has the same counts. CSS parsing passes for the changed component styles.

The actual local built Worker returned the seven unique tool destinations and truthful example/worksheet labels in its homepage HTML; all 91 linked CSS/JS responses returned 200. Privacy text, anonymous workspace GET/no-store, anonymous destructive POST rejection and owner-API rejection were checked. An unrelated unknown-route request stalled and was cancelled, so a fresh unknown-route HTTP check remains unresolved; no temporary QA route appears in the source/build route list. Local HTTP/SSR checks do not establish hydration, focus, keyboard interaction, layout or motion quality.

Old totals such as “1,080+ tests” do not establish coverage of newly added tools, secure document handling or deletion. The extended lint run still exposes legacy workspace/proposal findings and image advisories; a blanket “zero errors, zero warnings” claim is false.

**Not checked in a browser or published:** local browser access remains disabled, and the existing Sites connection could not locate the retained project. No substitute hosting identity, production database operation, authentication-provider change, real-user deletion, outbound email or live investment transaction was performed. Source and GitHub availability must be distinguished from the hosted version. Final browser/device/keyboard checks and hosted release verification remain outstanding.
