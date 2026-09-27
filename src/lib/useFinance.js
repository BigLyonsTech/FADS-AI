import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";

// Loads all finance data for the active organisation, filtered by the
// selected Demo / Live data mode. Uses React Query for caching so
// page-to-page transitions show cached data immediately without a
// blocking loading screen. Balances and period totals are derived from
// the loaded transactions.
export function useFinance() {
  const { activeOrg } = useWorkspace();
  const { dataMode } = useDataMode();
  const orgId = activeOrg?.id;
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["finance", orgId, dataMode],
    queryFn: async () => {
      if (!orgId) return { accounts: [], categories: [], contacts: [], transactions: [] };
      const [acc, cat, con, txn] = await Promise.all([
        base44.entities.FinanceAccount.filter({ organisation_id: orgId, data_mode: dataMode }),
        base44.entities.FinanceCategory.filter({ organisation_id: orgId, data_mode: dataMode }),
        base44.entities.FinanceContact.filter({ organisation_id: orgId, data_mode: dataMode }),
        base44.entities.FinanceTransaction.filter({ organisation_id: orgId, data_mode: dataMode }, "-date", 500),
      ]);
      return { accounts: acc, categories: cat, contacts: con, transactions: txn };
    },
    enabled: !!orgId,
    staleTime: 30000,
  });

  const accounts = data?.accounts || [];
  const categories = data?.categories || [];
  const contacts = data?.contacts || [];
  const transactions = data?.transactions || [];

  // Optimistic remove: updates the cache immediately before the network call
  const removeTransaction = useCallback((id) => {
    queryClient.setQueryData(["finance", orgId, dataMode], (old) => {
      if (!old) return old;
      return { ...old, transactions: old.transactions.filter((t) => t.id !== id) };
    });
  }, [queryClient, orgId, dataMode]);

  const cleared = transactions.filter((t) => t.status === "cleared" || t.status === "completed");
  const totalBalance =
    accounts.reduce((s, a) => s + (Number(a.opening_balance) || 0), 0) +
    cleared.reduce(
      (s, t) => s + (t.direction === "in" ? Number(t.amount) : -Number(t.amount)),
      0
    );

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const inMonth = (t) => t.date && t.date.startsWith(monthKey);
  const moneyIn = cleared
    .filter((t) => t.direction === "in" && inMonth(t))
    .reduce((s, t) => s + Number(t.amount), 0);
  const moneyOut = cleared
    .filter((t) => t.direction === "out" && inMonth(t))
    .reduce((s, t) => s + Number(t.amount), 0);
  const outstanding = transactions.filter((t) => t.status === "pending");
  const cancelled = transactions.filter((t) => t.status === "cancelled");

  return {
    accounts,
    categories,
    contacts,
    transactions,
    totalBalance,
    moneyIn,
    moneyOut,
    outstanding,
    cancelled,
    loading: isLoading,
    loadError: isError ? error : null,
    reload: refetch,
    removeTransaction,
  };
}