"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { FileText, Handshake } from "lucide-react";
import { setupSignIn } from "@/lib/onboarding-intent";

export default function MarketingEntry() {
  const [role, setRole] = useState<"founder" | "investor">("founder");
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "founder" : event.key === "End" ? "investor" : role === "founder" ? "investor" : "founder";
    setRole(next); buttons.current[next === "founder" ? 0 : 1]?.focus();
  };
  return <div className="marketing-entry">
    <div className="marketing-entry-tabs" role="tablist" aria-label="Your starting point">
      {(["founder", "investor"] as const).map((value, index) => <button key={value} type="button" role="tab" id={`${id}-${value}`} aria-selected={role === value} aria-controls={`${id}-panel`} tabIndex={role === value ? 0 : -1} ref={element => { buttons.current[index] = element; }} onClick={() => setRole(value)} onKeyDown={keyboard}>
        {value === "founder" ? <FileText size={17} aria-hidden="true" /> : <Handshake size={17} aria-hidden="true" />}I’m {value === "founder" ? "a founder" : "an investor"}
      </button>)}
    </div>
    <div className="marketing-entry-panel" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${role}`} tabIndex={0}>
      <p>{role === "founder" ? "Shape your idea, share what you’re learning and find investors with relevant interests." : "Set your interests, follow early projects and choose which founders to meet."}</p>
      <div className="marketing-entry-actions"><a className="marketing-primary" href={setupSignIn(role)}>{role === "founder" ? "Start your founder profile" : "Start your investor profile"}</a><a className="marketing-quiet-link" href={role === "founder" ? "/app#discover" : "#investors"}>{role === "founder" ? "Explore first" : "See how it works for investors"}</a></div>
      <span className="marketing-entry-note">Your profile starts private. One account can have both roles.</span>
    </div>
  </div>;
}
