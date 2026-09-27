import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";

// Loads all inventory items + stock movements for the active organisation,
// filtered by the selected Demo / Live data mode. Uses React Query for
// caching. Current stock (current_quantity) is maintained server-side by
// the inventory backend function, so the frontend reads it as-is.
export function useInventory() {
  const { activeOrg } = useWorkspace();
  const { dataMode } = useDataMode();
  const orgId = activeOrg?.id;
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["inventory", orgId, dataMode],
    queryFn: async () => {
      if (!orgId) return { items: [], movements: [] };
      const [items, movements] = await Promise.all([
        base44.entities.InventoryItem.filter({ organisation_id: orgId, data_mode: dataMode }, "-updated_date", 1000),
        base44.entities.StockMovement.filter({ organisation_id: orgId, data_mode: dataMode }, "-date", 2000),
      ]);
      return { items, movements };
    },
    enabled: !!orgId,
    staleTime: 15000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["inventory", orgId, dataMode] });

  return {
    items: data?.items || [],
    movements: data?.movements || [],
    loading: isLoading,
    reload: refetch,
    invalidate,
  };
}