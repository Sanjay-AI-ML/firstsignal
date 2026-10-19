"use client";

import { useState, useId } from "react";
import { Users, Clock, ShieldCheck, Download, Copy, Check, Award, AlertCircle } from "lucide-react";
import { founderAllocation, nextFounderId, vestingFraction } from "@/lib/planning-tools";
import "./equity-calculator.css";

interface CoFounder {
  id: string;
  name: string;
  role: string;
  ideaGenesis: number; // 0 - 100
  timeCommitment: number; // 0 - 100
  technicalExecution: number; // 0 - 100
  domainNetwork: number; // 0 - 100
  cashContributed: number; // in INR
}

const DEFAULT_FOUNDERS: CoFounder[] = [
  {
    id: "f1",
    name: "Founder 1 (Technical & Product)",
    role: "CEO / CTO",
    ideaGenesis: 80,
    timeCommitment: 100,
    technicalExecution: 90,
    domainNetwork: 60,
    cashContributed: 250000,
  },
  {
    id: "f2",
    name: "Founder 2 (Commercial & Domain)",
    role: "COO / Head of Growth",
    ideaGenesis: 40,
    timeCommitment: 100,
    technicalExecution: 20,
    domainNetwork: 90,
    cashContributed: 250000,
  },
];

export default function EquityCalculator() {
  const [founders, setFounders] = useState<CoFounder[]>(DEFAULT_FOUNDERS);
  const [vestingYears, setVestingYears] = useState<number>(4);
  const [cliffMonths, setCliffMonths] = useState<number>(12);
  const [accelerationType, setAccelerationType] = useState<"double" | "single" | "none">("double");
  const [poolPercent, setPoolPercent] = useState<number>(10); // ESOP pool
  const [copied, setCopied] = useState<boolean>(false);
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState<"split" | "vesting" | "agreement">("split");
  const formId = useId();

  const calculatedFounders = founderAllocation(founders, poolPercent) ?? [];
  const cliffPercent = (vestingFraction(cliffMonths, vestingYears * 12, cliffMonths) ?? 0) * 100;
  const accelerationNote = accelerationType === "double"
    ? "Discussion preference: consider acceleration only after both an acquisition and a qualifying departure. The events and any rights need separate agreement."
    : accelerationType === "single"
    ? "Discussion preference: consider acceleration after an acquisition. This selection does not create or change anyone’s rights."
    : "Discussion preference: no acceleration is modeled. Any actual schedule and departure terms need separate agreement.";

  const addFounder = () => {
    setFounders(current => current.length >= 4 ? current : [
      ...current,
      {
        id: nextFounderId(current),
        name: `Founder ${current.length + 1}`,
        role: "Co-Founder",
        ideaGenesis: 30,
        timeCommitment: 80,
        technicalExecution: 40,
        domainNetwork: 50,
        cashContributed: 100000,
      },
    ]);
    setCopied(false);
  };

  const removeFounder = (id: string) => {
    setFounders(current => current.length <= 2 ? current : current.filter((f) => f.id !== id));
    setCopied(false);
  };

  const updateFounder = (id: string, field: keyof CoFounder, val: number | string) => {
    setFounders(current => current.map((f) => (f.id === id ? { ...f, [field]: val } : f)));
    setCopied(false);
  };

  const generateWorksheet = () => {
    return `# FindIn founder allocation worksheet
Personal local scenario. Not a fairness assessment, agreement or share grant.

## 1. Hypothetical allocation
- Assumed option reserve: ${poolPercent}%
${calculatedFounders
  .map(
    (f) =>
      `- **${f.name}** (${f.role}): **${f.calculatedEquity}%** modeled allocation
  - Idea contribution rating: ${f.ideaGenesis}/100
  - Time commitment rating: ${f.timeCommitment}/100
  - Execution contribution rating: ${f.technicalExecution}/100
  - Domain/network rating: ${f.domainNetwork}/100
  - Cash assumption: ₹${f.cashContributed.toLocaleString("en-IN")}`
  )
  .join("\n")}

## 2. Vesting scenario
- Assumed duration: ${vestingYears * 12} months
- Assumed cliff: ${cliffMonths} months
- Modeled fraction at the cliff: ${cliffPercent.toFixed(1)}%
- After the cliff: 1/${vestingYears * 12} of the assumed allocation per month, including elapsed months at the cliff.
- ${accelerationNote}

## 3. How the example is weighted
Idea rating:20%; time rating:35%; execution rating:25%; domain/network plus cash:20% maximum. Domain rating contributes up to12points; each ₹5,00,000 of cash adds8points, with the combined category capped at20. Each founder has at least1point. Displayed allocations use one-decimal rounding and preserve the total with the reserve.
These are arbitrary example weights, not research-backed values or a recommendation. Equal splits may also be appropriate. Ratings are entered by the worksheet user and are not independently measured.

## 4. Questions to resolve together
- What contributions, responsibilities and future changes should the founders consider?
- What schedule, departure treatment and documentation would suit the actual company?
- What professional advice is needed for the chosen jurisdiction and structure?
Nothing is saved, signed, granted or sent. This worksheet creates no ownership, employment, tax or repurchase rights.
`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateWorksheet());
      setCopied(true);
      setStatus("Personal worksheet copied. No agreement was created.");
    } catch {
      setCopied(false);
      setStatus("Copy is unavailable. Download the worksheet instead.");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generateWorksheet()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "findin-founder-allocation-worksheet.md";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    setStatus("Personal worksheet downloaded. No shares were granted.");
  };

  return (
    <div className="equity-calculator" aria-labelledby={`${formId}-title`}>
      <div className="equity-header">
        <div className="equity-title-wrap">
          <div className="equity-badge">
            <Users size={14} aria-hidden="true" />
            <span>PERSONAL PLANNING EXAMPLE</span>
          </div>
          <h3 id={`${formId}-title`}>Founder allocation & vesting worksheet</h3>
          <p className="equity-desc">
            Explore how your chosen contribution ratings and an option reserve change a hypothetical split. The example weights do not determine a fair allocation or create ownership rights.
          </p>
        </div>
        <div className="equity-actions-top">
          <button type="button" onClick={handleCopy} className="equity-btn-secondary" aria-label="Copy founder planning worksheet">
            {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            <span>{copied ? "Copied" : "Copy worksheet"}</span>
          </button>
          <button type="button" onClick={handleDownload} className="equity-btn-primary" aria-label="Download founder planning worksheet as Markdown">
            <Download size={15} aria-hidden="true" />
            <span>Download .md</span>
          </button>
        </div>
      </div>

      <div className="equity-tabs" role="group" aria-label="Founder worksheet view">
        <button
          type="button"
          aria-pressed={activeTab === "split"}
          className={`equity-tab ${activeTab === "split" ? "active" : ""}`}
          onClick={() => setActiveTab("split")}
        >
          <Award size={16} aria-hidden="true" />
          <span>1. Allocation scenario</span>
        </button>
        <button
          type="button"
          aria-pressed={activeTab === "vesting"}
          className={`equity-tab ${activeTab === "vesting" ? "active" : ""}`}
          onClick={() => setActiveTab("vesting")}
        >
          <Clock size={16} aria-hidden="true" />
          <span>2. Vesting scenario</span>
        </button>
        <button
          type="button"
          aria-pressed={activeTab === "agreement"}
          className={`equity-tab ${activeTab === "agreement" ? "active" : ""}`}
          onClick={() => setActiveTab("agreement")}
        >
          <ShieldCheck size={16} aria-hidden="true" />
          <span>3. Worksheet preview</span>
        </button>
      </div>

      {activeTab === "split" && (
        <div className="equity-grid">
          <div className="equity-input-column">
            <div className="equity-pool-row">
              <label htmlFor={`${formId}-esop`} className="equity-input-label">
                <span>Reserved Employee Option Pool (ESOP)</span>
                <strong>{poolPercent}%</strong>
              </label>
              <input
                id={`${formId}-esop`}
                type="range"
                min="5"
                max="20"
                step="1"
                value={poolPercent}
                onChange={(e) => { setPoolPercent(Number(e.target.value)); setCopied(false); }}
                className="equity-range"
              />
              <span className="equity-range-hint">An assumed reserve for this scenario. This does not create an employee option plan.</span>
            </div>

            <div className="founders-list">
              {founders.map((f, idx) => (
                <div key={f.id} className="founder-card">
                  <div className="founder-card-top">
                    <span className="founder-num">0{idx + 1}</span>
                    <input
                      type="text"
                      value={f.name}
                      onChange={(e) => updateFounder(f.id, "name", e.target.value)}
                      className="founder-name-input"
                      aria-label={`Founder ${idx + 1} name`}
                    />
                    {founders.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeFounder(f.id)}
                        className="founder-remove-btn"
                        aria-label={`Remove ${f.name}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="founder-sliders">
                    <div className="slider-item">
                      <div className="slider-label">
                        <span>Idea contribution rating</span>
                        <strong>{f.ideaGenesis}%</strong>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={f.ideaGenesis}
                        onChange={(e) => updateFounder(f.id, "ideaGenesis", Number(e.target.value))}
                        className="equity-range"
                        aria-label={`${f.name} Idea genesis contribution`}
                      />
                    </div>

                    <div className="slider-item">
                      <div className="slider-label">
                        <span>Time commitment rating</span>
                        <strong>{f.timeCommitment}%</strong>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={f.timeCommitment}
                        onChange={(e) => updateFounder(f.id, "timeCommitment", Number(e.target.value))}
                        className="equity-range"
                        aria-label={`${f.name} Time commitment`}
                      />
                    </div>

                    <div className="slider-item">
                      <div className="slider-label">
                        <span>Execution contribution rating</span>
                        <strong>{f.technicalExecution}%</strong>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={f.technicalExecution}
                        onChange={(e) => updateFounder(f.id, "technicalExecution", Number(e.target.value))}
                        className="equity-range"
                        aria-label={`${f.name} Technical execution contribution`}
                      />
                    </div>

                    <div className="slider-item">
                      <div className="slider-label">
                        <span>Cash assumption (₹)</span>
                        <strong>₹{(f.cashContributed / 100000).toFixed(1)}L</strong>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1000000"
                        step="50000"
                        value={f.cashContributed}
                        onChange={(e) => updateFounder(f.id, "cashContributed", Number(e.target.value))}
                        className="equity-range"
                        aria-label={`${f.name} Cash contribution`}
                      />
                    </div>
                    <div className="slider-item">
                      <div className="slider-label"><span>Domain knowledge / network rating</span><strong>{f.domainNetwork}/100</strong></div>
                      <input type="range" min="0" max="100" value={f.domainNetwork} onChange={event => updateFounder(f.id, "domainNetwork", Number(event.target.value))} className="equity-range" aria-label={`${f.name} Domain knowledge and network rating`} />
                    </div>
                  </div>
                </div>
              ))}

              {founders.length < 4 && (
                <button type="button" onClick={addFounder} className="add-founder-btn">
                  + Add Co-Founder (Up to 4)
                </button>
              )}
            </div>
          </div>

          <div className="equity-summary-column">
            <div className="equity-distribution-card">
              <span className="summary-kicker">HYPOTHETICAL ALLOCATION</span>
              <h4 className="summary-headline">Scenario breakdown</h4>

              <div className="equity-stacked-bar" aria-label="Visual breakdown of equity allocation">
                <div
                  className="bar-segment esop"
                  style={{ width: `${poolPercent}%` }}
                  title={`ESOP Pool: ${poolPercent}%`}
                />
                {calculatedFounders.map((f, i) => (
                  <div
                    key={f.id}
                    className={`bar-segment founder-${i}`}
                    style={{ width: `${f.calculatedEquity}%` }}
                    title={`${f.name}: ${f.calculatedEquity}%`}
                  />
                ))}
              </div>

              <div className="equity-legend">
                <div className="legend-row esop">
                  <span className="legend-dot" />
                  <span className="legend-name">Unallocated ESOP Pool</span>
                  <strong className="legend-val">{poolPercent}.0%</strong>
                </div>
                {calculatedFounders.map((f, i) => (
                  <div key={f.id} className={`legend-row founder-${i}`}>
                    <span className="legend-dot" />
                    <span className="legend-name">{f.name}</span>
                    <strong className="legend-val">{f.calculatedEquity}%</strong>
                  </div>
                ))}
              </div>

              <div className="equity-insight-box">
                <div className="insight-top">
                  <AlertCircle size={16} aria-hidden="true" />
                  <strong>How this example is weighted</strong>
                </div>
                <p>
                  Idea: 20%; time: 35%; execution: 25%; domain/network and cash: up to 20%. These arbitrary example weights are a conversation starter. Equal splits can also be appropriate. Ratings are self-selected, not measured contributions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "vesting" && (
        <div className="vesting-container">
          <div className="vesting-controls">
            <div className="control-card">
              <label htmlFor={`${formId}-years`}>Vesting Schedule Length</label>
              <select
                id={`${formId}-years`}
                value={vestingYears}
                onChange={(e) => { setVestingYears(Number(e.target.value)); setCopied(false); }}
                className="vesting-select"
              >
                <option value={3}>3 years</option>
                <option value={4}>4 years</option>
                <option value={5}>5 years</option>
              </select>
            </div>

            <div className="control-card">
              <label htmlFor={`${formId}-cliff`}>Cliff Period</label>
              <select
                id={`${formId}-cliff`}
                value={cliffMonths}
                onChange={(e) => { setCliffMonths(Number(e.target.value)); setCopied(false); }}
                className="vesting-select"
              >
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
                <option value={0}>No cliff</option>
              </select>
            </div>

            <div className="control-card">
              <label htmlFor={`${formId}-acceleration`}>Acceleration discussion preference</label>
              <select
                id={`${formId}-acceleration`}
                value={accelerationType}
                onChange={(e) => { setAccelerationType(e.target.value as "double" | "single" | "none"); setCopied(false); }}
                className="vesting-select"
              >
                <option value="double">Acquisition and qualifying departure</option>
                <option value="single">Acquisition only</option>
                <option value="none">No acceleration modeled</option>
              </select>
            </div>
          </div>

          <div className="vesting-timeline-card">
            <h4>{vestingYears}-year illustrative vesting schedule</h4>
            <p className="timeline-subtitle">
              This example starts monthly accrual at month one, with no release before the selected cliff. It does not grant shares or define departure rights.
            </p>

            <div className="vesting-milestones">
              <div className="milestone-step">
                <span className="step-time">Start of scenario</span>
                <div className="step-marker" />
                <strong className="step-title">0% Vested</strong>
                <p>Zero elapsed months. No escrow, share grant or voting right is created here.</p>
              </div>

              <div className="milestone-step highlight">
                <span className="step-time">Month {cliffMonths} (Cliff)</span>
                <div className="step-marker" />
                <strong className="step-title">
                  {cliffMonths > 0 ? `${cliffPercent.toFixed(1)}% modeled at cliff` : "Monthly from month one"}
                </strong>
                <p>
                  {cliffMonths > 0
                    ? `${cliffMonths} of ${vestingYears * 12} modeled months have elapsed. This includes the months accrued during the cliff.`
                    : "No release threshold is used in this scenario."}
                </p>
              </div>

              <div className="milestone-step">
                <span className="step-time">Months {cliffMonths + 1}–{vestingYears * 12}</span>
                <div className="step-marker" />
                <strong className="step-title">Linear Monthly Vesting</strong>
                <p>The remaining {(100 - cliffPercent).toFixed(1)}% accrues at 1/{vestingYears * 12} of the assumed allocation per month.</p>
              </div>

              <div className="milestone-step">
                <span className="step-time">Year {vestingYears}</span>
                <div className="step-marker" />
                <strong className="step-title">100% of modeled schedule</strong>
                <p>The entered duration is complete. Actual ownership depends on separate agreements and records.</p>
              </div>
            </div>

            <div className="acceleration-explainer">
              <ShieldCheck size={18} aria-hidden="true" />
              <div>
                <strong>Selected discussion preference</strong>
                <span>{accelerationNote}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "agreement" && (
        <div className="accord-preview-wrap">
          <div className="accord-actions">
            <span>Personal planning assumptions · no ownership or agreement created</span>
            <div className="accord-btn-group">
              <button type="button" onClick={handleCopy} className="equity-btn-secondary">
                {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                {copied ? "Copied" : "Copy Markdown"}
              </button>
              <button type="button" onClick={handleDownload} className="equity-btn-primary">
                <Download size={14} aria-hidden="true" />
                Download .md
              </button>
            </div>
          </div>
          <pre className="accord-code-block">{generateWorksheet()}</pre>
        </div>
      )}

      {status ? <p className="equity-copy-status" role="status">{status}</p> : null}

      <div className="equity-footer-note">
        <span className="badge-legal">PERSONAL PLANNING ONLY</span>
        <span>
          Nothing is saved, signed, granted or sent. These numbers are not an assessment of fairness or a legal, tax or valuation conclusion. Resolve real terms with your co-founders and qualified advisers.
        </span>
      </div>
    </div>
  );
}
