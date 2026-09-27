import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X, RotateCcw } from "lucide-react";

// Mobile-first filter bar for the Reports Centre. All filters are optional.
// Date range, account, category, contact, currency and status are applied
// server-side so figures always match the filtered source transactions.
export default function ReportFilters({
  filters,
  setFilters,
  lookups,
  orgCurrency,
  onReset,
}) {
  const update = (key, val) => setFilters((f) => ({ ...f, [key]: val || undefined }));
  const hasFilters = Object.values(filters).some((v) => v);

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-brand-navy font-medium">
          <Filter className="w-4 h-4" />
          <span className="text-sm">Filters</span>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onReset} className="h-8 text-xs">
            <RotateCcw className="w-3 h-3" /> Reset
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="date"
            value={filters.date_from || ""}
            onChange={(e) => update("date_from", e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            value={filters.date_to || ""}
            onChange={(e) => update("date_to", e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Account</Label>
          <Select
            value={filters.account_id || "all"}
            onValueChange={(v) => update("account_id", v === "all" ? null : v)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {lookups?.accounts?.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Category</Label>
          <Select
            value={filters.category_id || "all"}
            onValueChange={(v) => update("category_id", v === "all" ? null : v)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {lookups?.categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Contact</Label>
          <Select
            value={filters.contact_id || "all"}
            onValueChange={(v) => update("contact_id", v === "all" ? null : v)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All contacts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All contacts</SelectItem>
              {lookups?.contacts?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Currency</Label>
          <Select
            value={filters.currency || "all"}
            onValueChange={(v) => update("currency", v === "all" ? null : v)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All currencies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All currencies</SelectItem>
              <SelectItem value={orgCurrency}>{orgCurrency}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={filters.status || "all"}
            onValueChange={(v) => update("status", v === "all" ? null : v)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="cleared">Cleared</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasFilters && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {Object.entries(filters).filter(([, v]) => v).map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 bg-brand-mint/60 text-brand-navy text-xs px-2 py-1 rounded-full"
            >
              {k.replace(/_/g, " ")}: {String(v).slice(0, 20)}
              <button onClick={() => update(k, null)} className="hover:text-status-bad">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}