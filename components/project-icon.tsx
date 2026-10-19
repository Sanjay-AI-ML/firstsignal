import {
  Atom, Blocks, Bot, BriefcaseBusiness, Building2, CalendarHeart, CircuitBoard,
  Dumbbell, Factory, Files, FlaskConical, GraduationCap, HandHeart, HeartPulse,
  Hotel, Leaf, Lightbulb, Palette, Route, ShoppingBag, Sprout, Truck, Utensils,
  WalletCards, Warehouse, Workflow, Zap, type LucideIcon,
} from "lucide-react";
import "./project-icon.css";

/** Only public project fields are needed; no uploaded logo or account information. */
export type ProjectIconSource = {
  id?: string;
  name?: string;
  sector?: string;
  customSector?: string;
  tagline?: string;
  solution?: string;
};

type Identity = { key: string; icon: LucideIcon; tone: "violet" | "green" | "blue" | "amber" | "rose"; label: string };

const identities = {
  handover: { key: "handover", icon: Workflow, tone: "violet", label: "Team handovers" },
  inventory: { key: "inventory", icon: Warehouse, tone: "green", label: "Inventory and supply chains" },
  documents: { key: "documents", icon: Files, tone: "amber", label: "Document workflows" },
  agriculture: { key: "agriculture", icon: Sprout, tone: "green", label: "Agriculture and food" },
  logistics: { key: "logistics", icon: Route, tone: "blue", label: "Logistics and delivery" },
  research: { key: "research", icon: FlaskConical, tone: "violet", label: "Science and research" },
  ai: { key: "ai", icon: CircuitBoard, tone: "violet", label: "AI and data" },
  wellness: { key: "wellness", icon: CalendarHeart, tone: "rose", label: "Beauty and wellness" },
  consumer: { key: "consumer", icon: ShoppingBag, tone: "amber", label: "Consumer products" },
  education: { key: "education", icon: GraduationCap, tone: "blue", label: "Education" },
  climate: { key: "climate", icon: Leaf, tone: "green", label: "Energy and climate" },
  energy: { key: "energy", icon: Zap, tone: "amber", label: "Energy" },
  finance: { key: "finance", icon: WalletCards, tone: "amber", label: "Finance and insurance" },
  healthcare: { key: "healthcare", icon: HeartPulse, tone: "rose", label: "Healthcare and life sciences" },
  manufacturing: { key: "manufacturing", icon: Factory, tone: "violet", label: "Manufacturing" },
  hardware: { key: "hardware", icon: CircuitBoard, tone: "blue", label: "Hardware" },
  media: { key: "media", icon: Palette, tone: "rose", label: "Media and entertainment" },
  services: { key: "services", icon: BriefcaseBusiness, tone: "blue", label: "Professional services" },
  property: { key: "property", icon: Building2, tone: "amber", label: "Property and construction" },
  robotics: { key: "robotics", icon: Bot, tone: "blue", label: "Robotics" },
  deeptech: { key: "deeptech", icon: Atom, tone: "violet", label: "Deep technology" },
  impact: { key: "impact", icon: HandHeart, tone: "green", label: "Social impact" },
  software: { key: "software", icon: Blocks, tone: "violet", label: "Software and services" },
  sport: { key: "sport", icon: Dumbbell, tone: "green", label: "Sports and fitness" },
  transport: { key: "transport", icon: Truck, tone: "blue", label: "Transport and mobility" },
  hospitality: { key: "hospitality", icon: Hotel, tone: "amber", label: "Travel and hospitality" },
  food: { key: "food", icon: Utensils, tone: "green", label: "Food and dining" },
  idea: { key: "idea", icon: Lightbulb, tone: "violet", label: "New idea" },
} satisfies Record<string, Identity>;

// The existing fictional examples have a concrete purpose beyond their sector.
const samples: Record<string, keyof typeof identities> = {
  tracegrid: "handover", stockloom: "inventory", ledgerleaf: "documents",
  fieldnote: "agriculture", dispatchlane: "logistics", benchpath: "research",
};

const categoryRules: [RegExp, keyof typeof identities][] = [
  [/agri|agribusiness|agriculture/, "agriculture"], [/food|dining|restaurant/, "food"],
  [/ai\b|artificial intelligence|machine learning|data/, "ai"],
  [/beauty|wellness/, "wellness"], [/consumer/, "consumer"],
  [/education|learning|edtech/, "education"], [/climate|sustainab|environment/, "climate"],
  [/energy|solar|electric/, "energy"], [/finance|insurance|accounting|fintech/, "finance"],
  [/health|medical|life sciences|biotech/, "healthcare"], [/manufactur/, "manufacturing"],
  [/hardware|semiconductor/, "hardware"], [/media|entertainment|music|creative/, "media"],
  [/professional|consult|service/, "services"], [/property|construction|real estate/, "property"],
  [/retail|commerce|marketplace/, "consumer"], [/robot/, "robotics"], [/deep tech|deeptech/, "deeptech"],
  [/science|research|laborator/, "research"], [/social impact|community|nonprofit/, "impact"],
  [/software|saas|app development/, "software"], [/sport|fitness/, "sport"],
  [/supply.chain|inventory|warehouse/, "inventory"], [/logistic|delivery|dispatch/, "logistics"],
  [/transport|mobility|vehicle/, "transport"], [/travel|hospitality|tourism|hotel/, "hospitality"],
];

/** Stable, meaningful fallback for every broad, legacy and custom sector. */
export function projectIdentity(project: ProjectIconSource): Identity {
  const sample = samples[project.id ?? ""];
  if (sample) return identities[sample];
  const category = (project.sector === "Other" ? project.customSector : project.sector)?.trim().toLowerCase() ?? "";
  const categoryMatch = categoryRules.find(([pattern]) => pattern.test(category));
  if (categoryMatch) return identities[categoryMatch[1]];
  const purpose = `${project.name ?? ""} ${project.tagline ?? ""} ${project.solution ?? ""}`.toLowerCase();
  const purposeMatch = categoryRules.find(([pattern]) => pattern.test(purpose));
  return identities[purposeMatch?.[1] ?? "idea"];
}

export default function ProjectIcon({ project, size = "md", className = "" }: {
  project: ProjectIconSource;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const { icon: Icon, tone, key } = projectIdentity(project);
  // A project name accompanies the mark. The mark is decoration, not verification.
  return <span className={`project-icon ${className}`.trim()} data-size={size} data-tone={tone} data-identity={key} aria-hidden="true"><Icon strokeWidth={1.75} focusable="false" /></span>;
}
