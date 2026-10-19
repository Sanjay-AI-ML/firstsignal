"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, FlaskConical, RefreshCw } from "lucide-react";
import type { Experiment, ExperimentResult } from "@/lib/experiments";
import "./test-and-learn.css";

const decisionCopy: Record<ExperimentResult["decision"], string> = { continue: "Continue with the next step", change: "Change the approach", stop: "Stop pursuing this assumption", inconclusive: "Gather more evidence" };
function date(value: string) { return value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""; }

/** Mounted only inside a real startup’s Evidence tab; no fictional experiments. */
export default function SharedLearnings({ profileId }: { profileId: string }) {
  const [entries, setEntries] = useState<Experiment[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const retry = useCallback(() => setReload(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(""); setEntries([]);
      try {
        const response = await fetch(`/api/experiments?profile=${encodeURIComponent(profileId)}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json() as { experiments?: Experiment[]; error?: string };
        if (!response.ok) throw new Error(data.error || "We couldn’t load the shared learning.");
        if (!controller.signal.aborted) setEntries((data.experiments ?? []).filter(item => item.status === "complete" && item.shared));
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "We couldn’t load the shared learning."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [profileId, reload]);
  return <section className="shared-learnings" aria-label="Shared test results" aria-busy={loading}>
    <header className="sl-heading"><FlaskConical size={20} aria-hidden="true" /><div><h3>Tests & learning</h3><p>Shared by the founder. These records and supporting pages have not been independently checked by FindIn.</p></div></header>
    {loading ? <p className="sl-empty" role="status">Loading shared learning…</p> : error ? <div className="tl-notice tl-error" role="alert"><p>{error}</p><button className="text-button" type="button" onClick={retry}><RefreshCw size={14} aria-hidden="true" />Retry loading</button></div> : entries.length ? entries.map(entry => <article className="sl-record" key={entry.id}>
      <div className="sl-record-meta"><span>Founder-reported</span><time dateTime={entry.completedAt}>Recorded {date(entry.completedAt)}</time></div><h4>{entry.title}</h4><p>{entry.learning}</p>
      <div className="sl-decision"><strong>Founder’s next move · {entry.decision ? decisionCopy[entry.decision] : "Not recorded"}</strong>{entry.nextStep ? <p>{entry.nextStep}</p> : null}</div>
      <details><summary>See the original test & observations</summary><dl><div><dt>Assumption tested</dt><dd>{entry.assumption}</dd></div><div><dt>Who took part</dt><dd>{entry.audience}</dd></div><div><dt>Planned activity</dt><dd>{entry.method}</dd></div><div><dt>Original success condition</dt><dd>{entry.successCriterion}</dd></div><div><dt>What actually happened</dt><dd>{entry.observations}</dd></div></dl><p className="sl-empty">Original plan locked {date(entry.startedAt)}. A small test can leave important questions unanswered.</p>{entry.evidenceUrl?.startsWith("https://") ? <p><a href={entry.evidenceUrl} target="_blank" rel="noopener noreferrer nofollow">Founder’s supporting page<ArrowUpRight size={14} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></p> : null}</details>
    </article>) : <p className="sl-empty">No completed tests have been shared for this idea yet. Ask the founder what they plan to test next.</p>}
  </section>;
}
