// Shared HR helpers for the Phase 2A backend function.
// All functions here run with the service-role client (svc) passed in by
// callers, so they bypass RLS to create/update/delete HR records and write
// audit logs. Direct client writes are denied by RLS (no_such_role).

import { requireOrgRole, getActiveMembership } from "./workspace.ts";

// Roles permitted to access HR records (read + write). All other org members
// (finance_user, standard_staff, teacher, ministry_leader) are blocked by RLS
// and by the backend function's role check.
export const HR_ACCESS_ROLES = [
  "organisation_owner",
  "administrator",
  "hr_user",
  "school_administrator",
  "university_administrator",
  "church_administrator",
];

// Throws if the user does not hold an HR-authorised role in the org.
export async function requireHrAccess(svc, userId, orgId) {
  return requireOrgRole(svc, userId, orgId, HR_ACCESS_ROLES);
}

// Rebuild the user's hr_organisations list from their active memberships where
// they hold an HR-authorised role. This is the RLS key for all HR entities —
// users without an HR role have an empty list and cannot read any HR record.
export async function syncUserHrOrgs(svc, userId) {
  const memberships = await svc.entities.OrganisationMembership.filter({
    user_id: userId,
    status: "active",
  });
  const hrOrgIds = memberships
    .filter((m) => HR_ACCESS_ROLES.includes(m.role_in_org))
    .map((m) => m.organisation_id);
  await svc.entities.User.update(userId, { hr_organisations: hrOrgIds });
  return hrOrgIds;
}

export async function getOrgConfig(svc, orgId) {
  return svc.entities.Organisation.get(orgId);
}

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
        departmentNoun: "Department",
        departmentPlural: "Departments",
        roleNoun: "Role",
        rolePlural: "Roles",
        addEmployee: "Add Staff Member",
        employeeDirectory: "Staff Directory",
        hrHome: "Staff Overview",
      };
    default: // small_business
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
  { value: "onboarding", label: "Onboarding" },
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On Leave" },
  { value: "offboarding", label: "Offboarding" },
  { value: "former_employee", label: "Former Employee" },
  { value: "inactive", label: "Inactive" },
];

export const CONTRACT_TYPES = [
  { value: "permanent", label: "Permanent" },
  { value: "fixed_term", label: "Fixed Term" },
  { value: "part_time", label: "Part Time" },
  { value: "temporary", label: "Temporary" },
  { value: "intern", label: "Intern" },
  { value: "casual", label: "Casual" },
];

// Restricted fields stripped from employee records for non-HR-authorised
// callers. Since RLS already blocks non-HR users, this is a secondary layer
// for any future manager-level access.
export const RESTRICTED_EMPLOYEE_FIELDS = [
  "annual_salary",
  "salary_currency",
  "date_of_birth",
  "home_address",
  "personal_email",
];

export function stripRestrictedFields(employee) {
  const copy = { ...employee };
  for (const key of RESTRICTED_EMPLOYEE_FIELDS) {
    delete copy[key];
  }
  return copy;
}

// Org-type-aware demo seed data for HR. Returns departments, job roles,
// work locations, and employees tailored to the organisation type.
// Fictional names only. Used by the hr backend seed_demo action.
export function buildHrDemoSeed(org) {
  const today = new Date().toISOString().slice(0, 10);
  const currency = org.currency || "EUR";

  switch (org.type) {
    case "school":
      return {
        departments: [
          { name: "Teaching Staff", description: "Teaching and academic staff" },
          { name: "Non-Teaching Staff", description: "Support and operations" },
          { name: "Administration", description: "School administration" },
        ],
        jobRoles: [
          { title: "Head Teacher", deptIndex: 0 },
          { title: "Teacher", deptIndex: 0 },
          { title: "Teaching Assistant", deptIndex: 0 },
          { title: "Administrator", deptIndex: 2 },
          { title: "Caretaker", deptIndex: 1 },
        ],
        locations: [
          { name: "Main Campus", type: "site" },
          { name: "Remote", type: "remote" },
        ],
        employees: [
          { first: "Mary", last: "O'Brien", dept: 0, role: 0, status: "active", contract: "permanent", salary: 52000, loc: 0, start: "2023-08-01" },
          { first: "James", last: "Walsh", dept: 0, role: 1, status: "active", contract: "permanent", salary: 42000, loc: 0, start: "2024-01-15" },
          { first: "Sarah", last: "Kelly", dept: 0, role: 1, status: "active", contract: "permanent", salary: 41000, loc: 0, start: "2024-09-01" },
          { first: "Patrick", last: "Dunne", dept: 0, role: 2, status: "onboarding", contract: "fixed_term", salary: 28000, loc: 0, start: today },
          { first: "Anne", last: "Clarke", dept: 2, role: 3, status: "active", contract: "permanent", salary: 38000, loc: 0, start: "2023-06-01" },
          { first: "Michael", last: "Brennan", dept: 1, role: 4, status: "active", contract: "part_time", salary: 24000, loc: 0, start: "2024-02-01" },
        ],
        managerMap: { 1: 0, 2: 0, 3: 0 },
        currency,
      };
    case "university":
      return {
        departments: [
          { name: "Faculty of Science", description: "Science and engineering" },
          { name: "Faculty of Arts", description: "Humanities and arts" },
          { name: "Administration", description: "University administration" },
          { name: "Research", description: "Research and development" },
        ],
        jobRoles: [
          { title: "Professor", deptIndex: 0 },
          { title: "Lecturer", deptIndex: 0 },
          { title: "Researcher", deptIndex: 3 },
          { title: "Administrator", deptIndex: 2 },
          { title: "Dean", deptIndex: null },
        ],
        locations: [
          { name: "Main Campus", type: "site" },
          { name: "Remote", type: "remote" },
        ],
        employees: [
          { first: "David", last: "O'Sullivan", dept: 0, role: 0, status: "active", contract: "permanent", salary: 85000, loc: 0, start: "2022-09-01" },
          { first: "Emma", last: "Murphy", dept: 0, role: 1, status: "active", contract: "permanent", salary: 62000, loc: 0, start: "2023-09-01" },
          { first: "Conor", last: "Ryan", dept: 1, role: 1, status: "active", contract: "permanent", salary: 58000, loc: 0, start: "2024-01-15" },
          { first: "Sofia", last: "Garcia", dept: 3, role: 2, status: "on_leave", contract: "fixed_term", salary: 55000, loc: 1, start: "2023-03-01" },
          { first: "Liam", last: "Fitzgerald", dept: 2, role: 3, status: "active", contract: "permanent", salary: 48000, loc: 0, start: "2024-03-01" },
          { first: "Hannah", last: "Doyle", dept: 1, role: 1, status: "onboarding", contract: "permanent", salary: 54000, loc: 0, start: today },
        ],
        managerMap: { 1: 0, 3: 0, 5: 2 },
        currency,
      };
    case "church":
      return {
        departments: [
          { name: "Pastoral", description: "Pastoral care and ministry" },
          { name: "Worship", description: "Worship and music" },
          { name: "Administration", description: "Church administration" },
          { name: "Outreach", description: "Community outreach" },
        ],
        jobRoles: [
          { title: "Pastor", deptIndex: 0 },
          { title: "Worship Leader", deptIndex: 1 },
          { title: "Administrator", deptIndex: 2 },
          { title: "Ministry Leader", deptIndex: 3 },
          { title: "Volunteer", deptIndex: null },
        ],
        locations: [
          { name: "Church Office", type: "office" },
          { name: "Remote", type: "remote" },
        ],
        employees: [
          { first: "Paul", last: "Adeyemi", dept: 0, role: 0, status: "active", contract: "permanent", salary: 45000, loc: 0, start: "2022-06-01" },
          { first: "Grace", last: "Okonkwo", dept: 1, role: 1, status: "active", contract: "part_time", salary: 28000, loc: 0, start: "2023-09-01" },
          { first: "Samuel", last: "Ojo", dept: 2, role: 2, status: "active", contract: "permanent", salary: 35000, loc: 0, start: "2024-01-15" },
          { first: "Ruth", last: "Bello", dept: 3, role: 3, status: "active", contract: "casual", salary: 18000, loc: 1, start: "2024-04-01" },
          { first: "John", last: "Eze", dept: 3, role: 4, status: "active", contract: "casual", salary: 0, loc: 1, start: "2024-05-01" },
          { first: "Esther", last: "Nwankwo", dept: 0, role: 4, status: "onboarding", contract: "casual", salary: 0, loc: 0, start: today },
        ],
        managerMap: { 1: 0, 2: 0, 3: 0 },
        currency,
      };
    default: // small_business
      return {
        departments: [
          { name: "Sales", description: "Sales and business development" },
          { name: "Operations", description: "Day-to-day operations" },
          { name: "Finance", description: "Finance and accounting" },
        ],
        jobRoles: [
          { title: "Operations Manager", deptIndex: 1 },
          { title: "Sales Representative", deptIndex: 0 },
          { title: "Finance Officer", deptIndex: 2 },
          { title: "Team Lead", deptIndex: null },
        ],
        locations: [
          { name: "Head Office", type: "office" },
          { name: "Remote", type: "remote" },
        ],
        employees: [
          { first: "Chidi", last: "Okafor", dept: 1, role: 0, status: "active", contract: "permanent", salary: 48000, loc: 0, start: "2024-01-15" },
          { first: "Amara", last: "Eze", dept: 0, role: 1, status: "active", contract: "permanent", salary: 36000, loc: 0, start: "2024-03-01" },
          { first: "Tunde", last: "Bello", dept: 0, role: 1, status: "on_leave", contract: "permanent", salary: 38000, loc: 1, start: "2023-07-01" },
          { first: "Fatima", last: "Yusuf", dept: 2, role: 2, status: "active", contract: "permanent", salary: 42000, loc: 0, start: "2024-06-01" },
          { first: "Emeka", last: "Nwosu", dept: 0, role: 1, status: "onboarding", contract: "fixed_term", salary: 32000, loc: 1, start: today },
          { first: "Zainab", last: "Ibrahim", dept: 2, role: 2, status: "active", contract: "part_time", salary: 28000, loc: 0, start: "2024-02-15" },
        ],
        managerMap: { 1: 0, 2: 0, 3: 0, 4: 0 },
        currency,
      };
  }
}