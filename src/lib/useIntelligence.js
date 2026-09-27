import { useMemo } from "react";
import { useFinance } from "@/lib/useFinance";
import { useInvoices } from "@/lib/useInvoices";
import { useWorkspace } from "@/lib/useWorkspace";
import { computeIntelligence } from "@/lib/businessIntelligence";

// Loads existing Finance + Invoice data for the active organisation and
// computes the full FADS Business Intelligence picture (cashflow, debt,
// guardian, health, funding readiness, energy insight). No extra API calls —
// it reuses the data already loaded by useFinance / useInvoices.
export function useIntelligence() {
  const { activeOrg } = useWorkspace();
  const finance = useFinance();
  const { invoices } = useInvoices();

  const intelligence = useMemo(() => {
    if (!activeOrg) return null;
    return computeIntelligence(finance, invoices, activeOrg);
  }, [activeOrg, finance, invoices]);

  return {
    intelligence,
    finance,
    invoices,
    org: activeOrg,
    loading: finance.loading,
    reload: finance.reload,
  };
}