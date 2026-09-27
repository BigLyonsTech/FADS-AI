import React, { useState } from "react";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { ChevronDown, Check } from "lucide-react";

// Renders a Radix Select on desktop (md+) and a Vaul bottom drawer on mobile (<768px).
// `options` is an array of { value: string, label: string }.
const EMPTY_SENTINEL = "__all__";

export function ResponsiveSelect({ value, onValueChange, placeholder, options, triggerClassName, disabled }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label;

  // Radix Select forbids empty-string values on SelectItem. Map "" <-> sentinel.
  const desktopValue = value === "" ? EMPTY_SENTINEL : value;
  const handleDesktopChange = (v) => onValueChange(v === EMPTY_SENTINEL ? "" : v);

  return (
    <>
      {/* Desktop: Radix Select */}
      <div className="hidden md:block">
        <Select value={desktopValue || undefined} onValueChange={handleDesktopChange} disabled={disabled}>
          <SelectTrigger className={triggerClassName}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value || EMPTY_SENTINEL} value={opt.value === "" ? EMPTY_SENTINEL : opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile: button that opens Vaul bottom drawer */}
      <div className="md:hidden">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={`flex w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${triggerClassName || ""}`}
        >
          <span className={selectedLabel ? "text-foreground" : "text-muted-foreground"}>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </button>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader className="text-center">
              <DrawerTitle>{placeholder || "Select an option"}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 max-h-[60vh] overflow-y-auto space-y-1">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onValueChange(opt.value); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm min-h-touch ${
                    value === opt.value ? "bg-brand-mint text-brand-navy font-medium" : "hover:bg-muted"
                  }`}
                >
                  {opt.label}
                  {value === opt.value && <Check className="w-4 h-4 text-brand-teal" />}
                </button>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}