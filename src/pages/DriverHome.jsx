import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useFinance } from "@/lib/useFinance";
import { useIntelligence } from "@/lib/useIntelligence";
import { useAuth } from "@/lib/AuthContext";
import { canManageFinance } from "@/lib/financeWording";
import FadsDriverHero from "@/components/driver/FadsDriverHero";
import BusinessIntelligenceCard from "@/components/intelligence/BusinessIntelligenceCard";
import FadsVoicePlayer from "@/components/driver/FadsVoicePlayer";
import DriverDailyCheck from "@/components/driver/DriverDailyCheck";
import DriverMorningBrief from "@/components/driver/DriverMorningBrief";
import BackToBusinessDemo from "@/components/driver/BackToBusinessDemo";
import MiniFadsTv from "@/components/intelligence/MiniFadsTv";
import {
  ArrowDownCircle, ArrowUpCircle, Wallet,
  Receipt, FileText, Banknote, AlertTriangle,
} from "lucide-react";

// FADS Driver Home — a specialist Home experience for Taxi Driver / Self-Employed
// workspaces. Reuses the SAME underlying Finance, Intelligence and FADS TV
// engines as the rest of FADS. All figures come from genuine recorded data;
// nothing is hard-coded. Mobile-first (360px).
export default function DriverHome() {
  const { activeOrg, activeRole, loading } = useWorkspace();
  const fin = useFinance();
  const { intelligence } = useIntelligence();
  const { user } = useAuth();
  const canManage = canManageFinance(activeRole);
  const seededFor = useRef(null);

  // Auto-seed fictional demo data once per demo org (Demo mode only,
  // idempotent) — reuses the existing finance.seed_demo mechanism so the
  // FADS Driver Home demonstrates real data without a separate seed system.
  useEffect(() => {
    if (
      activeOrg?.data_mode === "demo" &&
      !fin.loading &&
      fin.accounts.length === 0 &&
      canManage &&
      seededFor.current !== activeOrg.id
    ) {
      seededFor.current = activeOrg.id;
      (async () => {
        try {
          await base44.functions.invoke("finance", {
            action: "seed_demo",
            organisation_id: activeOrg.id,
          });
          await fin.reload();
        } catch {
          // non-fatal; user can still create data manually
        }
      })();
    }
  }, [activeOrg?.id, fin.loading, fin.accounts.length, canManage]);

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading…</div>;
  }
  if (!activeOrg) return null;

  const blocked = activeOrg.access_status === "paused" || activeOrg.access_status === "cancelled";
  const currency = activeOrg.currency || "";
  const fmt = (n) => `${currency} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const today = new Date().toISOString().slice(0, 10);
  const cleared = fin.transactions.filter((t) => t.status === "cleared" || t.status === "completed");
  const todayIncome = cleared.filter((t) => t.direction === "in" && t.date === today).reduce((s, t) => s + Number(t.amount), 0);
  const todayExpenses = cleared.filter((t) => t.direction === "out" && t.date === today).reduce((s, t) => s + Number(t.amount), 0);
  const monthNet = (fin.moneyIn || 0) - (fin.moneyOut || 0);

  const pendingCount = (fin.outstanding || []).length;

  // FADS' Pick — driver-flavoured, from real data
  let pick;
  if (pendingCount > 0) {
    pick = { text: `Review ${pendingCount} pending record${pendingCount === 1 ? "" : "s"} so your books stay accurate.`, link: "/finance/transactions", label: "Review records" };
  } else if (monthNet < 0) {
    pick = { text: "Your costs are higher than your income this month so far.", link: "/finance/transactions", label: "Review spending" };
  } else if (todayIncome === 0 && todayExpenses === 0) {
    pick = { text: "Record today's income and expenses to keep your records up to date.", link: "/finance/money-in", label: "Record income" };
  } else {
    pick = { text: "Your records look up to date. Nice work.", link: null, label: null };
  }

  const snapshot = [
    { label: "Today's Income", value: fmt(todayIncome), icon: ArrowDownCircle, tint: "bg-status-ok/10 border-status-ok/20", iconColor: "text-status-ok", link: "/finance/money-in" },
    { label: "Today's Expenses", value: fmt(todayExpenses), icon: ArrowUpCircle, tint: "bg-status-warn/10 border-status-warn/20", iconColor: "text-status-warn", link: "/finance/money-out" },
    { label: "This Month", value: fmt(monthNet), icon: Wallet, tint: "bg-brand-mint/40 border-brand-teal/20", iconColor: "text-brand-teal", link: "/finance", helper: monthNet >= 0 ? "In profit" : "Costs ahead" },
  ];

  const quickActions = [
    { label: "Money In", icon: ArrowDownCircle, link: "/finance/money-in", tint: "bg-status-ok/10", color: "text-status-ok" },
    { label: "Expense", icon: ArrowUpCircle, link: "/finance/money-out", tint: "bg-status-warn/10", color: "text-status-warn" },
    { label: "Scan Receipt", icon: Receipt, link: "/finance?scan=1", tint: "bg-brand-teal/10", color: "text-brand-teal" },
    { label: "Bank Statement", icon: FileText, link: "/finance", tint: "bg-brand-teal/10", color: "text-brand-teal" },
    { label: "P&L", icon: Banknote, link: "/finance/reports", tint: "bg-brand-navy/5", color: "text-brand-navy" },
  ];

  const firstName = (user?.full_name?.trim() || "").split(/\s+/)[0] || "";

  return (
    <div className="space-y-6">
      <FadsDriverHero name={firstName} />

      {activeOrg.data_mode === "demo" && <BackToBusinessDemo />}

      {blocked ? (
        <div className="bg-status-bad/10 border border-status-bad/30 rounded-xl p-6 flex gap-3">
          <AlertTriangle className="w-6 h-6 text-status-bad shrink-0" />
          <div>
            <h3 className="font-semibold text-status-bad capitalize">Access {activeOrg.access_status}</h3>
            <p className="text-sm text-muted-foreground">
              This workspace's access is currently {activeOrg.access_status}. Please contact the platform owner.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* FADS Driver Morning Brief — compact check-in, real data only */}
          <DriverMorningBrief
            firstName={firstName}
            fmt={fmt}
            todayIncome={todayIncome}
            todayExpenses={todayExpenses}
            monthNet={monthNet}
            pick={pick}
          />

          {/* Snapshot — real data only */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {snapshot.map((c, i) => (
              <Link key={i} to={c.link}>
                <div className={`rounded-xl border p-4 h-full ${c.tint} hover:shadow-sm transition-shadow`}>
                  <c.icon className={`w-5 h-5 ${c.iconColor}`} />
                  <p className="text-xs text-muted-foreground mt-2">{c.label}</p>
                  <p className="text-lg font-bold text-brand-navy mt-0.5 break-words">{c.value}</p>
                  {c.helper && <p className="text-[11px] text-muted-foreground mt-1">{c.helper}</p>}
                </div>
              </Link>
            ))}
          </div>

          {/* FADS Driver Intelligence — reuses existing BI engine, driver wording */}
          <BusinessIntelligenceCard
            pick={pick}
            orgType={activeOrg.type}
            title="FADS DRIVER INTELLIGENCE"
            intro="You drive. FADS looks at your income and costs, and helps you decide what to do next."
          />

          {/* FADS Driver Daily Check — quick daily review, real data only */}
          <div id="driver-full-brief">
            <DriverDailyCheck />
          </div>

          {/* FADS Voice Player — talk to your AI business co-pilot */}
          <FadsVoicePlayer />

          {/* Quick actions */}
          <div>
            <h2 className="font-semibold text-brand-navy mb-3">Quick Actions</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {quickActions.map((q, i) => (
                <Link key={i} to={q.link}>
                  <div className="rounded-xl border border-border bg-card p-3 flex flex-col items-center gap-1.5 hover:shadow-sm transition-shadow min-h-touch">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${q.tint}`}>
                      <q.icon className={`w-4 h-4 ${q.color}`} />
                    </div>
                    <span className="text-[11px] font-medium text-brand-navy text-center leading-tight">{q.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Mini FADS TV — reuses existing intelligence + bulletin, adapts to driver data */}
          <MiniFadsTv />
        </>
      )}
    </div>
  );
}