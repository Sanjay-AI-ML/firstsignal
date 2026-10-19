"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, FlaskConical, LockKeyhole } from "lucide-react";
import "./marketing-pitch-canvas.css";

export const learningWalkthrough = [
  { label: "Question", heading: "Choose one assumption.", prompt: "What needs to be true?", detail: "Workshop leads can use a short digital handover without someone explaining it.", context: "Start with a question you could find evidence for or against." },
  { label: "Plan", heading: "Define the result before testing.", prompt: "Original success condition", detail: "Both participating workshop leads finish a handover without help.", context: "In this fictional plan, the criterion is written before the activity. Starting a real FindIn test locks its plan." },
  { label: "Observation", heading: "Write down what happened.", prompt: "Observed in this example", detail: "One lead finished. The other needed help finding unfinished work.", context: "This small test did not meet its original condition. It says nothing about how often people would use or pay for the service." },
  { label: "Decision", heading: "Choose the next useful move.", prompt: "The founder’s next decision", detail: "Change the layout and run another small test. Willingness to pay is still unknown.", context: "The founder can keep the completed record private or explicitly share it. Shared records remain founder-reported." },
] as const;

export default function MarketingPitchCanvas() {
  const [active, setActive] = useState(0);
  const prefix = useId(), buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const current = learningWalkthrough[active];
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    let next = active;
    if (event.key === "ArrowRight") next = (active + 1) % learningWalkthrough.length;
    else if (event.key === "ArrowLeft") next = (active + learningWalkthrough.length - 1) % learningWalkthrough.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = learningWalkthrough.length - 1;
    else return;
    event.preventDefault(); setActive(next); buttons.current[next]?.focus();
  };
  return <section className="pitch-canvas-wrapper" aria-labelledby={`${prefix}-heading`}>
    <header className="pitch-canvas-heading"><FlaskConical size={21} aria-hidden="true" /><div><span>TEST & LEARN / FICTIONAL WALKTHROUGH</span><h3 id={`${prefix}-heading`}>A test can change the next step.</h3></div></header>
    <p className="pitch-canvas-intro">Follow one made-up Tracegrid test. Selecting a step changes this example; it saves no records.</p>
    <div className="pitch-canvas-tabs" role="tablist" aria-label="A test from question to decision">{learningWalkthrough.map((step, index) => <button key={step.label} type="button" ref={element => { buttons.current[index] = element; }} role="tab" id={`${prefix}-tab-${index}`} aria-controls={`${prefix}-panel`} aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={keyboard}><span aria-hidden="true">0{index + 1}</span>{step.label}</button>)}</div>
    <div className="pitch-canvas-panel" role="tabpanel" id={`${prefix}-panel`} aria-labelledby={`${prefix}-tab-${active}`} tabIndex={0}><span className="pitch-canvas-step">Step {active + 1} of {learningWalkthrough.length}</span><h4>{current.heading}</h4><dl><dt>{current.prompt}</dt><dd>{current.detail}</dd></dl><p>{current.context}</p></div>
    <div className="pitch-canvas-actions"><button type="button" disabled={active === 0} onClick={() => setActive(value => Math.max(0, value - 1))}><ArrowLeft size={15} aria-hidden="true" />Previous</button><button type="button" onClick={() => setActive(value => (value + 1) % learningWalkthrough.length)}>{active === learningWalkthrough.length - 1 ? "Start again" : "Next step"}<ArrowRight size={15} aria-hidden="true" /></button></div>
    <p className="pitch-canvas-disclosure"><LockKeyhole size={15} aria-hidden="true" />Fictional example. A test record provides context; FindIn does not check its accuracy, predict investment or certify demand.</p>
  </section>;
}
