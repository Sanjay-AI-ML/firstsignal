"use client";
import { ClerkProvider, useAuth } from "@clerk/react";
import { useEffect, useRef, useState } from "react";

function SessionSync({ serverUserId }: { serverUserId: string | null }) {
  const { isLoaded, userId, getToken } = useAuth();
  const syncing = useRef(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!isLoaded || syncing.current) return;
    const marker = "firstsignal-session-refresh";
    if ((userId || null) === serverUserId) { sessionStorage.removeItem(marker); return; }
    if (sessionStorage.getItem(marker) === (userId || "signed-out")) { setFailed(true); return; }
    syncing.current = true;
    void getToken().then(() => { sessionStorage.setItem(marker, userId || "signed-out"); window.location.reload(); }).catch(() => setFailed(true));
  }, [isLoaded, userId, serverUserId, getToken]);
  return failed ? <div className="session-error" role="alert"><span>Your session couldn’t refresh.</span><a href="/signout">Sign in again</a></div> : null;
}
export default function AuthProvider({ children, publishableKey, serverUserId }: { children: React.ReactNode; publishableKey: string; serverUserId: string | null }) {
  if (!publishableKey) return <>{children}</>;
  return <ClerkProvider publishableKey={publishableKey} signInUrl="/signin" signUpUrl="/signup" signInFallbackRedirectUrl="/app" signUpFallbackRedirectUrl="/app" afterSignOutUrl="/signin?signed_out=1" localization={{ signIn: { start: { title: "Sign in to FindIn" } }, signUp: { start: { title: "Create your FindIn account" } } }} appearance={{ elements: { rootBox: { width: "100%" }, card: { padding: "var(--fi-space-6)" }, cardBox: { width: "100%", maxWidth: "440px" }, formFieldInput: { minHeight: "44px", borderColor: "var(--fi-border-strong)", borderRadius: "var(--fi-radius-control)" }, formButtonPrimary: { minHeight: "44px", backgroundImage: "none", boxShadow: "none", borderRadius: "var(--fi-radius-control)" }, socialButtonsBlockButtonText: { fontSize: "0.8125rem" }, socialButtonsBlockButton: { minHeight: "44px", paddingInline: "12px", borderColor: "var(--fi-border-strong)", borderRadius: "var(--fi-radius-control)" }, headerTitle: { color: "var(--fi-text)", fontSize: "var(--fi-type-subsection)" }, headerSubtitle: { color: "var(--fi-text-muted)" } }, variables: { colorPrimary: "#6934b5", fontFamily: "Manrope, Segoe UI, Arial, sans-serif", borderRadius: "12px" } }}><SessionSync serverUserId={serverUserId}/>{children}</ClerkProvider>;
}
