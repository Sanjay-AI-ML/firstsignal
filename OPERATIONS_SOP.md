# FindIn draft operating runbook

Updated: 20 October 2026. Status: proposed operating procedure, awaiting owner adoption. This document describes current source capabilities and manual work still needed; it does not establish staffing, response deadlines, legal compliance or a hosted release.

## Access and setup

Use `/admin/signin` with the single existing Clerk account explicitly bound by the server's `FINDIN_ADMIN_USER_ID` secret. The value is the exact raw immutable `user_...` ID, not an email, a namespaced ID, a list or a user-editable role. Missing or invalid configuration denies owner access. Authentication remains Clerk-managed; there is no separate admin password or first-user bootstrap.

The existing lookup script can resolve one account by its verified primary email for initial setup. Runtime authorization checks the resolved immutable ID on every request. A new Clerk instance requires explicit rebinding; do not transfer ownership merely by matching email. Setup commands and secure configuration guidance are in [ADMIN_PORTAL.md](ADMIN_PORTAL.md). Never commit credentials or actual bindings.

Before adopting this runbook, select a monitored private support address, the responsible owner, a backup contact, an escalation path and a recovery location. These are operational setup tasks, not active services supplied by the portal. Confirm current hosting, production authentication, migrations and email state against the [launch checklist](PRODUCTION_LAUNCH_CHECKLIST.md).

## Proposed review cadence

The owner should decide and publish a cadence they can maintain. A suggested starting point is one review on each operating day, plus attention to credible urgent concerns received through the agreed support channel. There is no staffed SLA or automatic escalation configured by this document.

At a review:

1. Open Overview and note new reports, listing restrictions and unusual changes in stored counts. Counts are not verified businesses or completed investments.
2. Review Reports, starting with concerns that may cause the most immediate harm. The list is newest first; use filters and pagination to find older unresolved items.
3. Inspect a linked listing when it is available. Record a clear decision or the next manual follow-up needed.
4. Check Outbox and available service logs for errors or aging work. Check the external uptime/alerting system only after one has actually been configured.
5. Keep a minimal private operational record of unresolved work and who will act next. Do not copy member messages, secrets or sensitive evidence into public issues.

## Reports and listing decisions

Reports are allegations, not proof. The actual stored states and UI labels are:

| Stored state | UI label | Use |
| --- | --- | --- |
| `submitted` | New | A concern awaiting review. |
| `reviewing` | In review | The operator is assessing it. |
| `resolved` | Resolved | The recorded concern has an outcome. |
| `dismissed` | Dismissed | The review found no action warranted on the available information. |

A report review requires an operator note of 10–1,000 trimmed characters. Explain the observed issue, relevant context and actual decision without unnecessary private information. Updating a report does not itself remove a listing; removing a listing does not resolve its report automatically.

Listings provides founder/investor and Visible/Removed filters. Open the record to inspect explicitly selected listed content: identity/context fields, ideology, proposed solution, learning, next step and up to 20 public progress updates. If a previously restricted listing is unlisted by its owner, draft fields and progress are redacted; the restriction can still be lifted. The ordinary portal does not open private drafts, messages, proposal terms, saved searches, private idea history or follow-up notes.

Remove or restore a listing only after inspecting the available context. The confirmation requires an editable explanation of 10–500 trimmed characters. The UI offers starting text for spam, misleading information, harmful content, privacy concerns and duplicate listings; these are writing aids, not a separate reason-code enforcement system. A founder having several distinct ideas is supported and is not itself a duplicate violation.

Removal restricts public discovery and direct public access while retaining the profile and account. Its reason is visible to the profile owner. An owner can edit the idea but cannot clear the restriction by republishing. Restoration respects the current sharing choice: an owner-unlisted idea stays private. Existing conversation records remain available to their participants. Use Activity to verify the recorded actor, target, reason and state change.

Stale moderation/report writes return a conflict. Reload the latest record and review it before retrying. Mutations and their audit events commit together; the portal provides no audit edit/delete action. These operations do not send emails, suspend Clerk accounts or process investments.

## Email operations

Outbox is read only. Inspect waiting/in-progress counts, delivery outcomes, state filters and pages. A recipient-server receipt does not prove inbox placement or reading. An unavailable query or queue age must be investigated rather than treated as a healthy zero.

There is no force-retry control. Do not reset attempts, remove suppression or replay frozen payloads through ad hoc SQL. Automatic retries retain their original consent, recipient, request bytes, attempt limit and retry window. Review repeated failures using the restricted service/provider tools described in [EMAIL_SETUP.md](EMAIL_SETUP.md).

Portal warnings and log entries are not outbound operator alerts. Settings presence does not prove that a verified sender, scheduled Worker or signed webhook is active. External alert destinations and a real consenting delivery test remain setup work. Recipient addresses, private content and frozen email bodies are excluded from this dashboard.

## Data requests and closure

Members can use their authenticated safety/privacy controls to download a full or category-selected JSON archive. Archives exclude counterparties' private follow-up notes, operator-only reviews and Clerk-managed sign-in records. Earlier idea snapshots and read positions are currently omitted; each selected archive category is still assembled in memory. Do not promise a complete provider export or resumable large-data download.

A closure request pauses supported new activity, makes profiles private, withdraws outgoing pending introductions and disables email updates. It does not delete stored records or the Clerk account, revoke active Clerk sessions or schedule automatic erasure. Cancellation keeps profiles private and email off until deliberately changed.

There is no admin closure-review queue or administrative deletion script in this implementation. Follow the [manual account closure procedure](HARDENING_FRONTEND_2026-10-20.md#manual-account-closure-procedure): verify the exact authenticated owner/request, inventory related records and counts, document the retention decision, prepare a reviewed owner-scoped plan, rehearse it against an isolated restored backup, handle Clerk sessions explicitly when approved, and verify the outcome. Do not run blind cascade deletes or use email alone to select an account. No retention period or deletion deadline is established by this draft.

## Incidents and recovery

For a credible incident, record the observed impact, affected route/environment, time and server-generated request ID. Keep private content, access tokens, raw SQL parameters and identity documents out of ordinary logs and public tickets. The current monitoring helpers intentionally omit raw exception text.

The owner must choose the appropriate manual response and escalation through the adopted support process. The portal supports reversible listing restriction and report review; it does not provide an incident-management system, automatic account suspension or law-enforcement handover workflow. External notices require an appropriately reviewed response; this runbook does not invent legal deadlines.

Before a production mutation or release, verify the actual serving database, pending migration set and rollback/recovery plan. Rehearse restoration separately; reverting Worker code does not restore database contents. Protect the existing hosting identity and counterpart records. Record what was actually completed, then communicate through the agreed private channel only when authorized.

## Open adoption tasks

- Choose and test the support address, owner availability, backup contact and proposed review cadence.
- Adopt report/moderation policies and a private appeal/contact process; none is automated here.
- Configure external monitoring/alerts, on-call ownership and tested backup restoration.
- Adopt retention and closure procedures before promising timelines or erasure outcomes.
- Complete production domain/Clerk/email activation and hosted verification in the launch checklist.
