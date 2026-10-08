# FirstSignal pilot

Current release: public Clerk authentication trial. See `RELEASE_READINESS.md` for the copy cleanup, session/error handling, security headers, and remaining production activation work. Historical ChatGPT/private-access notes below do not describe the current release.

Built 8 October 2026 from the project success plan and design research. FirstSignal is a working-name choice, not a cleared trademark.

## Working features

- Startup and investor discovery, text search, sector/stage filters, member-only filter, sorting, and evidence-detail panels.
- Nine explicitly fictional examples: six startups and three investor mandates. They are not real members, investment opportunities, or verified evidence.
- ChatGPT sign-in through Sites; account-scoped database records.
- Saved opportunities that survive sessions.
- One founder profile and one investor profile per account, editable as a private draft or a pilot listing.
- Separate evidence date and profile-save timestamp.
- Real member introduction requests, recipient acceptance/decline, sender withdrawal, and messages after acceptance.
- Fictional-profile practice notes saved privately without a recipient or messaging.
- Five source-linked research entries, four competitor comparisons, workflow explanation, and accurate pilot data disclosures.
- Responsive layouts, keyboard focus, skip link, accessible component primitives, and reduced-motion support.
- Optional browser agent tools for filtering and opening existing profiles. Neither contacts anyone.

## Access and scope

The deployed website starts owner-private. It is a reviewable pilot, not an open investor network. Sharing to additional members is a separate access decision. The code supports consent between distinct accounts once those accounts can access the site.

This version supports text evidence, not document uploads. It does not process investments, run bidding, send email notifications, independently verify claims, provide a public account system, or offer automated deletion. Establish the public operating model, privacy/support process, appropriate financing review, and real investor supply before widening the audience.

Pilot limits: one profile of each type per account; discovery returns the newest 200 listings; workspace returns the latest 100 introductions with up to 100 messages per conversation; up to 200 saves; up to 20 introduction requests per account per day. Account-owned profiles are fetched separately from discovery. Closed or existing requests cannot be recreated for the same target in this version.

## Validation completed

- TypeScript type check passed.
- Cloudflare-compatible production build passed.
- 48 local built-Worker assertions passed: authentication, origin rejection, consent validation, draft isolation, persistence, updates, duplicate prevention, recipient permissions, accepted messaging, third-account isolation, and fictional-note handling.
- Browser verification: search; evidence panel; founder draft form/save/preview; saving an opportunity; desktop discovery; mobile navigation; responsive discovery at 390 px and 320 px with no horizontal overflow.
- Browser agent tools: registration, valid inputs, visible state read-back, and intentional invalid-input failures verified.

These checks do not certify full WCAG conformance, a security audit, or real-user performance. Core Web Vitals need field measurement after real use. The cross-origin test was rejected by Vinext before application handling with a non-JSON 503 in the local built preview; the application also checks the origin before every write. Same-origin normal flows passed.

Local test records stay in ignored `.wrangler/state` and are not part of the deployment archive or production seed data.

## Development

From this directory, use Node 22.13+ and the existing npm lockfile:

```powershell
npm run dev
```

Open the exact URL printed by the server. Loopback preview simulates sign-in as the starter's Seedy account. It does not create a production account.

```powershell
node node_modules/typescript/bin/tsc --noEmit
npm run build
```

Schema lives in `db/schema.ts`; checked migrations live in `drizzle/`. Keep applied migrations immutable. The Sites hosting manifest owns the real D1 binding; no credentials belong in source.

For a fresh local database, build first, then apply the migration:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_majestic_ender_wiggin.sql
```

The API test script uses test identity headers against the **local built Worker only**, where the real dispatcher is absent. Production identity headers are trusted only because the Sites dispatcher authenticates access and forwards them. Do not expose the bare Worker directly as a public server without a trusted identity boundary.

```powershell
npm start -- --port 8787
node scripts/verify-workflows.mjs
```

On this host the Sites npm wrappers failed before installing/building. The unchanged npm installer and build script succeeded through direct JavaScript entrypoints. No dependency versions or lockfile inputs were changed to work around that.

## Clerk authentication update

The current implementation supersedes the historical ChatGPT authentication notes below. Clerk handles sign-in, sign-up, and sign-out. Server identity comes exclusively from verified Clerk sessions. Public sharing is requested by the owner for an authentication trial; the Clerk instance is still development, visibly labelled by Clerk. No production Clerk domain has been configured. Secrets are stored in ignored local environment files and Sites runtime settings, never the manifest. Existing ChatGPT account records are preserved under their old IDs and are not silently transferred to Clerk accounts.

For local workflow checks, run `node scripts/verify-clerk-workflows.mjs` with `TEST_ORIGIN` set to the local runtime. It obtains and cleans up temporary development Clerk accounts, then checks 48 account isolation, consent, validation, and persistence assertions. Use local D1 only. The old mock-auth script does not verify the current authentication implementation.

## Design choices

Marketing homepage added 8 October 2026 at `/`. Product workspace moved to `/app`; founder CTAs preserve `/app#profiles` through sign-in. Existing root workspace hashes and profile query links are redirected to the corresponding app destination after hydration. The app has an About FirstSignal link back home. Sign-in defaults to the app and its research link uses `/app#research`.

The light lavender homepage explains the product, founder/investor benefits, consent, sample data, and pilot access with native expandable FAQs. No invented results, testimonials, waitlist, or public onboarding are advertised. Existing owner-private Sites access is preserved, so the marketing homepage is not yet publicly accessible to anonymous visitors. TypeScript/build and 24 local auth assertions passed; browser founder entry, sample detail, FAQ, and mobile reflow were checked. Preview: `../design-options/marketing-homepage.png`.

Sign-out integration updated 8 October 2026: the visible Sign out link delegates to the native Sites route and returns to `/signin?signed_out=1`. Confirmation is rendered only when the server sees no authenticated user; an active session instead gets a retry action. Restored browser pages reload to check current identity. Expired writes clear private workspace state and return through sign-in with the current destination preserved. No native authentication endpoints are implemented by this app.

Validation: production build and TypeScript passed; 24 loopback mock-auth assertions and 48 local built-Worker workflow assertions passed. Browser sign-out and Back navigation showed an anonymous state. Screenshot: `../design-options/signout-fixed.png`. Hosted end-to-end authentication remains unverified because OpenAI's browser security verification blocked sign-in. Local tests do not establish hosted provider behavior.

Run `node scripts/verify-local-auth.mjs` against the development preview on port 5173 to check mock cookie expiry, safe redirects, confirmation accuracy, and anonymous API behavior. Use a separate `.wrangler/qa-community` persistence directory for the built-Worker tests, so concurrent preview and QA processes do not share database state.

Sign-in page added at `/signin`. Anonymous sign-in links now open this branded page, whose top-level Continue with ChatGPT link starts the dispatch-owned authentication flow. It preserves safe relative return paths; external and reserved sign-in destinations fall back to `/`. Signed-in visitors receive a Continue to workspace action. Local mock sign-in, return to Saved, signed-in state, external/loop redirect rejection, and mobile layout were checked. The production identity provider remains ChatGPT; no email/password or Google sign-in is claimed.

Updated 8 October 2026: the user selected Stitch option C. The working app now uses white/lavender surfaces, violet actions, top navigation, sector interests, founder evidence/milestone feed cards, and an investor-thesis rail. Mobile retains the existing accessible sidebar drawer. Existing persistence and consent workflows are preserved. A generated transparent logo is used in the header, mobile menu, and favicon; its brief is in `public/LOGO_BRIEF.md`. Generated Stitch match percentages, invented evidence, and policy claims were not imported.

The prior design described below is superseded by this selection.

Warm neutral surfaces, dark teal actions, editorial serif headings, and a compact application sidebar implement the saved research direction. System Segoe UI/Arial and Georgia fonts keep this version independent of external font services. The brand and sample logos use typography and simple geometry; no fabricated customer logos, testimonials, or funding metrics are displayed.
