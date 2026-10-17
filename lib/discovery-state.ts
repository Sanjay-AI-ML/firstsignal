import type { Profile, ProfileKind } from "./data";

export type WorkspaceView = "discover" | "saved" | "introductions" | "profiles";
export type DiscoveryState = { kind: ProfileKind; search: string; sector: string; stage: string; sort: string; membersOnly: boolean };
export const defaultDiscovery: DiscoveryState = { kind: "startup", search: "", sector: "all", stage: "all", sort: "curated", membersOnly: false };
const views: WorkspaceView[] = ["discover", "saved", "introductions", "profiles"];

/** Only public discovery criteria go in URLs; never notes, consent or private drafts. */
export function readWorkspaceUrl(href: string) {
  const url = new URL(href, "https://findin.invalid");
  const query = url.searchParams;
  const hash = url.hash.slice(1) as WorkspaceView;
  return {
    view: views.includes(hash) ? hash : "discover" as WorkspaceView,
    explicitKind: query.get("kind") === "startup" || query.get("kind") === "investor",
    filters: {
      kind: query.get("kind") === "investor" ? "investor" : "startup",
      search: (query.get("q") ?? "").slice(0, 100),
      sector: (query.get("sector") ?? "all").slice(0, 100) || "all",
      stage: (query.get("stage") ?? "all").slice(0, 80) || "all",
      sort: ["curated", "name", "budget"].includes(query.get("sort") ?? "") ? query.get("sort")! : "curated",
      membersOnly: query.get("members") === "1",
    } as DiscoveryState,
    profileId: (query.get("profile") ?? "").slice(0, 200),
  };
}

export function workspaceUrl(href: string, view: WorkspaceView, filters: DiscoveryState, profileId?: string | null) {
  const url = new URL(href, "https://findin.invalid");
  const values = { kind: filters.kind, q: filters.search, sector: filters.sector === "all" ? "" : filters.sector,
    stage: filters.stage === "all" ? "" : filters.stage, sort: filters.sort === "curated" ? "" : filters.sort,
    members: filters.membersOnly ? "1" : "", profile: profileId ?? "" };
  for (const [key, value] of Object.entries(values)) value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
  url.hash = view;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function shareDiscoveryUrl(origin: string, view: WorkspaceView, filters: DiscoveryState) {
  return new URL(workspaceUrl("/app", view, filters), new URL(origin).origin).href;
}

export function sortDiscoveryProfiles(profiles: Profile[], sort: string) {
  const amount = (profile: Profile) => {
    const value = profile.kind === "investor" && profile.checkRangeINR?.length === 2 ? profile.checkRangeINR[0] : profile.fundingIntentINR;
    return Number.isFinite(value) && value > 0 ? value : Infinity;
  };
  const updated = (profile: Profile) => { const time = Date.parse(profile.updated ?? ""); return Number.isFinite(time) ? time : 0; };
  return [...profiles].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "budget" ? (amount(a) === amount(b) ? 0 : amount(a) - amount(b)) : Number(a.demo) - Number(b.demo) || updated(b) - updated(a));
}
