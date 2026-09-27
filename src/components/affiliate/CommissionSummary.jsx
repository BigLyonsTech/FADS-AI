import React from "react";
import { Clock, CheckCircle2, Wallet } from "lucide-react";

function formatMoney(amount, currency) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount || 0);
  } catch {
    return `${currency || ""} ${Number(amount || 0).toFixed(2)}`;
  }
}

export default function CommissionSummary({ profile }) {
  const cards = [
    {
      label: "Pending",
      value: formatMoney(profile.total_pending_commission, profile.payout_currency),
      icon: Clock,
      color: "text-status-warn",
      bg: "bg-status-warn/10",
    },
    {
      label: "Approved",
      value: formatMoney(profile.total_approved_commission, profile.payout_currency),
      icon: CheckCircle2,
      color: "text-status-ok",
      bg: "bg-status-ok/10",
    },
    {
      label: "Paid",
      value: formatMoney(profile.total_paid_commission, profile.payout_currency),
      icon: Wallet,
      color: "text-brand-teal",
      bg: "bg-brand-teal/10",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-card rounded-xl border border-border p-4">
          <div className={`w-9 h-9 rounded-lg ${c.bg} ${c.color} flex items-center justify-center mb-2`}>
            <c.icon className="w-5 h-5" />
          </div>
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="text-lg font-bold text-brand-navy mt-1">{c.value}</p>
        </div>
      ))}
    </div>
  );
}