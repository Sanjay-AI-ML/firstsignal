"use client";
import { ArrowUpRight, Bookmark, Check, Clock, Columns3, FileText, FlaskConical, Handshake, MapPin } from "lucide-react";
import { formatINR, initials, type Intro, type Profile } from "@/lib/data";
import { sectorName } from "@/lib/sectors";
import { relationshipLabel } from "@/lib/workspace-actions";
import ProjectIcon from "./project-icon";

export default function OpportunityCard({ profile: p, saved, selected, busy, relationship, onSave, onCompare, onOpen, onContact, onEdit }: {
  profile: Profile; saved: boolean; selected: boolean; busy: boolean; relationship?: Intro;
  onSave: () => void; onCompare: () => void; onOpen: () => void; onContact: () => void; onEdit: () => void;
}) {
  const founder = p.kind === "startup";
  const amount = !founder && p.checkRangeINR?.length === 2
    ? `${formatINR(p.checkRangeINR[0])}–${formatINR(p.checkRangeINR[1])}`
    : p.fundingIntentINR > 0 ? formatINR(p.fundingIntentINR) : "Not shared";
  const summary = p.solution || (founder ? "A proposed solution has not been added." : p.experience);
  return <article className={`opportunity-card${selected ? " is-compared" : ""}`}>
    <div className="opportunity-identity">{founder ? <ProjectIcon project={p} /> : <span className="opportunity-avatar" aria-hidden="true">{initials(p.name)}</span>}<div><button className="opportunity-name" onClick={onOpen}>{p.name}<ArrowUpRight size={14} aria-hidden="true"/></button><div className="opportunity-location"><MapPin size={12} aria-hidden="true"/>{p.city}<span>·</span><span className={p.demo ? "profile-source sample" : "profile-source"}>{p.demo ? "Fictional sample" : p.mine && !p.listed ? "Your private profile" : "Member profile"}</span></div></div><button className="opportunity-save" disabled={busy} aria-label={`${saved ? "Unsave" : "Save"} ${p.name}`} aria-pressed={saved} onClick={onSave}><Bookmark size={17} fill={saved ? "currentColor" : "none"}/></button></div>
    <div className="opportunity-story"><div className="opportunity-tags"><span>{sectorName(p)}</span><span>{founder ? p.stage : "Investor"}</span>{founder && p.updates?.length ? <span className="opportunity-signal-tag" title={`${p.updates.length} progress ${p.updates.length === 1 ? "update" : "updates"} recorded`}><FlaskConical size={11} aria-hidden="true" /> {p.updates.length} {p.updates.length === 1 ? "update" : "updates"}</span> : null}{founder && p.evidenceDate ? <span className="opportunity-signal-tag" title={`${p.demo ? "Fictional example date" : "Date supplied by the member"}: ${p.evidenceDate}`}><Clock size={11} aria-hidden="true" /> {p.evidenceDate}</span> : null}</div><h3>{p.tagline || p.name}</h3>{summary && summary.trim() !== p.tagline?.trim() ? <p className="opportunity-summary">{summary}</p> : null}<div className="opportunity-learning"><FileText size={14} aria-hidden="true"/><p><span>{founder ? "Learning" : "Looks for"}</span>{(founder ? p.validation : p.requiredEvidence || p.validation)?.replace(/^Founder-reported:\s*/, "") || "Not added yet. Ask about this before connecting."}</p></div><p className="opportunity-next"><span>Next step</span>{p.nextMilestone || "Ask what they want to work on next."}</p></div>
    <div className="opportunity-decision"><div className="opportunity-amount"><div className="flex items-center gap-1.5 flex-wrap"><span>{founder ? "Planning budget" : "Preferred investment"}</span></div><strong>{amount}</strong><small title={p.demo ? "Fictional sample data for preview" : "This amount is supplied by the member and has not been independently checked."}>{p.demo ? "Illustrative details" : "Self-reported · Unverified"}</small></div><div className="opportunity-actions"><button className="outline-button" onClick={onOpen} aria-label={`View ${p.name}`}>View profile<ArrowUpRight size={14} aria-hidden="true"/></button><button className="text-button" disabled={busy} onClick={p.mine ? onEdit : onContact}><Handshake size={14} aria-hidden="true"/>{p.mine ? "Edit my profile" : relationship ? relationshipLabel(relationship) : p.demo ? "Practice introduction" : "Request introduction"}</button></div></div>
    <label className="opportunity-compare"><input type="checkbox" checked={selected} onChange={onCompare} aria-label={`Compare ${p.name}`}/>{selected ? <Check size={14} aria-hidden="true"/> : <Columns3 size={14} aria-hidden="true"/>}<span>{selected ? "Added to comparison" : "Compare"}</span></label>
  </article>;
}
