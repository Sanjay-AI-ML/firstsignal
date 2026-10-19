"use client";

import { ArrowRight, FlaskConical, Sprout } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import "./marketing-signal-ticker.css";

export const illustrativeQuestions = [
  { name: "Tracegrid", sector: "Manufacturing", question: "Can a workshop lead finish a handover without help?", next: "Watch two consenting leads try a small prototype. Record where they need help." },
  { name: "Learning Bridge", sector: "Education", question: "Which part of preparing a lesson takes the most time?", next: "Ask teachers about their most recent lesson and the tools they already use." },
  { name: "Food Circle", sector: "Food & services", question: "Would a regular collection slot solve the problem?", next: "Offer a clearly described trial. Separate actual bookings from expressions of interest." },
  { name: "UrbanCharge", sector: "Clean energy", question: "Who decides whether a building can run a charging trial?", next: "Speak with the people responsible for the decision. Document constraints before promising a pilot." },
] as const;

/** Educational examples, never a simulated live network feed. */
export default function MarketingSignalTicker() {
  return <section className="marketing-ticker-band" aria-label="Fictional startup questions">
    <div className="ticker-intro"><Sprout size={18} aria-hidden="true" /><div><strong>One useful question.</strong><span>Fictional examples · Select one to explore</span></div></div>
    <div className="ticker-examples">{illustrativeQuestions.map(example => <Dialog key={example.name}>
      <DialogTrigger asChild><button type="button" className="ticker-example"><span>{example.sector}</span><strong>{example.name}</strong><span className="ticker-question">{example.question}</span><ArrowRight size={15} aria-hidden="true" /></button></DialogTrigger>
      <DialogContent className="ticker-example-dialog"><DialogHeader><span className="ticker-example-label">FICTIONAL IDEA / {example.sector}</span><DialogTitle>{example.name}: a question worth testing</DialogTitle><DialogDescription>This is a made-up planning example. It is not a FindIn member, reported result or available investment.</DialogDescription></DialogHeader><div className="ticker-example-question"><FlaskConical size={20} aria-hidden="true" /><h3>{example.question}</h3></div><div><h4>A possible next step</h4><p>{example.next}</p></div><p className="ticker-example-note">The activity could leave the assumption unsupported or unresolved. Record what happens before deciding what comes next.</p><a className="ticker-example-link" href="/app#profiles">Explore your own idea in FindIn<ArrowRight size={15} aria-hidden="true" /></a></DialogContent>
    </Dialog>)}</div>
  </section>;
}
