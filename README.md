# FirstSignal

A founder–investor discovery platform for early startup ideas. Built with React, Vinext, Clerk authentication and Cloudflare D1.

## Features

- Guided founder and investor profiles, completion checklists and private/public sharing controls.
- Discovery, saved opportunities and explainable suggestions using stated sector, stage and check-size preferences.
- Mutual-consent introductions, private messaging and a connections dashboard with private follow-up notes/dates.
- Private, non-binding INR bids, counteroffers, decisions and versioned negotiation history.
- Dated founder progress updates and a recent-progress feed for saved real startups.
- Profile reporting and account blocking with server-enforced contact restrictions.
- In-app notifications and optional verified-email notifications through Resend.
- Responsive marketing pages and reduced-motion support.
- Founder/investor entry paths that preserve the selected setup through sign-in, plus three public starter worksheets with preview, copy and Markdown downloads.

Marketing templates are writing prompts, not imported fictional evidence. A new founder or investor entry opens an empty private form; an existing profile is offered for explicit resume. Progress-template entry opens a blank update composer on an existing founder profile, or starts founder setup first. The account can still hold both roles. No template action saves or publishes a record by itself.

Sample profiles are labelled, and real member claims/updates are self-reported. This pilot does not process investments, payments or binding agreements. Follow-up dates do not send reminders, progress updates do not broadcast emails, and submitted reports require manual operator handling. Production Clerk/domain activation, live email configuration and operational work remain pending; see [release status](RELEASE_READINESS.md).

## Local setup

Requires Node.js 22.13 or later. Clean clones use the portable execution profile.

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local` and fill in your own Clerk development keys. Set the origin to `http://127.0.0.1:5173`.
3. Run `npm run build` to generate the local Worker configuration.
4. Initialize a fresh local database with all three migration commands below, in order.
5. Run `npm run dev` and open the printed loopback URL.

```sh
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_majestic_ender_wiggin.sql
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_whole_king_bedlam.sql
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_glossy_cable.sql
```

Run all three initialization commands only on a fresh local database. For an existing local database with the first two migrations applied, run only `0002`. These commands never initialize the live database. [HANDOFF.md](HANDOFF.md) also gives direct Node.js entrypoints for this Windows host.

## Validation

```sh
npx tsc --noEmit
node scripts/verify-profile-fit.mjs
node scripts/verify-profile-suggestions.mjs
node scripts/verify-workspace-bounds.mjs
node scripts/verify-notifications.mjs
npm run build
```

For authenticated workflow checks, start the local server and run `scripts/verify-clerk-workflows.mjs` with `TEST_ORIGIN=http://127.0.0.1:5173`. It creates and deletes temporary users in your Clerk development application and writes only to local D1. Use development keys.

## Hosting and data

The current public deployment uses Sites-managed Cloudflare D1. `.openai/hosting.json` identifies this existing Site; it is not a credential or an automatic deployment setup for a new GitHub clone. Uploading source to GitHub does not deploy the website or transfer its database. Direct Cloudflare hosting requires a separate Worker deployment configuration, production secrets and D1 binding. The owner's separate Cloudflare database is not the live Sites database.

See [email setup](EMAIL_SETUP.md), [Clerk setup](cloudflare/CLERK_SETUP.md) and [photo credits](MARKETING_ASSETS.md). Source includes framework/vendor notices; no open-source license has been selected for the application.

## GitHub upload

Upload the application source, assets, lockfile, migrations and documentation. Never upload `.env.local`, `node_modules`, `.git`, `.wrangler`, `.sites-runtime`, `dist` or database files. The prepared source ZIP excludes these. Git's ignore rules do not protect files dragged into GitHub's browser upload, so use the ZIP contents rather than the whole workspace folder.
