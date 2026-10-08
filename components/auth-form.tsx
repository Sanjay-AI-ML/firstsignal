"use client";
import { SignIn, SignUp, useAuth, useClerk } from "@clerk/react";
import { useEffect, useRef, useState } from "react";
export function AuthForm({ destination, signup = false }: { destination: string; signup?: boolean }) {
  const { isLoaded } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => { if (isLoaded) return; const timer = setTimeout(() => setTimedOut(true), 15000); return () => clearTimeout(timer); }, [isLoaded]);
  const query = `?return_to=${encodeURIComponent(destination)}`;
  return <div className="auth-form">{!isLoaded ? <div className="auth-loading" role={timedOut ? "alert" : "status"}>{timedOut ? <><p>Sign-in couldn’t load.</p><button className="outline-button" onClick={() => window.location.reload()}>Try again</button></> : <p>Loading sign-in…</p>}</div> : null}{signup ? <SignUp routing="hash" signInUrl={`/signin${query}`} forceRedirectUrl={destination}/> : <SignIn routing="hash" signUpUrl={`/signup${query}`} forceRedirectUrl={destination}/>}</div>;
}
export function SignOutButton() {
  const { signOut } = useClerk();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return <><button className="signin-read" disabled={busy} onClick={() => { setBusy(true); setError(false); void signOut({ redirectUrl: "/signin?signed_out=1" }).catch(() => { setBusy(false); setError(true); }); }}>{busy ? "Signing out…" : "Sign out"}</button>{error ? <p role="alert">Sign-out failed. Please try again.</p> : null}</>;
}
export function SignOutPage() {
  const { signOut, loaded } = useClerk();
  const [error, setError] = useState(false);
  const started = useRef(false);
  useEffect(() => { if (loaded && !started.current) { started.current = true; void signOut({ redirectUrl: "/signin?signed_out=1" }).catch(() => setError(true)); } }, [loaded, signOut]);
  return <main id="main-content" className="account-status"><div role={error ? "alert" : "status"}><h1>{error ? "Sign-out failed." : "Signing out…"}</h1>{error ? <SignOutButton/> : null}<a className="signin-read" href="/signin">Back to sign in</a></div></main>;
}
