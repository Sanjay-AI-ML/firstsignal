export type FounderUpdateDraft = { period: string; burn: string; cash: string; mrr: string; growth: string; wins: string; headwinds: string; asks: string };

export function emptyFounderUpdate(date: Date): FounderUpdateDraft {
  return { period: date.toISOString().slice(0, 7), burn: "", cash: "", mrr: "", growth: "", wins: "", headwinds: "", asks: "" };
}

/** Local preparation only. Missing figures stay missing; nothing is invented. */
export function buildFounderUpdate(draft: FounderUpdateDraft, ideaName: string): { ok: true; title: string; body: string; markdown: string } | { ok: false; error: string } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(draft.period)) return { ok: false, error: "Choose a reporting month." };
  if (![draft.wins, draft.headwinds, draft.asks].some(text => text.trim().length >= 20)) return { ok: false, error: "Write at least 20 characters about a milestone, a challenge or where you need help." };
  if ([draft.wins, draft.headwinds, draft.asks].some(text => text.length > 500)) return { ok: false, error: "Keep each written section within 500 characters." };
  const values: Record<string, number | null> = {};
  for (const field of ["burn", "cash", "mrr", "growth"] as const) {
    const value = draft[field].trim();
    const number = value === "" ? null : Number(value);
    const min = field === "growth" ? -100 : 0;
    const max = field === "growth" ? 10000 : 1e12;
    if (number !== null && (!Number.isFinite(number) || number < min || number > max)) return { ok: false, error: field === "growth" ? "Enter a revenue change between -100% and 10,000%, or leave it blank." : "Enter a cash or revenue amount from 0 to 1 trillion INR, or leave it blank." };
    values[field] = number;
  }
  const amount = (value: number | null) => value === null ? "Not provided" : `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  const runway = values.burn !== null && values.burn > 0 && values.cash !== null ? `${(values.cash / values.burn).toFixed(1)} months (constant net burn assumption)` : "Not calculated";
  const title = `Monthly update: ${draft.period}`;
  const body = [
    `Monthly net burn: ${amount(values.burn)}`,
    `Cash available: ${amount(values.cash)}`,
    `Estimated runway: ${runway}`,
    `Monthly recurring revenue: ${amount(values.mrr)}`,
    `Monthly revenue change: ${values.growth === null ? "Not provided" : `${values.growth}%`}`,
    "", `What went well: ${draft.wins.trim() || "Not provided"}`,
    "", `Challenges: ${draft.headwinds.trim() || "Not provided"}`,
    "", `Where I need help: ${draft.asks.trim() || "Not provided"}`,
    "", "Founder-reported figures; not independently checked.",
  ].join("\n");
  if (body.length > 2000) return { ok: false, error: "Shorten your update to 2,000 characters before saving. No text has been removed." };
  return { ok: true, title, body, markdown: `# ${ideaName} — ${title}\n\n${body}\n\nPrepared in FindIn. Sharing or emailing requires a separate action.\n` };
}
