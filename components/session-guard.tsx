"use client";
import { useEffect } from "react";

// Reload restored documents so Back cannot revive a stale signed-in workspace.
export default function SessionGuard() {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  return null;
}
