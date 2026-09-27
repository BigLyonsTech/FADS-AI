import React from "react";
import { statusLabel, statusColor } from "@/lib/hrWording";

export default function StatusBadge({ status }) {
  const color = statusColor(status);
  const label = statusLabel(status);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}