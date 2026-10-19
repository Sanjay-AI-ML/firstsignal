"use client";

import { useEffect, useId, useState } from "react";
import { Check, Copy, Download, Send } from "lucide-react";
import type { Profile } from "@/lib/data";
import { buildFounderUpdate, emptyFounderUpdate, type FounderUpdateDraft } from "@/lib/founder-update";
import "./founder-ir-update.css";

export type FounderIrUpdateProps = {
  idea: Profile;
  onWrite?: (payload: unknown) => Promise<unknown>;
  busy?: boolean;
  onPublished?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onBusyChange?: (pending: boolean) => void;
};

export default function FounderIrUpdate({ idea, onWrite, busy = false, onPublished, onDirtyChange, onBusyChange }: FounderIrUpdateProps) {
  const prefix = useId();
  const [draft, setDraft] = useState<FounderUpdateDraft>(() => emptyFounderUpdate(new Date()));
  const [consentFor, setConsentFor] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");
  const [publishing, setPublishing] = useState(false);
  const isPublic = !!idea.listed && !idea.moderation?.hidden;
  const visibilityKey = `${idea.id}:${isPublic ? "public" : "private"}`;
  const consent = consentFor === visibilityKey;
  const disabled = busy || publishing;

  useEffect(() => () => { onBusyChange?.(false); }, [onBusyChange]);

  function change(field: keyof FounderUpdateDraft, value: string) {
    setDraft(previous => ({ ...previous, [field]: value }));
    setConsentFor(""); setCopied(false); setStatus(""); onDirtyChange?.(true);
  }
  const report = buildFounderUpdate(draft, idea.name);

  async function copy() {
    if (!report.ok) { setStatus(report.error); return; }
    try { await navigator.clipboard.writeText(report.markdown); setCopied(true); setStatus("Update copied. Nothing was posted or emailed."); }
    catch { setStatus("Copy is unavailable. Download the update instead."); }
  }
  function download() {
    if (!report.ok) { setStatus(report.error); return; }
    const url = URL.createObjectURL(new Blob([report.markdown], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `findin-update-${idea.id}-${draft.period}.md`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    setStatus("Update downloaded. Nothing was posted or emailed.");
  }
  async function publish() {
    if (!onWrite || disabled) return;
    if (!report.ok) { setStatus(report.error); return; }
    if (!consent) { setStatus("Review the preview and confirm how this update will be shared."); return; }
    setPublishing(true); onBusyChange?.(true); setStatus("");
    try {
      await onWrite({ action: "progress", profileId: idea.id, title: report.title, body: report.body, date: new Date().toISOString().slice(0, 10), consent: true });
      onDirtyChange?.(false); setConsentFor("");
      setStatus(isPublic ? "Update published with this idea." : "Update saved privately with this idea.");
      onPublished?.();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to save. Your draft is still here."); }
    finally { setPublishing(false); onBusyChange?.(false); }
  }

  return <section className="founder-ir-update" aria-labelledby={`${prefix}-title`}>
    <div className="ir-header"><div><span className="ir-kicker">YOUR MONTHLY UPDATE</span><h4 className="ir-title" id={`${prefix}-title`}>Keep people in the loop.</h4><p className="ir-desc">Write an update for {idea.name}. All figures are optional and self-reported.</p></div><span className="tag">{isPublic ? "Public with this idea" : "Private draft"}</span></div>
    <p className="ir-desc">Your draft stays in this panel until you leave. Copy or download it for your own use, or review it below before saving to Progress. This tool does not send emails.</p>
    <fieldset className="ir-fields" disabled={disabled}><legend className="sr-only">Monthly update for {idea.name}</legend>
      <div className="ir-textarea-group"><label htmlFor={`${prefix}-period`}>Reporting month</label><input id={`${prefix}-period`} type="month" value={draft.period} onChange={event => change("period", event.target.value)} /></div>
      <div className="ir-grid">{([
        ["burn", "Monthly net burn (INR)", "Cash spent minus cash received in a month."],
        ["cash", "Cash available (INR)", "Runway assumes this cash and a constant monthly net burn."],
        ["mrr", "Monthly recurring revenue (INR)", "Leave blank if this measure does not apply."],
        ["growth", "Monthly revenue change (%)", "A decrease can be entered as a negative value."],
      ] as const).map(([field, label, hint]) => <div className="ir-metric-input" key={field}><label htmlFor={`${prefix}-${field}`}>{label}</label><input id={`${prefix}-${field}`} type="number" min={field === "growth" ? -100 : 0} max={field === "growth" ? 10000 : 1e12} step="any" value={draft[field]} onChange={event => change(field, event.target.value)} placeholder="Not provided" aria-describedby={`${prefix}-${field}-hint`} /><span className="ir-hint" id={`${prefix}-${field}-hint`}>{hint}</span></div>)}</div>
      {([ ["wins", "What went well?", "Describe an actual milestone or what you learned."], ["headwinds", "What was difficult?", "Explain a blocker or an assumption you still need to test."], ["asks", "Where could someone help?", "Ask for a relevant introduction, feedback or advice."] ] as const).map(([field, label, placeholder]) => <div className="ir-textarea-group" key={field}><label htmlFor={`${prefix}-${field}`}>{label}</label><textarea id={`${prefix}-${field}`} rows={3} maxLength={500} value={draft[field]} onChange={event => change(field, event.target.value)} placeholder={placeholder} /></div>)}
    </fieldset>
    <div className="ir-preview"><h5>Review your update</h5>{report.ok ? <><p><strong>{report.title}</strong></p><p className="ir-preview-body">{report.body}</p><p className="ir-hint">{report.body.length} / 2,000 characters · No text will be cut off.</p></> : <p>{report.error}</p>}</div>
    {onWrite ? <label className="consent ir-consent"><input type="checkbox" checked={consent} disabled={disabled || !report.ok} onChange={event => { setConsentFor(event.target.checked ? visibilityKey : ""); onDirtyChange?.(true); }} /><span>{isPublic ? "Publish the preview, including any financial figures, with my public idea." : "Save the preview privately. It becomes public if I list this idea later."} I have permission to share this information.</span></label> : null}
    <div className="ir-actions"><button type="button" className="outline-button" disabled={disabled || !report.ok} onClick={() => void copy()}>{copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}Copy update</button><button type="button" className="outline-button" disabled={disabled || !report.ok} onClick={download}><Download size={16} aria-hidden="true" />Download (.md)</button>{onWrite ? <button type="button" className="primary-button" disabled={disabled || !report.ok || !consent} onClick={() => void publish()}><Send size={16} aria-hidden="true" />{publishing ? "Saving…" : isPublic ? "Publish to Progress" : "Save private update"}</button> : null}</div>
    <p className={status ? "notice" : "sr-only"} role="status">{status}</p>
  </section>;
}
