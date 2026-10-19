"use client";

import { useId, useState } from "react";
import { Check, Copy, Download, Coins } from "lucide-react";
import { allocationScenario } from "@/lib/planning-tools";
import "./syndicate-room.css";

const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
const ticketAmounts = [1000000, 500000, 250000];
const reviewTopics = ["Product and technical questions", "Customer references and permission to contact them", "Company records and share ownership", "Revenue assumptions, costs and runway", "Privacy and customer-data handling"];

export default function SyndicateRoom() {
  const id = useId();
  const [target, setTarget] = useState("5000000"), [lead, setLead] = useState("1500000");
  const [counts, setCounts] = useState([0, 0, 0]), [topics, setTopics] = useState<boolean[]>(reviewTopics.map(() => false));
  const [copied, setCopied] = useState(false), [status, setStatus] = useState("");
  const scenario = allocationScenario(Number(target), lead === "" ? NaN : Number(lead), ticketAmounts.map((amountINR, index) => ({ amountINR, count: counts[index] })));
  const balance = scenario ? scenario.status === "over" ? `${money(-scenario.differenceINR)} above target` : scenario.status === "under" ? `${money(scenario.differenceINR)} below target` : "Scenario matches target" : "Check your inputs";
  const worksheet = () => `# FindIn co-investment planning worksheet
Personal local scenario. No investors, commitments, fund, or shared review are recorded.

## Hypothetical amounts
- Target: ${money(Number(target))}
- Lead amount assumption: ${money(Number(lead))}
${ticketAmounts.map((amount, index) => `- ${counts[index]} hypothetical slot(s) at ${money(amount)}: ${money(counts[index] * amount)}`).join("\n")}
- Total modeled: ${scenario ? money(scenario.totalINR) : "Invalid inputs"}
- Balance: ${balance}
- Hypothetical slots: ${scenario?.slots ?? 0}

## Personal discussion topics
${reviewTopics.map((topic, index) => `- [${topics[index] ? "x" : " "}] ${topic}`).join("\n")}
Checked topics are reminders selected by the worksheet user, not completed checks, verified findings, or consensus.

## Limits
Amounts and slots are planning assumptions, not offers, subscriptions, allocations or commitments. Nothing is saved or sent. No securities, payments, pooled funds or investor verification are handled by this worksheet. A real financing structure needs separate professional review.
`;
  const copy = async () => {
    if (!scenario) return;
    try { await navigator.clipboard.writeText(worksheet()); setCopied(true); setStatus("Personal worksheet copied. Nobody was contacted."); }
    catch { setCopied(false); setStatus("Copy is unavailable. Download the worksheet instead."); }
  };
  const download = () => {
    if (!scenario) return;
    const url = URL.createObjectURL(new Blob([worksheet()], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "findin-co-investment-planning.md";
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    setStatus("Personal worksheet downloaded. No commitments were recorded.");
  };
  const changeCount = (index: number, change: number) => {
    setCounts(current => current.map((count, position) => position === index ? Math.max(0, Math.min(1000, count + change)) : count));
    setCopied(false);
  };
  return <section className="syndicate-room" aria-labelledby={`${id}-heading`}>
    <div className="syn-header"><div><span className="syn-kicker">PERSONAL PLANNING EXAMPLE</span><h3 id={`${id}-heading`} className="syn-title">Co-investment planning worksheet</h3><p className="syn-desc">Try hypothetical ticket sizes against a target. This stays on your page; it is not a shared room or a record of investor interest.</p></div><span className="syn-badge"><Coins size={14} aria-hidden="true" />Local scenario</span></div>
    <div className="syn-grid"><div className="syn-form-section">
      <div className="syn-field-group"><label htmlFor={`${id}-target`}>Hypothetical target (INR)</label><input id={`${id}-target`} type="number" min="1" step="1" className="syn-input" value={target} onChange={event => { setTarget(event.target.value); setCopied(false); }} /></div>
      <div className="syn-field-group"><label htmlFor={`${id}-lead`}>Hypothetical lead amount (INR)</label><input id={`${id}-lead`} type="number" min="0" step="1" className="syn-input" value={lead} onChange={event => { setLead(event.target.value); setCopied(false); }} /></div>
      <div className="syn-tier-list"><strong className="syn-topic-heading">Additional hypothetical tickets</strong>{ticketAmounts.map((amount, index) => <div className="syn-tier-row" key={amount}><span>{money(amount)} each</span><div className="syn-ticket-controls"><button type="button" className="outline-button" disabled={counts[index] === 0} aria-label={`Remove a ${money(amount)} hypothetical ticket`} onClick={() => changeCount(index, -1)}>−</button><output aria-label={`${money(amount)} ticket count`}>{counts[index]}</output><button type="button" className="outline-button" disabled={counts[index] >= 1000} aria-label={`Add a ${money(amount)} hypothetical ticket`} onClick={() => changeCount(index, 1)}>+</button></div></div>)}</div>
    </div><div className="syn-allocation-breakdown"><h4 className="syn-breakdown-title"><span>Modeled totals</span></h4>
      {scenario ? <><p className="syn-scenario-balance" role="status">{balance}</p><div className="syn-stat-pills"><div className="syn-stat-card"><span className="syn-stat-label">Modeled amount</span><span className="syn-stat-num">{money(scenario.totalINR)}</span></div><div className="syn-stat-card"><span className="syn-stat-label">Of hypothetical target</span><span className="syn-stat-num">{scenario.percent.toFixed(1)}%</span></div><div className="syn-stat-card"><span className="syn-stat-label">Hypothetical slots</span><span className="syn-stat-num">{scenario.slots}</span></div></div></> : <p className="notice" role="status">Enter a positive target and a lead amount of zero or more.</p>}
      <fieldset className="syn-diligence-matrix"><legend>Topics for your next discussion</legend><p className="syn-review-note">Selecting a topic makes a personal reminder. It does not verify anything or record another person’s review.</p>{reviewTopics.map((topic, index) => <label key={topic}><input type="checkbox" checked={topics[index]} onChange={() => { setTopics(current => current.map((checked, position) => position === index ? !checked : checked)); setCopied(false); }} /><span>{topic}</span></label>)}</fieldset>
      <div className="syn-actions"><button type="button" className="primary-button" disabled={!scenario} onClick={() => void copy()}>{copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}<span>{copied ? "Copied" : "Copy worksheet"}</span></button><button type="button" className="outline-button" disabled={!scenario} onClick={download}><Download size={14} aria-hidden="true" /><span>Download .md</span></button></div>{status ? <p className="notice" role="status">{status}</p> : null}
    </div></div>
    <div className="syn-disclaimer">Planning only. These numbers are not commitments or verified allocations. No money, securities, signatures or invitations are handled here.</div>
  </section>;
}
