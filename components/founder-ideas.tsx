"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, Eye, EyeOff, LockKeyhole, MessageSquareText, Pencil, Plus, Search, X } from "lucide-react";
import type { Profile, WorkspaceData } from "@/lib/data";
import { getProfileCompletion } from "@/lib/profile-completion";
import { sectorName } from "@/lib/sectors";
import ProjectIcon from "./project-icon";
import ProgressUpdates from "./progress-updates";
import "./founder-ideas.css";

export type FounderIdeasProps = {
  ideas: Profile[];
  busy: boolean;
  onCreate: () => void;
  onEdit: (idea: Profile) => void;
  onPreview: (idea: Profile) => void;
  onWrite: (payload: unknown) => Promise<WorkspaceData>;
  progressStarter?: boolean;
};

function editedDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;
}

/** Founder account identity is separate from each independently saved idea. */
export default function FounderIdeas({ ideas, busy, onCreate, onEdit, onPreview, onWrite, progressStarter = false }: FounderIdeasProps) {
  const [query, setQuery] = useState("");
  const [progressId, setProgressId] = useState(progressStarter ? ideas[0]?.id ?? "" : "");
  const [progressDirty, setProgressDirty] = useState(false);
  const [pendingProgress, setPendingProgress] = useState<string | null>(null);
  const starterUsed = useRef(progressStarter && !!ideas[0]);
  const prefix = useId();
  const founderIdeas = ideas.filter(idea => idea.kind === "startup");
  const activeIdea = founderIdeas.find(idea => idea.id === progressId);
  const normalized = query.trim().toLocaleLowerCase();
  const visible = founderIdeas.filter(idea => [idea.name, idea.tagline, sectorName(idea), idea.stage].join(" ").toLocaleLowerCase().includes(normalized));

  useEffect(() => {
    if (!progressStarter) { starterUsed.current = false; return; }
    if (!starterUsed.current && ideas.length) {
      starterUsed.current = true;
      setProgressId(ideas.find(idea => idea.kind === "startup")?.id ?? "");
    }
  }, [progressStarter, ideas]);

  const chooseProgress = (nextId: string) => {
    if (progressDirty) { setPendingProgress(nextId); return; }
    setProgressId(nextId); setPendingProgress(null);
  };
  const saveProgress = async (payload: unknown) => {
    const result = await onWrite(payload);
    if (payload && typeof payload === "object" && "action" in payload && payload.action === "progress") setProgressDirty(false);
    return result;
  };

  return <section className="founder-ideas" aria-labelledby={`${prefix}-heading`}>
    <div className="founder-ideas-heading"><div><h2 id={`${prefix}-heading`}>All ideas <span>{founderIdeas.length}</span></h2><p>Create something new, or pick up an idea below.</p></div><button type="button" className="primary-button" disabled={busy} onClick={onCreate}><Plus size={17} aria-hidden="true" />Add an idea</button></div>
    {founderIdeas.length ? <>
      {founderIdeas.length > 3 || query ? <div className="founder-ideas-search"><Search size={17} aria-hidden="true" /><label htmlFor={`${prefix}-search`} className="sr-only">Search your ideas</label><input id={`${prefix}-search`} value={query} onChange={event => setQuery(event.target.value)} maxLength={100} placeholder="Search your ideas by name, sector or stage" />{query ? <button type="button" aria-label="Clear idea search" onClick={() => setQuery("")}><X size={17} aria-hidden="true" /></button> : null}</div> : null}
      <div className="founder-ideas-list">{visible.map(idea => {
        const completion = getProfileCompletion(idea);
        const hidden = !!idea.moderation?.hidden;
        const lastEdit = editedDate(idea.updated);
        const expanded = activeIdea?.id === idea.id;
        const VisibilityIcon = hidden ? EyeOff : idea.listed ? Eye : LockKeyhole;
        return <article className="founder-idea-card" key={idea.id} data-progress-open={expanded || undefined} aria-labelledby={`${prefix}-${idea.id}-name`}>
          <div className="founder-idea-identity"><ProjectIcon project={idea} /><div><h3 id={`${prefix}-${idea.id}-name`}>{idea.name}</h3><p>{sectorName(idea)}<span aria-hidden="true"> · </span>{idea.stage}</p></div><span className={`founder-idea-visibility${hidden ? " is-removed" : idea.listed ? " is-public" : ""}`}><VisibilityIcon size={13} aria-hidden="true" />{hidden ? "Removed" : idea.listed ? "Public" : "Private draft"}</span></div>
          <p className="founder-idea-summary">{idea.tagline || "Add a short introduction to this idea."}</p>
          {hidden ? <p className="founder-idea-restriction"><EyeOff size={16} aria-hidden="true" /><span><strong>This idea is hidden from discovery.</strong>{idea.moderation?.reason ? ` ${idea.moderation.reason}` : " Review the idea’s details for the moderation reason."} Editing it does not restore its listing.</span></p> : null}
          <div className="founder-idea-checklist"><div><span>Writing checklist</span><strong>{completion.completed} of {completion.total} sections</strong></div><progress aria-label={`Writing checklist for ${idea.name}`} value={completion.completed} max={completion.total} /><p>{completion.missing.length ? `Next: ${completion.missing[0].label}` : "Your idea’s main details are filled in."}</p></div>
          <div className="founder-idea-meta"><span>{idea.updates.length} progress {idea.updates.length === 1 ? "update" : "updates"}</span>{lastEdit ? <span>Edited <time dateTime={idea.updated}>{lastEdit}</time></span> : null}</div>
          <div className="founder-idea-actions"><button type="button" className="outline-button" disabled={busy} onClick={() => onEdit(idea)} aria-label={`Edit ${idea.name}`}><Pencil size={15} aria-hidden="true" />Edit idea</button><button type="button" className="text-button" onClick={() => onPreview(idea)} aria-label={`Preview ${idea.name}`}>Preview<ArrowUpRight size={15} aria-hidden="true" /></button><button type="button" className="text-button" disabled={busy} onClick={() => chooseProgress(expanded ? "" : idea.id)} aria-expanded={expanded} aria-controls={`${prefix}-progress`} aria-label={`${expanded ? "Close" : "Manage"} progress for ${idea.name}`}><MessageSquareText size={15} aria-hidden="true" />Progress</button></div>
        </article>;
      })}</div>
      {!visible.length ? <div className="founder-ideas-empty"><Search size={25} aria-hidden="true" /><h3>No ideas match this search.</h3><p>Try another name, sector or stage.</p><button type="button" className="outline-button" onClick={() => setQuery("")}>Clear search</button></div> : null}
      <p className="founder-ideas-footnote">Each idea is saved on its own. Edit an idea to change its visibility. The writing checklist shows filled details, not verification or investment readiness.</p>
    </> : <div className="founder-ideas-empty"><ProjectIcon project={{ sector: "Other" }} size="lg" /><h3>Start with your first idea.</h3><p>Save it privately, then add another whenever you have something new to explore.</p><button type="button" className="outline-button" disabled={busy} onClick={onCreate}><Plus size={16} aria-hidden="true" />Create my first idea</button></div>}
    {activeIdea ? <div className="founder-idea-progress" id={`${prefix}-progress`}>
      <div className="founder-idea-progress-heading"><div><ProjectIcon project={activeIdea} size="sm" /><h3>Progress for {activeIdea.name}</h3></div><button type="button" className="text-button" disabled={busy} onClick={() => chooseProgress("")}>Close<span className="sr-only"> progress for {activeIdea.name}</span><X size={15} aria-hidden="true" /></button></div>
      {pendingProgress !== null ? <div className="founder-idea-draft-guard" role="alert"><p><strong>Keep your unfinished progress update?</strong> Switching ideas or closing this panel will discard the text you have not saved.</p><div><button type="button" className="outline-button" onClick={() => setPendingProgress(null)}>Keep editing</button><button type="button" className="text-button" onClick={() => { setProgressId(pendingProgress); setProgressDirty(false); setPendingProgress(null); }}>Discard draft and {pendingProgress ? "switch" : "close"}</button></div></div> : null}
      <div onChangeCapture={() => setProgressDirty(true)}><ProgressUpdates key={activeIdea.id} profile={activeIdea} busy={busy} onWrite={saveProgress} starter={progressStarter} /></div>
    </div> : null}
  </section>;
}
