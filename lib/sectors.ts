/** Broad choices for new profiles; legacy labels keep their original meaning. */
export const sectors = [
  "Agriculture & Food", "AI & Data", "Beauty & Wellness", "Consumer Products",
  "Education", "Energy & Climate", "Finance & Insurance", "Healthcare & Life Sciences",
  "Manufacturing & Hardware", "Media & Entertainment", "Professional Services",
  "Property & Construction", "Retail & E-commerce", "Robotics & Deep Tech",
  "Science & Research", "Social Impact", "Software & SaaS", "Sports & Fitness",
  "Supply Chain & Logistics", "Transport & Mobility", "Travel & Hospitality", "Other",
];

export const legacySectors = ["Manufacturing SaaS", "Supply-chain SaaS", "Finance operations SaaS", "Agribusiness SaaS", "Logistics SaaS", "Research operations SaaS"];
export const isSectorChoice = (value: string) => sectors.includes(value) || legacySectors.includes(value);
export const cleanSectorName = (value: string) => value.trim().replace(/\s+/g, " ");
export const sectorKey = (value: string) => cleanSectorName(value).normalize("NFKC").toLocaleLowerCase("en-IN");

type SectorProfile = { sector: string; sectors?: string[]; customSector?: string };
export const sectorName = (profile: SectorProfile) => profile.sector === "Other" ? cleanSectorName(profile.customSector ?? "") || "Other" : profile.sector;
export function profileSectorNames(profile: SectorProfile) {
  const names = (profile.sectors?.length ? profile.sectors : [profile.sector])
    .map(value => value === "Other" ? cleanSectorName(profile.customSector ?? "") || "Other" : value).filter(Boolean);
  return [...new Map(names.map(value => [sectorKey(value), value])).values()];
}
export function matchesSector(profile: SectorProfile, choice: string) {
  if (choice === "Other") return profile.sector === "Other" || !!profile.sectors?.includes("Other");
  return profileSectorNames(profile).some(value => sectorKey(value) === sectorKey(choice));
}
export function sectorFilterOptions(profiles: SectorProfile[]) {
  const choices = new Map(sectors.filter(value => value !== "Other").map(value => [sectorKey(value), value]));
  for (const name of profiles.flatMap(profileSectorNames)) if (name !== "Other" && !choices.has(sectorKey(name))) choices.set(sectorKey(name), name);
  return [...choices.values(), "Other"];
}
