import fs from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { createClerkClient } from '@clerk/backend';

// Resolve an explicitly supplied, verified existing account. Never infer the
// operator from signup order, display name, or editable profile information.
const args = process.argv.slice(2);
const emailIndex = args.indexOf('--email');
const email = emailIndex >= 0 ? args[emailIndex + 1]?.trim().toLowerCase() : '';
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || args.some((arg, index) => index !== emailIndex + 1 && !['--email', '--write-local'].includes(arg))) {
  throw new Error('Usage: node scripts/configure-admin.mjs --email your-sign-in-email [--write-local]');
}
const localPath = new URL('../.env.local', import.meta.url);
let original = '';
try { original = await fs.readFile(localPath, 'utf8'); loadEnvFile(localPath); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!process.env.CLERK_SECRET_KEY) throw new Error('Configure the existing Clerk secret in .env.local first.');
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const result = await clerk.users.getUserList({ emailAddress: [email], limit: 10 });
const matches = result.data.filter(user => user.emailAddresses.some(address =>
  address.id === user.primaryEmailAddressId && address.emailAddress.toLowerCase() === email && address.verification?.status === 'verified'
));
if (matches.length !== 1 || result.totalCount > 10) throw new Error('A unique existing account with this verified primary email was not found. Sign in and confirm the address first.');
const id = matches[0].id;
if (!/^user_[A-Za-z0-9]+$/.test(id)) throw new Error('Unexpected Clerk user ID format.');
if (args.includes('--write-local')) {
  const configured = process.env.FINDIN_ADMIN_USER_ID?.trim();
  if (configured && configured !== id) throw new Error('A different owner is already configured. Review the existing configuration before replacing it.');
  const line = `FINDIN_ADMIN_USER_ID=${id}`;
  const next = /^FINDIN_ADMIN_USER_ID=.*$/m.test(original)
    ? original.replace(/^FINDIN_ADMIN_USER_ID=.*$/m, line)
    : `${original.replace(/\s*$/, '')}\n\n# Owner-only admin access\n${line}\n`;
  await fs.writeFile(localPath, next, { mode: 0o600 });
}
console.log(JSON.stringify({ clerkUserId: id, verifiedPrimaryEmail: true, localConfigured: args.includes('--write-local'), hostingConfigurationRequired: true }));
