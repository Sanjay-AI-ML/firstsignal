"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export function RequiredMark() {
  return <span className="field-required"><span aria-hidden="true">*</span><span className="sr-only"> (required)</span></span>;
}

export function OptionalMark({ label }: { label: string }) {
  return <Popover><PopoverTrigger asChild><button type="button" className="field-optional" aria-label={`${label}: optional. More information`}><Info size={15} aria-hidden="true" /></button></PopoverTrigger><PopoverContent className="field-optional-note" sideOffset={6}><p>This field is optional. You can leave it blank and add it later.</p></PopoverContent></Popover>;
}
