"use client";

import { useId, useMemo, useState } from "react";
import { Check, Clock, Copy, HelpCircle, RefreshCw, TrendingUp } from "lucide-react";
import { formatINR } from "@/lib/data";
import "./runway-simulator.css";

const CAPITAL_PRESETS = [
  { label: "₹15 Lakhs", value: 1500000 },
  { label: "₹25 Lakhs", value: 2500000 },
  { label: "₹40 Lakhs", value: 4000000 },
  { label: "₹75 Lakhs", value: 7500000 },
];

const TEAM_SIZE_PRESETS = [
  { label: "Solo Founder", founders: 1, devHires: 0 },
  { label: "2 Co-Founders", founders: 2, devHires: 0 },
  { label: "2 Founders + 1 Eng", founders: 2, devHires: 1 },
];

export type RunwaySimulatorProps = {
  initialCapital?: number;
  initialStipend?: number;
  compact?: boolean;
};

type RunwayInputs = { capital: number; foundersCount: number; founderStipend: number; engHires: number; engSalary: number; infraCloud: number; pilotBudgetPercent: number; legalBufferPercent: number };
const RUNWAY_PHASES = [
  { className: "phase-discovery", goal: "Explore the customer problem", description: "Plan conversations or observations that could support or contradict your assumption." },
  { className: "phase-mvp", goal: "Try a small prototype", description: "Define a narrow task and observe consenting participants using a prototype." },
  { className: "phase-traction", goal: "Review behavior and commitments", description: "Separate positive comments, observed use and actual purchase commitments." },
  { className: "phase-raise", goal: "Review the next decision", description: "Compare what happened with the original plan, then decide what to change or test next." },
] as const;

export function modelRunway(input: RunwayInputs) {
  if (Object.values(input).some(value => !Number.isFinite(value) || value < 0) || input.pilotBudgetPercent + input.legalBufferPercent > 100) throw new RangeError("Use nonnegative finite inputs and reserve no more than 100% of capital.");
  const { capital, foundersCount, founderStipend, engHires, engSalary, infraCloud, pilotBudgetPercent, legalBufferPercent } = input;
  const pilotReserve = capital * pilotBudgetPercent / 100;
  const legalReserve = capital * legalBufferPercent / 100;
  const operationalCapital = Math.max(0, capital - pilotReserve - legalReserve);
  const monthlyTeamBurn = foundersCount * founderStipend + engHires * engSalary;
  const totalMonthlyBurn = monthlyTeamBurn + infraCloud;
  const exactRunwayMonths = totalMonthlyBurn > 0 ? operationalCapital / totalMonthlyBurn : null;
  const runwayMonths = exactRunwayMonths === null ? null : Math.floor(exactRunwayMonths);
  const phaseCount = Math.min(4, runwayMonths ?? 0);
  const phases: { className: string; goal: string; description: string; start: number; end: number }[] = [];
  let previousEnd = 0;
  for (let index = 0; index < phaseCount; index++) {
    const target = phaseCount < 4 ? index + 1 : Math.floor((runwayMonths ?? 0) * [.25, .6, .85, 1][index]);
    const end = Math.min((runwayMonths ?? 0) - (phaseCount - index - 1), Math.max(previousEnd + 1, target));
    phases.push({ ...RUNWAY_PHASES[index], start: previousEnd + 1, end });
    previousEnd = end;
  }
  return { pilotReserve, legalReserve, operationalCapital, totalMonthlyBurn, exactRunwayMonths, runwayMonths, phases,
    teamSharePercent: capital > 0 ? Math.round(((runwayMonths ?? 0) * monthlyTeamBurn / capital) * 100) : 0,
    infraSharePercent: capital > 0 ? Math.round(((runwayMonths ?? 0) * infraCloud / capital) * 100) : 0 };
}

export default function RunwaySimulator({
  initialCapital = 2500000,
  initialStipend = 45000,
  compact = false,
}: RunwaySimulatorProps) {
  const prefix = useId();

  const [capital, setCapital] = useState(initialCapital);
  const [foundersCount, setFoundersCount] = useState(2);
  const [founderStipend, setFounderStipend] = useState(initialStipend); // per founder/month
  const [engHires, setEngHires] = useState(0);
  const engSalary = 60000; // per hire/month
  const [infraCloud, setInfraCloud] = useState(20000); // cloud/tools/SaaS per month
  const [pilotBudgetPercent, setPilotBudgetPercent] = useState(15); // % of total capital for customer tests/pilots
  const [legalBufferPercent, setLegalBufferPercent] = useState(10); // % of total capital for legal/tax/contingency
  const [copied, setCopied] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  const simulation = useMemo(() => modelRunway({ capital, foundersCount, founderStipend, engHires, engSalary, infraCloud, pilotBudgetPercent, legalBufferPercent }), [capital, foundersCount, founderStipend, engHires, engSalary, infraCloud, pilotBudgetPercent, legalBufferPercent]);

  const copyBudgetPlan = async () => {
    const plan = [
      "### FindIn Capital Allocation & Runway Model",
      `- **Target Round / Capital:** ${formatINR(capital)}`,
      `- **Full months at modeled spending:** ${simulation.runwayMonths ?? "Not estimable with zero monthly spending"}`,
      `- **Monthly Burn Rate:** ${formatINR(simulation.totalMonthlyBurn)}/mo`,
      `  - Founder Stipends (${foundersCount} founders): ${formatINR(foundersCount * founderStipend)}/mo`,
      engHires > 0 ? `  - Early Eng Hires (${engHires}): ${formatINR(engHires * engSalary)}/mo` : null,
      `  - Infra, Cloud & Tools: ${formatINR(infraCloud)}/mo`,
      `- **Dedicated Pilot & Customer Discovery Reserve:** ${formatINR(simulation.pilotReserve)} (${pilotBudgetPercent}%)`,
      `- **Legal, Incorporation & Contingency Reserve:** ${formatINR(simulation.legalReserve)} (${legalBufferPercent}%)`,
      "",
      "### Proposed activities within the full-month budget",
      ...(simulation.phases.length ? simulation.phases.map(phase => `- **Month${phase.start === phase.end ? "" : "s"} ${phase.start}${phase.start === phase.end ? "" : `–${phase.end}`}:** ${phase.goal}. ${phase.description}`) : ["No full-month activity schedule is modeled at these inputs."]),
      "",
      "_Note: Illustrative planning model for early-stage founders. Non-binding exploratory budget._",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(plan);
      setCopied(true);
      setCopyStatus("Runway & budget plan copied to clipboard.");
      setTimeout(() => {
        setCopied(false);
        setCopyStatus("");
      }, 3500);
    } catch {
      setCopied(false);
      setCopyStatus("Clipboard unavailable. You can review the values below.");
    }
  };

  const resetDefaults = () => {
    setCapital(initialCapital);
    setFoundersCount(2);
    setFounderStipend(initialStipend);
    setEngHires(0);
    setInfraCloud(20000);
    setPilotBudgetPercent(15);
    setLegalBufferPercent(10);
    setCopied(false);
    setCopyStatus("");
  };

  return (
    <div
      className={`runway-simulator-card ${compact ? "is-compact" : ""}`}
      aria-labelledby={`${prefix}-runway-title`}
    >
      <div className="runway-header">
        <div className="runway-header-left">
          <div className="runway-icon" aria-hidden="true">
            <Clock size={18} />
          </div>
          <div>
            <span className="runway-kicker">BUDGET & RUNWAY ARCHITECT</span>
            <h3 id={`${prefix}-runway-title`} className="runway-title">
              Runway & Milestone Execution Modeler
            </h3>
          </div>
        </div>
        <button
          type="button"
          className="runway-reset-btn"
          onClick={resetDefaults}
          aria-label="Reset runway model to defaults"
        >
          <RefreshCw size={13} aria-hidden="true" />
          <span>Reset</span>
        </button>
      </div>

      <p className="runway-subtitle">
        Explore a hypothetical budget at constant monthly spending. Reserves are set aside first. The suggested activities are planning prompts, not achieved milestones or a funding forecast.
      </p>

      {/* Runway Score Banner */}
      <div className="runway-metric-banner">
        <div className="runway-metric-highlight">
          <span className="runway-months-number">{simulation.runwayMonths ?? "—"}</span>
          <span className="runway-months-unit">Full months at modeled spend</span>
        </div>
        <div className="runway-metric-divider" aria-hidden="true" />
        <div className="runway-metric-breakdown">
          <div>
            <span className="metric-sublabel">Total Capital Target</span>
            <strong className="metric-subval">{formatINR(capital)}</strong>
          </div>
          <div>
            <span className="metric-sublabel">Monthly Burn Rate</span>
            <strong className="metric-subval">{formatINR(simulation.totalMonthlyBurn)}/mo</strong>
          </div>
          <div>
            <span className="metric-sublabel">Customer Discovery Reserve</span>
            <strong className="metric-subval">{formatINR(simulation.pilotReserve)}</strong>
          </div>
        </div>
      </div>

      {/* Controls Grid */}
      <div className="runway-controls-grid">
        {/* Capital Target */}
        <div className="runway-control-box">
          <div className="control-label-row">
            <label htmlFor={`${prefix}-capital`}>Target Round Size</label>
            <span className="control-val">{formatINR(capital)}</span>
          </div>
          <input
            id={`${prefix}-capital`}
            type="range"
            min={1000000}
            max={10000000}
            step={500000}
            value={capital}
            onChange={(e) => setCapital(Number(e.target.value))}
            className="runway-slider"
          />
          <div className="runway-presets-row">
            {CAPITAL_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`preset-chip ${capital === p.value ? "is-selected" : ""}`}
                onClick={() => setCapital(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Team Configuration */}
        <div className="runway-control-box">
          <div className="control-label-row">
            <label htmlFor={`${prefix}-stipend`}>Founder Stipend (each)</label>
            <span className="control-val">{formatINR(founderStipend)}/mo</span>
          </div>
          <input
            id={`${prefix}-stipend`}
            type="range"
            min={20000}
            max={100000}
            step={5000}
            value={founderStipend}
            onChange={(e) => setFounderStipend(Number(e.target.value))}
            className="runway-slider"
          />
          <div className="runway-presets-row">
            {TEAM_SIZE_PRESETS.map((t) => (
              <button
                key={t.label}
                type="button"
                className={`preset-chip ${
                  foundersCount === t.founders && engHires === t.devHires ? "is-selected" : ""
                }`}
                onClick={() => {
                  setFoundersCount(t.founders);
                  setEngHires(t.devHires);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pilot & Customer Testing Reserve */}
        <div className="runway-control-box">
          <div className="control-label-row">
            <label htmlFor={`${prefix}-pilot-reserve`}>Pilot & Customer Test Reserve</label>
            <span className="control-val">{pilotBudgetPercent}% ({formatINR(simulation.pilotReserve)})</span>
          </div>
          <input
            id={`${prefix}-pilot-reserve`}
            type="range"
            min={5}
            max={30}
            step={5}
            value={pilotBudgetPercent}
            onChange={(e) => setPilotBudgetPercent(Number(e.target.value))}
            className="runway-slider"
          />
          <span className="control-caption">
            Ring-fenced for customer travel, pilot deployment incentives, and user interview stipends.
          </span>
        </div>
      </div>

      <div className="runway-milestone-horizon">
        <div className="horizon-header"><span className="horizon-title">Proposed activities within this budget</span><span className="horizon-tag">Illustrative schedule</span></div>
        {simulation.phases.length ? <div className="horizon-phases">{simulation.phases.map(phase => <div className={`horizon-phase ${phase.className}`} key={phase.className}><div className="phase-bar" /><div className="phase-body"><span className="phase-time">{phase.start === phase.end ? `Month ${phase.start}` : `Months ${phase.start}–${phase.end}`}</span><strong className="phase-goal">{phase.goal}</strong><p className="phase-desc">{phase.description}</p></div></div>)}</div> : <p className="runway-subtitle">{simulation.exactRunwayMonths === null ? "With no modeled monthly spending, a time horizon cannot be estimated. Add realistic ongoing costs." : "This budget covers less than one full month at the selected spending. No full-month activity schedule is proposed."}</p>}
      </div>

      {/* Action Footer */}
      <div className="runway-footer">
        <div className="runway-footer-insight">
          <TrendingUp size={16} className="text-emerald-600" aria-hidden="true" />
          <span>
            Full months are rounded down. Reserves, timing, tax, revenue and changing costs can materially change actual cash needs.
          </span>
        </div>
        <button
          type="button"
          className="runway-copy-plan-btn"
          onClick={copyBudgetPlan}
          aria-label="Copy budget and milestone plan"
        >
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          <span>{copied ? "Copied" : "Copy budget & milestone plan"}</span>
        </button>
      </div>

      {copyStatus && (
        <p className="runway-status-toast" role="status">
          {copyStatus}
        </p>
      )}

      <div className="runway-disclaimer">
        <HelpCircle size={14} aria-hidden="true" />
        <p>
          Hypothetical planning inputs, not a claim about this startup. The model assumes constant spending, excludes revenue and does not assess investment readiness. Reserve percentages and suggested activities are planning assumptions, not recommendations.
        </p>
      </div>
    </div>
  );
}
