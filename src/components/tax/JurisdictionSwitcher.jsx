import React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Globe, ChevronDown, Check } from "lucide-react";

// Guidance-only country switcher for the shared Business & Tax Centre.
// It changes reference content only. Organisation country, TaxProfile,
// Finance records, currency and Demo/Live mode remain authoritative and are
// never mutated by this control.
export default function JurisdictionSwitcher({ value, options, onSelect }) {
  const current = options.find((o) => o.code === value);

  const renderOption = (o) => (
    <DropdownMenuItem key={o.code} onClick={() => onSelect(o.code)}>
      <span className="flex items-center gap-2 flex-1">
        <span aria-hidden>{o.flag}</span>
        <span>{o.label}</span>
      </span>
      {o.code === value && <Check className="w-4 h-4 text-brand-teal" />}
    </DropdownMenuItem>
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground shrink-0">Country guidance</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-9 rounded-md border border-input bg-transparent px-3 text-sm hover:bg-accent"
          >
            <span aria-hidden>{current?.flag}</span>
            <span className="font-medium text-brand-navy">{current?.label}</span>
            <ChevronDown className="w-4 h-4 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          {options.map((o) => renderOption(o))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}