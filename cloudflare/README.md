# Own-account D1 connection

Status, 8 October 2026: direct Cloudflare Wrangler OAuth is authenticated with account/user read and D1 write permissions. Created `firstsignal-production` in the owner's sole listed account, in APAC. Database ID: `53829054-0f90-4278-b1a8-4e50a4e1b4bf`. Applied `0000_majestic_ender_wiggin.sql`; remote queries verified all four application tables, and migration listing confirms nothing remains pending. The ignored `d1.local.json` contains the real administration binding. No existing Sites records were copied and no paid upgrade was activated.

Installed all 16 official Cloudflare skills into `C:/Users/sanja/.agents/skills/` using the supplied setup prompt. Registered the `cloudflare` remote MCP server at `https://mcp.cloudflare.com/mcp` in the existing user-level Codex configuration, preserving unrelated entries. A backup is `C:/Users/sanja/.codex/config.before-cloudflare.toml`. MCP OAuth authorization completed successfully; it requests user/account read and D1 metadata/read/write, rather than every Cloudflare API permission. Restart Codex after authorization to load the new server. The optional beta `cf` CLI was skipped because this project already uses Wrangler.

The live Sites pilot still has its separate managed `DB` binding and the same four table names. The new own-account D1 database is initialized and accessible through Wrangler; it is not yet the database used by the published website.

After the owner completes Wrangler OAuth sign-in:

1. Inspect available accounts and existing D1 databases. Select the owner's intended account; reuse a suitable existing database rather than creating a duplicate.
2. Create `firstsignal-production` on the free account if no appropriate database exists. Do not upgrade billing as part of connecting D1.
3. Copy `d1.example.json` to `d1.local.json`, replacing the account and database placeholders with exact returned identifiers. This configuration is for D1 administration, not public Worker deployment.
4. List and apply checked SQL migrations using the local config and `--remote`. New databases start empty. Do not import local QA records or reset the Sites database.
5. Run a read-only remote query to check that `profiles`, `saves`, `introductions`, and `messages` exist.

Example commands from the application directory, using the installed Wrangler:

```powershell
node node_modules/wrangler/bin/wrangler.js whoami
node node_modules/wrangler/bin/wrangler.js d1 list
node node_modules/wrangler/bin/wrangler.js d1 create firstsignal-production
node node_modules/wrangler/bin/wrangler.js d1 migrations list DB --config cloudflare/d1.local.json --remote
node node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --config cloudflare/d1.local.json --remote
node node_modules/wrangler/bin/wrangler.js d1 execute DB --config cloudflare/d1.local.json --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

For multiple accounts, set `CLOUDFLARE_ACCOUNT_ID` to the explicitly selected account when listing/creating. The scope of database-only OAuth is account/user read and D1 write; Worker deployment needs separate authorization later.

The current Sites-hosted website remains attached to its managed database. A direct Cloudflare release must use the new `DB` binding in its deployment configuration and integrate authenticated identity verification (planned Clerk). Never publicly deploy the current trusted-header authentication implementation without the Sites dispatcher. Record-ownership migration requires an explicit identity mapping and a protected export/import workflow.

[Cloudflare D1 setup documentation](https://developers.cloudflare.com/d1/get-started/)
