"use client";

import { Check, ArrowUpRight } from "lucide-react";
import type { Profile } from "@/lib/data";
import { getProfileCompletion } from "@/lib/profile-completion";
import "./profile-editor.css";

export default function ProfileCompletion({ profile, onEdit }: {
  profile: Profile;
  onEdit: () => void;
}) {
  const completion = getProfileCompletion(profile);
  return (
    <section className="profile-completion" aria-label={`Profile guidance for ${profile.name}`}>
      <div className="completion-heading">
        <strong>{completion.completed} of {completion.total} profile sections filled</strong>
        <span>{completion.missing.length ? "Build a clearer picture" : "Writing checklist filled"}</span>
      </div>
      <progress value={completion.completed} max={completion.total} aria-label="Profile sections filled" />
      {completion.missing.length ? (
        <>
          <p>Next: {completion.missing.slice(0, 2).map(item => item.label.toLowerCase()).join("; ")}.</p>
          <button type="button" className="text-button" onClick={onEdit}>Continue your profile <ArrowUpRight size={15} aria-hidden="true" /></button>
        </>
      ) : <p className="completion-finished"><Check size={15} aria-hidden="true" />Keep your evidence and availability current.</p>}
      <small>A writing checklist. Claims remain self-reported.</small>
    </section>
  );
}
