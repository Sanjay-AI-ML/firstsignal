import type { Intro, Profile } from "./data";
import { getProfileCompletion } from "./profile-completion";

export function outgoingRelationship(profileId: string, requests: Intro[], sourceProfileId?: string | null) {
  return requests.find(request => request.direction === "outgoing" && request.profileId === profileId && (sourceProfileId === undefined || (request.sourceProfileId ?? null) === sourceProfileId));
}

export function relationshipLabel(request?: Intro) {
  if (!request) return "Request introduction";
  if (request.blocked) return "Review connection";
  if (request.status === "accepted") return "Open connection";
  if (request.status === "draft") return "Read practice note";
  if (request.status === "pending") return "View pending request";
  return "View previous request";
}

export function workspaceActions(profiles: Profile[], requests: Intro[], today: string) {
  const own = profiles[0];
  const checklist = own ? getProfileCompletion(own) : null;
  return {
    profile: own,
    ideas: profiles.filter(profile => profile.kind === "startup").length,
    publicIdeas: profiles.filter(profile => profile.kind === "startup" && profile.listed && !profile.moderation?.hidden).length,
    missing: checklist?.missing.length ?? 0,
    requests: requests.filter(item => !item.blocked && item.status === "pending" && item.direction === "incoming").length,
    proposals: requests.filter(item => !item.blocked && item.status === "accepted" && item.proposal?.status === "open" && !item.proposal.mine).length,
    followUps: requests.filter(item => !item.blocked && item.status === "accepted" && !!item.nextStep?.date && item.nextStep.date <= today).length,
  };
}
