"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Check, Compass, FileText, Handshake, LockKeyhole, MessageCircle } from "lucide-react";

const steps = [
  {
    short: "Profile", title: "Shape your profile", icon: FileText,
    eyebrow: "PRIVATE UNTIL YOU LIST", heading: "Give the idea room to take shape.",
    text: "Write your ideology, proposed solution and next step. Your saved draft stays private until you choose to list it.",
    choice: "You choose the visibility", from: "Private draft", to: "Listed profile", note: "Listing makes your profile public.",
  },
  {
    short: "Explore", title: "Explore the fit", icon: Compass,
    eyebrow: "CONTEXT BEFORE CONTACT", heading: "Look closer before saying hello.",
    text: "Explore stages and sectors, compare up to three profiles, or save one to revisit. See stated interests alongside the open questions.",
    choice: "You choose what to explore", from: "Browse profiles", to: "Save or compare", note: "Saving a profile does not contact its owner.",
  },
  {
    short: "Introduce", title: "Ask for an introduction", icon: Handshake,
    eyebrow: "ACCEPTANCE COMES FIRST", heading: "A first conversation takes two.",
    text: "Send a short introduction with a reason to talk. The recipient can accept or decline before private messaging and proposals open.",
    choice: "The recipient decides", from: "Request sent", to: "Accept or decline", note: "An introduction is not an investment commitment.",
  },
  {
    short: "Discuss", title: "Move the conversation on", icon: MessageCircle,
    eyebrow: "PRIVATE DISCUSSION", heading: "Keep the next step in view.",
    text: "After acceptance, discuss the idea and exchange non-binding proposals. Keep a next-step note that only you can see.",
    choice: "Both people choose the next step", from: "Accepted intro", to: "Private discussion", note: "Formal agreements and investment happen separately.",
  },
];

export default function MarketingConnectionMap() {
  const [active, setActive] = useState(0);
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const step = steps[active];
  const chooseWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % steps.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index + steps.length - 1) % steps.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = steps.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    buttons.current[next]?.focus();
  };

  return <div className="connection-story-band">
    <section className="connection-story marketing-section" aria-labelledby={`${id}-title`}>
      <div className="connection-story-heading">
        <span className="marketing-kicker">A CLEAR PATH. AT YOUR PACE.</span>
        <h2 id={`${id}-title`}>Your next step.<br /><em>Your choice.</em></h2>
        <p>From a private draft to a shared conversation, every change in visibility or contact starts with a choice.</p>
        <a className="marketing-text-link" href="#how-it-works">See it in the product<ArrowRight size={16} aria-hidden="true" /></a>
      </div>
      <div className="connection-story-visual">
        <div className="connection-map-caption"><span><LockKeyhole size={13} aria-hidden="true" />Your information. Your decisions.</span><span>Select a step</span></div>
        <div className="connection-map-tabs" role="tablist" aria-label="The connection journey">
          <img className="connection-map-path" src="/illustrations/connection-path.svg" width="960" height="128" loading="lazy" decoding="async" alt="" aria-hidden="true" />
          {steps.map(({ short, title, icon: Icon }, index) => <button
            key={short} ref={element => { buttons.current[index] = element; }}
            type="button" role="tab" id={`${id}-step-${index}`}
            aria-label={`${index + 1}. ${title}`} aria-selected={active === index}
            aria-controls={`${id}-detail`} tabIndex={active === index ? 0 : -1}
            onClick={() => setActive(index)} onKeyDown={event => chooseWithKeyboard(event, index)}
          >
            <span className="connection-step-number">0{index + 1}</span>
            <span className="connection-step-icon"><Icon size={23} strokeWidth={1.65} aria-hidden="true" /></span>
            <strong><span className="connection-step-full">{title}</span><span className="connection-step-short">{short}</span></strong>
            <span className="connection-step-selected" aria-hidden="true">{active === index ? <Check size={12} /> : null}</span>
          </button>)}
        </div>
        <div className="connection-detail" role="tabpanel" id={`${id}-detail`} aria-labelledby={`${id}-step-${active}`} tabIndex={0}>
          <div className="connection-detail-copy" key={active}>
            <span className="connection-detail-eyebrow">{step.eyebrow}</span>
            <h3>{step.heading}</h3>
            <p>{step.text}</p>
          </div>
          <div className="connection-choice">
            <span>{step.choice}</span>
            <div><strong>{step.from}</strong><ArrowRight size={15} aria-hidden="true" /><strong>{step.to}</strong></div>
            <p>{step.note}</p>
          </div>
        </div>
      </div>
    </section>
  </div>;
}
