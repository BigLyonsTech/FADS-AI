import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";

// Loads reconciliation sessions for the active organisation. Reads go
// through the client SDK; RLS ensures only the active org's records return.
export function useReconciliation() {
  const { activeOrg } = useWorkspace();
  const orgId = activeOrg?.id;
  const [reconciliations, setReconciliations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) {
      setReconciliations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const recs = await base44.entities.Reconciliation.filter(
        { organisation_id: orgId },
        "-created_date",
        100
      );
      setReconciliations(recs);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  return { reconciliations, loading, reload: load };
}

// Loads a single reconciliation with its statement lines and the cleared
// transactions for the same account (used for manual matching).
export function useReconciliationDetail(id) {
  const { activeOrg } = useWorkspace();
  const orgId = activeOrg?.id;
  const [reconciliation, setReconciliation] = useState(null);
  const [lines, setLines] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!id || !orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rec = await base44.entities.Reconciliation.get(id);
      setReconciliation(rec);
      const [lns, txns] = await Promise.all([
        base44.entities.StatementLine.filter({ organisation_id: orgId, reconciliation_id: id }, "row_index"),
        base44.entities.FinanceTransaction.filter(
          { organisation_id: orgId, account_id: rec.account_id, status: "cleared" },
          "-date",
          200
        ),
      ]);
      setLines(lns);
      setTransactions(txns);
    } catch (e) {
      setError(e.message || "Failed to load reconciliation");
    } finally {
      setLoading(false);
    }
  }, [id, orgId]);

  useEffect(() => {
    load();
  }, [load]);

  return { reconciliation, lines, transactions, loading, error, reload: load };
}