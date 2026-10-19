"use client";
import { ArrowUpRight, Bookmark, CalendarClock, UserRound, Handshake } from "lucide-react";
import type { Profile, Intro } from "@/lib/data";
import { workspaceActions } from "@/lib/workspace-actions";

export default function WorkspaceOverview({ name, profiles, requests, savedCount, today, onProfile, onConnections, onSaved }: {
  name: string; profiles: Profile[]; requests: Intro[]; savedCount: number; today: string;
  onProfile: () => void; onConnections: () => void; onSaved: () => void;
}) {
  const actions = workspaceActions(profiles, requests, today);
  return <section className="workspace-overview" aria-label="Your next steps">
    <div className="workspace-overview-intro"><span className="eyebrow">YOUR WORKSPACE</span><h2>Hi, {name.trim().split(/\s+/)[0] || "welcome"}.</h2><span className="overview-status"><span className={`status-dot ${actions.ideas ? actions.publicIdeas ? "public" : "" : actions.profile?.listed && !actions.profile.moderation?.hidden ? "public" : ""}`}/>{actions.ideas ? `${actions.ideas} ${actions.ideas === 1 ? "idea" : "ideas"} · ${actions.publicIdeas} public` : actions.profile ? actions.profile.moderation?.hidden ? "Listing hidden" : actions.profile.listed ? "Public profile" : "Private profile" : "No profile yet"}</span></div>
    <div className="workspace-action-list">
      <button onClick={onProfile}><span className="overview-action-icon"><UserRound size={17} /></span><span><strong>{actions.ideas ? "Manage my ideas" : !actions.profile ? "Create your profile" : "Review profile"}</strong><small>{actions.ideas ? "Separate details & progress" : !actions.profile ? "Founder or investor" : actions.missing ? `${actions.missing} details to consider` : "Details filled in"}</small></span><ArrowUpRight size={14} /></button>
      <button onClick={onConnections}><span className="overview-action-icon"><Handshake size={17} /></span><span><strong>{actions.requests + actions.proposals ? `${actions.requests + actions.proposals} to review` : "Connections"}</strong><small>{actions.requests + actions.proposals ? `${actions.requests} ${actions.requests===1?"request":"requests"} · ${actions.proposals} ${actions.proposals===1?"proposal":"proposals"}` : "Requests & messages"}</small></span><ArrowUpRight size={14} /></button>
      <button onClick={actions.followUps ? onConnections : onSaved}><span className="overview-action-icon">{actions.followUps ? <CalendarClock size={17} /> : <Bookmark size={17} />}</span><span><strong>{actions.followUps ? `${actions.followUps} ${actions.followUps===1?"follow-up":"follow-ups"} due` : `${savedCount} saved ${savedCount === 1 ? "profile" : "profiles"}`}</strong><small>{actions.followUps ? "Your private next steps" : "Return & compare"}</small></span><ArrowUpRight size={14} /></button>
    </div>
  </section>;
}
