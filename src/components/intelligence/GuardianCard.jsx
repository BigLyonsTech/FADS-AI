import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Check, Eye, AlertCircle, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/currencyFormat";

// Business Guardian — lightweight anomaly detection from existing financial
// records. Never claims fraud; uses "possible", "unusual", "worth reviewing".
// Review state (Reviewed / Expected / Needs attention) is stored locally per
// anomaly for V1 — a future schema-backed status is noted as a follow-up.
export default function GuardianCard({ guardian, currency, orgId }) {
  const [dismissed, setDismissed] = useState({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`fads_guardian_${orgId}`);
      if (raw) setDismissed(JSON.parse(raw));
    } catch {}
  }, [orgId]);

  const persist = (next) => {
    setDismissed(next);
    try {
      localStorage.setItem(`fads_guardian_${orgId}`, JSON.stringify(next));
    } catch {}
  };

  const mark = (key, status) => persist({ ...dismissed, [key]: status });

  if (!guardian?.hasData) {
    return (
      <div className="bg-card rounded-2xl border border-brand-teal/15 p-5">
        <Header />
        <p className="text-sm text-muted-foreground mt-3">Not enough recorded data to monitor for anomalies.</p>
      </div>
    );
  }

  const visible = guardian.anomalies.filter((a) => {
    const key = anomalyKey(a);
    return !dismissed[key];
  });

  return (
    <div className="bg-card rounded-2xl border border-brand-teal/15 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Header />
        <span className="text-xs text-muted-foreground">{visible.length} item(s) to review</span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        FADS flags unusual patterns from your records — possible duplicates, large transactions, spending spikes. This is not bank-grade fraud detection.
      </p>
      {visible.length === 0 ? (
        <div className="bg-status-ok/10 border border-status-ok/30 rounded-xl p-4 flex items-center gap-2">
          <Check className="w-4 h-4 text-status-ok" />
          <p className="text-sm text-brand-navy">No unusual patterns detected in your recent records.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((a) => {
            const key = anomalyKey(a);
            return (
              <div key={key} className="bg-muted/30 rounded-xl p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${a.severity === "warn" ? "text-status-warn" : "text-brand-teal"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-brand-navy">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>
                  </div>
                </div>
                <div className="flex gap-2 pl-6 flex-wrap">
                  <button
                    onClick={() => mark(key, "reviewed")}
                    className="text-[11px] px-2 py-1 rounded-md bg-status-ok/15 text-status-ok font-medium flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Reviewed
                  </button>
                  <button
                    onClick={() => mark(key, "expected")}
                    className="text-[11px] px-2 py-1 rounded-md bg-muted text-muted-foreground font-medium flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> Expected
                  </button>
                  <button
                    onClick={() => mark(key, "needs_attention")}
                    className="text-[11px] px-2 py-1 rounded-md bg-status-bad/15 text-status-bad font-medium"
                  >
                    Needs attention
                  </button>
                  {a.url && (
                    <Link
                      to={a.url}
                      className="text-[11px] px-2 py-1 rounded-md bg-brand-navy text-white font-medium flex items-center gap-1 hover:opacity-90"
                    >
                      Fix this <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function anomalyKey(a) {
  return `${a.type}|${(a.ids || []).join(",")}|${(a.detail || "").slice(0, 40)}`;
}

function Header() {
  return (
    <div className="flex items-center gap-2">
      <ShieldCheck className="w-5 h-5 text-brand-teal" />
      <h2 className="font-semibold text-brand-navy">Business Guardian</h2>
    </div>
  );
}