"use client";

import { useId } from "react";
import { FileText, FlaskConical, Lightbulb, MessageSquareText } from "lucide-react";
import type { Profile } from "@/lib/data";
import { getProfileCompletion } from "@/lib/profile-completion";
import "./founder-readiness.css";

export type FounderReadinessProps = {
  idea: Profile;
  onEdit?: () => void;
  onTests?: () => void;
  onProgress?: () => void;
};

/** A writing helper based only on filled fields, never an investment assessment. */
export default function FounderReadiness({ idea, onEdit, onTests, onProgress }: FounderReadinessProps) {
  const prefix = useId();
  const completion = getProfileCompletion(idea);
  const next = completion.missing[0];
  return <section className="founder-readiness-card" aria-labelledby={`${prefix}-title`}>
    <div className="readiness-header" style={{ flexWrap: "wrap" }}><div className="readiness-header-left"><span className="readiness-icon" aria-hidden="true"><FileText size={16} /></span><div><span className="readiness-kicker">PROFILE WRITING HELPER</span><h4 id={`${prefix}-title`} className="readiness-title">Make your idea easier to understand.</h4></div></div><span className="readiness-status-badge badge-early">{completion.completed} of {completion.total} sections filled</span></div>
    <p style={{ fontSize: ".75rem", lineHeight: 1.8, color: "var(--fi-text-muted)" }}>This checks whether the main fields contain text. It does not assess their accuracy, customer demand or investment suitability.</p>
    <div className="readiness-recommendation"><div className="recommendation-content" style={{ minWidth: 0, flex: "1 1 180px" }}><Lightbulb size={16} className="recommendation-icon" aria-hidden="true" /><div><strong>{next ? `Next writing step: ${next.label}` : "Your main details are filled in."}</strong><p>{next ? "Add your own information. If something is uncertain or untested, say so." : "Review the details when something changes, and keep open questions clear."}</p></div></div>{onEdit ? <button type="button" className="readiness-action-btn" style={{ minHeight: 44, whiteSpace: "normal" }} onClick={onEdit}>{next ? "Continue writing" : "Review my details"}</button> : null}</div>
    {onTests || onProgress ? <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>{onTests ? <button type="button" className="text-button" style={{ minHeight: 44, display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".75rem" }} onClick={onTests}><FlaskConical size={14} aria-hidden="true" />Plan a small test</button> : null}{onProgress ? <button type="button" className="text-button" style={{ minHeight: 44, display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".75rem" }} onClick={onProgress}><MessageSquareText size={14} aria-hidden="true" />Write a progress update</button> : null}</div> : null}
  </section>;
}
