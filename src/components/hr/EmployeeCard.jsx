import React from "react";
import { Link } from "react-router-dom";
import { initials, fullName } from "@/lib/hrWording";
import StatusBadge from "./StatusBadge";

export default function EmployeeCard({ employee }) {
  return (
    <Link
      to={`/hr/employees/${employee.id}`}
      className="block bg-card rounded-lg border border-border p-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-brand-navy text-white flex items-center justify-center font-medium text-sm shrink-0">
          {initials(employee)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-sm truncate">{fullName(employee)}</p>
            <StatusBadge status={employee.employment_status} />
          </div>
          {employee.job_role_title && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {employee.job_role_title}
            </p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
            {employee.department_name && <span>{employee.department_name}</span>}
            {employee.work_location_name && <span>· {employee.work_location_name}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}