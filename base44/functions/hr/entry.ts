import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  requireHrAccess,
  syncUserHrOrgs,
  getOrgConfig,
  assertOrgWritable,
  hrWording,
  stripRestrictedFields,
} from "../../shared/hr.ts";
import { createHrAuditHelper, makeOwnRecordCheck } from "../../shared/hrBackend.ts";

// Organisation-isolated HR operations. Every action requires the caller to
// hold an HR-authorised role in the target organisation (verified server-side).
// RLS uses user.data.hr_organisations (synced here) so non-HR users cannot read
// HR records even via direct client SDK calls.
//
// Actions:
//   get_dashboard         — stats for HR Home
//   list_employees        — directory with filters (department, role, manager, location, status, search)
//   get_employee          — full profile with department, role, manager, location, emergency contacts, notes, history
//   create_employee       — create + auto "hired" employment record
//   update_employee       — update + auto employment record on status/role/department/manager change
//   offboard_employee     — set status to offboarding or former_employee + employment record
//   delete_employee       — soft check: block if active; audit
//   list/create/update/delete departments
//   list/create/update job_roles
//   list/create/update work_locations
//   list/create/delete emergency_contacts
//   list/create hr_notes
//   seed_demo             — fictional demo data (Demo mode only, idempotent)
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

    // Sync hr_organisations so RLS stays current, then verify HR access.
    await syncUserHrOrgs(svc, user.id);
    await requireHrAccess(svc, user.id, organisation_id);
    const org = await getOrgConfig(svc, organisation_id);
    const wording = hrWording(org.type);

    const audit = createHrAuditHelper(svc, organisation_id, user);
    const ownRecord = makeOwnRecordCheck(organisation_id);

    // ---------------- dashboard ----------------
    if (action === "get_dashboard") {
      const dm = body.data_mode || org.data_mode;
      const [employees, departments, roles, locations] = await Promise.all([
        svc.entities.Employee.filter({ organisation_id, data_mode: dm }, "-created_date", 500),
        svc.entities.Department.filter({ organisation_id, data_mode: dm }),
        svc.entities.JobRole.filter({ organisation_id, data_mode: dm }),
        svc.entities.WorkLocation.filter({ organisation_id, data_mode: dm }),
      ]);

      const byStatus = (s) => employees.filter((e) => e.employment_status === s);
      const onboarding = byStatus("onboarding");
      const active = byStatus("active");
      const onLeave = byStatus("on_leave");
      const offboarding = byStatus("offboarding");
      const former = byStatus("former_employee");

      // Records requiring attention: onboarding without start date, offboarding without end date
      const needsAttention = employees.filter(
        (e) =>
          (e.employment_status === "onboarding" && !e.start_date) ||
          (e.employment_status === "offboarding" && !e.end_date) ||
          (e.employment_status === "on_leave" && !e.end_date)
      );

      // Recent HR activity (last 10 audit entries for HR actions)
      const recentAudit = await svc.entities.AuditLog.filter(
        { organisation_id },
        "-created_date",
        10
      );
      const hrActions = recentAudit.filter((a) =>
        (a.action || "").startsWith("hr.")
      );

      return Response.json({
        stats: {
          total: employees.length,
          active: active.length,
          onboarding: onboarding.length,
          on_leave: onLeave.length,
          offboarding: offboarding.length,
          former: former.length,
          needs_attention: needsAttention.length,
        },
        departments: departments.length,
        job_roles: roles.length,
        work_locations: locations.length,
        recent_activity: hrActions.slice(0, 5).map((a) => ({
          action: a.action,
          actor_email: a.actor_user_email,
          date: a.created_date,
          entity_type: a.entity_type,
        })),
        wording,
      });
    }

    // ---------------- list employees ----------------
    if (action === "list_employees") {
      const {
        department_id,
        job_role_id,
        manager_id,
        work_location_id,
        employment_status,
        search,
      } = body;

      const dm = body.data_mode || org.data_mode;
      let employees = await svc.entities.Employee.filter(
        { organisation_id, data_mode: dm },
        "-created_date",
        500
      );

      if (department_id) {
        employees = employees.filter((e) => e.department_id === department_id);
      }
      if (job_role_id) {
        employees = employees.filter((e) => e.job_role_id === job_role_id);
      }
      if (manager_id) {
        employees = employees.filter((e) => e.manager_id === manager_id);
      }
      if (work_location_id) {
        employees = employees.filter(
          (e) => e.work_location_id === work_location_id
        );
      }
      if (employment_status) {
        employees = employees.filter(
          (e) => e.employment_status === employment_status
        );
      }
      if (search) {
        const q = search.toLowerCase();
        employees = employees.filter(
          (e) =>
            (e.first_name || "").toLowerCase().includes(q) ||
            (e.last_name || "").toLowerCase().includes(q) ||
            (e.email || "").toLowerCase().includes(q)
        );
      }

      // Enrich with department, role, manager, location names
      const [departments, roles, locations] = await Promise.all([
        svc.entities.Department.filter({ organisation_id, data_mode: dm }),
        svc.entities.JobRole.filter({ organisation_id, data_mode: dm }),
        svc.entities.WorkLocation.filter({ organisation_id, data_mode: dm }),
      ]);
      const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));
      const roleMap = Object.fromEntries(roles.map((r) => [r.id, r]));
      const locMap = Object.fromEntries(locations.map((l) => [l.id, l]));
      const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));

      const enriched = employees.map((e) => ({
        ...stripRestrictedFields(e),
        department_name: deptMap[e.department_id]?.name || null,
        job_role_title: roleMap[e.job_role_id]?.title || null,
        manager_name: empMap[e.manager_id]
          ? [empMap[e.manager_id].first_name, empMap[e.manager_id].last_name]
              .filter(Boolean)
              .join(" ")
          : null,
        work_location_name: locMap[e.work_location_id]?.name || null,
      }));

      return Response.json({
        employees: enriched,
        departments,
        job_roles: roles,
        work_locations: locations,
        wording,
      });
    }

    // ---------------- get employee ----------------
    if (action === "get_employee") {
      const { employee_id } = body;
      if (!employee_id)
        return Response.json({ error: "Missing employee_id" }, { status: 400 });

      const emp = await svc.entities.Employee.get(employee_id);
      if (!ownRecord(emp))
        return Response.json({ error: "Not found" }, { status: 404 });

      const [departments, roles, locations, contacts, notes, history, allEmps] =
        await Promise.all([
          svc.entities.Department.filter({ organisation_id }),
          svc.entities.JobRole.filter({ organisation_id }),
          svc.entities.WorkLocation.filter({ organisation_id }),
          svc.entities.EmergencyContact.filter({ employee_id }),
          svc.entities.HrNote.filter({ employee_id }, "-created_date"),
          svc.entities.EmploymentRecord.filter(
            { employee_id },
            "-effective_date"
          ),
          svc.entities.Employee.filter({ organisation_id }),
        ]);

      const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));
      const roleMap = Object.fromEntries(roles.map((r) => [r.id, r]));
      const locMap = Object.fromEntries(locations.map((l) => [l.id, l]));
      const empMap = Object.fromEntries(allEmps.map((e) => [e.id, e]));

      const manager = empMap[emp.manager_id] || null;
      const managerName = manager
        ? [manager.first_name, manager.last_name].filter(Boolean).join(" ")
        : null;

      const enrichedHistory = history.map((h) => ({
        ...h,
        from_role_title: roleMap[h.from_job_role_id]?.title || null,
        to_role_title: roleMap[h.to_job_role_id]?.title || null,
        from_department_name: deptMap[h.from_department_id]?.name || null,
        to_department_name: deptMap[h.to_department_id]?.name || null,
      }));

      return Response.json({
        employee: {
          ...emp,
          department_name: deptMap[emp.department_id]?.name || null,
          job_role_title: roleMap[emp.job_role_id]?.title || null,
          work_location_name: locMap[emp.work_location_id]?.name || null,
          manager_name: managerName,
        },
        emergency_contacts: contacts,
        hr_notes: notes.map((n) => ({
          ...n,
          created_by_name: n.created_by_name || "HR",
        })),
        employment_history: enrichedHistory,
        departments,
        job_roles: roles,
        work_locations: locations,
        potential_managers: allEmps
          .filter((e) => e.id !== employee_id)
          .map((e) => ({
            id: e.id,
            name: [e.first_name, e.last_name].filter(Boolean).join(" "),
          })),
        wording,
      });
    }

    // ---------------- create employee ----------------
    if (action === "create_employee") {
      assertOrgWritable(org);
      const {
        first_name,
        last_name,
        email,
        personal_email,
        phone,
        department_id,
        job_role_id,
        manager_id,
        work_location_id,
        employment_status,
        contract_type,
        start_date,
        annual_salary,
        salary_currency,
        date_of_birth,
        home_address,
        pay_frequency,
        pay_basic,
        pay_allowances,
        pay_deductions,
      } = body;

      if (!first_name || !last_name) {
        return Response.json(
          { error: "First name and last name are required" },
          { status: 400 }
        );
      }

      const emp = await svc.entities.Employee.create({
        organisation_id,
        first_name,
        last_name,
        email: email || null,
        personal_email: personal_email || null,
        phone: phone || null,
        department_id: department_id || null,
        job_role_id: job_role_id || null,
        manager_id: manager_id || null,
        work_location_id: work_location_id || null,
        employment_status: employment_status || "onboarding",
        contract_type: contract_type || "permanent",
        start_date: start_date || null,
        end_date: null,
        annual_salary: annual_salary != null ? Number(annual_salary) : null,
        salary_currency: salary_currency || org.currency,
        date_of_birth: date_of_birth || null,
        home_address: home_address || null,
        pay_frequency: pay_frequency || "monthly",
        pay_basic: pay_basic != null ? Number(pay_basic) : 0,
        pay_allowances: Array.isArray(pay_allowances) ? pay_allowances : [],
        pay_deductions: Array.isArray(pay_deductions) ? pay_deductions : [],
        profile_photo_url: null,
        data_mode: body.data_mode || org.data_mode,
      });

      // Auto-create "hired" employment record
      await svc.entities.EmploymentRecord.create({
        organisation_id,
        employee_id: emp.id,
        event_type: "hired",
        to_status: emp.employment_status,
        to_job_role_id: emp.job_role_id || null,
        to_department_id: emp.department_id || null,
        effective_date: emp.start_date || new Date().toISOString().slice(0, 10),
        notes: "Employee record created",
        recorded_by: user.id,
        recorded_date: new Date().toISOString(),
        data_mode: body.data_mode || org.data_mode,
      });

      await audit(
        "hr.employee_created",
        "Employee",
        emp.id,
        null,
        { first_name, last_name, employment_status }
      );
      return Response.json({ ok: true, id: emp.id });
    }

    // ---------------- update employee ----------------
    if (action === "update_employee") {
      assertOrgWritable(org);
      const { employee_id, ...patch } = body;
      if (!employee_id)
        return Response.json({ error: "Missing employee_id" }, { status: 400 });

      const emp = await svc.entities.Employee.get(employee_id);
      if (!ownRecord(emp))
        return Response.json({ error: "Not found" }, { status: 404 });

      const before = {
        first_name: emp.first_name,
        last_name: emp.last_name,
        email: emp.email,
        phone: emp.phone,
        department_id: emp.department_id,
        job_role_id: emp.job_role_id,
        manager_id: emp.manager_id,
        work_location_id: emp.work_location_id,
        employment_status: emp.employment_status,
        contract_type: emp.contract_type,
        start_date: emp.start_date,
        annual_salary: emp.annual_salary,
      };

      delete patch.employee_id;
      delete patch.organisation_id;
      delete patch.data_mode;

      const updated = await svc.entities.Employee.update(employee_id, patch);

      // Auto-create employment record on significant changes
      const statusChanged =
        before.employment_status !== updated.employment_status;
      const roleChanged = before.job_role_id !== updated.job_role_id;
      const deptChanged = before.department_id !== updated.department_id;
      const mgrChanged = before.manager_id !== updated.manager_id;

      if (statusChanged || roleChanged || deptChanged || mgrChanged) {
        let eventType = "status_change";
        if (statusChanged) {
          if (updated.employment_status === "on_leave") eventType = "leave_start";
          else if (updated.employment_status === "active" && before.employment_status === "on_leave") eventType = "leave_end";
          else if (updated.employment_status === "offboarding") eventType = "offboarding_started";
          else if (updated.employment_status === "former_employee") eventType = "offboarding_completed";
          else if (updated.employment_status === "active" && before.employment_status === "onboarding") eventType = "status_change";
        } else if (roleChanged) eventType = "role_change";
        else if (deptChanged) eventType = "department_change";
        else if (mgrChanged) eventType = "manager_change";

        await svc.entities.EmploymentRecord.create({
          organisation_id,
          employee_id: employee_id,
          event_type: eventType,
          from_status: statusChanged ? before.employment_status : null,
          to_status: statusChanged ? updated.employment_status : null,
          from_job_role_id: roleChanged ? before.job_role_id : null,
          to_job_role_id: roleChanged ? updated.job_role_id : null,
          from_department_id: deptChanged ? before.department_id : null,
          to_department_id: deptChanged ? updated.department_id : null,
          effective_date: new Date().toISOString().slice(0, 10),
          notes: patch.notes || null,
          recorded_by: user.id,
          recorded_date: new Date().toISOString(),
          data_mode: emp.data_mode,
        });
      }

      await audit("hr.employee_updated", "Employee", employee_id, before, {
        first_name: updated.first_name,
        last_name: updated.last_name,
        employment_status: updated.employment_status,
      });
      return Response.json({ ok: true });
    }

    // ---------------- offboard employee ----------------
    if (action === "offboard_employee") {
      assertOrgWritable(org);
      const { employee_id, end_date, notes } = body;
      if (!employee_id)
        return Response.json({ error: "Missing employee_id" }, { status: 400 });

      const emp = await svc.entities.Employee.get(employee_id);
      if (!ownRecord(emp))
        return Response.json({ error: "Not found" }, { status: 404 });

      const before = { employment_status: emp.employment_status, end_date: emp.end_date };
      const newStatus = "former_employee";
      const finalEndDate = end_date || new Date().toISOString().slice(0, 10);

      await svc.entities.Employee.update(employee_id, {
        employment_status: newStatus,
        end_date: finalEndDate,
      });

      await svc.entities.EmploymentRecord.create({
        organisation_id,
        employee_id,
        event_type: "offboarding_completed",
        from_status: emp.employment_status,
        to_status: newStatus,
        effective_date: finalEndDate,
        notes: notes || "Offboarding completed",
        recorded_by: user.id,
        recorded_date: new Date().toISOString(),
        data_mode: emp.data_mode,
      });

      await audit("hr.employee_offboarded", "Employee", employee_id, before, {
        employment_status: newStatus,
        end_date: finalEndDate,
      });
      return Response.json({ ok: true });
    }

    // ---------------- delete employee ----------------
    if (action === "delete_employee") {
      assertOrgWritable(org);
      const { employee_id } = body;
      if (!employee_id)
        return Response.json({ error: "Missing employee_id" }, { status: 400 });

      const emp = await svc.entities.Employee.get(employee_id);
      if (!ownRecord(emp))
        return Response.json({ error: "Not found" }, { status: 404 });

      if (emp.employment_status === "active") {
        return Response.json(
          {
            error:
              "Cannot delete an active employee. Offboard first, then delete.",
          },
          { status: 400 }
        );
      }

      // Delete related records
      await svc.entities.EmergencyContact.deleteMany({ employee_id });
      await svc.entities.HrNote.deleteMany({ employee_id });
      await svc.entities.EmploymentRecord.deleteMany({ employee_id });
      await svc.entities.Employee.delete(employee_id);

      await audit("hr.employee_deleted", "Employee", employee_id, { first_name: emp.first_name, last_name: emp.last_name }, null);
      return Response.json({ ok: true });
    }

    // ---------------- bulk import ----------------
    if (action === "bulk_import") {
      assertOrgWritable(org);
      const { employees, duplicate_action, duplicates } = body;
      if (!Array.isArray(employees) || employees.length === 0) {
        return Response.json({ error: "No employees to import" }, { status: 400 });
      }

      const [departments, jobRoles] = await Promise.all([
        svc.entities.Department.filter({ organisation_id, data_mode: org.data_mode }),
        svc.entities.JobRole.filter({ organisation_id, data_mode: org.data_mode }),
      ]);

      const validStatuses = ["onboarding", "active", "on_leave", "offboarding", "former_employee", "inactive"];
      const validContracts = ["permanent", "fixed_term", "part_time", "temporary", "intern", "casual"];

      let added = 0, updated = 0, skipped = 0;
      const errors: string[] = [];

      for (const emp of employees) {
        if (!emp.first_name?.trim() || !emp.last_name?.trim()) {
          errors.push("Skipped: missing first or last name");
          continue;
        }
        try {
          let department_id = null;
          if (emp.department) {
            const dept = departments.find((d) => d.name.toLowerCase() === emp.department.toLowerCase());
            if (dept) department_id = dept.id;
          }
          let job_role_id = null;
          if (emp.job_role) {
            const role = jobRoles.find((r) => r.title.toLowerCase() === emp.job_role.toLowerCase());
            if (role) job_role_id = role.id;
          }
          const status = validStatuses.includes(emp.employment_status) ? emp.employment_status : "onboarding";
          const contract = validContracts.includes(emp.contract_type) ? emp.contract_type : "permanent";

          const created = await svc.entities.Employee.create({
            organisation_id,
            first_name: emp.first_name.trim(),
            last_name: emp.last_name.trim(),
            email: emp.email?.trim() || null,
            phone: emp.phone?.trim() || null,
            department_id,
            job_role_id,
            employment_status: status,
            contract_type: contract,
            start_date: emp.start_date || null,
            salary_currency: org.currency,
            pay_frequency: "monthly",
            pay_basic: 0,
            pay_allowances: [],
            pay_deductions: [],
            data_mode: org.data_mode,
          });

          await svc.entities.EmploymentRecord.create({
            organisation_id,
            employee_id: created.id,
            event_type: "hired",
            to_status: created.employment_status,
            to_job_role_id: created.job_role_id || null,
            to_department_id: created.department_id || null,
            effective_date: created.start_date || new Date().toISOString().slice(0, 10),
            notes: "Bulk import",
            recorded_by: user.id,
            recorded_date: new Date().toISOString(),
            data_mode: org.data_mode,
          });
          added++;
        } catch (e) {
          errors.push(`Error creating ${emp.first_name} ${emp.last_name}: ${e.message}`);
        }
      }

      if (duplicate_action === "update" && Array.isArray(duplicates)) {
        for (const dup of duplicates) {
          try {
            await svc.entities.Employee.update(dup.existing_id, {
              first_name: dup.first_name?.trim(),
              last_name: dup.last_name?.trim(),
              email: dup.email?.trim() || null,
              phone: dup.phone?.trim() || null,
            });
            updated++;
          } catch (e) {
            errors.push(`Error updating: ${e.message}`);
          }
        }
      } else if (Array.isArray(duplicates)) {
        skipped = duplicates.length;
      }

      await audit("hr.bulk_import", "Employee", null, null, { added, updated, skipped, errors: errors.length });
      return Response.json({ ok: true, added, updated, skipped, errors });
    }

    // ---------------- departments ----------------
    if (action === "list_departments") {
      const departments = await svc.entities.Department.filter({ organisation_id });
      return Response.json({ departments });
    }
    if (action === "create_department") {
      assertOrgWritable(org);
      const { name, description, head_employee_id } = body;
      if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
      const rec = await svc.entities.Department.create({
        organisation_id,
        name,
        description: description || null,
        head_employee_id: head_employee_id || null,
        data_mode: body.data_mode || org.data_mode,
      });
      await audit("hr.department_created", "Department", rec.id, null, { name });
      return Response.json({ ok: true, id: rec.id });
    }
    if (action === "update_department") {
      assertOrgWritable(org);
      const { department_id, ...patch } = body;
      if (!department_id) return Response.json({ error: "Missing department_id" }, { status: 400 });
      const rec = await svc.entities.Department.get(department_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      delete patch.department_id;
      delete patch.organisation_id;
      await svc.entities.Department.update(department_id, patch);
      await audit("hr.department_updated", "Department", department_id, { name: rec.name }, patch);
      return Response.json({ ok: true });
    }
    if (action === "delete_department") {
      assertOrgWritable(org);
      const { department_id } = body;
      if (!department_id) return Response.json({ error: "Missing department_id" }, { status: 400 });
      const rec = await svc.entities.Department.get(department_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      await svc.entities.Department.delete(department_id);
      await audit("hr.department_deleted", "Department", department_id, { name: rec.name }, null);
      return Response.json({ ok: true });
    }

    // ---------------- job roles ----------------
    if (action === "list_job_roles") {
      const job_roles = await svc.entities.JobRole.filter({ organisation_id });
      return Response.json({ job_roles });
    }
    if (action === "create_job_role") {
      assertOrgWritable(org);
      const { title, description, department_id } = body;
      if (!title) return Response.json({ error: "Title is required" }, { status: 400 });
      const rec = await svc.entities.JobRole.create({
        organisation_id,
        title,
        description: description || null,
        department_id: department_id || null,
        data_mode: body.data_mode || org.data_mode,
      });
      await audit("hr.job_role_created", "JobRole", rec.id, null, { title });
      return Response.json({ ok: true, id: rec.id });
    }
    if (action === "update_job_role") {
      assertOrgWritable(org);
      const { job_role_id, ...patch } = body;
      if (!job_role_id) return Response.json({ error: "Missing job_role_id" }, { status: 400 });
      const rec = await svc.entities.JobRole.get(job_role_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      delete patch.job_role_id;
      delete patch.organisation_id;
      await svc.entities.JobRole.update(job_role_id, patch);
      await audit("hr.job_role_updated", "JobRole", job_role_id, { title: rec.title }, patch);
      return Response.json({ ok: true });
    }
    if (action === "delete_job_role") {
      assertOrgWritable(org);
      const { job_role_id } = body;
      if (!job_role_id) return Response.json({ error: "Missing job_role_id" }, { status: 400 });
      const rec = await svc.entities.JobRole.get(job_role_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      await svc.entities.JobRole.delete(job_role_id);
      await audit("hr.job_role_deleted", "JobRole", job_role_id, { title: rec.title }, null);
      return Response.json({ ok: true });
    }

    // ---------------- work locations ----------------
    if (action === "list_work_locations") {
      const work_locations = await svc.entities.WorkLocation.filter({ organisation_id });
      return Response.json({ work_locations });
    }
    if (action === "create_work_location") {
      assertOrgWritable(org);
      const { name, address, type } = body;
      if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
      const rec = await svc.entities.WorkLocation.create({
        organisation_id,
        name,
        address: address || null,
        type: type || "office",
        data_mode: body.data_mode || org.data_mode,
      });
      await audit("hr.work_location_created", "WorkLocation", rec.id, null, { name });
      return Response.json({ ok: true, id: rec.id });
    }
    if (action === "update_work_location") {
      assertOrgWritable(org);
      const { work_location_id, ...patch } = body;
      if (!work_location_id) return Response.json({ error: "Missing work_location_id" }, { status: 400 });
      const rec = await svc.entities.WorkLocation.get(work_location_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      delete patch.work_location_id;
      delete patch.organisation_id;
      await svc.entities.WorkLocation.update(work_location_id, patch);
      await audit("hr.work_location_updated", "WorkLocation", work_location_id, { name: rec.name }, patch);
      return Response.json({ ok: true });
    }
    if (action === "delete_work_location") {
      assertOrgWritable(org);
      const { work_location_id } = body;
      if (!work_location_id) return Response.json({ error: "Missing work_location_id" }, { status: 400 });
      const rec = await svc.entities.WorkLocation.get(work_location_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      await svc.entities.WorkLocation.delete(work_location_id);
      await audit("hr.work_location_deleted", "WorkLocation", work_location_id, { name: rec.name }, null);
      return Response.json({ ok: true });
    }

    // ---------------- emergency contacts ----------------
    if (action === "create_emergency_contact") {
      assertOrgWritable(org);
      const { employee_id, name, relationship, phone, email, is_primary } = body;
      if (!employee_id || !name || !phone)
        return Response.json({ error: "employee_id, name and phone are required" }, { status: 400 });
      const emp = await svc.entities.Employee.get(employee_id);
      if (!ownRecord(emp)) return Response.json({ error: "Not found" }, { status: 404 });
      const rec = await svc.entities.EmergencyContact.create({
        organisation_id,
        employee_id,
        name,
        relationship: relationship || null,
        phone,
        email: email || null,
        is_primary: is_primary || false,
        data_mode: emp.data_mode,
      });
      await audit("hr.emergency_contact_created", "EmergencyContact", rec.id, null, { name, employee_id });
      return Response.json({ ok: true, id: rec.id });
    }
    if (action === "delete_emergency_contact") {
      assertOrgWritable(org);
      const { contact_id } = body;
      if (!contact_id) return Response.json({ error: "Missing contact_id" }, { status: 400 });
      const rec = await svc.entities.EmergencyContact.get(contact_id);
      if (!rec || rec.organisation_id !== organisation_id)
        return Response.json({ error: "Not found" }, { status: 404 });
      await svc.entities.EmergencyContact.delete(contact_id);
      await audit("hr.emergency_contact_deleted", "EmergencyContact", contact_id, { name: rec.name }, null);
      return Response.json({ ok: true });
    }

    // ---------------- hr notes ----------------
    if (action === "create_hr_note") {
      assertOrgWritable(org);
      const { employee_id, content, is_restricted } = body;
      if (!employee_id || !content)
        return Response.json({ error: "employee_id and content are required" }, { status: 400 });
      const emp = await svc.entities.Employee.get(employee_id);
      if (!ownRecord(emp)) return Response.json({ error: "Not found" }, { status: 404 });
      const rec = await svc.entities.HrNote.create({
        organisation_id,
        employee_id,
        content,
        is_restricted: is_restricted !== false,
        created_by: user.id,
        created_by_name: user.full_name || user.email,
        data_mode: emp.data_mode,
      });
      await audit("hr.note_created", "HrNote", rec.id, null, { employee_id });
      return Response.json({ ok: true, id: rec.id });
    }
    if (action === "delete_hr_note") {
      assertOrgWritable(org);
      const { note_id } = body;
      if (!note_id) return Response.json({ error: "Missing note_id" }, { status: 400 });
      const rec = await svc.entities.HrNote.get(note_id);
      if (!rec || rec.organisation_id !== organisation_id)
        return Response.json({ error: "Not found" }, { status: 404 });
      await svc.entities.HrNote.delete(note_id);
      await audit("hr.note_deleted", "HrNote", note_id, null, null);
      return Response.json({ ok: true });
    }

    // ---------------- seed demo ----------------
    if (action === "seed_demo") {
      if (org.data_mode !== "demo") {
        return Response.json({ error: "Demo seed is only available in Demo mode" }, { status: 400 });
      }
      const existing = await svc.entities.Employee.filter({ organisation_id, data_mode: "demo" });
      if (existing.length > 0) {
        return Response.json({ ok: true, message: "Demo data already seeded" });
      }

      const { buildHrDemoSeed } = await import("../../shared/hr.ts");
      const seed = buildHrDemoSeed(org);
      const currency = seed.currency;
      const today = new Date().toISOString().slice(0, 10);
      const orgDomain = org.name.toLowerCase().replace(/[^a-z]/g, "") + ".demo";

      // Departments
      const depts = await svc.entities.Department.bulkCreate(
        seed.departments.map((d) => ({
          organisation_id, name: d.name, description: d.description, data_mode: "demo",
        }))
      );

      // Job Roles
      const roles = await svc.entities.JobRole.bulkCreate(
        seed.jobRoles.map((r) => ({
          organisation_id, title: r.title,
          department_id: r.deptIndex != null ? depts[r.deptIndex].id : null,
          data_mode: "demo",
        }))
      );

      // Work Locations
      const locs = await svc.entities.WorkLocation.bulkCreate(
        seed.locations.map((l) => ({
          organisation_id, name: l.name, type: l.type, data_mode: "demo",
        }))
      );

      // Employees
      const empDefs = seed.employees.map((e) => ({
        organisation_id,
        first_name: e.first,
        last_name: e.last,
        email: `${e.first.toLowerCase()}.${e.last.toLowerCase().replace(/'/g, "")}@${orgDomain}`,
        department_id: depts[e.dept].id,
        job_role_id: roles[e.role].id,
        work_location_id: locs[e.loc].id,
        employment_status: e.status,
        contract_type: e.contract,
        start_date: e.start || today,
        annual_salary: e.salary,
        salary_currency: currency,
        pay_frequency: "monthly",
        pay_basic: e.salary ? Math.round(e.salary / 12) : 0,
        pay_allowances: [],
        pay_deductions: [],
        data_mode: "demo",
      }));
      const emps = await svc.entities.Employee.bulkCreate(empDefs);

      // Set manager relationships
      for (const [empIdx, mgrIdx] of Object.entries(seed.managerMap)) {
        await svc.entities.Employee.update(emps[empIdx].id, { manager_id: emps[mgrIdx].id });
      }

      // Employment records
      await svc.entities.EmploymentRecord.bulkCreate(
        emps.map((e) => ({
          organisation_id,
          employee_id: e.id,
          event_type: "hired",
          to_status: e.employment_status,
          to_job_role_id: e.job_role_id,
          to_department_id: e.department_id,
          effective_date: e.start_date || today,
          notes: "Employee record created",
          recorded_by: user.id,
          recorded_date: new Date().toISOString(),
          data_mode: "demo",
        }))
      );

      // Leave type + a couple of requests
      const leaveType = await svc.entities.LeaveType.create({
        organisation_id, name: "Annual Leave", description: "Annual paid leave",
        is_paid: true, default_annual_allowance: 25, carry_over_allowed: true,
        carry_over_limit: 5, requires_approval: true, colour: "#1a8a8a",
        is_active: true, data_mode: "demo",
      });

      const onLeaveEmp = emps.find((e) => e.employment_status === "on_leave");
      if (onLeaveEmp) {
        await svc.entities.LeaveRequest.create({
          organisation_id, employee_id: onLeaveEmp.id,
          employee_name: `${onLeaveEmp.first_name} ${onLeaveEmp.last_name}`,
          leave_type_id: leaveType.id, leave_type_name: "Annual Leave",
          start_date: today, end_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          total_days: 5, reason: "Pre-arranged annual leave",
          status: "approved",
          requested_date: new Date(Date.now() - 3 * 86400000).toISOString(),
          requested_by: user.id, requested_by_name: user.full_name || user.email,
          approver_id: user.id, approver_name: user.full_name || user.email,
          decision_date: new Date(Date.now() - 2 * 86400000).toISOString(),
          data_mode: "demo",
        });
      }

      // Attendance records (last 3 working days for active employees)
      const activeEmps = emps.filter((e) => e.employment_status === "active" || e.employment_status === "on_leave");
      const attendanceRecs = [];
      for (let dayOffset = 1; dayOffset <= 3; dayOffset++) {
        const date = new Date(Date.now() - dayOffset * 86400000).toISOString().slice(0, 10);
        for (let i = 0; i < activeEmps.length; i++) {
          const emp = activeEmps[i];
          const status = i === 0 && dayOffset === 1 ? "late" : emp.employment_status === "on_leave" ? "excused" : "present";
          attendanceRecs.push({
            organisation_id, employee_id: emp.id,
            employee_name: `${emp.first_name} ${emp.last_name}`,
            date, status,
            check_in_time: status === "present" ? "09:00" : status === "late" ? "09:25" : null,
            check_out_time: status === "present" || status === "late" ? "17:00" : null,
            recorded_by: user.id, recorded_by_name: user.full_name || user.email,
            recorded_date: new Date().toISOString(),
            data_mode: "demo",
          });
        }
      }
      if (attendanceRecs.length > 0) {
        await svc.entities.AttendanceRecord.bulkCreate(attendanceRecs);
      }

      await audit("hr.demo_seeded", "Employee", null, null, { count: emps.length });
      return Response.json({ ok: true, seeded: { departments: depts.length, job_roles: roles.length, work_locations: locs.length, employees: emps.length, attendance: attendanceRecs.length } });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}