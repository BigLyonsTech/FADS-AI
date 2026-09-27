import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";

export function useQuotations() {
  const { activeOrg } = useWorkspace();
  const { dataMode } = useDataMode();
  const orgId = activeOrg?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["quotations", orgId, dataMode],
    queryFn: async () => {
      if (!orgId) return [];
      return base44.entities.Quotation.filter(
        { organisation_id: orgId, data_mode: dataMode },
        "-issue_date",
        300
      );
    },
    enabled: !!orgId,
    staleTime: 30000,
  });

  return {
    quotations: data || [],
    loading: isLoading,
    reload: refetch,
  };
}
