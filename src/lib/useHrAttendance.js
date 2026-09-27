import { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";

// All HR attendance data access goes through the hrAttendance backend function.
export function useHrAttendance() {
  const { activeOrg } = useWorkspace();
  const orgId = activeOrg?.id;

  const invoke = useCallback(async (payload) => {
    const res = await base44.functions.invoke("hrAttendance", { ...payload, organisation_id: orgId });
    return res.data;
  }, [orgId]);

  // Records
  const listRecords = useCallback(async (filters = {}) => invoke({ action: "list_records", ...filters }), [invoke]);
  const createRecord = useCallback(async (data) => invoke({ action: "create_record", ...data }), [invoke]);
  const updateRecord = useCallback(async (record_id, patch) => invoke({ action: "update_record", record_id, ...patch }), [invoke]);
  const deleteRecord = useCallback(async (record_id) => invoke({ action: "delete_record", record_id }), [invoke]);
  const importRecords = useCallback(async (records) => invoke({ action: "import_records", records }), [invoke]);
  const importFromFile = useCallback(async (file_url) => invoke({ action: "import_from_file", file_url }), [invoke]);

  // Work schedules
  const listWorkSchedules = useCallback(async () => invoke({ action: "list_work_schedules" }), [invoke]);
  const createWorkSchedule = useCallback(async (data) => invoke({ action: "create_work_schedule", ...data }), [invoke]);
  const updateWorkSchedule = useCallback(async (schedule_id, patch) => invoke({ action: "update_work_schedule", schedule_id, ...patch }), [invoke]);
  const deleteWorkSchedule = useCallback(async (schedule_id) => invoke({ action: "delete_work_schedule", schedule_id }), [invoke]);

  // Public holidays
  const listPublicHolidays = useCallback(async () => invoke({ action: "list_public_holidays" }), [invoke]);
  const createPublicHoliday = useCallback(async (data) => invoke({ action: "create_public_holiday", ...data }), [invoke]);
  const updatePublicHoliday = useCallback(async (holiday_id, patch) => invoke({ action: "update_public_holiday", holiday_id, ...patch }), [invoke]);
  const deletePublicHoliday = useCallback(async (holiday_id) => invoke({ action: "delete_public_holiday", holiday_id }), [invoke]);

  const seedDemo = useCallback(async () => invoke({ action: "seed_demo" }), [invoke]);

  return {
    orgId,
    invoke,
    listRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    importRecords,
    importFromFile,
    listWorkSchedules,
    createWorkSchedule,
    updateWorkSchedule,
    deleteWorkSchedule,
    listPublicHolidays,
    createPublicHoliday,
    updatePublicHoliday,
    deletePublicHoliday,
    seedDemo,
  };
}