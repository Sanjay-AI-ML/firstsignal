"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatDate, type Profile } from "@/lib/data";

export default function ProgressUpdates({ profile, busy, onWrite, starter = false }: {
  profile: Profile; busy: boolean; onWrite: (payload: unknown) => Promise<unknown>; starter?: boolean;
}) {
  const titleInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (starter) titleInput.current?.focus(); }, [starter]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    if (!consent) { setError("Confirm how this update will be shared."); return; }
    try {
      await onWrite({ action: "progress", profileId: profile.id, title, body, date, consent: true });
      setTitle(""); setBody(""); setConsent(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save update."); }
  };
  const remove = async (updateId: string) => {
    try { await onWrite({ action: "removeProgress", profileId: profile.id, updateId }); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to remove update."); }
  };
  return <section className="progress-editor"><div className="progress-editor-heading"><div><p className="eyebrow">FOUNDER PROGRESS</p><h2>A reason to come back.</h2></div><span className="tag">{profile.listed ? "Public with your profile" : "Private draft"}</span></div>
    <p className="subtle">Share what you learned, what changed and the next experiment. Investors who save your listed profile can return to these updates.</p>
    <details open={starter || undefined}><summary>Add a progress update</summary><form className="dialog-form" onSubmit={event => void submit(event)}>
      {starter ? <div className="notice"><strong>Your progress worksheet</strong><p>Describe the test, what you observed, what changed, what remains uncertain and your next step. Use your own learning; leave untested claims out.</p></div> : null}
      <div className="form-grid"><div className="field"><label htmlFor="progress-title">Update title</label><input ref={titleInput} id="progress-title" required minLength={3} maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="What we learned from five customer interviews" /></div><div className="field"><label htmlFor="progress-date">When did this happen?</label><input id="progress-date" type="date" required value={date} max={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} /></div></div>
      <div className="field"><label htmlFor="progress-body">Learning and next step</label><textarea id="progress-body" required minLength={20} maxLength={2000} rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="What did you observe? What surprised you? What will you test next? Distinguish interest from paying customers." /></div>
      <label className="consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>{profile.listed ? "Publish this update with my listed profile." : "Save this update privately. It will become public if I list this profile later."} I have permission to share it.</span></label>
      <button type="submit" className="primary-button" disabled={busy}>{busy ? "Saving…" : profile.listed ? "Publish update" : "Save private update"}</button>
    </form></details>
    {error ? <p className="notice error-notice" role="alert">{error}</p> : null}
    {profile.updates.length ? <ol className="progress-timeline">{profile.updates.map(u => <li key={u.id || u.date + u.title}><div><time dateTime={u.date}>{formatDate(u.date)}</time><h3>{u.title}</h3><p>{u.body}</p></div>{u.id ? <button type="button" className="text-button" disabled={busy} onClick={() => void remove(u.id!)}>Remove update</button> : null}</li>)}</ol> : <p className="subtle mt-4">No updates yet. A useful learning is enough to start.</p>}
  </section>;
}

export function FollowedProgress({ profiles, savedIds, onOpen }: { profiles: Profile[]; savedIds: string[]; onOpen: (profile: Profile) => void }) {
  const entries = profiles.filter(p => !p.demo && !p.mine && p.kind === "startup" && savedIds.includes(p.id)).flatMap(profile => profile.updates.map(update => ({ profile, update }))).sort((a, b) => b.update.date.localeCompare(a.update.date)).slice(0, 6);
  if (!entries.length) return null;
  return <section className="followed-progress"><div className="section-label"><h2>Progress from your saved startups</h2><span className="subtle">Self-reported updates</span></div><div className="followed-progress-grid">{entries.map(({ profile, update }) => <article key={profile.id + (update.id || update.date + update.title)}><p className="eyebrow">{profile.name} · {formatDate(update.date)}</p><h3>{update.title}</h3><p>{update.body}</p><button type="button" className="text-button" onClick={() => onOpen(profile)}>View profile & progress</button></article>)}</div></section>;
}
