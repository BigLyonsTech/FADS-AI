import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import { formatMoney } from "@/lib/financeWording";
import {
  Bot, Receipt as ReceiptIcon, ArrowDownLeft, ArrowUpRight,
  Wallet, FileText, ChevronRight,
} from "lucide-react";

// FADS Money Player — a compact Y2K-style AI control panel for the Finance
// dashboard. Uses REAL existing Finance data (balance, monthly income,
// monthly expenses, outstanding invoices) to show the cash position and
// recommend one next action. No invented financial advice.
//
// The player answers: "What is happening with my money?" and then:
// "What should I do next?"
export default function FadsMoneyPlayer({
  totalBalance,
  moneyIn,
  moneyOut,
  outstandingTotal,
  currency,
  wording,
  onScanReceipt,
  canManage,
}) {
  const w = wording || {};

  const insight = useMemo(() => {
    const hasData = Number(totalBalance) !== 0 || Number(moneyIn) > 0 || Number(moneyOut) > 0;
    const owes = Number(outstandingTotal) > 0;
    const spendingHigh = Number(moneyOut) > Number(moneyIn) && Number(moneyOut) > 0;

    if (!hasData) {
      return {
        message: "No money recorded yet. Record your first transaction to see your cash position.",
        nextAction: { label: "Record Income", to: "/finance/money-in", icon: ArrowDownLeft },
      };
    }
    if (owes) {
      return {
        message: `Your recorded cash position looks okay today. You have ${formatMoney(outstandingTotal, currency)} waiting to be collected.`,
        nextAction: { label: "Collect Money Owed", to: "/finance/invoices", icon: FileText },
      };
    }
    if (spendingHigh) {
      return {
        message: "Spending is currently higher than recorded income this month. Want me to show you why?",
        nextAction: { label: "Review Spending", to: "/finance/transactions", icon: ArrowUpRight },
      };
    }
    return {
      message: "Your recorded cash position looks okay today.",
      nextAction: { label: "Record Today's Income", to: "/finance/money-in", icon: ArrowDownLeft },
    };
  }, [totalBalance, moneyIn, moneyOut, outstandingTotal, currency]);

  return (
    <div className="bg-brand-navy rounded-2xl p-5 sm:p-6 space-y-4 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FadsRobotAvatar size="sm" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-teal font-semibold">FADS MONEY</p>
        </div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-status-ok animate-pulse" />
          LIVE
        </p>
      </div>

      {/* Money metrics — 2x2 grid */}
      <div className="grid grid-cols-2 gap-2">
        <MoneyTile
          icon={Wallet}
          label="Cash Now"
          value={formatMoney(totalBalance, currency)}
        />
        <MoneyTile
          icon={ArrowDownLeft}
          label={w.moneyIn || "Money In"}
          value={formatMoney(moneyIn, currency)}
          sub="This month"
          accent="ok"
        />
        <MoneyTile
          icon={ArrowUpRight}
          label={w.moneyOut || "Money Out"}
          value={formatMoney(moneyOut, currency)}
          sub="This month"
          accent="bad"
        />
        <MoneyTile
          icon={FileText}
          label="Money Owed"
          value={formatMoney(outstandingTotal, currency)}
          sub={Number(outstandingTotal) > 0 ? "To collect" : "All clear"}
          accent={Number(outstandingTotal) > 0 ? "warn" : "ok"}
        />
      </div>

      {/* FADS says */}
      <div className="flex items-start gap-2 bg-white/5 rounded-xl p-3">
        <FadsRobotAvatar size="sm" className="shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-brand-teal font-medium mb-0.5">FADS says</p>
          <p className="text-xs text-white/80 leading-relaxed">&ldquo;{insight.message}&rdquo;</p>
        </div>
      </div>

      {/* Next action + Ask FADS */}
      <div className="flex gap-2">
        <Link
          to={insight.nextAction.to}
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-brand-teal text-brand-navy hover:bg-brand-teal/90 rounded-xl py-3 text-sm font-medium min-h-touch transition-colors"
        >
          <insight.nextAction.icon className="w-4 h-4" /> {insight.nextAction.label}
        </Link>
        <Link
          to="/assistant?q=what+is+happening+with+my+money"
          className="inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white rounded-xl py-3 px-4 text-sm font-medium min-h-touch transition-colors"
        >
          <Bot className="w-4 h-4" /> Ask FADS
        </Link>
      </div>

      {/* Scan Receipt — kept prominent */}
      {canManage && onScanReceipt && (
        <button
          onClick={onScanReceipt}
          className="w-full inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl py-2.5 text-xs font-medium min-h-touch transition-colors"
        >
          <ReceiptIcon className="w-3.5 h-3.5 text-brand-teal" /> Scan Receipt
        </button>
      )}
    </div>
  );
}

function MoneyTile({ icon: Icon, label, value, sub, accent }) {
  const accentColor =
    accent === "ok" ? "text-status-ok" : accent === "bad" ? "text-status-bad" : accent === "warn" ? "text-status-warn" : "text-brand-teal";
  return (
    <div className="bg-white/5 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${accentColor}`} />
        <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">{label}</p>
      </div>
      <p className="text-lg font-bold font-mono text-white leading-tight break-words">{value}</p>
      {sub && <p className={`text-[9px] uppercase tracking-wider mt-0.5 ${accentColor}`}>{sub}</p>}
    </div>
  );
}