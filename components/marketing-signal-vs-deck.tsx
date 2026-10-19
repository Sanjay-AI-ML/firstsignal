"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, FileText, FlaskConical } from "lucide-react";
import "./marketing-signal-vs-deck.css";

const views = [
  { label: "The introduction", icon: FileText, title: "Explain what you want to build.", description: "A concise profile or pitch helps someone understand the problem, your proposed solution and your background.", fields: [{ label: "The idea", text: "A simpler handover for small workshop teams." }, { label: "The proposed solution", text: "A short list of unfinished work, with a person responsible for each item." }, { label: "The open question", text: "Can a workshop lead use it without help?" }] },
  { label: "The learning record", icon: FlaskConical, title: "Explain what changed your thinking.", description: "A test record adds the original plan, what happened and the limits of the result. It complements your introduction.", fields: [{ label: "Original condition", text: "Both participating leads finish a handover without help." }, { label: "Observed in this example", text: "One lead finished. The other needed help finding unfinished work." }, { label: "Next decision", text: "Change the layout and test again. Willingness to pay remains unknown." }] },
] as const;

export default function MarketingSignalVsDeck() {
  const [active, setActive] = useState(0);
  const prefix = useId(), buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const choose = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - active;
    setActive(next); buttons.current[next]?.focus();
  };
  const current = views[active];
  return <section className="signal-vs-deck-container" aria-labelledby={`${prefix}-title`}>
    <header className="svd-heading"><div><span>MORE CONTEXT FOR A FIRST CONVERSATION</span><h2 id={`${prefix}-title`}>An introduction opens the door.<br />Learning gives it context.</h2></div><p>Show what you want to build, what you have tried and what you still need to learn.</p></header>
    <div className="svd-example"><div className="svd-example-top"><strong>Tracegrid</strong><span>Fictional example · No investment or reported results</span></div><div role="tablist" aria-label="Two parts of an idea’s story" className="svd-tabs">{views.map(({ label, icon: Icon }, index) => <button key={label} ref={element => { buttons.current[index] = element; }} type="button" role="tab" id={`${prefix}-tab-${index}`} aria-controls={`${prefix}-panel`} aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={choose}><Icon size={17} aria-hidden="true" />{label}</button>)}</div>
      <div role="tabpanel" id={`${prefix}-panel`} aria-labelledby={`${prefix}-tab-${active}`} tabIndex={0} className="svd-panel"><h3>{current.title}</h3><p>{current.description}</p><dl>{current.fields.map(field => <div key={field.label}><dt>{field.label}</dt><dd>{field.text}</dd></div>)}</dl></div>
      <p className="svd-footnote">FindIn has not checked member claims. A written record makes an assumption easier to discuss; it does not prove demand or predict investment.</p>
    </div><a className="svd-link" href="#how-it-works">See the product walkthrough<ArrowRight size={16} aria-hidden="true" /></a>
  </section>;
}
