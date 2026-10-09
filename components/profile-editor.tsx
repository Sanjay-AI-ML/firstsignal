"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, LockKeyhole } from "lucide-react";
import { formatINR, sectors, stages, type Profile } from "@/lib/data";
import { profileSchema } from "@/lib/validation";
import { getProfileCompletion } from "@/lib/profile-completion";
import BudgetInput from "./budget-input";
import "./profile-editor.css";

type ProfileEditorProps = {
  form: Profile;
  setForm: (profile: Profile) => void;
  publish: boolean;
  setPublish: (value: boolean) => void;
  consent: boolean;
  setConsent: (value: boolean) => void;
  error: string;
  busy: boolean;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
};

type TextField = "name" | "founder" | "city" | "tagline" | "problem" | "solution" |
  "experience" | "validation" | "evidenceDate" | "uncertainty" | "nextMilestone" |
  "budget" | "productStatus" | "revenueStatus" | "incorporationStatus" | "requiredEvidence";
type FieldIssue = { field: string; message: string };

function RangeAmount({ id, value, onChange, invalid, description }: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  invalid: boolean;
  description: string;
}) {
  const [draft, setDraft] = useState(value === 0 ? "" : String(value));
  useEffect(() => setDraft(value === 0 ? "" : String(value)), [value]);
  return <input id={id} type="number" min={0} max={1000000000} step={1} placeholder="0" value={draft}
    aria-invalid={invalid || undefined} aria-describedby={description}
    onChange={event => {
      const next = event.target.value.replace(/^0+(?=\d)/, "");
      setDraft(next);
      const amount = next === "" ? 0 : Number(next);
      if (Number.isFinite(amount)) onChange(amount);
    }} />;
}

export default function ProfileEditor({ form, setForm, publish, setPublish, consent, setConsent, error, busy, onSubmit, onCancel }: ProfileEditorProps) {
  const [step, setStep] = useState(0);
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const formElement = useRef<HTMLFormElement>(null);
  const changedStep = useRef(false);
  const prefix = useId();
  const investor = form.kind === "investor";
  const titles = investor
    ? ["Your investment thesis", "Who you want to meet", "Check size & availability", "Review & sharing"]
    : ["Your startup at a glance", "The idea & what you know", "Your next milestone", "Review & sharing"];
  const captions = investor
    ? ["Start with a clear introduction.", "Give founders a useful sense of fit.", "Set expectations before the first conversation.", "Choose what to share, then save."]
    : ["Start with a clear introduction.", "Separate observations from assumptions.", "Make the next step easy to understand.", "Choose what to share, then save."];
  const groups = investor
    ? [["name", "founder", "city", "tagline", "solution"], ["sector", "stage", "sectors", "stages", "experience", "validation", "requiredEvidence", "role"], ["fundingIntentINR", "checkRangeINR", "uncertainty", "budget", "nextMilestone"], []]
    : [["name", "founder", "city", "tagline", "sector", "stage"], ["problem", "solution", "experience", "validation", "evidenceDate", "uncertainty"], ["nextMilestone", "fundingIntentINR", "budget", "productStatus", "revenueStatus", "incorporationStatus"], []];
  const completion = getProfileCompletion(form);
  const selectedSectors = form.sectors ?? [form.sector];
  const selectedStages = form.stages ?? [form.stage];
  const range = form.checkRangeINR ?? [0, 0];
  const hasRange = form.checkRangeINR?.length === 2 && range[0] > 0 && range[1] >= range[0];

  useEffect(() => {
    if (changedStep.current) heading.current?.focus();
    changedStep.current = true;
  }, [step]);

  const move = (next: number) => { setIssues([]); setStep(next); };
  const update = (field: TextField, value: string) => {
    const next = { ...form, [field]: value };
    if (field === "requiredEvidence") next.validation = value;
    setForm(next);
    setIssues(previous => previous.filter(issue => issue.field !== field));
  };
  const allIssues = () => {
    const result = profileSchema.safeParse(form);
    return result.success ? [] : result.error.issues.map(issue => ({ field: String(issue.path[0]), message: issue.message }));
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const found = allIssues();
    if (step < 3) {
      const current = found.filter(issue => groups[step].includes(issue.field));
      setIssues(current);
      if (!current.length) setStep(step + 1);
      else formElement.current?.querySelector<HTMLElement>(`[data-field="${current[0].field}"] input, [data-field="${current[0].field}"] textarea, [data-field="${current[0].field}"] select`)?.focus();
      return;
    }
    if (found.length) {
      const firstStep = groups.findIndex(group => group.includes(found[0].field));
      setStep(firstStep < 0 ? 3 : firstStep);
      setIssues(found);
      return;
    }
    if (!consent) { setIssues([{ field: "consent", message: "Confirm your sharing choice before saving." }]); return; }
    onSubmit(event);
  };

  function field(label: string, name: TextField, options: { required?: boolean; multiline?: boolean; full?: boolean; placeholder?: string; help?: string; max: number }) {
    const id = `${prefix}-${name}`;
    const issue = issues.find(item => item.field === name);
    const shared = {
      id,
      value: name === "requiredEvidence" ? form.requiredEvidence ?? form.validation : form[name] ?? "",
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(name, event.target.value),
      maxLength: options.max,
      required: options.required,
      placeholder: options.placeholder,
      "aria-invalid": issue ? true as const : undefined,
      "aria-describedby": `${id}-help${issue ? ` ${id}-error` : ""}`,
    };
    return <div className={`field ${options.full ? "full" : ""}`} data-field={name}>
      <label htmlFor={id}>{label} <span className="guided-optional">{options.required ? "Required" : "Optional"}</span></label>
      {options.multiline ? <textarea {...shared} rows={3} /> : <input {...shared} />}
      <p className="guided-field-help" id={`${id}-help`}>{options.help || `Up to ${options.max} characters.`}</p>
      {issue ? <p className="guided-field-error" id={`${id}-error`}>{issue.message}</p> : null}
    </div>;
  }

  const preference = (name: "sectors" | "stages", label: string, values: string[], selected: string[]) => (
    <fieldset className="guided-preferences full" data-field={name}>
      <legend>{label}</legend>
      <p className="guided-field-help">Choose all that fit. At least one stays selected.</p>
      <div>{values.map(value => <label className="guided-choice" key={value}>
        <input type="checkbox" checked={selected.includes(value)} onChange={event => {
          const next = event.target.checked ? [...selected, value] : selected.filter(item => item !== value);
          if (!next.length) return;
          setForm({ ...form, [name]: next, [name === "sectors" ? "sector" : "stage"]: next[0] });
        }} />
        <span>{value}</span>
      </label>)}</div>
    </fieldset>
  );

  return <form ref={formElement} onSubmit={submit} className="dialog-form guided-editor" noValidate>
    <div className="guided-progress">
      <div><span>{investor ? "Investor profile" : "Founder profile"}</span><strong>Step {step + 1} of 4</strong></div>
      <ol aria-label="Profile creation steps">{titles.map((title, index) => <li key={title} aria-current={step === index ? "step" : undefined} className={index === step ? "current" : index < step ? "done" : ""}>
        <span aria-hidden="true">{index < step ? <Check size={13} /> : index + 1}</span><small>{title}</small>
      </li>)}</ol>
    </div>
    <div className="guided-step-heading"><h3 ref={heading} tabIndex={-1}>{titles[step]}</h3><p>{captions[step]} Optional fields can be added later.</p></div>
    {step === 0 ? <div className="form-grid">
      {field(investor ? "Investor or organisation name" : "Startup name", "name", { required: true, max: 60, placeholder: investor ? "Your name or investment firm" : "Your startup or working name" })}
      {field("Your public name", "founder", { required: true, max: 80, placeholder: "The name people will see" })}
      {field("City", "city", { required: true, max: 60, placeholder: "For example: Bengaluru" })}
      {!investor ? <>
        <div className="field" data-field="sector"><label htmlFor={`${prefix}-sector`}>Primary sector</label><select id={`${prefix}-sector`} value={form.sector} onChange={event => setForm({ ...form, sector: event.target.value })}>{sectors.map(value => <option key={value}>{value}</option>)}</select></div>
        <div className="field" data-field="stage"><label htmlFor={`${prefix}-stage`}>Current stage</label><select id={`${prefix}-stage`} value={form.stage} onChange={event => setForm({ ...form, stage: event.target.value })}>{stages.map(value => <option key={value}>{value}</option>)}</select></div>
      </> : null}
      {field(investor ? "One-line investment thesis" : "One-line idea", "tagline", { required: true, max: 160, full: true, placeholder: investor ? "We back early software teams solving supply-chain problems." : "We help small manufacturers track orders without spreadsheets.", help: "Say who you help and what you focus on. Keep it specific." })}
      {investor ? field("Your investment thesis", "solution", { max: 1500, multiline: true, full: true, placeholder: "Describe the founders, problems and stages you are interested in.", help: "Explain your interests and any important exclusions." }) : null}
    </div> : null}
    {step === 1 ? <div className="form-grid">
      {investor ? <>
        {preference("sectors", "Sectors you are interested in", sectors, selectedSectors)}
        {preference("stages", "Stages you consider", stages, selectedStages)}
      </> : <>
        {field("Problem you understand", "problem", { required: true, multiline: true, full: true, max: 1500, placeholder: "Who faces the problem, how they manage it today, and why that is difficult.", help: "At least 10 characters. Describe an observed problem rather than a market-size claim." })}
        {field("Proposed solution", "solution", { multiline: true, full: true, max: 1500, placeholder: "What you plan to build and how it would help.", help: "An idea is enough. Say what is already built and what is still proposed." })}
      </>}
      {field(investor ? "Your investing role and background" : "Relevant founder background", "experience", { multiline: true, full: true, max: 1000, placeholder: investor ? "Operator angel, independent investor or fund team. Share relevant experience." : "Your relevant skills, domain experience and what your team can deliver.", help: "Describe your own experience. FirstSignal does not independently verify it." })}
      {field(investor ? "Evidence you seek from founders" : "Evidence and customer learning", investor ? "requiredEvidence" : "validation", { multiline: true, full: true, max: 1500, placeholder: investor ? "For example: customer interviews, technical prototype or founder experience." : "For example: interviewed 12 shop owners; 8 described the same order-tracking problem.", help: investor ? "Help founders decide whether a conversation is relevant." : "Share what happened, when, and what you learned. It is fine to say you have not tested the idea yet." })}
      {!investor ? <>
        <div className="field" data-field="evidenceDate"><label htmlFor={`${prefix}-evidenceDate`}>Evidence observed on <span className="guided-optional">Optional</span></label><input id={`${prefix}-evidenceDate`} type="date" value={form.evidenceDate} max={new Date().toISOString().slice(0, 10)} aria-invalid={issues.some(item => item.field === "evidenceDate") || undefined} aria-describedby={`${prefix}-date-help`} onChange={event => update("evidenceDate", event.target.value)} /><p id={`${prefix}-date-help`} className="guided-field-help">Use the date of your observation, today or earlier.</p>{issues.filter(item => item.field === "evidenceDate").map(item => <p className="guided-field-error" key={item.field}>{item.message}</p>)}</div>
        {field("What remains uncertain", "uncertainty", { multiline: true, full: true, max: 1000, placeholder: "For example: will customers pay, and does the workflow work outside our first interviews?", help: "A clear assumption gives investors a useful question to discuss." })}
      </> : null}
    </div> : null}
    {step === 2 ? <div className="form-grid">
      {investor ? <>
        <div className="field" data-field="checkRangeINR"><label htmlFor={`${prefix}-check-min`}>Minimum indicative check (INR) <span className="guided-optional">Optional</span></label><RangeAmount id={`${prefix}-check-min`} value={range[0]} onChange={amount => setForm({ ...form, checkRangeINR: amount === 0 && range[1] === 0 ? undefined : [amount, range[1]], fundingIntentINR: range[1] || form.fundingIntentINR })} invalid={issues.some(item => item.field === "checkRangeINR")} description={`${prefix}-range-help`} /></div>
        <div className="field"><label htmlFor={`${prefix}-check-max`}>Maximum indicative check (INR) <span className="guided-optional">Optional</span></label><RangeAmount id={`${prefix}-check-max`} value={range[1]} onChange={amount => setForm({ ...form, checkRangeINR: range[0] === 0 && amount === 0 ? undefined : [range[0], amount], fundingIntentINR: amount })} invalid={issues.some(item => item.field === "checkRangeINR" || item.field === "fundingIntentINR")} description={`${prefix}-range-help`} /></div>
        <p id={`${prefix}-range-help`} className="guided-field-help full">Enter a positive minimum and maximum, or leave both blank if undecided. This is a preference, not a commitment to invest.</p>
        {!form.checkRangeINR && form.fundingIntentINR > 0 ? <p className="guided-field-help full">Your earlier indicative check size is {formatINR(form.fundingIntentINR)}. Add a range to make it more useful, or <button type="button" className="text-button" onClick={() => setForm({ ...form, fundingIntentINR: 0 })}>clear the earlier amount</button>.</p> : null}
        {issues.filter(item => item.field === "checkRangeINR" || item.field === "fundingIntentINR").map((item, index) => <p className="guided-field-error full" key={`${item.field}-${index}`}>{item.message}</p>)}
        {field("Availability for introductions", "uncertainty", { multiline: true, full: true, max: 1000, placeholder: "For example: open to two founder conversations each month; currently exploring agribusiness.", help: "Describe your capacity and any limits. Update it when your availability changes." })}
        {field("What a useful first conversation covers", "nextMilestone", { multiline: true, full: true, max: 1000, placeholder: "For example: founder background, customer learning and fit with our thesis." })}
      </> : <>
        {field("Next milestone", "nextMilestone", { multiline: true, full: true, max: 1000, placeholder: "For example: test a clickable prototype with 10 shop owners over the next four weeks.", help: "Describe an observable next step and a realistic time frame." })}
        <div className="field" data-field="fundingIntentINR"><label htmlFor="funding-budget">Planning budget (INR) <span className="guided-optional">Optional</span></label><BudgetInput key={`${form.kind}:${form.id}`} value={form.fundingIntentINR} onChange={amount => setForm({ ...form, fundingIntentINR: amount })} /><p className="guided-field-help">The cost of your next step. Leave blank if you are still estimating.</p>{issues.filter(item => item.field === "fundingIntentINR").map(item => <p className="guided-field-error" key={item.field}>{item.message}</p>)}</div>
        {field("Product status", "productStatus", { max: 250, placeholder: "For example: concept, mock-up or working prototype" })}
        {field("Revenue status", "revenueStatus", { max: 250, placeholder: "For example: no revenue yet or paid pilot" })}
        {field("Incorporation status", "incorporationStatus", { max: 250, placeholder: "For example: not incorporated yet" })}
        {field("Budget assumptions", "budget", { multiline: true, full: true, max: 1000, placeholder: "What the budget covers, the estimate behind it, and what is excluded.", help: "A profile budget is a planning estimate, not an investment offer." })}
      </>}
    </div> : null}
    {step === 3 ? <>
      <section className="guided-review" aria-label="Profile summary"><div><span className="eyebrow">{investor ? "Investor" : "Founder"} · Self-reported</span><h4>{form.name}</h4><p>{form.tagline}</p></div><dl><div><dt>Public name</dt><dd>{form.founder}</dd></div><div><dt>Location</dt><dd>{form.city}</dd></div><div><dt>Interests</dt><dd>{investor ? `${selectedSectors.join(", ")} · ${selectedStages.join(", ")}` : `${form.sector} · ${form.stage}`}</dd></div><div><dt>{investor ? "Indicative check range" : "Planning budget"}</dt><dd>{investor ? hasRange ? `${formatINR(range[0])}–${formatINR(range[1])}` : form.fundingIntentINR > 0 ? `${formatINR(form.fundingIntentINR)} (earlier check size; range unspecified)` : "Still to be defined" : form.fundingIntentINR > 0 ? formatINR(form.fundingIntentINR) : "Still to be defined"}</dd></div></dl><button type="button" className="text-button" onClick={() => move(0)}>Edit introduction <ArrowLeft size={14} aria-hidden="true" /></button></section>
      <section className="guided-checklist" aria-label="Profile writing checklist"><div><strong>{completion.completed} of {completion.total} sections filled</strong><small>A clearer profile helps a useful conversation. Optional sections do not prevent saving.</small></div>{completion.missing.length ? <ul>{completion.missing.map(item => <li key={item.id}><span>{item.label}</span><button type="button" onClick={() => move(item.step)}>Add detail <ArrowRight size={13} aria-hidden="true" /></button></li>)}</ul> : <p><Check size={15} aria-hidden="true" />Your profile checklist is filled. Claims remain self-reported.</p>}</section>
      <fieldset className="guided-sharing"><legend>Who can discover this profile?</legend><label className={`guided-sharing-option ${!publish ? "selected" : ""}`}><input type="radio" name={`${prefix}-sharing`} checked={!publish} onChange={() => { setPublish(false); setConsent(false); }} /><LockKeyhole size={18} aria-hidden="true" /><span><strong>Private draft</strong><small>Only your account can view it. You can list it later.</small></span></label><label className={`guided-sharing-option ${publish ? "selected" : ""}`}><input type="radio" name={`${prefix}-sharing`} checked={publish} onChange={() => { setPublish(true); setConsent(false); }} /><Eye size={18} aria-hidden="true" /><span><strong>List on FirstSignal</strong><small>Visible to people with access to FirstSignal. Share a summary you are comfortable making public.</small></span></label></fieldset>
      <label className="consent guided-consent" data-field="consent"><input type="checkbox" checked={consent} onChange={event => { setConsent(event.target.checked); setIssues(previous => previous.filter(item => item.field !== "consent")); }} /><span>I understand that {publish ? "my profile will be visible to people with access to FirstSignal" : "my draft is private to my account"}. I have permission to share this information and have not included confidential or sensitive personal details.</span></label>
    </> : null}
    {issues.length || error ? <div className="notice error-notice guided-errors" role="alert"><strong>{error || "Please check the following:"}</strong>{issues.length ? <ul>{issues.map((issue, index) => <li key={`${issue.field}-${index}`}>{issue.message}</li>)}</ul> : null}</div> : null}
    <div className="guided-actions"><button type="button" className="text-button" disabled={busy} onClick={onCancel}>Cancel</button><div>{step > 0 ? <button type="button" className="outline-button" disabled={busy} onClick={() => move(step - 1)}><ArrowLeft size={15} aria-hidden="true" />Back</button> : null}<button type="submit" className="primary-button" disabled={busy}>{busy ? "Saving…" : step < 3 ? "Continue" : publish ? "Save & list profile" : "Save private draft"}{step < 3 ? <ArrowRight size={15} aria-hidden="true" /> : null}</button></div></div>
    <p className="guided-save-note">Changes are saved only when you {step < 3 ? "finish the review step" : "save this profile"}.</p>
  </form>;
}
