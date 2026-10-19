# Connection notification implementation and checks

19 October 2026. This is a code/GitHub handoff, not a hosted release or real email-delivery receipt. The [launch checklist](PRODUCTION_LAUNCH_CHECKLIST.md) lists the remaining production gates; [email setup](EMAIL_SETUP.md) gives activation steps.

## Implemented

- Introduction requests/responses, messages and private proposal changes save their notices and outbox records in the same D1 transaction. Failed/stale writes cannot create alerts; queue failure rolls back the business mutation. Private message text and proposal terms stay out of email.
- Additive migration 0006 preserves existing notices/preferences and adds durable processing, consent/suppression controls, provider events and dispatch leases. Existing source relationships and independent founder ideas remain intact.
- Dispatch rechecks consent, exact connection participants/status, bilateral blocks and the live Clerk verified primary address. Recipient/request bytes and idempotency key remain frozen across bounded retries. Changed addresses cannot silently receive an older notice.
- Signed raw-body delivery events have bounded payloads, replay protection, durable event deduplication, ordering protection and address-specific bounce/complaint suppression. A receipt arriving before its provider ID is stored asks the provider to retry.
- Member controls display queued, provider-accepted, receiving-server-accepted, delayed and failed/stopped outcomes accurately. Stored opt-in can be revoked even when the current address is unverified or changed. Disabling email preserves in-app notice history.
- The separately deployable five-minute Worker calls only the protected HTTPS dispatch endpoint, with a deadline, no redirects and aggregate-only logs. It does not contain Clerk or Resend credentials. It has not been deployed.

## Verification

The actual migration/SQLite SQL and route handlers pass **1,738 notification assertions** with synthetic identities and network responses. These include atomic business/outbox rollback, changed consent/address races, private-account isolation, stale claims, receipt-write failure, job leases, nine-notice bounds, frozen idempotent retries and signed replay/order/suppression behavior. Injected storage failures intentionally produce error logs.

The standalone dispatcher passes **257 checks**, including canonical origin and 32–256-character shared-secret bounds, redirects, malformed/oversized responses, deadlines and safe logs. Final Wrangler 4.92.0 dry-run packaging passes: 4.85 KiB, 1.88 KiB gzip. No remote deployment was performed.

Eighteen related regression suites pass: multiple ideas, experiments, admin authorization/entry, saved/direct access, role/profile rules, workspace bounds/data controls, workbench, sectors, profile fit/suggestions, marketing journey, scroll geometry, founder updates, planning tools/models and truthful frontend rendering. Root and dispatcher TypeScript checks, scoped notification/helper lint and the final production build pass. The inherited workspace lint findings are recorded in the earlier implementation audit; this is not a claim that the whole repository has zero lint errors.

The built local Worker returned the expected anonymous-notification401, unconfigured-dispatch/webhook503, dispatch-GET405, privacy200 with the updated wording, and removed-QA-route404. Individual application responses carried no-store headers. The local Wrangler preview also intermittently returned “worker restarted mid-request” and one privacy request exceeded its client deadline, so the aggregate HTTP run is not a clean pass. These runtime stability/latency checks remain a release gate; they are not inferred from the route-unit tests or build. The owned preview was stopped afterward.

## Browser evidence and limits

Using the actual notification component in a temporary local fixture, browser checks covered all twelve notice states, failed-save preservation, successful opt-out without losing history, disabled unverified/suppressed opt-in, explicit opt-out for stale consent, missing-provider configuration and renewing a changed address. Layout had no horizontal overflow at 320px and 390px. The fixture made no provider requests or backend member writes.

A keyboard check found that temporarily disabling the focused checkbox during a save lost focus. The code now uses `aria-disabled` during pending work and guards duplicate writes, retaining native disabled only for genuine address eligibility. Browser access became disabled before the corrected focus behavior and final manual-dispatch interaction could be rechecked. Those checks and final screenshots remain pending. The temporary QA route was removed before the production build; its local fixture is retained only under ignored outputs.

No production OAuth journey, real provider submission, scheduled invocation, delivered email, bounce/complaint at the provider or complete cross-browser/accessibility review is established by these tests.

## Release and email handoff

The retained public Site was observed at version 32 with development Clerk authentication, no custom domain, no Resend/webhook/job configuration and no learning/outbox tables. No live migration, provider configuration or hosted publication was performed. Release the reviewed pending migrations and exact checked source to that same target only through the intended release workflow.

The owner requested the launch checklist by email, then explicitly deferred browser/Gmail reconnection and sending. A ready-to-send local draft is saved outside the repository. **No checklist email was sent and no Gmail draft was created.** It does not count as product email activation.
