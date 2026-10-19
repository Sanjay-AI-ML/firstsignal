# FindIn

A founder–investor discovery platform for early startup ideas. Built with React, Vinext, Clerk authentication and Cloudflare D1.

Admin entry: [FindIn administration](https://firstsignal-founder-network.divineridge.chatgpt.site/admin/signin). Access remains restricted to the configured owner. The portal and marketing illustrations are published. See [release verification and limits](ADMIN_PORTAL.md#published-admin-release--18-october-2026).

## Features

- All startup industries, with broad sector choices and an Other field for a named custom sector or service. Custom sectors are saved, displayed and searchable; investors can add a custom interest alongside listed sectors. Existing SaaS categories retain their meaning.

- Multiple independent ideas per founder, with Add/Edit/Preview, per-idea progress and sharing, meaningful category icons and idea-specific introductions. See [implementation and verification](MULTIPLE_IDEAS_2026-10-19.md).
- Per-idea Test & learn: private planning prompts, a fixed plan once started, recorded observations and decisions, and explicit sharing of completed founder-reported learnings. See [research and verification](TEST_AND_LEARN_2026-10-19.md).
- Guided founder and investor forms, completion checklists and private/public sharing controls.
- Discovery, saved opportunities and explainable suggestions using stated sector, stage and check-size preferences.
- Mutual-consent introductions, private messaging and a connections dashboard with private follow-up notes/dates.
- Private, non-binding INR bids, counteroffers, decisions and versioned negotiation history.
- Dated founder progress updates and a recent-progress feed for saved real startups.
- Profile reporting and account blocking with server-enforced contact restrictions.
- In-app notifications and optional verified-email notifications through Resend.
- Responsive marketing pages and reduced-motion support.
- A chapter-based marketing journey with native section navigation, persistent pause controls, framed image transitions and a fictional Test & learn walkthrough. See [scroll research and verification](SCROLL_COMPLETION_2026-10-19.md).
- Dedicated owner admin sign-in, reported-content review, searchable founder/investor listings, reversible removal/restoration and an activity log. See [admin access and setup](ADMIN_PORTAL.md).
- An interactive fictional evidence brief distinguishing reported learning, open questions and a measurable next test; founder/progress worksheets include source and experiment-planning prompts.
- Founder/investor entry paths that preserve the selected setup through sign-in, plus three public starter worksheets with preview, copy and Markdown downloads.

Marketing templates are writing prompts, not imported fictional evidence. A new founder or investor entry opens an empty private form; an existing profile is offered for explicit resume. Progress-template entry opens a blank update composer on an existing founder profile, or starts founder setup first. Each account keeps its founder or investor role. Founders can create and manage multiple independent ideas; investors have one investment profile. Creation makes a new record, while edits target the exact ID and authenticated owner. The server atomically rejects a new opposite role, including simultaneous requests. Older accounts that already have both profiles retain access to edit them. Marketing entry links cannot create a second role. No template action saves or publishes a record by itself.

Sample profiles are labelled, and real member claims/updates are self-reported. This pilot does not process investments, payments or binding agreements. Follow-up dates do not send reminders, progress updates do not broadcast emails, and submitted reports require manual operator handling. Production Clerk/domain activation, live email configuration and operational work remain pending; see [release status](RELEASE_READINESS.md).

## Local setup

Requires Node.js 22.13 or later. Clean clones use the portable execution profile.

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local` and fill in your own Clerk development keys. Set the origin to `http://127.0.0.1:5173`.
3. Run `npm run build` to generate the local Worker configuration.
4. Initialize a fresh local database with all six migration commands below, in order.
5. Run `npm run dev` and open the printed loopback URL.

```sh
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_majestic_ender_wiggin.sql
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_whole_king_bedlam.sql
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_glossy_cable.sql
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_owner_portal.sql
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0004_multiple_founder_ideas.sql
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0005_test_and_learn.sql
```

Run all six initialization commands only on a fresh local database. For an existing local database, check which migrations have been applied and run only the missing ones in order; never rerun an applied `ALTER TABLE` migration. These commands never initialize the live database. [HANDOFF.md](HANDOFF.md) also gives direct Node.js entrypoints for this Windows host.

## Validation

```sh
npx tsc --noEmit
node scripts/verify-profile-fit.mjs
node scripts/verify-profile-suggestions.mjs
node scripts/verify-workspace-bounds.mjs
node scripts/verify-notifications.mjs
node scripts/verify-admin.mjs
node scripts/verify-admin-entry.mjs
node scripts/verify-multiple-ideas.mjs
node scripts/verify-experiments.mjs
npm run build
```

For authenticated workflow checks, start the local server and run `scripts/verify-clerk-workflows.mjs` with `TEST_ORIGIN=http://127.0.0.1:5173`. It creates and deletes temporary users in your Clerk development application and writes only to local D1. Use development keys.

## Hosting and data

The current public deployment uses Sites-managed Cloudflare D1. `.openai/hosting.json` identifies this existing Site; it is not a credential or an automatic deployment setup for a new GitHub clone. Uploading source to GitHub does not deploy the website or transfer its database. Direct Cloudflare hosting requires a separate Worker deployment configuration, production secrets and D1 binding. The owner's separate Cloudflare database is not the live Sites database.

See [email setup](EMAIL_SETUP.md), [Clerk setup](cloudflare/CLERK_SETUP.md) and [photo credits](MARKETING_ASSETS.md). Source includes framework/vendor notices; no open-source license has been selected for the application.

## GitHub upload

Upload the application source, assets, lockfile, migrations and documentation. Never upload `.env.local`, `node_modules`, `.git`, `.wrangler`, `.sites-runtime`, `dist` or database files. The prepared source ZIP excludes these. Git's ignore rules do not protect files dragged into GitHub's browser upload, so use the ZIP contents rather than the whole workspace folder.


## Owner portal and V2 visual update

`/admin/signin` is the dedicated sign-in entry for `/admin`, a server-protected operator portal for one configured existing Clerk user. It provides real aggregate status, report review, filtered founder/investor listings, listed-idea/progress inspection, reversible removal/restoration and an audit history. Private drafts, messages, proposals and follow-up notes are excluded. Missing owner configuration denies everyone. See [ADMIN_PORTAL.md](ADMIN_PORTAL.md) before activating or deploying this update.

The app now requires migration `0003_owner_portal.sql` in addition to the previous three migrations. Apply only unapplied migrations in order; do not reset existing data. This task applied 0003 to the existing local database only. Sites access was recovered on 18 October 2026 and hosted owner identity is configured securely. The existing Sites deployment flow applies pending migrations before Worker upload; confirm the resulting native deployment status.

```powershell
node scripts/verify-admin.mjs
node scripts/configure-admin.mjs --email your-sign-in-email --write-local
```

The second command is setup, not a test: it requires the owner's explicitly identified verified primary email and existing local Clerk secret, and writes only the ignored local ID binding. Hosting needs the same binding configured securely. See [DESIGN_V2_REVIEW.md](DESIGN_V2_REVIEW.md) for research, assets and honest visual-verification limits.
