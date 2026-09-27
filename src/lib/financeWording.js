// Client-side finance wording + helpers. Mirrors the server wording in
// base44/shared/finance.ts so UI labels adapt by organisation type.

import { formatCurrency } from "@/lib/currencyFormat";
import { resolveTerminology } from "@/lib/faithTerminology";

export const FINANCE_MANAGER_ROLES = [
  "organisation_owner",
  "administrator",
  "finance_user",
  "school_administrator",
  "church_administrator",
];

export function canManageFinance(role) {
  return FINANCE_MANAGER_ROLES.includes(role);
}

// Three-tier Finance access model. Maps existing organisation roles into
// Owner/Admin (full), Manager (operational) and Staff/Member (limited)
// levels. canManageFinance above stays true for Owner/Admin + Manager.
export const FINANCE_OWNER_ADMIN_ROLES = [
  "organisation_owner",
  "administrator",
  "school_administrator",
  "church_administrator",
];
export const FINANCE_MANAGER_TIER_ROLES = ["finance_user"];
export const FINANCE_STAFF_ROLES = [
  "standard_staff",
  "teacher",
  "pastor",
  "ministry_leader",
  "hr_user",
];

export function financeAccessLevel(role) {
  if (FINANCE_OWNER_ADMIN_ROLES.includes(role)) return "owner_admin";
  if (FINANCE_MANAGER_TIER_ROLES.includes(role)) return "manager";
  if (FINANCE_STAFF_ROLES.includes(role)) return "staff";
  return "none";
}

// Owner/Admin only — sensitive financial information and configuration.
export function canViewFinanceReports(role) {
  return financeAccessLevel(role) === "owner_admin";
}
export function canAccessFinanceSettings(role) {
  return financeAccessLevel(role) === "owner_admin";
}
export function canAccessReconciliation(role) {
  return financeAccessLevel(role) === "owner_admin";
}
export function canAccessFinanceOfficer(role) {
  return financeAccessLevel(role) === "owner_admin";
}
export function canAccessPayroll(role) {
  return financeAccessLevel(role) === "owner_admin";
}
export function canExportFinance(role) {
  return financeAccessLevel(role) === "owner_admin";
}

// Owner/Admin + Manager — operational finance.
export function canViewFinanceTotals(role) {
  const l = financeAccessLevel(role);
  return l === "owner_admin" || l === "manager";
}
export function canManageInvoices(role) {
  const l = financeAccessLevel(role);
  return l === "owner_admin" || l === "manager";
}
export function canManageContacts(role) {
  const l = financeAccessLevel(role);
  return l === "owner_admin" || l === "manager";
}

// All finance tiers — limited transactional access.
export function canViewTransactions(role) {
  return financeAccessLevel(role) !== "none";
}
export function canManageReceipts(role) {
  return financeAccessLevel(role) !== "none";
}

export function financeWording(orgOrType) {
  const isOrg = typeof orgOrType === "object" && orgOrType !== null;
  const orgType = isOrg ? orgOrType.type : orgOrType;
  switch (orgType) {
    case "school":
      return {
        moneyIn: "Payments",
        moneyOut: "School Expenses",
        contactIn: "Parent",
        contactOut: "Supplier",
        contactInPlural: "Parents",
        contactOutPlural: "Suppliers",
      };
    case "university":
      return {
        moneyIn: "Fees & Income",
        moneyOut: "University Expenses",
        contactIn: "Student/Sponsor",
        contactOut: "Supplier",
        contactInPlural: "Students/Sponsors",
        contactOutPlural: "Suppliers",
      };
    case "church": {
      const term = isOrg ? resolveTerminology(orgOrType) : null;
      const giving = term?.giving || "Giving";
      const people = term?.people || "Members";
      return {
        moneyIn: giving,
        moneyOut: "Expenses",
        contactIn: `${people}/Donor`,
        contactOut: "Supplier",
        contactInPlural: `${people}/Donors`,
        contactOutPlural: "Suppliers",
      };
    }
    default: // small_business
      return {
        moneyIn: "Income",
        moneyOut: "Expenses",
        contactIn: "Customer",
        contactOut: "Supplier",
        contactInPlural: "Customers",
        contactOutPlural: "Suppliers",
      };
  }
}

export function formatMoney(amount, currency) {
  return formatCurrency(amount, currency);
}

// Org-type-aware wording for invoices and receipts. Mirrors the server-side
// invoiceWording in base44/shared/invoices.ts so UI labels adapt by org type.
// Churches do not show invoicing by default; receipts are the main document.
export function invoiceWording(orgOrType) {
  const isOrg = typeof orgOrType === "object" && orgOrType !== null;
  const orgType = isOrg ? orgOrType.type : orgOrType;
  switch (orgType) {
    case "school":
      return {
        invoiceNoun: "Fee Statement",
        invoicePlural: "Fee Statements",
        receiptNoun: "Payment Receipt",
        receiptPlural: "Payment Receipts",
        invoicesEnabled: true,
        receiptKinds: [
          { value: "school_fee", label: "School Fee" },
          { value: "payment", label: "Payment" },
          { value: "general", label: "General" },
        ],
        defaultReceiptKind: "school_fee",
        customerNoun: "Parent",
      };
    case "university":
      return {
        invoiceNoun: "Fee Statement",
        invoicePlural: "Fee Statements",
        receiptNoun: "Payment Receipt",
        receiptPlural: "Payment Receipts",
        invoicesEnabled: true,
        receiptKinds: [
          { value: "student_fee", label: "Student Fee" },
          { value: "payment", label: "Payment" },
          { value: "general", label: "General" },
        ],
        defaultReceiptKind: "student_fee",
        customerNoun: "Student/Sponsor",
      };
    case "church": {
      const term = isOrg ? resolveTerminology(orgOrType) : null;
      const people = term?.people || "Members";
      return {
        invoiceNoun: "Invoice",
        invoicePlural: "Invoices",
        receiptNoun: "Receipt",
        receiptPlural: "Receipts",
        invoicesEnabled: false,
        receiptKinds: [
          { value: "donation", label: "Donation" },
          { value: "tithe", label: "Tithe" },
          { value: "offering", label: "Offering" },
          { value: "general", label: "General" },
        ],
        defaultReceiptKind: "donation",
        customerNoun: `${people}/Donor`,
      };
    }
    default: // small_business
      return {
        invoiceNoun: "Invoice",
        invoicePlural: "Invoices",
        receiptNoun: "Receipt",
        receiptPlural: "Receipts",
        invoicesEnabled: true,
        receiptKinds: [
          { value: "payment", label: "Payment" },
          { value: "general", label: "General" },
        ],
        defaultReceiptKind: "payment",
        customerNoun: "Customer",
      };
  }
}