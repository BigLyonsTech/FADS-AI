import React from "react";
import { ShieldCheck } from "lucide-react";
import { COMPLIANCE_POINTS } from "@/lib/affiliateResources";

// Affiliate Sharing Guide — simple compliance reminders. Keeps affiliate
// content honest and grounded in genuine FADS features.
export default function AffiliateSharingGuide() {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-brand-teal" />
        <h2 className="font-semibold text-brand-navy">Affiliate Sharing Guide</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        A few simple rules to keep your sharing honest and useful:
      </p>
      <ul className="space-y-2">
        {COMPLIANCE_POINTS.map((p, i) => (
          <li key={i} className="text-sm text-brand-navy flex items-start gap-2">
            <span className="text-brand-teal mt-0.5 shrink-0">•</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground pt-1">
        FADS personalisation only adapts approved messaging — it never invents product features or guarantees results.
      </p>
    </div>
  );
}