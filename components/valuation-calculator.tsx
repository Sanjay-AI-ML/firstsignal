"use client";

import { useId, useMemo, useState } from "react";
import { Calculator, Check, Copy, HelpCircle, RefreshCw } from "lucide-react";
import { formatINR } from "@/lib/data";
import "./valuation-calculator.css";

const INVESTMENT_PRESETS = [
  { label: "₹15 Lakhs", value: 1500000 },
  { label: "₹25 Lakhs", value: 2500000 },
  { label: "₹50 Lakhs", value: 5000000 },
  { label: "₹1 Crore", value: 10000000 },
];

const VALUATION_PRESETS = [
  { label: "₹1.5 Crore", value: 15000000 },
  { label: "₹2.5 Crore", value: 25000000 },
  { label: "₹5.0 Crore", value: 50000000 },
  { label: "₹10.0 Crore", value: 100000000 },
];

const ESOP_PRESETS = [
  { label: "None (0%)", value: 0 },
  { label: "5%", value: 5 },
  { label: "10%", value: 10 },
  { label: "15%", value: 15 },
];

export type ValuationCalculatorProps = {
  initialInvestment?: number;
  initialPreMoney?: number;
  initialOptionPool?: number;
  compact?: boolean;
};

export default function ValuationCalculator({
  initialInvestment = 2500000,
  initialPreMoney = 25000000,
  initialOptionPool = 10,
  compact = false,
}: ValuationCalculatorProps) {
  const [investment, setInvestment] = useState(initialInvestment);
  const [preMoney, setPreMoney] = useState(initialPreMoney);
  const [optionPool, setOptionPool] = useState(initialOptionPool);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const idPrefix = useId();

  const metrics = useMemo(() => {
    const postMoney = Math.max(1, preMoney + investment);
    const investorEquityRaw = (investment / postMoney) * 100;
    const investorEquity = Math.min(100, Math.max(0, investorEquityRaw));
    const esopEquity = Math.min(100 - investorEquity, Math.max(0, optionPool));
    const founderEquity = Math.max(0, 100 - investorEquity - esopEquity);
    const impliedPricePerPercent = postMoney / 100;

    return {
      postMoney,
      investorEquity: Number(investorEquity.toFixed(2)),
      esopEquity: Number(esopEquity.toFixed(2)),
      founderEquity: Number(founderEquity.toFixed(2)),
      impliedPricePerPercent,
    };
  }, [investment, preMoney, optionPool]);

  const copySummary = async () => {
    const summary = [
      "### FindIn Indicative Valuation & Ownership Summary",
      `- **Target Investment:** ${formatINR(investment)}`,
      `- **Assumed pre-money valuation:** ${formatINR(preMoney)}`,
      `- **Implied Post-Money Valuation:** ${formatINR(metrics.postMoney)}`,
      `- **Investor Equity Stake:** ${metrics.investorEquity}%`,
      `- **Option Pool Reserve (ESOP):** ${metrics.esopEquity}%`,
      `- **Founders Retained Ownership:** ${metrics.founderEquity}%`,
      `- **Implied Value per 1%:** ${formatINR(Math.round(metrics.impliedPricePerPercent))}`,
      "",
      "_Note: Illustrative modeling tool for exploratory founder-investor discussions. This arithmetic does not assess a company, determine share prices or produce legal terms. The option pool is assumed to be a percentage of post-round ownership, taken from the founder share._",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setStatusMessage("Term summary copied to clipboard.");
      setTimeout(() => {
        setCopied(false);
        setStatusMessage("");
      }, 3500);
    } catch {
      setCopied(false);
      setStatusMessage("Clipboard unavailable. You can review the values below.");
    }
  };

  const resetDefaults = () => {
    setInvestment(initialInvestment);
    setPreMoney(initialPreMoney);
    setOptionPool(initialOptionPool);
    setCopied(false);
    setStatusMessage("");
  };

  return (
    <div
      className={`valuation-calculator-card ${compact ? "is-compact" : ""}`}
      aria-labelledby={`${idPrefix}-title`}
    >
      <div className="calculator-header">
        <div className="calculator-header-title">
          <div className="calculator-icon" aria-hidden="true">
            <Calculator size={18} />
          </div>
          <div>
            <span className="calculator-kicker">INTERACTIVE MODELER</span>
            <h3 id={`${idPrefix}-title`} className="calculator-title">
              Valuation & Ownership Sensitivity
            </h3>
          </div>
        </div>
        <div className="calculator-header-actions">
          <button
            type="button"
            className="calculator-reset-button"
            onClick={resetDefaults}
            aria-label="Reset calculator to default values"
            title="Reset to defaults"
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <p className="calculator-subtitle">
        Explore a simplified priced-round scenario. The option pool is a percentage of post-round ownership, taken from the founder share. These inputs are assumptions, not a valuation of any company.
      </p>

      <div className="calculator-controls-grid">
        {/* Investment Amount */}
        <div className="calculator-control-group">
          <div className="calculator-control-header">
            <label htmlFor={`${idPrefix}-investment`}>
              <span>Target Investment</span>
              <span className="calculator-value-badge">{formatINR(investment)}</span>
            </label>
          </div>
          <input
            id={`${idPrefix}-investment`}
            type="range"
            min={500000}
            max={20000000}
            step={250000}
            value={investment}
            onChange={(e) => setInvestment(Number(e.target.value))}
            aria-valuemin={500000}
            aria-valuemax={20000000}
            aria-valuenow={investment}
            aria-valuetext={formatINR(investment)}
            className="calculator-slider"
          />
          <div className="calculator-presets" role="group" aria-label="Investment presets">
            {INVESTMENT_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={`preset-pill ${investment === preset.value ? "is-active" : ""}`}
                onClick={() => setInvestment(preset.value)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pre-Money Valuation */}
        <div className="calculator-control-group">
          <div className="calculator-control-header">
            <label htmlFor={`${idPrefix}-premoney`}>
              <span>Assumed pre-money valuation</span>
              <span className="calculator-value-badge">{formatINR(preMoney)}</span>
            </label>
          </div>
          <input
            id={`${idPrefix}-premoney`}
            type="range"
            min={5000000}
            max={100000000}
            step={2500000}
            value={preMoney}
            onChange={(e) => setPreMoney(Number(e.target.value))}
            aria-valuemin={5000000}
            aria-valuemax={100000000}
            aria-valuenow={preMoney}
            aria-valuetext={formatINR(preMoney)}
            className="calculator-slider"
          />
          <div className="calculator-presets" role="group" aria-label="Valuation presets">
            {VALUATION_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={`preset-pill ${preMoney === preset.value ? "is-active" : ""}`}
                onClick={() => setPreMoney(preset.value)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Option Pool (ESOP) */}
        <div className="calculator-control-group">
          <div className="calculator-control-header">
            <label htmlFor={`${idPrefix}-esop`}>
              <span>Unallocated Option Pool (ESOP)</span>
              <span className="calculator-value-badge">{optionPool}%</span>
            </label>
          </div>
          <input
            id={`${idPrefix}-esop`}
            type="range"
            min={0}
            max={20}
            step={1}
            value={optionPool}
            onChange={(e) => setOptionPool(Number(e.target.value))}
            aria-valuemin={0}
            aria-valuemax={20}
            aria-valuenow={optionPool}
            aria-valuetext={`${optionPool} percent`}
            className="calculator-slider"
          />
          <div className="calculator-presets" role="group" aria-label="Option pool presets">
            {ESOP_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={`preset-pill ${optionPool === preset.value ? "is-active" : ""}`}
                onClick={() => setOptionPool(preset.value)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Visual Cap Table Ownership Bar */}
      <div className="calculator-visual-breakdown">
        <div className="breakdown-bar-labels">
          <span>Ownership Distribution Post-Round</span>
          <span className="post-money-total">
            Post-Money: <strong>{formatINR(metrics.postMoney)}</strong>
          </span>
        </div>
        <div
          className="breakdown-segmented-bar"
          role="progressbar"
          aria-label="Post-round equity distribution"
          aria-valuenow={metrics.founderEquity}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`Founders ${metrics.founderEquity}%, Investors ${metrics.investorEquity}%, ESOP ${metrics.esopEquity}%`}
        >
          <div
            className="bar-segment segment-founders"
            style={{ width: `${metrics.founderEquity}%` }}
            title={`Founders: ${metrics.founderEquity}%`}
          />
          <div
            className="bar-segment segment-investor"
            style={{ width: `${metrics.investorEquity}%` }}
            title={`Investor: ${metrics.investorEquity}%`}
          />
          {metrics.esopEquity > 0 && (
            <div
              className="bar-segment segment-esop"
              style={{ width: `${metrics.esopEquity}%` }}
              title={`Option Pool: ${metrics.esopEquity}%`}
            />
          )}
        </div>

        <div className="breakdown-legend">
          <div className="legend-item">
            <span className="legend-dot dot-founders" aria-hidden="true" />
            <div className="legend-text">
              <span className="legend-title">Founders Retained</span>
              <strong className="legend-percent">{metrics.founderEquity}%</strong>
            </div>
          </div>
          <div className="legend-item">
            <span className="legend-dot dot-investor" aria-hidden="true" />
            <div className="legend-text">
              <span className="legend-title">Investor Stake</span>
              <strong className="legend-percent">{metrics.investorEquity}%</strong>
            </div>
          </div>
          <div className="legend-item">
            <span className="legend-dot dot-esop" aria-hidden="true" />
            <div className="legend-text">
              <span className="legend-title">Option Pool (ESOP)</span>
              <strong className="legend-percent">{metrics.esopEquity}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Key Takeaways & Action */}
      <div className="calculator-footer">
        <div className="calculator-insights">
          <div className="insight-stat">
            <span className="stat-label">Implied Value per 1%</span>
            <span className="stat-value">{formatINR(Math.round(metrics.impliedPricePerPercent))}</span>
          </div>
          <div className="insight-stat">
            <span className="stat-label">Effective Dilution</span>
            <span className="stat-value">{(100 - metrics.founderEquity).toFixed(1)}%</span>
          </div>
        </div>
        <div className="calculator-actions">
          <button
            type="button"
            className="calculator-copy-button"
            onClick={copySummary}
            aria-label="Copy term summary markdown to clipboard"
          >
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            <span>{copied ? "Copied" : "Copy term summary"}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <p className="calculator-status" role="status">
          {statusMessage}
        </p>
      )}

      <div className="calculator-disclaimer">
        <HelpCircle size={14} aria-hidden="true" />
        <p>
          Illustrative modeling tool for exploratory founder-investor discussions. Non-binding under Indian regulatory framework. All legal and tax terms require formal legal counsel.
        </p>
      </div>
    </div>
  );
}
