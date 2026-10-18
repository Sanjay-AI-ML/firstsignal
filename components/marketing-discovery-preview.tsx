"use client";

import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { ArrowRight, Check, GitCompareArrows, LayoutGrid, SlidersHorizontal } from "lucide-react";
import samples from "@/lib/seed-startups.json";

const profiles = samples.slice(0, 3);
const tabs = ["Discover", "Compare"] as const;
const money = (amount: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(amount / 100000)} lakh`;

/** A public, local demonstration using the same fictional records as the workspace. */
export default function MarketingDiscoveryPreview() {
  const [active, setActive] = useState(0);
  const [stage, setStage] = useState("Pre-product");
  const [selected, setSelected] = useState(["tracegrid", "ledgerleaf"]);
  const [feedback, setFeedback] = useState("Tracegrid and Ledgerleaf are selected for this example.");
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const compared = profiles.filter(profile => selected.includes(profile.id));
  const shown = profiles.filter(profile => stage === "all" || profile.stage === stage);
  const searchHref = stage === "all" ? "/app?kind=startup#discover" : `/app?kind=startup&stage=${encodeURIComponent(stage)}#discover`;

  function toggle(profileId: string, name: string) {
    const next = selected.includes(profileId) ? selected.filter(value => value !== profileId) : [...selected, profileId];
    setSelected(next);
    setFeedback(`${name} ${next.includes(profileId) ? "selected" : "removed"}. ${next.length} of 3 selected in this preview.`);
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : active === 0 ? 1 : 0;
    setActive(next); buttons.current[next]?.focus();
  }
  function showPreview(index: number) {
    setActive(index);
    buttons.current[index]?.focus();
  }

  return <div className="discovery-preview" aria-label="Interactive fictional workspace preview">
    <div className="discovery-preview-chrome"><div><img src="/findin-logo.png" alt="" width="24" height="24" /><strong>FindIn</strong><span>/ Workspace preview</span></div><span className="discovery-sample-label">FICTIONAL PROFILES</span></div>
    <div className="discovery-preview-body">
      <div className="discovery-preview-heading"><div><span className="marketing-kicker">THE NEXT POSSIBILITY</span><h2>Meet an idea early.</h2></div><SlidersHorizontal size={20} aria-hidden="true" /></div>
      <div className="discovery-preview-tabs" role="tablist" aria-label="Explore the workspace preview">
        {tabs.map((tab, index) => <button type="button" key={tab} role="tab" ref={element => { buttons.current[index] = element; }} id={`${id}-tab-${index}`} aria-controls={`${id}-panel`} aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={keyboard}>{index === 0 ? <LayoutGrid size={16} aria-hidden="true" /> : <GitCompareArrows size={16} aria-hidden="true" />}{tab}{index === 1 && <span>{selected.length}</span>}</button>)}
      </div>
      <div className="discovery-preview-panel" id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${active}`} tabIndex={0}>
        {active === 0 ? <>
          <div className="discovery-preview-filters" aria-label="Filter this preview by stage">{[["all", "All stages"], ["Pre-product", "Pre-product"], ["Idea-stage", "Idea"]].map(([value, label]) => <button key={value} type="button" aria-pressed={stage === value} onClick={() => setStage(value)}>{label}</button>)}<span>{shown.length} sample{shown.length === 1 ? "" : "s"}</span></div>
          <div className="discovery-preview-cards">{shown.map(profile => <article key={profile.id} className="discovery-preview-card">
            <div className="discovery-preview-card-top"><span className={`discovery-avatar discovery-avatar-${profile.id}`} aria-hidden="true">{profile.initials}</span><div><a href={`/app?profile=${profile.id}#discover`}>{profile.name}<ArrowRight size={14} aria-hidden="true" /></a><span>{profile.city} · {profile.sector.replace(" SaaS", "")}</span></div><button type="button" className="discovery-compare-toggle" aria-label={`${selected.includes(profile.id) ? "Remove" : "Select"} ${profile.name} ${selected.includes(profile.id) ? "from" : "for"} preview comparison`} aria-pressed={selected.includes(profile.id)} onClick={() => toggle(profile.id, profile.name)}>{selected.includes(profile.id) ? <Check size={15} aria-hidden="true" /> : <span aria-hidden="true">+</span>}</button></div>
            <p>{profile.tagline}</p><div className="discovery-preview-card-bottom"><span>{profile.stage}</span><span>Planning budget · {money(profile.fundingIntentINR)}</span></div>
          </article>)}</div>
          <div className="discovery-preview-compare-bar"><span><GitCompareArrows size={17} aria-hidden="true" />{selected.length} of 3 selected</span><button type="button" onClick={() => showPreview(1)}>Compare ideas<ArrowRight size={15} aria-hidden="true" /></button></div>
        </> : <div className="discovery-comparison">
          <div className="discovery-comparison-intro"><strong>A little context, side by side.</strong><p>A planning budget is not necessarily a fundraising target.</p></div>
          {compared.length >= 2 ? <div className="discovery-comparison-grid" style={{ "--comparison-count": compared.length } as CSSProperties}>{compared.map(profile => <article key={profile.id}><span className={`discovery-avatar discovery-avatar-${profile.id}`} aria-hidden="true">{profile.initials}</span><h3>{profile.name}</h3><dl><div><dt>Stage</dt><dd>{profile.stage}</dd></div><div><dt>Planning budget</dt><dd>{money(profile.fundingIntentINR)}</dd></div><div><dt>Next step</dt><dd>{profile.id === "tracegrid" ? "Test an offline prototype with 2 factories." : profile.id === "stockloom" ? "Test a clickable workflow with 8 operators." : "Test a metadata-only prototype with 3 firms."}</dd></div></dl></article>)}</div> : <div className="discovery-comparison-empty"><GitCompareArrows size={28} aria-hidden="true" /><p>Select at least two ideas to see them side by side.</p><button type="button" className="marketing-demo-button" onClick={() => showPreview(0)}>Choose ideas</button></div>}
          <button type="button" className="discovery-back-link" onClick={() => showPreview(0)}>Change your selection<ArrowRight size={15} aria-hidden="true" /></button>
        </div>}
      </div>
      <p className="discovery-preview-feedback" role="status">{feedback}</p>
    </div>
    <div className="discovery-preview-footer"><p>Try the preview. It saves nothing.</p><a href={searchHref}>Open this search<ArrowRight size={16} aria-hidden="true" /></a></div>
  </div>;
}
