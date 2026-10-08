# FirstSignal

A founder–investor discovery platform for early startup ideas. Built with React, Vinext, Clerk authentication and Cloudflare D1.

## Features

- Founder and investor profiles, discovery, saved opportunities and explainable profile matching.
- Mutual-consent introductions and private messaging.
- Private, non-binding INR bids, counteroffers, decisions and versioned negotiation history.
- In-app notifications and optional verified-email notifications through Resend.
- Responsive marketing pages and reduced-motion support.

Sample profiles are labelled. This pilot does not process investments, payments or binding agreements. Email sending requires separate provider configuration. Production Clerk/domain activation and operational work remain pending; see [release status](RELEASE_READINESS.md).

## Local setup

Requires Node.js 22.13 or later. Clean clones use the portable execution profile.

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local` and fill in your own Clerk development keys. Set the origin to `http://127.0.0.1:5173`.
3. Run `npm run build` to generate the local Worker configuration.
4. Initialize the local database with both migration commands below.
5. Run `npm run dev` and open the printed loopback URL.

```sh
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_majestic_ender_wiggin.sql
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_whole_king_bedlam.sql
```

Run these initialization commands only on a fresh local database. They never initialize the live database.

## Validation

```sh
npx tsc --noEmit
node scripts/verify-profile-fit.mjs
node scripts/verify-notifications.mjs
npm run build
```

For authenticated workflow checks, start the local server and run `scripts/verify-clerk-workflows.mjs` with `TEST_ORIGIN=http://127.0.0.1:5173`. It creates and deletes temporary users in your Clerk development application and writes only to local D1. Use development keys.

## Hosting and data

The current public deployment uses Sites-managed Cloudflare D1. `.openai/hosting.json` identifies this existing Site; it is not a credential or an automatic deployment setup for a new GitHub clone. Uploading source to GitHub does not deploy the website or transfer its database. Direct Cloudflare hosting requires a separate Worker deployment configuration, production secrets and D1 binding. The owner's separate Cloudflare database is not the live Sites database.

See [email setup](EMAIL_SETUP.md), [Clerk setup](cloudflare/CLERK_SETUP.md) and [photo credits](MARKETING_ASSETS.md). Source includes framework/vendor notices; no open-source license has been selected for the application.

## GitHub upload

Upload the application source, assets, lockfile, migrations and documentation. Never upload `.env.local`, `node_modules`, `.git`, `.wrangler`, `.sites-runtime`, `dist` or database files. The prepared source ZIP excludes these. Git's ignore rules do not protect files dragged into GitHub's browser upload, so use the ZIP contents rather than the whole workspace folder.
