import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { clerkPublishableKey, getAppUser, safeDestination } from "../auth";
import { AuthForm, SignOutButton } from "../../components/auth-form";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in · FirstSignal" };
export default async function SignInPage({ searchParams, signup = false }: { searchParams: Promise<{ return_to?: string | string[]; signed_out?: string | string[] }>; signup?: boolean }) {
  const params = await searchParams;
  const destination = safeDestination(typeof params.return_to === "string" ? params.return_to : "/app");
  const user = await getAppUser();
  return <main className="signin-page" id="main-content">
    <section className="signin-story" aria-label="About FirstSignal">
      <a href="/" className="brand"><img src="/firstsignal-logo.png" width="36" height="36" alt=""/>FirstSignal</a>
      <div className="signin-story-copy"><h1>Your next connection<br/>starts here.</h1><p>Share your progress. Meet founders and investors.</p></div>
    </section>
    <section className="signin-form-side">
      <a className="signin-back" href="/"><ArrowLeft size={16}/>Back to home</a>
      <div className="signin-panel">
        {params.signed_out === "1" && !user ? <div className="notice signin-signed-out" role="status"><Check size={17}/><span>You’re signed out.</span></div> : null}
        {user ? <><h2>Welcome back.</h2><p>{user.displayName}</p><a className="signin-continue" href={destination}>Continue<ArrowRight size={18}/></a><SignOutButton/></> : clerkPublishableKey() ? <AuthForm destination={destination} signup={signup}/> : <div role="alert"><h2>Sign-in is unavailable.</h2><p>Please try again later.</p></div>}
      </div>
      <nav className="signin-footer" aria-label="Account help"><a href="/app">Explore FirstSignal</a><a href="/privacy">Privacy</a></nav>
    </section>
  </main>;
}
