"use client";

import { useId, useState, type FormEvent } from "react";
import type { Intro, Profile, WorkspaceData } from "@/lib/data";

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
    <div className="block-choice"><p>Blocking hides this member’s profiles from your signed-in discovery and stops contact in both directions. Public profiles remain visible when signed out.</p>{connection?.blocked ? <p className="subtle">Contact is already blocked. Manage your own blocks in My profiles.</p> : <button type="button" className="text-button" disabled={busy} onClick={() => void block()}>Block member</button>}</div>
    {feedback ? <p className="notice" role="status">{feedback}</p> : null}
    {error ? <p className="notice error-notice" role="alert">{error}</p> : null}
  </details>;
}

export function SafetySettings({ data, onWrite, busy }: { data: WorkspaceData; onWrite: Write; busy: boolean }) {
  const [error, setError] = useState("");
  const unblock = async (profileId: string) => {
    try { await onWrite({ action: "block", profileId, blocked: false }); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to unblock member."); }
  };
  return <section className="safety-settings"><h2>Your safety controls</h2><p className="subtle">Manage blocks and see the reports you submitted. Reports are private to your account and the service operator.</p>
    {error ? <p className="notice error-notice" role="alert">{error}</p> : null}
    <div className="safety-columns"><div><h3>Blocked members</h3>{data.blockedProfiles?.length ? <ul>{data.blockedProfiles.map(b => <li key={b.profileId}><span>{b.name}</span><button type="button" className="text-button" disabled={busy} onClick={() => void unblock(b.profileId)}>Unblock</button></li>)}</ul> : <p className="subtle">You haven’t blocked anyone.</p>}</div>
    <div><h3>Your reports</h3>{data.reports?.length ? <ul>{data.reports.map(r => <li key={r.id}><span>{reasons.find(([id]) => id === r.reason)?.[1] || r.reason}</span><span className="tag">{r.status === "submitted" ? "Submitted" : r.status}</span></li>)}</ul> : <p className="subtle">No reports submitted.</p>}</div></div>
  </section>;
}
