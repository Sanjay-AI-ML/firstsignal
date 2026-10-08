# Clerk account connection

Verified 8 October 2026:

- Official Clerk CLI OAuth login succeeded.
- Linked this existing checkout to the account's sole application, currently named `My Application`: `app_3KPOxDze3Rpo9NYb15MGvbfZGtE`.
- Development instance: `ins_3KPOxGl2uh75ZxauWLMHct4iUqy`.
- Retrieved development publishable and secret keys directly into `.env.local`. Git ignores this file. Never copy its values into documentation, chat, source, or command arguments.
- `clerk deploy status` reports `not_started`: no production instance or domain configured.
- The student benefit was claimed according to the user; its active subscription status has not been independently checked. Plan/billing management requires the Clerk dashboard.

Clerk authentication is now implemented in the website with `@clerk/react` and `@clerk/backend`. `/signin` and `/signup` show Clerk's Google/email form; `/signout` closes the Clerk session. Server pages and API writes verify session signatures and scope records to `clerk:<user_id>`. Hosting identity headers are never used as account identity. The hosted runtime requires the exact site origin as the token's authorized party.

The public test release uses this development Clerk instance, not production Clerk authentication. Runtime secrets are configured in Sites, separately from local files. Old ChatGPT-owned records are retained; no automatic reassignment by matching email is performed. Own-account D1 remains initialized separately, while this release uses the existing Sites-managed database.

Local checks: TypeScript and build passed; forged headers and malformed JWTs received 401; 48 consent/persistence/isolation assertions passed with three temporary real Clerk development sessions. Temporary Clerk accounts were removed; records were written only to local D1. The local test-key runtime accepts backend-generated tokens without an authorized-party claim; hosted runtimes always enforce the exact configured origin.

Do not run generic `clerk init` scaffolding over the existing customized pages without inspecting its changes. Organizations are optional team tenancy, not a prerequisite for individual founder/investor accounts; they have not been enabled as part of this setup.

`clerk deploy` configures production authentication, including a chosen domain and DNS. It does not deploy the website or connect D1. Finalize the owned domain before production configuration. Use `npx clerk@latest deploy status` for read-only verification.

[Official Clerk CLI documentation](https://clerk.com/docs/cli)
