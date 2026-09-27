import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/financeWording";
import { Wallet, Clock, AlertCircle, TrendingUp } from "lucide-react";

// Summary cards for the Money Owed page: Total owed, Due soon, Overdue,
// Collected this month. Labels adapt via the collectionsWording passed in.
export default function CollectionsSummary({ summary, currency, wording }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <SummaryCard
        label={wording.expectedLabel}
        value={formatMoney(summary.totalOwed, currency)}
        sublabel={`${summary.count} account${summary.count === 1 ? "" : "s"}`}
        icon={Wallet}
        tone="navy"
      />
      <SummaryCard
        label={wording.dueSoonLabel}
        value={formatMoney(summary.dueSoonTotal, currency)}
        sublabel={`${summary.dueSoonCount} due soon`}
        icon={Clock}
        tone="warn"
      />
      <SummaryCard
        label={wording.overdueLabel}
        value={formatMoney(summary.overdueTotal, currency)}
        sublabel={`${summary.overdueCount} overdue`}
        icon={AlertCircle}
        tone={summary.overdueCount > 0 ? "bad" : "ok"}
      />
      <SummaryCard
        label={wording.collectedLabel}
        value={formatMoney(summary.collectedThisMonth, currency)}
        sublabel="This month"
        icon={TrendingUp}
        tone="ok"
      />
    </div>
  );
}

function SummaryCard({ label, value, sublabel, icon: Icon, tone }) {
  const toneClass = {
    navy: "text-brand-navy",
    warn: "text-status-warn",
    bad: "text-status-bad",
    ok: "text-status-ok",
  }[tone] || "text-brand-navy";
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </div>
        <div className={`text-lg sm:text-xl font-bold ${toneClass}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{sublabel}</div>
      </CardContent>
    </Card>
  );
}