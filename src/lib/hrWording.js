// Client-side HR wording + helpers. Mirrors the server wording in
// base44/shared/hr.ts so UI labels adapt by organisation type.

export const HR_ACCESS_ROLES = [
  "organisation_owner",
  "administrator",
  "hr_user",
  "school_administrator",
  "university_administrator",
  "church_administrator",
];

export function canAccessHr(role) {
  return HR_ACCESS_ROLES.includes(role);
}

export function hrWording(orgType) {
  switch (orgType) {
    case "school":
      return {
        staffNoun: "Staff Member",
        staffPlural: "Staff",
        employeeNoun: "Staff Member",
        employeePlural: "Staff",
        departmentNoun: "Department",
        departmentPlural: "Departments",
        roleNoun: "Role",
        rolePlural: "Roles",
        addEmployee: "Add Staff Member",
        employeeDirectory: "Staff Directory",
        hrHome: "Staff Overview",
      };
    case "church":
      return {
        staffNoun: "Staff Member",
        staffPlural: "Employed Staff",
        employeeNoun: "Staff Member",
        employeePlural: "Employed Staff",
        departmentNoun: "Ministry",
        departmentPlural: "Ministries",
        roleNoun: "Role",
        rolePlural: "Roles",
        addEmployee: "Add Staff Member",
        employeeDirectory: "Staff Directory",
        hrHome: "Staff Overview",
      };
    case "university":
      return {
        staffNoun: "Staff Member",
        staffPlural: "Staff",
        employeeNoun: "Staff Member",
        employeePlural: "Staff",
        departmentNoun: "Faculty / Department",
        departmentPlural: "Faculties / Departments",
        roleNoun: "Academic Role",
        rolePlural: "Academic Roles",
        addEmployee: "Add Staff Member",
        employeeDirectory: "Staff Directory",
        hrHome: "Staff Overview",
      };
    default:
      return {
        staffNoun: "Employee",
        staffPlural: "Employees",
        employeeNoun: "Employee",
        employeePlural: "Employees",
        departmentNoun: "Department",
        departmentPlural: "Departments",
        roleNoun: "Job Role",
        rolePlural: "Job Roles",
        addEmployee: "Add Employee",
        employeeDirectory: "Employee Directory",
        hrHome: "Employee Overview",
      };
  }
}

export const EMPLOYMENT_STATUSES = [
  { value: "onboarding", label: "Onboarding", color: "bg-blue-100 text-blue-700" },
  { value: "active", label: "Active", color: "bg-green-100 text-green-700" },
  { value: "on_leave", label: "On Leave", color: "bg-amber-100 text-amber-700" },
  { value: "offboarding", label: "Offboarding", color: "bg-orange-100 text-orange-700" },
  { value: "former_employee", label: "Former Employee", color: "bg-gray-100 text-gray-600" },
  { value: "inactive", label: "Inactive", color: "bg-gray-100 text-gray-500" },
];

export const CONTRACT_TYPES = [
  { value: "permanent", label: "Permanent" },
  { value: "fixed_term", label: "Fixed Term" },
  { value: "part_time", label: "Part Time" },
  { value: "temporary", label: "Temporary" },
  { value: "intern", label: "Intern" },
  { value: "casual", label: "Casual" },
];

export function statusLabel(value) {
  return EMPLOYMENT_STATUSES.find((s) => s.value === value)?.label || value;
}

export function statusColor(value) {
  return EMPLOYMENT_STATUSES.find((s) => s.value === value)?.color || "bg-gray-100 text-gray-600";
}

export function fullName(emp) {
  if (!emp) return "";
  return [emp.first_name, emp.last_name].filter(Boolean).join(" ");
}

export function initials(emp) {
  if (!emp) return "?";
  const f = emp.first_name?.[0] || "";
  const l = emp.last_name?.[0] || "";
  return (f + l).toUpperCase() || "?";
}