"use client";

import { useState, useMemo, useId } from "react";
import { MessageSquareText, AlertTriangle, Download, Copy, Check, Filter } from "lucide-react";
import "./customer-signals.css";

export interface CustomerInterviewRecord {
  id: string;
  archetype: string;
  industry: string;
  painSeverity: 1 | 2 | 3 | 4 | 5;
  currentWorkaround: string;
  willingnessToPayINR: number;
  commitmentLevel: "loi" | "pilot" | "waitlist" | "exploratory";
  keyQuote: string;
  interviewDate: string;
}

const DEFAULT_INTERVIEWS: CustomerInterviewRecord[] = [
  {
    id: "int-1",
    archetype: "Lead Machining Supervisor",
    industry: "Precision Manufacturing",
    painSeverity: 5,
    currentWorkaround: "Paper whiteboards & end-of-shift WhatsApp photo transfers.",
    willingnessToPayINR: 8500,
    commitmentLevel: "loi",
    keyQuote: "Shift handovers fail 3 times a week, resulting in ₹40,000 in ruined tooling last month alone.",
    interviewDate: "2026-10-12",
  },
  {
    id: "int-2",
    archetype: "Operations Director",
    industry: "Tier-2 Auto Components",
    painSeverity: 4,
    currentWorkaround: "Excel sheets updated manually by night shift supervisor.",
    willingnessToPayINR: 12000,
    commitmentLevel: "pilot",
    keyQuote: "If operators can record tool wear in under 15 seconds on a tablet, we would deploy across all 8 lines.",
    interviewDate: "2026-10-14",
  },
  {
    id: "int-3",
    archetype: "Quality Control Lead",
    industry: "Aerospace Tooling",
    painSeverity: 5,
    currentWorkaround: "Printed carbon-copy checklists filed in physical ring binders.",
    willingnessToPayINR: 15000,
    commitmentLevel: "loi",
    keyQuote: "Traceability audits take 4 days of manual searching. We desperately need real-time digital serial lookup.",
    interviewDate: "2026-10-15",
  },
  {
    id: "int-4",
    archetype: "Machine Operator",
    industry: "General Fabrication",
    painSeverity: 3,
    currentWorkaround: "Memory and verbal handover during 10-minute break overlap.",
    willingnessToPayINR: 0,
    commitmentLevel: "exploratory",
    keyQuote: "I don't make software purchasing decisions, but typing on dirty keyboards during shifts is impossible.",
    interviewDate: "2026-10-16",
  },
  {
    id: "int-5",
    archetype: "Small Business Owner (Proprietor)",
    industry: "Metal Stamping",
    painSeverity: 4,
    currentWorkaround: "ERP software that nobody knows how to configure.",
    willingnessToPayINR: 6000,
    commitmentLevel: "waitlist",
    keyQuote: "We bought an expensive ERP three years ago. Nobody uses it because it takes 8 clicks just to log a batch.",
    interviewDate: "2026-10-17",
  },
];

export default function CustomerSignals({
  records: suppliedRecords = [],
  startupName = "Customer discovery",
  example = false,
}: {
  records?: CustomerInterviewRecord[];
  startupName?: string;
  example?: boolean;
}) {
  const records = example ? DEFAULT_INTERVIEWS : suppliedRecords;
  const prefix = useId();
  const [selectedCommitment, setSelectedCommitment] = useState<string>("all");
  const [minSeverity, setMinSeverity] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedCommitment !== "all" && r.commitmentLevel !== selectedCommitment) return false;
      if (r.painSeverity < minSeverity) return false;
      return true;
    });
  }, [records, selectedCommitment, minSeverity]);

  // Aggregated signal metrics
  const totalInterviews = records.length;
  const severePainCount = records.filter((r) => r.painSeverity >= 4).length;
  const severePainPercent = totalInterviews ? Math.round((severePainCount / totalInterviews) * 100) : 0;
  const payingIntentCount = records.filter((r) => r.willingnessToPayINR > 0).length;
  const avgWTP = Math.round(
    records.reduce((acc, r) => acc + r.willingnessToPayINR, 0) / (payingIntentCount || 1)
  );
  const loiPilotCount = records.filter((r) => r.commitmentLevel === "loi" || r.commitmentLevel === "pilot").length;

  const generateEvidenceMarkdown = () => {
    return `# Customer discovery notes: ${example ? "Fictional example" : startupName}
${example ? "FICTIONAL EXAMPLE: all people, quotes, amounts and outcomes below are invented for demonstration." : "Supplied records; not independently checked by FindIn."}

## 1. Executive Signal Synthesis
- Listed interviews: ${totalInterviews}
- Problem Severity Rating (≥4/5): ${severePainPercent}% (${severePainCount}/${totalInterviews} interviews)
- Commercial Intent: ${payingIntentCount}/${totalInterviews} records with a stated budget
- Average stated budget: ₹${avgWTP.toLocaleString("en-IN")}/month
- Listed intentions (LOI / pilot): ${loiPilotCount}

## 2. Customer Interview Log & Workaround Analysis
${filteredRecords
  .map(
    (r, idx) =>
      `### ${idx + 1}. ${r.archetype} (${r.industry})
- **Pain Severity**: ${r.painSeverity}/5
- **Current Workaround**: ${r.currentWorkaround}
- **Stated Budget / WTP**: ₹${r.willingnessToPayINR > 0 ? r.willingnessToPayINR.toLocaleString("en-IN") + "/mo" : "Zero / Not decision maker"}
- **Commitment Tier**: ${r.commitmentLevel.toUpperCase()}
- **Reported quote**: "${r.keyQuote}"
- **Interview Date**: ${r.interviewDate}`
  )
  .join("\n\n")}

## 3. Source and limits
- ${example ? "Every record in this export is fictional, including quotes and intentions." : "These are supplied notes, not independently reviewed documents."}
- Summary metrics cover all records; exported interview rows reflect the active filters.
- Customer interviews and statements of intent do not guarantee formal enterprise contracts or revenue realization.
`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateEvidenceMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generateEvidenceMarkdown()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${startupName.toLowerCase()}-customer-evidence-log.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="customer-signals" aria-labelledby={`${prefix}-title`}>
      <div className="signals-header">
        <div className="signals-title-group">
          <div className="signals-badge">
            <MessageSquareText size={14} aria-hidden="true" />
            <span>{example ? "FICTIONAL EXAMPLE" : "CUSTOMER DISCOVERY NOTES"}</span>
          </div>
          <h4 id={`${prefix}-title`}>Look beyond a polite yes.</h4>
          <p className="signals-subtitle">
            {example ? "Try filtering these invented interview notes. No customer, quote, payment or agreement shown here is real." : "Review supplied interview notes, stated budgets and open questions. They do not establish demand or verified commitments."}
          </p>
        </div>
        <div className="signals-actions-top">
          <button type="button" onClick={handleCopy} className="signals-btn-secondary" aria-label="Copy customer evidence to clipboard">
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            <span>{copied ? "Copied Log" : "Copy Log (.md)"}</span>
          </button>
          <button type="button" onClick={handleDownload} className="signals-btn-primary" aria-label="Download evidence log as Markdown">
            <Download size={14} aria-hidden="true" />
            <span>Export Matrix</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metrics Ribbon */}
      <div className="signals-metrics-ribbon">
        <div className="metric-chip">
          <span className="m-label">Listed interviews</span>
          <strong className="m-val">{totalInterviews}</strong>
          <span className="m-sub">Across all records</span>
        </div>
        <div className="metric-chip">
          <span className="m-label">Reported severity ≥4/5</span>
          <strong className="m-val text-emerald">{severePainPercent}%</strong>
          <span className="m-sub">{severePainCount} of {totalInterviews} rated ≥4/5</span>
        </div>
        <div className="metric-chip">
          <span className="m-label">Average stated budget</span>
          <strong className="m-val text-purple">₹{avgWTP.toLocaleString("en-IN")}</strong>
          <span className="m-sub">Monthly, where a budget was stated</span>
        </div>
        <div className="metric-chip">
          <span className="m-label">Listed intentions</span>
          <strong className="m-val text-indigo">{loiPilotCount} LOI / Pilots</strong>
          <span className="m-sub">No documents independently reviewed</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="signals-filter-toolbar">
        <div className="filter-item">
          <Filter size={14} aria-hidden="true" />
          <label htmlFor={`${prefix}-commitment`}>Commitment Tier:</label>
          <select
            id={`${prefix}-commitment`}
            value={selectedCommitment}
            onChange={(e) => setSelectedCommitment(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Tiers ({records.length})</option>
            <option value="loi">Listed letter of intent (LOI)</option>
            <option value="pilot">Listed pilot intention</option>
            <option value="waitlist">Waitlist / Commercial Interest</option>
            <option value="exploratory">Exploratory Discovery</option>
          </select>
        </div>

        <div className="filter-item">
          <label htmlFor={`${prefix}-severity`}>Min Pain Severity:</label>
          <select
            id={`${prefix}-severity`}
            value={minSeverity}
            onChange={(e) => setMinSeverity(Number(e.target.value))}
            className="filter-select"
          >
            <option value={1}>Any Severity (1–5)</option>
            <option value={3}>Moderate Pain (≥3)</option>
            <option value={4}>Severe & Urgent (≥4)</option>
            <option value={5}>Critical Blockers Only (5)</option>
          </select>
        </div>
      </div>

      {/* Interview Cards Grid */}
      <div className="signals-grid">
        {filteredRecords.map((r) => (
          <div key={r.id} className="interview-card">
            <div className="interview-card-top">
              <div>
                <span className="archetype-tag">{r.archetype}</span>
                <span className="industry-subtle">{r.industry}</span>
              </div>
              <span className={`commitment-badge ${r.commitmentLevel}`}>
                {r.commitmentLevel === "loi"
                  ? "Listed LOI"
                  : r.commitmentLevel === "pilot"
                  ? "Listed pilot"
                  : r.commitmentLevel === "waitlist"
                  ? "Waitlist"
                  : "Exploratory"}
              </span>
            </div>

            <div className="pain-severity-bar">
              <span className="pain-label">Problem Severity:</span>
              <div className="severity-dots" aria-label={`Severity ${r.painSeverity} out of 5`}>
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <span
                    key={lvl}
                    className={`severity-dot ${lvl <= r.painSeverity ? (r.painSeverity >= 4 ? "urgent" : "moderate") : "empty"}`}
                  />
                ))}
              </div>
              <span className="severity-val">{r.painSeverity}/5</span>
            </div>

            <div className="workaround-box">
              <strong className="box-label">Existing Workaround:</strong>
              <p className="workaround-text">{r.currentWorkaround}</p>
            </div>

            <blockquote className="interview-quote">
              &ldquo;{r.keyQuote}&rdquo;
            </blockquote>

            <div className="interview-card-footer">
              <div className="wtp-display">
                <span className="wtp-label">Stated WTP:</span>
                <strong className="wtp-amount">
                  {r.willingnessToPayINR > 0 ? `₹${r.willingnessToPayINR.toLocaleString("en-IN")}/mo` : "₹0 (End user)"}
                </strong>
              </div>
              <span className="interview-date">Logged {r.interviewDate}</span>
            </div>
          </div>
        ))}
      </div>

      {filteredRecords.length === 0 && (
        <div className="no-signals-empty">
          <AlertTriangle size={20} aria-hidden="true" />
          <p>No customer discovery records match these filters. Try adjusting the commitment tier or severity threshold.</p>
        </div>
      )}

      <div className="signals-footer-note">
        <span className="signals-tag-warning">{example ? "ALL RECORDS ARE FICTIONAL" : "SUPPLIED NOTES · NOT VERIFIED"}</span>
        <span>
          {example ? "This is a browser-only demonstration, separate from member profiles and their saved learning." : "Statements of intent do not represent binding customer contracts or audited orders."}
        </span>
      </div>
    </div>
  );
}
