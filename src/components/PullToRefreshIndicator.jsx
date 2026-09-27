import React from "react";
import { Loader2, ArrowDown } from "lucide-react";

// Visual indicator for pull-to-refresh. Renders nothing when idle.
export default function PullToRefreshIndicator({ pullDistance, refreshing, threshold }) {
  if (pullDistance === 0 && !refreshing) return null;
  const progress = Math.min(pullDistance / threshold, 1);
  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-opacity"
      style={{ height: refreshing ? 40 : pullDistance, opacity: refreshing ? 1 : progress }}
    >
      {refreshing ? (
        <Loader2 className="w-5 h-5 animate-spin text-brand-teal" />
      ) : (
        <ArrowDown
          className="w-5 h-5 text-brand-teal"
          style={{ transform: `rotate(${progress * 180}deg)` }}
        />
      )}
    </div>
  );
}