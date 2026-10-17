"use client";
import { ArrowUpRight, Bookmark, CalendarClock, Check, Handshake, Sparkles } from "lucide-react";
import type { Profile, Intro } from "@/lib/data";
import { workspaceActions } from "@/lib/workspace-actions";

export default function WorkspaceOverview({ name, profiles, requests, savedCount, today, onProfile, onConnections, onSaved }: {
  name: string; profiles: Profile[]; requests: Intro[]; savedCount: number; today: string;
  onProfile: () => void; onConnections: () => void; onSaved: () => void;
}) {
  const actions = workspaceActions(profiles, requests, today);
  return <section className="workspace-overview" aria-label="Your next steps">
    <div className="workspace-overview-intro"><span className="eyebrow">YOUR NEXT MOVE</span><h2>A little clarity, {name.trim().split(/\s+/)[0] || "welcome"}.</h2><p>{actions.profile?.kind === "startup" ? "Find investors whose stated interests fit your next step." : actions.profile?.kind === "investor" ? "Explore early ideas. Keep the conversations that matter moving." : "Start with one clear profile, then find people worth meeting."}</p><span className="overview-status">{actions.profile ? <><span className={`status-dot ${actions.profile.listed ? "public" : ""}`} />{actions.profile.listed ? "Your profile is public" : "Your profile is private"}</> : <><Sparkles size={13} />Your workspace is ready</>}</span></div>
    <div className="workspace-action-list">
      <button onClick={onProfile}><span className="overview-action-icon"><Check size={17} /></span><span><strong>{!actions.profile ? "Introduce yourself" : actions.missing ? `${actions.missing} profile details to consider` : "Your profile details are filled in"}</strong><small>{!actions.profile ? "Choose founder or investor. Start privately." : "Review your writing and sharing choice."}</small></span><ArrowUpRight size={16} /></button>
      <button onClick={onConnections}><span className="overview-action-icon"><Handshake size={17} /></span><span><strong>{actions.requests + actions.proposals ? `${actions.requests} ${actions.requests===1?"request":"requests"} · ${actions.proposals} ${actions.proposals===1?"proposal":"proposals"} to review` : "Keep your conversations together"}</strong><small>{actions.requests + actions.proposals ? "Review before you accept or reply." : "Requests, messages and private proposals."}</small></span><ArrowUpRight size={16} /></button>
      <button onClick={actions.followUps ? onConnections : onSaved}><span className="overview-action-icon">{actions.followUps ? <CalendarClock size={17} /> : <Bookmark size={17} />}</span><span><strong>{actions.followUps ? `${actions.followUps} ${actions.followUps===1?"follow-up":"follow-ups"} due` : `${savedCount} saved ${savedCount === 1 ? "profile" : "profiles"}`}</strong><small>{actions.followUps ? "Your private dates, due today or earlier." : "Return, compare, and decide what to ask."}</small></span><ArrowUpRight size={16} /></button>
    </div>
  </section>;
}
