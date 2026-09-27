import { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";

// All HR leave data access goes through the hrLeave backend function
// so the server can enforce HR-role access control and audit every action.
export function useHrLeave() {
  const { activeOrg } = useWorkspace();
  const orgId = activeOrg?.id;

  const invoke = useCallback(async (payload) => {
    const res = await base44.functions.invoke("hrLeave", { ...payload, organisation_id: orgId });
    return res.data;
  }, [orgId]);

  // Leave types
  const loadLeaveTypes = useCallback(async () => invoke({ action: "list_leave_types" }), [invoke]);
  const createLeaveType = useCallback(async (data) => invoke({ action: "create_leave_type", ...data }), [invoke]);
  const updateLeaveType = useCallback(async (leave_type_id, patch) => invoke({ action: "update_leave_type", leave_type_id, ...patch }), [invoke]);
  const deleteLeaveType = useCallback(async (leave_type_id) => invoke({ action: "delete_leave_type", leave_type_id }), [invoke]);

  // Policies
  const loadPolicies = useCallback(async () => invoke({ action: "list_policies" }), [invoke]);
  const createPolicy = useCallback(async (data) => invoke({ action: "create_policy", ...data }), [invoke]);
  const updatePolicy = useCallback(async (policy_id, patch) => invoke({ action: "update_policy", policy_id, ...patch }), [invoke]);
  const deletePolicy = useCallback(async (policy_id) => invoke({ action: "delete_policy", policy_id }), [invoke]);

  // Balances
  const listBalances = useCallback(async (employee_id) => invoke({ action: "list_balances", employee_id }), [invoke]);
  const getBalances = useCallback(async (employee_id) => invoke({ action: "get_balances", employee_id }), [invoke]);
  const adjustBalance = useCallback(async (balance_id, data) => invoke({ action: "adjust_balance", balance_id, ...data }), [invoke]);

  // Requests
  const listRequests = useCallback(async (filters = {}) => invoke({ action: "list_requests", ...filters }), [invoke]);
  const getRequest = useCallback(async (request_id) => invoke({ action: "get_request", request_id }), [invoke]);
  const createRequest = useCallback(async (data) => invoke({ action: "create_request", ...data }), [invoke]);
  const approveRequest = useCallback(async (request_id, decision_comments) => invoke({ action: "approve_request", request_id, decision_comments }), [invoke]);
  const rejectRequest = useCallback(async (request_id, decision_comments) => invoke({ action: "reject_request", request_id, decision_comments }), [invoke]);
  const cancelRequest = useCallback(async (request_id, cancel_reason) => invoke({ action: "cancel_request", request_id, cancel_reason }), [invoke]);

  // Calendar
  const listCalendar = useCallback(async (start_date, end_date) => invoke({ action: "list_calendar", start_date, end_date }), [invoke]);

  const seedDemo = useCallback(async () => invoke({ action: "seed_demo" }), [invoke]);

  return {
    orgId,
    invoke,
    loadLeaveTypes,
    createLeaveType,
    updateLeaveType,
    deleteLeaveType,
    loadPolicies,
    createPolicy,
    updatePolicy,
    deletePolicy,
    listBalances,
    getBalances,
    adjustBalance,
    listRequests,
    getRequest,
    createRequest,
    approveRequest,
    rejectRequest,
    cancelRequest,
    listCalendar,
    seedDemo,
  };
}