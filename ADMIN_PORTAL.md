# FindIn owner portal

The dedicated `/admin/signin` page opens the `/admin` operator workspace for one configured Clerk account. It uses the existing Clerk authentication service, with a fixed admin return destination and no admin signup or signup-transfer flow. The owner can sign in without creating a founder/investor profile. A different signed-in account is offered Switch account; admin logout returns to the admin sign-in page while member logout retains its ordinary destination.

The page and every API request enforce the configured immutable owner identity on the server. A hidden link, profile role, email, browser flag or Clerk user-editable metadata cannot grant access. An empty or invalid owner configuration denies everyone. A separate login entry is a dedicated administrative experience; it does not introduce a second password store or bypass Clerk verification.

## What works

- Overview: database counts for profiles, reports, introduction states and notification states. Counts describe stored records, not verified businesses, funding or delivered email.
- Reports: search and filter submitted concerns; record New, In review, Resolved or Dismissed with an operator note. Reports remain allegations until reviewed. Connection reports link to a currently listed profile when one exists; private conversation content is never loaded.
- Listings: search and filter founder ideas/investor profiles by Visible or Removed status, then inspect the actual listed ideology, solution, learning, next step and up to 20 recent public progress updates. Remove an unsuitable listing from discovery/direct public access or restore it after review. A confirmation requires a reason, with editable starting points for spam, misleading information, harmful content, privacy and duplicate listings. The reason is visible to the profile owner. Restriction records for profiles later unlisted by their owners remain operable with all draft fields and updates redacted.
- Activity: searchable history of operator identity, target, action, previous/next state, reason and timestamp.
- Settings: read-only configuration presence for owner access, Clerk mode, origin and email settings. No secrets are returned. Configured credentials do not prove successful email delivery or production OAuth.

Reports link to an in-portal listing review; the operator can return to the report with the unsaved review note preserved in that tab. Completing a listing action does not silently resolve a report. The dashboard provides direct shortcuts to new reports, visible founder ideas and removed listings. Search, type/visibility filters and the current page survive successful mutations; an out-of-range page is clamped after refresh.

The admin portal does not show private draft contents, saved lists, private messages, proposal terms, follow-up notes or member email addresses. Submitted report details are visible to the operator. Listing moderation reasons are also visible to the affected profile owner; review notes stay in the operator record. Removal retains the account/profile and is reversible. The portal does not permanently delete accounts or ideas, grant roles, send messages or execute investments. No review-request/appeal submission or automatic moderation is advertised as implemented.

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

The owner supplied their sign-in email and the existing verified primary-email account was resolved successfully. The exact account ID is now bound in ignored local configuration. Sites access was recovered on 18 October 2026 and the resolved immutable account ID is now also configured as a secret in hosted environment revision 2. The saved version must be deployed to activate that environment revision. There is no first-user bootstrap route, shared admin password or login bypass.

## Storage and concurrency

Migration `drizzle/0003_owner_portal.sql` adds versioned report review fields, `profile_moderation` and `admin_audit`. Applied migrations remain unchanged. Apply this migration before serving the new workspace queries; the new app expects those tables. For an existing **local** database that already has migrations 0000–0002:

```powershell
node node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_owner_portal.sql
```

Run after the production build has emitted the local Wrangler config. Never rerun an applied `ALTER TABLE` migration, reset a database, or replace `--local` with `--remote` as part of local setup. Fresh databases need all four migrations in order. The hosted Site's managed D1 and the owner's separate direct Cloudflare D1 remain distinct.

Hiding a listing sets a separate moderation restriction. It does not overwrite the owner's sharing choice or delete data. Server discovery, direct links, saved-profile reads and new saves/requests respect the restriction. The owner can still edit their own profile; publishing again cannot clear the restriction. Existing accepted conversations remain available to their participants. Restoring an owner-unlisted profile lifts the restriction but leaves it private.

Writes require the expected record version. Concurrent/stale updates return 409. D1 transactional batches bind the mutation and audit event to a unique operation marker; failed logging rolls back the change. There is no edit/delete audit API. API reads are bounded to 25 records per page, text searches are parameterized, bodies are streamed with an 8 KB limit, and writes require same-origin JSON. Responses are not cached.

The listing detail endpoint is `GET /api/admin?view=profile&profileId=...`. It returns only explicitly selected public fields, bounded to 1,500 characters each for ideology/solution/learning and 1,000 for the next step; up to 20 real progress records have bounded title/body lengths. It returns404 for unrelated private/unlisted drafts and fixed redacted content for an owner-unlisted restriction. Malformed legacy JSON and non-text shapes cannot expose raw JSON. Listing pagination uses optional `kind=all|startup|investor` and `visibility=all|visible|removed` filters. This enhancement adds no database migration; the earlier 0003 remains required for initial portal activation.

## Research behind the workflow

Reviewed official product documentation on 18 October 2026, without claiming authenticated visual inspection of those products:

- [Shopify permissions](https://help.shopify.com/en/manual/your-account/users/roles/permissions): tasks are limited by explicit permissions. FindIn currently uses one server-configured owner, with no client-selected administrator role.
- [Shopify admin activity logs](https://help.shopify.com/en/manual/shopify-admin/activity-logs): record which actor changed what and when. FindIn keeps reasoned, transactional removal/restoration/report-review history.
- [Discourse content moderation guide](https://meta.discourse.org/t/discourse-moderation-guide-part-3-managing-content/406266): review reported material in context, then act and restore when appropriate. FindIn loads actual listed idea content before offering removal, keeps report review separate and makes the removal reversible.
- [Clerk React SignIn](https://clerk.com/docs/react/reference/components/authentication/sign-in): documented destination and signup-transfer controls support the dedicated admin entry while retaining the established identity provider.

These are adaptations to FindIn's current scope, not copies of competitor dashboards or a claim of equivalent security/capabilities. Account suspension, staff invitations, unrestricted private-data inspection and permanent deletion are not part of this implementation.

## Verification and activation limits

`node scripts/verify-admin.mjs` runs the actual API/service/SQL against isolated SQLite with per-request authentication. All 157 assertions pass, covering unauthorized/missing-owner denial before database access, body/origin/schema bounds, private-data canaries, real listing detail/progress bounds, kind/visibility filters, removal enforcement, owner edit attempts, report details and connection targets, pagination/literal search, stale writes/concurrency and atomic audit rollback. Its expected simulated audit failure logs a failure before confirming rollback. No real member data or account is changed.

`node scripts/verify-admin-entry.mjs` passes 17 checks of the actual entry-page guards and provider props with isolated identities, including anonymous/member denial, exact-owner entry, missing/invalid configuration, fixed destination, signup-transfer prevention and independent logout destinations. These tests do not create real sessions or prove hosted OAuth. TypeScript, production build, CSS parsing and scoped lint pass (zero errors, two native-image advisories). Built local Worker HTTP checks confirm `/admin/signin`200 with noindex/no-store, `/admin` redirect to that entry, anonymous admin API 401 and updated privacy/marketing routes. Browser automation reports disabled in Work settings; no fresh rendered screenshot or manual interaction result is available.

The checked local build includes `/admin` and `/api/admin`. Browser control is disabled in Work settings, so actual admin visual reflow, keyboard focus, dialogs and interaction feel still need browser verification. Source review, server-rendered component checks and API tests do not establish full accessibility or real-user performance.

An earlier Sites project-not-found error blocked publication. Access was recovered on 18 October 2026; use the existing source helper and deployment flow. Sites applies pending hosted migrations before uploading the new Worker. Check the native deployment result for activation status. Preserve project `appgprj_6ac748417858819180e292b8c8899e62`, its public audience and existing D1; do not create a replacement Site or migrate data implicitly.

Production Clerk/domain setup, email activation, support/deletion handling, monitoring and tested backup/restore still remain launch work.

## Published admin release — 18 October 2026

Published successfully as version28 on the existing public FindIn site, with hosted owner secret environment revision2 and the pending admin schema migration applied by the Sites deployment flow. Source: d7da3ed1cbb3c199ad7b2fb2b3863fe064fec368. Deployment: appgdep_6ad4e18e05408191acdca1bd7229f4bc. Admin entry: https://firstsignal-founder-network.divineridge.chatgpt.site/admin/signin . Earlier project-not-found and unpublished notes describe the recovered blocker, not the current release.

Live HTTP checks confirm admin sign-in200, anonymous admin redirect to its dedicated entry, admin API401/no-store and working workspace queries. Both new marketing artworks return200 with bytes matching the checked source files. Full owner OAuth and browser visual/interaction QA remain unverified because browser automation is disabled in Work settings. No real member moderation or account changes were used for testing.

Static-asset header limit: public/_headers declares correct WebP/WOFF2 types and retains content-hashed caching rules, but Sites still returns application/octet-stream for these media types after deployment. Contents match their originals; do not claim the hosted MIME header is corrected. This remains a platform delivery limitation.
