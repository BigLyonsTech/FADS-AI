import React from "react";
import { Calculator, Calendar, Building2 } from "lucide-react";
import JurisdictionSwitcher from "@/components/tax/JurisdictionSwitcher";

export default function TaxCentreHeader({
  title,
  org,
  organisationPack,
  taxYear,
  guidanceCountry,
  guidanceOptions,
  onSelectGuidance,
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-navy flex items-center justify-center shrink-0">
          <Calculator className="w-6 h-6 text-brand-teal" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">{title}</h1>
          <p className="text-sm text-muted-foreground truncate">
            {org?.name} · {org?.currency}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0">Your organisation:</span>
          <span className="text-sm font-semibold text-brand-navy truncate">
            {organisationPack?.flag} {organisationPack?.label || org?.country || "Not set"}
          </span>
        </div>

        <JurisdictionSwitcher
          value={guidanceCountry}
          options={guidanceOptions}
          onSelect={onSelectGuidance}
        />

        {taxYear && (
          <div className="flex items-center gap-2 sm:ml-auto">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">Tax Year</span>
            <span className="text-sm font-medium text-brand-navy">{taxYear}</span>
          </div>
        )}
      </div>
    </div>
  );
}
