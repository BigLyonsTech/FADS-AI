import React from "react";
import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";

export default function ExpiryBadge({ expiryDate }) {
  if (!expiryDate) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((exp - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-status-bad bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap">
        <AlertCircle className="w-3 h-3" /> Expired
      </span>
    );
  }
  if (diffDays <= 30) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-status-warn bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap">
        <Clock className="w-3 h-3" /> Expires in {diffDays}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-status-ok bg-green-50 px-2 py-0.5 rounded-full whitespace-nowrap">
      <CheckCircle2 className="w-3 h-3" /> Valid
    </span>
  );
}