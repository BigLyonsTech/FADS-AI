// Shared bulk-import utilities: CSV parsing, smart column matching,
// validation, duplicate detection, template generation, and per-entity
// import configs. Used by BulkImportDialog for CRM contacts and HR staff.

// ---- CSV parsing (handles quoted fields, embedded commas/newlines) ----
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else { field += char; }
    } else {
      if (char === '"') inQuotes = true;
      else if (char === ',') { row.push(field); field = ""; }
      else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
      else if (char !== '\r') field += char;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }

  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1).filter((r) => r.some((c) => c.trim()));
  return { headers, rows: dataRows };
}

// ---- Column auto-matching ----
function norm(s) {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

const ALIASES = {
  first_name: ["firstname", "givenname", "fname", "name", "fullname", "studentname", "studentfirstname", "membername", "contactname", "parentname", "guardianname", "employeename"],
  last_name: ["lastname", "surname", "familyname", "lname", "studentsurname", "studentlastname", "membersurname", "employeesurname"],
  email: ["email", "emailaddress", "mail", "parentemail", "parentguardianemail", "workemail", "emailaddress"],
  phone: ["phone", "mobile", "phonenumber", "mobilenumber", "tel", "telephone", "cell", "whatsapp", "parentphone", "parentmobile", "contactnumber", "mob", "mobilephone"],
  address: ["address", "homeaddress", "street", "streetaddress", "location", "residence"],
  notes: ["notes", "note", "comments", "comment", "description", "remarks"],
  organisation_name: ["company", "organisation", "organization", "business", "employer", "companyname"],
  status: ["status", "memberstatus", "visitorstatus", "employmentstatus", "contactstatus", "studentstatus"],
  contact_type: ["type", "contacttype", "membertype", "category", "classification"],
  source: ["source", "referral", "howheard", "acquisitionchannel"],
  tags: ["tags", "tag"],
  start_date: ["startdate", "datejoined", "joindate", "admissiondate", "dateofjoining", "employmentstartdate", "datejoined", "joined"],
  department: ["department", "dept", "ministry", "faculty", "class", "grade", "form", "departmentname"],
  job_role: ["role", "jobrole", "jobtitle", "title", "position", "job", "roletitle"],
  contract_type: ["contracttype", "contract", "employmenttype"],
  stage: ["stage", "pipelinestage", "dealstage", "leadstage", "pipeline", "customerstatus", "enquirystatus", "salesstage"],
};

export function autoMatchColumns(headers, fields) {
  const mapping = {};
  const used = new Set();
  // Pass 1: exact normalized match
  for (const f of fields) {
    const aliases = ALIASES[f] || [norm(f)];
    for (let i = 0; i < headers.length; i++) {
      if (used.has(i)) continue;
      if (aliases.includes(norm(headers[i]))) { mapping[f] = i; used.add(i); break; }
    }
  }
  // Pass 2: contains match
  for (const f of fields) {
    if (mapping[f] !== undefined) continue;
    const aliases = ALIASES[f] || [norm(f)];
    for (let i = 0; i < headers.length; i++) {
      if (used.has(i)) continue;
      const h = norm(headers[i]);
      if (aliases.some((a) => h.includes(a) || a.includes(h))) { mapping[f] = i; used.add(i); break; }
    }
  }
  return mapping;
}

// ---- Validation ----
export function validateRow(row, config) {
  const errs = [];
  for (const f of config.fields) {
    const val = (row[f.key] || "").trim();
    if (f.required && !val) errs.push(`${f.label} is required`);
    if (f.type === "email" && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
      errs.push(`Invalid email format`);
  }
  return errs;
}

// ---- Duplicate detection ----
export function checkDuplicate(row, existing, keys) {
  for (const key of keys) {
    const val = (row[key] || "").trim().toLowerCase();
    if (!val) continue;
    const match = existing.find((e) => (e[key] || "").trim().toLowerCase() === val);
    if (match) return { isDup: true, existing: match, field: key };
  }
  return { isDup: false };
}

// ---- Field normalization ----
export function normalizeFieldValue(key, value) {
  if (!value) return value;
  const trimmed = value.trim();
  if (key === "employment_status") {
    const n = trimmed.toLowerCase().replace(/\s+/g, "_");
    const valid = ["onboarding", "active", "on_leave", "offboarding", "former_employee", "inactive"];
    if (valid.includes(n)) return n;
    if (["employed", "current", "working"].includes(n)) return "active";
    if (["new", "hired"].includes(n)) return "onboarding";
    return "onboarding";
  }
  if (key === "contract_type") {
    const n = trimmed.toLowerCase().replace(/\s+/g, "_");
    const valid = ["permanent", "fixed_term", "part_time", "temporary", "intern", "casual"];
    if (valid.includes(n)) return n;
    return "permanent";
  }
  if (key === "status") {
    const n = trimmed.toLowerCase().replace(/\s+/g, "_");
    const valid = ["new", "contacted", "engaged", "qualified", "active", "converted", "inactive"];
    if (valid.includes(n)) return n;
    return "new";
  }
  return trimmed;
}

// ---- Template generation ----
export function generateTemplateCSV(config) {
  const headers = config.fields.map((f) => f.label);
  const example = config.fields.map((f) => {
    switch (f.key) {
      case "first_name": return "John";
      case "last_name": return "Smith";
      case "email": return "john@example.com";
      case "phone": return "+1234567890";
      case "status": return "new";
      case "employment_status": return "onboarding";
      case "start_date": return "2026-01-15";
      case "contract_type": return "permanent";
      case "organisation_name": return "Acme Ltd";
      case "department": return "Administration";
      case "job_role": return "Manager";
      default: return "";
    }
  });
  return [headers, example]
    .map((r) => r.map((v) => `"${v}"`).join(","))
    .join("\n");
}

export function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Import configs ----
export const IMPORT_CONFIGS = {
  crm: {
    entityName: "CRMContact",
    label: "contacts",
    fields: [
      { key: "first_name", label: "First Name", required: true, type: "text" },
      { key: "last_name", label: "Last Name", required: false, type: "text" },
      { key: "email", label: "Email", required: false, type: "email" },
      { key: "phone", label: "Phone", required: false, type: "text" },
      { key: "contact_type", label: "Type", required: false, type: "text" },
      { key: "organisation_name", label: "Company/Organisation", required: false, type: "text" },
      { key: "address", label: "Address", required: false, type: "text" },
      { key: "status", label: "Status", required: false, type: "text" },
      { key: "stage", label: "Pipeline Stage", required: false, type: "text" },
      { key: "source", label: "Source", required: false, type: "text" },
      { key: "notes", label: "Notes", required: false, type: "text" },
    ],
    duplicateKeys: ["email", "phone"],
  },
  hr: {
    entityName: "Employee",
    label: "staff",
    fields: [
      { key: "first_name", label: "First Name", required: true, type: "text" },
      { key: "last_name", label: "Last Name", required: true, type: "text" },
      { key: "email", label: "Email", required: false, type: "email" },
      { key: "phone", label: "Phone", required: false, type: "text" },
      { key: "department", label: "Department", required: false, type: "text" },
      { key: "job_role", label: "Role/Title", required: false, type: "text" },
      { key: "employment_status", label: "Employment Status", required: false, type: "text" },
      { key: "start_date", label: "Start Date", required: false, type: "date" },
      { key: "contract_type", label: "Contract Type", required: false, type: "text" },
    ],
    duplicateKeys: ["email"],
  },
};