# FirstSignal release status

8 October 2026. The public website remains an authentication trial while production account configuration is pending.

## Implemented

- Shorter sign-in, marketing, and workspace copy. Sample profiles remain explicitly labelled.
- Clerk sign-in/sign-up/sign-out, server-verified sessions, exact hosted-origin checks, private account scoping, and mutual-consent conversations.
- Authentication loading/retry states, sign-out failure feedback, bounded automatic session refresh, and page/service error recovery.
- Private/no-store HTML and API responses, content-type protection, referrer policy, and restricted device/payment permissions.
- A factual `/privacy` page describing current data visibility, storage, and controls. This is not a claim of legal compliance.

Validation: TypeScript and the production build pass. All 48 account/consent/persistence checks pass with real development Clerk sessions. Separate checks verify server recognition of a signed session cookie and malformed-token rejection. The built Worker returns private/no-store, nosniff, referrer and device-permission headers, and rejects forged identity headers. Mobile sign-in fits 390px without horizontal overflow. These checks do not establish hosted production OAuth behavior, full accessibility conformance, or a completed security audit.

## Production activation still required

1. Owner claims a domain. None is owned or attached yet. Name.com's GitHub Student Pack offer includes eligible `.app`/`.dev` domains; check eligibility, first-year checkout, and renewal price. Availability of any proposed name has not been checked.
2. Configure Clerk's production instance and DNS, production Google OAuth credentials, and production keys. Switch the runtime origin and keys together, then verify real browser sign-in/sign-out, reload, expiry, and cross-account access on that domain. The existing development label must not be hidden to simulate production readiness.
3. Establish a support/contact and data-deletion process, operating terms, monitoring/alerts, abuse controls appropriate to traffic, and verify a database backup/restore. Existing introduction quotas, conversation limits, validation, and authorization do not replace broader edge abuse protection.
4. If moving to the selected direct Cloudflare stack, deploy the source against the own-account D1 binding. Current Sites D1 and own-account D1 are separate. Transfer ownership only with an explicit identity mapping; never reassign by matching email alone.

No domain was purchased, no paid service activated, and no data migration or privacy compliance certification was performed.

[Student Pack](https://education.github.com/pack) · [Clerk production guide](https://clerk.com/docs/deployments/overview)

## Private negotiations and notifications

Private INR bids and counteroffers are available only after an introduction is accepted. Versioned D1 writes preserve proposal/decision history and reject stale updates. Participants can acknowledge interest, decline or withdraw; these are non-binding discussion records and do not execute investments or payments. In-app notifications cover introductions, messages and proposal changes. Email opt-in uses a verified Clerk primary email. Resend integration is implemented but live sending remains inactive pending a verified sender domain and runtime credentials; see EMAIL_SETUP.md. There is no background retry scheduler or delivery webhook.

Validation: 91 local authenticated workflow checks passed, including outsider isolation, simultaneous proposal responses, persistence and decision permissions. Mocked provider checks passed for opt-in, missing configuration, failure handling and idempotent retries without sending real email.
