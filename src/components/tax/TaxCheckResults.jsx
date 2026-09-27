import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/currencyFormat";

const SEVERITY_CONFIG = {
  alert: { icon: AlertCircle, color: "text-status-bad", bg: "bg-status-bad/10", border: "border-status-bad/30" },
  warn: { icon: AlertTriangle, color: "text-status-warn", bg: "bg-status-warn/10", border: "border-status-warn/30" },
  info: { icon: Info, color: "text-brand-teal", bg: "bg-brand-teal/10", border: "border-brand-teal/30" },
};

// Displays the FADS Tax Check findings over existing Finance records.
// Never makes a definitive tax decision — every item is a flag for review.
export default function TaxCheckResults({ taxCheck, currency }) {
  const { readiness, findings } = taxCheck;

  const readinessColor =
    readiness >= 80 ? "text-status-ok" : readiness >= 50 ? "text-status-warn" : "text-status-bad";

  return (
    <div className="space-y-4">
      {/* Readiness ring */}
      <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
        <div className={`text-4xl font-bold ${readinessColor}`}>{readiness}%</div>
        <div>
          <p className="font-semibold text-brand-navy">Tax Ready</p>
          <p className="text-xs text-muted-foreground">
            {findings.length === 0
              ? "No issues flagged — your records look clean."
              : `${findings.length} area${findings.length > 1 ? "s" : ""} need attention before filing.`}
          </p>
        </div>
      </div>

      {findings.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-status-ok mx-auto mb-2" />
          <p className="font-medium text-brand-navy">All clear</p>
          <p className="text-sm text-muted-foreground mt-1">
            FADS didn't find uncategorized transactions, missing receipts, duplicates or incomplete records.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {findings.map((f) => {
            const cfg = SEVERITY_CONFIG[f.severity] || SEVERITY_CONFIG.warn;
            const Icon = cfg.icon;
            return (
              <div key={f.type} className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-4`}>
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 ${cfg.color} shrink-0 mt-0.5`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-brand-navy">{f.title}</p>
                      <span className={`text-sm font-semibold ${cfg.color}`}>{f.count}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{f.detail}</p>
                    {f.items.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {f.items.map((t) => (
                          <Link
                            key={t.id}
                            to={`/finance/transactions/${t.id}`}
                            className="flex items-center justify-between bg-card rounded-lg p-2 border border-border hover:border-brand-teal"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-brand-navy truncate">
                                {t.description || t.reference || "—"}
                              </p>
                              <p className="text-[11px] text-muted-foreground">{t.date}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs font-semibold text-brand-navy">
                                {t.direction === "in" ? "+" : "−"}
                                {formatCurrency(t.amount, t.currency || currency)}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}