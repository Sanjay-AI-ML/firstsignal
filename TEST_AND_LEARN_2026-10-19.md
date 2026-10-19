# Test & learn — research and implementation

Research checked 19 October 2026. FindIn helps founders and investors discuss ideas before a finished product exists. Its existing profiles, progress updates and conversations explain the story, but did not capture a test's original question, expected outcome and resulting decision together.

## What current products teach us

| Primary source | Observed pattern | Decision for FindIn |
| --- | --- | --- |
| [OpenVC changelog, 11 October 2026](https://www.openvc.app/changelog) | Its latest release includes AI autoscreening and improved deck review, alongside accelerator comparison and introduction tools. | Generic pitch scoring alone would add little differentiation. Help founders create useful learning before improving the pitch. |
| [Strategyzer, 2 September 2026](https://www.strategyzer.com/library/business-project-succcess) | Distinguishes reported opinions from observed actions and commitments. Evidence concerns particular assumptions rather than proving an entire venture. | Record one assumption, a specific test and a predeclared success condition. Do not assign an overall startup-validity or investability score. |
| [Visible, 20 February 2026](https://visible.vc/blog/metric-approvals/) | Introduced metric review and traceability across submissions, sources and approval history. | Keep the original plan after a test starts and preserve the recorded result. Show dates and source context without suggesting FindIn reviewed or approved the claim. |
| [Strategyzer experiment playbook, checked 19 October 2026; page undated](https://www.strategyzer.com/programs/design-experiments-prepare-to-test-your-business-idea-part-2) | Connects hypotheses, experiments, measurement and success criteria in a repeatable workflow. | Offer editable planning prompts, then separate planning, running and learning. Templates never invent results. |
| [Tyke founder application, checked 19 October 2026; page undated](https://founders.tykeinvest.com/founders/application) | The community-round application requires a registered company and states that pre-revenue startups are unsuitable for that round. | Support earlier learning and conversations. This finding applies to this application, not every Tyke service or investor. |

The feature choice is our inference from these sources and the current product gap. We do not claim global novelty, proven customer demand, improved funding odds or any partnership with these companies.

## Product behavior

- Each founder idea has its own Test & learn workspace under My ideas.
- Plan a small customer test with an assumption, participants, method, success condition and optional target date. Editable starter prompts cover conversations, prototype use, pilots and willingness to pay.
- Drafts can be edited or removed. Starting a test preserves the original plan and start time. Record observations, interpretation and a next decision: continue, change, stop or test again.
- Completed results stay private unless the owner explicitly shares them. Sharing and unsharing do not rewrite the plan or results. To correct or extend a completed record, add a follow-up test explaining the correction.
- An idea's Evidence tab displays only its selected completed learnings to other visitors. Results are labelled founder-reported and are not independent verification.
- Removing a listing, moderation or an account block also removes public access to its shared learnings. Private testing activity does not bump discovery recency.

## Implementation and boundaries

An additive D1 migration stores experiments separately from public profile JSON. The dedicated API validates exact ownership, lifecycle transitions, consent and optimistic versions; all responses are uncached. Evidence links are optional HTTPS references and are never fetched by the server. No participant contact information is requested. No new paid service, AI inference, automatic email or automatic publication is introduced.

## Verification and release status

- `verify-experiments.mjs`: 455 checks pass using actual route handlers, strict validation and real SQLite migrations with synthetic accounts. Coverage includes byte-for-byte retention of existing data; independent ideas; authentication/origin/body limits; plan/result immutability; stale and concurrent writes; explicit sharing; unlisting, moderation and bilateral blocking; visibility changes between queries; the atomic 50-test limit; and unchanged public profile recency. A logged write failure is intentional fault injection.
- Existing regressions pass: 239 multiple-idea checks, 157 operator-portal checks, discovery/workbench and saved-profile access checks. The operator rollback test also intentionally logs a handled failure.
- TypeScript, scoped lint for the six changed feature/backend files, CSS parsing and the production build pass. Temporary fixture routes are absent from the build.
- Actual local browser checks confirmed the per-idea empty state, editable prototype starter, retained input after an injected save failure, and an unsaved-plan warning when switching to a sibling idea.
- Browser access was then disabled in Work settings. The final save/start/complete/share flow, sidebar confirmation, responsive screenshots and production browser checks could not be completed. The remaining behaviors have route tests and code review, not completed browser verification. No real user data or provider account was modified.
- The existing Site was public at version 32 when checked earlier in the session. After the Sites connection changed, both project lookup and credential creation returned `Sites project not found`; the connected account's Site list was empty. No new Site was created. This feature has not been published to the existing Site.
- The main source was reconciled with the independently published version-32 marketing source before final checks; its scroll changes are preserved. The Test & learn patch remains in the local workspace and is ready for the existing Site workflow once access is restored.

This implementation tests the workflow; actual founder adoption and investor usefulness still need permissioned user research. Useful pilot questions are whether founders finish a first test, whether observations change their next decision, and whether investors can explain the remaining uncertainty from the shared result.
