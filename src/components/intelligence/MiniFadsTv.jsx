import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useDataMode } from "@/lib/useDataMode";
import { useIntelligence } from "@/lib/useIntelligence";
import FadsRobot from "@/components/FadsRobot";
import { buildBulletin, buildTicker } from "@/lib/fadsTv";
import {
  CheckCircle, AlertTriangle, Sparkles, ChevronRight,
  Play, Pause, SkipBack, SkipForward,
} from "lucide-react";

// Presenter robot — FADS standing beside his TV. Same artwork as
// FadsRobotAvatar but with a custom scale so he can be larger beside
// the player on desktop (~120px) and compact on mobile (~80px).
function PresenterRobot({ scale = 1 }) {
  const w = 48 * scale;
  const h = 80 * scale;
  return (
    <div className="relative shrink-0" style={{ width: w, height: h }}>
      <div
        className="absolute left-1/2 top-0"
        style={{ transform: `translateX(-50%) scale(${scale})`, transformOrigin: "top center" }}
      >
        <FadsRobot />
      </div>
    </div>
  );
}

// Mini FADS TV — a compact Y2K digital-player styled business-news preview
// for the Home dashboard. Reuses the SAME intelligence engine
// (useIntelligence), SAME story builder (buildBulletin), SAME ticker
// (buildTicker), and SAME FADS robot as the full FADS TV in Intelligence.
// No new predictions, no new data, no new engines — purely a visual
// player-style presentation of the existing three stories.
export default function MiniFadsTv() {
  const { intelligence, org, loading } = useIntelligence();
  const { dataMode } = useDataMode();
  const [extData, setExtData] = useState({ crm: null, inventory: null, loading: true });
  const [activeStory, setActiveStory] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Load lightweight CRM + inventory counts (same pattern as full FADS TV).
  // React Query caches finance / invoice data so useIntelligence adds no
  // duplicate API calls.
  useEffect(() => {
    if (!org?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [leads, tasks, items] = await Promise.all([
          base44.entities.CRMLead.filter({ organisation_id: org.id, data_mode: dataMode }, "-created_date", 200),
          base44.entities.CRMTask.filter({ organisation_id: org.id, data_mode: dataMode, status: "open" }, "-due_date", 200),
          base44.entities.InventoryItem.filter({ organisation_id: org.id, data_mode: dataMode, is_active: true }, "-created_date", 200),
        ]);
        if (cancelled) return;
        const today = new Date().toISOString().slice(0, 10);
        const leadsWaiting = leads.filter((l) => !l.lost_reason).length;
        const followUpsDue = tasks.filter((t) => t.type === "follow_up" && (!t.due_date || t.due_date <= today)).length;
        const lowStockItems = items.filter(
          (i) => Number(i.current_quantity) <= Number(i.low_stock_level) && Number(i.low_stock_level) > 0
        );
        setExtData({
          crm: { hasData: leads.length > 0 || tasks.length > 0, leadsWaiting, followUpsDue },
          inventory: { hasData: items.length > 0, lowStockCount: lowStockItems.length },
          loading: false,
        });
      } catch {
        if (!cancelled) setExtData({ crm: null, inventory: null, loading: false });
      }
    })();
    return () => { cancelled = true; };
  }, [org?.id, dataMode]);

  const bulletin = useMemo(
    () => buildBulletin(intelligence, extData.crm, extData.inventory, org),
    [intelligence, extData, org]
  );
  const ticker = useMemo(
    () => buildTicker(intelligence, extData.crm, extData.inventory, org),
    [intelligence, extData, org]
  );

  // Don't render until we have data — no skeleton on the Home dashboard.
  if (loading || extData.loading || !intelligence) return null;

  const isToday = bulletin.goodNewsLabel === "TODAY";
  const healthScore = intelligence?.health?.hasData
    ? `${intelligence.health.score}/${intelligence.health.maxScore}`
    : null;

  // The three existing FADS TV stories, presented as player "tracks"
  const stories = [
    {
      label: bulletin.goodNewsLabel || "GOOD NEWS",
      Icon: CheckCircle,
      text: bulletin.goodNews,
      tone: isToday ? "neutral" : "ok",
    },
    {
      label: "WATCH THIS",
      Icon: AlertTriangle,
      text: bulletin.watchThis,
      tone: "warn",
    },
    {
      label: "FADS' PICK",
      Icon: Sparkles,
      text: bulletin.pick,
      tone: "teal",
    },
  ];
  const current = stories[activeStory];
  const goPrev = () => setActiveStory((i) => (i - 1 + stories.length) % stories.length);
  const goNext = () => setActiveStory((i) => (i + 1) % stories.length);

  const toneText = {
    ok: "text-status-ok",
    warn: "text-status-warn",
    teal: "text-brand-teal",
    neutral: "text-white/50",
  };
  const toneLabel = {
    ok: "text-status-ok/80",
    warn: "text-status-warn/80",
    teal: "text-brand-teal",
    neutral: "text-white/50",
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
      {/* ── FADS presenter — standing beside his TV ─────────────── */}
      <div className="flex flex-col items-center shrink-0">
        <div className="relative flex items-center justify-center p-2">
          <div className="absolute inset-0 rounded-full bg-brand-teal/25 blur-lg" />
          {/* Mobile: ~80px */}
          <div className="relative sm:hidden">
            <PresenterRobot scale={1} />
          </div>
          {/* Desktop: ~120px */}
          <div className="relative hidden sm:block">
            <PresenterRobot scale={1.5} />
          </div>
          {/* Subtle Y2K presenter platform */}
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-16 sm:w-20 h-1.5 rounded-full bg-black/50 border border-brand-teal/30" />
        </div>
        <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-brand-navy border border-brand-teal/40 text-[11px] text-white/90 text-center max-w-[150px] leading-tight">
          "Here's what I'm seeing today."
        </div>
      </div>

      {/* ── FADS TV Player ─────────────────────────────────────── */}
      <div className="flex-1 w-full bg-brand-navy rounded-2xl overflow-hidden text-white shadow-md border border-white/5">
        {/* ── Player header bar ─────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-brand-teal/15">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-status-bad animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-[0.2em]">FADS TV</span>
            <span className="text-[10px] font-mono tracking-[0.15em] text-white/25 hidden sm:inline">// 001</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono tracking-[0.15em] text-white/40 hidden sm:inline">NOW PLAYING</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-status-ok" />
              <span className="text-[10px] font-mono tracking-[0.15em] text-status-ok/80">LIVE DATA</span>
            </span>
          </div>
        </div>

        {/* ── Player body ──────────────────────────────────────── */}
        <div className="p-4">
          {/* Now Playing info */}
          <div className="mb-3">
            <p className="text-[10px] font-mono tracking-[0.15em] text-brand-teal/70 uppercase">Now Playing</p>
            <p className="text-sm font-bold tracking-wide leading-tight">TODAY'S BUSINESS NEWS</p>
            <p className="text-[10px] font-mono text-white/40 tracking-wide mt-0.5 truncate">
              YOUR BUSINESS • TODAY{healthScore ? ` • HEALTH ${healthScore}` : ""}
            </p>
          </div>

        {/* ── Main TV screen — inset player display ────────────── */}
        <div className="rounded-2xl border-2 border-white/10 p-1.5 bg-black/30 shadow-[0_0_24px_rgba(20,184,166,0.08)]">
          <div className="rounded-xl bg-black/50 border border-brand-teal/20 shadow-[inset_0_2px_12px_rgba(0,0,0,0.6)] p-4 min-h-[96px] flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1.5">
              <current.Icon className={`w-4 h-4 shrink-0 ${toneText[current.tone]}`} />
              <p className={`text-[10px] uppercase tracking-[0.15em] font-mono font-semibold ${toneLabel[current.tone]}`}>
                {current.label}
              </p>
            </div>
            <p className="text-sm text-white/90 leading-snug">{current.text}</p>
          </div>
        </div>

        {/* ── Player controls ──────────────────────────────────── */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <button
            onClick={goPrev}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center min-h-touch transition-colors"
            aria-label="Previous story"
          >
            <SkipBack className="w-4 h-4 text-white/80" />
          </button>
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="w-12 h-12 rounded-xl bg-brand-teal/20 hover:bg-brand-teal/30 border-2 border-brand-teal/40 flex items-center justify-center min-h-touch transition-colors shadow-[0_0_12px_rgba(20,184,166,0.2)]"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-5 h-5 text-brand-teal" /> : <Play className="w-5 h-5 text-brand-teal" />}
          </button>
          <button
            onClick={goNext}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center min-h-touch transition-colors"
            aria-label="Next story"
          >
            <SkipForward className="w-4 h-4 text-white/80" />
          </button>
        </div>

        {/* ── Progress ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mt-2.5 px-1">
          <span className="text-[10px] font-mono text-brand-teal/70 tracking-wider font-semibold">
            {String(activeStory + 1).padStart(2, "0")}
          </span>
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-brand-teal rounded-full transition-all duration-300"
              style={{ width: `${((activeStory + 1) / stories.length) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-white/30 tracking-wider">
            {String(stories.length).padStart(2, "0")}
          </span>
        </div>

        {/* ── Digital ticker ──────────────────────────────────── */}
        {ticker && (
          <div className="mt-3 bg-black/20 rounded-md px-3 py-1.5 border-t border-b border-white/5 overflow-hidden">
            <p className="text-[10px] font-mono text-white/40 tracking-wide whitespace-nowrap overflow-hidden text-ellipsis uppercase">
              {ticker}
            </p>
          </div>
        )}

        {/* ── Actions ─────────────────────────────────────────── */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          {bulletin.pickUrl && (
            <Link
              to={bulletin.pickUrl}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-brand-teal text-brand-navy hover:bg-brand-teal/90 rounded-lg px-3 py-2.5 text-xs font-bold min-h-touch transition-colors shadow-[0_0_16px_rgba(20,184,166,0.25)]"
            >
              Do this with FADS <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
          <Link
            to="/intelligence"
            className={`inline-flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/15 rounded-lg px-3 py-2.5 text-xs font-medium min-h-touch transition-colors ${
              bulletin.pickUrl ? "" : "flex-1"
            }`}
          >
            <Play className="w-3.5 h-3.5" /> Watch Full Forecast
          </Link>
        </div>
      </div>
    </div>
  </div>
  );
}