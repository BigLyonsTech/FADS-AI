import React from "react";
import { statusBadgeClass, statusLabel } from "@/lib/invoiceUtils";

export default function InvoiceStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadgeClass(
        status
      )}`}
    >
      {statusLabel(status)}
    </span>
  );
}