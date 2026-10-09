"use client";

import { useState } from "react";
import { Check, Copy, Download, FileText, Handshake, Sprout } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { starterTemplates, type StarterTemplate } from "@/lib/starter-templates";
import { setupSignIn } from "@/lib/onboarding-intent";
import "./marketing-templates.css";

function TemplateCard({ template, index }: { template: StarterTemplate; index: number }) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");
  const Icon = template.id === "founder-brief" ? FileText : template.id === "progress-update" ? Sprout : Handshake;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(template.markdown);
      setCopied(true); setStatus("Template copied. Replace the prompts with your own information.");
    } catch {
      setCopied(false); setStatus("Copy is unavailable in this browser. Select the worksheet text below or download it.");
    }
  };
  return <Dialog onOpenChange={() => { setCopied(false); setStatus(""); }}>
    <article className={`starter-card starter-card-${index}`}>
      <div className="starter-card-top"><span>0{index + 1} / {template.role === "founder" ? "FOR FOUNDERS" : "FOR INVESTORS"}</span><Icon size={23} aria-hidden="true" /></div>
      <h3>{template.title}</h3><p>{template.description}</p>
      <div className="starter-paper" aria-hidden="true"><span className="starter-paper-title">{template.title}</span>{template.sections.map((section, n) => <div key={section.title}><span>0{n + 1}</span><strong>{section.title}</strong><i /></div>)}</div>
      <p className="starter-outcome">{template.outcome}</p>
      <DialogTrigger asChild><button type="button" className="marketing-secondary starter-preview">Preview template</button></DialogTrigger>
    </article>
    <DialogContent className="starter-dialog" aria-describedby={`starter-${template.id}-description`}>
      <DialogHeader><span className="starter-dialog-kicker">YOUR NEXT STEP / {template.role.toUpperCase()}</span><DialogTitle>{template.title}</DialogTitle><DialogDescription id={`starter-${template.id}-description`}>{template.description} Free to copy or download.</DialogDescription></DialogHeader>
      <div className="starter-dialog-prompts">{template.sections.map(section => <div key={section.title}><h4>{section.title}</h4><p>{section.prompt}</p></div>)}</div>
      <div className="starter-dialog-actions"><button type="button" onClick={() => void copy()} className="starter-copy">{copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}{copied ? "Copy again" : "Copy template"}</button><a href={`/templates/${template.id}`} download={`firstsignal-${template.id}.md`} className="starter-download"><Download size={17} aria-hidden="true" />Download Markdown</a></div>
      <p className="starter-copy-status" role="status">{status}</p>
      <label className="starter-worksheet-label" htmlFor={`worksheet-${template.id}`}>Your worksheet</label>
      <textarea id={`worksheet-${template.id}`} className="starter-worksheet" value={template.markdown} readOnly rows={10} spellCheck={false} />
      <div className="starter-dialog-footer"><p>{template.id === "progress-update" ? "Updates follow your founder profile’s visibility. Save a founder profile first if you don’t have one." : "Use the guided form to write your own information. Nothing is saved until you review and confirm."}</p><a className="starter-use" href={setupSignIn(template.role, template.id)}>{template.id === "progress-update" ? "Write an update in FirstSignal" : "Use the guided profile form"}</a></div>
    </DialogContent>
  </Dialog>;
}

export default function MarketingTemplates() {
  return <section className="marketing-templates marketing-section" id="templates" aria-labelledby="templates-title" tabIndex={-1}>
    <div className="starter-heading marketing-reveal"><div><span className="marketing-kicker">A USEFUL PLACE TO START</span><h2 id="templates-title">A blank page.<br /><em>A better starting point.</em></h2></div><div><p>Three practical templates for your first profile, your next update or the founders you want to meet.</p><span className="starter-free"><Check size={16} aria-hidden="true" />Free to copy and download. No account needed.</span></div></div>
    <div className="starter-grid">{starterTemplates.map((template, index) => <TemplateCard key={template.id} template={template} index={index} />)}</div>
    <p className="starter-disclosure">Writing prompts, not verified evidence. Add your own observations and choose what to share.</p>
  </section>;
}
