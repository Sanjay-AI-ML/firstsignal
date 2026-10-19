"use client";

import { useId, useState } from "react";
import { ClipboardList, FileQuestion } from "lucide-react";
import type { Profile } from "@/lib/data";
import "./virtual-data-room.css";

export function preparationTopics(kind: Profile["kind"]) {
  return kind === "startup" ? [
    { title: "A short description of the idea", detail: "Prepare the problem, proposed solution and the assumptions still to test." },
    { title: "Context for customer learning", detail: "If you share interview notes, trial results or other material, remove personal details and confirm permission first." },
    { title: "Budget assumptions", detail: "Explain how the next test would use the budget and what could change the estimate." },
    { title: "Ownership and company details, where applicable", detail: "Discuss the actual ownership and company status. An idea-stage project may not be incorporated." },
  ] : [
    { title: "Your stated investment interests", detail: "Clarify sectors, stages and any limits or exclusions before a founder prepares material." },
    { title: "Your preferred investment range", detail: "Explain the range you want to discuss and whether you are considering an investment personally or for an organisation." },
    { title: "Your review process", detail: "Discuss who decides, what information is needed and how long a response may take." },
    { title: "Permission to share information", detail: "Agree on the intended audience before either participant sends sensitive material." },
  ];
}

function Preparation({ profile }: { profile: Profile }) {
  const prefix = useId();
  const [prepared, setPrepared] = useState<Record<string, boolean>>({});
  const topics = preparationTopics(profile.kind);
  const companyStatus = profile.kind === "startup" ? (profile.incorporationStatus || "").trim() : "";
  return <section className="virtual-data-room" aria-labelledby={`${prefix}-heading`}>
    <header className="vdr-preparation-heading"><ClipboardList size={21} aria-hidden="true" /><div><span>PREPARE FOR THE CONVERSATION</span><h3 id={`${prefix}-heading`}>Information to discuss</h3></div></header>
    <p className="vdr-preparation-intro">Use this personal checklist when preparing a conversation about {profile.name}. Ticking an item records your own preparation in this open panel.</p>
    {profile.demo ? <p className="vdr-context-note">This profile is fictional. These are example preparation topics, not submitted documents.</p> : <p className="vdr-context-note">This profile’s information is member-reported. FindIn has not checked it.</p>}
    {profile.kind === "startup" ? <dl className="vdr-stated-context"><div><dt>Company status stated on the profile</dt><dd>{companyStatus || "No company status stated."}</dd></div><div><dt>What the budget covers, as stated</dt><dd>{profile.budget || "No budget explanation stated."}</dd></div></dl> : <dl className="vdr-stated-context"><div><dt>Evidence the investor says they want</dt><dd>{profile.requiredEvidence || profile.validation || "No evidence expectations stated."}</dd></div><div><dt>Availability stated on the profile</dt><dd>{profile.uncertainty || "No availability stated."}</dd></div></dl>}
    <ul className="vdr-preparation-topics">{topics.map((topic, index) => <li key={topic.title}><label htmlFor={`${prefix}-${index}`}><input type="checkbox" id={`${prefix}-${index}`} checked={!!prepared[topic.title]} onChange={event => setPrepared(previous => ({ ...previous, [topic.title]: event.target.checked }))} /><span><strong>{topic.title}</strong><span>{topic.detail}</span></span></label></li>)}</ul>
    <p className="vdr-preparation-limit"><FileQuestion size={16} aria-hidden="true" /><span>This is a preparation checklist, not a file vault or document review. No files are stored here. Selections are not saved to your account or shared with {profile.name}. They reset when the panel closes.</span></p>
  </section>;
}

/** Keep checklist state separate when the selected profile changes. */
export default function VirtualDataRoom({ profile }: { profile: Profile }) {
  return <Preparation key={profile.id} profile={profile} />;
}
