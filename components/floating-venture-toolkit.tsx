"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, Calculator, Coins, Flame, Scale, Sparkles, Target, Users, ClipboardList } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ventureTools } from "@/lib/venture-tools";
import "./floating-venture-toolkit.css";

const icons = { runway: Flame, pitch: ClipboardList, thesis: Target, valuation: Calculator, equity: Users, termsheet: Scale, syndicate: Coins };

export default function FloatingVentureToolkit() {
  const [open, setOpen] = useState(false);
  const destination = useRef<string | null>(null);
  return <aside className="floating-toolkit-wrapper" aria-label="Planning tools on this page"><Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><button type="button" className="toolkit-pill-btn"><span className="toolkit-sparkle-dot"><Sparkles size={16} aria-hidden="true" /></span><span className="toolkit-btn-text">Planning tools</span><span className="toolkit-count-badge">{ventureTools.length}</span></button></DialogTrigger>
    <DialogContent className="toolkit-expanded-panel" onCloseAutoFocus={event => { if (destination.current) { event.preventDefault(); document.getElementById(destination.current)?.focus({ preventScroll: true }); destination.current = null; } }}>
      <DialogHeader><span className="header-badge">TRY A SCENARIO</span><DialogTitle>Tools for the next conversation.</DialogTitle><DialogDescription>Open a planning tool on this page. Inputs stay in your browser; scenarios are not saved to your account.</DialogDescription></DialogHeader>
      <nav className="toolkit-items-list" aria-label="Choose a planning tool">{ventureTools.map(tool => { const Icon = icons[tool.id]; return <a key={tool.id} href={`#tool-${tool.id}`} className="toolkit-item-row" onClick={event => { if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return; destination.current = `tool-${tool.id}`; setOpen(false); }}><span className="tool-icon-box"><Icon size={18} aria-hidden="true" /></span><span className="tool-item-info"><strong>{tool.name}</strong><span>{tool.description}</span></span><ArrowUpRight size={16} aria-hidden="true" /></a>; })}</nav>
      <div className="toolkit-panel-footer"><span>Free to try · No account needed</span><a href="/app#discover" className="toolkit-open-app">Open workspace</a></div>
    </DialogContent>
  </Dialog></aside>;
}
