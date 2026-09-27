import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Sparkles, Users, Loader2 } from "lucide-react";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import { base44 } from "@/api/base44Client";
import { useDataMode } from "@/lib/useDataMode";
import { useIntelligence } from "@/lib/useIntelligence";
import HealthCard from "@/components/intelligence/HealthCard";
import CashflowCard from "@/components/intelligence/CashflowCard";
import DebtCard from "@/components/intelligence/DebtCard";
import GuardianCard from "@/components/intelligence/GuardianCard";
import FundingCard from "@/components/intelligence/FundingCard";
import EnergyCard from "@/components/intelligence/EnergyCard";
import DailyBrief from "@/components/assistant/DailyBrief";
import FadsTv from "@/components/intelligence/FadsTv";
import { Button } from "@/components/ui/button";

// FADS Intelligence — one connected view that turns existing business records
// into forward-looking insight: what happened, what's happening, what's likely
// next, and what to do next. Reuses Finance + Invoice data; no new entities.
export default function Intelligence() {
  const { intelligence, org, loading } = useIntelligence();
  const { dataMode } = useDataMode();
  const [dailyBrief, setDailyBrief] = useState(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);

  const generateDailyBrief = async () => {
    if (!org || generatingBrief) return;
    setGeneratingBrief(true);
    try {
      const res = await base44.functions.invoke("assistant", {
        action: "generate_daily_brief",
        organisation_id: org.id,
        data_mode: dataMode,
      });
      setDailyBrief(res.data.brief);
    } catch (e) {
      setDailyBrief("Unable to generate your daily brief right now. Please try Ask FADS instead.");
    } finally {
      setGeneratingBrief(false);
    }
  };

  if (loading && !intelligence) {
    return <div className="text-center py-20 text-muted-foreground">Loading FADS Intelligence…</div>;
  }
  if (!intelligence) {
    return <div className="text-center py-20 text-muted-foreground">Select a workspace to view intelligence.</div>;
  }

  const cur = org?.currency || "";
  const briefQ = "How is my business doing?";

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto w-full px-1 sm:px-2 lg:px-4">
      {/* Hero */}
      <div className="bg-brand-navy text-white rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <FadsRobotAvatar size="md" className="shrink-0 pt-1" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold">FADS Intelligence</h1>
            <p className="text-sm text-white/70 mt-0.5">
              Big businesses have departments. Small businesses have FADS.
            </p>
            <p className="text-sm text-white/80 mt-2">
              {org?.name} · {cur} · {org?.data_mode?.toUpperCase()} mode
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <Button
            onClick={generateDailyBrief}
            disabled={generatingBrief}
            className="bg-brand-teal text-brand-navy hover:bg-brand-teal/90 h-11 min-h-touch w-full sm:w-auto gap-2"
          >
            {generatingBrief ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generatingBrief ? "Checking your business…" : "What needs my attention today?"}
          </Button>
          <Link to="/assistant" className="sm:mr-2">
            <Button variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 h-11 min-h-touch w-full sm:w-auto gap-2">
              <Bot className="w-4 h-4" /> Ask FADS
            </Button>
          </Link>
          <Link to="/ai-team">
            <Button variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 h-11 min-h-touch w-full sm:w-auto gap-2">
              <Users className="w-4 h-4" /> AI Team
            </Button>
          </Link>
        </div>
      </div>

      {/* FADS Daily Management Team Brief */}
      {dailyBrief && <DailyBrief brief={dailyBrief} />}

      {/* FADS TV — Business Forecast Broadcast */}
      <FadsTv intelligence={intelligence} org={org} />

      {/* Business Health + Cashflow */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 [&>*]:min-w-0">
        <HealthCard health={intelligence.health} currency={cur} />
        <CashflowCard cashflow={intelligence.cashflow} currency={cur} />
      </div>

      {/* Debt Recovery + Guardian */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 [&>*]:min-w-0">
        <DebtCard debt={intelligence.debt} currency={cur} />
        <GuardianCard guardian={intelligence.guardian} currency={cur} orgId={org?.id} />
      </div>

      {/* Funding Readiness + Energy (NG) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 [&>*]:min-w-0">
        <FundingCard funding={intelligence.funding} currency={cur} />
        <EnergyCard energy={intelligence.energy} currency={cur} />
      </div>

      <p className="text-[11px] text-muted-foreground text-center pb-4">
        All insights are computed from the records currently available in FADS for {org?.name}. Predictions and
        estimates are not guaranteed outcomes. This is informational and not professional accounting, tax, or legal advice.
      </p>
    </div>
  );
}