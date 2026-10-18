# FindIn owner portal

The `/admin` route is an operator workspace for one configured Clerk account. The page and every API request enforce that identity on the server. A hidden link, profile role, email, browser flag or Clerk user-editable metadata cannot grant access. An empty or invalid owner configuration denies everyone.

## What works

- Overview: database counts for profiles, reports, introduction states and notification states. Counts describe stored records, not verified businesses, funding or delivered email.
- Reports: search and filter submitted concerns; record New, In review, Resolved or Dismissed with an operator note. Reports remain allegations until reviewed. Connection reports link to a currently listed profile when one exists; private conversation content is never loaded.
- Listings: search owner-listed profile summaries, temporarily hide a listing or lift a restriction, and record a reason. Restriction records for profiles later unlisted by their owners remain operable with all draft fields redacted.
- Activity: searchable history of operator identity, target, action, previous/next state, reason and timestamp.
- Settings: read-only configuration presence for owner access, Clerk mode, origin and email settings. No secrets are returned. Configured credentials do not prove successful email delivery or production OAuth.

The admin portal does not show private draft contents, saved lists, private messages, proposal terms, follow-up notes or member email addresses. Submitted report details are visible to the operator. Listing moderation reasons are also visible to the affected profile owner; review notes stay in the operator record. The portal does not delete accounts, grant roles, send messages or execute investments.

## Bind the owner's existing account

Use the existing FindIn Clerk instance. After the owner identifies their actual sign-in email, resolve that account through Clerk's backend:

```powershell
node scripts/configure-admin.mjs --email your-sign-in-email
```

The command requires the existing `CLERK_SECRET_KEY` in ignored `.env.local`, finds one account with the exact **verified primary email**, and prints its immutable raw `user_...` ID. It does not create an account or infer the owner from signup order. To write the local binding:

```powershell
node scripts/configure-admin.mjs --email your-sign-in-email --write-local
```

Set **`FINDIN_ADMIN_USER_ID`** to that exact raw ID in the existing Site's secure runtime environment and deploy the checked source. Do not put an email, a comma-separated list or a namespaced `clerk:` value in this setting. Never commit the actual binding or credentials. New Clerk production instances have different user IDs; bind the owner's production account explicitly when moving instances.

The current task has not bound an owner: the requested sign-in email is still pending. Access remains denied until this is supplied and configured. There is no first-user bootstrap route, shared admin password or login bypass.

## Storage and concurrency

Migration `drizzle/0003_owner_portal.sql` adds versioned report review fields, `profile_moderation` and `admin_audit`. Applied migrations remain unchanged. Apply this migration before serving the new workspace queries; the new app expects those tables. For an existing **local** database that already has migrations 0000–0002:

```powershell
node node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_owner_portal.sql
```

Run after the production build has emitted the local Wrangler config. Never rerun an applied `ALTER TABLE` migration, reset a database, or replace `--local` with `--remote` as part of local setup. Fresh databases need all four migrations in order. The hosted Site's managed D1 and the owner's separate direct Cloudflare D1 remain distinct.

Hiding a listing sets a separate moderation restriction. It does not overwrite the owner's sharing choice or delete data. Server discovery, direct links, saved-profile reads and new saves/requests respect the restriction. The owner can still edit their own profile; publishing again cannot clear the restriction. Existing accepted conversations remain available to their participants. Restoring an owner-unlisted profile lifts the restriction but leaves it private.

Writes require the expected record version. Concurrent/stale updates return 409. D1 transactional batches bind the mutation and audit event to a unique operation marker; failed logging rolls back the change. There is no edit/delete audit API. API reads are bounded to 25 records per page, text searches are parameterized, bodies are streamed with an 8 KB limit, and writes require same-origin JSON. Responses are not cached.

## Verification and activation limits

`node scripts/verify-admin.mjs` runs the actual API/service/SQL against isolated SQLite with per-request authentication. It covers unauthorized/missing-owner denial before database access, body/origin/schema bounds, private-data canaries, hidden listing enforcement, owner edit attempts, report details and connection targets, pagination/literal search, stale writes/concurrency and atomic audit rollback. No real member data or account is changed.

The checked local build includes `/admin` and `/api/admin`. Browser control is disabled in Work settings, so actual admin visual reflow, keyboard focus, dialogs and interaction feel still need browser verification. Source review, server-rendered component checks and API tests do not establish full accessibility or real-user performance.

Publication is also blocked: the current Sites connection reports the retained FindIn project as not found and lists no projects. Reconnect the account/workspace that owns the existing Site. Preserve project `appgprj_6ac748417858819180e292b8c8899e62`, its public audience and existing D1; do not create a replacement Site or migrate data implicitly.

Production Clerk/domain setup, email activation, support/deletion handling, monitoring and tested backup/restore still remain launch work.
