import React from "react";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import { Copy, Bot, Calculator } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

// FADS Affiliate Hero — the top of the Affiliate Centre. Uses the FADS
// robot prominently with the "Earn by sharing FADS" headline and three
// primary actions: Copy My Link, Help Me Promote, How Does It Work?
export default function FadsAffiliateHero({ referralLink, profile }) {
  const fullUrl = referralLink
    ? `${window.location.origin}${referralLink.url_path.replace("/signup", "/register")}`
    : null;

  const handleCopy = () => {
    if (!fullUrl) return;
    navigator.clipboard.writeText(fullUrl);
    toast({ title: "Link copied", description: "Your referral link is ready to share" });
  };

  return (
    <div className="bg-brand-navy rounded-2xl p-5 sm:p-6 space-y-4 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FadsRobotAvatar size="sm" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-teal font-semibold">FADS AFFILIATE</p>
        </div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-mono flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${profile?.status === "active" ? "bg-status-ok" : "bg-status-warn"} animate-pulse`} />
          {profile?.status ? profile.status.toUpperCase() : "READY"}
        </p>
      </div>

      {/* Robot + headline */}
      <div className="flex flex-col items-center py-2">
        <FadsRobotAvatar size="lg" />
        <h1 className="text-2xl font-bold text-white mt-4 text-center">Earn by sharing FADS</h1>
        <p className="text-sm text-white/70 mt-2 text-center max-w-[340px] leading-relaxed">
          Help businesses discover a simpler way to run their back office — and earn when qualifying referrals become paying FADS customers.
        </p>
      </div>

      {/* FADS says */}
      <div className="flex items-start gap-2 bg-white/5 rounded-xl p-3">
        <FadsRobotAvatar size="sm" className="shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-brand-teal font-medium mb-0.5">FADS says</p>
          <p className="text-xs text-white/80 leading-relaxed">
            &ldquo;Want help getting your first referral? I can help.&rdquo;
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={handleCopy}
          disabled={!fullUrl}
          className="w-full inline-flex items-center justify-center gap-2 bg-brand-teal text-brand-navy hover:bg-brand-teal/90 rounded-xl py-3 text-sm font-medium min-h-touch transition-colors disabled:opacity-50"
        >
          <Copy className="w-4 h-4" /> Copy My Link
        </button>
        <div className="grid grid-cols-2 gap-2">
          <a
            href="#promote"
            className="inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white rounded-xl py-3 text-sm font-medium min-h-touch transition-colors"
          >
            <Bot className="w-4 h-4" /> Help Me Promote
          </a>
          <a
            href="#calculator"
            className="inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white rounded-xl py-3 text-sm font-medium min-h-touch transition-colors"
          >
            <Calculator className="w-4 h-4" /> How Does It Work?
          </a>
        </div>
      </div>
    </div>
  );
}