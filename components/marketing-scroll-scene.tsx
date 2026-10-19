"use client";

import { ArrowDown, ArrowRight, RotateCcw } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

/** A bounded scroll scene; the server-rendered children are the static fallback. */
export default function MarketingScrollScene({ children }: { children: ReactNode }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);

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
      const progress = Math.max(0, Math.min(1, (scrollY - start) / travel));
      if (progress === previous) return;
      previous = progress;
      // Finish opening early, leaving the final third of the scene for reading.
      const phase = Math.min(1, progress / .68);
      const unfolded = phase * phase * (3 - 2 * phase);
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
      enabled = desktop.matches && !reduced.matches && root.dataset.motion !== "paused" && !showAll && fits;
      scene.dataset.scene = enabled ? "active" : "static";
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
    desktop.addEventListener("change", scheduleMeasure);
    reduced.addEventListener("change", scheduleMeasure);
    addEventListener("resize", scheduleMeasure);
    measure();
    return () => {
      proximity.disconnect();
      dimensions.disconnect();
      preference.disconnect();
      desktop.removeEventListener("change", scheduleMeasure);
      reduced.removeEventListener("change", scheduleMeasure);
      removeEventListener("resize", scheduleMeasure);
      removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(layoutFrame);
      reset();
      delete scene.dataset.scene;
      ["--scene-top", "--scene-height", "--scene-travel"].forEach(property => scene.style.removeProperty(property));
    };
  }, [showAll]);

  return <div ref={sceneRef} className="marketing-specialty-scene" data-scene-expanded={showAll || undefined}>
    <div ref={pinRef} className="marketing-specialty-pin">
      {children}
      <div className="marketing-scene-caption">
        <span className="marketing-scene-follow"><ArrowDown size={15} aria-hidden="true" />Scroll to open the whole picture</span>
        <span className="marketing-scene-track" aria-hidden="true"><span /></span>
        <button type="button" aria-pressed={showAll} onClick={() => setShowAll(value => !value)}>
          {showAll ? "Enable scroll effect" : "Show all three"}
          {showAll ? <RotateCcw size={15} aria-hidden="true" /> : <ArrowRight size={15} aria-hidden="true" />}
        </button>
      </div>
    </div>
  </div>;
}
