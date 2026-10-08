"use client";
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body><main style={{ maxWidth: 480, margin: "20vh auto", padding: 24, fontFamily: "system-ui" }} role="alert"><h1>FirstSignal is temporarily unavailable.</h1><p>Please try again.</p><button onClick={reset}>Try again</button><p><a href="/">Back to home</a></p></main></body></html>;
}
