# FindIn production launch checklist

Checked 19 October 2026. Scope: founder/investor discovery, multiple founder ideas, private introductions and discussions, progress and learning records, owner moderation, and opt-in transactional email. A public URL and a successful build are not sufficient launch evidence.

## Current facts

- The existing Site is accessible again and the current account is its owner. It serves **version 32** at the existing FindIn URL. No replacement Site is needed.
- Its runtime still uses a **Clerk development publishable key**. The origin and owner binding are present; their presence is not production-authentication certification.
- **No custom domain is attached. No Resend sender/API-key, webhook secret or email-dispatch secret is configured in that runtime.** Product email cannot be activated yet.
- The live `DB` binding has the existing application/admin/connection tables. It has **no `idea_experiments` or durable email tables**, so the new source's pending migrations must be reviewed before release.
- GitHub has the audited source; pushing GitHub does not update the hosted website or its database.
- Browser access recovered briefly for local notification checks, then became disabled again. The owner deferred reconnecting and sending the checklist email. Final browser checks must be recorded against the actual tested source and production origin; earlier access observations are historical.

## Required before opening a public production service

Unchecked boxes are still open. “Code available” means it must also be configured, deployed and verified where appropriate.

| Gate | Remaining work | Evidence needed to close it | Responsibility |
| --- | --- | --- | --- |
| 1. Domain and hosting | Choose an owned domain, attach it to the existing Site, verify DNS/TLS and the canonical HTTPS origin. Decide explicitly before moving from Sites to the separate Cloudflare account. | Real domain loads securely; intended redirects and callback origins work. Exact live Worker/DB identities recorded. | Owner chooses/claims domain; configuration can then be completed. |
| 2. Production authentication | Activate Clerk production, verify its DNS, configure the final origin and production keys together, configure your own Google OAuth credentials and callback URLs, and review account/session policies. | Production signup, email verification, Google sign-in, sign-out, reload, expiry and anonymous rejection pass on the real origin. | Owner's domain/Clerk/Google account access required. |
| 3. Existing account continuity | Choose a clean launch or a reviewed migration from development Clerk users. Production and development user IDs differ. Update the exact owner admin ID. | Existing approved records stay with their rightful account; another account cannot claim them. Admin allow/deny checks pass. Never transfer ownership by matching email alone. | Owner decision plus implementation and migration review. |
| 4. Release the checked source | Keep the current Site identity/audience. Apply only pending reviewed migrations, retain the release commit and migration receipt, publish the matching built artifact and smoke-test it. | Hosted version and source match; old rows remain; latest multiple-idea, learning, privacy and email paths pass. Rollback plan is recorded. | Release work after the launch gates are ready. |
| 5. Email activation | Verify an owned sender domain in Resend; configure SPF/DKIM and DMARC, a domain-restricted sending key, `EMAIL_FROM`, the actual app origin, signed delivery webhooks and the protected retry dispatcher. | A consenting real recipient receives an invitation/update; provider events reach the signed endpoint; scheduled retries work with the browser closed. See the email checklist below. | Domain/Resend account configuration plus deployment. |
| 6. Security and abuse | Review all endpoints for exact ownership, roles, origin/type validation and bounded streaming request bodies. Add appropriate account/edge abuse controls for costly routes; validate hosted CSP/embedding policy. Protect the owner account with MFA and recovery access. | Cross-account/draft/admin denial, blocks, malicious input and burst checks pass on the deployed configuration. Current isolate-only throttling is not treated as a distributed security boundary. | Code and hosting configuration; owner MFA. |
| 7. Functional and accessibility QA | Run actual browser journeys for both roles, multiple ideas, private/public updates, learning sharing, saves, introductions, messages, proposals/counteroffers, errors, moderation and notifications. Check phones, keyboard/focus, zoom and reduced motion. | No data loss, cross-idea state, inaccessible controls, horizontal overflow or misleading saved/sent states. Test at 320px and 390px plus desktop; production OAuth is tested separately. | Browser checks plus owner-assisted production-account tests. |
| 8. Performance and capacity | Measure actual load/interaction, the large profile/progress response, slow networks and expected pilot concurrency. Provide access to conversations older than the latest 100. Investigate intermittent local runtime stalls/restarts and verify unknown-route/404 behavior on the final host; a latest local404 was fast, but the HTTP run also had a restart response and a stalled privacy request. | Recorded response sizes/timings, sensible loading/error states and usable history at the chosen pilot limits. Measure Core Web Vitals; do not infer them from a build. | Implementation and measured QA. |
| 9. Automated release checks | Put clean-clone install, type checking, meaningful regressions and build in CI. Resolve the known hook/lint findings or document a narrow reviewed baseline with no newly introduced failures. Review dependencies and protect the release branch. | A clean CI run for the exact commit; no secrets, QA fixtures or database files in the release. | Code/repository setup. |
| 10. Monitoring and incident response | Enable redacted application/request logs, error alerts, uptime checks and notification queue/failure alerts. Define who responds, how to pause sending and how to roll back. | A test failure reaches the responsible operator; logs do not contain credentials, private message bodies or full recipient data. | Hosting/monitor configuration and named operator. |
| 11. Backups and recovery | Confirm recovery controls for the actual Sites-managed live DB, take a protected release backup/bookmark and rehearse restore/import into an isolated database. Keep schema changes compatible with rollback. | A documented successful isolated recovery with checked row relationships and private data access. A Worker rollback alone does not restore D1 data. | Operator with actual database/recovery access. |
| 12. Support, privacy and operating terms | Choose a public support/privacy contact; publish accurate visibility, email, retention and deletion-request procedures and operating terms for this discovery/discussion scope. Arrange professional review of relevant fundraising/data requirements. Decide moderation response and escalation procedures. | The contact works; an access/deletion request can be fulfilled safely across Clerk and app data while preserving justified safety/audit retention; reports can be reviewed and appealed. | Owner/operator decisions plus reviewed documentation. |

Automated account erasure is not required as a UI feature if there is a working, accurate request-handling process. The current unsafe wipe action remains disabled. Never promise complete deletion while retaining a reusable account or silently removing other members' safety records.

## Product email checklist

These alerts cover invitations, responses, messages and proposal/counteroffer updates. They do not include campaigns, bulk pitches, automatic progress broadcasts or scheduled financial reports.

- [ ] Confirm a sender address such as `FindIn <updates@notify.your-domain>` and a monitored reply/support arrangement. The address is an example, not a chosen domain.
- [ ] Add Resend's exact domain-verification records, wait for verified status and check SPF/DKIM alignment. Configure and review DMARC for legitimate senders.
- [ ] Store a restricted `RESEND_API_KEY`, `EMAIL_FROM`, `RESEND_WEBHOOK_SECRET` and strong `NOTIFICATION_DISPATCH_SECRET` as runtime secrets/configuration. Set the actual HTTPS `FIRSTSIGNAL_ORIGIN`. Never paste secrets into a chat or commit them.
- [ ] Apply the additive email migration to the intended database only after reviewing its local tests and release backup.
- [ ] Register the Resend webhook URL and event types described in `EMAIL_SETUP.md`. Validate raw-body signatures, timestamps, duplicate/out-of-order events and safe failure responses.
- [ ] Deploy/configure the five-minute dispatcher separately and verify it calls only the intended HTTPS app origin using its shared secret. Protect the endpoint; do not use a browser session or a publicly callable unauthenticated job.
- [ ] Keep opt-in separate from account/profile verification. Recheck the current verified primary address before sending. Never redirect an old queued message to a newly changed address without renewed consent.
- [ ] Test opt-out, unverified/changed addresses, blocks, unavailable accounts and bounce/complaint suppression. In-app notices remain available when email is off.
- [ ] Test timeouts, rate limits and provider failures; confirm retries survive a restart and reuse the same frozen payload/idempotency key. Stop retrying before the provider's idempotency window ends.
- [ ] Show queued, submitted, delivered, delayed and failed/suppressed states accurately. “Delivered” means acceptance by the recipient's mail server, not proof of inbox placement or reading.
- [ ] Run one real, consented end-to-end test and record its provider receipt/webhook outcome. A mocked provider test does not close this gate.
- [ ] Agree a pilot sending limit, queue/backlog alert threshold and retention policy. Check actual processing capacity before increasing signups.

## Useful improvements after the first production release

Live ecosystem feeds, an editable pitch generator, a confidential document room, legally signed NDAs, shared syndicate workspaces, payment execution and investment scoring are **not launch requirements for the scope above**. Keep them absent from product promises until separately designed, implemented and verified. Local planning worksheets can launch as clearly labelled scenarios.

The new learning/updates presence filter is session-only; sharing a search does not currently include it. Improve that behavior before describing every filter as restorable/shareable.

## Recommended order

1. Claim the domain and make the Clerk account-continuity decision.
2. Configure production authentication and verified email infrastructure; finish the security, policy and recovery work in parallel.
3. Deploy the checked code/migrations to the retained target, with a protected small pilot and actual authentication/email checks.
4. Close functional, browser, performance, abuse and operations gates, then open broader signup at measured capacity.

No fixed launch date or production-ready percentage is claimed. The remaining code, account configuration and external verification have different owners and dependencies.

## Official references

- [Clerk production checklist](https://clerk.com/docs/guides/development/deployment/production) and [development/production isolation](https://clerk.com/docs/guides/development/managing-environments).
- [Resend domains](https://resend.com/docs/add-a-domain), [DMARC](https://resend.com/docs/dashboard/domains/dmarc), [restricted API keys](https://resend.com/docs/dashboard/api-keys/introduction), [send idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests), [event meanings](https://resend.com/docs/webhooks/event-types) and [webhook retries](https://resend.com/docs/webhooks/retries-and-replays).
- [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [export/import](https://developers.cloudflare.com/d1/best-practices/import-export-data/), [Worker rollback limits](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/) and [Workers logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/).

As checked, D1 Time Travel retention is seven days on Free and thirty days on Paid; confirm access for the database actually serving the app. Longer/independent retention needs a separate protected backup process.
