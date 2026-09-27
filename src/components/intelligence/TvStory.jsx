import React from "react";
import { Link } from "react-router-dom";
import { Wallet, AlertCircle, Users, Activity, Package, ChevronRight, Fuel, Percent } from "lucide-react";

const ICONS = {
  wallet: Wallet,
  alert: AlertCircle,
  users: Users,
  activity: Activity,
  package: Package,
  fuel: Fuel,
  percent: Percent,
};

// Single FADS TV business-news story. Dark-navy card with watch label,
// headline, optional actual/forecast distinction, and deep-link action.
export default function TvStory({ story }) {
  const Icon = ICONS[story.icon] || Activity;
  return (
    <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-brand-teal/15 text-brand-teal flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.15em] text-brand-teal font-semibold font-mono">
            {story.label}
          </p>
          <p className="text-sm text-white/90 mt-1 leading-relaxed">{story.headline}</p>

          {/* Actual vs Forecast distinction */}
          {(story.actual || story.forecast) && (
            <div className="flex items-center gap-3 mt-2 text-xs">
              {story.actual && (
                <span className="text-white/50">
                  <span className="text-white/40">Actual: </span>
                  <span className="font-mono font-medium text-white/80">{story.actual}</span>
                </span>
              )}
              {story.forecast && (
                <span className={story.isDecline ? "text-status-warn" : "text-status-ok"}>
                  <span className="opacity-60">Forecast: </span>
                  <span className="font-mono font-semibold">{story.forecast}</span>
                </span>
              )}
            </div>
          )}

          {/* Action deep-link */}
          {story.actionUrl && (
            <Link
              to={story.actionUrl}
              className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-brand-teal hover:underline min-h-touch"
            >
              {story.actionLabel || "Open"} <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}