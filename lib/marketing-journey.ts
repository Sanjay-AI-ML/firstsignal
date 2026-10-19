/** Shared, static chapters; ordinary fragment links are the navigation contract. */
export const marketingChapters = [
  { id: "start", label: "Introduction" },
  { id: "why-firstsignal", label: "Difference" },
  { id: "how-it-works", label: "Inside" },
  { id: "founders", label: "Founders" },
  { id: "investors", label: "Investors" },
  { id: "learning", label: "Learning" },
  { id: "templates", label: "Templates" },
  { id: "questions", label: "Questions" },
  { id: "your-next-step", label: "Next step" },
] as const;

export type MarketingChapter = (typeof marketingChapters)[number];

/** Positions are measured on layout changes, not once per scroll frame. */
export function currentChapterIndex(positions: readonly (number | null)[], scrollPosition: number, activationLine: number) {
  let index = 0;
  let latest = -Infinity;
  positions.forEach((position, candidate) => {
    if (position !== null && Number.isFinite(position) && position <= scrollPosition + activationLine && position > latest) {
      latest = position;
      index = candidate;
    }
  });
  return index;
}

export function chapterNeighbors(index: number) {
  const current = Math.max(0, Math.min(marketingChapters.length - 1, Math.trunc(Number.isFinite(index) ? index : 0)));
  return {
    previous: current > 0 ? marketingChapters[current - 1] : null,
    next: current < marketingChapters.length - 1 ? marketingChapters[current + 1] : null,
  };
}

/** Only same-document anchors should move focus; auth and app links stay normal. */
export function sameDocumentTarget(href: string, currentHref: string) {
  try {
    const current = new URL(currentHref);
    const destination = new URL(href, current);
    if (destination.origin !== current.origin || destination.pathname !== current.pathname || destination.search !== current.search || !destination.hash || destination.hash === "#") return null;
    const id = decodeURIComponent(destination.hash.slice(1));
    return id || null;
  } catch { return null; }
}
