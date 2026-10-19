"use client";

import { useId, useState } from "react";
import { Check, Copy, Download, Calculator } from "lucide-react";
import { fundingScenario, type FundingMode } from "@/lib/planning-tools";
import "./term-sheet-generator.css";

const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
const number = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
const modeLabels: Record<FundingMode, string> = { "cap-discount": "Cap and discount", "cap-only": "Cap only", "discount-only": "Discount only" };

export default function TermSheetGenerator() {
  const id = useId();
  const [mode, setMode] = useState<FundingMode>("cap-discount");
  const [investment, setInvestment] = useState("2500000"), [cap, setCap] = useState("100000000");
  const [discount, setDiscount] = useState("20"), [shares, setShares] = useState("1000000"), [nextPrice, setNextPrice] = useState("125");
  const [copied, setCopied] = useState(false), [status, setStatus] = useState("");
  const scenario = fundingScenario({ mode, investmentINR: Number(investment), capINR: Number(cap), discountPercent: discount === "" ? NaN : Number(discount), fullyDilutedShares: Number(shares), nextRoundPriceINR: Number(nextPrice) });
  const usesCap = mode !== "discount-only", usesDiscount = mode !== "cap-only";
  const worksheet = () => `# FindIn funding scenario worksheet
Local planning assumptions. Not an agreement, offer, valuation, or approved legal document.

## Inputs
- Pricing model: ${modeLabels[mode]}
- Hypothetical investment: ${money(Number(investment))}
- Existing fully diluted shares: ${number(Number(shares))}
${usesCap ? `- Assumed cap valuation: ${money(Number(cap))}\n` : ""}${usesDiscount ? `- Assumed next-round share price: ${money(Number(nextPrice))}\n- Assumed price discount: ${discount}%\n` : ""}
## Simplified result
${scenario ? `- Cap-derived price: ${scenario.capPrice === null ? "Not used" : money(scenario.capPrice)}
- Discount-derived price: ${scenario.discountPrice === null ? "Not used" : money(scenario.discountPrice)}
- Selected illustrative price: ${money(scenario.conversionPrice)}
- Estimated new shares: ${number(scenario.newShares)}
- Share of existing plus modeled new shares: ${scenario.illustrativeOwnership.toFixed(2)}%` : "Complete valid inputs first."}

## Model limits
Cap price = cap valuation divided by existing fully diluted shares. Discount price = next-round price reduced by the selected discount. With both selected, the lower price is used. New shares = investment divided by that price.
This excludes other investors, new option pools, other convertible instruments, fees, taxes, share rounding and transaction-specific definitions. It does not establish an actual conversion price or ownership right. Nothing is saved or sent. Review real financing with qualified advisers.
`;
  const copy = async () => {
    if (!scenario) return;
    try { await navigator.clipboard.writeText(worksheet()); setCopied(true); setStatus("Worksheet copied. Nothing was sent to anyone."); }
    catch { setCopied(false); setStatus("Copy is unavailable. Download the worksheet instead."); }
  };
  const download = () => {
    if (!scenario) return;
    const url = URL.createObjectURL(new Blob([worksheet()], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "findin-funding-scenario.md";
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    setStatus("Worksheet downloaded. This is a planning example.");
  };
  return <section className="term-sheet-generator" aria-labelledby={`${id}-heading`}>
    <div className="ts-header"><div><span className="ts-kicker">EXPLORE THE NUMBERS</span><h3 id={`${id}-heading`} className="ts-title">Funding scenario worksheet</h3><p className="ts-desc">Compare a cap, a discount, or both using your own assumptions. This local model creates a discussion worksheet, not investment documents.</p></div><span className="ts-badge"><Calculator size={14} aria-hidden="true" />Planning example</span></div>
    <div className="ts-grid"><div className="ts-form-section">
      <div className="ts-field-group"><label htmlFor={`${id}-mode`}>Pricing assumption</label><select id={`${id}-mode`} className="ts-select" value={mode} onChange={event => { setMode(event.target.value as FundingMode); setCopied(false); }}>{Object.entries(modeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="ts-field-group"><label htmlFor={`${id}-investment`}>Hypothetical investment (INR)</label><input id={`${id}-investment`} type="number" min="1" step="1" className="ts-input" value={investment} onChange={event => { setInvestment(event.target.value); setCopied(false); }} /></div>
      <div className="ts-field-group"><label htmlFor={`${id}-shares`}>Existing fully diluted shares</label><input id={`${id}-shares`} type="number" min="1" step="1" className="ts-input" value={shares} onChange={event => { setShares(event.target.value); setCopied(false); }} /></div>
      {usesDiscount ? <div className="ts-field-group"><label htmlFor={`${id}-price`}>Assumed next-round price per share (INR)</label><input id={`${id}-price`} type="number" min="0.01" step="0.01" className="ts-input" value={nextPrice} onChange={event => { setNextPrice(event.target.value); setCopied(false); }} /></div> : null}
      {usesCap ? <div className="ts-field-group"><label htmlFor={`${id}-cap`}>Assumed cap valuation (INR)</label><input id={`${id}-cap`} type="number" min="1" step="1" className="ts-input" value={cap} onChange={event => { setCap(event.target.value); setCopied(false); }} /></div> : null}
      {usesDiscount ? <div className="ts-field-group"><label htmlFor={`${id}-discount`}>Assumed price discount (%)</label><input id={`${id}-discount`} type="number" min="0" max="99" step="1" className="ts-input" value={discount} onChange={event => { setDiscount(event.target.value); setCopied(false); }} /></div> : null}
    </div><div className="ts-preview-card"><h4 className="ts-preview-title">Illustrative calculation</h4>
      {scenario ? <><dl className="ts-scenario-results"><div><dt>Cap-derived price</dt><dd>{scenario.capPrice === null ? "Not used" : money(scenario.capPrice)}</dd></div><div><dt>Discount-derived price</dt><dd>{scenario.discountPrice === null ? "Not used" : money(scenario.discountPrice)}</dd></div><div><dt>Selected price per share</dt><dd>{money(scenario.conversionPrice)}</dd></div><div><dt>Estimated new shares</dt><dd>{number(scenario.newShares)}</dd></div><div><dt>Share of existing + modeled new shares</dt><dd>{scenario.illustrativeOwnership.toFixed(2)}%</dd></div></dl><p className="ts-model-note">Cap price = cap ÷ existing shares. Discount price = next-round price × (1 − discount). With both selected, the lower price is used.</p></> : <p className="notice" role="status">Enter positive amounts, a positive share count and a discount from 0 to less than 100% where used.</p>}
      <p className="ts-model-note">Other investors, new option pools, other instruments, fees and taxes are excluded. This does not predict final dilution or a business’s value.</p>
      <div className="ts-actions"><button type="button" className="primary-button" disabled={!scenario} onClick={() => void copy()}>{copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}<span>{copied ? "Copied" : "Copy worksheet"}</span></button><button type="button" className="outline-button" disabled={!scenario} onClick={download}><Download size={15} aria-hidden="true" /><span>Download .md</span></button></div>{status ? <p className="notice" role="status">{status}</p> : null}
    </div></div>
    <div className="ts-disclaimer">Planning only. Nothing is saved, sent, signed or issued. Real financing terms and legal requirements need separate professional review.</div>
  </section>;
}
