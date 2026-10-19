"use client";
import { ArrowUpRight, Bookmark, Compass, Handshake, UserRound } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useRef, useState } from "react";
import { initials, type Profile } from "@/lib/data";
import { profileSectorNames } from "@/lib/sectors";
import type { WorkspaceView } from "@/lib/discovery-state";
import ProjectIcon from "./project-icon";

const destinations = [{view:"discover",label:"Discover profiles",icon:Compass},{view:"saved",label:"Saved profiles",icon:Bookmark},{view:"introductions",label:"Connections",icon:Handshake},{view:"profiles",label:"My profile",icon:UserRound}] as const;
export default function WorkspaceSearch({ profiles, open, onOpenChange, onNavigate, onProfile, onReturnFocus }: {
  profiles: Profile[]; open: boolean; onOpenChange: (value:boolean)=>void;
  onNavigate: (view:WorkspaceView)=>void; onProfile: (profile:Profile)=>void; onReturnFocus: ()=>void;
}) {
  const [query,setQuery]=useState("");
  const selecting=useRef(false);
  const normalized=query.trim().toLocaleLowerCase();
  const matches=[...new Map(profiles.map(profile=>[profile.id,profile])).values()].filter(profile=>[profile.name,profile.founder,profile.city,profile.tagline,...profileSectorNames(profile)].join(" ").toLocaleLowerCase().includes(normalized)).slice(0,20);
  const pages=destinations.map(item=>item.view==="profiles"&&profiles.some(profile=>profile.mine&&profile.kind==="startup")?{...item,label:"My ideas"}:item);
  const views=pages.filter(item=>item.label.toLocaleLowerCase().includes(normalized));
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="workspace-search-dialog" onCloseAutoFocus={event=>{event.preventDefault();if(!selecting.current)onReturnFocus()}}><DialogHeader className="sr-only"><DialogTitle>Search FindIn</DialogTitle><DialogDescription>Find a loaded profile or jump to a workspace page. Nothing is sent to another member.</DialogDescription></DialogHeader><Command shouldFilter={false}><CommandInput aria-label="Search profiles or pages" placeholder="Search profiles or jump to a page…" value={query} onValueChange={setQuery} maxLength={100}/><CommandList><CommandEmpty>No results. Try a name, city, or sector.</CommandEmpty>{views.length?<CommandGroup heading="Workspace">{views.map(item=><CommandItem key={item.view} value={`page-${item.view}`} onSelect={()=>{selecting.current=true;onOpenChange(false);onNavigate(item.view)}}><item.icon size={17}/><span>{item.label}</span><ArrowUpRight size={14}/></CommandItem>)}</CommandGroup>:null}{matches.length?<CommandGroup heading={query.trim()?"Profiles":"Profiles in this workspace"}>{matches.map(profile=><CommandItem key={profile.id} value={profile.id} onSelect={()=>{selecting.current=true;onOpenChange(false);onProfile(profile)}}>{profile.kind === "startup" ? <ProjectIcon project={profile} size="xs" /> : <span className="search-result-avatar" aria-hidden="true">{initials(profile.name)}</span>}<span className="search-result-copy"><strong>{profile.name}</strong><small>{profile.city} · {profile.kind==="startup"?"Founder":"Investor"} · {profile.demo?"Fictional sample":profile.mine&&!profile.listed?"Your private profile":"Member profile"}</small></span><ArrowUpRight size={14}/></CommandItem>)}</CommandGroup>:null}</CommandList><div className="workspace-search-help"><span><kbd>↑</kbd><kbd>↓</kbd> move <kbd>Enter</kbd> open</span><span>Up to 20 profiles shown</span></div></Command></DialogContent></Dialog>;
}
