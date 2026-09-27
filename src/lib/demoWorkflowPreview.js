// Demo Mode workflow preview — reads the existing FADS Demo dataset and returns
// a plain-language "FADS found…" finding for the Preview dialog.
//
// This is READ-ONLY. It never creates, updates, or deletes records. It only
// counts existing Demo records so a first-time customer sees a realistic
// preview of what FADS can do. Live Mode is never touched — callers only
// invoke this when dataMode === "demo".
//
// Idempotent by design: every call fetches fresh counts and returns a string.
// No state is stored, so refresh / hot reload can never create duplicates.

import { base44 } from "@/api/base44Client";
import { formatCurrencyCompact } from "@/lib/currencyFormat";

const plural = (n, singular) => `${n} ${singular}${n === 1 ? "" : "s"}`;

function isOverdue(inv) {
  if (!inv.due_date) return false;
  const balance = Number(inv.balance ?? inv.total ?? 0);
  return balance > 0 && new Date(inv.due_date) < new Date();
}

// Fetch helper: returns [] on any error so the preview never crashes.
async function safeFilter(entityName, filter) {
  try {
    const res = await base44.entities[entityName].filter(filter);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export async function getDemoFinding(templateId, orgId, currency) {
  if (!orgId) return null;
  const f = { organisation_id: orgId, data_mode: "demo" };

  switch (templateId) {
    case "fads_daily_check":
    case "morning_business_check": {
      const [invoices, contacts, items, tasks] = await Promise.all([
        safeFilter("Invoice", { ...f, status: "issued" }),
        safeFilter("CRMContact", { ...f, status: "new" }),
        safeFilter("InventoryItem", f),
        safeFilter("CRMTask", { ...f, status: "open" }),
      ]);
      const overdue = invoices.filter(isOverdue).length;
      const lowStock = items.filter(
        (i) => i.is_active !== false && (i.current_quantity || 0) <= (i.low_stock_level || 0)
      ).length;
      const n = overdue + contacts.length + lowStock + tasks.length;
      if (!n) return "FADS found nothing urgent — you're all caught up.";
      return `FADS found ${n} items needing attention across your business.`;
    }

    case "end_of_day_check": {
      const [done, open] = await Promise.all([
        safeFilter("CRMTask", { ...f, status: "done" }),
        safeFilter("CRMTask", { ...f, status: "open" }),
      ]);
      return `FADS found ${done.length} completed ${done.length === 1 ? "item" : "items"} and ${open.length} carrying into tomorrow.`;
    }

    case "collect_overdue_money":
    case "school_fees_check": {
      const invoices = await safeFilter("Invoice", { ...f, status: "issued" });
      const partPaid = await safeFilter("Invoice", { ...f, status: "part_paid" });
      const overdue = [...invoices, ...partPaid].filter(isOverdue);
      const total = overdue.reduce((s, i) => s + Number(i.balance ?? i.total ?? 0), 0);
      if (!overdue.length) return "FADS found no overdue balances. Everyone is up to date.";
      return `FADS found ${plural(overdue.length, "overdue payment")} totalling ${formatCurrencyCompact(total, currency)}.`;
    }

    case "invoice_follow_up": {
      const invoices = await safeFilter("Invoice", { ...f, status: "issued" });
      if (!invoices.length) return "FADS found no unpaid invoices.";
      return `FADS found ${plural(invoices.length, "unpaid invoice")} waiting for payment.`;
    }

    case "missing_receipt_check": {
      const expenses = await safeFilter("FinanceTransaction", { ...f, direction: "out" });
      const missing = expenses.filter((t) => !t.receipt_file_url && !(t.attachment_urls && t.attachment_urls.length));
      if (!missing.length) return "FADS found no expenses missing receipts.";
      return `FADS found ${plural(missing.length, "expense")} that may need a receipt.`;
    }

    case "follow_up_today_leads":
    case "new_enquiry_follow_up":
    case "new_visitor_follow_up": {
      const [newContacts, contacted] = await Promise.all([
        safeFilter("CRMContact", { ...f, status: "new" }),
        safeFilter("CRMContact", { ...f, status: "contacted" }),
      ]);
      const n = newContacts.length + contacted.length;
      if (!n) return "FADS found no one waiting on a response right now.";
      return `FADS found ${plural(n, "relationship")} that need${n === 1 ? "s" : ""} attention today.`;
    }

    case "proposal_follow_up": {
      const invoices = await safeFilter("Invoice", { ...f, status: "issued" });
      const waiting = invoices.filter((i) => !isOverdue(i));
      if (!waiting.length) return "FADS found no proposals waiting for a response.";
      return `FADS found ${plural(waiting.length, "proposal")} waiting for a response.`;
    }

    case "welcome_new_customer": {
      const customers = await safeFilter("CRMContact", { ...f, status: "converted" });
      const active = await safeFilter("CRMContact", { ...f, status: "active" });
      const n = customers.length + active.length;
      if (!n) return "FADS found no new customers to welcome yet.";
      return `FADS found ${plural(n, "new customer")} to welcome.`;
    }

    case "people_check":
    case "staff_check": {
      const [employees, leave, docs] = await Promise.all([
        safeFilter("Employee", f),
        safeFilter("LeaveRequest", { ...f, status: "pending" }),
        safeFilter("EmployeeDocument", f),
      ]);
      const expiring = docs.filter((d) => {
        if (!d.expiry_date) return false;
        const days = (new Date(d.expiry_date) - new Date()) / 86400000;
        return days <= 30;
      }).length;
      const n = leave.length + expiring;
      if (!n) return `FADS found nothing urgent across your ${plural(employees.length, "team member")}.`;
      return `FADS found ${n} people item${n === 1 ? "" : "s"} needing attention.`;
    }

    case "new_employee_welcome": {
      const employees = await safeFilter("Employee", f);
      const recent = employees.filter(
        (e) => e.employment_status === "onboarding" || (e.start_date && (new Date() - new Date(e.start_date)) / 86400000 <= 30)
      );
      if (!recent.length) return "FADS found no new employees to onboard right now.";
      return `FADS found ${plural(recent.length, "new employee")} ready to onboard.`;
    }

    case "low_stock_check": {
      const items = await safeFilter("InventoryItem", f);
      const low = items.filter(
        (i) => i.is_active !== false && (i.current_quantity || 0) <= (i.low_stock_level || 0)
      );
      if (!low.length) return "FADS found no items running low.";
      return `FADS found ${plural(low.length, "item")} running low and may need attention.`;
    }

    case "turn_meeting_into_actions": {
      const sessions = await safeFilter("TranscriptSession", f);
      if (!sessions.length) return "FADS found no meetings ready to turn into actions.";
      return `FADS found ${plural(sessions.length, "meeting")} ready to turn into actions.`;
    }

    case "tax_readiness_check": {
      const [expenses, txns] = await Promise.all([
        safeFilter("FinanceTransaction", { ...f, direction: "out" }),
        safeFilter("FinanceTransaction", f),
      ]);
      const missingReceipts = expenses.filter((t) => !t.receipt_file_url).length;
      const uncategorised = txns.filter((t) => !t.category_id).length;
      const issues = missingReceipts + uncategorised;
      if (!issues) return "FADS found your records look tax ready.";
      return `FADS found ${plural(issues, "item")} that may need attention before tax time.`;
    }

    case "parent_announcement":
    case "community_announcement": {
      const contacts = await safeFilter("CRMContact", f);
      if (!contacts.length) return "FADS found no contacts to announce to yet.";
      return `FADS found ${plural(contacts.length, "contact")} to send your announcement to.`;
    }

    case "volunteer_check": {
      const contacts = await safeFilter("CRMContact", f);
      const volunteers = contacts.filter((c) => {
        const tags = c.tags || [];
        return tags.some((t) => /volunteer/i.test(t));
      });
      if (!volunteers.length) return "FADS found no volunteers tagged yet.";
      return `FADS found ${plural(volunteers.length, "volunteer")} who may need a reminder.`;
    }

    case "upcoming_event_check": {
      const sessions = await safeFilter("TranscriptSession", { ...f, session_type: "business_meeting" });
      return `FADS found ${plural(sessions.length || 0, "upcoming event")} to prepare for.`;
    }

    default:
      return null;
  }
}