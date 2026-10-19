"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowUp, Check, ChevronUp, List, Pause, Play } from "lucide-react";
import { chapterNeighbors, currentChapterIndex, marketingChapters, sameDocumentTarget } from "@/lib/marketing-journey";
import { preserveMarketingReader } from "@/lib/scroll-scene";

const reducedQuery = "(prefers-reduced-motion: reduce)";
const preferenceKey = "findin-marketing-motion-paused";
const preferenceEvent = "findin-marketing-motion-preference";
let memoryPreference = false;

function subscribeToMotion(callback: () => void) {
  const preference = matchMedia(reducedQuery);
  preference.addEventListener("change", callback);
  return () => preference.removeEventListener("change", callback);
}
const getReducedMotion = () => matchMedia(reducedQuery).matches;
const getServerMotion = () => false;
function getManualPause() {
  try { return localStorage.getItem(preferenceKey) === "true"; }
  catch { return memoryPreference; }
}
function subscribeToPause(callback: () => void) {
  const changed = (event: StorageEvent) => { if (event.key === preferenceKey || event.key === null) callback(); };
  addEventListener(preferenceEvent, callback);
  addEventListener("storage", changed);
  return () => { removeEventListener(preferenceEvent, callback); removeEventListener("storage", changed); };
}
function saveManualPause(paused: boolean) {
  memoryPreference = paused;
  try { localStorage.setItem(preferenceKey, String(paused)); } catch { /* Keep the control usable when storage is unavailable. */ }
  dispatchEvent(new Event(preferenceEvent));
}

/** One controller coordinates motion, chapter navigation and deliberate anchor focus. */
export default function MarketingMotion() {
  const paused = useSyncExternalStore(subscribeToPause, getManualPause, getServerMotion);
  const reduced = useSyncExternalStore(subscribeToMotion, getReducedMotion, getServerMotion);
  const stopped = paused || reduced;
  const [chapter, setChapter] = useState(0);
  const revealed = useRef(new WeakSet<Element>());
  const menu = useRef<HTMLDetailsElement>(null);
  const menuTrigger = useRef<HTMLElement>(null);
  const lastChapter = useRef(0);
  const neighbors = chapterNeighbors(chapter);
  const current = marketingChapters[chapter];

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".marketing");
    if (!root) return;
    // One restoration covers every pinned scene changing height in this update.
    if (root.dataset.motion && root.dataset.motion !== (stopped ? "paused" : "full")) preserveMarketingReader(root);
    root.dispatchEvent(new CustomEvent("findin-motion-change", { bubbles: true, detail: { paused: stopped } }));
    root.dataset.motion = stopped ? "paused" : "full";
  }, [stopped]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".marketing");
    if (!root) return;
    const nativeTimeline = CSS.supports("animation-timeline: scroll()");
    root.dataset.scrollTimeline = nativeTimeline ? "native" : "fallback";
    const nav = root.querySelector<HTMLElement>(".marketing-nav");
    const links = [...root.querySelectorAll<HTMLAnchorElement>('.marketing-nav nav a[href^="#"]')];
    const sections = marketingChapters.map(item => document.getElementById(item.id));
    let frame = 0;
    let measureFrame = 0;
    let distance = 0;
    let activationLine = 140;
    let sectionPositions: (number | null)[] = [];
    let disposed = false;
    const updateProgress = () => {
      frame = 0;
      const next = currentChapterIndex(sectionPositions, scrollY, activationLine);
      if (next !== lastChapter.current) { lastChapter.current = next; setChapter(next); }
      const currentHash = `#${marketingChapters[next].id}`;
      links.forEach(link => {
        if (link.hash === currentHash) { if (!link.hasAttribute("aria-current")) link.setAttribute("aria-current", "location"); }
        else if (link.hasAttribute("aria-current")) link.removeAttribute("aria-current");
      });
      if (!nativeTimeline && root.dataset.motion !== "paused") root.style.setProperty("--reading-progress", String(distance > 0 ? Math.min(1, Math.max(0, scrollY / distance)) : 0));
    };
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(updateProgress); };
    const measure = () => {
      measureFrame = 0;
      distance = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      activationLine = Math.ceil(nav?.getBoundingClientRect().height ?? 90) + 65;
      sectionPositions = sections.map(section => section ? section.getBoundingClientRect().top + scrollY : null);
      schedule();
    };
    const scheduleMeasure = () => { if (!disposed && !measureFrame) measureFrame = requestAnimationFrame(measure); };
    const layout = "ResizeObserver" in window ? new ResizeObserver(scheduleMeasure) : undefined;
    layout?.observe(root);
    if (nav) layout?.observe(nav);
    measure();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", scheduleMeasure);
    addEventListener("findin-motion-change", scheduleMeasure);
    document.fonts?.ready.then(scheduleMeasure).catch(() => {});
    return () => {
      disposed = true; layout?.disconnect(); cancelAnimationFrame(frame); cancelAnimationFrame(measureFrame);
      removeEventListener("scroll", schedule); removeEventListener("resize", scheduleMeasure); removeEventListener("findin-motion-change", scheduleMeasure);
      links.forEach(link => link.removeAttribute("aria-current"));
      delete root.dataset.scrollTimeline;
    };
  }, []);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".marketing");
    if (!root || stopped || !("IntersectionObserver" in window)) return;
    const entrances = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (!revealed.current.has(entry.target)) {
          entry.target.classList.add(entry.target.matches(".marketing-editorial-art") ? "illustration-reveal" : "scroll-reveal");
          revealed.current.add(entry.target);
        }
        entrances.unobserve(entry.target);
      });
    }, { threshold: .12 });
    root.querySelectorAll(".marketing-reveal, .marketing-section-heading, .marketing-closing, .specialty-heading, .marketing-editorial-heading, .marketing-editorial-art").forEach(element => entrances.observe(element));
    return () => entrances.disconnect();
  }, [stopped]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".marketing");
    if (!root) return;
    let focusFrame = 0;
    const closeOutside = (event: Event) => { if (event.target instanceof Node && !menu.current?.contains(event.target)) menu.current?.removeAttribute("open"); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !menu.current?.open) return;
      event.preventDefault(); menu.current.open = false; menuTrigger.current?.focus();
    };
    const followAnchor = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || !root.contains(anchor) || anchor.hasAttribute("download") || anchor.target && anchor.target !== "_self") return;
      const id = sameDocumentTarget(anchor.href, location.href);
      const destination = id ? document.getElementById(id) : null;
      if (!destination) return;
      if (menu.current?.contains(anchor)) menu.current.open = false;
      cancelAnimationFrame(focusFrame);
      // Let the browser perform fragment scrolling and history first. Focus adds no scroll.
      focusFrame = requestAnimationFrame(() => {
        const addedTabIndex = !destination.hasAttribute("tabindex");
        if (addedTabIndex) destination.tabIndex = -1;
        destination.focus({ preventScroll: true });
        if (addedTabIndex) destination.addEventListener("blur", () => destination.removeAttribute("tabindex"), { once: true });
      });
    };
    document.addEventListener("click", followAnchor);
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    document.addEventListener("keydown", escape);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("click", followAnchor); document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("focusin", closeOutside); document.removeEventListener("keydown", escape);
      delete root.dataset.motion;
    };
  }, []);

  return <div className="marketing-motion-settings">
    <div className="marketing-reading-progress" aria-hidden="true" />
    <div className="marketing-motion-dock" aria-label="Page chapters and motion controls" role="region">
      <details ref={menu} className="marketing-journey-menu">
        <summary ref={element => { menuTrigger.current = element; }} aria-label={`On this page. Chapter ${chapter + 1} of ${marketingChapters.length}: ${current.label}`}>
          <span className="marketing-journey-count" aria-hidden="true">{String(chapter + 1).padStart(2, "0")}<span> / {String(marketingChapters.length).padStart(2, "0")}</span></span>
          <span className="marketing-journey-current">{current.label}</span><span className="marketing-journey-short" aria-hidden="true">Explore</span><List className="marketing-journey-menu-icon" size={17} aria-hidden="true" /><ChevronUp size={15} aria-hidden="true" />
        </summary>
        <nav aria-label="On this page"><p>Explore FindIn</p>{marketingChapters.map((item, index) => <a key={item.id} href={`#${item.id}`} aria-current={index === chapter ? "location" : undefined}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{item.label}{index === chapter ? <Check size={14} aria-hidden="true" /> : null}</a>)}</nav>
      </details>
      <div className="marketing-journey-arrows" aria-label="Previous and next chapter">
        {neighbors.previous ? <a href={`#${neighbors.previous.id}`} aria-label={`Previous chapter: ${neighbors.previous.label}`}><ArrowUp size={17} aria-hidden="true" /></a> : <span className="is-unavailable" aria-hidden="true"><ArrowUp size={17} /></span>}
        {neighbors.next ? <a href={`#${neighbors.next.id}`} aria-label={`Next chapter: ${neighbors.next.label}`}><ArrowDown size={17} aria-hidden="true" /></a> : <span className="is-unavailable" aria-hidden="true"><ArrowDown size={17} /></span>}
      </div>
      <button type="button" className="marketing-motion-toggle" aria-pressed={stopped} disabled={reduced} aria-label={reduced ? "Reduced motion is enabled in your device settings" : paused ? "Resume animations" : "Pause animations"} onClick={() => saveManualPause(!paused)}>
        {stopped ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}<span>{reduced ? "Reduced motion" : paused ? "Resume" : "Pause"}</span>
      </button>
    </div>
  </div>;
}
