import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Landmark, X } from "lucide-react";

// Compact date-range and account filter bar. These filters are applied
// server-side so the officer only analyses data within the selected scope.
export default function OfficerContextBar({ filters, setFilters, accounts }) {
  const update = (key, val) => setFilters((f) => ({ ...f, [key]: val || undefined }));
  const hasFilters = filters.date_from || filters.date_to || filters.account_id;

  return (
    <div className="bg-card rounded-xl border border-border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-brand-navy">
          <Calendar className="w-3.5 h-3.5 text-brand-teal" />
          <span>Context</span>
        </div>
        {hasFilters && (
          <button
            onClick={() => setFilters({})}
            className="text-xs text-muted-foreground hover:text-status-bad flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">From</Label>
          <Input
            type="date"
            value={filters.date_from || ""}
            onChange={(e) => update("date_from", e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">To</Label>
          <Input
            type="date"
            value={filters.date_to || ""}
            onChange={(e) => update("date_to", e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Landmark className="w-2.5 h-2.5" /> Account
          </Label>
          <Select
            value={filters.account_id || "all"}
            onValueChange={(v) => update("account_id", v === "all" ? null : v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}