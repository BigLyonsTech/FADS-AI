import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  requireHrAccess,
  syncUserHrOrgs,
  getOrgConfig,
  assertOrgWritable,
} from "../../shared/hr.ts";
import { createHrAuditHelper, makeOwnRecordCheck, todayISO } from "../../shared/hrBackend.ts";
import {
  DEFAULT_WORK_SCHEDULE,
  getDefaultHolidays,
  parseAttendanceRow,
} from "../../shared/hrAttendance.ts";

// Organisation-isolated HR attendance management (records, work schedules,
// public holidays, CSV import). Every action requires an HR-authorised role.
//
// Actions:
//   list_records (filter by employee_id, date range)
//   create_record (manual entry — one per employee per day)
//   update_record
//   delete_record
//   import_records (bulk CSV import — matches by employee name)
//   list/create/update/delete_work_schedules
//   list/create/update/delete_public_holidays
//   seed_demo
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { action, organisation_id } = body;
    const svc = base44.asServiceRole;

    if (!organisation_id) {
      return Response.json({ error: "Missing organisation_id" }, { status: 400 });
    }

    await syncUserHrOrgs(svc, user.id);
    await requireHrAccess(svc, user.id, organisation_id);
    const org = await getOrgConfig(svc, organisation_id);

    const audit = createHrAuditHelper(svc, organisation_id, user);
    const ownRecord = makeOwnRecordCheck(organisation_id);
    const today = todayISO;

    // ================ ATTENDANCE RECORDS ================
    if (action === "list_records") {
      const { employee_id, start_date, end_date } = body;
      const filter = { organisation_id };
      if (employee_id) filter.employee_id = employee_id;
      let records = await svc.entities.AttendanceRecord.filter(filter, "-date", 200);
      if (start_date) records = records.filter((r) => r.date >= start_date);
      if (end_date) records = records.filter((r) => r.date <= end_date);
      return Response.json({ records });
    }

    if (action === "create_record") {
      assertOrgWritable(org);
      const { employee_id, date, status, check_in_time, check_out_time, notes } = body;
      if (!employee_id || !date || !status) {
        return Response.json({ error: "employee_id, date and status are required" }, { status: 400 });
      }

      const emp = await svc.entities.Employee.get(employee_id);
      if (!ownRecord(emp)) return Response.json({ error: "Employee not found" }, { status: 404 });

      // Check for duplicate (same employee + date)
      const existing = await svc.entities.AttendanceRecord.filter({
        organisation_id,
        employee_id,
        date,
      });
      if (existing.length > 0) {
        return Response.json({ error: "An attendance record already exists for this employee on this date" }, { status: 400 });
      }

      const rec = await svc.entities.AttendanceRecord.create({
        organisation_id,
        employee_id,
        employee_name: [emp.first_name, emp.last_name].filter(Boolean).join(" "),
        date,
        status,
        check_in_time: check_in_time || null,
        check_out_time: check_out_time || null,
        notes: notes || null,
        recorded_by: user.id,
        recorded_by_name: user.full_name || user.email,
        recorded_date: new Date().toISOString(),
        data_mode: org.data_mode,
      });

      await audit("hr.attendance_recorded", "AttendanceRecord", rec.id, null, {
        employee_id,
        date,
        status,
      });
      return Response.json({ ok: true, id: rec.id });
    }

    if (action === "update_record") {
      assertOrgWritable(org);
      const { record_id, ...patch } = body;
      if (!record_id) return Response.json({ error: "Missing record_id" }, { status: 400 });
      const rec = await svc.entities.AttendanceRecord.get(record_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      delete patch.record_id;
      delete patch.organisation_id;
      delete patch.data_mode;
      delete patch.employee_id;
      delete patch.employee_name;
      patch.recorded_by = user.id;
      patch.recorded_by_name = user.full_name || user.email;
      patch.recorded_date = new Date().toISOString();
      await svc.entities.AttendanceRecord.update(record_id, patch);
      await audit("hr.attendance_updated", "AttendanceRecord", record_id, { status: rec.status }, patch);
      return Response.json({ ok: true });
    }

    if (action === "delete_record") {
      assertOrgWritable(org);
      const { record_id } = body;
      if (!record_id) return Response.json({ error: "Missing record_id" }, { status: 400 });
      const rec = await svc.entities.AttendanceRecord.get(record_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      await svc.entities.AttendanceRecord.delete(record_id);
      await audit("hr.attendance_deleted", "AttendanceRecord", record_id, { date: rec.date, status: rec.status }, null);
      return Response.json({ ok: true });
    }

    if (action === "import_records") {
      assertOrgWritable(org);
      const { records } = body;
      if (!Array.isArray(records) || records.length === 0) {
        return Response.json({ error: "No records provided for import" }, { status: 400 });
      }

      // Load all employees for name matching
      const employees = await svc.entities.Employee.filter({ organisation_id });
      const empByName = {};
      for (const e of employees) {
        const name = [e.first_name, e.last_name].filter(Boolean).join(" ").toLowerCase();
        empByName[name] = e;
      }

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < records.length; i++) {
        const parsed = parseAttendanceRow(records[i], i + 2);
        if (!parsed.valid) {
          results.push({ row: i + 2, status: "error", errors: parsed.errors });
          errorCount++;
          continue;
        }

        const emp = empByName[parsed.record.employee_name.toLowerCase()];
        if (!emp) {
          results.push({
            row: i + 2,
            status: "error",
            errors: [`Row ${i + 2}: no employee found with name "${parsed.record.employee_name}"`],
          });
          errorCount++;
          continue;
        }

        // Check for duplicate
        const existing = await svc.entities.AttendanceRecord.filter({
          organisation_id,
          employee_id: emp.id,
          date: parsed.record.date,
        });
        if (existing.length > 0) {
          // Update existing
          await svc.entities.AttendanceRecord.update(existing[0].id, {
            status: parsed.record.status,
            check_in_time: parsed.record.check_in_time,
            check_out_time: parsed.record.check_out_time,
            notes: parsed.record.notes,
            recorded_by: user.id,
            recorded_by_name: user.full_name || user.email,
            recorded_date: new Date().toISOString(),
          });
          results.push({ row: i + 2, status: "updated", employee: parsed.record.employee_name, date: parsed.record.date });
          successCount++;
        } else {
          await svc.entities.AttendanceRecord.create({
            organisation_id,
            employee_id: emp.id,
            employee_name: [emp.first_name, emp.last_name].filter(Boolean).join(" "),
            date: parsed.record.date,
            status: parsed.record.status,
            check_in_time: parsed.record.check_in_time,
            check_out_time: parsed.record.check_out_time,
            notes: parsed.record.notes,
            recorded_by: user.id,
            recorded_by_name: user.full_name || user.email,
            recorded_date: new Date().toISOString(),
            data_mode: org.data_mode,
          });
          results.push({ row: i + 2, status: "created", employee: parsed.record.employee_name, date: parsed.record.date });
          successCount++;
        }
      }

      await audit("hr.attendance_imported", "AttendanceRecord", null, null, {
        total: records.length,
        success: successCount,
        errors: errorCount,
      });

      return Response.json({ ok: true, success: successCount, errors: errorCount, results });
    }

    // ================ WORK SCHEDULES ================
    if (action === "list_work_schedules") {
      const schedules = await svc.entities.WorkSchedule.filter({ organisation_id });
      return Response.json({ schedules });
    }

    if (action === "create_work_schedule") {
      assertOrgWritable(org);
      const { name, description, working_days, start_time, end_time } = body;
      if (!name) return Response.json({ error: "name is required" }, { status: 400 });

      const rec = await svc.entities.WorkSchedule.create({
        organisation_id,
        name,
        description: description || null,
        working_days: working_days || [1, 2, 3, 4, 5],
        start_time: start_time || "09:00",
        end_time: end_time || "17:00",
        is_active: true,
        data_mode: org.data_mode,
      });
      await audit("hr.work_schedule_created", "WorkSchedule", rec.id, null, { name });
      return Response.json({ ok: true, id: rec.id });
    }

    if (action === "update_work_schedule") {
      assertOrgWritable(org);
      const { schedule_id, ...patch } = body;
      if (!schedule_id) return Response.json({ error: "Missing schedule_id" }, { status: 400 });
      const rec = await svc.entities.WorkSchedule.get(schedule_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      delete patch.schedule_id;
      delete patch.organisation_id;
      delete patch.data_mode;
      await svc.entities.WorkSchedule.update(schedule_id, patch);
      await audit("hr.work_schedule_updated", "WorkSchedule", schedule_id, { name: rec.name }, patch);
      return Response.json({ ok: true });
    }

    if (action === "delete_work_schedule") {
      assertOrgWritable(org);
      const { schedule_id } = body;
      if (!schedule_id) return Response.json({ error: "Missing schedule_id" }, { status: 400 });
      const rec = await svc.entities.WorkSchedule.get(schedule_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      await svc.entities.WorkSchedule.delete(schedule_id);
      await audit("hr.work_schedule_deleted", "WorkSchedule", schedule_id, { name: rec.name }, null);
      return Response.json({ ok: true });
    }

    // ================ PUBLIC HOLIDAYS ================
    if (action === "list_public_holidays") {
      const holidays = await svc.entities.PublicHoliday.filter({ organisation_id }, "date", 100);
      return Response.json({ holidays });
    }

    if (action === "create_public_holiday") {
      assertOrgWritable(org);
      const { name, date } = body;
      if (!name || !date) return Response.json({ error: "name and date are required" }, { status: 400 });

      const rec = await svc.entities.PublicHoliday.create({
        organisation_id,
        name,
        date,
        is_active: true,
        data_mode: org.data_mode,
      });
      await audit("hr.public_holiday_created", "PublicHoliday", rec.id, null, { name, date });
      return Response.json({ ok: true, id: rec.id });
    }

    if (action === "update_public_holiday") {
      assertOrgWritable(org);
      const { holiday_id, ...patch } = body;
      if (!holiday_id) return Response.json({ error: "Missing holiday_id" }, { status: 400 });
      const rec = await svc.entities.PublicHoliday.get(holiday_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      delete patch.holiday_id;
      delete patch.organisation_id;
      delete patch.data_mode;
      await svc.entities.PublicHoliday.update(holiday_id, patch);
      await audit("hr.public_holiday_updated", "PublicHoliday", holiday_id, { name: rec.name }, patch);
      return Response.json({ ok: true });
    }

    if (action === "delete_public_holiday") {
      assertOrgWritable(org);
      const { holiday_id } = body;
      if (!holiday_id) return Response.json({ error: "Missing holiday_id" }, { status: 400 });
      const rec = await svc.entities.PublicHoliday.get(holiday_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      await svc.entities.PublicHoliday.delete(holiday_id);
      await audit("hr.public_holiday_deleted", "PublicHoliday", holiday_id, { name: rec.name }, null);
      return Response.json({ ok: true });
    }

    // ================ IMPORT FROM FILE ================
    if (action === "import_from_file") {
      assertOrgWritable(org);
      const { file_url } = body;
      if (!file_url) return Response.json({ error: "Missing file_url" }, { status: 400 });

      // Use ExtractDataFromUploadedFile to parse the CSV/Excel
      const extractResult = await svc.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            rows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  employee_name: { type: "string" },
                  date: { type: "string" },
                  status: { type: "string" },
                  check_in: { type: "string" },
                  check_out: { type: "string" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
      });

      if (extractResult.status === "error") {
        return Response.json({ error: extractResult.details || "Failed to parse file" }, { status: 400 });
      }

      const rows = Array.isArray(extractResult.output) ? extractResult.output : (extractResult.output?.rows || []);
      if (!Array.isArray(rows) || rows.length === 0) {
        return Response.json({ error: "No attendance rows found in the file" }, { status: 400 });
      }

      // Load all employees for name matching
      const employees = await svc.entities.Employee.filter({ organisation_id });
      const empByName = {};
      for (const e of employees) {
        const name = [e.first_name, e.last_name].filter(Boolean).join(" ").toLowerCase();
        empByName[name] = e;
      }

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const parsed = parseAttendanceRow(rows[i], i + 2);
        if (!parsed.valid) {
          results.push({ row: i + 2, status: "error", errors: parsed.errors });
          errorCount++;
          continue;
        }

        const emp = empByName[parsed.record.employee_name.toLowerCase()];
        if (!emp) {
          results.push({
            row: i + 2,
            status: "error",
            errors: [`No employee found with name "${parsed.record.employee_name}"`],
          });
          errorCount++;
          continue;
        }

        const existing = await svc.entities.AttendanceRecord.filter({
          organisation_id,
          employee_id: emp.id,
          date: parsed.record.date,
        });
        if (existing.length > 0) {
          await svc.entities.AttendanceRecord.update(existing[0].id, {
            status: parsed.record.status,
            check_in_time: parsed.record.check_in_time,
            check_out_time: parsed.record.check_out_time,
            notes: parsed.record.notes,
            recorded_by: user.id,
            recorded_by_name: user.full_name || user.email,
            recorded_date: new Date().toISOString(),
          });
          results.push({ row: i + 2, status: "updated", employee: parsed.record.employee_name, date: parsed.record.date });
          successCount++;
        } else {
          await svc.entities.AttendanceRecord.create({
            organisation_id,
            employee_id: emp.id,
            employee_name: [emp.first_name, emp.last_name].filter(Boolean).join(" "),
            date: parsed.record.date,
            status: parsed.record.status,
            check_in_time: parsed.record.check_in_time,
            check_out_time: parsed.record.check_out_time,
            notes: parsed.record.notes,
            recorded_by: user.id,
            recorded_by_name: user.full_name || user.email,
            recorded_date: new Date().toISOString(),
            data_mode: org.data_mode,
          });
          results.push({ row: i + 2, status: "created", employee: parsed.record.employee_name, date: parsed.record.date });
          successCount++;
        }
      }

      await audit("hr.attendance_imported", "AttendanceRecord", null, null, {
        source: "file",
        total: rows.length,
        success: successCount,
        errors: errorCount,
      });

      return Response.json({ ok: true, success: successCount, errors: errorCount, results });
    }

    // ================ SEED DEMO ================
    if (action === "seed_demo") {
      if (org.data_mode !== "demo") {
        return Response.json({ error: "Demo seed is only available in Demo mode" }, { status: 400 });
      }

      const existingSchedules = await svc.entities.WorkSchedule.filter({ organisation_id, data_mode: "demo" });
      if (existingSchedules.length > 0) {
        return Response.json({ ok: true, message: "Demo data already seeded" });
      }

      // Create default work schedule
      await svc.entities.WorkSchedule.create({
        organisation_id,
        ...DEFAULT_WORK_SCHEDULE,
        is_active: true,
        data_mode: "demo",
      });

      // Create public holidays for current year
      const year = new Date().getFullYear();
      for (const h of getDefaultHolidays(year)) {
        await svc.entities.PublicHoliday.create({
          organisation_id,
          name: h.name,
          date: h.date,
          is_active: true,
          data_mode: "demo",
        });
      }

      // Create attendance records for the last 5 working days for active employees
      const employees = await svc.entities.Employee.filter({
        organisation_id,
        data_mode: "demo",
        employment_status: "active",
      });

      let recordsCreated = 0;
      for (let d = 1; d <= 7; d++) {
        const date = new Date(Date.now() - d * 86400000);
        const dow = date.getDay();
        if (dow === 0 || dow === 6) continue; // skip weekends
        const dateStr = date.toISOString().slice(0, 10);

        for (let i = 0; i < employees.length; i++) {
          const emp = employees[i];
          // Vary statuses for demo
          let status = "present";
          if (i === 1 && d === 2) status = "late";
          if (i === 2 && d === 3) status = "remote";
          if (i === 0 && d === 5) status = "excused";

          await svc.entities.AttendanceRecord.create({
            organisation_id,
            employee_id: emp.id,
            employee_name: [emp.first_name, emp.last_name].filter(Boolean).join(" "),
            date: dateStr,
            status,
            check_in_time: status === "late" ? "09:45" : "09:00",
            check_out_time: "17:00",
            notes: null,
            recorded_by: user.id,
            recorded_by_name: user.full_name || user.email,
            recorded_date: new Date().toISOString(),
            data_mode: "demo",
          });
          recordsCreated++;
        }
      }

      await audit("hr.attendance_demo_seeded", "WorkSchedule", null, null, {
        schedules: 1,
        holidays: getDefaultHolidays(year).length,
        records: recordsCreated,
      });
      return Response.json({
        ok: true,
        seeded: { schedules: 1, holidays: getDefaultHolidays(year).length, records: recordsCreated },
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}