"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Bookmark, Check, FileText, Handshake, LockKeyhole, MessageCircle, Sprout } from "lucide-react";
import ProjectIcon from "./project-icon";

const steps = [
  { title: "Shape your profile", description: "A clear story, in manageable steps.", icon: FileText },
  { title: "Understand the fit", description: "Compare sectors, stages and investment interests.", icon: Handshake },
  { title: "Follow the progress", description: "See what founders learn as their idea develops.", icon: Sprout },
  { title: "Move the conversation forward", description: "Messages, proposals and your next step.", icon: MessageCircle },
];

export default function MarketingProductTour() {
  const [active, setActive] = useState(0);
  const [listed, setListed] = useState(false);
  const [stage, setStage] = useState("Pre-product");
  const [counteroffer, setCounteroffer] = useState(false);
  const [story, setStory] = useState(false);
  const [scrollPaused, setScrollPaused] = useState(false);
  const section = useRef<HTMLElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const chapters = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const scrollControl = useRef<HTMLDivElement>(null);
  const scheduleScroll = useRef<(() => void) | null>(null);
  const manualPause = useRef(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const pauseScroll = () => { manualPause.current = true; setScrollPaused(true); };
  const selectStep = (index: number) => { pauseScroll(); setActive(index); };

  useEffect(() => {
    const tour = section.current;
    const stageElement = preview.current;
    const workspaceElement = workspace.current;
    const chapterElement = chapters.current;
    const marketing = tour?.closest<HTMLElement>(".marketing");
    if (!tour || !stageElement || !workspaceElement || !chapterElement || !marketing || !("IntersectionObserver" in window) || !("ResizeObserver" in window)) return;

    const size = matchMedia("(min-width: 1101px) and (min-height: 680px)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const navigation = marketing.querySelector<HTMLElement>(".marketing-nav");
    let enabled = false;
    let visible = false;
    let listening = false;
    let frame = 0;
    let stickyTop = 100;

    const update = () => {
      frame = 0;
      const focused = document.activeElement;
      const previewFocused = workspaceElement.contains(focused) && !scrollControl.current?.contains(focused);
      if (!enabled || !visible || manualPause.current || previewFocused) return;
      const bounds = chapterElement.getBoundingClientRect();
      if (!bounds.height) return;
      const anchor = stickyTop + stageElement.offsetHeight / 2;
      const progress = Math.max(0, Math.min(1, (anchor - bounds.top) / bounds.height));
      tour.style.setProperty("--tour-scroll-progress", String(progress));
      const next = Math.max(0, Math.min(steps.length - 1, Math.floor((anchor - bounds.top) / bounds.height * steps.length)));
      setActive(current => current === next ? current : next);
    };
    const schedule = () => { if (visible && enabled && !frame) frame = requestAnimationFrame(update); };
    scheduleScroll.current = schedule;
    const syncListener = () => {
      const shouldListen = visible && enabled;
      if (shouldListen === listening) return;
      listening = shouldListen;
      if (listening) addEventListener("scroll", schedule, { passive: true });
      else removeEventListener("scroll", schedule);
    };
    const configure = () => {
      stickyTop = (navigation?.offsetHeight ?? 80) + 20;
      tour.style.setProperty("--tour-sticky-top", `${stickyTop}px`);
      // Reserve the story's small control row before enabling it. The observed
      // preview itself remains the final authority after its layout changes.
      const reservedHeight = enabled ? 0 : 58;
      const fits = stageElement.offsetHeight + reservedHeight <= innerHeight - stickyTop - 24;
      const next = size.matches && !reduced.matches && marketing.dataset.motion !== "paused" && fits;
      if (enabled !== next) { enabled = next; setStory(next); }
      syncListener();
      schedule();
    };
    const visibility = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      syncListener();
      schedule();
    }, { rootMargin: "100px 0px", threshold: 0 });
    visibility.observe(workspaceElement);
    const dimensions = new ResizeObserver(configure);
    dimensions.observe(stageElement);
    if (navigation) dimensions.observe(navigation);
    const preference = new MutationObserver(configure);
    preference.observe(marketing, { attributes: true, attributeFilter: ["data-motion"] });
    size.addEventListener("change", configure);
    reduced.addEventListener("change", configure);
    addEventListener("resize", configure);
    workspaceElement.addEventListener("focusout", schedule);
    configure();
    return () => {
      visibility.disconnect(); dimensions.disconnect(); preference.disconnect();
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", configure);
      size.removeEventListener("change", configure);
      reduced.removeEventListener("change", configure);
      workspaceElement.removeEventListener("focusout", schedule);
      scheduleScroll.current = null;
      tour.style.removeProperty("--tour-sticky-top");
      tour.style.removeProperty("--tour-scroll-progress");
    };
  }, []);

  const selectWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (["ArrowRight", "ArrowDown"].includes(event.key)) next = (index + 1) % steps.length;
    else if (["ArrowLeft", "ArrowUp"].includes(event.key)) next = (index + steps.length - 1) % steps.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = steps.length - 1;
    else return;
    event.preventDefault(); selectStep(next); buttons.current[next]?.focus();
  };

  return <section ref={section} className="marketing-tour marketing-section" data-tour-story={story ? "active" : undefined} data-tour-scroll={scrollPaused ? "paused" : "following"} id="how-it-works" aria-labelledby="tour-title" tabIndex={-1}>
    <div className="marketing-tour-heading marketing-reveal"><span className="marketing-kicker">TAKE A LOOK INSIDE</span><h2 id="tour-title">From first signal<br />to next step.</h2><p>A profile starts the story. The learning and conversations keep it moving.</p></div>
    <div className="marketing-tour-workspace" ref={workspace}>
      <div className="marketing-tour-controls"><div className="marketing-tour-steps" ref={chapters} role="tablist" aria-label="Product walkthrough" aria-orientation="vertical">
        {steps.map(({ title, description, icon: Icon }, index) => <button key={title} ref={element => { buttons.current[index] = element; }} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel`} aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => selectStep(index)} onKeyDown={event => selectWithKeyboard(event, index)}>
          <span className="marketing-tour-number">0{index + 1}</span><span><strong>{title}</strong><small>{description}</small></span><Icon size={20} aria-hidden="true" />
        </button>)}
      </div><a className="marketing-tour-entry" href="/app#discover">Try the real workspace</a></div>
      <div className="marketing-tour-stage" ref={preview} onPointerDownCapture={event => { if (!scrollControl.current?.contains(event.target as Node)) pauseScroll(); }} onKeyDownCapture={event => { if (event.key !== "Tab" && !scrollControl.current?.contains(event.target as Node)) pauseScroll(); }} onChangeCapture={pauseScroll}><div className="marketing-tour-chrome"><span><span className="marketing-tour-mark" aria-hidden="true">f.</span> FindIn / Product walkthrough</span><span className="marketing-example-label">FICTIONAL DATA</span></div>
        <div className="marketing-tour-panel" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${active}`} tabIndex={0}>
          {active === 0 ? <>
            <div className="tour-panel-heading"><div><span className="marketing-kicker">PROFILE / TRACEGRID</span><h3>Start with what you know.</h3></div><span className="tour-status"><LockKeyhole size={14} aria-hidden="true" />{listed ? "Listed example" : "Private draft example"}</span></div>
            <dl className="tour-profile-fields"><div><dt>Ideology</dt><dd>Give factory teams a clearer handover between shifts.</dd></div><div><dt>Proposed solution</dt><dd>A mobile shift log with incident owners and follow-up tasks.</dd></div><div><dt>What we learned</dt><dd>16 interviews across 6 factories suggest follow-up ownership needs a closer look.</dd></div><div><dt>The next experiment</dt><dd>Test the offline prototype with two consenting factories.</dd></div></dl>
            <div className="tour-completion"><div><span>Profile writing checklist</span><strong>4 sections filled in this example</strong></div><span className="tour-completion-track" aria-hidden="true"><span /></span></div>
            <div className="tour-panel-bottom"><button type="button" className="marketing-demo-button" onClick={() => setListed(!listed)}>{listed ? "Preview a private draft" : "Preview a listed profile"}</button><p role="status">{listed ? "A listed profile and its progress can be viewed publicly." : "Your draft stays private until you choose to list it."}</p></div>
          </> : null}
          {active === 1 ? <>
            <div className="tour-panel-heading"><div><span className="marketing-kicker">FIT / STATED INTERESTS</span><h3>Know why it could fit.</h3></div><span className="tour-status">Example comparison</span></div>
            <div className="tour-fit-people"><div><ProjectIcon project={{ id: "tracegrid", sector: "Manufacturing SaaS" }} size="sm" /><strong>Tracegrid<small>Founder profile</small></strong></div><span className="tour-fit-connector" aria-hidden="true"><Handshake size={23} /></span><div><span className="tour-avatar investor" aria-hidden="true">A</span><strong>Aarav Shah<small>Fictional investor</small></strong></div></div>
            <div className="tour-fit-row"><span>Sector · Manufacturing SaaS</span><strong><Check size={16} aria-hidden="true" />Aligns</strong></div><div className="tour-fit-row"><span>Startup stage · Pre-product</span><strong className={stage === "Pre-product" ? "" : "tour-open-question"}>{stage === "Pre-product" ? <><Check size={16} aria-hidden="true" />Aligns</> : "Different stage"}</strong></div><div className="tour-fit-row"><span>Evidence quality & availability</span><strong className="tour-open-question">Ask about this</strong></div>
            <div className="tour-panel-bottom"><label className="tour-stage-choice" htmlFor={`${id}-stage`}>Try changing the investor’s stage<select id={`${id}-stage`} value={stage} onChange={event => setStage(event.target.value)}><option>Pre-product</option><option>Prototype</option></select></label><p role="status">{stage === "Pre-product" ? "Sector and stage align. This is a reason to explore, not a funding prediction." : "Sector still aligns, but the stated stage differs. Ask whether earlier projects are considered."}</p></div>
          </> : null}
          {active === 2 ? <>
            <div className="tour-panel-heading"><div><span className="marketing-kicker">PROGRESS / SAVED STARTUP</span><h3>The idea keeps developing.</h3></div><span className="tour-status"><Bookmark size={14} aria-hidden="true" />Saved example</span></div>
            <ol className="tour-timeline"><li><time dateTime="2026-09-23">23 SEP 2026</time><h4>Completed the first interview round</h4><p>Follow-up ownership keeps coming up. Frequency and willingness to pay are still untested.</p></li><li><time dateTime="2026-10-06">06 OCT 2026</time><h4>Simplified the shift handover</h4><p>Three walkthroughs suggested a short unresolved-items list matters more than a dashboard.</p></li></ol>
            <div className="tour-learning"><Sprout size={20} aria-hidden="true" /><p><strong>More context for your next conversation.</strong> Save a listed startup to revisit its recent, self-reported updates.</p></div>
            <a className="marketing-demo-button" href="/app?profile=tracegrid#discover">Explore Tracegrid’s sample profile</a>
          </> : null}
          {active === 3 ? <>
            <div className="tour-panel-heading"><div><span className="marketing-kicker">CONNECTION / AFTER ACCEPTANCE</span><h3>A next step, in one place.</h3></div><span className="tour-status"><Handshake size={14} aria-hidden="true" />Accepted example</span></div>
            <div className="tour-message"><MessageCircle size={19} aria-hidden="true" /><p>“Let’s discuss the prototype scope and what the first experiment needs to establish.”<small>Fictional message</small></p></div>
            <div className="tour-proposal"><div><span>PROPOSED INVESTMENT · VERSION {counteroffer ? "2" : "1"}</span><h4>₹{counteroffer ? "10,00,000" : "8,00,000"}<small>Non-binding discussion</small></h4></div><button type="button" className="marketing-demo-button" onClick={() => setCounteroffer(!counteroffer)}>{counteroffer ? "Reset proposal example" : "Preview a counteroffer"}</button></div>
            <div className="tour-private-note"><LockKeyhole size={18} aria-hidden="true" /><div><strong>Your private next step</strong><p>Prepare the customer interview summary before the next conversation.</p><small>Only the writer sees their note. No reminder is sent.</small></div></div>
            <p className="tour-action-feedback" role="status">{counteroffer ? "The example shows a second version. No counteroffer has been sent." : "Proposal discussions stay with the two accepted participants."}</p>
          </> : null}
        </div>
        <div className="marketing-tour-scroll-control" ref={scrollControl} hidden={!story}>
          <span>{scrollPaused ? "Preview paused for you to explore." : "Scroll to follow the steps, or choose one."}</span>
          <button type="button" onClick={() => { manualPause.current = !manualPause.current; setScrollPaused(manualPause.current); scheduleScroll.current?.(); }}>{scrollPaused ? "Resume scroll" : "Pause scroll"}<span className="sr-only"> walkthrough</span></button>
        </div>
        <p className="marketing-tour-disclosure">Interactive example · Changes stay on this page. No records are saved and nobody is contacted.</p>
      </div>
    </div>
  </section>;
}
