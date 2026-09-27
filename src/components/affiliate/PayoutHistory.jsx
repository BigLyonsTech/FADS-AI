import React from "react";
import { Wallet } from "lucide-react";

const STATUS_STYLES = {
  pending: "bg-status-warn/10 text-status-warn",
  approved: "bg-brand-teal/10 text-brand-teal",
  rejected: "bg-destructive/10 text-destructive",
  processed: "bg-status-ok/10 text-status-ok",
  completed: "bg-status-ok/10 text-status-ok",
  failed: "bg-destructive/10 text-destructive",
};

function formatMoney(amount, currency) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount || 0);
  } catch {
    return `${currency || ""} ${Number(amount || 0).toFixed(2)}`;
  }
}

export default function PayoutHistory({ payoutRequests, payoutRecords }) {
  const hasData =
    (payoutRequests && payoutRequests.length > 0) ||
    (payoutRecords && payoutRecords.length > 0);

  if (!hasData) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <Wallet className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">No payout history yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {payoutRecords && payoutRecords.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-brand-navy">Payouts</h3>
          </div>
          <div className="divide-y divide-border">
            {payoutRecords.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-brand-navy">{formatMoney(r.amount, r.currency)}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.payment_method} · {new Date(r.processed_date).toLocaleDateString()}
                    {r.payment_reference ? ` · Ref: ${r.payment_reference}` : ""}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[r.status] || ""}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {payoutRequests && payoutRequests.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-brand-navy">Payout Requests</h3>
          </div>
          <div className="divide-y divide-border">
            {payoutRequests.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-brand-navy">{formatMoney(r.requested_amount, r.currency)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.requested_date).toLocaleDateString()}
                    {r.rejection_reason ? ` · ${r.rejection_reason}` : ""}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[r.status] || ""}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}