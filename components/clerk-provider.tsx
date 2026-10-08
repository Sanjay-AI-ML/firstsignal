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
  return <ClerkProvider publishableKey={publishableKey} signInUrl="/signin" signUpUrl="/signup" signInFallbackRedirectUrl="/app" signUpFallbackRedirectUrl="/app" afterSignOutUrl="/signin?signed_out=1" localization={{ signIn: { start: { title: "Sign in to FirstSignal" } }, signUp: { start: { title: "Create your FirstSignal account" } } }} appearance={{ elements: { rootBox: { width: "100%" }, cardBox: { width: "100%", maxWidth: "440px" } }, variables: { colorPrimary: "#6940a6", borderRadius: "12px" } }}><SessionSync serverUserId={serverUserId}/>{children}</ClerkProvider>;
}
