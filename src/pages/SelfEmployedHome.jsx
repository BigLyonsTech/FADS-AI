import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useFinance } from "@/lib/useFinance";
import { canManageFinance } from "@/lib/financeWording";
import { useIntelligence } from "@/lib/useIntelligence";
import { useAuth } from "@/lib/AuthContext";
import FadsSelfEmployedHero from "@/components/self_employed/FadsSelfEmployedHero";
import BusinessIntelligenceCard from "@/components/intelligence/BusinessIntelligenceCard";
import TalkToFadsRecorder from "@/components/driver/TalkToFadsRecorder";
import BackToBusinessDemo from "@/components/driver/BackToBusinessDemo";
import MiniFadsTv from "@/components/intelligence/MiniFadsTv";
import {
  ArrowDownCircle, ArrowUpCircle, Wallet, BadgePercent,
  FileText, Banknote, AlertTriangle, MessageCircle,
} from "lucide-react";

// FADS Self-Employed Home — a specialist Home experience for self-employed /
// sole-trader workspaces (freelancers, consultants, tradespeople, beauty
// professionals, cleaners, creators, coaches, etc.). Reuses the SAME
// underlying Finance, Intelligence, Tax and FADS TV engines as the rest of
// FADS. All figures come from genuine recorded data; nothing is hard-coded.
// One-person-business friendly — HR/employee tooling is not forced here.
// Mobile-first (360px).
export default function SelfEmployedHome() {
  const { activeOrg, activeRole, loading } = useWorkspace();
  const fin = useFinance();
  const { intelligence } = useIntelligence();
  const { user } = useAuth();
  const canManage = canManageFinance(activeRole);
  const seededFor = useRef(null);

  // Auto-seed fictional demo data once per demo org (Demo mode only,
  // idempotent) — reuses the existing finance.seed_demo mechanism so the
  // Self-Employed Home demonstrates real data without a separate seed system.
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

  const moneyIn = fin.moneyIn || 0;
  const moneyOut = fin.moneyOut || 0;
  const monthNet = moneyIn - moneyOut;
  const moneyOwed = (fin.outstanding || []).reduce(
    (s, o) => s + Number(o.balance != null ? o.balance : o.total || 0),
    0
  );

  const taxArea = intelligence?.health?.areas?.find((a) => a.name === "Tax readiness");
  const taxPct = intelligence?.health?.hasData && taxArea ? Math.round((taxArea.score / taxArea.max) * 100) : null;

  // FADS' Pick — self-employed flavoured, from real data only.
  let pick;
  if (moneyOwed > 0) {
    pick = {
      text: `${fmt(moneyOwed)} is owed to you by clients. Follow up so it comes in.`,
      link: "/finance/invoices",
      label: "Follow up unpaid clients",
    };
  } else if (taxPct != null && taxPct < 80) {
    pick = {
      text: `Your records are ${taxPct}% tax-ready. A few more details would help.`,
      link: "/finance/tax-centre",
      label: "Improve tax readiness",
    };
  } else if (monthNet < 0) {
    pick = { text: "Your costs are higher than your income this month so far.", link: "/finance/transactions", label: "Review spending" };
  } else if (moneyIn === 0 && moneyOut === 0) {
    pick = { text: "Record what you've earned and spent so FADS can help you stay on top of it.", link: "/finance/money-in", label: "Record income" };
  } else {
    pick = { text: "Your records look up to date. Nice work.", link: null, label: null };
  }

  const snapshot = [
    { label: "Money Earned", value: fmt(moneyIn), icon: ArrowDownCircle, tint: "bg-status-ok/10 border-status-ok/20", iconColor: "text-status-ok", link: "/finance/money-in", helper: "This month" },
    { label: "Expenses", value: fmt(moneyOut), icon: ArrowUpCircle, tint: "bg-status-warn/10 border-status-warn/20", iconColor: "text-status-warn", link: "/finance/money-out", helper: "This month" },
    { label: "Money Owed", value: fmt(moneyOwed), icon: FileText, tint: "bg-brand-teal/5 border-brand-teal/20", iconColor: "text-brand-teal", link: "/finance/invoices", helper: moneyOwed > 0 ? "Unpaid invoices" : "Nothing owed" },
    { label: "Business Profit", value: fmt(monthNet), icon: Wallet, tint: "bg-brand-mint/40 border-brand-teal/20", iconColor: "text-brand-teal", link: "/finance", helper: monthNet >= 0 ? "In profit" : "Costs ahead" },
    { label: "Tax Readiness", value: taxPct != null ? `${taxPct}%` : "—", icon: BadgePercent, tint: "bg-brand-teal/5 border-brand-teal/20", iconColor: "text-brand-teal", link: "/finance/tax-centre", helper: taxPct != null ? (taxPct >= 80 ? "Nearly ready" : "Needs work") : "Record more" },
  ];

  const quickActions = [
    { label: "Money In", icon: ArrowDownCircle, link: "/finance/money-in", tint: "bg-status-ok/10", color: "text-status-ok" },
    { label: "Expense", icon: ArrowUpCircle, link: "/finance/money-out", tint: "bg-status-warn/10", color: "text-status-warn" },
    { label: "Invoices", icon: FileText, link: "/finance/invoices", tint: "bg-brand-teal/10", color: "text-brand-teal" },
    { label: "Tax Centre", icon: BadgePercent, link: "/finance/tax-centre", tint: "bg-brand-navy/5", color: "text-brand-navy" },
    { label: "P&L", icon: Banknote, link: "/finance/reports", tint: "bg-brand-navy/5", color: "text-brand-navy" },
    { label: "Ask FADS", icon: MessageCircle, link: "/assistant", tint: "bg-brand-teal/10", color: "text-brand-teal" },
  ];

  const firstName = (user?.full_name?.trim() || "").split(/\s+/)[0] || "";

  return (
    <div className="space-y-6">
      <FadsSelfEmployedHero name={firstName} />

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
          {/* Snapshot — real data only */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
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

          {/* FADS Self-Employed Intelligence — reuses existing BI engine */}
          <BusinessIntelligenceCard
            pick={pick}
            orgType={activeOrg.type}
            title="FADS SELF-EMPLOYED INTELLIGENCE"
            intro="You run the business. FADS looks at what you earn, what you spend, what you're owed and your tax readiness, and helps you decide what to do next."
          />

          {/* Talk to FADS to record money — reuses the same conversational
              finance engine as Driver, with self-employed wording */}
          <TalkToFadsRecorder
            placeholder="e.g. A client paid me €650 today and I spent €45 on supplies"
            safetyNote="Review your records when you have a moment."
            emptyHint={`I couldn't find any clear income or expenses in that. Try something like "A client paid me €650 today and I spent €45 on supplies".`}
            reviewNote="I've prepared that for you. Review and add what's right."
          />

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

          {/* Mini FADS TV — reuses existing intelligence + bulletin */}
          <MiniFadsTv />
        </>
      )}
    </div>
  );
}