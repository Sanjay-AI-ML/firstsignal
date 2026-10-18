import { env } from 'cloudflare:workers';
import type { AppUser } from '@/app/auth';

function configuredOwner() {
  // Only a deployment secret can grant access. Display names, emails, browser
  // state and user-editable Clerk metadata are never authorization inputs.
  const id = (env as unknown as Record<string, string | undefined>).FINDIN_ADMIN_USER_ID;
  return id && /^user_[A-Za-z0-9]+$/.test(id) ? id : null;
}

export function isAdminConfigured() { return configuredOwner() !== null; }
export function isAdminAccount(user: AppUser | null | undefined) {
  const owner = configuredOwner();
  return !!owner && !!user && user.userId === `clerk:${owner}`;
}
