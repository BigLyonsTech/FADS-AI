import React from "react";
import { quotationStatusClass, quotationStatusLabel } from "@/lib/quotationUtils";

export default function QuotationStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${quotationStatusClass(status)}`}
    >
      {quotationStatusLabel(status)}
    </span>
  );
}
