"use client";

import { ArrowDown, ArrowRight, RotateCcw } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { readerAnchorDelta, resumedSceneDelta, sceneUnfolding } from "@/lib/scroll-scene";

/** A bounded scroll scene; the server-rendered children are the static fallback. */
export default function MarketingScrollScene({ children }: { children: ReactNode }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);
  const expanded = useRef(false);
  const beforeToggle = useRef<(() => void) | null>(null);
  const afterToggle = useRef<(() => void) | null>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const pin = pinRef.current;
    const root = scene?.closest<HTMLElement>(".marketing");
    if (!scene || !pin || !root || !("ResizeObserver" in window) || !("IntersectionObserver" in window)) return;
    const cards = [...pin.querySelectorAll<HTMLElement>(".specialty-card")];
    if (cards.length !== 3) return;
    const navigation = root.querySelector<HTMLElement>(".marketing-nav");
    const desktop = matchMedia("(min-width: 1101px) and (min-height: 680px)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let layoutFrame = 0;
    let enabled = false;
    let near = false;
    let listening = false;
    let start = 0;
    let travel = 1;
    let stride = 0;
    let previous = -1;
    let inputRevision = 0;
    type ReaderAnchor = {
      element: HTMLElement; top: number; revision: number; url: string;
      sceneTop: number; height: number; scroll: number; wasEnabled: boolean;
    };
    let reader: ReaderAnchor | null = null;

    const interrupts = () => { inputRevision++; reader = null; };
    const canAnchor = (element: HTMLElement) => {
      if (!element.isConnected || element.closest(".marketing-nav,.marketing-motion-dock,.marketing-journey-menu")) return false;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height || rect.bottom <= (navigation?.getBoundingClientRect().bottom ?? 0) || rect.top >= innerHeight - 20) return false;
      // A fixed control does not move with the document and cannot anchor it.
      for (let node: HTMLElement | null = element; node && node !== root; node = node.parentElement) {
        if (getComputedStyle(node).position === "fixed") return false;
      }
      return true;
    };
    const captureReader = () => {
      const readable = "h1,h2,h3,h4,p,li,dt,dd,summary,a,button";
      const top = Math.max(0, navigation?.getBoundingClientRect().bottom ?? 0);
      let element: HTMLElement | undefined;
      // Prefer content actually under a reading point, rather than an element
      // chosen by document order that is covered by a rotated card or a dock.
      for (const y of [top + 70, innerHeight * .45, innerHeight * .7]) {
        if (y >= innerHeight - 20) continue;
        for (const x of [innerWidth * .5, innerWidth * .25, innerWidth * .75]) {
          const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>(readable);
          if (hit && root.contains(hit) && canAnchor(hit)) { element = hit; break; }
        }
        if (element) break;
      }
      if (!element) element = [...root.querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,summary")].find(canAnchor);
      if (!element) { reader = null; return; }
      const bounds = scene.getBoundingClientRect();
      reader = { element, top: element.getBoundingClientRect().top, revision: inputRevision, url: location.href,
        sceneTop: bounds.top, height: bounds.height, scroll: scrollY, wasEnabled: enabled };
    };
    const restoreReader = (stickyTop: number) => {
      const anchor = reader;
      reader = null;
      if (!anchor || anchor.revision !== inputRevision || anchor.url !== location.href || !anchor.element.isConnected) return;
      const maximumScroll = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
      const resume = resumedSceneDelta({ wasEnabled: anchor.wasEnabled, enabled, beforeTop: anchor.sceneTop, stickyTop,
        beforeHeight: anchor.height, afterHeight: scene.getBoundingClientRect().height,
        beforeScroll: anchor.scroll, scroll: scrollY, maximumScroll: maximumScroll() });
      if (Math.abs(resume) > .5) {
        scrollBy({ top: resume, behavior: "instant" });
        render();
      }
      const delta = readerAnchorDelta(anchor.top, anchor.element.getBoundingClientRect().top, scrollY, maximumScroll());
      if (Math.abs(delta) > .5) {
        scrollBy({ top: delta, behavior: "instant" });
        render();
      }
    };

    const reset = () => {
      previous = -1;
      scene.style.removeProperty("--scene-progress");
      cards.forEach(card => {
        ["--fan-x", "--fan-y", "--fan-angle", "--fan-scale"].forEach(property => card.style.removeProperty(property));
      });
    };
    const render = () => {
      frame = 0;
      if (!enabled) return;
      const { progress, unfolded } = sceneUnfolding(scrollY, start, travel);
      if (progress === previous) return;
      previous = progress;
      const remaining = 1 - unfolded;
      scene.style.setProperty("--scene-progress", String(unfolded));
      cards.forEach((card, index) => {
        const direction = 1 - index;
        card.style.setProperty("--fan-x", `${direction * stride * .72 * remaining}px`);
        card.style.setProperty("--fan-y", `${(index === 1 ? 14 : 0) * remaining}px`);
        card.style.setProperty("--fan-angle", `${-direction * 11 * remaining}deg`);
        card.style.setProperty("--fan-scale", String(1 - .035 * remaining));
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };
    const synchronizeListener = () => {
      const next = enabled && near;
      if (next === listening) return;
      listening = next;
      if (listening) addEventListener("scroll", schedule, { passive: true });
      else removeEventListener("scroll", schedule);
    };
    const measure = () => {
      layoutFrame = 0;
      const top = (navigation?.offsetHeight ?? 84) + 8;
      const height = pin.offsetHeight;
      const fits = height <= innerHeight - top - 16;
      enabled = desktop.matches && !reduced.matches && root.dataset.motion !== "paused" && !expanded.current && fits;
      scene.dataset.scene = enabled ? "active" : "static";
      scene.dataset.readerActive = String(enabled);
      scene.dataset.readerTop = String(top);
      scene.style.setProperty("--scene-top", `${top}px`);
      scene.style.setProperty("--scene-height", `${height}px`);
      travel = Math.min(innerHeight * .95, 900);
      scene.style.setProperty("--scene-travel", `${travel}px`);
      start = scene.getBoundingClientRect().top + scrollY - top;
      stride = cards[1].offsetLeft - cards[0].offsetLeft;
      previous = -1;
      if (enabled) render();
      else reset();
      synchronizeListener();
      // A reader snapshot exists only after an explicit preference/control
      // change. Ordinary scrolling, observer work and navigation never scroll.
      restoreReader(top);
    };
    const scheduleMeasure = () => { if (!layoutFrame) layoutFrame = requestAnimationFrame(measure); };
    const proximity = new IntersectionObserver(entries => {
      near = entries[0].isIntersecting;
      synchronizeListener();
      if (near) schedule();
    }, { rootMargin: "250px 0px" });
    const dimensions = new ResizeObserver(scheduleMeasure);
    const preference = new MutationObserver(scheduleMeasure);
    proximity.observe(scene);
    dimensions.observe(pin);
    dimensions.observe(root);
    if (navigation) dimensions.observe(navigation);
    preference.observe(root, { attributes: true, attributeFilter: ["data-motion"] });
    root.addEventListener("findin-reader-positioned", render);
    // These listeners only cancel a pending correction; native input is never
    // prevented, delayed, redirected or used to drive page scrolling.
    addEventListener("wheel", interrupts, { passive: true });
    addEventListener("touchmove", interrupts, { passive: true });
    addEventListener("pointerdown", interrupts, { passive: true });
    addEventListener("keydown", interrupts);
    addEventListener("hashchange", interrupts);
    addEventListener("popstate", interrupts);
    desktop.addEventListener("change", scheduleMeasure);
    addEventListener("resize", scheduleMeasure);
    beforeToggle.current = captureReader;
    afterToggle.current = scheduleMeasure;
    measure();
    return () => {
      proximity.disconnect();
      dimensions.disconnect();
      preference.disconnect();
      root.removeEventListener("findin-reader-positioned", render);
      removeEventListener("wheel", interrupts);
      removeEventListener("touchmove", interrupts);
      removeEventListener("pointerdown", interrupts);
      removeEventListener("keydown", interrupts);
      removeEventListener("hashchange", interrupts);
      removeEventListener("popstate", interrupts);
      desktop.removeEventListener("change", scheduleMeasure);
      removeEventListener("resize", scheduleMeasure);
      removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(layoutFrame);
      beforeToggle.current = null;
      afterToggle.current = null;
      reader = null;
      reset();
      delete scene.dataset.scene;
      delete scene.dataset.readerActive;
      delete scene.dataset.readerTop;
      ["--scene-top", "--scene-height", "--scene-travel"].forEach(property => scene.style.removeProperty(property));
    };
  }, []);

  return <div ref={sceneRef} className="marketing-specialty-scene" data-scene-expanded={showAll || undefined} data-reader-scene="specialties">
    <div ref={pinRef} className="marketing-specialty-pin">
      {children}
      <div className="marketing-scene-caption">
        <span className="marketing-scene-follow"><ArrowDown size={15} aria-hidden="true" />Scroll to open the whole picture</span>
        <span className="marketing-scene-track" aria-hidden="true"><span /></span>
        <button type="button" aria-pressed={showAll} onClick={() => {
          beforeToggle.current?.();
          expanded.current = !expanded.current;
          setShowAll(expanded.current);
          afterToggle.current?.();
        }}>
          {showAll ? "Enable scroll effect" : "Show all three"}
          {showAll ? <RotateCcw size={15} aria-hidden="true" /> : <ArrowRight size={15} aria-hidden="true" />}
        </button>
      </div>
    </div>
  </div>;
}
