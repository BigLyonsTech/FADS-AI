import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { BILLING_CURRENCIES } from "@/lib/subscriptionPricing";
import { cn } from "@/lib/utils";

// Mobile-friendly billing currency selector for the subscription page.
// Shows NGN, EUR, GBP and USD with "Coming soon" badges for inactive currencies.
// Remembers the user's selection in localStorage and allows manual override
// of the suggested currency — never forces a choice.
export default function CurrencySelector({ value, onChange, regionalPricing }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = BILLING_CURRENCIES.find((c) => c.code === value) || BILLING_CURRENCIES[0];

  const getStatus = (code) => {
    const entry = regionalPricing?.[code];
    if (!entry) return "coming_soon";
    return entry.status || "coming_soon";
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium text-brand-navy hover:bg-accent transition-colors min-h-touch"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="text-lg leading-none">{selected.symbol}</span>
          <span>{selected.code}</span>
          <span className="text-muted-foreground font-normal hidden sm:inline">— {selected.label}</span>
        </span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full sm:w-72 rounded-xl border border-border bg-popover shadow-lg overflow-hidden"
          role="listbox"
        >
          {BILLING_CURRENCIES.map((c) => {
            const status = getStatus(c.code);
            const isActive = status === "active";
            const isSelected = c.code === value;
            return (
              <button
                key={c.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(c.code);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-sm hover:bg-accent transition-colors border-b border-border last:border-b-0",
                  isSelected && "bg-brand-teal/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg leading-none w-6 text-center">{c.symbol}</span>
                  <div>
                    <p className="font-medium text-brand-navy">{c.code} — {c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.region_label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isActive ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-status-ok/15 text-status-ok font-medium whitespace-nowrap">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                      Coming soon
                    </span>
                  )}
                  {isSelected && <Check className="w-4 h-4 text-brand-teal" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}