import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  requireHrAccess,
  syncUserHrOrgs,
  getOrgConfig,
  assertOrgWritable,
} from "../../shared/hr.ts";
import { createHrAuditHelper, makeOwnRecordCheck, todayISO } from "../../shared/hrBackend.ts";
import {
  DEFAULT_COMPLIANCE_ITEMS,
  computeEffectiveStatus,
  isDueSoon,
} from "../../shared/hrCompliance.ts";

// Organisation-isolated HR compliance management (items, alerts).
// Every action requires an HR-authorised role.
//
// Actions:
//   list_items — all compliance items with computed effective status
//   get_alerts — items that are overdue or due soon
//   create_item
//   update_item
//   delete_item
//   complete_item — mark completed + set last_completed_date
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

    // Enrich items with computed effective status
    function enrichItem(item) {
      const effectiveStatus = computeEffectiveStatus(item, today());
      return {
        ...item,
        effective_status: effectiveStatus,
        is_due_soon: isDueSoon(item, today()),
      };
    }

    // ================ LIST ITEMS ================
    if (action === "list_items") {
      const { category, status } = body;
      let items = await svc.entities.ComplianceItem.filter({ organisation_id });
      if (category) items = items.filter((i) => i.category === category);
      items = items.map(enrichItem);
      if (status) items = items.filter((i) => i.effective_status === status);
      return Response.json({ items });
    }

    // ================ GET ALERTS ================
    if (action === "get_alerts") {
      const items = await svc.entities.ComplianceItem.filter({ organisation_id });
      const enriched = items.map(enrichItem);
      const alerts = enriched.filter(
        (i) => i.effective_status === "overdue" || i.is_due_soon
      );
      // Sort: overdue first, then by deadline
      alerts.sort((a, b) => {
        if (a.effective_status === "overdue" && b.effective_status !== "overdue") return -1;
        if (a.effective_status !== "overdue" && b.effective_status === "overdue") return 1;
        return (a.deadline_date || "").localeCompare(b.deadline_date || "");
      });
      return Response.json({ alerts });
    }

    // ================ CREATE ITEM ================
    if (action === "create_item") {
      assertOrgWritable(org);
      const { title, description, category, owner_employee_id, deadline_date, reminder_days, recurrence, notes } = body;
      if (!title || !category) {
        return Response.json({ error: "title and category are required" }, { status: 400 });
      }

      let ownerName = null;
      if (owner_employee_id) {
        const emp = await svc.entities.Employee.get(owner_employee_id);
        if (ownRecord(emp)) {
          ownerName = [emp.first_name, emp.last_name].filter(Boolean).join(" ");
        }
      }

      const rec = await svc.entities.ComplianceItem.create({
        organisation_id,
        title,
        description: description || null,
        category,
        owner_employee_id: owner_employee_id || null,
        owner_name: ownerName,
        deadline_date: deadline_date || null,
        status: "pending",
        reminder_days: reminder_days != null ? reminder_days : 7,
        last_completed_date: null,
        recurrence: recurrence || "annual",
        notes: notes || null,
        data_mode: org.data_mode,
      });

      await audit("hr.compliance_item_created", "ComplianceItem", rec.id, null, {
        title,
        category,
        deadline_date,
      });
      return Response.json({ ok: true, id: rec.id });
    }

    // ================ UPDATE ITEM ================
    if (action === "update_item") {
      assertOrgWritable(org);
      const { item_id, ...patch } = body;
      if (!item_id) return Response.json({ error: "Missing item_id" }, { status: 400 });
      const rec = await svc.entities.ComplianceItem.get(item_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      delete patch.item_id;
      delete patch.organisation_id;
      delete patch.data_mode;

      // Resolve owner name if owner_employee_id changed
      if (patch.owner_employee_id !== undefined) {
        if (patch.owner_employee_id) {
          const emp = await svc.entities.Employee.get(patch.owner_employee_id);
          if (ownRecord(emp)) {
            patch.owner_name = [emp.first_name, emp.last_name].filter(Boolean).join(" ");
          }
        } else {
          patch.owner_name = null;
        }
      }

      await svc.entities.ComplianceItem.update(item_id, patch);
      await audit("hr.compliance_item_updated", "ComplianceItem", item_id, { title: rec.title }, patch);
      return Response.json({ ok: true });
    }

    // ================ DELETE ITEM ================
    if (action === "delete_item") {
      assertOrgWritable(org);
      const { item_id } = body;
      if (!item_id) return Response.json({ error: "Missing item_id" }, { status: 400 });
      const rec = await svc.entities.ComplianceItem.get(item_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      await svc.entities.ComplianceItem.delete(item_id);
      await audit("hr.compliance_item_deleted", "ComplianceItem", item_id, { title: rec.title }, null);
      return Response.json({ ok: true });
    }

    // ================ COMPLETE ITEM ================
    if (action === "complete_item") {
      assertOrgWritable(org);
      const { item_id, completion_notes } = body;
      if (!item_id) return Response.json({ error: "Missing item_id" }, { status: 400 });

      const rec = await svc.entities.ComplianceItem.get(item_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });

      const patch = {
        status: "completed",
        last_completed_date: today(),
      };
      if (completion_notes) {
        patch.notes = (rec.notes ? rec.notes + "\n\n" : "") + `Completed: ${completion_notes}`;
      }

      // For recurring items, compute next deadline
      if (rec.recurrence && rec.recurrence !== "one_off" && rec.deadline_date) {
        const nextDeadline = computeNextDeadline(rec.deadline_date, rec.recurrence);
        if (nextDeadline) {
          patch.deadline_date = nextDeadline;
          patch.status = "pending"; // Reset to pending for the next cycle
        }
      }

      await svc.entities.ComplianceItem.update(item_id, patch);
      await audit("hr.compliance_item_completed", "ComplianceItem", item_id, { status: rec.status }, patch);
      return Response.json({ ok: true });
    }

    // ================ SEED DEMO ================
    if (action === "seed_demo") {
      if (org.data_mode !== "demo") {
        return Response.json({ error: "Demo seed is only available in Demo mode" }, { status: 400 });
      }

      const existing = await svc.entities.ComplianceItem.filter({ organisation_id, data_mode: "demo" });
      if (existing.length > 0) {
        return Response.json({ ok: true, message: "Demo data already seeded" });
      }

      const now = new Date();
      for (const item of DEFAULT_COMPLIANCE_ITEMS) {
        const deadline = new Date(now);
        deadline.setMonth(deadline.getMonth() + item.deadline_months_ahead);
        const deadlineStr = deadline.toISOString().slice(0, 10);

        // Make one item overdue for demo
        let status = "pending";
        let demoDeadline = deadlineStr;
        if (item.title.includes("PAYE")) {
          const overdueDate = new Date(now);
          overdueDate.setDate(overdueDate.getDate() - 5);
          demoDeadline = overdueDate.toISOString().slice(0, 10);
        }

        await svc.entities.ComplianceItem.create({
          organisation_id,
          title: item.title,
          description: item.description,
          category: item.category,
          owner_employee_id: null,
          owner_name: null,
          deadline_date: demoDeadline,
          status: "pending",
          reminder_days: item.reminder_days,
          last_completed_date: null,
          recurrence: item.recurrence,
          notes: null,
          data_mode: "demo",
        });
      }

      await audit("hr.compliance_demo_seeded", "ComplianceItem", null, null, {
        items: DEFAULT_COMPLIANCE_ITEMS.length,
      });
      return Response.json({ ok: true, seeded: { items: DEFAULT_COMPLIANCE_ITEMS.length } });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Compute the next deadline for a recurring compliance item.
function computeNextDeadline(currentDeadline, recurrence) {
  const d = new Date(currentDeadline + "T00:00:00");
  if (recurrence === "monthly") {
    d.setMonth(d.getMonth() + 1);
  } else if (recurrence === "quarterly") {
    d.setMonth(d.getMonth() + 3);
  } else if (recurrence === "annual") {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    return null; // one_off
  }
  return d.toISOString().slice(0, 10);
}