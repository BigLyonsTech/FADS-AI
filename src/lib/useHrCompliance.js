import { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";

// All HR compliance data access goes through the hrCompliance backend function.
export function useHrCompliance() {
  const { activeOrg } = useWorkspace();
  const orgId = activeOrg?.id;

  const invoke = useCallback(async (payload) => {
    const res = await base44.functions.invoke("hrCompliance", { ...payload, organisation_id: orgId });
    return res.data;
  }, [orgId]);

  const listItems = useCallback(async (filters = {}) => invoke({ action: "list_items", ...filters }), [invoke]);
  const getAlerts = useCallback(async () => invoke({ action: "get_alerts" }), [invoke]);
  const createItem = useCallback(async (data) => invoke({ action: "create_item", ...data }), [invoke]);
  const updateItem = useCallback(async (item_id, patch) => invoke({ action: "update_item", item_id, ...patch }), [invoke]);
  const deleteItem = useCallback(async (item_id) => invoke({ action: "delete_item", item_id }), [invoke]);
  const completeItem = useCallback(async (item_id, completion_notes) => invoke({ action: "complete_item", item_id, completion_notes }), [invoke]);

  const seedDemo = useCallback(async () => invoke({ action: "seed_demo" }), [invoke]);

  return {
    orgId,
    invoke,
    listItems,
    getAlerts,
    createItem,
    updateItem,
    deleteItem,
    completeItem,
    seedDemo,
  };
}