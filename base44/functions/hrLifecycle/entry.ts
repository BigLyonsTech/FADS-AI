import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  requireHrAccess,
  syncUserHrOrgs,
  getOrgConfig,
  assertOrgWritable,
  hrWording,
} from "../../shared/hr.ts";
import { createHrAuditHelper, makeOwnRecordCheck, todayISO } from "../../shared/hrBackend.ts";
import {
  DEFAULT_ONBOARDING_TASKS,
  DEFAULT_OFFBOARDING_TASKS,
  buildTasksFromTemplate,
} from "../../shared/hrLifecycle.ts";

// Organisation-isolated HR lifecycle operations (onboarding and offboarding
// templates and checklists). Every action requires an HR-authorised role.
//
// Actions:
//   list/create/update/delete_onboarding_templates
//   get_onboarding_checklist     — returns checklist for an employee (or null)
//   create_onboarding_checklist  — create from a template
//   update_onboarding_task       — mark task complete/incomplete with evidence
//   complete_onboarding          — mark checklist done + activate employee
//
//   list/create/update/delete_offboarding_templates
//   get_offboarding_checklist
//   create_offboarding_checklist — create from a template (with final date + reason)
//   update_offboarding_task
//   complete_offboarding          — mark done + safely archive employee
//
//   seed_demo — fictional demo templates and checklists (Demo mode only)
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
    const wording = hrWording(org.type);

    const audit = createHrAuditHelper(svc, organisation_id, user);
    const ownRecord = makeOwnRecordCheck(organisation_id);
    const today = todayISO;

    // ================ ONBOARDING TEMPLATES ================
    if (action === "list_onboarding_templates") {
      const templates = await svc.entities.OnboardingTemplate.filter({
        organisation_id,
      });
      return Response.json({ templates });
    }

    if (action === "create_onboarding_template") {
      assertOrgWritable(org);
      const { name, description, tasks } = body;
      if (!name)
        return Response.json({ error: "name is required" }, { status: 400 });

      const rec = await svc.entities.OnboardingTemplate.create({
        organisation_id,
        name,
        description: description || null,
        org_type: org.type,
        tasks: tasks && tasks.length > 0 ? tasks : DEFAULT_ONBOARDING_TASKS,
        is_active: true,
        data_mode: org.data_mode,
      });
      await audit("hr.onboarding_template_created", "OnboardingTemplate", rec.id, null, {
        name,
        task_count: (rec.tasks || []).length,
      });
      return Response.json({ ok: true, id: rec.id });
    }

    if (action === "update_onboarding_template") {
      assertOrgWritable(org);
      const { template_id, ...patch } = body;
      if (!template_id)
        return Response.json({ error: "Missing template_id" }, { status: 400 });
      const rec = await svc.entities.OnboardingTemplate.get(template_id);
      if (!ownRecord(rec))
        return Response.json({ error: "Not found" }, { status: 404 });
      delete patch.template_id;
      delete patch.organisation_id;
      delete patch.data_mode;
      delete patch.org_type;
      await svc.entities.OnboardingTemplate.update(template_id, patch);
      await audit("hr.onboarding_template_updated", "OnboardingTemplate", template_id, { name: rec.name }, patch);
      return Response.json({ ok: true });
    }

    if (action === "delete_onboarding_template") {
      assertOrgWritable(org);
      const { template_id } = body;
      if (!template_id)
        return Response.json({ error: "Missing template_id" }, { status: 400 });
      const rec = await svc.entities.OnboardingTemplate.get(template_id);
      if (!ownRecord(rec))
        return Response.json({ error: "Not found" }, { status: 404 });
      await svc.entities.OnboardingTemplate.delete(template_id);
      await audit("hr.onboarding_template_deleted", "OnboardingTemplate", template_id, { name: rec.name }, null);
      return Response.json({ ok: true });
    }

    // ================ ONBOARDING CHECKLISTS ================
    if (action === "get_onboarding_checklist") {
      const { employee_id } = body;
      if (!employee_id)
        return Response.json({ error: "Missing employee_id" }, { status: 400 });

      const emp = await svc.entities.Employee.get(employee_id);
      if (!ownRecord(emp))
        return Response.json({ error: "Not found" }, { status: 404 });

      const checklists = await svc.entities.OnboardingChecklist.filter({
        organisation_id,
        employee_id,
      });

      const checklist = checklists[0] || null;
      const templates = await svc.entities.OnboardingTemplate.filter({
        organisation_id,
        is_active: true,
      });

      if (checklist) {
        const completed = (checklist.tasks || []).filter((t) => t.is_completed).length;
        const total = (checklist.tasks || []).length;
        return Response.json({
          checklist: { ...checklist, completed_count: completed, total_count: total },
          templates,
          wording,
        });
      }

      return Response.json({ checklist: null, templates, wording });
    }

    if (action === "create_onboarding_checklist") {
      assertOrgWritable(org);
      const { employee_id, template_id } = body;
      if (!employee_id)
        return Response.json({ error: "Missing employee_id" }, { status: 400 });

      const emp = await svc.entities.Employee.get(employee_id);
      if (!ownRecord(emp))
        return Response.json({ error: "Not found" }, { status: 404 });

      // Check if a checklist already exists
      const existing = await svc.entities.OnboardingChecklist.filter({
        organisation_id,
        employee_id,
      });
      if (existing.length > 0) {
        return Response.json({ error: "Onboarding checklist already exists for this employee" }, { status: 400 });
      }

      let template = null;
      if (template_id) {
        template = await svc.entities.OnboardingTemplate.get(template_id);
        if (!ownRecord(template))
          return Response.json({ error: "Template not found" }, { status: 404 });
      } else {
        // Use the first active template
        const templates = await svc.entities.OnboardingTemplate.filter({
          organisation_id,
          is_active: true,
        });
        template = templates[0] || null;
      }

      if (!template) {
        return Response.json({ error: "No active onboarding template found. Create a template first." }, { status: 400 });
      }

      const tasks = buildTasksFromTemplate(
        template.tasks,
        emp.start_date || today()
      );

      const rec = await svc.entities.OnboardingChecklist.create({
        organisation_id,
        employee_id,
        template_id: template.id,
        template_name: template.name,
        status: "not_started",
        tasks,
        started_date: null,
        completed_date: null,
        data_mode: org.data_mode,
      });

      await audit("hr.onboarding_checklist_created", "OnboardingChecklist", rec.id, null, {
        employee_id,
        template_name: template.name,
      });
      return Response.json({ ok: true, id: rec.id });
    }

    if (action === "update_onboarding_task") {
      assertOrgWritable(org);
      const {
        checklist_id,
        task_index,
        is_completed,
        evidence_notes,
        evidence_file_uri,
        confirmation_recorded,
      } = body;
      if (!checklist_id)
        return Response.json({ error: "Missing checklist_id" }, { status: 400 });

      const checklist = await svc.entities.OnboardingChecklist.get(checklist_id);
      if (!ownRecord(checklist))
        return Response.json({ error: "Not found" }, { status: 404 });

      const tasks = [...(checklist.tasks || [])];
      if (task_index == null || task_index < 0 || task_index >= tasks.length) {
        return Response.json({ error: "Invalid task_index" }, { status: 400 });
      }

      const task = { ...tasks[task_index] };

      if (is_completed) {
        if (task.requires_confirmation && !confirmation_recorded) {
          return Response.json(
            { error: "This task requires explicit confirmation before it can be marked complete" },
            { status: 400 }
          );
        }
        task.is_completed = true;
        task.completed_date = today();
        task.completed_by = user.id;
        task.completed_by_name = user.full_name || user.email;
        task.evidence_notes = evidence_notes || null;
        task.evidence_file_uri = evidence_file_uri || null;
        task.confirmation_recorded = confirmation_recorded || false;
      } else {
        task.is_completed = false;
        task.completed_date = null;
        task.completed_by = null;
        task.completed_by_name = null;
        task.evidence_notes = null;
        task.evidence_file_uri = null;
        task.confirmation_recorded = false;
      }

      tasks[task_index] = task;

      const completedCount = tasks.filter((t) => t.is_completed).length;
      let newStatus = checklist.status;
      if (completedCount === 0) newStatus = "not_started";
      else if (completedCount === tasks.length) newStatus = "completed";
      else newStatus = "in_progress";

      await svc.entities.OnboardingChecklist.update(checklist_id, {
        tasks,
        status: newStatus,
        started_date:
          checklist.started_date ||
          (newStatus !== "not_started" ? today() : null),
      });

      await audit(
        "hr.onboarding_task_updated",
        "OnboardingChecklist",
        checklist_id,
        { task_index, was_completed: !is_completed },
        { is_completed, task_title: task.title }
      );

      return Response.json({
        ok: true,
        status: newStatus,
        completed_count: completedCount,
        total_count: tasks.length,
      });
    }

    if (action === "complete_onboarding") {
      assertOrgWritable(org);
      const { checklist_id } = body;
      if (!checklist_id)
        return Response.json({ error: "Missing checklist_id" }, { status: 400 });

      const checklist = await svc.entities.OnboardingChecklist.get(checklist_id);
      if (!ownRecord(checklist))
        return Response.json({ error: "Not found" }, { status: 404 });

      const tasks = checklist.tasks || [];
      const incomplete = tasks.filter((t) => !t.is_completed);
      if (incomplete.length > 0) {
        return Response.json(
          { error: `${incomplete.length} task(s) are not yet completed` },
          { status: 400 }
        );
      }

      await svc.entities.OnboardingChecklist.update(checklist_id, {
        status: "completed",
        completed_date: today(),
      });

      // Activate the employee if still onboarding
      const emp = await svc.entities.Employee.get(checklist.employee_id);
      if (emp && emp.employment_status === "onboarding") {
        await svc.entities.Employee.update(checklist.employee_id, {
          employment_status: "active",
        });
        await svc.entities.EmploymentRecord.create({
          organisation_id,
          employee_id: checklist.employee_id,
          event_type: "status_change",
          from_status: "onboarding",
          to_status: "active",
          effective_date: today(),
          notes: "Onboarding checklist completed",
          recorded_by: user.id,
          recorded_date: new Date().toISOString(),
          data_mode: emp.data_mode,
        });
      }

      await audit("hr.onboarding_completed", "OnboardingChecklist", checklist_id, { status: checklist.status }, { status: "completed" });
      return Response.json({ ok: true });
    }

    // ================ OFFBOARDING TEMPLATES ================
    if (action === "list_offboarding_templates") {
      const templates = await svc.entities.OffboardingTemplate.filter({
        organisation_id,
      });
      return Response.json({ templates });
    }

    if (action === "create_offboarding_template") {
      assertOrgWritable(org);
      const { name, description, tasks } = body;
      if (!name)
        return Response.json({ error: "name is required" }, { status: 400 });

      const rec = await svc.entities.OffboardingTemplate.create({
        organisation_id,
        name,
        description: description || null,
        org_type: org.type,
        tasks: tasks && tasks.length > 0 ? tasks : DEFAULT_OFFBOARDING_TASKS,
        is_active: true,
        data_mode: org.data_mode,
      });
      await audit("hr.offboarding_template_created", "OffboardingTemplate", rec.id, null, {
        name,
        task_count: (rec.tasks || []).length,
      });
      return Response.json({ ok: true, id: rec.id });
    }

    if (action === "update_offboarding_template") {
      assertOrgWritable(org);
      const { template_id, ...patch } = body;
      if (!template_id)
        return Response.json({ error: "Missing template_id" }, { status: 400 });
      const rec = await svc.entities.OffboardingTemplate.get(template_id);
      if (!ownRecord(rec))
        return Response.json({ error: "Not found" }, { status: 404 });
      delete patch.template_id;
      delete patch.organisation_id;
      delete patch.data_mode;
      delete patch.org_type;
      await svc.entities.OffboardingTemplate.update(template_id, patch);
      await audit("hr.offboarding_template_updated", "OffboardingTemplate", template_id, { name: rec.name }, patch);
      return Response.json({ ok: true });
    }

    if (action === "delete_offboarding_template") {
      assertOrgWritable(org);
      const { template_id } = body;
      if (!template_id)
        return Response.json({ error: "Missing template_id" }, { status: 400 });
      const rec = await svc.entities.OffboardingTemplate.get(template_id);
      if (!ownRecord(rec))
        return Response.json({ error: "Not found" }, { status: 404 });
      await svc.entities.OffboardingTemplate.delete(template_id);
      await audit("hr.offboarding_template_deleted", "OffboardingTemplate", template_id, { name: rec.name }, null);
      return Response.json({ ok: true });
    }

    // ================ OFFBOARDING CHECKLISTS ================
    if (action === "get_offboarding_checklist") {
      const { employee_id } = body;
      if (!employee_id)
        return Response.json({ error: "Missing employee_id" }, { status: 400 });

      const emp = await svc.entities.Employee.get(employee_id);
      if (!ownRecord(emp))
        return Response.json({ error: "Not found" }, { status: 404 });

      const checklists = await svc.entities.OffboardingChecklist.filter({
        organisation_id,
        employee_id,
      });

      const checklist = checklists[0] || null;
      const templates = await svc.entities.OffboardingTemplate.filter({
        organisation_id,
        is_active: true,
      });

      if (checklist) {
        const completed = (checklist.tasks || []).filter((t) => t.is_completed).length;
        const total = (checklist.tasks || []).length;
        return Response.json({
          checklist: { ...checklist, completed_count: completed, total_count: total },
          templates,
          wording,
        });
      }

      return Response.json({ checklist: null, templates, wording });
    }

    if (action === "create_offboarding_checklist") {
      assertOrgWritable(org);
      const { employee_id, template_id, final_working_date, reason_category, reason_notes } = body;
      if (!employee_id)
        return Response.json({ error: "Missing employee_id" }, { status: 400 });

      const emp = await svc.entities.Employee.get(employee_id);
      if (!ownRecord(emp))
        return Response.json({ error: "Not found" }, { status: 404 });

      if (emp.employment_status === "former_employee") {
        return Response.json({ error: "This employee has already been offboarded" }, { status: 400 });
      }

      const existing = await svc.entities.OffboardingChecklist.filter({
        organisation_id,
        employee_id,
      });
      if (existing.length > 0) {
        return Response.json({ error: "Offboarding checklist already exists for this employee" }, { status: 400 });
      }

      let template = null;
      if (template_id) {
        template = await svc.entities.OffboardingTemplate.get(template_id);
        if (!ownRecord(template))
          return Response.json({ error: "Template not found" }, { status: 404 });
      } else {
        const templates = await svc.entities.OffboardingTemplate.filter({
          organisation_id,
          is_active: true,
        });
        template = templates[0] || null;
      }

      if (!template) {
        return Response.json({ error: "No active offboarding template found. Create a template first." }, { status: 400 });
      }

      const baseDate = final_working_date || today();
      const tasks = buildTasksFromTemplate(template.tasks, baseDate);

      const rec = await svc.entities.OffboardingChecklist.create({
        organisation_id,
        employee_id,
        template_id: template.id,
        template_name: template.name,
        status: "not_started",
        final_working_date: final_working_date || null,
        reason_category: reason_category || null,
        reason_notes: reason_notes || null,
        tasks,
        started_date: today(),
        completed_date: null,
        archived_employee: false,
        data_mode: org.data_mode,
      });

      // Set employee status to offboarding if not already
      if (emp.employment_status !== "offboarding") {
        await svc.entities.Employee.update(employee_id, {
          employment_status: "offboarding",
        });
        await svc.entities.EmploymentRecord.create({
          organisation_id,
          employee_id,
          event_type: "offboarding_started",
          from_status: emp.employment_status,
          to_status: "offboarding",
          effective_date: today(),
          notes: "Offboarding checklist created",
          recorded_by: user.id,
          recorded_date: new Date().toISOString(),
          data_mode: emp.data_mode,
        });
      }

      await audit("hr.offboarding_checklist_created", "OffboardingChecklist", rec.id, null, {
        employee_id,
        template_name: template.name,
        final_working_date,
        reason_category,
      });
      return Response.json({ ok: true, id: rec.id });
    }

    if (action === "update_offboarding_task") {
      assertOrgWritable(org);
      const {
        checklist_id,
        task_index,
        is_completed,
        evidence_notes,
        evidence_file_uri,
        confirmation_recorded,
      } = body;
      if (!checklist_id)
        return Response.json({ error: "Missing checklist_id" }, { status: 400 });

      const checklist = await svc.entities.OffboardingChecklist.get(checklist_id);
      if (!ownRecord(checklist))
        return Response.json({ error: "Not found" }, { status: 404 });

      const tasks = [...(checklist.tasks || [])];
      if (task_index == null || task_index < 0 || task_index >= tasks.length) {
        return Response.json({ error: "Invalid task_index" }, { status: 400 });
      }

      const task = { ...tasks[task_index] };

      if (is_completed) {
        if (task.requires_confirmation && !confirmation_recorded) {
          return Response.json(
            { error: "This task requires explicit confirmation before it can be marked complete" },
            { status: 400 }
          );
        }
        task.is_completed = true;
        task.completed_date = today();
        task.completed_by = user.id;
        task.completed_by_name = user.full_name || user.email;
        task.evidence_notes = evidence_notes || null;
        task.evidence_file_uri = evidence_file_uri || null;
        task.confirmation_recorded = confirmation_recorded || false;
      } else {
        task.is_completed = false;
        task.completed_date = null;
        task.completed_by = null;
        task.completed_by_name = null;
        task.evidence_notes = null;
        task.evidence_file_uri = null;
        task.confirmation_recorded = false;
      }

      tasks[task_index] = task;

      const completedCount = tasks.filter((t) => t.is_completed).length;
      let newStatus = checklist.status;
      if (completedCount === 0) newStatus = "not_started";
      else if (completedCount === tasks.length) newStatus = "completed";
      else newStatus = "in_progress";

      await svc.entities.OffboardingChecklist.update(checklist_id, {
        tasks,
        status: newStatus,
      });

      await audit(
        "hr.offboarding_task_updated",
        "OffboardingChecklist",
        checklist_id,
        { task_index, was_completed: !is_completed },
        { is_completed, task_title: task.title }
      );

      return Response.json({
        ok: true,
        status: newStatus,
        completed_count: completedCount,
        total_count: tasks.length,
      });
    }

    if (action === "complete_offboarding") {
      assertOrgWritable(org);
      const { checklist_id } = body;
      if (!checklist_id)
        return Response.json({ error: "Missing checklist_id" }, { status: 400 });

      const checklist = await svc.entities.OffboardingChecklist.get(checklist_id);
      if (!ownRecord(checklist))
        return Response.json({ error: "Not found" }, { status: 404 });

      const tasks = checklist.tasks || [];
      const incomplete = tasks.filter((t) => !t.is_completed);
      if (incomplete.length > 0) {
        return Response.json(
          { error: `${incomplete.length} task(s) are not yet completed` },
          { status: 400 }
        );
      }

      await svc.entities.OffboardingChecklist.update(checklist_id, {
        status: "completed",
        completed_date: today(),
        archived_employee: true,
      });

      // Safely archive the employee (set to former_employee, don't delete)
      const emp = await svc.entities.Employee.get(checklist.employee_id);
      if (emp && emp.employment_status !== "former_employee") {
        const finalDate = checklist.final_working_date || today();
        await svc.entities.Employee.update(checklist.employee_id, {
          employment_status: "former_employee",
          end_date: finalDate,
        });
        await svc.entities.EmploymentRecord.create({
          organisation_id,
          employee_id: checklist.employee_id,
          event_type: "offboarding_completed",
          from_status: emp.employment_status,
          to_status: "former_employee",
          effective_date: finalDate,
          notes: "Offboarding checklist completed — employee safely archived",
          recorded_by: user.id,
          recorded_date: new Date().toISOString(),
          data_mode: emp.data_mode,
        });
      }

      await audit("hr.offboarding_completed", "OffboardingChecklist", checklist_id, { status: checklist.status }, { status: "completed", archived: true });
      return Response.json({ ok: true });
    }

    // ================ SEED DEMO ================
    if (action === "seed_demo") {
      if (org.data_mode !== "demo") {
        return Response.json({ error: "Demo seed is only available in Demo mode" }, { status: 400 });
      }

      const existingTemplates = await svc.entities.OnboardingTemplate.filter({
        organisation_id,
        data_mode: "demo",
      });
      if (existingTemplates.length > 0) {
        return Response.json({ ok: true, message: "Demo data already seeded" });
      }

      // Create default onboarding template
      const onboardingTemplate = await svc.entities.OnboardingTemplate.create({
        organisation_id,
        name: "Standard Onboarding",
        description: "Default onboarding checklist for new employees",
        org_type: org.type,
        tasks: DEFAULT_ONBOARDING_TASKS,
        is_active: true,
        data_mode: "demo",
      });

      // Create default offboarding template
      const offboardingTemplate = await svc.entities.OffboardingTemplate.create({
        organisation_id,
        name: "Standard Offboarding",
        description: "Default offboarding checklist for departing employees",
        org_type: org.type,
        tasks: DEFAULT_OFFBOARDING_TASKS,
        is_active: true,
        data_mode: "demo",
      });

      // Create checklists for onboarding and offboarding employees
      const employees = await svc.entities.Employee.filter({
        organisation_id,
        data_mode: "demo",
      });

      const onboardingEmps = employees.filter((e) => e.employment_status === "onboarding");
      const offboardingEmps = employees.filter((e) => e.employment_status === "offboarding");

      let checklistsCreated = 0;

      for (const emp of onboardingEmps) {
        const tasks = buildTasksFromTemplate(DEFAULT_ONBOARDING_TASKS, emp.start_date || today());
        // Mark first 2 tasks as completed for demo
        if (tasks.length >= 2) {
          tasks[0].is_completed = true;
          tasks[0].completed_date = today();
          tasks[0].completed_by = user.id;
          tasks[0].completed_by_name = user.full_name || user.email;
          tasks[0].evidence_notes = "Information verified during intake";
          tasks[1].is_completed = true;
          tasks[1].completed_date = today();
          tasks[1].completed_by = user.id;
          tasks[1].completed_by_name = user.full_name || user.email;
          tasks[1].evidence_notes = "Documents uploaded to system";
        }
        const completedCount = tasks.filter((t) => t.is_completed).length;
        await svc.entities.OnboardingChecklist.create({
          organisation_id,
          employee_id: emp.id,
          template_id: onboardingTemplate.id,
          template_name: onboardingTemplate.name,
          status: completedCount === tasks.length ? "completed" : completedCount > 0 ? "in_progress" : "not_started",
          tasks,
          started_date: today(),
          completed_date: null,
          data_mode: "demo",
        });
        checklistsCreated++;
      }

      for (const emp of offboardingEmps) {
        const tasks = buildTasksFromTemplate(DEFAULT_OFFBOARDING_TASKS, emp.end_date || today());
        // Mark first 3 tasks as completed for demo
        for (let i = 0; i < Math.min(3, tasks.length); i++) {
          tasks[i].is_completed = true;
          tasks[i].completed_date = today();
          tasks[i].completed_by = user.id;
          tasks[i].completed_by_name = user.full_name || user.email;
          if (tasks[i].requires_confirmation) {
            tasks[i].confirmation_recorded = true;
            tasks[i].evidence_notes = "Access revoked and confirmed";
          }
        }
        const completedCount = tasks.filter((t) => t.is_completed).length;
        await svc.entities.OffboardingChecklist.create({
          organisation_id,
          employee_id: emp.id,
          template_id: offboardingTemplate.id,
          template_name: offboardingTemplate.name,
          status: completedCount === tasks.length ? "completed" : completedCount > 0 ? "in_progress" : "not_started",
          final_working_date: emp.end_date || today(),
          reason_category: "resignation",
          reason_notes: "Demo offboarding reason",
          tasks,
          started_date: today(),
          completed_date: null,
          archived_employee: false,
          data_mode: "demo",
        });
        checklistsCreated++;
      }

      await audit("hr.lifecycle_demo_seeded", "OnboardingTemplate", null, null, {
        templates: 2,
        checklists: checklistsCreated,
      });
      return Response.json({
        ok: true,
        seeded: {
          onboarding_template: 1,
          offboarding_template: 1,
          checklists: checklistsCreated,
        },
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}