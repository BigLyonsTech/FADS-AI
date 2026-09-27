import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";

// Loads all invoice, payment and receipt data for the active organisation.
// Uses React Query for caching so transitions show cached data immediately
// without a blocking loading screen.
export function useInvoices() {
  const { activeOrg } = useWorkspace();
  const { dataMode } = useDataMode();
  const orgId = activeOrg?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["invoices", orgId, dataMode],
    queryFn: async () => {
      if (!orgId) return { invoices: [], payments: [], receipts: [] };
      const [inv, pay, rct] = await Promise.all([
        base44.entities.Invoice.filter({ organisation_id: orgId, data_mode: dataMode }, "-issue_date", 200),
        base44.entities.InvoicePayment.filter({ organisation_id: orgId, data_mode: dataMode }, "-date", 500),
        base44.entities.Receipt.filter({ organisation_id: orgId, data_mode: dataMode }, "-date", 200),
      ]);
      return { invoices: inv, payments: pay, receipts: rct };
    },
    enabled: !!orgId,
    staleTime: 30000,
  });

  return {
    invoices: data?.invoices || [],
    payments: data?.payments || [],
    receipts: data?.receipts || [],
    loading: isLoading,
    reload: refetch,
  };
}