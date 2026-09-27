import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { TERM_OPTIONS, FAITH_TYPES } from "@/lib/faithTerminology";

// Reusable faith community type + terminology settings section.
// Used in Onboarding (for new church workspaces) and OrganisationEditDialog
// (for editing existing church workspaces). Non-church orgs don't show this.
//
// Props:
//   values: { faith_type, faith_type_other, terminology: { people, leader, giving, gatherings, volunteers } }
//   onChange: (updatedValues) => void
export default function FaithTerminologySection({ values, onChange }) {
  const { faith_type = "church", faith_type_other = "", terminology = {} } = values;

  const set = (key, val) => onChange({ ...values, [key]: val });
  const setTerm = (key, val) =>
    onChange({ ...values, terminology: { ...terminology, [key]: val } });

  const renderTermSelect = (key, label, options) => {
    const current = terminology[key] || "";
    const isCustom = current && !options.some((o) => o.value === current);
    const selectValue = isCustom ? "__custom" : current || "__default";

    return (
      <div key={key} className="space-y-2">
        <Label>{label}</Label>
        <Select
          value={selectValue}
          onValueChange={(v) => {
            if (v === "__default" || v === "__custom") setTerm(key, "");
            else setTerm(key, v);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default">Default (neutral)</SelectItem>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
            <SelectItem value="__custom">Custom…</SelectItem>
          </SelectContent>
        </Select>
        {selectValue === "__custom" && (
          <Input
            className="h-11"
            placeholder="Enter your own term"
            value={current}
            onChange={(e) => setTerm(key, e.target.value)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 rounded-lg border border-brand-mint bg-brand-mint/30 p-4">
      <div>
        <h3 className="font-semibold text-brand-navy text-sm">
          Faith community settings
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Choose how your organisation identifies itself and the words it
          normally uses. Leave any field on "Default" for welcoming neutral
          language.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Organisation type</Label>
        <Select value={faith_type} onValueChange={(v) => set("faith_type", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FAITH_TYPES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {faith_type === "other" && (
        <div className="space-y-2">
          <Label>Describe your organisation</Label>
          <Input
            className="h-11"
            value={faith_type_other}
            onChange={(e) => set("faith_type_other", e.target.value)}
            placeholder="e.g. Spiritual Centre, Meditation Group"
          />
        </div>
      )}

      <div className="border-t border-border pt-4 space-y-4">
        {renderTermSelect("people", "People", TERM_OPTIONS.people)}
        {renderTermSelect("leader", "Organisation leader", TERM_OPTIONS.leader)}
        {renderTermSelect("giving", "Financial contributions", TERM_OPTIONS.giving)}
        {renderTermSelect("gatherings", "Gatherings", TERM_OPTIONS.gatherings)}
        {renderTermSelect(
          "volunteers",
          "People helping the organisation",
          TERM_OPTIONS.volunteers
        )}
      </div>
    </div>
  );
}