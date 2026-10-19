"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, CheckCheck, CircleHelp, Eye, FlaskConical, LockKeyhole, MessageCircle, MousePointer2, Pencil, Play, Plus, RefreshCw, Sprout, Trash2, Wallet, X } from "lucide-react";
import type { Profile } from "@/lib/data";
import type { Experiment, ExperimentPlan, ExperimentResult } from "@/lib/experiments";
import { RequiredMark, OptionalMark } from "./field-marker";
import "./test-and-learn.css";

type Plan = ExperimentPlan;
type Result = ExperimentResult;
type Editor = { kind: "plan"; id?: string; version?: number } | { kind: "result"; id: string; version: number };
type Confirmation = { id: string; action: "start" | "remove" | "share" } | null;
const blankPlan: Plan = { title: "", assumption: "", method: "", audience: "", successCriterion: "", dueDate: "" };
const blankResult: Result = { observations: "", learning: "", decision: "inconclusive", nextStep: "", evidenceUrl: "" };
const decisions: Record<Result["decision"], string> = { continue: "Continue with the next step", change: "Change the approach", stop: "Stop pursuing this assumption", inconclusive: "Gather more evidence" };
const templates = [
  { name: "Customer conversations", icon: MessageCircle, title: "Understand the customer’s problem", method: "Ask people about the last time they faced this problem. Explore what they did, what it cost and what they use today." },
  { name: "Prototype use", icon: MousePointer2, title: "Watch people try a prototype", method: "Give participants a specific task with a small prototype. Observe what they can do without help, where they struggle and what they do next." },
  { name: "Small pilot", icon: Sprout, title: "Try the idea in a small pilot", method: "Run a limited trial with consenting participants. Agree on the activity and measurement before starting, then record what actually happens." },
  { name: "Willingness to pay", icon: Wallet, title: "Test a real pricing decision", method: "Offer a clearly described service at a stated price. Record actual commitments separately from positive comments. Explain any trial or refund terms." },
] as const;

function readableDate(value: string) {
  if (!value) return "";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
}

/** Plans and raw observations stay private unless a completed learning is explicitly shared. */
export default function TestAndLearn({ profile, onDirtyChange, onBusyChange }: {
  profile: Profile; onDirtyChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void;
}) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true), [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false), [lockedConflict, setLockedConflict] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null), [plan, setPlan] = useState<Plan>({ ...blankPlan }), [result, setResult] = useState<Result>({ ...blankResult });
  const [dirty, setDirty] = useState(false), [discard, setDiscard] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation>(null), [shareConsent, setShareConsent] = useState(false);
  const prefix = useId(), editorTitle = useRef<HTMLHeadingElement>(null), mounted = useRef(true);
  const effectivePublic = !!profile.listed && !profile.moderation?.hidden;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    addEventListener("beforeunload", warn); return () => removeEventListener("beforeunload", warn);
  }, [dirty, busy]);
  useEffect(() => { if (editor) editorTitle.current?.focus(); }, [editor]);

  const load = useCallback(async () => {
    const response = await fetch(`/api/experiments?profile=${encodeURIComponent(profile.id)}`, { cache: "no-store" });
    const data = await response.json() as { experiments?: Experiment[]; error?: string };
    if (!response.ok) throw new Error(data.error || "We couldn’t load these tests. Please retry.");
    return data.experiments ?? [];
  }, [profile.id]);
  useEffect(() => {
    let active = true;
    void load().then(entries => { if (active) { setExperiments(entries); setLoaded(true); setError(""); } })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "We couldn’t load these tests. Please retry."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);
  const retryLoad = () => {
    setLoading(true); setError("");
    void load().then(entries => { if (mounted.current) { setExperiments(entries); setLoaded(true); } })
      .catch(e => { if (mounted.current) setError(e instanceof Error ? e.message : "We couldn’t load these tests. Please retry."); })
      .finally(() => { if (mounted.current) setLoading(false); });
  };

  const write = async (payload: object) => {
    if (busy) return false;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/experiments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, profileId: profile.id }) });
      const data = await response.json() as { experiments?: Experiment[]; error?: string };
      if (!response.ok) { setConflict(response.status === 409); throw new Error(data.error || "Your change wasn’t saved. Please retry."); }
      if (mounted.current) setExperiments(data.experiments ?? []);
      return true;
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : "Your change wasn’t saved. Please retry."); return false; }
    finally { if (mounted.current) setBusy(false); }
  };
  const clearEditor = () => { setEditor(null); setDirty(false); setDiscard(false); setError(""); setConflict(false); setLockedConflict(false); };
  const refreshConflict = async () => {
    if (!editor || !editor.id || busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/experiments?profile=${encodeURIComponent(profile.id)}`, { cache: "no-store" });
      const data = await response.json() as { experiments?: Experiment[]; error?: string };
      if (!response.ok) throw new Error(data.error || "We couldn’t reload the saved test. Your text is still here.");
      const latest = data.experiments?.find(item => item.id === editor.id);
      setExperiments(data.experiments ?? []);
      const editable = latest && (editor.kind === "plan" ? latest.status === "draft" : latest.status === "running");
      if (!editable) { setLockedConflict(true); setError("This test was removed or moved to another stage. Your text is kept here for reference, but it cannot replace a locked record. Read the saved record below, then cancel this form when you are ready."); }
      else { setEditor({ ...editor, version: latest.version }); setConflict(false); setError(""); setNotice("Latest saved record loaded below. Your form text is unchanged. Compare the record before choosing Save again."); }
    } catch (e) { setError(e instanceof Error ? e.message : "We couldn’t reload the saved test. Your text is still here."); }
    finally { setBusy(false); }
  };
  const startPlan = (template?: (typeof templates)[number], existing?: Experiment) => {
    if (busy || editor) return;
    setPlan(existing ? { title: existing.title, assumption: existing.assumption, method: existing.method, audience: existing.audience, successCriterion: existing.successCriterion, dueDate: existing.dueDate } : { ...blankPlan, ...(template ? { title: template.title, assumption: profile.uncertainty?.slice(0, 1000) || "", method: template.method } : {}) });
    setEditor({ kind: "plan", ...(existing ? { id: existing.id, version: existing.version } : {}) }); setDirty(!!template); setConfirmation(null); setNotice(""); setError(""); setConflict(false); setLockedConflict(false);
  };
  const recordResult = (experiment: Experiment) => {
    setResult({ ...blankResult }); setEditor({ kind: "result", id: experiment.id, version: experiment.version }); setDirty(false); setConfirmation(null); setNotice(""); setError(""); setConflict(false); setLockedConflict(false);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!editor || busy || lockedConflict) return;
    setDiscard(false);
    const ok = editor.kind === "plan"
      ? await write(editor.id ? { action: "edit", id: editor.id, version: editor.version, plan } : { action: "create", plan })
      : await write({ action: "complete", id: editor.id, version: editor.version, result });
    if (ok) { setNotice(editor.kind === "plan" ? "Your plan is saved privately. Start the test when the plan is ready." : "Learning saved privately. You can choose whether to share it."); clearEditor(); }
  };
  const perform = async (experiment: Experiment, action: "start" | "remove" | "share", shared?: boolean) => {
    const ok = await write({ action, id: experiment.id, version: experiment.version, ...(action === "share" ? { shared, consent: true } : {}) });
    if (ok) { setConfirmation(null); setShareConsent(false); setNotice(action === "start" ? "Test started. The original plan is now locked; record what happens next." : action === "remove" ? "Draft test removed." : shared ? effectivePublic ? "This completed learning is now shared on your idea’s profile." : "Sharing is enabled. This learning is visible to others only while your idea is public and available." : "Learning is private again."); }
  };
  const selected = editor && "id" in editor ? experiments.find(item => item.id === editor.id) : undefined;
  const field = (name: keyof Plan, label: string, options: { max: number; min?: number; placeholder?: string; rows?: number; optional?: boolean; help?: string }) => {
    const id = `${prefix}-${name}`;
    const attributes = { id, value: plan[name], required: !options.optional, minLength: options.min, maxLength: options.max, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setPlan(previous => ({ ...previous, [name]: event.target.value })); setDirty(true); }, "aria-describedby": options.help ? `${id}-help` : undefined, placeholder: options.placeholder, disabled: busy };
    return <div className={`tl-field${name === "title" || name === "dueDate" ? "" : " tl-field-wide"}`}><label htmlFor={id}>{label}{options.optional ? <OptionalMark label={label} /> : <RequiredMark />}</label>{options.rows ? <textarea {...attributes} rows={options.rows} /> : <input {...attributes} type={name === "dueDate" ? "date" : "text"} />}{options.help ? <p id={`${id}-help`}>{options.help}</p> : null}</div>;
  };
  const resultField = (name: Exclude<keyof Result, "decision">, label: string, max: number, min: number, placeholder: string, optional = false) => {
    const id = `${prefix}-${name}`;
    return <div className="tl-field"><label htmlFor={id}>{label}{optional ? <OptionalMark label={label} /> : <RequiredMark />}</label>{name === "evidenceUrl" ? <input id={id} type="url" value={result[name]} maxLength={max} placeholder={placeholder} disabled={busy} onChange={event => { setResult(previous => ({ ...previous, [name]: event.target.value })); setDirty(true); }} aria-describedby={`${id}-help`} /> : <textarea id={id} value={result[name]} rows={name === "nextStep" ? 2 : 3} maxLength={max} minLength={min} required={!optional} placeholder={placeholder} disabled={busy} onChange={event => { setResult(previous => ({ ...previous, [name]: event.target.value })); setDirty(true); }} />}{name === "evidenceUrl" ? <p id={`${id}-help`}>HTTPS only. Share a page you have permission to make public. FindIn does not check or fetch its contents.</p> : null}</div>;
  };

  return <section className="test-learn" aria-labelledby={`${prefix}-heading`} aria-busy={busy || loading}>
    <header className="tl-heading"><div><p className="eyebrow">TEST & LEARN</p><h2 id={`${prefix}-heading`}>Small tests. Clearer next steps.</h2><p>Choose one thing that needs to be true. Test it before you build more.</p></div><span className="tl-privacy"><LockKeyhole size={14} aria-hidden="true" />Private by default</span></header>
    <ol className="tl-process" aria-label="How testing works"><li><span>01</span>Plan a small test</li><li><span>02</span>Observe what happens</li><li><span>03</span>Choose your next move</li></ol>
    {loading ? <div className="tl-loading" role="status"><FlaskConical size={21} aria-hidden="true" />Loading your tests…</div> : null}
    {error ? <div className="tl-notice tl-error" role="alert"><p>{error}</p>{!loaded ? <button type="button" className="text-button" onClick={retryLoad} disabled={loading}><RefreshCw size={15} aria-hidden="true" />Retry loading</button> : <p className="tl-hint">{editor ? "Your text is still here." : "You can retry the action or reload the saved tests."}</p>}{conflict && editor?.id && !lockedConflict ? <button type="button" className="text-button" disabled={busy} onClick={() => void refreshConflict()}><RefreshCw size={15} aria-hidden="true" />Reload latest record & keep my text</button> : null}</div> : null}
    {notice ? <p className="tl-notice tl-success" role="status"><Check size={17} aria-hidden="true" />{notice}</p> : null}
    {loaded && !loading ? <>
      {!editor ? <div className="tl-starter"><div><h3>{experiments.length ? "What will you test next?" : "Start with a question, not a pitch."}</h3><p>Choose a starting point, then make the plan your own. These are editable suggestions, not findings.</p></div><div className="tl-templates">{templates.map(template => <button key={template.name} type="button" disabled={busy} onClick={() => startPlan(template)}><template.icon size={18} aria-hidden="true" /><span>{template.name}</span><ArrowRight size={15} aria-hidden="true" /></button>)}</div><button type="button" className="text-button" disabled={busy} onClick={() => startPlan()}><Plus size={16} aria-hidden="true" />Start a blank plan</button></div> : <form className="tl-editor" onSubmit={event => void submit(event)}>
        <div className="tl-editor-heading"><div><span className="eyebrow">{editor.kind === "plan" ? editor.id ? "EDIT YOUR PLAN" : "NEW TEST PLAN" : "RECORD YOUR LEARNING"}</span><h3 ref={editorTitle} tabIndex={-1}>{editor.kind === "plan" ? "What do you need to find out?" : selected?.title}</h3></div><button type="button" className="text-button" disabled={busy} onClick={() => dirty ? setDiscard(true) : clearEditor()}><X size={15} aria-hidden="true" />Cancel</button></div>
        {editor.kind === "plan" ? <><p className="tl-hint">Write the success condition before running the test. Starting the test locks this plan so the result has context.</p><div className="tl-form-grid">{field("title", "Test name", { max: 100, min: 3, placeholder: "Can workshop teams complete a handover?" })}{field("dueDate", "Aim to finish by", { max: 10, optional: true })}{field("assumption", "What needs to be true?", { max: 1000, min: 10, rows: 2, placeholder: "Describe one assumption you could find evidence for or against." })}{field("audience", "Who will take part?", { max: 500, min: 3, rows: 2, placeholder: "Describe the people and how you will reach them. Leave personal details out." })}{field("method", "What will you do?", { max: 1000, min: 10, rows: 3, placeholder: "Describe a small activity, what people will do and what you will measure." })}{field("successCriterion", "What result would support the next step?", { max: 1000, min: 10, rows: 2, placeholder: "Define an observable result, how many people and any limits.", help: "Positive comments and real commitments are different signals. Be specific about which one you are testing." })}</div></> : <>
          <div className="tl-locked-context"><LockKeyhole size={15} aria-hidden="true" /><div><strong>Original success condition</strong><p>{selected?.successCriterion}</p><span>Plan locked {readableDate(selected?.startedAt ?? "")}. The result is saved as a record; it cannot be rewritten later.</span></div></div>
          {resultField("observations", "What actually happened?", 2000, 10, "Describe the activity, number of participants, what you observed and anything that contradicted your assumption.")}
          {resultField("learning", "What did you learn?", 1500, 10, "Compare the observation with your original success condition. Describe the limits and what is still uncertain.")}
          <div className="tl-field"><label htmlFor={`${prefix}-decision`}>What will you do now?<RequiredMark /></label><select id={`${prefix}-decision`} value={result.decision} disabled={busy} onChange={event => { setResult(previous => ({ ...previous, decision: event.target.value as Result["decision"] })); setDirty(true); }}>{Object.entries(decisions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          {resultField("nextStep", "Your next action", 1000, 0, "Describe one useful next step.", true)}
          {resultField("evidenceUrl", "Supporting page", 1000, 0, "https://…", true)}
          <p className="tl-hint">Save what happened, including results that did not support the idea. This record stays private until you explicitly choose to share it.</p>
        </>}
        {discard ? <div className="tl-notice tl-warning" role="alert"><p>Discard the text you have not saved?</p><div className="tl-button-row"><button type="button" className="outline-button" disabled={busy} onClick={() => setDiscard(false)}>Keep editing</button><button type="button" className="text-button" disabled={busy} onClick={clearEditor}>Discard draft</button></div></div> : null}
        <div className="tl-editor-footer"><span><LockKeyhole size={14} aria-hidden="true" />Saves privately for this idea</span><button type="submit" className="primary-button" disabled={busy || lockedConflict}>{busy ? "Saving…" : editor.kind === "plan" ? "Save private plan" : "Save learning"}<Check size={16} aria-hidden="true" /></button></div>
      </form>}
      <div className="tl-records-heading"><h3>Your tests <span>{experiments.length}</span></h3><button type="button" className="text-button" onClick={retryLoad} disabled={busy || !!editor}><RefreshCw size={14} aria-hidden="true" />Reload<span className="sr-only"> saved tests</span></button></div>
      {experiments.length ? <ol className="tl-records">{experiments.map(experiment => {
        const sharing = experiment.shared && effectivePublic;
        const confirming = confirmation?.id === experiment.id;
        return <li key={experiment.id} className="tl-record" data-state={experiment.status}>
          <div className="tl-record-top"><span className={`tl-state tl-state-${experiment.status}`}>{experiment.status === "complete" ? <CheckCheck size={14} aria-hidden="true" /> : experiment.status === "running" ? <FlaskConical size={14} aria-hidden="true" /> : <Pencil size={13} aria-hidden="true" />}{experiment.status === "complete" ? "Learning recorded" : experiment.status === "running" ? "In progress" : "Draft plan"}</span><span className="tl-record-date">{experiment.status === "complete" ? `Recorded ${readableDate(experiment.completedAt)}` : experiment.status === "running" ? `Started ${readableDate(experiment.startedAt)}` : `Saved ${readableDate(experiment.created)}`}</span></div>
          <h4>{experiment.title}</h4><p className="tl-assumption">{experiment.assumption}</p>
          <details className="tl-record-details"><summary>{experiment.status === "complete" ? "Read plan & learning" : "Read the plan"}</summary><dl><div><dt>People involved</dt><dd>{experiment.audience}</dd></div><div><dt>Planned test</dt><dd>{experiment.method}</dd></div><div><dt>Original success condition</dt><dd>{experiment.successCriterion}</dd></div>{experiment.dueDate ? <div><dt>Planned finish</dt><dd>{readableDate(experiment.dueDate)}</dd></div> : null}{experiment.status === "complete" ? <><div><dt>What happened</dt><dd>{experiment.observations}</dd></div><div><dt>What we learned</dt><dd>{experiment.learning}</dd></div><div><dt>Founder’s decision</dt><dd>{experiment.decision ? decisions[experiment.decision] : "Not recorded"}</dd></div>{experiment.nextStep ? <div><dt>Next action</dt><dd>{experiment.nextStep}</dd></div> : null}{experiment.evidenceUrl?.startsWith("https://") ? <div><dt>Supporting page</dt><dd><a href={experiment.evidenceUrl} target="_blank" rel="noopener noreferrer nofollow">Open the founder’s supporting page<ArrowRight size={14} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></dd></div> : null}</> : null}</dl></details>
          {experiment.status === "complete" ? <p className="tl-sharing-state">{sharing ? <Eye size={14} aria-hidden="true" /> : <LockKeyhole size={14} aria-hidden="true" />}{sharing ? "Shared on your idea’s profile · Founder-reported" : experiment.shared ? "Sharing enabled · Only visible while this idea is public and available" : "Private learning · Only visible to you"}</p> : null}
          <div className="tl-record-actions">{experiment.status === "draft" ? <><button type="button" className="outline-button" disabled={busy || !!editor} onClick={() => { setConfirmation({ id: experiment.id, action: "start" }); setError(""); }}><Play size={14} aria-hidden="true" />Start test</button><button type="button" className="text-button" disabled={busy || !!editor} onClick={() => startPlan(undefined, experiment)}><Pencil size={14} aria-hidden="true" />Edit plan</button><button type="button" className="text-button tl-remove" disabled={busy || !!editor} onClick={() => { setConfirmation({ id: experiment.id, action: "remove" }); setError(""); }} aria-label={`Remove draft test ${experiment.title}`}><Trash2 size={14} aria-hidden="true" />Remove</button></> : experiment.status === "running" ? <button type="button" className="outline-button" disabled={busy || !!editor} onClick={() => recordResult(experiment)}><Pencil size={14} aria-hidden="true" />Record learning</button> : experiment.shared ? <button type="button" className="text-button" disabled={busy || !!editor} onClick={() => void perform(experiment, "share", false)}><LockKeyhole size={14} aria-hidden="true" />Make private</button> : <button type="button" className="outline-button" disabled={busy || !!editor || !effectivePublic} onClick={() => { setConfirmation({ id: experiment.id, action: "share" }); setShareConsent(false); setError(""); }}><Eye size={14} aria-hidden="true" />Choose sharing</button>}</div>
          {experiment.status === "complete" && !experiment.shared && !effectivePublic ? <p className="tl-hint">Make this idea public before sharing completed learning. Your test stays private.</p> : null}{confirming ? <div className="tl-confirm" role="group" aria-label={confirmation.action === "share" ? "Confirm sharing" : confirmation.action === "start" ? "Confirm starting the test" : "Confirm draft removal"}><p>{confirmation.action === "share" ? "Share the complete plan and learning, including observations and any supporting link, with people viewing this idea?" : confirmation.action === "start" ? "Ready to begin? Starting locks the original plan. You can then record what happened and what you learned." : "Remove this draft plan? This cannot be undone."}</p>{confirmation.action === "share" ? <label className="tl-consent"><input type="checkbox" checked={shareConsent} disabled={busy} onChange={event => setShareConsent(event.target.checked)} /><span>I have permission to share this information. It can be seen by anyone while this idea is public and available.</span></label> : null}<div className="tl-button-row"><button type="button" className="primary-button" disabled={busy || confirmation.action === "share" && !shareConsent} onClick={() => void perform(experiment, confirmation.action, true)}>{busy ? "Saving…" : confirmation.action === "share" ? "Share learning" : confirmation.action === "start" ? "Start & lock plan" : "Remove draft"}</button><button type="button" className="text-button" disabled={busy} onClick={() => setConfirmation(null)}>Cancel</button></div></div> : null}
        </li>;
      })}</ol> : <div className="tl-empty"><FlaskConical size={25} aria-hidden="true" /><div><h4>No tests saved yet.</h4><p>One clear question and a small test are enough to start. Your other ideas have their own separate tests.</p></div></div>}
      <p className="tl-footnote"><CircleHelp size={15} aria-hidden="true" />Tests help explain your learning. They do not verify a business, prove market demand or guarantee investment.</p>
    </> : null}
  </section>;
}
