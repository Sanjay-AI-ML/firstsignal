"use client";

import { useId, useState, type FormEvent } from "react";
import type { Intro, Profile, WorkspaceData } from "@/lib/data";
import { Download } from "lucide-react";

type Write = (payload: unknown) => Promise<unknown>;
const reasons = [
  ["misleading", "Misleading claims"], ["impersonation", "Impersonation"],
  ["harassment", "Harassment"], ["spam", "Spam or unwanted contact"], ["other", "Something else"],
];

export function MemberControls({ profile, connection, onWrite, busy, onBlocked }: {
  profile?: Profile; connection?: Intro; onWrite: Write; busy: boolean; onBlocked: () => void;
}) {
  const fieldId = useId();
  const [reason, setReason] = useState("misleading");
  const [details, setDetails] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const report = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setFeedback("");
    try {
      await onWrite(connection ? { action: "reportConnection", id: connection.id, reason, details } : { action: "report", profileId: profile?.id, reason, details });
      setDetails(""); setFeedback("Report saved. Reporting does not automatically remove a member or profile.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save report."); }
  };
  const block = async () => {
    setError("");
    try { await onWrite(connection ? { action: "blockConnection", id: connection.id, blocked: true } : { action: "block", profileId: profile?.id, blocked: true }); onBlocked(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to block member."); }
  };
  if ((!profile && !connection) || profile?.demo || profile?.mine || (connection && connection.status !== "accepted")) return null;
  return <details className="member-controls">
    <summary>Report or block this member</summary>
    <p className="subtle">Profile claims are self-reported. Report suspicious claims or unwanted contact.</p>
    <form className="dialog-form" onSubmit={event => void report(event)}>
      <div className="field"><label htmlFor={`${fieldId}-reason`}>Reason</label><select id={`${fieldId}-reason`} value={reason} onChange={e => setReason(e.target.value)}>{reasons.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></div>
      <div className="field"><label htmlFor={`${fieldId}-details`}>What happened?</label><textarea id={`${fieldId}-details`} minLength={10} maxLength={1500} required rows={3} value={details} onChange={e => setDetails(e.target.value)} placeholder="Describe what you observed. Leave out passwords, identity documents and financial account details." /></div>
      <button type="submit" className="outline-button" disabled={busy}>Submit report</button>
    </form>
    <div className="block-choice"><p>Blocking hides this member’s profiles from your signed-in discovery and stops contact in both directions. Public profiles remain visible when signed out.</p>{connection?.blocked ? <p className="subtle">Contact is already blocked. Manage your own blocks in My profile.</p> : <button type="button" className="text-button" disabled={busy} onClick={() => void block()}>Block member</button>}</div>
    {feedback ? <p className="notice" role="status">{feedback}</p> : null}
    {error ? <p className="notice error-notice" role="alert">{error}</p> : null}
  </details>;
}

export function SafetySettings({ data, onWrite, busy }: { data: WorkspaceData; onWrite: Write; busy: boolean }) {
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [exporting, setExporting] = useState(false);
  const unblock = async (profileId: string) => {
    try { await onWrite({ action: "block", profileId, blocked: false }); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to unblock member."); }
  };
  const exportArchive = async () => {
    if (busy || exporting) return;
    setError(""); setFeedback(""); setExporting(true);
    try {
      const response = await onWrite({ action: "exportData" }) as { dataArchive?: Record<string, unknown> };
      if (!response?.dataArchive) throw new Error("The archive was not returned. Please try again.");
      const blob = new Blob([JSON.stringify(response.dataArchive, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = `findin-workspace-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link); link.click(); link.remove();
      } finally { URL.revokeObjectURL(url); }
      setFeedback("Your workspace download has started. Keep this archive private; it includes your conversations.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to export your workspace."); }
    finally { setExporting(false); }
  };
  return <section className="safety-settings">
    <h2>Your safety & privacy controls</h2>
    <p className="subtle">Manage blocks and see the reports you submitted. Reports are private to your account and the service operator.</p>
    {error ? <p className="notice error-notice" role="alert">{error}</p> : null}
    {feedback ? <p className="notice" role="status">{feedback}</p> : null}
    <div className="safety-columns">
      <div><h3>Blocked members</h3>{data.blockedProfiles?.length ? <ul>{data.blockedProfiles.map(b => <li key={b.profileId}><span>{b.name}</span><button type="button" className="text-button" disabled={busy} onClick={() => void unblock(b.profileId)}>Unblock</button></li>)}</ul> : <p className="subtle">You haven’t blocked anyone.</p>}</div>
      <div><h3>Your reports</h3>{data.reports?.length ? <ul>{data.reports.map(r => <li key={r.id}><span>{reasons.find(([id]) => id === r.reason)?.[1] || r.reason}</span><span className="tag">{r.status === "submitted" ? "Submitted" : r.status}</span></li>)}</ul> : <p className="subtle">No reports submitted.</p>}</div>
    </div>
    <div className="workspace-data-controls" style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--fi-border)" }}>
      <h3>Your workspace archive</h3>
      <p className="subtle">Download your saved profiles, progress, tests, shortlist, blocks, submitted reports, notification settings and conversation history as JSON. Your private follow-up notes are included; other members’ private notes and operator-only reviews are excluded. Clerk-managed sign-in records are not included.</p>
      <button type="button" className="outline-button" disabled={busy || exporting} onClick={() => void exportArchive()}><Download size={15} aria-hidden="true" />{exporting ? "Preparing archive…" : "Export workspace (.json)"}</button>
      <p className="subtle" style={{ marginTop: "14px" }}>Account deletion is not available in this version. You can edit or unlist your ideas to change what others see. This does not delete your sign-in account or conversation history.</p>
    </div>
  </section>;
}
