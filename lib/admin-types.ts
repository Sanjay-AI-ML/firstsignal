export const adminPageSize = 25;
export const reportStatuses = ['submitted', 'reviewing', 'resolved', 'dismissed'] as const;
export type ReportStatus = typeof reportStatuses[number];
export type AdminPage<T> = { items: T[]; page: number; pageSize: number; total: number; pages: number };
export type AdminProfile = {
  id: string; kind: 'startup' | 'investor'; name: string; founder: string; city: string;
  sector: string; stage: string; tagline: string; updated: string;
  ownerListed: boolean; hidden: boolean; moderationReason: string; moderationUpdated: string | null; version: number;
};
export const adminProfileKinds = ['all', 'startup', 'investor'] as const;
export const adminProfileVisibilities = ['all', 'visible', 'removed'] as const;
export type AdminProfileFilters = { kind: typeof adminProfileKinds[number]; visibility: typeof adminProfileVisibilities[number] };
export type AdminProfileDetail = AdminProfile & {
  ideology: string; proposedSolution: string; learning: string; nextExperiment: string;
  progress: { id: string; date: string; title: string; body: string; created: string }[];
  redacted: boolean;
};
export type AdminReport = {
  id: string; profileId: string; reason: string; details: string; status: ReportStatus;
  created: string; updated: string; version: number; operatorNote: string;
  target: Pick<AdminProfile, 'id' | 'name' | 'kind' | 'hidden'> | null;
};
export type AdminAudit = {
  id: string; actor: string; action: 'profile_hidden' | 'profile_restored' | 'report_reviewed';
  targetId: string; reason: string; previousState: string; nextState: string; created: string;
};
export type AdminOverview = {
  profiles: { total: number; public: number; private: number; hidden: number; founders: number; investors: number };
  introductions: Record<string, number>;
  reports: Record<ReportStatus, number> & { open: number; total: number };
  notifications: Record<string, number>;
  configuration: { adminConfigured: boolean; clerkMode: 'development' | 'production' | 'unconfigured'; emailActive: boolean; emailProviderConfigured: boolean; emailSenderConfigured: boolean; originConfigured: boolean };
};
export type AdminAction =
  | { action: 'moderateProfile'; profileId: string; hidden: boolean; reason: string; expectedVersion: number }
  | { action: 'reviewReport'; reportId: string; status: ReportStatus; operatorNote: string; expectedVersion: number };
