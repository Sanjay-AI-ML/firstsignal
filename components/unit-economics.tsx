"use client";

import { useState, useMemo, useId } from "react";
import { Calculator, Download, Copy, Check } from "lucide-react";
import "./unit-economics.css";

export function modelUnitEconomics(arpuINR: number, cacINR: number, grossMarginPercent: number, monthlyChurnPercent: number) {
  if (![arpuINR, cacINR, grossMarginPercent, monthlyChurnPercent].every(Number.isFinite) || arpuINR < 0 || cacINR < 0 || grossMarginPercent < 0 || grossMarginPercent > 100 || monthlyChurnPercent < 0 || monthlyChurnPercent > 100) throw new RangeError("Use nonnegative finite amounts and percentages from 0 to 100.");
  const monthlyGrossProfit = arpuINR * grossMarginPercent / 100;
  const customerLifetimeMonths = monthlyChurnPercent > 0 ? 100 / monthlyChurnPercent : null;
  const ltv = customerLifetimeMonths === null ? null : monthlyGrossProfit * customerLifetimeMonths;
  const ltvCacRatio = ltv !== null && cacINR > 0 ? ltv / cacINR : null;
  const paybackMonths = cacINR === 0 ? 0 : monthlyGrossProfit > 0 ? cacINR / monthlyGrossProfit : null;
  const summary = monthlyChurnPercent === 0
    ? "At zero churn, this constant-churn formula cannot estimate a finite customer lifetime or lifetime gross profit. It does not imply unlimited value."
    : monthlyGrossProfit === 0 && cacINR > 0
    ? "At these inputs there is no monthly gross profit to recover acquisition cost, so no finite payback is modeled."
    : cacINR === 0
    ? "At zero acquisition cost, there is no cost to recover and the LTV:CAC ratio is undefined. Check whether all acquisition costs are included."
    : "Lifetime gross profit is monthly gross profit divided by constant monthly churn. Payback divides acquisition cost by monthly gross profit. These formulas do not assess business quality or funding prospects.";
  return { monthlyGrossProfit, customerLifetimeMonths, ltv, ltvCacRatio, paybackMonths, summary };
}
const modelNumber = (value: number | null, digits = 1) => value === null ? "Not estimable" : value.toLocaleString("en-IN", { maximumFractionDigits: digits });

export default function UnitEconomics() {
  const [arpuINR, setArpuINR] = useState<number>(6500); // Monthly ARPU
  const [cacINR, setCacINR] = useState<number>(18000); // Blended CAC
  const [grossMarginPercent, setGrossMarginPercent] = useState<number>(75); // 75% margin
  const [monthlyChurnPercent, setMonthlyChurnPercent] = useState<number>(3); // 3% churn
  const [copied, setCopied] = useState<boolean>(false);
  const formId = useId();

  const metrics = useMemo(() => modelUnitEconomics(arpuINR, cacINR, grossMarginPercent, monthlyChurnPercent), [arpuINR, cacINR, grossMarginPercent, monthlyChurnPercent]);

  const generateReportMarkdown = () => `# FindIn recurring-revenue scenario
Local calculation with hypothetical defaults, separate from any profile being viewed. Inputs are not stored. Assumes constant monthly churn and gross margin; excludes expansion, discounting and overhead.

## Inputs
- Monthly revenue per account: ₹${arpuINR.toLocaleString("en-IN")}
- Acquisition cost per account: ₹${cacINR.toLocaleString("en-IN")}
- Gross margin: ${grossMarginPercent}%
- Monthly churn: ${monthlyChurnPercent}%

## Modeled outputs
- Monthly gross profit per account: ₹${modelNumber(metrics.monthlyGrossProfit, 2)}
- Customer lifetime under constant churn: ${modelNumber(metrics.customerLifetimeMonths)}${metrics.customerLifetimeMonths === null ? "" : " months"}
- Lifetime gross profit: ${metrics.ltv === null ? "Not estimable at zero churn" : `₹${modelNumber(metrics.ltv)}`}
- Lifetime gross profit / acquisition cost: ${metrics.ltvCacRatio === null ? "Not estimable with these inputs" : `${modelNumber(metrics.ltvCacRatio)}x`}
- Gross-profit payback: ${metrics.paybackMonths === null ? "No finite payback at these inputs" : `${modelNumber(metrics.paybackMonths)} months`}

${metrics.summary}
Review actual customer cohorts and complete acquisition costs. No industry benchmark, investment recommendation or funding assessment is made.
`;


  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateReportMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generateReportMarkdown()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "findin-unit-economics-audit.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="unit-economics" aria-labelledby={`${formId}-title`}>
      <div className="econ-header">
        <div className="econ-title-wrap">
          <div className="econ-badge">
            <Calculator size={14} aria-hidden="true" />
            <span>LOCAL PLANNING · HYPOTHETICAL DEFAULTS</span>
          </div>
          <h4 id={`${formId}-title`}>Explore a recurring-revenue scenario</h4>
          <p className="econ-subtitle">
            These hypothetical defaults are separate from this profile. Model constant monthly churn, revenue per account and gross margin. This browser-only calculation does not verify a business or suit every business model.
          </p>
        </div>
        <div className="econ-actions-top">
          <button type="button" onClick={handleCopy} className="econ-btn-secondary" aria-label="Copy unit economics to clipboard">
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            <span>{copied ? "Copied" : "Copy scenario (.md)"}</span>
          </button>
          <button type="button" onClick={handleDownload} className="econ-btn-primary" aria-label="Download unit economics as Markdown">
            <Download size={14} aria-hidden="true" />
            <span>Export scenario</span>
          </button>
        </div>
      </div>

      <div className="econ-layout">
        {/* Controls */}
        <div className="econ-controls">
          <div className="econ-field">
            <div className="field-row">
              <label htmlFor={`${formId}-arpu`}>Monthly ARPU (Revenue / Account)</label>
              <strong>₹{arpuINR.toLocaleString("en-IN")}</strong>
            </div>
            <input
              id={`${formId}-arpu`}
              type="range"
              min="0"
              max="50000"
              step="500"
              value={arpuINR}
              onChange={(e) => setArpuINR(Number(e.target.value))}
              className="econ-range"
            />
          </div>

          <div className="econ-field">
            <div className="field-row">
              <label htmlFor={`${formId}-cac`}>Blended Customer Acquisition Cost (CAC)</label>
              <strong>₹{cacINR.toLocaleString("en-IN")}</strong>
            </div>
            <input
              id={`${formId}-cac`}
              type="range"
              min="0"
              max="100000"
              step="1000"
              value={cacINR}
              onChange={(e) => setCacINR(Number(e.target.value))}
              className="econ-range"
            />
          </div>

          <div className="econ-field">
            <div className="field-row">
              <label htmlFor={`${formId}-margin`}>Gross Margin %</label>
              <strong>{grossMarginPercent}%</strong>
            </div>
            <input
              id={`${formId}-margin`}
              type="range"
              min="0"
              max="100"
              step="5"
              value={grossMarginPercent}
              onChange={(e) => setGrossMarginPercent(Number(e.target.value))}
              className="econ-range"
            />
            <div className="range-subtext">
              <span>0%</span>
              <span>Selected gross-profit share</span>
              <span>100%</span>
            </div>
          </div>

          <div className="econ-field">
            <div className="field-row">
              <label htmlFor={`${formId}-churn`}>Monthly Logo Churn %</label>
              <strong>{monthlyChurnPercent}%</strong>
            </div>
            <input
              id={`${formId}-churn`}
              type="range"
              min="0"
              max="12"
              step="0.5"
              value={monthlyChurnPercent}
              onChange={(e) => setMonthlyChurnPercent(Number(e.target.value))}
              className="econ-range"
            />
            <div className="range-subtext">
              <span>0%: no finite lifetime estimate</span>
              <span>Constant churn assumption</span>
              <span>12%</span>
            </div>
          </div>
        </div>

        <div className="econ-results-card">
          <div className="econ-score-header"><div><span className="rating-kicker">SIMPLIFIED MODEL</span><h5 className="rating-title">Gross profit and acquisition cost</h5></div><span className="rating-pill">{metrics.ltvCacRatio === null ? "Ratio unavailable" : `${modelNumber(metrics.ltvCacRatio)}x LTV:CAC`}</span></div>
          <div className="econ-metrics-grid">
            <div className="metric-box"><span className="box-sub">Lifetime gross profit</span><strong className="box-val text-purple">{metrics.ltv === null ? "Not estimable" : `₹${modelNumber(metrics.ltv)}`}</strong><span className="box-note">{metrics.customerLifetimeMonths === null ? "No finite lifetime at zero churn" : `Constant-churn lifetime: ${modelNumber(metrics.customerLifetimeMonths)} months`}</span></div>
            <div className="metric-box"><span className="box-sub">Gross-profit payback</span><strong className="box-val">{metrics.paybackMonths === null ? "No finite payback" : `${modelNumber(metrics.paybackMonths)} mo`}</strong><span className="box-note">{cacINR === 0 ? "No acquisition cost to recover" : "Acquisition cost ÷ monthly gross profit"}</span></div>
            <div className="metric-box"><span className="box-sub">Gross profit / month</span><strong className="box-val">₹{modelNumber(metrics.monthlyGrossProfit, 2)}</strong><span className="box-note">{grossMarginPercent}% of revenue per account</span></div>
            <div className="metric-box"><span className="box-sub">Lifetime gross profit / CAC</span><strong className="box-val">{metrics.ltvCacRatio === null ? "Not estimable" : `${modelNumber(metrics.ltvCacRatio)}x`}</strong><span className="box-note">{cacINR === 0 ? "A ratio is undefined at zero acquisition cost" : "No industry benchmark is applied"}</span></div>
          </div>
          <div className="econ-summary-alert"><Calculator size={16} aria-hidden="true" /><p>{metrics.summary}</p></div>
        </div>
      </div>

      <div className="econ-footer-note">
        <span className="econ-tag">FINANCIAL MODELING AID</span>
        <span>
          Local constant-churn calculation, separate from any member profile. Costs, retention and revenue can change across cohorts. These outputs are not a funding assessment.
        </span>
      </div>
    </div>
  );
}
