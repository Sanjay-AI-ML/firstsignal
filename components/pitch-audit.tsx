"use client";

import { useId, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import "./pitch-audit.css";

type AuditQuestion = {
  id: string;
  category: string;
  title: string;
  options: {
    id: string;
    label: string;
    description: string;
    points: number;
    isSignal: boolean;
    feedback: string;
  }[];
};

const AUDIT_QUESTIONS: AuditQuestion[] = [
  {
    id: "problem",
    category: "01 / A specific problem",
    title: "How do you explain the customer problem?",
    options: [
      {
        id: "macro",
        label: "Top-Down Market Size",
        description: "“The global logistics market is $800B and losing billions in inefficiency.”",
        points: 5,
        isSignal: false,
        feedback: "This example names a broad market. Add a specific customer, task and observed problem.",
      },
      {
        id: "grounded",
        label: "Observed Workflow Bottleneck",
        description: "“Factory supervisors spend 2.5 hours every shift manually reconciling physical shift notes.”",
        points: 25,
        isSignal: true,
        feedback: "This example describes a concrete task and time estimate. Explain how it was observed and what remains uncertain.",
      },
    ],
  },
  {
    id: "evidence",
    category: "02 / Described observations",
    title: "What evidence supports your solution?",
    options: [
      {
        id: "opinions",
        label: "Surveys or Encouraging Comments",
        description: "“We asked 50 people if they like the concept and 88% said yes.”",
        points: 5,
        isSignal: false,
        feedback: "A positive response to a hypothetical question differs from observed use or a purchase. Explain what the survey actually asked.",
      },
      {
        id: "behavior",
        label: "Observed Behavior & Committed Effort",
        description: "“6 workshop leads tested our paper prototype; 4 shared their actual shift logs with us.”",
        points: 25,
        isSignal: true,
        feedback: "This example describes an observed action. Participation alone does not establish demand; respect privacy and explain the limits.",
      },
    ],
  },
  {
    id: "milestone",
    category: "03 / Budget and next step",
    title: "What is your funding ask and target milestone?",
    options: [
      {
        id: "vague",
        label: "Growth & Brand Building",
        description: "“Raising ₹50 Lakhs for general hiring, digital marketing, and expansion.”",
        points: 0,
        isSignal: false,
        feedback: "This example lists broad spending categories. Describe the costs and next step you intend to test.",
      },
      {
        id: "concrete",
        label: "A budget linked to a proposed milestone",
        description: "“Targeting ₹25 Lakhs for 14-month runway to convert 3 unpaid pilots into paid contracts.”",
        points: 25,
        isSignal: true,
        feedback: "This example connects a planning budget with a proposed milestone. Costs, timing and outcomes still need to be tested.",
      },
    ],
  },
  {
    id: "uncertainty",
    category: "04 / Open questions",
    title: "How do you handle unanswered questions?",
    options: [
      {
        id: "defensive",
        label: "Claim Everything Is Proven",
        description: "“We have zero direct competitors and guaranteed demand once we build.”",
        points: 0,
        isSignal: false,
        feedback: "This example promises an outcome without supporting observations. Name the uncertainty and what you plan to learn.",
      },
      {
        id: "transparent",
        label: "Name the Riskiest Unknowns",
        description: "“Willingness to pay ₹15,000/mo is still untested; that is the core hypothesis of our next pilot.”",
        points: 25,
        isSignal: true,
        feedback: "This example names an unanswered question and a planned test. It does not establish that the idea will succeed.",
      },
    ],
  },
];

export function scorePitchExamples(answers: Record<string, string>) {
  let score = 0, answered = 0;
  const redFlags: string[] = [], strengths: string[] = [];
  for (const question of AUDIT_QUESTIONS) {
    const option = question.options.find(item => item.id === answers[question.id]);
    if (!option) continue;
    answered++; score += option.points;
    const text = `${question.category.split("/")[1]?.trim()}: ${option.feedback}`;
    (option.isSignal ? strengths : redFlags).push(text);
  }
  return { score, answered, redFlags, strengths };
}

export default function PitchAudit() {
  const prefix = useId();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  const selectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const results = useMemo(() => scorePitchExamples(selectedAnswers), [selectedAnswers]);
  const resetAudit = () => setSelectedAnswers({});

  return (
    <div className="pitch-audit-card" aria-labelledby={`${prefix}-audit-title`}>
      <div className="pitch-audit-header">
        <div className="audit-header-title">
          <div className="audit-icon" aria-hidden="true">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="audit-kicker">FICTIONAL EXAMPLES · WRITING EXERCISE</span>
            <h3 id={`${prefix}-audit-title`} className="audit-title">
              Make your idea easier to explain
            </h3>
          </div>
        </div>
        <button
          type="button"
          className="audit-reset-btn"
          onClick={resetAudit}
          aria-label="Clear example choices"
        >
          <RefreshCw size={13} aria-hidden="true" />
          <span>Reset</span>
        </button>
      </div>

      <p className="audit-subtitle">
        Compare four pairs of fictional writing examples. Points reflect preset writing preferences: 25 for the more specific example, 0 or 5 for the broader one. This does not analyze your pitch, verify evidence or predict investor interest.
      </p>

      {/* Grade and Score Card */}
      <div className="audit-score-banner pill-medium">
        <div className="grade-box">
          <span className="grade-letter">{results.answered}/4</span>
          <span className="grade-points">{results.score} / 100 points</span>
        </div>
        <div className="grade-details">
          <div className="grade-badge-row">
            <span className="grade-status">Example choices selected</span>
            <span className="grade-signal-tag">
              Preset writing points
            </span>
          </div>
          <p className="grade-summary">
            Choose examples to see how specificity changes the writing. No actual startup information is assessed.
          </p>
        </div>
      </div>

      {/* Interactive Diagnostic Flow */}
      <div className="audit-questions-grid">
        {AUDIT_QUESTIONS.map((q) => {
          const selected = selectedAnswers[q.id];
          return (
            <div key={q.id} className="audit-question-card">
              <span className="question-cat">{q.category}</span>
              <h4 className="question-text">{q.title}</h4>
              <div className="question-options-col" role="radiogroup" aria-label={q.title}>
                {q.options.map((opt) => {
                  const isChecked = selected === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={isChecked}
                      className={`audit-option-pill ${isChecked ? (opt.isSignal ? "is-signal" : "is-trap") : ""}`}
                      onClick={() => selectOption(q.id, opt.id)}
                    >
                      <div className="opt-indicator">
                        {isChecked ? (
                          opt.isSignal ? (
                            <CheckCircle2 size={16} className="text-emerald-600" aria-hidden="true" />
                          ) : (
                            <AlertCircle size={16} className="text-amber-600" aria-hidden="true" />
                          )
                        ) : (
                          <div className="opt-circle" aria-hidden="true" />
                        )}
                      </div>
                      <div className="opt-body">
                        <strong className="opt-label">{opt.label}</strong>
                        <p className="opt-desc">{opt.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Red Flags vs Strengths Analysis */}
      <div className="audit-insights-panel">
        {results.redFlags.length > 0 && (
          <div className="insight-column red-flags-col">
            <div className="insight-col-header">
              <AlertTriangle size={15} className="text-amber-600" aria-hidden="true" />
              <strong>Examples to clarify ({results.redFlags.length})</strong>
            </div>
            <ul className="insight-list">
              {results.redFlags.map((rf, idx) => (
                <li key={idx}>{rf}</li>
              ))}
            </ul>
          </div>
        )}

        {results.strengths.length > 0 && (
          <div className="insight-column strengths-col">
            <div className="insight-col-header">
              <Sparkles size={15} className="text-violet-600" aria-hidden="true" />
              <strong>More concrete examples ({results.strengths.length})</strong>
            </div>
            <ul className="insight-list">
              {results.strengths.map((st, idx) => (
                <li key={idx}>{st}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="audit-footer-action">
        <a href="/signin?return_to=%2Fapp%23profiles" className="marketing-primary audit-cta-link">
          <span>Open your founder profile</span>
          <ArrowRight size={16} aria-hidden="true" />
        </a>
        <p className="audit-cta-note">
          Use your own observations in your profile. Choices in this exercise are not saved or transferred.
        </p>
      </div>
    </div>
  );
}
