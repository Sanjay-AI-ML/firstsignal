"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

export default function ConnectionNextStep({ id, onSaved }: { id: string; onSaved: () => void }) {
  const [note, setNote] = useState(""); const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true); const [loaded, setLoaded] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/connections?id=${encodeURIComponent(id)}`);
      const data = await response.json() as { error?: string; nextStep?: { note: string; date: string } | null };
      if (!response.ok) throw new Error(data.error || "Unable to load your next step.");
      setLoaded(true); setNote(data.nextStep?.note || ""); setDate(data.nextStep?.date || ""); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load your next step."); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setSaved(false);
    try {
      const response = await fetch("/api/connections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "nextStep", id, note, date: note.trim() ? date : "" }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save your next step.");
      if (!note.trim()) setDate(""); setSaved(true); onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save your next step."); }
    finally { setBusy(false); }
  };
  return <details className="connection-next-step"><summary>Your next step</summary><p className="subtle">A private follow-up note for you. This does not message the other member or send a reminder.</p>
    {loading ? <p role="status">Loading your note…</p> : loaded ? <form className="dialog-form" onSubmit={event => void submit(event)}><div className="field"><label htmlFor="connection-note">What will you do next?</label><textarea id="connection-note" maxLength={500} rows={2} value={note} onChange={e => { setNote(e.target.value); setSaved(false); }} placeholder="Prepare the customer interview summary before our next conversation." /></div><div className="field"><label htmlFor="connection-date">Follow up on (optional)</label><input id="connection-date" type="date" value={date} onChange={e => { setDate(e.target.value); setSaved(false); }} /></div><button type="submit" className="outline-button" disabled={busy}>{busy ? "Saving…" : note.trim() ? "Save next step" : "Clear next step"}</button></form> : null}
    {saved ? <p role="status" className="subtle">Your next step is saved.</p> : null}{error ? <p className="notice error-notice" role="alert">{error} {loaded ? "Your input is still here. Use Save next step to retry." : <button type="button" className="text-button" onClick={() => void load()}>Retry loading</button>}</p> : null}
  </details>;
}
