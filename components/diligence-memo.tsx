"use client";

import { useId, useState } from "react";
import { Check, Copy, Download, NotebookPen } from "lucide-react";
import { formatINR, type Profile } from "@/lib/data";
import { sectorName } from "@/lib/sectors";
import "./diligence-memo.css";

export type DiligenceMemoProps = { profile: Profile };

export function profileMemoFacts(profile: Profile) {
  const startup = profile.kind === "startup";
  return [
    { label: "Profile", value: `${profile.name} · ${sectorName(profile)} · ${profile.stage} · ${profile.city}` },
    { label: startup ? "Ideology, as stated" : "Investment interests, as stated", value: (startup ? profile.problem : profile.solution) || "Not stated." },
    { label: startup ? "Proposed solution, as stated" : "Evidence sought, as stated", value: (startup ? profile.solution : profile.requiredEvidence || profile.validation) || "Not stated." },
    { label: startup ? "Planning budget, as stated" : "Preferred range, as stated", value: startup ? profile.fundingIntentINR > 0 ? formatINR(profile.fundingIntentINR) : "Not stated." : profile.checkRangeINR?.length === 2 ? `${formatINR(profile.checkRangeINR[0])}–${formatINR(profile.checkRangeINR[1])}` : "Not stated." },
    { label: startup ? "Next step, as stated" : "Availability, as stated", value: (startup ? profile.nextMilestone : profile.uncertainty) || "Not stated." },
  ];
}

export function personalReviewTopics(kind: Profile["kind"]) {
  return kind === "startup" ? [
    "Read the founder’s stated background and note what to ask about.",
    "Compare the proposed solution with the problem described.",
    "Read the learning and identify its source, limits and remaining uncertainty.",
    "Ask how the planning budget relates to the next test.",
    "Discuss the purpose of a conversation and each person’s expectations.",
  ] : [
    "Read the investor’s stated sector and stage interests.",
    "Discuss their preferred range and any conditions.",
    "Ask what information they need and how their review works.",
    "Clarify availability, involvement and expectations for a conversation.",
  ];
}

export function personalMemoMarkdown(profile: Profile, reviewed: readonly boolean[], notes: string) {
  const facts = profileMemoFacts(profile), topics = personalReviewTopics(profile.kind);
  return [`# Personal conversation memo: ${profile.name}`, "", profile.demo ? "Fictional profile. All example statements are illustrative." : "Profile statements are member-reported and have not been independently checked by FindIn.", "", "## Stated profile information", ...facts.map(fact => `- **${fact.label}:** ${fact.value}`), "", "## My personal review checklist", "These marks record the writer’s own review; they are not verification or an investment assessment.", ...topics.map((topic, index) => `- [${reviewed[index] ? "x" : " "}] ${topic}`), "", "## My notes and questions", notes.trim() || "No notes entered.", "", "Exported from a browser-only planning panel. This memo is not saved in FindIn or sent to the profile owner. No funding or legal commitment is made."].join("\n");
}

function PersonalMemo({ profile }: DiligenceMemoProps) {
  const prefix = useId(), topics = personalReviewTopics(profile.kind), facts = profileMemoFacts(profile);
  const [reviewed, setReviewed] = useState<boolean[]>(() => topics.map(() => false));
  const [notes, setNotes] = useState(""), [copied, setCopied] = useState(false), [status, setStatus] = useState("");
  const copy = async () => {
    try { await navigator.clipboard.writeText(personalMemoMarkdown(profile, reviewed, notes)); setCopied(true); setStatus("Personal memo copied. Keep a copy before closing this panel."); }
    catch { setCopied(false); setStatus("Copy is unavailable. Download your memo instead."); }
  };
  const download = () => {
    try {
      const url = URL.createObjectURL(new Blob([personalMemoMarkdown(profile, reviewed, notes)], { type: "text/markdown;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = `findin-personal-memo-${profile.id.replace(/[^a-z0-9-]/gi, "-")}.md`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); setStatus("Personal memo downloaded. It has not been saved to your account or sent.");
    } catch { setStatus("Download is unavailable. Copy your notes before closing the panel."); }
  };
  return <section className="diligence-memo-container" aria-labelledby={`${prefix}-heading`}>
    <header className="diligence-memo-heading"><NotebookPen size={21} aria-hidden="true" /><div><span>YOUR PERSONAL REVIEW</span><h3 id={`${prefix}-heading`}>Conversation notes for {profile.name}</h3></div></header>
    <p className="diligence-memo-intro">Read the stated information and prepare your own questions. Filled profile fields are not proof of accuracy or suitability.</p>
    <details className="diligence-memo-facts"><summary>Read the stated profile information</summary><dl>{facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl><p>{profile.demo ? "Fictional profile information." : "Member-reported information. FindIn has not checked these statements."}</p></details>
    <fieldset className="diligence-memo-topics"><legend>Topics I have reviewed</legend><p>All items start unchecked. Marking one reflects your own review, not a platform assessment.</p>{topics.map((topic, index) => <label key={topic} htmlFor={`${prefix}-${index}`}><input type="checkbox" id={`${prefix}-${index}`} checked={reviewed[index]} onChange={event => { setReviewed(previous => previous.map((value, position) => position === index ? event.target.checked : value)); setCopied(false); }} /><span>{topic}</span></label>)}</fieldset>
    <div className="diligence-memo-notes"><label htmlFor={`${prefix}-notes`}>My notes and questions</label><textarea id={`${prefix}-notes`} value={notes} rows={4} maxLength={2000} onChange={event => { setNotes(event.target.value); setCopied(false); }} placeholder="What would you like to clarify in a first conversation?" aria-describedby={`${prefix}-privacy`} /><p id={`${prefix}-privacy`}>Only in this open browser panel. These notes and checklist marks are not saved to your account or shared. Copy or download them before closing or switching profiles.</p></div>
    <div className="diligence-memo-actions"><button type="button" className="outline-button" onClick={() => void copy()}>{copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copied ? "Copy again" : "Copy personal memo"}</button><button type="button" className="text-button" onClick={download}><Download size={15} aria-hidden="true" />Download (.md)</button></div>{status ? <p className="diligence-memo-status" role="status">{status}</p> : null}
  </section>;
}

/** Notes/checklist state cannot carry from one selected profile into another. */
export default function DiligenceMemo({ profile }: DiligenceMemoProps) { return <PersonalMemo key={profile.id} profile={profile} />; }
