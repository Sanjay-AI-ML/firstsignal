# Connection email activation

Private bids, counteroffers and in-app connection notifications work without an email provider. Live email is inactive until these server runtime settings are configured:

| Setting | Value |
| --- | --- |
| `RESEND_API_KEY` | A restricted sending API key, stored as a secret |
| `EMAIL_FROM` | `FirstSignal <updates@your-verified-domain>` |
| `FIRSTSIGNAL_ORIGIN` | The actual public HTTPS origin of this deployment |

Verify a sending domain in Resend using its DNS records. Configure the values in the hosting environment; never commit credentials or paste them into chat. The current `chatgpt.site` address is not a domain we control for sender verification. A sender domain can be configured before moving the website itself.

Users opt in under **My profiles → Connection notifications**. Their primary Clerk email must be verified. Switching preferences clears older pending emails, so enabling notifications does not send a backlog from before consent. Requests, responses, messages and proposal updates generate generic notifications. Private content and terms are excluded from email.

Provider acceptance is labelled “Submitted to email provider”, not “Delivered”. Failure leaves a notice pending. The next notification or the user's retry button retries up to three recent pending notices; there is no background retry scheduler. Notices older than 24 hours are not retried, matching the provider's idempotency retention. Confirm sender verification, a real opted-in recipient, opt-out and provider errors before claiming email activation.

Validation: `node scripts/verify-notifications.mjs` uses a mocked provider and sends no emails. `TEST_ORIGIN=http://127.0.0.1:5173 node scripts/verify-clerk-workflows.mjs` tests local D1 with temporary real Clerk development sessions.

References: [Resend send API](https://resend.com/docs/api-reference/emails/send-email), [idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys).
