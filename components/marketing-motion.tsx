"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";

const reducedQuery = "(prefers-reduced-motion: reduce)";
function subscribeToMotion(callback: () => void) {
  const preference = matchMedia(reducedQuery);
  preference.addEventListener("change", callback);
  return () => preference.removeEventListener("change", callback);
}
const getReducedMotion = () => matchMedia(reducedQuery).matches;
const getServerMotion = () => false;

export default function MarketingMotion() {
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(subscribeToMotion, getReducedMotion, getServerMotion);
  const revealed = useRef(new WeakSet<Element>());

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".marketing");
    if (!root) return;
    const stopped = paused || reduced;
    const nativeTimeline = CSS.supports("animation-timeline: scroll()");
    root.dataset.motion = stopped ? "paused" : "full";
    root.dataset.scrollTimeline = nativeTimeline ? "native" : "fallback";
    let frame = 0;
    let distance = 0;
    let navHeight = 0;
    let activeNavigation = -2;
    let entrances: IntersectionObserver | undefined;
    let sectionPositions: (number | null)[] = [];
    const nav = root.querySelector<HTMLElement>(".marketing-nav");
    const links = [...root.querySelectorAll<HTMLAnchorElement>('.marketing-nav nav a[href^="#"]')];
    const sections = links.map(link => document.getElementById(link.hash.slice(1)));
    const updateNavigation = () => {
      let nearest = -Infinity;
      let current = -1;
      sectionPositions.forEach((position, index) => {
        const top = position === null ? undefined : position - scrollY;
        if (top !== undefined && top <= navHeight + 75 && top > nearest) {
          nearest = top;
          current = index;
        }
      });
      if (current === activeNavigation) return;
      activeNavigation = current;
      links.forEach((link, index) => {
        if (index === current) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    };
    const updateProgress = () => {
      frame = 0;
      updateNavigation();
      if (!nativeTimeline && !stopped) {
        root.style.setProperty("--reading-progress", String(distance > 0 ? Math.min(1, Math.max(0, scrollY / distance)) : 0));
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(updateProgress); };
    const measure = () => {
      distance = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      navHeight = Math.ceil(nav?.getBoundingClientRect().height ?? 90);
      sectionPositions = sections.map(section => section ? section.getBoundingClientRect().top + scrollY : null);
      updateNavigation();
      schedule();
    };

    if (!stopped && "IntersectionObserver" in window) {
      entrances = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          if (!revealed.current.has(entry.target)) {
            entry.target.classList.add(entry.target.matches(".marketing-editorial-art") ? "illustration-reveal" : "scroll-reveal");
            revealed.current.add(entry.target);
          }
          entrances?.unobserve(entry.target);
        });
      }, { threshold: 0.12 });
      root.querySelectorAll(".marketing-reveal, .marketing-section-heading, .marketing-closing, .specialty-heading, .marketing-editorial-heading, .marketing-editorial-art").forEach(element => entrances!.observe(element));
    }
    // Cache fallback dimensions on layout changes, never read layout on every scroll.
    const layout = "ResizeObserver" in window ? new ResizeObserver(measure) : undefined;
    layout?.observe(root);
    if (nav) layout?.observe(nav);
    measure();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", measure);
    return () => {
      entrances?.disconnect();
      layout?.disconnect();
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", measure);
      links.forEach(link => link.removeAttribute("aria-current"));
      delete root.dataset.motion;
      delete root.dataset.scrollTimeline;
    };
  }, [paused, reduced]);

  return <div className="marketing-motion-settings">
    <div className="marketing-reading-progress" aria-hidden="true" />
    <button type="button" className="marketing-motion-toggle" aria-pressed={paused || reduced} disabled={reduced} onClick={() => setPaused(value => !value)}>
      {paused || reduced ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
      {reduced ? "Reduced motion is on" : paused ? "Resume animations" : "Pause animations"}
    </button>
  </div>;
}
