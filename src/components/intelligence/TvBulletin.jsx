import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle, AlertTriangle, Sparkles, ChevronRight } from "lucide-react";

// Today's Business Bulletin — 3 compact items: good news, watch this,
// FADS' pick. Reuses Daily Brief / intelligence data. No new engine.
export default function TvBulletin({ bulletin }) {
  return (
    <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 space-y-2.5">
      <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-mono font-semibold">
        ● TODAY'S BUSINESS BULLETIN
      </p>

      {/* Good news */}
      <div className="flex items-start gap-2">
        <CheckCircle className="w-4 h-4 text-status-ok shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-status-ok/80 font-medium">{bulletin.goodNewsLabel || "GOOD NEWS"}</p>
          <p className="text-sm text-white/90 leading-snug">{bulletin.goodNews}</p>
        </div>
      </div>

      {/* Watch this */}
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-status-warn shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-status-warn/80 font-medium">Watch this</p>
          <p className="text-sm text-white/90 leading-snug">{bulletin.watchThis}</p>
        </div>
      </div>

      {/* FADS' Pick */}
      <div className="flex items-start gap-2 pt-2 border-t border-white/10">
        <Sparkles className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-brand-teal font-medium">FADS' Pick</p>
          <p className="text-sm text-white/90 leading-snug">{bulletin.pick}</p>
          {bulletin.pickUrl && (
            <Link
              to={bulletin.pickUrl}
              className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-brand-teal hover:underline min-h-touch"
            >
              Do this with FADS <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}