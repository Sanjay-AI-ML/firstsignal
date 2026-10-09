"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ClipboardList, FlaskConical, HelpCircle, MessageSquare, Search } from "lucide-react";
import "./marketing-evidence-brief.css";

const views = ["Learning", "Open questions", "Next test"];

export default function MarketingEvidenceBrief() {
  const [active, setActive] = useState(0);
  const id = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  function select(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % views.length;
    else if (event.key === "ArrowLeft") next = (index + views.length - 1) % views.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = views.length - 1;
    else return;
    event.preventDefault(); setActive(next); tabs.current[next]?.focus();
  }

  return <div className="evidence-brief" aria-label="Tracegrid fictional evidence brief">
    <div className="evidence-brief-chrome"><span><ClipboardList size={17} aria-hidden="true" /> Inside an early idea</span><span className="evidence-example">Fictional example</span></div>
    <article className="evidence-brief-paper">
      <header className="evidence-company"><span className="evidence-company-mark" aria-hidden="true">T</span><div><strong>Tracegrid</strong><span>Bengaluru · Manufacturing SaaS</span></div><span className="evidence-stage">Pre-product</span></header>
      <h2>Better handovers.</h2>
      <p className="evidence-brief-intro">A shift-handover tool for factory teams.</p>
      <div className="evidence-path" aria-label="Example evidence status">
        <div><MessageSquare size={18} aria-hidden="true" /><strong>Interviews</strong><span>Reported</span></div>
        <div><FlaskConical size={18} aria-hidden="true" /><strong>Prototype use</strong><span>Planned</span></div>
        <div><Search size={18} aria-hidden="true" /><strong>Paid use</strong><span>Untested</span></div>
      </div>
      <div className="evidence-tabs" role="tablist" aria-label="Explore the example evidence">
        {views.map((view, index) => <button type="button" role="tab" key={view} id={`${id}-tab-${index}`} aria-controls={`${id}-panel`} aria-selected={active === index} tabIndex={active === index ? 0 : -1} ref={element => { tabs.current[index] = element; }} onClick={() => setActive(index)} onKeyDown={event => select(event, index)}>{view}</button>)}
      </div>
      <div className="evidence-panel" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${active}`} tabIndex={0}>
        {active === 0 ? <>
          <div className="evidence-panel-heading"><h3>An early interview signal</h3><span className="evidence-status">Founder reported</span></div>
          <div className="evidence-numbers"><div><strong>16</strong><span>customer interviews</span></div><div><strong>6</strong><span>factories represented</span></div></div>
          <div className="evidence-observation"><span>WHAT WAS REPORTED</span><p>Unresolved incidents lose a clear owner between shifts.</p></div>
          <dl className="evidence-source"><div><dt>Activity date</dt><dd><time dateTime="2026-09-23">23 Sep 2026</time> · Example interview round</dd></div><div><dt>Source & limits</dt><dd>Illustrative founder summary. No interview records attached; selection method and frequency are unknown.</dd></div></dl>
        </> : null}
        {active === 1 ? <>
          <div className="evidence-panel-heading"><h3>What still needs an answer?</h3><span className="evidence-status">Open questions</span></div>
          <ul className="evidence-questions"><li><HelpCircle size={18} aria-hidden="true" /><div><strong>Does it happen often enough?</strong><p>Interviews do not establish how frequently incidents lose an owner.</p></div></li><li><HelpCircle size={18} aria-hidden="true" /><div><strong>Will teams keep using it?</strong><p>Repeated use and offline reliability have not been tested.</p></div></li><li><HelpCircle size={18} aria-hidden="true" /><div><strong>Will an owner pay?</strong><p>No pricing test, paid pilot or revenue is reported in this example.</p></div></li></ul>
          <p className="evidence-limit">An interview count alone does not establish demand or investment readiness.</p>
        </> : null}
        {active === 2 ? <>
          <div className="evidence-panel-heading"><h3>Make the next test measurable</h3><span className="evidence-status">Proposed · Not run</span></div>
          <dl className="evidence-test"><div><dt>Assumption</dt><dd>A short unresolved-items list helps teams assign an owner before a shift ends.</dd></div><div><dt>Test & measure</dt><dd>With two consenting factory teams, try an offline prototype over five handovers per team. Record owner assignment and completion time.</dd></div><div className="evidence-test-target"><dt>Decision criterion</dt><dd>Each team records an owner in at least four of its five handovers.</dd></div></dl>
          <p className="evidence-limit">Example criterion chosen before testing, not an industry benchmark. Participants are not confirmed; payment needs a separate test.</p>
        </> : null}
      </div>
      <div className="evidence-brief-actions"><a href="/app?profile=tracegrid#discover">Open sample profile</a><a href="#templates">Build your own brief</a></div>
      <p className="evidence-brief-disclosure">All company data above is fictional and unverified. This preview saves nothing.</p>
    </article>
    <details className="evidence-method"><summary>Why show the evidence this way?</summary><p>Separate what people said, what they did and what remains uncertain. Define a test and its decision criterion before collecting results.</p><div><a href="https://www.strategyzer.com/library/validate-your-ideas-with-the-test-card" target="_blank" rel="noreferrer">Strategyzer · Designing a test</a><a href="https://www.strategyzer.com/library/ways-to-test-your-value-proposition-and-business-model" target="_blank" rel="noreferrer">Strategyzer · Customer evidence</a></div><small>Method references, not endorsements of FirstSignal or this fictional startup.</small></details>
  </div>;
}
