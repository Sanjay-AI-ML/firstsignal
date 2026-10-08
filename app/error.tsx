"use client";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="account-status" id="main-content"><div role="alert"><h1>This page couldn’t load.</h1><p>Please try again.</p><button className="outline-button" onClick={reset}>Try again</button><a className="signin-read" href="/">Back to home</a></div></main>;
}
