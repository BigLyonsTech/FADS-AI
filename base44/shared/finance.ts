// Shared finance helpers for the Phase 1A backend function.
// All functions here run with the service-role client (svc) passed in by
// callers, so they bypass RLS to create/update/delete finance records and
// write audit logs. Direct client writes are denied by RLS (no_such_role).

import { requireOrgRole } from "./workspace.ts";

// Roles permitted to create/update/delete finance records and run exports.
// All active members can READ finance data (RLS); these roles can transact.
export const FINANCE_MANAGER_ROLES = [
  "organisation_owner",
  "administrator",
  "finance_user",
  "school_administrator",
  "church_administrator",
];

// Throws if the user is not a finance manager in the org.
export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

export async function requireFinanceManager(svc, userId, orgId) {
  return requireOrgRole(svc, userId, orgId, FINANCE_MANAGER_ROLES);
}

export async function getOrgConfig(svc, orgId) {
  return svc.entities.Organisation.get(orgId);
}

// Blocks writes for paused/cancelled orgs (trial/active are writable).
export function assertOrgWritable(org) {
  if (!org) throw new Error("Organisation not found");
  if (org.access_status === "cancelled" || org.access_status === "paused") {
    throw new Error(
      "This organisation is " + org.access_status + " and cannot be modified"
    );
  }
  return org;
}

// Org-type-aware wording used by both server (audit labels) and client (UI).
export function financeWording(orgType) {
  switch (orgType) {
    case "school":
      return {
        moneyIn: "Payments",
        moneyOut: "School Expenses",
        contactIn: "Parent/Guardian",
        contactOut: "Supplier",
        contactInPlural: "Parents/Guardians",
        contactOutPlural: "Suppliers",
      };
    case "church":
      return {
        moneyIn: "Tithes & Offerings",
        moneyOut: "Church Expenses",
        contactIn: "Member/Donor",
        contactOut: "Supplier",
        contactInPlural: "Members/Donors",
        contactOutPlural: "Suppliers",
      };
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

// Default category set seeded for new orgs (and demo orgs).
export function defaultCategories(orgType) {
  if (orgType === "school") {
    return [
      { name: "Tuition Fees", kind: "income" },
      { name: "Donations", kind: "income" },
      { name: "Other Payments", kind: "income" },
      { name: "Salaries", kind: "expense" },
      { name: "Supplies", kind: "expense" },
      { name: "Utilities", kind: "expense" },
      { name: "Maintenance", kind: "expense" },
    ];
  }
  if (orgType === "church") {
    return [
      { name: "Tithes", kind: "income" },
      { name: "Offerings", kind: "income" },
      { name: "Donations", kind: "income" },
      { name: "Salaries", kind: "expense" },
      { name: "Utilities", kind: "expense" },
      { name: "Outreach", kind: "expense" },
      { name: "Maintenance", kind: "expense" },
    ];
  }
  if (orgType === "university") {
    return [
      { name: "Student Fees", kind: "income" },
      { name: "Grants & Funding", kind: "income" },
      { name: "Other Income", kind: "income" },
      { name: "Salaries", kind: "expense" },
      { name: "Supplies", kind: "expense" },
      { name: "Utilities", kind: "expense" },
      { name: "Research Costs", kind: "expense" },
    ];
  }
  return [
    { name: "Sales", kind: "income" },
    { name: "Service Income", kind: "income" },
    { name: "Other Income", kind: "income" },
    { name: "Rent", kind: "expense" },
    { name: "Supplies", kind: "expense" },
    { name: "Salaries", kind: "expense" },
    { name: "Utilities", kind: "expense" },
    { name: "Marketing", kind: "expense" },
  ];
}

// Demo-only seed data. Fictional names/amounts. NEVER used in Live mode
// (the function guards on org.data_mode === "demo" before calling this).
export function buildDemoSeed(org) {
  const today = new Date();
  const iso = (offsetDays) => {
    const d = new Date(today);
    d.setDate(d.getDate() - offsetDays);
    return d.toISOString().slice(0, 10);
  };

  if (org.type === "school") {
    return {
      accounts: [
        { key: "main", name: "School Bank Account", account_type: "bank", opening_balance: 5000 },
        { key: "cash", name: "Petty Cash", account_type: "petty_cash", opening_balance: 200 },
      ],
      categories: [
        { key: "fees", name: "Tuition Fees", kind: "income" },
        { key: "don", name: "Donations", kind: "income" },
        { key: "sal", name: "Salaries", kind: "expense" },
        { key: "sup", name: "Supplies", kind: "expense" },
        { key: "util", name: "Utilities", kind: "expense" },
      ],
      contacts: [
        { key: "p1", kind: "parent", name: "Amara Okafor", email: "amara.okafor@example.com", phone: "+234 800 0001" },
        { key: "p2", kind: "parent", name: "David Murphy", email: "david.murphy@example.com", phone: "+353 87 0001" },
        { key: "s1", kind: "supplier", name: "BookWorld Supplies", email: "sales@bookworld.example.com" },
      ],
      transactions: [
        { accountKey: "main", categoryKey: "fees", contactKey: "p1", direction: "in", amount: 1200, date: iso(12), description: "Term fees - Year 5", status: "cleared" },
        { accountKey: "main", categoryKey: "fees", contactKey: "p2", direction: "in", amount: 950, date: iso(8), description: "Term fees - Year 3", status: "cleared" },
        { accountKey: "main", categoryKey: "don", contactKey: null, direction: "in", amount: 300, date: iso(5), description: "PTA donation", status: "cleared" },
        { accountKey: "main", categoryKey: "sal", contactKey: null, direction: "out", amount: 1800, date: iso(3), description: "Teacher salaries", status: "cleared" },
        { accountKey: "cash", categoryKey: "sup", contactKey: "s1", direction: "out", amount: 150, date: iso(2), description: "Exercise books", status: "cleared" },
        { accountKey: "main", categoryKey: "fees", contactKey: null, direction: "in", amount: 600, date: iso(1), description: "Pending fee payment", status: "pending" },
      ],
    };
  }

  if (org.type === "church") {
    return {
      accounts: [
        { key: "main", name: "Church Main Account", account_type: "bank", opening_balance: 3000 },
        { key: "cash", name: "Offering Box", account_type: "cash", opening_balance: 150 },
      ],
      categories: [
        { key: "tithe", name: "Tithes", kind: "income" },
        { key: "off", name: "Offerings", kind: "income" },
        { key: "don", name: "Donations", kind: "income" },
        { key: "sal", name: "Salaries", kind: "expense" },
        { key: "util", name: "Utilities", kind: "expense" },
        { key: "out", name: "Outreach", kind: "expense" },
      ],
      contacts: [
        { key: "m1", kind: "member", name: "Grace Adeyemi", email: "grace.adeyemi@example.com" },
        { key: "d1", kind: "donor", name: "Hope Foundation", email: "give@hopefoundation.example.org" },
        { key: "s1", kind: "supplier", name: "City Sound Ltd", email: "info@citysound.example.com" },
      ],
      transactions: [
        { accountKey: "cash", categoryKey: "tithe", contactKey: "m1", direction: "in", amount: 400, date: iso(6), description: "Sunday tithes", status: "cleared" },
        { accountKey: "cash", categoryKey: "off", contactKey: null, direction: "in", amount: 250, date: iso(6), description: "Sunday offerings", status: "cleared" },
        { accountKey: "main", categoryKey: "don", contactKey: "d1", direction: "in", amount: 1000, date: iso(4), description: "Building fund donation", status: "cleared" },
        { accountKey: "main", categoryKey: "sal", contactKey: null, direction: "out", amount: 900, date: iso(3), description: "Pastor stipend", status: "cleared" },
        { accountKey: "main", categoryKey: "out", contactKey: null, direction: "out", amount: 350, date: iso(2), description: "Community outreach", status: "cleared" },
        { accountKey: "main", categoryKey: "util", contactKey: null, direction: "out", amount: 180, date: iso(1), description: "Electricity bill", status: "pending" },
      ],
    };
  }

  if (org.type === "university") {
    return {
      accounts: [
        { key: "main", name: "University Bank Account", account_type: "bank", opening_balance: 12000 },
        { key: "cash", name: "Petty Cash", account_type: "petty_cash", opening_balance: 300 },
      ],
      categories: [
        { key: "fees", name: "Student Fees", kind: "income" },
        { key: "grants", name: "Grants & Funding", kind: "income" },
        { key: "other_inc", name: "Other Income", kind: "income" },
        { key: "sal", name: "Salaries", kind: "expense" },
        { key: "supplies", name: "Supplies", kind: "expense" },
        { key: "util", name: "Utilities", kind: "expense" },
        { key: "research", name: "Research Costs", kind: "expense" },
      ],
      contacts: [
        { key: "s1", kind: "customer", name: "Niamh O'Connor", email: "niamh.oconnor@example.com" },
        { key: "s2", kind: "customer", name: "Kwame Mensah", email: "kwame.mensah@example.com" },
        { key: "s3", kind: "customer", name: "Liu Wei", email: "liu.wei@example.com" },
        { key: "sup1", kind: "supplier", name: "Campus Books Ltd", email: "sales@campusbooks.example.com" },
        { key: "sup2", kind: "supplier", name: "LabEquip Solutions", email: "info@labequip.example.com" },
      ],
      transactions: [
        { accountKey: "main", categoryKey: "fees", contactKey: "s1", direction: "in", amount: 2400, date: iso(15), description: "Semester fees - Engineering", status: "cleared" },
        { accountKey: "main", categoryKey: "fees", contactKey: "s2", direction: "in", amount: 2100, date: iso(12), description: "Semester fees - Business", status: "cleared" },
        { accountKey: "main", categoryKey: "fees", contactKey: "s3", direction: "in", amount: 1800, date: iso(8), description: "Semester fees - Arts", status: "cleared" },
        { accountKey: "main", categoryKey: "grants", contactKey: null, direction: "in", amount: 5000, date: iso(6), description: "Research grant - Science Faculty", status: "cleared" },
        { accountKey: "main", categoryKey: "fees", contactKey: null, direction: "in", amount: 2200, date: iso(1), description: "Outstanding fees - pending payment", status: "pending" },
        { accountKey: "main", categoryKey: "sal", contactKey: null, direction: "out", amount: 3200, date: iso(5), description: "Academic staff salaries", status: "cleared" },
        { accountKey: "main", categoryKey: "research", contactKey: "sup2", direction: "out", amount: 850, date: iso(3), description: "Laboratory equipment", status: "cleared" },
        { accountKey: "main", categoryKey: "supplies", contactKey: "sup1", direction: "out", amount: 420, date: iso(2), description: "Library books", status: "cleared" },
        { accountKey: "main", categoryKey: "util", contactKey: null, direction: "out", amount: 680, date: iso(1), description: "Campus utilities", status: "pending" },
      ],
    };
  }

  if (org.type === "taxi_driver") {
    return {
      accounts: [
        { key: "main", name: "Bank Account", account_type: "bank", opening_balance: 1500 },
        { key: "cash", name: "Cash", account_type: "cash", opening_balance: 80 },
      ],
      categories: [
        { key: "fares", name: "Taxi Fares", kind: "income" },
        { key: "card", name: "Card Payments", kind: "income" },
        { key: "app", name: "App/Platform Income", kind: "income" },
        { key: "tips", name: "Tips", kind: "income" },
        { key: "fuel", name: "Fuel", kind: "expense" },
        { key: "service", name: "Vehicle Servicing", kind: "expense" },
        { key: "insurance", name: "Insurance", kind: "expense" },
        { key: "repair", name: "Repairs", kind: "expense" },
        { key: "parking", name: "Parking & Tolls", kind: "expense" },
        { key: "phone", name: "Mobile Phone", kind: "expense" },
        { key: "other_exp", name: "Other Business Expenses", kind: "expense" },
      ],
      contacts: [
        { key: "s1", kind: "supplier", name: "City Fuel Station", email: "sales@cityfuel.example.com" },
        { key: "s2", kind: "supplier", name: "DriveSure Insurance", email: "info@drivesure.example.com" },
      ],
      transactions: [
        { accountKey: "cash", categoryKey: "fares", contactKey: null, direction: "in", amount: 185, date: iso(0), description: "Cash fares - today", status: "cleared" },
        { accountKey: "main", categoryKey: "card", contactKey: null, direction: "in", amount: 240, date: iso(0), description: "Card fares - today", status: "cleared" },
        { accountKey: "main", categoryKey: "app", contactKey: null, direction: "in", amount: 320, date: iso(1), description: "Platform payout", status: "cleared" },
        { accountKey: "cash", categoryKey: "tips", contactKey: null, direction: "in", amount: 35, date: iso(1), description: "Tips", status: "cleared" },
        { accountKey: "cash", categoryKey: "fares", contactKey: null, direction: "in", amount: 210, date: iso(2), description: "Cash fares", status: "cleared" },
        { accountKey: "main", categoryKey: "card", contactKey: null, direction: "in", amount: 280, date: iso(3), description: "Card fares", status: "cleared" },
        { accountKey: "cash", categoryKey: "fuel", contactKey: "s1", direction: "out", amount: 68, date: iso(0), description: "Diesel", status: "cleared" },
        { accountKey: "cash", categoryKey: "fuel", contactKey: "s1", direction: "out", amount: 72, date: iso(3), description: "Diesel top-up", status: "cleared" },
        { accountKey: "main", categoryKey: "insurance", contactKey: "s2", direction: "out", amount: 140, date: iso(5), description: "Insurance premium", status: "cleared" },
        { accountKey: "cash", categoryKey: "service", contactKey: null, direction: "out", amount: 95, date: iso(6), description: "Oil change & service", status: "cleared" },
        { accountKey: "cash", categoryKey: "parking", contactKey: null, direction: "out", amount: 12, date: iso(1), description: "Parking", status: "cleared" },
        { accountKey: "main", categoryKey: "phone", contactKey: null, direction: "out", amount: 20, date: iso(4), description: "Business phone", status: "cleared" },
        { accountKey: "cash", categoryKey: "fuel", contactKey: null, direction: "out", amount: 65, date: iso(1), description: "Fuel - receipt needed", status: "pending" },
      ],
    };
  }

  if (org.type === "self_employed") {
    return {
      accounts: [
        { key: "main", name: "Business Bank Account", account_type: "bank", opening_balance: 1200 },
        { key: "cash", name: "Cash", account_type: "cash", opening_balance: 60 },
      ],
      categories: [
        { key: "client", name: "Client Payments", kind: "income" },
        { key: "service", name: "Service Income", kind: "income" },
        { key: "other_inc", name: "Other Income", kind: "income" },
        { key: "supplies", name: "Supplies & Materials", kind: "expense" },
        { key: "software", name: "Software & Subscriptions", kind: "expense" },
        { key: "travel", name: "Travel & Mileage", kind: "expense" },
        { key: "phone", name: "Phone & Internet", kind: "expense" },
        { key: "marketing", name: "Marketing", kind: "expense" },
        { key: "prof", name: "Professional Fees", kind: "expense" },
        { key: "other_exp", name: "Other Business Expenses", kind: "expense" },
      ],
      contacts: [
        { key: "c1", kind: "customer", name: "Bright Studio Ltd", email: "accounts@brightstudio.example.com" },
        { key: "c2", kind: "customer", name: "Niamh Carroll", email: "niamh.carroll@example.com" },
        { key: "c3", kind: "customer", name: "Greenleaf Cafe", email: "hello@greenleafcafe.example.com" },
        { key: "s1", kind: "supplier", name: "OfficeHub Supplies", email: "sales@officehub.example.com" },
      ],
      transactions: [
        { accountKey: "main", categoryKey: "client", contactKey: "c1", direction: "in", amount: 650, date: iso(0), description: "Client payment - Bright Studio", status: "cleared" },
        { accountKey: "main", categoryKey: "client", contactKey: "c2", direction: "in", amount: 420, date: iso(2), description: "Consulting fee - Niamh Carroll", status: "cleared" },
        { accountKey: "main", categoryKey: "service", contactKey: "c3", direction: "in", amount: 380, date: iso(4), description: "Cafe branding project", status: "cleared" },
        { accountKey: "main", categoryKey: "client", contactKey: null, direction: "in", amount: 750, date: iso(1), description: "Invoice #1042 - awaiting payment", status: "pending" },
        { accountKey: "cash", categoryKey: "supplies", contactKey: "s1", direction: "out", amount: 45, date: iso(0), description: "Supplies", status: "cleared" },
        { accountKey: "main", categoryKey: "software", contactKey: null, direction: "out", amount: 120, date: iso(3), description: "Software subscription - monthly", status: "cleared" },
        { accountKey: "cash", categoryKey: "travel", contactKey: null, direction: "out", amount: 28, date: iso(2), description: "Client site visit - mileage", status: "cleared" },
        { accountKey: "main", categoryKey: "phone", contactKey: null, direction: "out", amount: 35, date: iso(5), description: "Phone & internet", status: "cleared" },
        { accountKey: "cash", categoryKey: "supplies", contactKey: null, direction: "out", amount: 60, date: iso(1), description: "Materials - receipt needed", status: "pending" },
      ],
    };
  }

  // small_business
  return {
    accounts: [
      { key: "main", name: "Business Bank Account", account_type: "bank", opening_balance: 8000 },
      { key: "cash", name: "Cash Register", account_type: "cash", opening_balance: 300 },
    ],
    categories: [
      { key: "sales", name: "Sales", kind: "income" },
      { key: "svc", name: "Service Income", kind: "income" },
      { key: "rent", name: "Rent", kind: "expense" },
      { key: "sup", name: "Supplies", kind: "expense" },
      { key: "sal", name: "Salaries", kind: "expense" },
      { key: "mkt", name: "Marketing", kind: "expense" },
    ],
    contacts: [
      { key: "c1", kind: "customer", name: "Liam Byrne", email: "liam.byrne@example.com" },
      { key: "c2", kind: "customer", name: "Sofia Rossi", email: "sofia.rossi@example.com" },
      { key: "c3", kind: "customer", name: "Aoife Walsh", email: "aoife.walsh@example.com" },
      { key: "s1", kind: "supplier", name: "Acme Wholesale", email: "orders@acmewholesale.example.com" },
      { key: "s2", kind: "supplier", name: "TechSupply Ltd", email: "sales@techsupply.example.com" },
    ],
    transactions: [
      { accountKey: "main", categoryKey: "sales", contactKey: "c1", direction: "in", amount: 1500, date: iso(10), description: "Product order #1042", status: "cleared" },
      { accountKey: "cash", categoryKey: "sales", contactKey: "c2", direction: "in", amount: 220, date: iso(7), description: "Walk-in sale", status: "cleared" },
      { accountKey: "main", categoryKey: "svc", contactKey: null, direction: "in", amount: 800, date: iso(5), description: "Consulting engagement", status: "cleared" },
      { accountKey: "main", categoryKey: "sales", contactKey: "c3", direction: "in", amount: 1850, date: iso(4), description: "Bulk order #1055", status: "cleared" },
      { accountKey: "main", categoryKey: "sales", contactKey: null, direction: "in", amount: 950, date: iso(1), description: "Invoice #1051 - awaiting payment", status: "pending" },
      { accountKey: "main", categoryKey: "rent", contactKey: null, direction: "out", amount: 1200, date: iso(4), description: "Office rent", status: "cleared" },
      { accountKey: "main", categoryKey: "sup", contactKey: "s1", direction: "out", amount: 540, date: iso(2), description: "Inventory restock", status: "cleared" },
      { accountKey: "main", categoryKey: "mkt", contactKey: "s2", direction: "out", amount: 350, date: iso(3), description: "Digital marketing campaign", status: "cleared" },
    ],
  };
}

// Build a CSV string from filtered transactions for the authorised org only.
// Lookups resolve category/account/contact ids to names. The caller is
// responsible for passing only the target org's records (RLS + org filter).
export function toCSV(transactions, lookups) {
  const { accounts = [], categories = [], contacts = [] } = lookups || {};
  const name = (list, id) => (id ? (list.find((x) => x.id === id)?.name || "") : "");
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const header = [
    "Date", "Direction", "Description", "Reference", "Category", "Account",
    "Contact", "Payment Method", "Status", "Amount", "Currency", "Tax",
    "Recurring", "Frequency", "Internal Notes",
  ];
  const rows = transactions.map((t) =>
    [
      t.date, t.direction, t.description || "", t.reference || "",
      name(categories, t.category_id), name(accounts, t.account_id),
      name(contacts, t.contact_id), t.payment_method || "", t.status || "",
      t.amount, t.currency || "", t.tax_amount || 0,
      t.is_recurring ? "Yes" : "No", t.recurring_frequency || "",
      t.internal_notes || "",
    ].map(esc).join(",")
  );
  return [header.map(esc).join(","), ...rows].join("\n");
}

// Build a CSV string from invoices (mirrors useInvoices: org_id only, no
// data_mode filter). Columns overlap with the transaction CSV so the two
// sections can be concatenated in one export file.
export function invoicesToCSV(invoices) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const header = [
    "Date", "Direction", "Description", "Reference", "Category", "Account",
    "Contact", "Payment Method", "Status", "Amount", "Currency", "Tax",
    "Recurring", "Frequency", "Internal Notes",
  ];
  const rows = invoices.map((i) =>
    [
      i.issue_date || "", "invoice", i.invoice_number || "", i.invoice_number || "",
      "", "", i.customer_name || "", "", i.status || "",
      i.total || 0, i.currency || "", i.tax_total || 0,
      "No", "", "",
    ].map(esc).join(",")
  );
  return [header.map(esc).join(","), ...rows].join("\n");
}

// Build a CSV string from invoice payments (mirrors useInvoices: org_id only,
// no data_mode filter). Invoice ids are resolved to invoice numbers via the
// invoices lookup so each payment row reads as "Payment for INV-0001".
export function paymentsToCSV(payments, invoices = []) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const invNumber = (id) =>
    id ? (invoices.find((x) => x.id === id)?.invoice_number || "") : "";
  const header = [
    "Date", "Direction", "Description", "Reference", "Category", "Account",
    "Contact", "Payment Method", "Status", "Amount", "Currency", "Tax",
    "Recurring", "Frequency", "Internal Notes",
  ];
  const rows = payments.map((p) =>
    [
      p.date || "",
      "payment",
      p.invoice_id ? `Payment for ${invNumber(p.invoice_id)}` : "Payment",
      p.reference || "",
      "", "", "",
      p.payment_method || "",
      "cleared",
      p.amount,
      p.currency || "",
      0,
      "No", "",
      p.notes || "",
    ].map(esc).join(",")
  );
  return [header.map(esc).join(","), ...rows].join("\n");
}