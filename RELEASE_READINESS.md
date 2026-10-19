# FindIn release status

17 October 2026. The public Site is a working pilot with Clerk development authentication. It is not yet a fully activated production service.

## Multiple founder ideas — 19 October 2026

Implemented meaningful project icons, My ideas management, independent per-idea details/sharing/progress and selected-idea introduction threads. Non-destructive migration0004 preserves existing IDs and related records. The old single-idea restriction is superseded; the account role and single investor profile remain. See [verification and limits](MULTIPLE_IDEAS_2026-10-19.md). Synthetic browser creation/edit/reload and239 isolated multi-idea checks passed; no real account data was used.

## Implemented

- Research-led decision workspace: role-aware discovery and action overview, URL-restored filters/clean share links, two/three-profile comparison with a dedicated phone layout, visible budgets and removable filters, existing-request actions, own-profile fit defaults and unsaved-edit protection. Saved and direct-linked accessible profiles survive the newest-results cutoff; private/block controls and D1 query bounds remain enforced. No browser-storage draft saving, email reminder scheduler or investment ranking was added.

Workbench validation: TypeScript, production build, new helper checks, real SQLite saved/direct-link access and lifecycle checks, 402-profile D1 bounds, existing profile policy/required-solution, sector, fit and suggestion checks passed. Actual-browser local checks covered both role defaults, action counts, pending/accepted relationships, automatic own-profile fit, navigation/reload filters, unavailable-save removal, keep/discard edits, two/three-profile startup/investor comparison, clean copied links and desktop/narrow-phone layouts. A fresh browser pass had no client errors after development hot reload. The temporary fixture was removed before the production build. Isolated fixtures do not establish hosted production authentication or business conversion gains.

- Founder form changes: Ideology label, required Proposed solution and removal of the evidence-date input. Validation enforces the founder solution requirement, investor interests remain optional, historical dates stay intact and learning completion does not depend on a date.

Founder-field validation: TypeScript and production build passed. API/SQLite checks covered missing, blank and short founder solutions, saving without an evidence date, preservation of historical dates and optional investor interests. Completion checks accept learning text without a date. The actual local editor blocked an empty solution, focused the required field and advanced after valid input; no date input or browser errors were observed. The isolated fixture was removed before building; no real account data was changed.

- FindIn product branding across marketing, workspace, account screens, page titles, privacy copy, notification body and worksheet downloads. The abstract F icon is reused with a FindIn asset path. Hosting, accounts, stored profiles and configuration identities are preserved.

Rename validation: TypeScript and the production build passed. Homepage, workspace, sign-in, sign-up and privacy titles returned FindIn with HTTP 200; the new logo asset and FindIn worksheet content/download filename returned successfully. Local browser checks confirmed homepage branding and Clerk's FindIn sign-in/sign-up headings. No account was created or changed during these checks.

- Broad startup industries and named custom sectors through Other, for both founders and investor interests. Custom names appear in profile/review, search and category filters. Comparisons use explicit names with case/whitespace normalization; legacy SaaS preferences retain their specificity. Validation checks custom names and consistent investor preferences. Profile JSON storage needs no migration.

Sector update validation: production build, TypeScript, sector validation/filter/comparison checks, custom-sector API persistence/edit checks, the one-profile rule, existing profile-fit/suggestion checks, and D1 query bounds passed. Local browser checks covered broad founder choices, required Other text and focus recovery, custom labels in founder/investor review, mixed investor interests, custom discovery filtering, and a 320px layout without horizontal overflow. No browser errors were observed. The temporary fixture was removed before building. These checks do not establish production OAuth or independent validation of startup claims.

- One founder OR investor profile per account, enforced by an atomic server write and UI entry guards. Existing records and related progress remain intact; older accounts with both profiles retain editing access. Conflict responses refresh stale workspace state. Required fields use accessible stars; optional fields have keyboard/touch info buttons. Product and marketing copy uses clearer terms while retaining fictional, unverified and non-binding labels.

17 October validation: TypeScript, production build and `scripts/verify-single-profile.mjs` passed. The isolated SQLite/route test covers unauthenticated writes, consent, second-role rejection in both directions, simultaneous saves, stable IDs, ownership, progress preservation and legacy accounts. Local browser checks covered founder/investor forms, required-field errors, private defaults, required consent, optional-help keyboard opening/Escape/focus return, existing-founder editing and 390px/320px layouts without horizontal overflow. No browser errors were observed. The temporary fixture was removed before the production build. These checks do not establish production OAuth or full accessibility conformance.

- Marketing evidence brief with keyboard-accessible Learning/Open questions/Next test tabs, fictional claim provenance and explicit untested assumptions. Updated writing worksheets support experiment planning; no independent startup validation or evidence review is claimed.

Evidence-brief validation: TypeScript and production build passed. Browser checks covered all three views, arrow/Home/End keyboard focus, expanded method references, template navigation, desktop and 390px/320px layouts without horizontal overflow. Updated founder/progress Markdown endpoints returned 200 with the new prompts. No marketing console errors were observed. This checks presentation and interaction, not business demand or startup claims.

- Role-specific marketing entry carried through sign-in/setup, preservation of existing profiles, role selection before the first save and three ungated writing worksheets with preview/copy/download actions.

- Guided founder/investor onboarding, private drafts or public listings, consent and profile-completion guidance.
- Discovery, saved profiles, explainable suggestions and stated profile-fit comparison; no funding probability or independent verification claim.
- Mutual-consent introductions, accepted conversations, a connections dashboard, private next-step notes/dates and versioned non-binding INR proposal discussions.
- Dated founder progress updates and a saved-startup progress feed. Draft updates remain private; listed updates are public and labelled self-reported.
- Profile reports and account blocking. Server checks prevent contact in both directions; existing conversation history remains readable by participants. Public listings remain visible when signed out.
- Clerk sign-in/sign-up/sign-out, server-verified sessions, hosted-origin validation, account scoping, loading/retry states and sign-out failure feedback.
- Private/no-store HTML/API responses, content-type protection, referrer policy and restricted device/payment permissions.
- A factual `/privacy` page describing current visibility and controls; this is not a compliance certification.
- In-app connection notifications, verified-primary-email opt-in and Resend integration. Live sending remains inactive pending a verified sender domain and runtime credentials.

Validation: TypeScript and the production build pass. All 204 authenticated local workflow checks pass, covering consent, persistence, progress visibility, private notes, reports, bidirectional blocking and account isolation. Profile-fit (12), suggestion (28), notification-provider mocks and 202-profile D1 bounds checks pass. Founder/investor onboarding and 390px/320px layouts were checked in the browser. Local development-session checks do not establish hosted production OAuth behaviour, full accessibility conformance, a completed security audit or real-user Core Web Vitals.

## Production activation still required

Marketing update validation: TypeScript passed; template endpoints returned all three Markdown downloads and unknown IDs returned 404. The actual browser copy/download actions, desktop and 390px/320px layouts, role-selector keyboard controls and modal dismissal were checked. Isolated local component fixtures checked new founder/investor setup, existing-profile resume, cancellation/role switching, load failure/retry, progress-template entry and explicit private-save consent. The fixture route was removed before the production build. These fixture checks do not establish production OAuth behaviour or conversion gains. Genuine permissioned pilot stories and outcome measurement remain future work.

1. Choose and attach an owned domain. The owner deferred that decision; none has been purchased or attached by this work. Recheck student-benefit eligibility, checkout price and renewal cost when selecting one.
2. Configure Clerk's production instance, DNS, production OAuth settings and keys. Switch origin and keys together, then verify browser sign-in/sign-out, reload, expiry and cross-account access on the chosen domain. Keep the development instance's truthful label until activation.
3. Activate a verified sender domain and secure Resend runtime settings, then test a consenting real recipient, opt-out and provider failures. Confirming an account email is separate from checking investment or founder claims. See [EMAIL_SETUP.md](EMAIL_SETUP.md).
4. Establish an operator and process for reviewing submitted reports, investigating abuse, responding to users and enforcing decisions. The current product records reports but has no administration UI or automatic moderation. Reporting does not automatically remove a listing, and blocking does not make an otherwise public listing private.
5. Establish support/contact, data deletion, operating terms, monitoring/alerts and a tested database backup/restore. Pilot quotas, validation and account authorization do not replace a broader traffic-abuse response or independent release assessment.
6. If moving to the selected direct Cloudflare stack, configure the own-account Worker, production secrets and D1 binding explicitly. Sites D1 and the owner's separate D1 database are distinct. Any identity/data transfer needs an explicit mapping; never reassign ownership by matching email alone.

No domain purchase, paid-service activation, live data migration, privacy certification or independent claim verification is part of this update.

## Behaviour and limits to preserve

Private proposal amounts and terms are discussion records available only to accepted participants. An acknowledgement is not a signed contract, completed financing or funds received. The product does not run public investment auctions or process money.

Each participant's next-step note and date stay private to that person. Dates do not schedule reminders. Saving a real startup follows its visible progress in the workspace; progress updates do not trigger email broadcasts.

Connection emails contain generic event notices, not private message content or proposal terms. Provider acceptance is labelled submitted, not delivered. There is no background retry scheduler or delivery webhook. Blocks suppress further connection notifications between the accounts; historical notices and accepted conversation records remain account-scoped.

Examples remain labelled fictional. Stock marketing photographs imply no member, partner or investor endorsement. Review this document alongside [HANDOFF.md](HANDOFF.md) when expanding advertised behaviour.

## Marketing experience — 9 October 2026

The public landing page now demonstrates profile drafting/listing, stated stage fit, saved-startup progress and non-binding proposal versions through a clearly labelled local example. Founder and investor navigation targets separate sections. Marketing copy describes implemented controls; it does not claim guaranteed funding, verified investment quality, email delivery, automatic report resolution or scheduled reminders. The self-hosted Manrope font includes its license in `public/fonts/Manrope-OFL.txt`.


## Integrated design update — 18 October 2026

Shared semantic tokens, consistent Manrope, compact overview, profile list/card layouts, composed discovery filters, local workspace search and local conversation search are implemented. The public preview uses fictional profiles and truthful planning-budget labels. Neither search changes account visibility or sends messages. Existing one-profile, custom-sector, consent, saved/direct access and private proposal workflows are retained.

Scoped lint for the new components passes. The two modified legacy workflow files retain 11 pre-existing lint errors with no added errors; this is not a clean-lint release. Manual browser checks cover key keyboard, narrow-screen and privacy-sensitive interactions; see [the dated audit](DESIGN_AUDIT_2026-10-18.md) for exact scope and limits. Production Clerk/domain, email activation and launch operations above still apply.


## Owner portal — implementation and activation

The operator report-review and reversible listing-moderation UI/API are now implemented with exact server-side owner identity, private-content exclusion, atomic audit records and conflict checks. This supersedes the earlier missing-admin-UI limitation in source only; it does not establish a staffed report-handling process or production activation. Local and hosted owner binding are configured after verified Clerk lookup (hosted environment revision 2). The earlier project-not-found error was resolved on 18 October 2026. Publish through the existing source helper; Sites applies pending migration 0003 before uploading the Worker. Confirm activation from the native deployment result. Browser visual/focus/reflow verification also remains pending because browser control is disabled. See [ADMIN_PORTAL.md](ADMIN_PORTAL.md) and [DESIGN_V2_REVIEW.md](DESIGN_V2_REVIEW.md).

The subsequent admin research update adds a dedicated `/admin/signin`, no admin signup, owner/member account switching, separate admin logout return, founder/investor and removed/visible filters, and bounded listed-idea/progress inspection before removal. Removal/restoration still records the owner-visible reason and audit atomically.174 isolated API/entry assertions, TypeScript, CSS parsing, scoped lint and build pass; anonymous built-Worker HTTP guards pass. This requires no migration beyond the earlier 0003. Live owner OAuth and full-page visual/keyboard checks remain unverified. Hosted binding is configured; the existing Sites deployment flow owns migration and publication. It provides reversible listing moderation rather than account suspension, permanent deletion or unrestricted data access.


## Published admin release — 18 October 2026

Published successfully as version28 on the existing public FindIn site, with hosted owner secret environment revision2 and the pending admin schema migration applied by the Sites deployment flow. Source: d7da3ed1cbb3c199ad7b2fb2b3863fe064fec368. Deployment: appgdep_6ad4e18e05408191acdca1bd7229f4bc. Admin entry: https://firstsignal-founder-network.divineridge.chatgpt.site/admin/signin . Earlier project-not-found and unpublished notes describe the recovered blocker, not the current release.

Live HTTP checks confirm admin sign-in200, anonymous admin redirect to its dedicated entry, admin API401/no-store and working workspace queries. Both new marketing artworks return200 with bytes matching the checked source files. Full owner OAuth and browser visual/interaction QA remain unverified because browser automation is disabled in Work settings. No real member moderation or account changes were used for testing.

Static-asset header limit: public/_headers declares correct WebP/WOFF2 types and retains content-hashed caching rules, but Sites still returns application/octet-stream for these media types after deployment. Contents match their originals; do not claim the hosted MIME header is corrected. This remains a platform delivery limitation.


## Published multiple-idea release — 19 October 2026

Published version31 on the existing public Site, source 9dbab35f721082d5cae34a6946956f58565afb29, deployment appgdep_6ad5b81d47d88191b67ff62162a5636d succeeded with unchanged environment revision2. Migration0004 enables independent founder ideas and source-scoped introduction threads without replacing existing records. New shared category/purpose icons replace project initials. See [contract and verification](MULTIPLE_IDEAS_2026-10-19.md).

239 isolated multi-idea checks, existing role/saved-direct/privacy/bounds/workbench/sector/fit/suggestion and157 admin checks passed. Final TypeScript, production build, CSS parsing and15-file scoped lint passed (one native-image warning; existing legacy workflow lint findings remain). Browser testing created and edited two ideas through the actual editor against an isolated real-handler/SQLite memory server; IDs survived reload, progress remained per idea, same-investor practice threads stayed distinct, and320/390px layouts had no horizontal overflow. Test route removed before build and live /qa-ideas returns404; anonymous profile writes and admin API return401/no-store.

Live signed-in My ideas loads the existing owner's one public idea without error. Add an idea opens a blank name field and cancels cleanly, leaving the existing record unchanged; no real idea/account was created or edited by verification. Live sample icons use distinct handover/documents SVG marks, updated role explanation is present, and no client error was observed. Proof of the two-idea flow is outputs/findin-multiple-ideas-local-qa-2026-10-19.png, explicitly labelled LOCAL QA. Existing domain/production-Clerk/email/operations limits remain separate.

# Test & learn implementation — 19 October 2026

Implemented a per-idea private testing workspace, fixed plans after start, immutable recorded learning, explicit sharing/unsharing and public founder-reported results. Additive migration `0005_test_and_learn.sql` is required. See [research, checks and limitations](TEST_AND_LEARN_2026-10-19.md).

455 experiment-route/SQLite checks, existing multi-idea/admin/workbench/saved-access regressions, TypeScript, scoped feature lint and production build pass. Local browser checks reached planning, failure recovery and idea-switch protection before browser use was disabled in Work settings. Full final lifecycle/mobile browser QA remains incomplete.

**Not deployed:** the existing Site connection began returning `Sites project not found`, and the currently connected account returned no Sites. The last observed published version was 32. Existing hosting identity and audience have been preserved; no substitute Site was created and no production migration was applied for this feature.

## Scroll journey continuation — 19 October 2026

Code and GitHub are complete for the V3 continuation: accessible header chapter controls, image framing, coherent fictional product narrative, explicit walkthrough exits and reader-position preservation. 194 motion/navigation assertions, TypeScript, scoped lint, CSS parsing, production build and compiled-page HTTP/SSR checks pass. See [current research and exact limits](SCROLL_COMPLETION_2026-10-19.md).

The user chose code/GitHub first. Final browser/device/OS preference checks and screenshots are pending because local browser use is disabled. This pass is not published; the existing Sites connection still returns project-not-found. No hosting audience, identity, database or authentication configuration was changed.

## Checked frontend and safety corrections — 19 October 2026

The user's pasted overview was checked against frontend entry points, server contracts and official sources. The [implementation matrix](IMPLEMENTATION_AUDIT_2026-10-19.md) records what is real, local, illustrative or absent. Removed invented member evidence, verification badges, readiness ratings and unsupported legal/security claims.

Homepage financial tools are local planning worksheets; the ticker and learning walkthrough are fictional examples. Live feeds, editable pitch generation, shared syndicate execution and secure document storage are absent. Diligence contains self-reported context and personal checklists. Monthly updates start blank, preview exact content, require explicit sharing confirmation and use idea-specific drafts with navigation protection. Toolkit links reach seven actual homepage tools. Budget alone no longer produces invented runway estimates. No emails are sent.

Exports exclude counterparties' private follow-up notes and internal operator fields. Actual route fixtures cover 205 ideas and 105 conversations. Unsafe account deletion is unavailable; the legacy action refuses before database access, preserving safety records. The bounded throttle uses best-effort fixed windows within one isolate. These changes do not certify legal compliance.

Validation: 17 regression suites pass, including 2,203 explicitly counted assertions plus five other passing suites. New suites cover data controls (87), truthful frontend rendering (116), planning tools (144), monthly updates/tools/customer records (104) and planning models (667). Existing experiment, multi-idea, admin, navigation, discovery and privacy checks pass. TypeScript and production build pass; 35 CSS files parse. Thirty-six scoped files have zero lint errors and five existing homepage image advisories. The two legacy workspace/proposal files still have nine errors and three warnings, matching their clean GitHub baseline. Injected database failures produce expected test logs.

Local built-Worker HTTP/SSR checks confirmed seven tool destinations, truthful labels, 91 CSS/JS responses with status 200, accurate privacy text and anonymous API boundaries. An unknown-route request stalled and was cancelled; fresh 404 behavior and latency remain unresolved. Browser interaction, hydration, keyboard/device layouts, motion and screenshots remain unverified because browser use is disabled. Sites cannot locate the existing project. This source update is not a hosted release; no production database, provider setting, member record, email or investment transaction changed. Preserve the existing hosting identity and finish browser/hosting checks before publication.
