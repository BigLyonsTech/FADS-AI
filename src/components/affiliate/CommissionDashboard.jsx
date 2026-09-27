import React from "react";
import {
  Clock, CheckCircle2, Wallet, TrendingUp, Users, Building2, RotateCcw,
} from "lucide-react";

function formatMoney(amount, currency) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount || 0);
  } catch {
    return `${currency || ""} ${Number(amount || 0).toFixed(2)}`;
  }
}

const STATUS_CONFIG = {
  pending: { label: "Pending", cls: "bg-status-warn/10 text-status-warn" },
  approved: { label: "Approved", cls: "bg-status-ok/10 text-status-ok" },
  paid: { label: "Paid", cls: "bg-brand-teal/10 text-brand-teal" },
  cancelled: { label: "Reversed", cls: "bg-destructive/10 text-destructive" },
};

function StatCard({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className={`w-9 h-9 rounded-lg ${bg} ${color} flex items-center justify-center mb-2`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-brand-navy mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function CommissionDashboard({ profile, commissions, attributions }) {
  const payoutCurrency = profile?.payout_currency || "EUR";

  const totalEarned =
    (profile?.total_pending_commission || 0) +
    (profile?.total_approved_commission || 0) +
    (profile?.total_paid_commission || 0);

  const referredCount = attributions?.length || 0;
  const activeSubs = (attributions || []).filter(
    (a) => a.referred_organisation_status === "active"
  ).length;

  // Sort by created_date descending, cap at 20
  const recent = [...(commissions || [])].sort(
    (a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)
  ).slice(0, 20);

  return (
    <div className="space-y-5">
      {/* ── Summary stats ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={TrendingUp}
          label="Total Earned"
          value={formatMoney(totalEarned, payoutCurrency)}
          sub={`in ${payoutCurrency}`}
          color="text-brand-navy"
          bg="bg-brand-navy/10"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={formatMoney(profile?.total_pending_commission, payoutCurrency)}
          color="text-status-warn"
          bg="bg-status-warn/10"
        />
        <StatCard
          icon={CheckCircle2}
          label="Approved"
          value={formatMoney(profile?.total_approved_commission, payoutCurrency)}
          color="text-status-ok"
          bg="bg-status-ok/10"
        />
        <StatCard
          icon={Wallet}
          label="Paid"
          value={formatMoney(profile?.total_paid_commission, payoutCurrency)}
          color="text-brand-teal"
          bg="bg-brand-teal/10"
        />
      </div>

      {/* ── Referral stats ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Users}
          label="Referred Customers"
          value={referredCount}
          color="text-brand-navy"
          bg="bg-brand-navy/5"
        />
        <StatCard
          icon={Building2}
          label="Active Subscriptions"
          value={activeSubs}
          color="text-status-ok"
          bg="bg-status-ok/10"
        />
      </div>

      {/* ── Recent commission activity ─────────────────────── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-brand-navy">Recent Commission Activity</h3>
        </div>

        {recent.length === 0 ? (
          <div className="p-8 text-center">
            <Wallet className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No commission activity yet.</p>
            <p className="text-muted-foreground/70 text-xs mt-1">
              Commissions appear after referred customers make their first monthly payment.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((c) => {
              const status = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
              const rateLabel =
                c.type === "percentage" ? `${c.value}%` : formatMoney(c.value, c.currency);
              const isReversed = c.status === "cancelled";
              return (
                <div
                  key={c.id}
                  className={`p-4 flex items-start justify-between gap-3 ${
                    isReversed ? "opacity-60" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {isReversed && (
                        <RotateCcw className="w-3.5 h-3.5 text-destructive shrink-0" />
                      )}
                      <p className="font-medium text-brand-navy truncate">
                        {c.organisation_name || "Unknown organisation"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                      <span>
                        {new Date(c.created_date || c.verified_date || c.approved_date).toLocaleDateString()}
                      </span>
                      <span>·</span>
                      <span>Rate: {rateLabel}</span>
                      {c.frequency === "recurring" && (
                        <>
                          <span>·</span>
                          <span>Recurring</span>
                        </>
                      )}
                      {c.currency && c.currency !== payoutCurrency && (
                        <>
                          <span>·</span>
                          <span>Paid in {c.currency}</span>
                        </>
                      )}
                    </div>
                    {isReversed && c.description?.includes("Cancelled") && (
                      <p className="text-xs text-destructive/80 mt-1 truncate">
                        {c.description.match(/\[Cancelled:.*?\]/)?.[0]?.replace(/[\[\]]/g, "") || "Reversed due to refund"}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`font-bold ${
                        isReversed ? "text-muted-foreground line-through" : "text-brand-navy"
                      }`}
                    >
                      {formatMoney(c.amount, c.currency)}
                    </p>
                    <span
                      className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.cls}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}