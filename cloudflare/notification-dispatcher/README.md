# Notification dispatcher

Standalone Cloudflare Worker source for calling FindIn's existing notification outbox endpoint every five minutes. **This folder does not mean the scheduler is deployed or email is activated.** It uses the application's Resend integration; it does not need a Resend or Clerk key itself.

The Worker has no public HTTP handler, `workers.dev` address, or preview URL. Each cron invocation sends exactly one authenticated POST to `/api/internal/notifications/dispatch` with `{ "limit": 3 }`. The application processes at most three owners, up to three notices per owner, and owns consent, current verified email, blocking, suppression, retry policy and provider idempotency.

## Bounds and failures

- The entire HTTP operation, including reading its response, has a 45-second deadline. Requests never follow redirects. There is no immediate retry loop; the next five-minute tick handles later work.
- The application's **durable 90-second D1 dispatch lease** prevents overlapping jobs across isolates and duplicate cron invocations. Per-notification claims also protect against concurrent member retries. This Worker deliberately does not use an in-memory flag as a distributed lock. An already-running job returns HTTP409 and sends no second batch. Do not point this Worker at an older endpoint without these leases.
- A successful response must be bounded JSON (at most 4KiB) with `configured: true`, `busy: false` and integer aggregate counters. The batch can process up to nine notices across its three owners; outcome totals must not exceed that processed count. Only these counters and HTTP status are logged. Response bodies, recipient addresses, request credentials and upstream exception details are never logged by this source.
- Invalid configuration, redirects, HTTP failures, malformed responses and deadlines reject the `ctx.waitUntil` task. Cloudflare records a failed scheduled invocation. This does **not** configure an alert destination; the operator must connect monitoring and inspect failures, including repeated409,401,429 or503 responses.
- A successful batch may still report `retrying`, `failed`, or `expired` notices. These counts describe outbox processing, not guaranteed email delivery. Delivery outcomes require the application's signed Resend webhook integration.

45 seconds is below the five-minute schedule and Cloudflare's 15-minute cron wall-time limit. Waiting for network I/O does not count as CPU time; CPU limits still apply (currently 10ms Free, 30 seconds Paid for this schedule). This small caller performs one fetch and parses at most 4KiB. Local checks do not measure live CPU use, availability or deliverability.

## Local validation

Run from the application root using the existing installed dependencies. No package installation is needed.

```powershell
node cloudflare/notification-dispatcher/verify.mjs
node node_modules/typescript/bin/tsc --project cloudflare/notification-dispatcher/tsconfig.json
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js types cloudflare/notification-dispatcher/worker-configuration.d.ts --config cloudflare/notification-dispatcher/wrangler.jsonc --env-interface NotificationDispatcherEnv --include-runtime false --strict-vars false
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js deploy --config cloudflare/notification-dispatcher/wrangler.jsonc --dry-run --outdir dist
```

The verification script replaces every fetch with a local stub. It sends no emails or HTTP requests. Type generation and packaging do not establish that remote secrets, routes, DNS, migrations or cron triggers exist. The generated binding declarations use this project's installed Worker runtime types; rerun generation after changing configuration.

## Operator setup, when ready to activate

1. Release and test the application's authenticated dispatch endpoint and outbox migration first. Verify the actual live database, not the separate own-account database that is not serving the website. Confirm the sender domain, Resend credentials and recipient opt-in are configured in the **application's** runtime.
2. Set `FIRSTSIGNAL_ORIGIN` in `wrangler.jsonc` to the application's exact canonical HTTPS origin, for example `https://app.your-owned-domain.com`. Do not include a trailing slash, credentials, path, query or fragment. The checked-in `.invalid` placeholder fails closed. A redirecting hostname is not accepted; use its final canonical origin.
3. Generate a shared random secret into the ignored file below. The command refuses to overwrite an existing file. Protect the file with your account's file permissions. Load the **same value** into the application's `NOTIFICATION_DISPATCH_SECRET` runtime secret through its hosting settings. Never put the secret in `vars`, command arguments, source, chat or a screenshot.

```powershell
@'
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
writeFileSync('cloudflare/notification-dispatcher/secrets.json', JSON.stringify({
  NOTIFICATION_DISPATCH_SECRET: randomBytes(32).toString('hex'),
}) + '\n', { flag: 'wx', mode: 0o600 });
'@ | node --input-type=module
```

4. Inspect the authenticated account and required Worker deployment permissions. If multiple accounts are available, select the intended account explicitly using `CLOUDFLARE_ACCOUNT_ID`. Review the Worker name, origin, schedule and ignored secret file before activation. This configuration does not create or bind a database.

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js whoami
```

5. **The following command deploys the Worker and activates its five-minute schedule. Run it only when the preceding application setup is complete.** `--secrets-file` installs the shared secret in the same deployment. It does not install a secret in the application.

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js deploy --config cloudflare/notification-dispatcher/wrangler.jsonc --secrets-file cloudflare/notification-dispatcher/secrets.json
```

6. Cron changes may take up to 15 minutes to propagate. Inspect scheduled invocation history and logs, confirm a consenting test recipient's notice progresses through provider submission and its verified delivery event, test opt-out and suppression, and configure an operator alert destination. Avoid manually replaying real notices to test failures. Remove the temporary local secret file once it is securely stored by both runtimes.

To stop future ticks, change `triggers.crons` to `[]` and redeploy this Worker. Allow for propagation and an already-running batch. Keep the shared secret synchronized when rotating it; a mismatch fails closed with401. The caller never automatically retries redirects or expands its batch to drain a backlog.

## References

- [Cron Triggers and propagation](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Scheduled handlers and failed waitUntil tasks](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/)
- [Worker CPU and wall-time limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Runtime secrets and uploading with a deployment](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Generate Worker types](https://developers.cloudflare.com/workers/languages/typescript/)
- [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)

Prepared 19 October 2026 using the project's Wrangler 4.92.0. No scheduler deployment, provider configuration or real email sending was performed when adding this source.
