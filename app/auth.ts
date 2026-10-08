import { headers } from "next/headers";
import { cache } from "react";
import { createClerkClient } from "@clerk/backend";
import { env } from "cloudflare:workers";

const settings = () => env as unknown as Record<string, string>;
export function clerkPublishableKey() { return settings().NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ""; }
export type AppUser = { userId: string; displayName: string; email: string; emailVerified: boolean; fullName: string | null };
export const getAppUser = cache(async (): Promise<AppUser | null> => {
  const secretKey = settings().CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY;
  const publishableKey = clerkPublishableKey();
  if (!secretKey || !publishableKey) return null;
  const origin = settings().FIRSTSIGNAL_ORIGIN || (import.meta.env.DEV ? "http://127.0.0.1:5173" : "");
  if (!origin) throw new Error("Authentication origin is not configured.");
  const requestHeaders = new Headers(await headers());
  // Identity comes exclusively from a verified Clerk session, never hosting headers.
  const clerk = createClerkClient({ secretKey, publishableKey });
  const session = await clerk.authenticateRequest(new Request(`${origin}/app`, { headers: requestHeaders }), {
    // Backend-generated development QA sessions omit azp. Only a local runtime
    // using test keys accepts them; every hosted runtime requires its exact origin.
    authorizedParties: secretKey.startsWith("sk_test_") && /^http:\/\/(127\.0\.0\.1|localhost):/.test(origin) ? undefined : [origin],
    acceptsToken: "session_token",
  });
  if (!session.isAuthenticated) {
    if (requestHeaders.has("authorization") || requestHeaders.get("cookie")?.includes("__session=")) console.warn("Clerk rejected session:", session.reason);
    return null;
  }
  const identity = session.toAuth();
  if (!identity.userId) return null;
  const account = await clerk.users.getUser(identity.userId);
  const email = account.emailAddresses.find(address => address.id === account.primaryEmailAddressId)?.emailAddress || "";
  const fullName = [account.firstName, account.lastName].filter(Boolean).join(" ") || null;
  const emailVerified = account.emailAddresses.find(address => address.id === account.primaryEmailAddressId)?.verification?.status === 'verified';
  return { userId: `clerk:${account.id}`, displayName: fullName || account.username || email || "Member", email, emailVerified, fullName };
});

export function safeDestination(value: string, fallback = "/app") {
  try {
    const url = new URL(value, "https://app.local");
    if (!value.startsWith("/") || url.origin !== "https://app.local" || /^\/(signin|signup|signout)(\/|$)/.test(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return fallback; }
}
