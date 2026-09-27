import React from "react";
import { Building2 } from "lucide-react";

const STATUS_STYLES = {
  trial: "bg-status-warn/10 text-status-warn",
  active: "bg-status-ok/10 text-status-ok",
  paused: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function ReferredOrgsList({ attributions }) {
  if (!attributions || attributions.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">No referred organisations yet.</p>
        <p className="text-muted-foreground/70 text-xs mt-1">
          Share your referral link to start earning commission.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-brand-navy">Referred Organisations</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Privacy-safe: only organisation name and status are shown.
        </p>
      </div>
      <div className="divide-y divide-border">
        {attributions.map((attr) => (
          <div key={attr.id} className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-brand-navy/5 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-brand-navy" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-brand-navy truncate">{attr.referred_organisation_name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(attr.attributed_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize shrink-0 ${
                STATUS_STYLES[attr.referred_organisation_status] || "bg-muted text-muted-foreground"
              }`}
            >
              {attr.referred_organisation_status || "unknown"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}