"use client";

import { SignIn, useAuth } from "@clerk/react";
import { useEffect, useState } from "react";

export default function AdminSignInForm() {
  const { isLoaded } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (isLoaded) return;
    const timer = setTimeout(() => setTimedOut(true), 15000);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  return (
    <div className="admin-signin-form">
      {!isLoaded ? (
        <div className="admin-signin-loading" role={timedOut ? "alert" : "status"}>
          {timedOut ? (
            <>
              <p>Sign-in couldn’t load. Please try again.</p>
              <button type="button" onClick={() => window.location.reload()}>
                Try again
              </button>
            </>
          ) : (
            <p>Loading sign-in…</p>
          )}
        </div>
      ) : null}
      <SignIn
        routing="hash"
        forceRedirectUrl="/admin"
        fallbackRedirectUrl="/admin"
        signUpUrl="/admin/signin"
        withSignUp={false}
        transferable={false}
        appearance={{
          elements: {
            footerAction: { display: "none" },
            cardBox: { maxWidth: "100%", boxShadow: "none" },
            card: { boxShadow: "none", padding: "0" },
          },
        }}
      />
    </div>
  );
}
