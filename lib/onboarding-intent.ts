import type { ProfileKind } from "./data";

export type StarterId = "founder-brief" | "progress-update" | "investor-preferences";
export type SetupIntent = { role: "founder" | "investor"; kind: ProfileKind; template?: StarterId };

export function readSetupIntent(search: string): SetupIntent | null {
  const params = new URLSearchParams(search);
  const roles = params.getAll("setup");
  if (roles.length !== 1 || !["founder", "investor"].includes(roles[0])) return null;
  const role = roles[0] as SetupIntent["role"];
  const templates = params.getAll("template");
  const allowed = role === "founder" ? ["founder-brief", "progress-update"] : ["investor-preferences"];
  const template = templates.length === 1 && allowed.includes(templates[0]) ? templates[0] as StarterId : undefined;
  return { role, kind: role === "founder" ? "startup" : "investor", template };
}

export function setupDestination(role: SetupIntent["role"], template?: StarterId) {
  const params = new URLSearchParams({ setup: role });
  if (template) params.set("template", template);
  return `/app?${params.toString()}#profiles`;
}

export function setupSignIn(role: SetupIntent["role"], template?: StarterId) {
  return `/signin?return_to=${encodeURIComponent(setupDestination(role, template))}`;
}

export function consumeSetupUrl(url: string) {
  const parsed = new URL(url, "https://app.local");
  parsed.searchParams.delete("setup");
  parsed.searchParams.delete("template");
  return `${parsed.pathname}${parsed.search}#profiles`;
}
