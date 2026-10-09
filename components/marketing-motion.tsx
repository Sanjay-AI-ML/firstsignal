"use client";
import { useEffect } from "react";

export default function MarketingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".marketing");
    if (!root) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    let frame = 0;
    const specialties = root.querySelector<HTMLElement>(".marketing-specialties");
    const navLinks = [...root.querySelectorAll<HTMLAnchorElement>('.marketing-nav nav a[href^="#"]')];
    const sections = navLinks.map(link => document.getElementById(link.hash.slice(1)));
    const update = () => {
      frame = 0;
      const distance = document.documentElement.scrollHeight - innerHeight;
      root.style.setProperty("--reading-progress", String(distance > 0 ? Math.min(1, Math.max(0, scrollY / distance)) : 0));
      let current = -1;
      sections.forEach((section, index) => { if (section && section.getBoundingClientRect().top <= 180) current = index; });
      navLinks.forEach((link, index) => { if (index === current) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current"); });
      if (specialties && !preference.matches && innerWidth > 1000) {
        const bounds = specialties.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, (innerHeight - bounds.top) / (innerHeight + bounds.height)));
        root.style.setProperty("--specialty-left-angle", `${-4 + progress * 6}deg`);
        root.style.setProperty("--specialty-middle-angle", `${1.5 - progress * 3}deg`);
        root.style.setProperty("--specialty-right-angle", `${4 - progress * 6}deg`);
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const configure = () => {
      schedule();
      observer?.disconnect();
      root.querySelectorAll(".scroll-reveal").forEach(el => el.classList.remove("scroll-reveal"));
      if (preference.matches || !('IntersectionObserver' in window)) return;
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { entry.target.classList.add("scroll-reveal"); observer?.unobserve(entry.target); }
        });
      }, { threshold: 0.12 });
      root.querySelectorAll(".marketing-reveal, .marketing-section-heading, .marketing-closing, .specialty-heading").forEach(el => observer!.observe(el));
    };
    configure();
    update();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    preference.addEventListener("change", configure);
    return () => { observer?.disconnect(); cancelAnimationFrame(frame); removeEventListener("scroll", schedule); removeEventListener("resize", schedule); preference.removeEventListener("change", configure); };
  }, []);
  return <div className="marketing-reading-progress" aria-hidden="true"/>;
}
