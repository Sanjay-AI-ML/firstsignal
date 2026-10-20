import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
// These historical scripts need a running loopback server or create real Clerk
// development accounts. They are deliberately not part of provider-free CI.
const excluded = new Map([
  ['verify-clerk-workflows.mjs', 'creates external development accounts; requires explicit QA setup'],
  ['verify-workflows.mjs', 'requires a running local Worker and verified development tokens'],
  ['verify-local-auth.mjs', 'obsolete mock-auth routes; not the current Clerk login flow'],
]);
const files = readdirSync(new URL('./', import.meta.url)).filter(name => /^verify-[a-z0-9-]+\.mjs$/.test(name)).sort();
let failures = 0, executed = 0;
for (const file of files) {
  if (excluded.has(file)) { console.log(`EXCLUDED ${file}: ${excluded.get(file)}`); continue; }
  if (!readFileSync(new URL(file, import.meta.url), 'utf8').trim()) { executed++; failures++; console.error(`FAIL ${file} (empty verification file)`); continue; }
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(file, import.meta.url))], {
    cwd: root, encoding: 'utf8', timeout: 120_000, maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_CF_FETCH_ENABLED: 'false' },
  });
  executed++;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.status !== 0 || result.error) {
    failures++;
    console.error(`FAIL ${file}${result.error ? ` (${result.error.code ?? 'execution error'})` : ''}`);
    if (result.stderr) process.stderr.write(result.stderr);
  } else console.log(`PASS ${file}`);
}
console.log(`Regression suites: ${executed - failures}/${executed} passed; ${excluded.size} environment-dependent or obsolete scripts excluded.`);
if (executed === 0 || failures > 0) process.exitCode = 1;
