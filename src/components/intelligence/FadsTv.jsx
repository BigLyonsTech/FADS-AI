import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useDataMode } from "@/lib/useDataMode";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import {
  buildTvStories, buildFadsPick, buildBulletin, buildTicker,
  projectCashForPeriod, periodLabel, forecastConfidence,
} from "@/lib/fadsTv";
import { formatCurrency } from "@/lib/currencyFormat";
import TvStory from "@/components/intelligence/TvStory";
import TvBulletin from "@/components/intelligence/TvBulletin";
import { ChevronRight, Sparkles } from "lucide-react";

const PERIODS = [
  { value: "7d", label: "This Week" },
  { value: "30d", label: "Next 30 Days" },
  { value: "90d", label: "Next 90 Days" },
];

// FADS TV — a visual business-forecast presentation layer that REUSES the
// existing intelligence engine (useIntelligence). No new predictions.
// Loads lightweight CRM/HR/Inventory counts for additional stories.
export default function FadsTv({ intelligence, org }) {
  const { dataMode } = useDataMode();
  const [period, setPeriod] = useState("30d");
  const [extData, setExtData] = useState({ crm: null, hr: null, inventory: null, loading: true });

  // Load CRM / HR / Inventory counts (lightweight, parallel)
  useEffect(() => {
    if (!org?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [leads, tasks, contacts, items, employees] = await Promise.all([
          base44.entities.CRMLead.filter({ organisation_id: org.id, data_mode: dataMode }, "-created_date", 200),
          base44.entities.CRMTask.filter({ organisation_id: org.id, data_mode: dataMode, status: "open" }, "-due_date", 200),
          base44.entities.CRMContact.filter({ organisation_id: org.id, data_mode: dataMode }, "-created_date", 200),
          base44.entities.InventoryItem.filter({ organisation_id: org.id, data_mode: dataMode, is_active: true }, "-created_date", 200),
          base44.entities.Employee.filter({ organisation_id: org.id, data_mode: dataMode }, "-created_date", 200),
        ]);
        if (cancelled) return;

        const today = new Date().toISOString().slice(0, 10);
        const leadsWaiting = leads.filter((l) => !l.lost_reason).length;
        const followUpsDue = tasks.filter((t) => t.type === "follow_up" && (!t.due_date || t.due_date <= today)).length;
        const lowStockItems = items.filter((i) => Number(i.current_quantity) <= Number(i.low_stock_level) && Number(i.low_stock_level) > 0);
        const activeEmployees = employees.filter((e) => e.employment_status === "active" || e.employment_status === "onboarding");

        setExtData({
          crm: { hasData: leads.length > 0 || contacts.length > 0, leadsWaiting, followUpsDue, totalContacts: contacts.length },
          hr: { hasData: activeEmployees.length > 0, employeeCount: activeEmployees.length, pendingLeave: 0 },
          inventory: { hasData: items.length > 0, totalItems: items.length, lowStockCount: lowStockItems.length },
          loading: false,
        });
      } catch {
        if (!cancelled) setExtData({ crm: null, hr: null, inventory: null, loading: false });
      }
    })();
    return () => { cancelled = true; };
  }, [org?.id, dataMode]);

  const stories = useMemo(
    () => buildTvStories(intelligence, org, extData.crm, extData.hr, extData.inventory, period),
    [intelligence, org, extData, period]
  );
  const pick = useMemo(() => buildFadsPick(intelligence, extData.crm, extData.inventory, org), [intelligence, extData, org]);
  const bulletin = useMemo(() => buildBulletin(intelligence, extData.crm, extData.inventory, org), [intelligence, extData, org]);
  const ticker = useMemo(() => buildTicker(intelligence, extData.crm, extData.inventory, org), [intelligence, extData, org]);
  const confidence = forecastConfidence(intelligence);
  const cf = intelligence?.cashflow;
  const hasForecast = cf?.hasData;
  const projected = hasForecast ? projectCashForPeriod(cf, period) : null;
  const cur = org?.currency || "";
  const orgType = org?.type || "small_business";

  // Insufficient data state
  const hasAnyData = hasForecast || stories.length > 0 || extData.crm?.hasData || extData.inventory?.hasData || extData.hr?.hasData;

  return (
    <div className="bg-brand-navy rounded-2xl overflow-hidden text-white shadow-lg">
      {/* ── TV Header bar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/30 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-status-bad animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-white">FADS TV</span>
        </div>
        <span className="text-[10px] font-mono tracking-[0.15em] text-white/40 hidden sm:block">BUSINESS UPDATE</span>
        <span className="text-[10px] font-mono tracking-[0.15em] text-status-bad/80 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-status-bad" /> NOW
        </span>
      </div>

      {/* ── TV Screen: presenter + forecast ───────────────────── */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          {/* Robot presenter */}
          <div className="relative shrink-0 flex flex-col items-center">
            <div className="absolute w-20 h-20 rounded-full bg-brand-teal/15 blur-2xl" />
            <div className="relative z-10">
              <FadsRobotAvatar size="lg" />
            </div>
          </div>

          {/* Forecast + copy */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h2 className="text-lg sm:text-xl font-bold tracking-wide">YOUR BUSINESS FORECAST</h2>
            <p className="text-sm text-white/60 mt-1 leading-relaxed">
              "Here's what I'm seeing in your business and what may be coming next."
            </p>

            {/* Period selector */}
            <div className="flex items-center gap-1.5 mt-3 justify-center sm:justify-start flex-wrap">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-touch ${
                    period === p.value
                      ? "bg-brand-teal text-brand-navy"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Forecast number */}
            {hasForecast ? (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-mono">Forecast · {periodLabel(period)}</p>
                <p className={`text-2xl sm:text-3xl font-bold font-mono mt-0.5 ${projected < cf.cashNow ? "text-status-warn" : "text-status-ok"}`}>
                  {formatCurrency(projected, cur)}
                </p>
                <div className="flex items-center gap-2 mt-1.5 justify-center sm:justify-start">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    confidence.level === "strong" ? "bg-status-ok/15 text-status-ok"
                    : confidence.level === "some" ? "bg-status-warn/15 text-status-warn"
                    : "bg-white/10 text-white/50"
                  }`}>
                    {confidence.label}
                  </span>
                  <span className="text-[10px] text-white/30">Based on records in FADS</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-sm text-white/70">I need a little more business history before I can make a useful forecast.</p>
                <p className="text-xs text-white/40 mt-1">Record a few more income and expense transactions, and I'll have a forecast for you.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Ticker ────────────────────────────────────────── */}
        {ticker && (
          <div className="mt-4 bg-black/20 rounded-lg px-3 py-2 border-t border-b border-white/5 overflow-hidden">
            <p className="text-xs font-mono text-white/50 tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">
              {ticker}
            </p>
          </div>
        )}
      </div>

      {/* ── Business News Stories ─────────────────────────────── */}
      {stories.length > 0 && (
        <div className="px-4 sm:px-5 pb-3 space-y-2.5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-mono font-semibold pt-1">── BUSINESS NEWS ──</p>
          {stories.map((s) => (
            <TvStory key={s.key} story={s} />
          ))}
        </div>
      )}

      {/* ── FADS' Pick ───────────────────────────────────────── */}
      {hasAnyData && (
        <div className="mx-4 sm:mx-5 mb-3 bg-brand-teal/10 border border-brand-teal/30 rounded-xl p-3.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-4 h-4 text-brand-teal" />
            <p className="text-xs font-bold text-brand-teal tracking-wide">FADS' PICK · What would I do next?</p>
          </div>
          <p className="text-sm text-white/90 leading-relaxed">"{pick.headline}"</p>
          <Link
            to={pick.url}
            className="inline-flex items-center gap-1.5 mt-2.5 bg-brand-teal text-brand-navy hover:bg-brand-teal/90 rounded-lg px-3 py-2 text-xs font-semibold min-h-touch transition-colors"
          >
            {pick.label} <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* ── Morning Bulletin ─────────────────────────────────── */}
      {hasAnyData && (
        <div className="mx-4 sm:mx-5 mb-4">
          <TvBulletin bulletin={bulletin} />
        </div>
      )}

      {/* ── Footer disclaimer ────────────────────────────────── */}
      <div className="px-4 sm:px-5 pb-3">
        <p className="text-[10px] text-white/30 text-center">
          Forecast · Based on the information currently recorded in FADS. Not a guaranteed outcome.
        </p>
      </div>
    </div>
  );
}