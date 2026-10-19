# Connection email setup and activation

Checked 19 October 2026. The source implements opt-in transactional connection alerts through Resend, a durable D1 outbox, signed delivery receipts and a separate scheduled dispatcher. **Email is not activated on the existing public Site.** Its verified sender, provider credentials, webhook secret, dispatcher secret and new email migration still need production configuration and verification. See the [production launch checklist](PRODUCTION_LAUNCH_CHECKLIST.md).

## Scope and member controls

Alerts cover introduction requests and responses, messages, private proposals and proposal decisions. Emails contain a generic event title and a link to FindIn. They exclude message bodies, proposal amounts and terms. Progress updates, follow-up dates, monthly-update worksheets and marketing campaigns do not send email.

Members opt in under **My profile / My ideas → Connection notifications** using their verified primary Clerk email. This confirms an address, not a founder's claims or an investor's credentials. In-app notices remain available when email is off. A changed or unverified primary address cannot silently redirect an old queued email; the member must confirm the new address and explicitly enable updates again. A stored opt-in can still be turned off when its address is no longer eligible.

Preference changes stop older pending/retry notices instead of sending a pre-consent backlog. Turning email off cannot recall mail already submitted to the provider or an in-flight submission. Bounced, complained-about and provider-suppressed addresses stop further sending; the application retains address-specific suppression history. A different verified primary address needs its own explicit consent.

## Required application settings

Configure these in the **application's** secure runtime, not in the dispatcher Worker. Never commit credentials, paste them into chat or put them in command arguments.

| Setting | Purpose |
| --- | --- |
| `CLERK_SECRET_KEY` | Existing server identity credential; used to recheck the current account and verified primary address before sending. |
| `RESEND_API_KEY` | Restricted sending key for the intended verified sender domain. |
| `EMAIL_FROM` | Sender such as `FindIn <updates@notify.your-domain>`; this is an example, not an acquired domain. |
| `FIRSTSIGNAL_ORIGIN` | Exact canonical HTTPS app origin, without a trailing slash, path, query, fragment or credentials. |
| `RESEND_WEBHOOK_SECRET` | Signing secret for this application's Resend webhook endpoint. |
| `NOTIFICATION_DISPATCH_SECRET` | Shared random bearer secret, 32–256 URL-safe characters, also installed in the separate dispatcher. |

The current `chatgpt.site` address is not a domain we control for sender verification. Verify an owned domain with Resend's exact DNS records, confirm SPF/DKIM alignment, review DMARC and choose a monitored reply/support arrangement. The sender domain and website domain can differ. Configuration-presence flags do not prove that DNS, cron, signatures or delivery work.

## Storage and dispatch behavior

Apply additive migration `drizzle/0006_notification_outbox.sql` after earlier migrations. It adds the outbox, delivery-event records, address/consent controls and a durable dispatch lease without replacing existing notices or preferences. Review which migrations the actual serving database has applied, protect a release backup and apply only missing migrations. The Sites-managed live database and the owner's separate direct Cloudflare database are different resources.

Introduction, response, message and proposal changes append their notice/outbox writes in the same D1 transaction. A queue-write failure rolls back the business change. A failed or stale guarded write creates no notice. Recognized pending notices from older versions can be reconciled; submitted notices are not resubmitted.

The dispatcher claims due records in D1, rechecks current consent, accepted/pending relationship state, bilateral blocks and the live Clerk primary email, then submits the generic email. Its per-notification lease protects overlapping member retries; the global 90-second lease protects scheduled batches. The first attempt freezes the recipient and full provider request, and retries reuse the same `firstsignal-<notification-id>` idempotency key and bytes. Runtime sender/origin changes do not rewrite a frozen retry.

Transient identity/provider/network failures are retried with backoff, up to five attempts. Permanent provider rejection stops retries. Records expire 23 hours after creation, before the provider's 24-hour idempotency window; a timed-out submission can have an unknown outcome. Neither a retry limit nor expiry proves that the provider never received the email.

## Scheduled delivery

The standalone source and activation instructions are in [cloudflare/notification-dispatcher/README.md](cloudflare/notification-dispatcher/README.md). Adding its files does not deploy it or enable a schedule.

When deployed, it calls `POST /api/internal/notifications/dispatch` every five minutes with the matching bearer secret. One invocation requests at most three owners and three notices per owner; the application can process up to nine notices. The caller has a 45-second deadline, rejects redirects and logs aggregate counters only. An active global lease returns HTTP 409; failed invocations wait for a later tick. Monitor repeated failures, backlog age, expired notices and actual pilot capacity rather than assuming the schedule drains any load.

Members can also select **Check queued email**, which checks at most one eligible notice for their own account. It is not a background job or a resend of submitted mail. Pausing the cron alone does not disable that manual path; an emergency sending pause must also disable the application's sending credential/configuration. Already submitted mail cannot be recalled.

## Signed delivery receipts

Register `https://your-actual-app-origin/api/webhooks/resend` in Resend and install its signing secret in the application. Subscribe to:

- `email.sent`
- `email.delivered`
- `email.delivery_delayed`
- `email.bounced`
- `email.complained`
- `email.suppressed`
- `email.failed`

The endpoint verifies the raw-body Svix signature and five-minute timestamp tolerance before parsing or storing data. It bounds the body, deduplicates event IDs, prevents late sent/delayed events from downgrading delivery and keeps negative outcomes sticky. A receipt that arrives before its provider ID is stored returns 503 so the provider can retry. Transient storage failures also require retry; configure and monitor provider webhook retries.

The app stores receipt identifiers, event types and timestamps, not raw webhook payloads. Queue records include the frozen recipient/generic email request and processing status. Address-specific suppression records support consent and abuse controls. Agree a retention and deletion-request procedure before launch; no automatic record-purge policy is implemented.

The UI distinguishes queued, sending, retry, provider acceptance, receiving-server acceptance, delayed, bounced, unwanted, suppressed and stopped states. Receiving-server acceptance is not proof of inbox placement or reading. Refresh notifications to see later receipt updates; this is not a live push feed.

## Activation evidence

1. Verify the sender domain, final app origin and production Clerk configuration/account mapping.
2. Review and apply only pending migrations to the intended serving database, then release the checked source with a rollback/recovery plan.
3. Install the application settings above; configure the signed webhook and its event subscriptions.
4. Deploy the separately configured cron caller with the same dispatch secret and verify its intended HTTPS target.
5. With one consenting real recipient, confirm a real submission receipt, receiving-server delivery event and browser-visible status. Test opt-out, address changes, blocks, bounce/complaint suppression, timeout/retry recovery and scheduler operation with the browser closed.
6. Record the tested source/deployment, provider receipt and webhook outcome; configure alerts and a sending-pause procedure. No local mocked test closes this activation gate.

Local validation, without real provider calls or emails:

```powershell
node scripts/verify-notifications.mjs
node cloudflare/notification-dispatcher/verify.mjs
node node_modules/typescript/bin/tsc --noEmit
```

The notification suite uses actual migrations, SQLite SQL and route handlers with synthetic Clerk/Resend responses. It checks consent, current-address changes, block/status/owner authorization, transactional business/outbox rollback, claim/lease recovery, frozen retries and signed receipt replay/order behavior. These checks do not establish real deliverability or hosted production authentication.

References: [Resend send API](https://resend.com/docs/api-reference/emails/send-email), [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests), [event meanings](https://resend.com/docs/webhooks/event-types), [webhook retries](https://resend.com/docs/webhooks/retries-and-replays), [domain verification](https://resend.com/docs/add-a-domain).
