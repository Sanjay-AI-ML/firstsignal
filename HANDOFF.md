# FindIn handoff

Updated 18 October 2026. FindIn is a public pilot using Clerk development authentication, React/Vinext and Sites-managed Cloudflare D1. The current implementation includes the guided profiles, connections and member controls described below. Production authentication, a controlled domain, live email activation and operational release work remain pending; see [release status](RELEASE_READINESS.md).

Public URL: [FindIn](https://firstsignal-founder-network.divineridge.chatgpt.site). Reuse this existing Site for future updates. FindIn remains a working brand name, not a cleared trademark.

## Product routes and design

The user selected the brand FindIn on 17 October 2026. The lavender abstract F mark remains appropriate and is served as `findin-logo.png`. Visible website/authentication titles, privacy text, worksheet filenames and notification body use FindIn. Existing hosting URL, repository identity, `FIRSTSIGNAL_ORIGIN`, session refresh key and notification idempotency prefix remain stable for compatibility; they are not user-facing brand names.

`/` is the marketing page; `/app` is the workspace. `/signin`, `/signup` and `/signout` use Clerk. `/privacy` describes current visibility and controls. Research documents remain internal development context; there is no Research & insights product screen.

The selected design is the light lavender Stitch option C, with a generated logo, responsive application screens and a marketing page with three specialty cards and scroll effects. Reduced-motion and smaller-screen layouts disable nonessential rotation and sticky effects. Marketing photographs are stock images, not member endorsements; sources are in [MARKETING_ASSETS.md](MARKETING_ASSETS.md).

## Implemented workflows

The discovery workspace now defaults to the opposite role for existing profiles, preserves explicit filters in URLs and exposes clean search links. A compact signed-in overview links to profile guidance, requests/proposals and due private follow-ups. Two or three profiles of the same type can be compared using a desktop table or a phone criterion selector. Comparison uses supplied data only, with fictional/self-reported labels and no investment score. Existing outgoing requests open their current relationship. Profile edits ask before discarding changed fields or sharing choice; a standard unload warning applies where supported. Edits are not autosaved or stored in browser storage.

Saved and directly linked accessible profiles load independently of the latest-200 discovery cutoff, including progress. Retrieval remains bounded, de-duplicated and subject to ownership/public visibility and bilateral blocks. Unavailable saved IDs are removable without exposing private profiles. Own private saved profiles remain excluded from Discover.

Founder forms use the label Ideology for the existing `problem` field, require a proposed solution (10–1500 trimmed characters), and no longer ask for an evidence-observation date. Investor investment interests remain optional. Existing saved evidence dates stay in storage and may still appear as historical context; the writing checklist no longer requires a date. New profiles without a date do not show missing-date prompts.

The platform accepts startup ideas across industries, including physical products and services. New profiles choose from broad categories or select Other and enter a sector/service name. Investors can combine listed interests with one named custom sector. Custom names are saved in `customSector`, displayed in profile summaries and review, and included in search, category filters and exact case/whitespace-normalized comparisons. Legacy SaaS labels retain their original meaning and remain editable; they are not silently expanded into broader investor interests. No database migration is required because profiles use JSON storage.

The marketing hero includes an interactive fictional evidence brief with Learning, Open questions and Next test views. It separates reported interviews, planned prototype use and untested paid use; exposes source/date/limitations; and gives a proposed test with a measurement and decision criterion. The example is unverified and saves nothing. External Strategyzer references explain the method without implying endorsement. Founder/progress worksheets now include source context, participant selection, measurements and criteria set before testing. This is a marketing demonstration and writing aid, not a new member verification service or a structured experiment database.

The marketing hero switches between founder and investor starting points. Role-specific links preserve the preference through Clerk sign-in/sign-up redirects. After loading the workspace, a member without a profile can open an empty private editor. Existing members resume their saved profile; a link for the other role returns them to My profile without creating or overwriting anything. The role is fixed on first save, with one founder OR investor profile per account. Failed workspace loads retain entry intent for retry.

The public Templates section provides original founder brief, progress update and investor preference worksheets. Preview, copy and Markdown downloads work without an account. Guided-form links preserve template/role intent; they never import fictional observations or save automatically. The progress template opens a blank composer for an existing founder, or starts founder setup first. Progress still follows profile visibility and requires explicit consent.

Template downloads are served at `/templates/founder-brief`, `/templates/progress-update` and `/templates/investor-preferences`. Unknown templates return 404. No database migration or authentication-provider change was needed for this update. Real pilot testimonials, outcome statistics and marketing analytics are not implemented by these changes.

| Workflow | Current behaviour |
| --- | --- |
| Account and role | Clerk sign-in/sign-up/sign-out. New members choose founder or investor, or explore first. Each account can create one founder OR investor profile. An atomic server-side conditional upsert rejects a second role with HTTP 409, including simultaneous requests. Same-role saves edit the existing record. Legacy accounts that already have two profiles can still edit both; no data is deleted. |
| Profiles | Guided founder and investor forms, private drafts or public listings, explicit sharing consent and a completion checklist. Founders describe their problem, evidence, uncertainties, next milestone and INR budget. Investors can state multiple sectors/stages, evidence requirements and an optional INR check range. Completion measures filled fields, not investment quality. |
| Discovery and suggestions | Search, sector/stage/member filters, saved profiles, detailed evidence panels and explainable opposite-role suggestions. Reasons describe stated sector, stage and budget alignment; unknown information remains explicit. There is no funding probability, automatic verification or investment recommendation score. |
| Introductions | Real members request an introduction with consent. Recipients accept or decline; senders can withdraw pending requests. Messaging becomes available after acceptance. Fictional profiles create private practice notes and contact nobody. |
| Connections | A dashboard brings together requests, accepted conversations, proposal status and private next steps. Each participant's note and optional date are visible only to that participant. Dates help surface follow-up in the dashboard; they do not schedule reminders or send messages. |
| Proposals | Accepted participants can privately discuss non-binding INR bids and counteroffers, acknowledge interest, decline or withdraw. Versioned writes preserve history and reject stale responses. These records do not execute agreements, investments or payments. |
| Progress | Owners can add or remove dated, self-reported updates on founder profiles. Updates follow the profile's sharing setting: draft updates stay private, listed updates are public. Saved real startups contribute to a recent-progress feed. Following does not broadcast progress emails. |
| Reporting and blocking | Members can submit a profile report or block an account. Reports are stored with submitted status for manual operator review; submission does not automatically remove a profile. A block hides both accounts' profiles from each other's signed-in discovery, removes their reciprocal saves and prevents requests, responses, messages and proposals. Existing accepted history and each person's private notes remain available. Public listings can still be viewed while signed out. |
| Notifications | In-app connection notices and optional verified-email opt-in. Confirming a Clerk account email is separate from checking founder or investor claims. Resend sending is implemented but inactive until sender-domain and runtime settings are configured. |

Nine examples—six startups and three investor mandates—are explicitly fictional. Their evidence and updates are illustrative. Real member statements and progress are self-reported, not independently verified.

## Identity, privacy and data

Server/API account identity comes from verified Clerk sessions and is namespaced as `clerk:<user_id>`. Hosting identity headers do not grant account access. Hosted token validation enforces the configured origin, and writes require a same-origin request. Secrets belong in ignored local environment files or secure hosting runtime settings, never source or the hosting manifest.

Public listings and their updates are readable by anonymous visitors. Draft profiles, saves, introduction messages, accepted conversations, private next steps, email preferences, block lists and submitted reports are account-scoped. Accepted participants share conversation and proposal history; their next-step notes remain separate. There are no uploaded-document rooms or per-document sharing permissions in this implementation.

Old ChatGPT-owned records are retained under their old IDs. Do not transfer them by matching email. The owner's separately initialized Cloudflare D1 database is not the database serving the current Site. Source upload to GitHub does not deploy the app or move data.

## Pilot limits

- One founder OR investor profile per account (legacy pairs remain editable); newest 200 eligible public listings in discovery.
- Up to 200 saves, 20 introduction requests per account per rolling 24 hours and 100 messages per conversation.
- Latest 100 introductions in the dashboard; an existing request for the same target cannot be recreated.
- Up to 50 proposal-history versions per accepted connection.
- Up to 20 progress updates per founder profile; remove an old update to add another.
- Up to 100 blocked accounts and 10 reports per account per rolling 24 hours.

These bounds and server authorization are pilot controls, not a complete traffic-abuse or moderation system.

## Local development and migrations

Use Node.js 22.13+ and the committed lockfile. Follow [README.md](README.md) for a clean clone: install, copy the blank environment template, supply Clerk **development** keys, build, initialize local D1 and start the server. There is no mock sign-in bypass in the current account implementation.

```powershell
node node_modules/typescript/bin/tsc --noEmit
node scripts/run-framework.mjs build
node scripts/run-framework.mjs dev
```

The direct JavaScript entrypoints above are useful on this Windows host if an npm wrapper fails. The development server normally uses `http://127.0.0.1:5173`; keep `FIRSTSIGNAL_ORIGIN` and the opened URL consistent.

Schema lives in `db/schema.ts`; SQL migrations live in `drizzle/`. Keep applied migrations immutable. A fresh local database needs all four migrations in order (including 0003 below):

```powershell
node node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_majestic_ender_wiggin.sql
node node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_whole_king_bedlam.sql
node node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_glossy_cable.sql
node node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_owner_portal.sql
```

Migration `0002_glossy_cable.sql` adds progress updates, member blocks/reports and private connection next steps. On an existing local database with `0000` and `0001` already applied, run only `0002`. These commands target local state; never substitute a live database or reset one to initialize development. Sites deployment owns the current live D1 binding and migration workflow.

## Verification and remaining work

Release validation: 204 authenticated local workflow checks passed with verified Clerk development sessions. Profile-fit (12), suggestion (28), notification-provider mocks and the 202-profile D1 parameter/message bounds check passed. Founder and investor forms, range validation, consent and 390px/320px layouts were checked in the browser. TypeScript and the production build pass. [README.md](README.md) lists the type check, profile logic, notification-provider mock, build and authenticated workflow commands. The authenticated script creates and cleans up temporary users in the configured development Clerk instance, uses local D1 and rejects a non-loopback test origin. Local QA data stays in ignored `.wrangler/state` and is not deployed.

Passing local checks does not establish production OAuth behaviour, complete WCAG conformance, an independent security audit or field performance. Before a full production launch, activate production Clerk/domain settings, test real opted-in email delivery, establish support/deletion and manual report handling, add monitoring/alerts and verify backup/restore. There is no report administration UI, automatic moderation, background email retry scheduler or delivery webhook yet.

See [Clerk setup](cloudflare/CLERK_SETUP.md), [email activation](EMAIL_SETUP.md) and [release requirements](RELEASE_READINESS.md). Keep the actual financing operating model and advertised claims aligned with the scope assessed in the workspace's success plan.

## Marketing page update — 9 October 2026

The light marketing page now includes a four-step interactive product walkthrough, separate founder and investor sections, stock photographs with visible credits, privacy/consent explanations and expanded FAQs. Founder and investor anchors have distinct vertical destinations; native anchor navigation, sticky-header offsets and active navigation feedback replace the previous ambiguous shared-row destination. Manrope is self-hosted under the SIL Open Font License.

The walkthrough uses explicitly fictional data and local React state only. Its visibility toggle, stage comparison and counteroffer preview do not save records, send proposals or contact members. Its tabs support arrow keys, Home/End and one keyboard tab stop. The real workspace entry remains linked separately. This marketing update does not change account APIs, D1 schema, auth configuration or email activation.


## Integrated design update — 18 October 2026

The public marketing page, workspace and authentication share Manrope and semantic lavender design tokens. Marketing demonstrates clearly labelled fictional discovery and comparison, with role-specific sign-in routes and stage-filter deep links. Profile rows support compact list or card layouts. The smaller workspace overview prioritises profile review, requests/proposals and private follow-up dates.

Quick search (header or Ctrl/Cmd+K) finds already loaded, authorised profiles, including the account's own private draft, and workspace pages; it shows at most 20 profiles. Conversation search runs locally over authorised names, request/message text and the current participant's private notes. It combines with connection filters and sends no contact. Existing APIs and permission rules are unchanged.

See [design system](DESIGN_SYSTEM.md) and [audit/research and verification](DESIGN_AUDIT_2026-10-18.md). Browser checks covered 320px comparison, private search, keyboard selection/Escape focus, dirty-edit protection, connection search/filter recovery, marketing at 320/390/768/1024px, role handoff and sign-in layout. Authentication fields/actions have 44px minimum heights; the Google label fits at 320px. Core Web Vitals and full accessibility remain unmeasured. Existing lint baseline remains; newly added components pass scoped lint.

18 October final verification: TypeScript and production build passed after the profile-sheet key fix. Regression scripts for workbench/search, saved/direct access, 402-profile database bounds, single-profile/solution rules, broad/custom sectors, profile fit and suggestions passed. Modified marketing and new components have zero lint errors; existing image warnings and legacy workflow lint errors remain. The temporary fixture is absent from the build. Built-Worker browser checks opened direct-linked profiles and used lazy quick search to open another profile without observed errors from that local origin.


## Owner portal + visual V2 — local implementation, 18 October 2026

Implemented `/admin` and `/api/admin`: exact Clerk owner-ID authorization before reads/writes, actual aggregate counts, searchable/paginated listings/reports/activity, review statuses and notes, reversible listing moderation with owner-visible reasons, optimistic versions and atomic audit history. Restriction records remain restorable after an owner unlists, with private draft content redacted. Connection reports resolve a single current owner-listed target profile; full bounded report details remain available. No account deletion/role granting, private conversation access or outbound emails. See [setup and behavior](ADMIN_PORTAL.md).

The public marketing page gains an original responsive connection map with keyboard tab semantics and reduced motion. Existing generated logo source is retained; 64/128/256 WebP delivery variants are 2,500/4,926/10,106 bytes. No new generated people or proof claims.

Validation: TypeScript, production build, 94 actual-route/SQLite owner-portal assertions, existing workbench/private saved-direct access/single-profile/sector/fit/suggestion and 402-profile bounds regressions pass. New backend/admin/marketing files have zero scoped lint errors; small native image warnings and the existing legacy workflow baseline remain. Actual component server rendering produced five clearly labelled static synthetic layout review files in ignored outputs; these do not establish browser layout or interaction quality. Browser control is disabled in Work settings.

Migration0003 was applied once to the existing LOCAL database after verifying it was not already present. No hosted schema or data changed. The owner subsequently supplied their sign-in email. Exact verified-primary-email Clerk lookup succeeded and the immutable account ID is bound in ignored .env.local. The local identity predicate allows only that account; hosted binding is still pending and defaults to deny all. Current Sites connector returns project-not-found for the retained identity and lists zero projects. Consequently this update is NOT PUBLISHED; the version26 website remains the last confirmed public deployment. Reconnect the existing Site's account/workspace, configure the immutable owner ID, and use the established migration/deployment flow. No replacement Site was created.

## Original marketing imagery — 18 October 2026

Added two actual original images after the user's follow-up: a full-width founders' workshop immediately after the hero and a matching founder–investor conversation in the investor section. The founder stock photograph remains credited. Both new artworks visibly say “AI-generated concept illustration”; the FAQ explains that they do not depict real members or endorsements. See [asset provenance and full prompts](MARKETING_ASSETS.md). Six local WebP files provide640/1080/1672px variants, explicit dimensions, complete uncropped compositions and lazy loading.

TypeScript, scoped marketing lint (zero errors; native-image advisories), CSS parsing and production build passed. Local built-Worker checks verified the new server-rendered section order/captions and all six image responses, MIME types and byte sizes. Optimized assets were inspected individually. Browser control remains disabled, so no fresh full-page visual or interaction QA is claimed. Built preview: `http://127.0.0.1:4310/` while the process runs. Sites still cannot locate the existing project, so these images and earlier owner-portal/V2 work are NOT on the public version26 site yet.
