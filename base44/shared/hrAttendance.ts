// Shared helpers for the Phase 2C Attendance backend function.

export const ATTENDANCE_STATUSES = [
  { value: "present", label: "Present", colour: "bg-green-100 text-green-700" },
  { value: "absent", label: "Absent", colour: "bg-red-100 text-red-700" },
  { value: "late", label: "Late", colour: "bg-amber-100 text-amber-700" },
  { value: "remote", label: "Remote", colour: "bg-blue-100 text-blue-700" },
  { value: "excused", label: "Excused", colour: "bg-gray-100 text-gray-600" },
];

export function attendanceLabel(value) {
  return ATTENDANCE_STATUSES.find((s) => s.value === value)?.label || value;
}

export function attendanceColour(value) {
  return ATTENDANCE_STATUSES.find((s) => s.value === value)?.colour || "bg-gray-100 text-gray-600";
}

// Default work schedule seeded for new organisations.
export const DEFAULT_WORK_SCHEDULE = {
  name: "Standard Week",
  description: "Monday to Friday, 9am to 5pm.",
  working_days: [1, 2, 3, 4, 5],
  start_time: "09:00",
  end_time: "17:00",
};

// Default public holidays (Ireland-focused but configurable per org).
// Year is current year; org can edit/delete/add as needed.
export function getDefaultHolidays(year) {
  return [
    { name: "New Year's Day", date: `${year}-01-01` },
    { name: "St. Brigid's Day", date: `${year}-02-03` },
    { name: "St. Patrick's Day", date: `${year}-03-17` },
    { name: "Easter Monday", date: `${year}-04-06` },
    { name: "May Day", date: `${year}-05-05` },
    { name: "June Holiday", date: `${year}-06-02` },
    { name: "August Holiday", date: `${year}-08-04` },
    { name: "October Holiday", date: `${year}-10-27` },
    { name: "Christmas Day", date: `${year}-12-25` },
    { name: "St. Stephen's Day", date: `${year}-12-26` },
  ];
}

// Validate a CSV-imported attendance row.
// Returns { valid, errors, record } — record is null if invalid.
export function parseAttendanceRow(row, rowIndex) {
  const errors = [];
  const employeeName = (row.employee_name || row.name || "").trim();
  const date = (row.date || "").trim();
  const status = (row.status || "present").trim().toLowerCase();

  if (!employeeName) errors.push(`Row ${rowIndex}: missing employee name`);
  if (!date) errors.push(`Row ${rowIndex}: missing date`);
  if (!["present", "absent", "late", "remote", "excused"].includes(status)) {
    errors.push(`Row ${rowIndex}: invalid status "${status}"`);
  }

  return {
    valid: errors.length === 0,
    errors,
    record: {
      employee_name: employeeName,
      date,
      status,
      check_in_time: (row.check_in || "").trim() || null,
      check_out_time: (row.check_out || "").trim() || null,
      notes: (row.notes || "").trim() || null,
    },
  };
}