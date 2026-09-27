import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";

// Payroll V1 data for the active organisation, filtered by Demo/Live mode.
// Drafts are managed client-side (PayrollRun RLS allows org members).
// Posting + mark-paid go through the backend "payroll" function so salary
// expenses are created, audited, and idempotent.
export function usePayroll() {
  const { activeOrg } = useWorkspace();
  const { dataMode } = useDataMode();
  const orgId = activeOrg?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["payroll", orgId, dataMode],
    queryFn: async () => {
      if (!orgId) return [];
      return base44.entities.PayrollRun.filter(
        { organisation_id: orgId, data_mode: dataMode },
        "-pay_period_end",
        200
      );
    },
    enabled: !!orgId,
    staleTime: 30000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["payroll", orgId, dataMode] });

  const createRun = async (data) => {
    const r = await base44.entities.PayrollRun.create(data);
    invalidate();
    return r;
  };
  const updateRun = async (id, patch) => {
    const r = await base44.entities.PayrollRun.update(id, patch);
    invalidate();
    return r;
  };
  const deleteRun = async (id) => {
    await base44.entities.PayrollRun.delete(id);
    invalidate();
  };
  const getRun = async (id) => base44.entities.PayrollRun.get(id);
  const postRun = async (run_id) =>
    base44.functions.invoke("payroll", { action: "post_run", organisation_id: orgId, run_id });
  const markPaid = async (run_id) =>
    base44.functions.invoke("payroll", { action: "mark_paid", organisation_id: orgId, run_id });

  return {
    runs: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    reload: query.refetch,
    createRun,
    updateRun,
    deleteRun,
    getRun,
    postRun,
    markPaid,
  };
}