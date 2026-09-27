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
  DEFAULT_LEAVE_TYPES,
  computeWorkingDays,
  findOverlappingRequests,
  computeRemainingBalance,
  resolveAllowance,
  getOrCreateBalance,
} from "../../shared/hrLeave.ts";

// Organisation-isolated HR leave management (types, policies, balances,
// requests, approvals). Every action requires an HR-authorised role.
//
// Actions:
//   list/create/update/delete_leave_types
//   list/create/update/delete_policies
//   list_balances  — all or filtered by employee_id
//   get_balances   — for a specific employee (auto-creates from policy)
//   adjust_balance — manual override of allowance/carried_over (HR only)
//   list_requests  — all or filtered by employee_id / status
//   get_request
//   create_request — submit a leave request (checks overlap + balance)
//   approve_request — approve with comments (updates balance used_days)
//   reject_request  — reject with comments
//   cancel_request  — cancel a pending/approved request
//   list_calendar   — upcoming approved + pending leave for team view
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
    const wording = hrWording(org.type);

    const audit = createHrAuditHelper(svc, organisation_id, user);
    const ownRecord = makeOwnRecordCheck(organisation_id);
    const today = todayISO;
    const currentYear = new Date().getFullYear();

    // Helper: get public holidays for working-days calc
    async function getHolidays() {
      const holidays = await svc.entities.PublicHoliday.filter({
        organisation_id,
        is_active: true,
      });
      return holidays.map((h) => h.date);
    }

    // Helper: get all leave types
    async function getLeaveTypes() {
      return svc.entities.LeaveType.filter({ organisation_id });
    }

    // Helper: get all policies
    async function getPolicies() {
      return svc.entities.LeavePolicy.filter({ organisation_id });
    }

    // ================ LEAVE TYPES ================
    if (action === "list_leave_types") {
      const types = await getLeaveTypes();
      return Response.json({ leave_types: types });
    }

    if (action === "create_leave_type") {
      assertOrgWritable(org);
      const { name, description, is_paid, default_annual_allowance, carry_over_allowed, carry_over_limit, requires_approval, requires_documentation_after_days, colour } = body;
      if (!name) return Response.json({ error: "name is required" }, { status: 400 });

      const rec = await svc.entities.LeaveType.create({
        organisation_id,
        name,
        description: description || null,
        is_paid: is_paid !== false,
        default_annual_allowance: default_annual_allowance || 0,
        carry_over_allowed: carry_over_allowed || false,
        carry_over_limit: carry_over_limit || 0,
        requires_approval: requires_approval !== false,
        requires_documentation_after_days: requires_documentation_after_days || 0,
        colour: colour || "#3b82f6",
        is_active: true,
        data_mode: org.data_mode,
      });
      await audit("hr.leave_type_created", "LeaveType", rec.id, null, { name });
      return Response.json({ ok: true, id: rec.id });
    }

    if (action === "update_leave_type") {
      assertOrgWritable(org);
      const { leave_type_id, ...patch } = body;
      if (!leave_type_id) return Response.json({ error: "Missing leave_type_id" }, { status: 400 });
      const rec = await svc.entities.LeaveType.get(leave_type_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      delete patch.leave_type_id;
      delete patch.organisation_id;
      delete patch.data_mode;
      await svc.entities.LeaveType.update(leave_type_id, patch);
      await audit("hr.leave_type_updated", "LeaveType", leave_type_id, { name: rec.name }, patch);
      return Response.json({ ok: true });
    }

    if (action === "delete_leave_type") {
      assertOrgWritable(org);
      const { leave_type_id } = body;
      if (!leave_type_id) return Response.json({ error: "Missing leave_type_id" }, { status: 400 });
      const rec = await svc.entities.LeaveType.get(leave_type_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      await svc.entities.LeaveType.delete(leave_type_id);
      await audit("hr.leave_type_deleted", "LeaveType", leave_type_id, { name: rec.name }, null);
      return Response.json({ ok: true });
    }

    // ================ LEAVE POLICIES ================
    if (action === "list_policies") {
      const policies = await getPolicies();
      return Response.json({ policies });
    }

    if (action === "create_policy") {
      assertOrgWritable(org);
      const { name, description, applicable_contract_types, allowances } = body;
      if (!name) return Response.json({ error: "name is required" }, { status: 400 });

      const rec = await svc.entities.LeavePolicy.create({
        organisation_id,
        name,
        description: description || null,
        applicable_contract_types: applicable_contract_types || [],
        allowances: allowances || [],
        is_active: true,
        data_mode: org.data_mode,
      });
      await audit("hr.leave_policy_created", "LeavePolicy", rec.id, null, { name });
      return Response.json({ ok: true, id: rec.id });
    }

    if (action === "update_policy") {
      assertOrgWritable(org);
      const { policy_id, ...patch } = body;
      if (!policy_id) return Response.json({ error: "Missing policy_id" }, { status: 400 });
      const rec = await svc.entities.LeavePolicy.get(policy_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      delete patch.policy_id;
      delete patch.organisation_id;
      delete patch.data_mode;
      await svc.entities.LeavePolicy.update(policy_id, patch);
      await audit("hr.leave_policy_updated", "LeavePolicy", policy_id, { name: rec.name }, patch);
      return Response.json({ ok: true });
    }

    if (action === "delete_policy") {
      assertOrgWritable(org);
      const { policy_id } = body;
      if (!policy_id) return Response.json({ error: "Missing policy_id" }, { status: 400 });
      const rec = await svc.entities.LeavePolicy.get(policy_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      await svc.entities.LeavePolicy.delete(policy_id);
      await audit("hr.leave_policy_deleted", "LeavePolicy", policy_id, { name: rec.name }, null);
      return Response.json({ ok: true });
    }

    // ================ LEAVE BALANCES ================
    if (action === "list_balances") {
      const { employee_id, year } = body;
      const filter = { organisation_id };
      if (employee_id) filter.employee_id = employee_id;
      if (year) filter.year = year;
      else filter.year = currentYear;

      const balances = await svc.entities.LeaveBalance.filter(filter);
      const enriched = balances.map((b) => ({
        ...b,
        remaining_days: computeRemainingBalance(b),
      }));
      return Response.json({ balances: enriched });
    }

    if (action === "get_balances") {
      const { employee_id } = body;
      if (!employee_id) return Response.json({ error: "Missing employee_id" }, { status: 400 });

      const emp = await svc.entities.Employee.get(employee_id);
      if (!ownRecord(emp)) return Response.json({ error: "Not found" }, { status: 404 });

      const leaveTypes = await getLeaveTypes();
      const policies = await getPolicies();
      const balances = [];

      for (const lt of leaveTypes) {
        if (!lt.is_active) continue;
        const bal = await getOrCreateBalance(
          svc, organisation_id, emp, lt, currentYear, policies, org.data_mode
        );
        balances.push({ ...bal, remaining_days: computeRemainingBalance(bal) });
      }

      return Response.json({ balances });
    }

    if (action === "adjust_balance") {
      assertOrgWritable(org);
      const { balance_id, annual_allowance, carried_over } = body;
      if (!balance_id) return Response.json({ error: "Missing balance_id" }, { status: 400 });

      const bal = await svc.entities.LeaveBalance.get(balance_id);
      if (!ownRecord(bal)) return Response.json({ error: "Not found" }, { status: 404 });

      const patch = {};
      if (annual_allowance != null) patch.annual_allowance = annual_allowance;
      if (carried_over != null) patch.carried_over = carried_over;

      await svc.entities.LeaveBalance.update(balance_id, patch);
      await audit("hr.leave_balance_adjusted", "LeaveBalance", balance_id, {
        annual_allowance: bal.annual_allowance,
        carried_over: bal.carried_over,
      }, patch);

      return Response.json({ ok: true });
    }

    // ================ LEAVE REQUESTS ================
    if (action === "list_requests") {
      const { employee_id, status } = body;
      const filter = { organisation_id };
      if (employee_id) filter.employee_id = employee_id;
      if (status) filter.status = status;

      const requests = await svc.entities.LeaveRequest.filter(filter, "-requested_date", 100);
      return Response.json({ requests });
    }

    if (action === "get_request") {
      const { request_id } = body;
      if (!request_id) return Response.json({ error: "Missing request_id" }, { status: 400 });
      const req = await svc.entities.LeaveRequest.get(request_id);
      if (!ownRecord(req)) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ request: req });
    }

    if (action === "create_request") {
      assertOrgWritable(org);
      const { employee_id, leave_type_id, start_date, end_date, reason, documentation_provided } = body;
      if (!employee_id || !leave_type_id || !start_date || !end_date) {
        return Response.json({ error: "employee_id, leave_type_id, start_date and end_date are required" }, { status: 400 });
      }

      const emp = await svc.entities.Employee.get(employee_id);
      if (!ownRecord(emp)) return Response.json({ error: "Employee not found" }, { status: 404 });

      const lt = await svc.entities.LeaveType.get(leave_type_id);
      if (!ownRecord(lt)) return Response.json({ error: "Leave type not found" }, { status: 404 });

      if (end_date < start_date) {
        return Response.json({ error: "End date must be on or after start date" }, { status: 400 });
      }

      // Compute working days
      const holidays = await getHolidays();
      const totalDays = computeWorkingDays(start_date, end_date, holidays);
      if (totalDays <= 0) {
        return Response.json({ error: "The selected dates contain no working days" }, { status: 400 });
      }

      // Check for overlapping requests
      const existingReqs = await svc.entities.LeaveRequest.filter({
        organisation_id,
        employee_id,
      });
      const overlaps = findOverlappingRequests(start_date, end_date, existingReqs);
      if (overlaps.length > 0) {
        return Response.json({
          error: `This request overlaps with an existing ${overlaps[0].status} request (${overlaps[0].start_date} to ${overlaps[0].end_date})`,
          overlap: overlaps[0],
        }, { status: 400 });
      }

      // Check balance for paid leave types
      if (lt.is_paid && lt.default_annual_allowance > 0) {
        const policies = await getPolicies();
        const bal = await getOrCreateBalance(
          svc, organisation_id, emp, lt, currentYear, policies, org.data_mode
        );
        const remaining = computeRemainingBalance(bal);
        if (totalDays > remaining) {
          return Response.json({
            error: `Insufficient balance: ${remaining} day(s) remaining, requesting ${totalDays} day(s)`,
            remaining,
            requested: totalDays,
          }, { status: 400 });
        }
        // Add pending days
        await svc.entities.LeaveBalance.update(bal.id, {
          pending_days: (bal.pending_days || 0) + totalDays,
        });
      }

      const status = lt.requires_approval ? "pending" : "approved";
      const rec = await svc.entities.LeaveRequest.create({
        organisation_id,
        employee_id,
        employee_name: [emp.first_name, emp.last_name].filter(Boolean).join(" "),
        leave_type_id,
        leave_type_name: lt.name,
        start_date,
        end_date,
        total_days: totalDays,
        reason: reason || null,
        status,
        requested_date: new Date().toISOString(),
        requested_by: user.id,
        requested_by_name: user.full_name || user.email,
        documentation_provided: documentation_provided || false,
        data_mode: org.data_mode,
      });

      // If auto-approved (no approval needed), update balance used_days
      if (status === "approved") {
        const policies = await getPolicies();
        const bal = await getOrCreateBalance(
          svc, organisation_id, emp, lt, currentYear, policies, org.data_mode
        );
        await svc.entities.LeaveBalance.update(bal.id, {
          used_days: (bal.used_days || 0) + totalDays,
          pending_days: Math.max(0, (bal.pending_days || 0) - totalDays),
        });
        rec.approver_id = user.id;
        rec.approver_name = user.full_name || user.email;
        rec.decision_date = new Date().toISOString();
        await svc.entities.LeaveRequest.update(rec.id, {
          approver_id: rec.approver_id,
          approver_name: rec.approver_name,
          decision_date: rec.decision_date,
          decision_comments: "Auto-approved (no approval required for this leave type)",
        });
      }

      await audit("hr.leave_request_created", "LeaveRequest", rec.id, null, {
        employee_id,
        leave_type: lt.name,
        start_date,
        end_date,
        total_days: totalDays,
        status,
      });
      return Response.json({ ok: true, id: rec.id, status, total_days: totalDays });
    }

    if (action === "approve_request") {
      assertOrgWritable(org);
      const { request_id, decision_comments } = body;
      if (!request_id) return Response.json({ error: "Missing request_id" }, { status: 400 });

      const req = await svc.entities.LeaveRequest.get(request_id);
      if (!ownRecord(req)) return Response.json({ error: "Not found" }, { status: 404 });
      if (req.status !== "pending") {
        return Response.json({ error: `Request is already ${req.status}` }, { status: 400 });
      }

      // Update balance: move from pending to used
      const balances = await svc.entities.LeaveBalance.filter({
        organisation_id,
        employee_id: req.employee_id,
        leave_type_id: req.leave_type_id,
        year: currentYear,
      });
      if (balances.length > 0) {
        const bal = balances[0];
        await svc.entities.LeaveBalance.update(bal.id, {
          used_days: (bal.used_days || 0) + (req.total_days || 0),
          pending_days: Math.max(0, (bal.pending_days || 0) - (req.total_days || 0)),
        });
      }

      await svc.entities.LeaveRequest.update(request_id, {
        status: "approved",
        approver_id: user.id,
        approver_name: user.full_name || user.email,
        decision_date: new Date().toISOString(),
        decision_comments: decision_comments || null,
      });

      await audit("hr.leave_request_approved", "LeaveRequest", request_id, { status: "pending" }, { status: "approved", comments: decision_comments });
      return Response.json({ ok: true });
    }

    if (action === "reject_request") {
      assertOrgWritable(org);
      const { request_id, decision_comments } = body;
      if (!request_id) return Response.json({ error: "Missing request_id" }, { status: 400 });

      const req = await svc.entities.LeaveRequest.get(request_id);
      if (!ownRecord(req)) return Response.json({ error: "Not found" }, { status: 404 });
      if (req.status !== "pending") {
        return Response.json({ error: `Request is already ${req.status}` }, { status: 400 });
      }

      // Release pending days from balance
      const balances = await svc.entities.LeaveBalance.filter({
        organisation_id,
        employee_id: req.employee_id,
        leave_type_id: req.leave_type_id,
        year: currentYear,
      });
      if (balances.length > 0) {
        const bal = balances[0];
        await svc.entities.LeaveBalance.update(bal.id, {
          pending_days: Math.max(0, (bal.pending_days || 0) - (req.total_days || 0)),
        });
      }

      await svc.entities.LeaveRequest.update(request_id, {
        status: "rejected",
        approver_id: user.id,
        approver_name: user.full_name || user.email,
        decision_date: new Date().toISOString(),
        decision_comments: decision_comments || null,
      });

      await audit("hr.leave_request_rejected", "LeaveRequest", request_id, { status: "pending" }, { status: "rejected", comments: decision_comments });
      return Response.json({ ok: true });
    }

    if (action === "cancel_request") {
      assertOrgWritable(org);
      const { request_id, cancel_reason } = body;
      if (!request_id) return Response.json({ error: "Missing request_id" }, { status: 400 });

      const req = await svc.entities.LeaveRequest.get(request_id);
      if (!ownRecord(req)) return Response.json({ error: "Not found" }, { status: 404 });
      if (req.status === "cancelled") {
        return Response.json({ error: "Request is already cancelled" }, { status: 400 });
      }

      // Release balance days
      const balances = await svc.entities.LeaveBalance.filter({
        organisation_id,
        employee_id: req.employee_id,
        leave_type_id: req.leave_type_id,
        year: currentYear,
      });
      if (balances.length > 0) {
        const bal = balances[0];
        if (req.status === "pending") {
          await svc.entities.LeaveBalance.update(bal.id, {
            pending_days: Math.max(0, (bal.pending_days || 0) - (req.total_days || 0)),
          });
        } else if (req.status === "approved") {
          await svc.entities.LeaveBalance.update(bal.id, {
            used_days: Math.max(0, (bal.used_days || 0) - (req.total_days || 0)),
          });
        }
      }

      await svc.entities.LeaveRequest.update(request_id, {
        status: "cancelled",
        cancelled_date: new Date().toISOString(),
        cancelled_by: user.id,
        cancelled_by_name: user.full_name || user.email,
        decision_comments: cancel_reason || null,
      });

      await audit("hr.leave_request_cancelled", "LeaveRequest", request_id, { status: req.status }, { status: "cancelled", reason: cancel_reason });
      return Response.json({ ok: true });
    }

    // ================ TEAM CALENDAR ================
    if (action === "list_calendar") {
      const { start_date, end_date } = body;
      const from = start_date || today();
      const to = end_date || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

      const requests = await svc.entities.LeaveRequest.filter({
        organisation_id,
      });

      const upcoming = requests.filter((r) => {
        if (r.status === "rejected" || r.status === "cancelled") return false;
        return r.end_date >= from && r.start_date <= to;
      });

      return Response.json({ events: upcoming, start_date: from, end_date: to });
    }

    // ================ SEED DEMO ================
    if (action === "seed_demo") {
      if (org.data_mode !== "demo") {
        return Response.json({ error: "Demo seed is only available in Demo mode" }, { status: 400 });
      }

      const existing = await svc.entities.LeaveType.filter({ organisation_id, data_mode: "demo" });
      if (existing.length > 0) {
        return Response.json({ ok: true, message: "Demo data already seeded" });
      }

      // Create leave types
      const leaveTypeIds = {};
      for (const lt of DEFAULT_LEAVE_TYPES) {
        const rec = await svc.entities.LeaveType.create({
          organisation_id,
          ...lt,
          is_active: true,
          data_mode: "demo",
        });
        leaveTypeIds[lt.name] = rec.id;
      }

      // Create a default policy
      const allowances = DEFAULT_LEAVE_TYPES.map((lt) => ({
        leave_type_id: leaveTypeIds[lt.name],
        leave_type_name: lt.name,
        annual_allowance: lt.default_annual_allowance,
      }));
      await svc.entities.LeavePolicy.create({
        organisation_id,
        name: "Standard Policy",
        description: "Default leave policy for all staff.",
        applicable_contract_types: [],
        allowances,
        is_active: true,
        data_mode: "demo",
      });

      // Create balances + a few requests for active employees
      const employees = await svc.entities.Employee.filter({
        organisation_id,
        data_mode: "demo",
        employment_status: "active",
      });

      const holidays = await getHolidays();
      let requestsCreated = 0;
      for (const emp of employees) {
        for (const ltName of Object.keys(leaveTypeIds)) {
          const lt = DEFAULT_LEAVE_TYPES.find((t) => t.name === ltName);
          await svc.entities.LeaveBalance.create({
            organisation_id,
            employee_id: emp.id,
            employee_name: [emp.first_name, emp.last_name].filter(Boolean).join(" "),
            leave_type_id: leaveTypeIds[ltName],
            leave_type_name: ltName,
            year: currentYear,
            annual_allowance: lt.default_annual_allowance,
            carried_over: 0,
            used_days: 0,
            pending_days: 0,
            data_mode: "demo",
          });
        }

        // Create 1 approved request for first employee
        if (requestsCreated === 0) {
          const ltId = leaveTypeIds["Annual Leave"];
          const sd = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
          const ed = new Date(Date.now() + 18 * 86400000).toISOString().slice(0, 10);
          const days = computeWorkingDays(sd, ed, holidays);
          const rec = await svc.entities.LeaveRequest.create({
            organisation_id,
            employee_id: emp.id,
            employee_name: [emp.first_name, emp.last_name].filter(Boolean).join(" "),
            leave_type_id: ltId,
            leave_type_name: "Annual Leave",
            start_date: sd,
            end_date: ed,
            total_days: days,
            reason: "Family holiday",
            status: "approved",
            requested_date: new Date(Date.now() - 7 * 86400000).toISOString(),
            requested_by: user.id,
            requested_by_name: user.full_name || user.email,
            approver_id: user.id,
            approver_name: user.full_name || user.email,
            decision_date: new Date(Date.now() - 5 * 86400000).toISOString(),
            decision_comments: "Approved — enjoy your holiday!",
            data_mode: "demo",
          });
          // Update balance used
          const bals = await svc.entities.LeaveBalance.filter({
            organisation_id, employee_id: emp.id, leave_type_id: ltId, year: currentYear,
          });
          if (bals.length > 0) {
            await svc.entities.LeaveBalance.update(bals[0].id, { used_days: days });
          }
          requestsCreated++;
        }

        // Create 1 pending request for second employee
        if (requestsCreated === 1 && employees.length > 1) {
          const emp2 = employees[1];
          const ltId = leaveTypeIds["Annual Leave"];
          const sd = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
          const ed = new Date(Date.now() + 23 * 86400000).toISOString().slice(0, 10);
          const days = computeWorkingDays(sd, ed, holidays);
          const rec = await svc.entities.LeaveRequest.create({
            organisation_id,
            employee_id: emp2.id,
            employee_name: [emp2.first_name, emp2.last_name].filter(Boolean).join(" "),
            leave_type_id: ltId,
            leave_type_name: "Annual Leave",
            start_date: sd,
            end_date: ed,
            total_days: days,
            reason: "Personal matters",
            status: "pending",
            requested_date: new Date().toISOString(),
            requested_by: user.id,
            requested_by_name: user.full_name || user.email,
            data_mode: "demo",
          });
          const bals = await svc.entities.LeaveBalance.filter({
            organisation_id, employee_id: emp2.id, leave_type_id: ltId, year: currentYear,
          });
          if (bals.length > 0) {
            await svc.entities.LeaveBalance.update(bals[0].id, { pending_days: days });
          }
          requestsCreated++;
        }
      }

      await audit("hr.leave_demo_seeded", "LeaveType", null, null, {
        leave_types: Object.keys(leaveTypeIds).length,
        requests: requestsCreated,
      });
      return Response.json({ ok: true, seeded: { leave_types: Object.keys(leaveTypeIds).length, requests: requestsCreated } });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}