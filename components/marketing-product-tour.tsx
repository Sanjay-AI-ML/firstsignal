"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Bookmark, Check, FileText, Handshake, LockKeyhole, MessageCircle, Sprout } from "lucide-react";

const steps = [
  { title: "Shape your profile", description: "A clear story, in manageable steps.", icon: FileText },
  { title: "Understand the fit", description: "See the reasons, not a mystery score.", icon: Handshake },
  { title: "Follow the progress", description: "A learning today. A better question tomorrow.", icon: Sprout },
  { title: "Move the conversation forward", description: "Messages, proposals and your next step.", icon: MessageCircle },
];

export default function MarketingProductTour() {
  const [active, setActive] = useState(0);
  const [listed, setListed] = useState(false);
  const [stage, setStage] = useState("Pre-product");
  const [counteroffer, setCounteroffer] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const selectWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (["ArrowRight", "ArrowDown"].includes(event.key)) next = (index + 1) % steps.length;
    else if (["ArrowLeft", "ArrowUp"].includes(event.key)) next = (index + steps.length - 1) % steps.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = steps.length - 1;
    else return;
    event.preventDefault(); setActive(next); buttons.current[next]?.focus();
  };

  return <section className="marketing-tour marketing-section" id="how-it-works" aria-labelledby="tour-title" tabIndex={-1}>
    <div className="marketing-tour-heading marketing-reveal"><span className="marketing-kicker">TAKE A LOOK INSIDE</span><h2 id="tour-title">From first signal<br />to next step.</h2><p>A profile starts the story. The learning and conversations keep it moving.</p></div>
    <div className="marketing-tour-workspace">
      <div className="marketing-tour-controls"><div className="marketing-tour-steps" role="tablist" aria-label="Product walkthrough" aria-orientation="vertical">
        {steps.map(({ title, description, icon: Icon }, index) => <button key={title} ref={element => { buttons.current[index] = element; }} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel`} aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={event => selectWithKeyboard(event, index)}>
          <span className="marketing-tour-number">0{index + 1}</span><span><strong>{title}</strong><small>{description}</small></span><Icon size={20} aria-hidden="true" />
        </button>)}
      </div><a className="marketing-tour-entry" href="/app#discover">Try the real workspace</a></div>
      <div className="marketing-tour-stage"><div className="marketing-tour-chrome"><span><span className="marketing-tour-mark" aria-hidden="true">f.</span> FirstSignal / Product walkthrough</span><span className="marketing-example-label">FICTIONAL DATA</span></div>
        <div className="marketing-tour-panel" key={active} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${active}`} tabIndex={0}>
          {active === 0 ? <>
            <div className="tour-panel-heading"><div><span className="marketing-kicker">PROFILE / TRACEGRID</span><h3>Start with what you know.</h3></div><span className="tour-status"><LockKeyhole size={14} aria-hidden="true" />{listed ? "Listed example" : "Private draft example"}</span></div>
            <dl className="tour-profile-fields"><div><dt>The problem</dt><dd>Factory shift handovers lose track of unresolved incidents.</dd></div><div><dt>What we learned</dt><dd>16 interviews across 6 factories suggest follow-up ownership needs a closer look.</dd></div><div><dt>The next experiment</dt><dd>Test the offline prototype with two consenting factories.</dd></div></dl>
            <div className="tour-completion"><div><span>Profile writing checklist</span><strong>3 sections filled in this example</strong></div><span className="tour-completion-track" aria-hidden="true"><span /></span></div>
            <div className="tour-panel-bottom"><button type="button" className="marketing-demo-button" onClick={() => setListed(!listed)}>{listed ? "Preview a private draft" : "Preview a listed profile"}</button><p role="status">{listed ? "A listed profile and its progress can be viewed publicly." : "Your draft stays private until you choose to list it."}</p></div>
          </> : null}
          {active === 1 ? <>
            <div className="tour-panel-heading"><div><span className="marketing-kicker">FIT / STATED INTERESTS</span><h3>Know why it could fit.</h3></div><span className="tour-status">Example comparison</span></div>
            <div className="tour-fit-people"><div><span className="tour-avatar" aria-hidden="true">T</span><strong>Tracegrid<small>Founder profile</small></strong></div><span className="tour-fit-connector" aria-hidden="true"><Handshake size={23} /></span><div><span className="tour-avatar investor" aria-hidden="true">A</span><strong>Aarav Shah<small>Fictional investor</small></strong></div></div>
            <div className="tour-fit-row"><span>Sector · Manufacturing SaaS</span><strong><Check size={16} aria-hidden="true" />Aligns</strong></div><div className="tour-fit-row"><span>Startup stage · Pre-product</span><strong className={stage === "Pre-product" ? "" : "tour-open-question"}>{stage === "Pre-product" ? <><Check size={16} aria-hidden="true" />Aligns</> : "Different stage"}</strong></div><div className="tour-fit-row"><span>Evidence quality & availability</span><strong className="tour-open-question">Confirm together</strong></div>
            <div className="tour-panel-bottom"><label className="tour-stage-choice" htmlFor={`${id}-stage`}>Try changing the investor’s stage<select id={`${id}-stage`} value={stage} onChange={event => setStage(event.target.value)}><option>Pre-product</option><option>Prototype</option></select></label><p role="status">{stage === "Pre-product" ? "Sector and stage align. This is a reason to explore, not a funding prediction." : "Sector still aligns, but the stated stage differs. Ask whether earlier projects are considered."}</p></div>
          </> : null}
          {active === 2 ? <>
            <div className="tour-panel-heading"><div><span className="marketing-kicker">PROGRESS / SAVED STARTUP</span><h3>The idea keeps developing.</h3></div><span className="tour-status"><Bookmark size={14} aria-hidden="true" />Saved example</span></div>
            <ol className="tour-timeline"><li><time dateTime="2026-09-23">23 SEP 2026</time><h4>Completed the first interview round</h4><p>Follow-up ownership keeps coming up. Frequency and willingness to pay are still untested.</p></li><li><time dateTime="2026-10-06">06 OCT 2026</time><h4>Simplified the shift handover</h4><p>Three walkthroughs suggested a short unresolved-items list matters more than a dashboard.</p></li></ol>
            <div className="tour-learning"><Sprout size={20} aria-hidden="true" /><p><strong>More context for your next conversation.</strong> Save a listed startup to revisit its recent, self-reported updates.</p></div>
            <a className="marketing-demo-button" href="/app?profile=tracegrid#discover">Explore Tracegrid’s sample profile</a>
          </> : null}
          {active === 3 ? <>
            <div className="tour-panel-heading"><div><span className="marketing-kicker">CONNECTION / AFTER ACCEPTANCE</span><h3>A next step, in one place.</h3></div><span className="tour-status"><Handshake size={14} aria-hidden="true" />Accepted example</span></div>
            <div className="tour-message"><MessageCircle size={19} aria-hidden="true" /><p>“Let’s discuss the prototype scope and what the first experiment needs to establish.”<small>Fictional message</small></p></div>
            <div className="tour-proposal"><div><span>INDICATIVE PROPOSAL · VERSION {counteroffer ? "2" : "1"}</span><h4>₹{counteroffer ? "10,00,000" : "8,00,000"}<small>Non-binding discussion</small></h4></div><button type="button" className="marketing-demo-button" onClick={() => setCounteroffer(!counteroffer)}>{counteroffer ? "Reset proposal example" : "Preview a counteroffer"}</button></div>
            <div className="tour-private-note"><LockKeyhole size={18} aria-hidden="true" /><div><strong>Your private next step</strong><p>Prepare the customer interview summary before the next conversation.</p><small>Only the writer sees their note. No reminder is sent.</small></div></div>
            <p className="tour-action-feedback" role="status">{counteroffer ? "The example shows a second version. No counteroffer has been sent." : "Proposal discussions stay with the two accepted participants."}</p>
          </> : null}
        </div>
        <p className="marketing-tour-disclosure">Interactive example · Changes stay on this page. No records are saved and nobody is contacted.</p>
      </div>
    </div>
  </section>;
}
