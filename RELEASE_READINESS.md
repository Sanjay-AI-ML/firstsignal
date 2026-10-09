# FirstSignal release status

9 October 2026. The public Site is a working pilot with Clerk development authentication. It is not yet a fully activated production service.

## Implemented

- Guided founder/investor onboarding, private drafts or public listings, consent and profile-completion guidance.
- Discovery, saved profiles, explainable suggestions and stated profile-fit comparison; no funding probability or independent verification claim.
- Mutual-consent introductions, accepted conversations, a connections dashboard, private next-step notes/dates and versioned non-binding INR proposal discussions.
- Dated founder progress updates and a saved-startup progress feed. Draft updates remain private; listed updates are public and labelled self-reported.
- Profile reports and account blocking. Server checks prevent contact in both directions; existing conversation history remains readable by participants. Public listings remain visible when signed out.
- Clerk sign-in/sign-up/sign-out, server-verified sessions, hosted-origin validation, account scoping, loading/retry states and sign-out failure feedback.
- Private/no-store HTML/API responses, content-type protection, referrer policy and restricted device/payment permissions.
- A factual `/privacy` page describing current visibility and controls; this is not a compliance certification.
- In-app connection notifications, verified-primary-email opt-in and Resend integration. Live sending remains inactive pending a verified sender domain and runtime credentials.

Validation: TypeScript and the production build pass. All 204 authenticated local workflow checks pass, covering consent, persistence, progress visibility, private notes, reports, bidirectional blocking and account isolation. Profile-fit (12), suggestion (28), notification-provider mocks and 202-profile D1 bounds checks pass. Founder/investor onboarding and 390px/320px layouts were checked in the browser. Local development-session checks do not establish hosted production OAuth behaviour, full accessibility conformance, a completed security audit or real-user Core Web Vitals.

## Production activation still required

1. Choose and attach an owned domain. The owner deferred that decision; none has been purchased or attached by this work. Recheck student-benefit eligibility, checkout price and renewal cost when selecting one.
2. Configure Clerk's production instance, DNS, production OAuth settings and keys. Switch origin and keys together, then verify browser sign-in/sign-out, reload, expiry and cross-account access on the chosen domain. Keep the development instance's truthful label until activation.
3. Activate a verified sender domain and secure Resend runtime settings, then test a consenting real recipient, opt-out and provider failures. Confirming an account email is separate from checking investment or founder claims. See [EMAIL_SETUP.md](EMAIL_SETUP.md).
4. Establish an operator and process for reviewing submitted reports, investigating abuse, responding to users and enforcing decisions. The current product records reports but has no administration UI or automatic moderation. Reporting does not automatically remove a listing, and blocking does not make an otherwise public listing private.
5. Establish support/contact, data deletion, operating terms, monitoring/alerts and a tested database backup/restore. Pilot quotas, validation and account authorization do not replace a broader traffic-abuse response or independent release assessment.
6. If moving to the selected direct Cloudflare stack, configure the own-account Worker, production secrets and D1 binding explicitly. Sites D1 and the owner's separate D1 database are distinct. Any identity/data transfer needs an explicit mapping; never reassign ownership by matching email alone.

No domain purchase, paid-service activation, live data migration, privacy certification or independent claim verification is part of this update.

## Behaviour and limits to preserve

Private proposal amounts and terms are discussion records available only to accepted participants. An acknowledgement is not a signed contract, completed financing or funds received. The product does not run public investment auctions or process money.

Each participant's next-step note and date stay private to that person. Dates do not schedule reminders. Saving a real startup follows its visible progress in the workspace; progress updates do not trigger email broadcasts.

Connection emails contain generic event notices, not private message content or proposal terms. Provider acceptance is labelled submitted, not delivered. There is no background retry scheduler or delivery webhook. Blocks suppress further connection notifications between the accounts; historical notices and accepted conversation records remain account-scoped.

Examples remain labelled fictional. Stock marketing photographs imply no member, partner or investor endorsement. Review this document alongside [HANDOFF.md](HANDOFF.md) when expanding advertised behaviour.

## Marketing experience — 9 October 2026

The public landing page now demonstrates profile drafting/listing, stated stage fit, saved-startup progress and non-binding proposal versions through a clearly labelled local example. Founder and investor navigation targets separate sections. Marketing copy describes implemented controls; it does not claim guaranteed funding, verified investment quality, email delivery, automatic report resolution or scheduled reminders. The self-hosted Manrope font includes its license in `public/fonts/Manrope-OFL.txt`.
