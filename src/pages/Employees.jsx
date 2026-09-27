import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useHr } from "@/lib/useHr";
import { useWorkspace } from "@/lib/useWorkspace";
import { hrWording, EMPLOYMENT_STATUSES } from "@/lib/hrWording";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Search, UserPlus, Users, Loader2, AlertCircle, SlidersHorizontal, Upload,
  Download, CheckSquare, Square,
} from "lucide-react";
import EmployeeCard from "@/components/hr/EmployeeCard";
import StatusBadge from "@/components/hr/StatusBadge";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import BulkImportDialog from "@/components/import/BulkImportDialog";
import ExportDialog from "@/components/shared/ExportDialog";
import { downloadSpreadsheet, exportFilename } from "@/lib/spreadsheetExport";
import { statusLabel } from "@/lib/hrWording";

export default function Employees() {
  const navigate = useNavigate();
  const { activeOrg } = useWorkspace();
  const { employees, departments, jobRoles, workLocations, loading, error, loadEmployees, invoke } = useHr();
  const w = hrWording(activeOrg?.type);

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [selected, setSelected] = useState({});
  const { pullDistance, refreshing, threshold } = usePullToRefresh(() => loadEmployees({}));

  useEffect(() => {
    const t = setTimeout(() => {
      loadEmployees({
        search: search || undefined,
        department_id: filterDept || undefined,
        job_role_id: filterRole || undefined,
        work_location_id: filterLocation || undefined,
        employment_status: filterStatus || undefined,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [search, filterDept, filterRole, filterLocation, filterStatus, loadEmployees]);

  const hasFilters = filterDept || filterRole || filterLocation || filterStatus;

  const selectedEmployees = useMemo(
    () => employees.filter((e) => selected[e.id]),
    [employees, selected]
  );
  const toggleSelect = (id) =>
    setSelected((s) => {
      const next = { ...s };
      if (next[id]) delete next[id]; else next[id] = true;
      return next;
    });

  const exportOptions = useMemo(() => [
    { key: "all", label: "All Employees", count: employees.length },
    { key: "selected", label: "Selected", count: selectedEmployees.length },
  ], [employees, selectedEmployees]);

  const handleExport = async (optionKey, format) => {
    if (format === "google_sheets") return;
    // Only safe, non-sensitive fields — no personal_email, salary, DOB,
    // home address, bank details, or system metadata.
    const columns = [
      { key: "name", label: "Name" },
      { key: "email", label: "Work Email" },
      { key: "phone", label: "Phone" },
      { key: "job_role_title", label: "Role" },
      { key: "department_name", label: "Department" },
      { key: "work_location_name", label: "Location" },
      { key: "status_label", label: "Status" },
      { key: "contract_type", label: "Contract Type" },
      { key: "start_date", label: "Start Date" },
      { key: "end_date", label: "End Date" },
    ];
    const buildRows = (list) => list.map((e) => ({
      name: [e.first_name, e.last_name].filter(Boolean).join(" "),
      email: e.email || "",
      phone: e.phone || "",
      job_role_title: e.job_role_title || "",
      department_name: e.department_name || "",
      work_location_name: e.work_location_name || "",
      status_label: statusLabel(e.employment_status),
      contract_type: e.contract_type || "",
      start_date: e.start_date || "",
      end_date: e.end_date || "",
    }));
    let rows;
    let prefix;
    if (optionKey === "all") {
      // If filters are active, fetch the unfiltered list from the backend.
      let list = employees;
      if (hasFilters) {
        const res = await invoke({ action: "list_employees" });
        list = res?.employees || [];
      }
      rows = buildRows(list);
      prefix = "Employees";
    } else if (optionKey === "selected") {
      rows = buildRows(selectedEmployees);
      prefix = "Employees-Selected";
    } else {
      return;
    }
    downloadSpreadsheet(rows, columns, exportFilename(prefix, activeOrg?.name));
  };

  const clearFilters = () => {
    setFilterDept(""); setFilterRole(""); setFilterLocation(""); setFilterStatus("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-heading font-bold">{w.employeeDirectory}</h1>
          <p className="text-sm text-muted-foreground">{employees.length} {w.staffPlural.toLowerCase()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4" /> Bring Data In
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setExportOpen(true)}>
            <Download className="w-4 h-4" /> Export
          </Button>
          <Link to="/hr/employees/new">
            <Button size="sm" className="gap-1.5">
              <UserPlus className="w-4 h-4" /> {w.addEmployee}
            </Button>
          </Link>
        </div>
      </div>

      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <ResponsiveSelect
              value={filterDept}
              onValueChange={setFilterDept}
              placeholder="All Departments"
              options={[
                { value: "", label: "All Departments" },
                ...departments.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
            <ResponsiveSelect
              value={filterRole}
              onValueChange={setFilterRole}
              placeholder="All Roles"
              options={[
                { value: "", label: "All Roles" },
                ...jobRoles.map((r) => ({ value: r.id, label: r.title })),
              ]}
            />
            <ResponsiveSelect
              value={filterLocation}
              onValueChange={setFilterLocation}
              placeholder="All Locations"
              options={[
                { value: "", label: "All Locations" },
                ...workLocations.map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
            <ResponsiveSelect
              value={filterStatus}
              onValueChange={setFilterStatus}
              placeholder="All Statuses"
              options={[
                { value: "", label: "All Statuses" },
                ...EMPLOYMENT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
              ]}
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
              Clear filters
            </Button>
          )}
        </Card>
      )}

      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} threshold={threshold} />

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-8 h-8 text-destructive mb-2" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {!loading && !error && employees.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-medium mb-1">No {w.staffPlural.toLowerCase()} found</p>
          <p className="text-sm text-muted-foreground mb-4">
            {hasFilters ? "Try adjusting your filters." : "Add your first employee to get started."}
          </p>
          {!hasFilters && (
            <Link to="/hr/employees/new">
              <Button size="sm" className="gap-1.5">
                <UserPlus className="w-4 h-4" /> {w.addEmployee}
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Desktop table */}
      {!loading && employees.length > 0 && (
        <>
          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="w-10 px-4 py-3"></th>
                    <th className="text-left font-medium px-4 py-3">Name</th>
                    <th className="text-left font-medium px-4 py-3">Role</th>
                    <th className="text-left font-medium px-4 py-3">Department</th>
                    <th className="text-left font-medium px-4 py-3">Location</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`/hr/employees/${e.id}`)}>
                      <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                        <button onClick={() => toggleSelect(e.id)} className="text-muted-foreground hover:text-foreground">
                          {selected[e.id] ? <CheckSquare className="w-5 h-5 text-brand-teal" /> : <Square className="w-5 h-5" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-navy text-white flex items-center justify-center text-xs font-medium shrink-0">
                            {(e.first_name?.[0] || "") + (e.last_name?.[0] || "")}
                          </div>
                          <div>
                            <p className="font-medium">{[e.first_name, e.last_name].filter(Boolean).join(" ")}</p>
                            <p className="text-xs text-muted-foreground">{e.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{e.job_role_title || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.department_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.work_location_name || "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={e.employment_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden grid grid-cols-1 gap-2">
            {employees.map((e) => (
              <div key={e.id} className="flex items-start gap-2">
                <button onClick={() => toggleSelect(e.id)} className="mt-3 text-muted-foreground hover:text-foreground shrink-0">
                  {selected[e.id] ? <CheckSquare className="w-5 h-5 text-brand-teal" /> : <Square className="w-5 h-5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <EmployeeCard employee={e} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <BulkImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        importType="hr"
        orgId={activeOrg?.id}
        orgType={activeOrg?.type}
        orgName={activeOrg?.name}
        dataMode={activeOrg?.data_mode}
        existingRecords={employees}
        onComplete={() => loadEmployees({})}
      />

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export Employees"
        options={exportOptions}
        onExport={handleExport}
        googleSheetsAvailable={false}
      />
    </div>
  );
}