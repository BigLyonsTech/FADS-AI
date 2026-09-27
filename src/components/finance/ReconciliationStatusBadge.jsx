import React from "react";
import { deriveRecStatus, recStatusLabel } from "@/lib/reconciliationUtils";

const STYLES = {
  reconciled: "bg-status-ok/15 text-status-ok border-status-ok/30",
  partial: "bg-status-warn/15 text-status-warn border-status-warn/30",
  unreconciled: "bg-muted text-muted-foreground border-border",
  ready: "bg-brand-teal/15 text-brand-teal border-brand-teal/30",
};

export default function ReconciliationStatusBadge({ rec }) {
  const status = deriveRecStatus(rec);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STYLES[status] || STYLES.unreconciled}`}
    >
      {recStatusLabel(status)}
    </span>
  );
}