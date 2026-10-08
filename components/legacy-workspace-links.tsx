"use client";
import { useEffect } from "react";
export default function LegacyWorkspaceLinks() {
  useEffect(() => {
    const preserveDestination = () => {
      if (["#discover", "#saved", "#introductions", "#profiles", "#research"].includes(location.hash) || new URLSearchParams(location.search).has("profile")) location.replace("/app" + location.search + location.hash);
    };
    preserveDestination();
    addEventListener("hashchange", preserveDestination);
    return () => removeEventListener("hashchange", preserveDestination);
  }, []);
  return null;
}
