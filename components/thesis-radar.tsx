"use client";

import { useState, useMemo, useId } from "react";
import { SlidersHorizontal, Check, Download, Copy, Target, Sparkles, Briefcase, TrendingUp } from "lucide-react";
import "./thesis-radar.css";

interface OpportunityCandidate {
  id: string;
  name: string;
  sector: string;
  stage: "Idea-stage" | "Pre-product" | "Pre-revenue" | "Pre-seed";
  budgetINR: number;
  evidenceType: "interviews" | "pilot" | "prototype" | "loi";
  evidenceCount: number;
  tagline: string;
}

const SAMPLE_OPPORTUNITIES: OpportunityCandidate[] = [
  {
    id: "tracegrid",
    name: "Tracegrid",
    sector: "Manufacturing SaaS",
    stage: "Pre-product",
    budgetINR: 1800000,
    evidenceType: "interviews",
    evidenceCount: 14,
    tagline: "Handover tracking for precision manufacturing machine shops.",
  },
  {
    id: "pulseroute",
    name: "PulseRoute",
    sector: "Logistics",
    stage: "Pre-seed",
    budgetINR: 3500000,
    evidenceType: "pilot",
    evidenceCount: 4,
    tagline: "Cold-chain route verification for perishable dairy distributors.",
  },
  {
    id: "biosyn",
    name: "BioSynthetica",
    sector: "Health & Biotech",
    stage: "Pre-product",
    budgetINR: 2500000,
    evidenceType: "interviews",
    evidenceCount: 22,
    tagline: "Point-of-care antimicrobial resistance screening workflow.",
  },
  {
    id: "kisanscale",
    name: "KisanScale",
    sector: "Agriculture",
    stage: "Idea-stage",
    budgetINR: 1200000,
    evidenceType: "interviews",
    evidenceCount: 8,
    tagline: "Post-harvest moisture testing kiosk for smallholder grain farmers.",
  },
  {
    id: "urbancharge",
    name: "UrbanCharge",
    sector: "Clean Energy",
    stage: "Pre-seed",
    budgetINR: 4000000,
    evidenceType: "loi",
    evidenceCount: 3,
    tagline: "Shared residential EV charging management with automated billing.",
  },
];

export function matchFictionalOpportunity(opp: OpportunityCandidate, selectedSector: string, stageAppetite: string, targetTicketINR: number, evidenceRequirement: "any" | "interviews" | "pilot_loi") {
  let score = 100;
  const reasons: string[] = [];
  if (selectedSector !== "all") {
    const matches = opp.sector.toLowerCase().includes(selectedSector.toLowerCase());
    if (!matches) score -= 30;
    reasons.push(matches ? "Selected sector" : "Different sector");
  } else reasons.push("Any sector selected");
  if (stageAppetite !== "all") {
    if (opp.stage !== stageAppetite) score -= 20;
    reasons.push(opp.stage === stageAppetite ? `Selected stage (${opp.stage})` : `Different stage (${opp.stage})`);
  }
  const withinBudget = targetTicketINR > 0 && Math.abs(opp.budgetINR - targetTicketINR) / targetTicketINR <= .4;
  if (!withinBudget) score -= 15;
  reasons.push(withinBudget ? "Example budget within ±40% of selected ticket" : opp.budgetINR > targetTicketINR ? "Example budget above selected ticket" : "Example budget below selected ticket");
  if (evidenceRequirement === "pilot_loi") {
    const meets = (opp.evidenceType === "pilot" || opp.evidenceType === "loi") && opp.evidenceCount > 0;
    if (!meets) score -= 25;
    reasons.push(meets ? `Fictional ${opp.evidenceType === "loi" ? "LOIs" : "pilots"}: ${opp.evidenceCount}` : "This example does not list a pilot or LOI");
  } else if (evidenceRequirement === "interviews") {
    const meets = opp.evidenceType === "interviews" && opp.evidenceCount >= 10;
    if (!meets) score -= 25;
    reasons.push(opp.evidenceType === "interviews" ? `Fictional interviews: ${opp.evidenceCount}${meets ? " (meets the example threshold)" : " (below the example threshold)"}` : "Interview count is not provided in this example");
  }
  return { ...opp, matchScore: Math.max(0, score), reasons };
}

export function planExampleAllocation(annualBudgetINR: number, targetTicketINR: number, reserveRatio: number) {
  if (![annualBudgetINR, targetTicketINR, reserveRatio].every(Number.isFinite) || annualBudgetINR < 0 || targetTicketINR <= 0 || reserveRatio < 0 || reserveRatio > 100) throw new RangeError("Use a nonnegative budget, positive ticket and reserve from 0 to 100%.");
  const followOnReserve = annualBudgetINR * reserveRatio / 100;
  const initialCapital = annualBudgetINR - followOnReserve;
  const estimatedDeals = Math.floor(initialCapital / targetTicketINR);
  return { initialCapital, followOnReserve, estimatedDeals, unallocatedCapital: initialCapital - estimatedDeals * targetTicketINR };
}

export default function ThesisRadar() {
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [stageAppetite, setStageAppetite] = useState<string>("all");
  const [targetTicketINR, setTargetTicketINR] = useState<number>(2500000); // 25 Lakhs
  const [evidenceRequirement, setEvidenceRequirement] = useState<"any" | "interviews" | "pilot_loi">("interviews");
  const [annualBudgetINR, setAnnualBudgetINR] = useState<number>(10000000); // 1 Crore
  const [reserveRatio, setReserveRatio] = useState<number>(40); // 40% for follow-ons
  const [copied, setCopied] = useState<boolean>(false);
  const formId = useId();

  const matchedList = useMemo(() => SAMPLE_OPPORTUNITIES.map(opp => matchFictionalOpportunity(opp, selectedSector, stageAppetite, targetTicketINR, evidenceRequirement)).sort((a, b) => b.matchScore - a.matchScore), [selectedSector, stageAppetite, targetTicketINR, evidenceRequirement]);
  const { initialCapital, followOnReserve, estimatedDeals, unallocatedCapital } = planExampleAllocation(annualBudgetINR, targetTicketINR, reserveRatio);

  const generateThesisMemo = () => {
    return `# Investor Mandate & Deal-Flow Thesis Memo
FindIn local example exercise. Fictional opportunities, not live recommendations or an available investment offer. Inputs are not saved.

## 1. Investment Thesis Parameters
- **Target Primary Stage**: ${stageAppetite === "all" ? "Agnostic (Idea to Pre-seed)" : stageAppetite}
- **Sector Focus**: ${selectedSector === "all" ? "Generalist / Cross-Industry" : selectedSector}
- **Target Cheque Size**: ₹${(targetTicketINR / 100000).toFixed(1)} Lakhs
- **Evidence Threshold**: ${
      evidenceRequirement === "pilot_loi"
        ? "Example lists a pilot or letter of intent"
        : evidenceRequirement === "interviews"
        ? "Example lists at least 10 interviews (not independently checked)"
        : "Flexible"
    }

## 2. Portfolio Construction & Reserve Strategy
- **Annual Investment Pool**: ₹${(annualBudgetINR / 10000000).toFixed(2)} Cr
- **Initial Check Deployment**: ₹${(initialCapital / 10000000).toFixed(2)} Cr (${estimatedDeals} full-sized tickets within the budget)
- **Selected follow-on reserve**: ₹${(followOnReserve / 10000000).toFixed(2)} Cr (${reserveRatio}%)
- **Unallocated initial budget after whole tickets**: ₹${(unallocatedCapital / 100000).toFixed(2)}L

## 3. Example matches (fictional; preset scoring weights)
${matchedList
  .slice(0, 3)
  .map(
    (m) =>
      `- **${m.name}** (${m.sector} · ${m.stage}): **${m.matchScore}/100 example points**
  - Rationale: ${m.reasons.join(", ")}
  - Planning Budget: ₹${(m.budgetINR / 100000).toFixed(1)}L`
  )
  .join("\n")}

## 4. Governance & Diligence Boundary
- This export uses five fictional opportunities and preset scoring weights, not real member data. Inputs and filters are not saved to an account.
- These preset point weights and budget divisions do not establish suitability, ownership, investor responses or likely investment outcomes.
`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateThesisMemo());
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generateThesisMemo()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "findin-investor-thesis-mandate.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="thesis-radar" aria-labelledby={`${formId}-title`}>
      <div className="thesis-radar-header">
        <div className="thesis-title-wrap">
          <div className="thesis-badge">
            <Target size={14} aria-hidden="true" />
            <span>FICTIONAL OPPORTUNITIES · LOCAL PLANNING</span>
          </div>
          <h3 id={`${formId}-title`}>Explore your investment interests</h3>
          <p className="thesis-desc">
            Try sector, stage and budget preferences on five fictional opportunities. The local point scale starts at 100: a different sector subtracts 30, a different stage 20, budget outside ±40% of the selected ticket 15, and missing selected evidence 25. These are preset preferences, not probabilities, live matches or investment assessments.
          </p>
        </div>
        <div className="thesis-actions-top">
          <button type="button" onClick={handleCopy} className="thesis-btn-secondary" aria-label="Copy thesis memo to clipboard">
            {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            <span>{copied ? "Copied Memo" : "Copy Thesis (.md)"}</span>
          </button>
          <button type="button" onClick={handleDownload} className="thesis-btn-primary" aria-label="Download thesis memo as Markdown">
            <Download size={15} aria-hidden="true" />
            <span>Export Mandate</span>
          </button>
        </div>
      </div>

      <div className="thesis-layout">
        {/* Left: Thesis Controls */}
        <div className="thesis-controls-panel">
          <div className="control-group-title">
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span>1. Set Your Investment Mandate</span>
          </div>

          <div className="thesis-field">
            <label htmlFor={`${formId}-sector`}>Sector Focus</label>
            <select
              id={`${formId}-sector`}
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="thesis-select"
            >
              <option value="all">All Sectors (Generalist)</option>
              <option value="Manufacturing">Manufacturing & Industrial</option>
              <option value="Logistics">Logistics & Supply Chain</option>
              <option value="Health">Health & BioTech</option>
              <option value="Agriculture">AgriTech & Rural Solutions</option>
              <option value="Clean Energy">Clean Energy & Climate</option>
            </select>
          </div>

          <div className="thesis-field">
            <label htmlFor={`${formId}-stage`}>Stage Appetite</label>
            <select
              id={`${formId}-stage`}
              value={stageAppetite}
              onChange={(e) => setStageAppetite(e.target.value)}
              className="thesis-select"
            >
              <option value="all">All Stages (Idea to Pre-seed)</option>
              <option value="Idea-stage">Idea-stage (Problem & Hypotheses)</option>
              <option value="Pre-product">Pre-product (Customer Discovery & Wireframes)</option>
              <option value="Pre-seed">Pre-seed (Functional Prototype / Early Pilots)</option>
            </select>
          </div>

          <div className="thesis-field">
            <div className="field-label-row">
              <label htmlFor={`${formId}-ticket`}>Target Cheque Size (₹)</label>
              <strong>₹{(targetTicketINR / 100000).toFixed(1)} Lakhs</strong>
            </div>
            <input
              id={`${formId}-ticket`}
              type="range"
              min="1000000"
              max="10000000"
              step="500000"
              value={targetTicketINR}
              onChange={(e) => setTargetTicketINR(Number(e.target.value))}
              className="thesis-range"
            />
            <div className="range-bounds">
              <span>₹10L (Angel)</span>
              <span>₹50L (Syndicate)</span>
              <span>₹1Cr (Micro-VC)</span>
            </div>
          </div>

          <div className="thesis-field">
            <label htmlFor={`${formId}-evidence`}>Evidence stated in the fictional example</label>
            <select
              id={`${formId}-evidence`}
              value={evidenceRequirement}
              onChange={(e) => setEvidenceRequirement(e.target.value as "any" | "interviews" | "pilot_loi")}
              className="thesis-select"
            >
              <option value="any">Flexible / Open Exploration</option>
              <option value="interviews">At least 10 listed interviews</option>
              <option value="pilot_loi">Listed pilot or letter of intent</option>
            </select>
          </div>

          <div className="portfolio-calc-box">
            <div className="portfolio-top">
              <Briefcase size={16} aria-hidden="true" />
              <strong>Portfolio Construction Sandbox</strong>
            </div>
            <div className="portfolio-inputs">
              <div>
                <label htmlFor={`${formId}-pool`}>Annual Pool</label>
                <select
                  id={`${formId}-pool`}
                  value={annualBudgetINR}
                  onChange={(e) => setAnnualBudgetINR(Number(e.target.value))}
                  className="thesis-select-sm"
                >
                  <option value={5000000}>₹50 Lakhs</option>
                  <option value={10000000}>₹1 Crore</option>
                  <option value={20000000}>₹2 Crores</option>
                  <option value={50000000}>₹5 Crores</option>
                </select>
              </div>
              <div>
                <label htmlFor={`${formId}-reserve`}>Follow-on Reserve</label>
                <select
                  id={`${formId}-reserve`}
                  value={reserveRatio}
                  onChange={(e) => setReserveRatio(Number(e.target.value))}
                  className="thesis-select-sm"
                >
                  <option value={30}>30% Reserve</option>
                  <option value={40}>40% Reserve</option>
                  <option value={50}>50% Reserve</option>
                </select>
              </div>
            </div>
            <div className="portfolio-stats">
              <div className="p-stat">
                <span>Full-sized tickets within budget</span>
                <strong>{estimatedDeals} tickets</strong>
              </div>
              <div className="p-stat">
                <span>Selected follow-on reserve</span>
                <strong>₹{(followOnReserve / 100000).toFixed(0)}L</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Matched Opportunities & Deal Pipeline */}
        <div className="thesis-results-panel">
          <div className="results-header-row">
            <div className="results-title">
              <Sparkles size={16} aria-hidden="true" />
              <span>Example preference comparisons</span>
            </div>
            <span className="results-count">
              {matchedList.filter((m) => m.matchScore >= 70).length} examples with 70+ points
            </span>
          </div>

          <div className="matched-cards-list">
            {matchedList.map((opp) => (
              <div
                key={opp.id}
                className={`opp-match-card ${opp.matchScore >= 85 ? "high-match" : opp.matchScore >= 70 ? "medium-match" : "low-match"}`}
              >
                <div className="opp-match-top">
                  <div>
                    <div className="opp-meta-row">
                      <span className="opp-sector-tag">{opp.sector}</span>
                      <span className="opp-stage-tag">{opp.stage}</span>
                    </div>
                    <h4 className="opp-name">{opp.name}</h4>
                  </div>
                  <div className="match-score-badge">
                    <span className="score-num">{opp.matchScore}/100</span>
                    <span className="score-label">Example points</span>
                  </div>
                </div>

                <p className="opp-tagline">{opp.tagline}</p>

                <div className="opp-reasons-list">
                  {opp.reasons.map((r, i) => (
                    <span key={i} className="reason-pill">
                      <Check size={12} aria-hidden="true" />
                      {r}
                    </span>
                  ))}
                </div>

                <div className="opp-footer-row">
                  <span className="opp-budget">
                    Planning Budget: <strong>₹{(opp.budgetINR / 100000).toFixed(1)}L</strong>
                  </span>
                  <a href="/app#discover" className="opp-inspect-btn">
                    Explore the real directory
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="deal-funnel-card">
            <div className="funnel-top"><TrendingUp size={16} aria-hidden="true" /><strong>Budget arithmetic, not a deal forecast</strong></div>
            <div className="funnel-stages"><div className="funnel-stage"><span className="f-count">₹{(initialCapital / 100000).toFixed(1)}L</span><span className="f-label">Initial budget after reserve</span></div><div className="funnel-stage"><span className="f-count">{estimatedDeals}</span><span className="f-label">Whole tickets at the selected amount</span></div><div className="funnel-stage"><span className="f-count">₹{(unallocatedCapital / 100000).toFixed(1)}L</span><span className="f-label">Unallocated initial budget</span></div></div>
            <span className="funnel-note">Whole tickets are rounded down so their total does not exceed the initial budget. This excludes fees, taxes and later changes. No conversion rate or investment outcome is predicted.</span>
          </div>
        </div>
      </div>

      <div className="thesis-footer-notice">
        <span className="tag-self-reported">ILLUSTRATIVE PROFILES</span>
        <span>
          Opportunity cards are illustrative examples of FindIn’s structured profile data.
          FindIn does not endorse startups or guarantee financial returns.
        </span>
      </div>
    </div>
  );
}
