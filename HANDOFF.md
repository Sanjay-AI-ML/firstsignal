# FirstSignal handoff

Updated 9 October 2026. FirstSignal is a public pilot using Clerk development authentication, React/Vinext and Sites-managed Cloudflare D1. The current implementation includes the guided profiles, connections and member controls described below. Production authentication, a controlled domain, live email activation and operational release work remain pending; see [release status](RELEASE_READINESS.md).

Public URL: [FirstSignal](https://firstsignal-founder-network.divineridge.chatgpt.site). Reuse this existing Site for future updates. FirstSignal remains a working brand name, not a cleared trademark.

## Product routes and design

`/` is the marketing page; `/app` is the workspace. `/signin`, `/signup` and `/signout` use Clerk. `/privacy` describes current visibility and controls. Research documents remain internal development context; there is no Research & insights product screen.

The selected design is the light lavender Stitch option C, with a generated logo, responsive application screens and a marketing page with three specialty cards and scroll effects. Reduced-motion and smaller-screen layouts disable nonessential rotation and sticky effects. Marketing photographs are stock images, not member endorsements; sources are in [MARKETING_ASSETS.md](MARKETING_ASSETS.md).

## Implemented workflows

The marketing hero includes an interactive fictional evidence brief with Learning, Open questions and Next test views. It separates reported interviews, planned prototype use and untested paid use; exposes source/date/limitations; and gives a proposed test with a measurement and decision criterion. The example is unverified and saves nothing. External Strategyzer references explain the method without implying endorsement. Founder/progress worksheets now include source context, participant selection, measurements and criteria set before testing. This is a marketing demonstration and writing aid, not a new member verification service or a structured experiment database.

The marketing hero switches between founder and investor starting points. Role-specific entry links preserve the preference through existing Clerk sign-in/sign-up redirects. After a successful workspace load, a missing profile opens an empty private editor; an existing profile is offered for explicit resume. The preference is consumed from the URL and does not assign account permissions or overwrite saved information. Failed workspace loads retain it for retry, and members can choose another role.

The public Templates section provides original founder brief, progress update and investor preference worksheets. Preview, copy and Markdown downloads work without an account. Guided-form links preserve template/role intent; they never import fictional observations or save automatically. The progress template opens a blank composer for an existing founder, or starts founder setup first. Progress still follows profile visibility and requires explicit consent.

Template downloads are served at `/templates/founder-brief`, `/templates/progress-update` and `/templates/investor-preferences`. Unknown templates return 404. No database migration or authentication-provider change was needed for this update. Real pilot testimonials, outcome statistics and marketing analytics are not implemented by these changes.

| Workflow | Current behaviour |
| --- | --- |
| Account and role | Clerk sign-in/sign-up/sign-out. New members choose founder or investor, or explore first. An account may save one profile of each type; signing up alone does not assign an investment role. |
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

- One founder and one investor profile per account; newest 200 eligible public listings in discovery.
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

Schema lives in `db/schema.ts`; SQL migrations live in `drizzle/`. Keep applied migrations immutable. A fresh local database needs all three migrations in order:

```powershell
node node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_majestic_ender_wiggin.sql
node node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_whole_king_bedlam.sql
node node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_glossy_cable.sql
```

Migration `0002_glossy_cable.sql` adds progress updates, member blocks/reports and private connection next steps. On an existing local database with `0000` and `0001` already applied, run only `0002`. These commands target local state; never substitute a live database or reset one to initialize development. Sites deployment owns the current live D1 binding and migration workflow.

## Verification and remaining work

Release validation: 204 authenticated local workflow checks passed with verified Clerk development sessions. Profile-fit (12), suggestion (28), notification-provider mocks and the 202-profile D1 parameter/message bounds check passed. Founder and investor forms, range validation, consent and 390px/320px layouts were checked in the browser. TypeScript and the production build pass. [README.md](README.md) lists the type check, profile logic, notification-provider mock, build and authenticated workflow commands. The authenticated script creates and cleans up temporary users in the configured development Clerk instance, uses local D1 and rejects a non-loopback test origin. Local QA data stays in ignored `.wrangler/state` and is not deployed.

Passing local checks does not establish production OAuth behaviour, complete WCAG conformance, an independent security audit or field performance. Before a full production launch, activate production Clerk/domain settings, test real opted-in email delivery, establish support/deletion and manual report handling, add monitoring/alerts and verify backup/restore. There is no report administration UI, automatic moderation, background email retry scheduler or delivery webhook yet.

See [Clerk setup](cloudflare/CLERK_SETUP.md), [email activation](EMAIL_SETUP.md) and [release requirements](RELEASE_READINESS.md). Keep the actual financing operating model and advertised claims aligned with the scope assessed in the workspace's success plan.

## Marketing page update — 9 October 2026

The light marketing page now includes a four-step interactive product walkthrough, separate founder and investor sections, stock photographs with visible credits, privacy/consent explanations and expanded FAQs. Founder and investor anchors have distinct vertical destinations; native anchor navigation, sticky-header offsets and active navigation feedback replace the previous ambiguous shared-row destination. Manrope is self-hosted under the SIL Open Font License.

The walkthrough uses explicitly fictional data and local React state only. Its visibility toggle, stage comparison and counteroffer preview do not save records, send proposals or contact members. Its tabs support arrow keys, Home/End and one keyboard tab stop. The real workspace entry remains linked separately. This marketing update does not change account APIs, D1 schema, auth configuration or email activation.
