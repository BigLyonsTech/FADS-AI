import React, { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useReconciliation } from "@/lib/useReconciliation";
import { useFinance } from "@/lib/useFinance";
import { canManageFinance, formatMoney } from "@/lib/financeWording";
import { computeDifference } from "@/lib/reconciliationUtils";
import ReconciliationStatusBadge from "@/components/finance/ReconciliationStatusBadge";
import BackToFinance from "@/components/finance/BackToFinance";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Plus, Landmark } from "lucide-react";

export default function Reconciliations() {
  const { activeOrg, activeRole, loading: wsLoading } = useWorkspace();
  const rec = useReconciliation();
  const fin = useFinance();
  const canManage = canManageFinance(activeRole);
  const navigate = useNavigate();
  const seededFor = useRef(null);

  // Auto-seed a fictional demo reconciliation for demo orgs (idempotent).
  useEffect(() => {
    if (
      activeOrg?.data_mode === "demo" &&
      !rec.loading &&
      rec.reconciliations.length === 0 &&
      !fin.loading &&
      fin.accounts.length > 0 &&
      canManage &&
      seededFor.current !== activeOrg.id
    ) {
      seededFor.current = activeOrg.id;
      (async () => {
        try {
          await base44.functions.invoke("reconciliation", {
            action: "seed_demo",
            organisation_id: activeOrg.id,
          });
          await rec.reload();
        } catch {
          // non-fatal
        }
      })();
    }
  }, [activeOrg?.id, rec.loading, rec.reconciliations.length, fin.loading, fin.accounts.length, canManage]);

  if (wsLoading || rec.loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <BackToFinance />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Reconciliation</h1>
          <p className="text-sm text-muted-foreground">
            {activeOrg?.name} · {activeOrg?.currency} · {activeOrg?.data_mode === "demo" ? "Demo" : "Live"}
          </p>
        </div>
        {canManage && (
          <Button className="h-11" onClick={() => navigate("/finance/reconciliation/new")}>
            <Plus className="w-4 h-4" /> New Reconciliation
          </Button>
        )}
      </div>

      {rec.reconciliations.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <Landmark className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No reconciliations yet. Upload a bank or cash statement to start matching transactions.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rec.reconciliations.map((r) => {
            const diff = computeDifference(r, []);
            return (
              <Link
                key={r.id}
                to={`/finance/reconciliation/${r.id}`}
                className="block bg-card rounded-xl border border-border p-4 hover:border-brand-teal"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-brand-navy">{r.account_name}</span>
                      <ReconciliationStatusBadge rec={r} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {r.period_start} → {r.period_end}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.matched_count || 0} of {r.imported_count} lines matched
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-brand-navy">{formatMoney(r.closing_balance, r.currency)}</p>
                    <p className="text-xs text-muted-foreground">
                      Open {formatMoney(r.opening_balance, r.currency)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}