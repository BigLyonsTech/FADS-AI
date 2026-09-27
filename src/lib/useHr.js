import { useState, useCallback } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";

// All HR data access goes through the backend function (not the client SDK)
// so the server can enforce HR-role access control and strip restricted fields.
// Data is filtered by the selected Demo / Live mode. Uses React Query for
// caching so transitions show cached data immediately without a blocking
// loading screen.
export function useHr() {
  const { activeOrg, activeRole } = useWorkspace();
  const { dataMode } = useDataMode();
  const orgId = activeOrg?.id;
  const orgType = activeOrg?.type;
  const queryClient = useQueryClient();
  const [employeeFilters, setEmployeeFilters] = useState({});

  const invoke = useCallback(async (payload) => {
    const res = await base44.functions.invoke("hr", { ...payload, organisation_id: orgId, data_mode: dataMode });
    return res.data;
  }, [orgId, dataMode]);

  const dashboardQuery = useQuery({
    queryKey: ["hr-dashboard", orgId, dataMode],
    queryFn: async () => {
      if (!orgId) return null;
      return invoke({ action: "get_dashboard" });
    },
    enabled: !!orgId,
    staleTime: 60000,
  });

  const employeesQuery = useQuery({
    queryKey: ["hr-employees", orgId, dataMode, employeeFilters],
    queryFn: async () => {
      if (!orgId) return { employees: [], departments: [], job_roles: [], work_locations: [] };
      return invoke({ action: "list_employees", ...employeeFilters });
    },
    enabled: !!orgId,
    staleTime: 60000,
    placeholderData: keepPreviousData,
  });

  const invalidateHr = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["hr-employees", orgId, dataMode] });
    queryClient.invalidateQueries({ queryKey: ["hr-dashboard", orgId, dataMode] });
  }, [queryClient, orgId, dataMode]);

  const loadDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["hr-dashboard", orgId] });
  }, [queryClient, orgId]);

  const loadEmployees = useCallback((filters = {}) => {
    setEmployeeFilters(filters);
    queryClient.invalidateQueries({ queryKey: ["hr-employees", orgId] });
  }, [queryClient, orgId]);

  const getEmployee = useCallback(async (employee_id) => {
    return invoke({ action: "get_employee", employee_id });
  }, [invoke]);

  const createEmployee = useCallback(async (data) => {
    const r = await invoke({ action: "create_employee", ...data });
    invalidateHr();
    return r;
  }, [invoke, invalidateHr]);

  const updateEmployee = useCallback(async (employee_id, patch) => {
    const r = await invoke({ action: "update_employee", employee_id, ...patch });
    invalidateHr();
    return r;
  }, [invoke, invalidateHr]);

  const offboardEmployee = useCallback(async (employee_id, end_date, notes) => {
    const r = await invoke({ action: "offboard_employee", employee_id, end_date, notes });
    invalidateHr();
    return r;
  }, [invoke, invalidateHr]);

  const deleteEmployee = useCallback(async (employee_id) => {
    const r = await invoke({ action: "delete_employee", employee_id });
    invalidateHr();
    return r;
  }, [invoke, invalidateHr]);

  // Departments
  const createDepartment = useCallback(async (data) => { const r = await invoke({ action: "create_department", ...data }); invalidateHr(); return r; }, [invoke, invalidateHr]);
  const updateDepartment = useCallback(async (department_id, patch) => { const r = await invoke({ action: "update_department", department_id, ...patch }); invalidateHr(); return r; }, [invoke, invalidateHr]);
  const deleteDepartment = useCallback(async (department_id) => { const r = await invoke({ action: "delete_department", department_id }); invalidateHr(); return r; }, [invoke, invalidateHr]);

  // Job roles
  const createJobRole = useCallback(async (data) => { const r = await invoke({ action: "create_job_role", ...data }); invalidateHr(); return r; }, [invoke, invalidateHr]);
  const updateJobRole = useCallback(async (job_role_id, patch) => { const r = await invoke({ action: "update_job_role", job_role_id, ...patch }); invalidateHr(); return r; }, [invoke, invalidateHr]);
  const deleteJobRole = useCallback(async (job_role_id) => { const r = await invoke({ action: "delete_job_role", job_role_id }); invalidateHr(); return r; }, [invoke, invalidateHr]);

  // Work locations
  const createWorkLocation = useCallback(async (data) => { const r = await invoke({ action: "create_work_location", ...data }); invalidateHr(); return r; }, [invoke, invalidateHr]);
  const updateWorkLocation = useCallback(async (work_location_id, patch) => { const r = await invoke({ action: "update_work_location", work_location_id, ...patch }); invalidateHr(); return r; }, [invoke, invalidateHr]);
  const deleteWorkLocation = useCallback(async (work_location_id) => { const r = await invoke({ action: "delete_work_location", work_location_id }); invalidateHr(); return r; }, [invoke, invalidateHr]);

  // Emergency contacts
  const createEmergencyContact = useCallback(async (data) => invoke({ action: "create_emergency_contact", ...data }), [invoke]);
  const deleteEmergencyContact = useCallback(async (contact_id) => invoke({ action: "delete_emergency_contact", contact_id }), [invoke]);

  // HR notes
  const createHrNote = useCallback(async (data) => invoke({ action: "create_hr_note", ...data }), [invoke]);
  const deleteHrNote = useCallback(async (note_id) => invoke({ action: "delete_hr_note", note_id }), [invoke]);

  const seedDemo = useCallback(async () => { const r = await invoke({ action: "seed_demo" }); invalidateHr(); return r; }, [invoke, invalidateHr]);

  return {
    orgId,
    orgType,
    activeRole,
    dashboard: dashboardQuery.data || null,
    employees: employeesQuery.data?.employees || [],
    departments: employeesQuery.data?.departments || [],
    jobRoles: employeesQuery.data?.job_roles || [],
    workLocations: employeesQuery.data?.work_locations || [],
    loading: employeesQuery.isLoading,
    error: employeesQuery.error?.message || dashboardQuery.error?.message || null,
    loadDashboard,
    loadEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    offboardEmployee,
    deleteEmployee,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    createJobRole,
    updateJobRole,
    deleteJobRole,
    createWorkLocation,
    updateWorkLocation,
    deleteWorkLocation,
    createEmergencyContact,
    deleteEmergencyContact,
    createHrNote,
    deleteHrNote,
    seedDemo,
    invoke,
  };
}