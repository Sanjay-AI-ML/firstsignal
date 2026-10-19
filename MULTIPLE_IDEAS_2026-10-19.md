# Project identity and multiple founder ideas

Implemented 19 October 2026. This supersedes earlier single-idea restrictions while preserving the founder/investor account role.

## Project identity

`ProjectIcon` uses the existing Lucide library, a consistent 1.75px stroke, four responsive sizes and five restrained semantic colour families. Industry and purpose select a meaningful symbol; custom sectors use the same rules and an idea symbol as a fallback. The six fictional examples have distinct purpose-based marks. Icons accompany names and remain decorative to screen readers. Existing person/investor avatars stay separate. CSS includes dark-surface and forced-colour treatment; the product remains its existing light theme.

The shared component is used in discovery cards/rows, comparisons, search, suggestions, idea management, profile details, operator listing rows and marketing examples. It needs no generated bitmap, upload service or extra dependency.

## Data and API contract

The existing `profiles.owner` authenticated account key already expresses one founder to many ideas. Migration `0004_multiple_founder_ideas.sql` removes the owner/kind unique index, retains a lookup index and adds a partial unique index for investor owners. It adds nullable introduction source ID/name columns and replaces target-only introduction uniqueness with `(sender,target,coalesce(source,''))`. It does not rebuild or remove records. Existing IDs, JSON data, progress, saves, introductions, messages, proposals, notes, reports and moderation references remain intact.

- `{ action:'profile', profile, listed, consent:true }` creates a new founder idea; it never updates another idea by owner/kind.
- Add top-level `profileId` to edit precisely that record. ID, owner and kind must match; a missing or unauthorized ID returns404. Owner identity comes from the verified session, never request JSON. Successful writes return `savedProfileId` alongside workspace state.
- New account roles are still mutually exclusive and checked atomically. Investors have one investment profile. Historical dual-role rows stay editable and existing founders in those accounts can add ideas.
- Each idea independently retains its existing stage, fields, sharing choice, dated updates and moderation record. Listing one idea does not list its siblings. Editing cannot lift an operator restriction.
- Requests may include `sourceProfileId`. The server verifies the chosen source is the sender's listed, unrestricted startup and rechecks this in the insert. Threads for different ideas may approach the same investor independently. Legacy source-null threads remain readable and unique. Proposal/message/note histories stay attached to their introduction IDs. The idea name is a historical snapshot; its ID links to the current accessible profile.
- A member block still applies to the whole account and all its ideas. Moderation applies to the chosen idea. Operator connection reports resolve the actual linked target/source idea, not an arbitrary recent sibling. Founder counts use distinct account owners.

## Member interface

Founders get My ideas navigation, independent idea cards, Add an idea, Edit idea, Preview, status/stage and completion guidance. Progress opens for the selected idea; switching/closing asks before discarding an unfinished progress draft. Idea search appears for larger collections. Editing preserves the selected ID; creation starts a blank idea. Introduction forms explicitly select the listed idea and conversation search includes its name. Investors keep their existing profile editor.

There is no new deletion flow: edit an idea's sharing settings to unlist it. Existing conversations remain. Marketing/onboarding wording now distinguishes account role from number of ideas.

## Verification

- 239 isolated real-route/SQLite checks cover migration preservation across 11 linked tables, distinct/concurrent creates, exact-ID edits, role races, cross-owner denials, independent visibility/progress, idea-scoped requests/messages/proposals/notes, legacy threads, moderation and account blocks. A 205-idea single-owner case verifies complete owned retrieval and independent updates beyond the discovery cutoff with <=100 bindings per query.
- Existing single-profile-policy script now tests multiple founder ideas and one investor; admin 157, saved/direct privacy, 402-profile bounds, workbench/search, sectors, fit 12 and suggestions 28 pass. The admin rollback test intentionally emits its handled failure log.
- Actual local browser testing used a synthetic founder and a loopback in-memory API executing the real handlers. Created Workshop Flow and Learning Bridge through all four editor steps; confirmed distinct IDs and reload persistence. Edited Learning Bridge's stage/tagline/public status while Workshop Flow stayed unchanged. Added progress only to Workshop Flow; tested the unfinished-progress switch guard. Two separate private practice introductions to the same fictional investor retained their respective idea names; searching one name found one thread.
- At390px and320px, cards/editor fit without horizontal document overflow; card actions measured 44px high and project marks 42px. Desktop 1440px showed both ideas side by side with distinct manufacturing/education SVG identities. No client error was observed in the synthetic browser session. Proof: `outputs/findin-multiple-ideas-local-qa-2026-10-19.png` (explicitly labelled local QA).
- TypeScript passes. New components and backend pass scoped lint; legacy platform/dashboard hook lint findings and existing image warnings remain. New CSS parses with PostCSS. Final production build and publication identity are recorded in the release handoff/workspace memory.

The temporary UI fixture and memory server are removed/stopped before release; no real member/provider account or outbound email is used by these tests. Production Clerk/domain activation and the previously recorded operating requirements are separate work. OS dark-mode, physical phones and full screen-reader conformance are not newly verified.


## Published multiple-idea release — 19 October 2026

Published version31 on the existing public Site, source 9dbab35f721082d5cae34a6946956f58565afb29, deployment appgdep_6ad5b81d47d88191b67ff62162a5636d succeeded with unchanged environment revision2. Migration0004 enables independent founder ideas and source-scoped introduction threads without replacing existing records. New shared category/purpose icons replace project initials. See [contract and verification](MULTIPLE_IDEAS_2026-10-19.md).

239 isolated multi-idea checks, existing role/saved-direct/privacy/bounds/workbench/sector/fit/suggestion and157 admin checks passed. Final TypeScript, production build, CSS parsing and15-file scoped lint passed (one native-image warning; existing legacy workflow lint findings remain). Browser testing created and edited two ideas through the actual editor against an isolated real-handler/SQLite memory server; IDs survived reload, progress remained per idea, same-investor practice threads stayed distinct, and320/390px layouts had no horizontal overflow. Test route removed before build and live /qa-ideas returns404; anonymous profile writes and admin API return401/no-store.

Live signed-in My ideas loads the existing owner's one public idea without error. Add an idea opens a blank name field and cancels cleanly, leaving the existing record unchanged; no real idea/account was created or edited by verification. Live sample icons use distinct handover/documents SVG marks, updated role explanation is present, and no client error was observed. Proof of the two-idea flow is outputs/findin-multiple-ideas-local-qa-2026-10-19.png, explicitly labelled LOCAL QA. Existing domain/production-Clerk/email/operations limits remain separate.
