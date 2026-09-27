import React, { useEffect, useState, useCallback } from "react";
import { useHrAttendance } from "@/lib/useHrAttendance";
import { useHr } from "@/lib/useHr";
import { useWorkspace } from "@/lib/useWorkspace";
import { base44 } from "@/api/base44Client";
import { fullName } from "@/lib/hrWording";
import BackToHR from "@/components/hr/BackToHR";
import AttendanceRecordDialog from "@/components/hr/AttendanceRecordDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Loader2, Plus, Upload, Pencil, Trash2, CalendarCheck, FileUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STATUS_COLOURS = {
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  late: "bg-amber-100 text-amber-700",
  remote: "bg-blue-100 text-blue-700",
  excused: "bg-gray-100 text-gray-600",
};

export default function AttendanceHome() {
  const { activeOrg } = useWorkspace();
  const { toast } = useToast();
  const { employees, loadEmployees } = useHr();
  const {
    listRecords, createRecord, updateRecord, deleteRecord, importFromFile, seedDemo,
  } = useHrAttendance();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [importing, setImporting] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeOrg?.id) return;
    setLoading(true);
    try {
      const data = await listRecords({
        employee_id: filterEmployee || undefined,
        start_date: filterStartDate || undefined,
        end_date: filterEndDate || undefined,
      });
      setRecords(data.records || []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }, [activeOrg?.id, filterEmployee, filterStartDate, filterEndDate, listRecords]);

  useEffect(() => {
    if (activeOrg?.id) {
      loadEmployees();
      loadData();
    }
  }, [activeOrg?.id]);

  // Auto-seed demo
  useEffect(() => {
    if (activeOrg?.data_mode === "demo" && records.length === 0 && !loading && !seeding && employees.length > 0) {
      const doSeed = async () => {
        setSeeding(true);
        try {
          await seedDemo();
          await loadData();
        } catch (e) { /* ignore */ }
        finally { setSeeding(false); }
      };
      doSeed();
    }
  }, [activeOrg?.data_mode, records.length, loading, seeding, employees.length]);

  const handleSave = async (data) => {
    if (editingRecord) {
      await updateRecord(editingRecord.id, data);
      toast({ title: "Attendance updated" });
    } else {
      await createRecord(data);
      toast({ title: "Attendance recorded" });
    }
    setEditingRecord(null);
    await loadData();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this attendance record?")) return;
    await deleteRecord(id);
    toast({ title: "Record deleted" });
    await loadData();
  };

  const handleImport = async (file) => {
    if (!file) return;
    setImporting(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await importFromFile(file_url);
      toast({
        title: `Import complete: ${result.success} succeeded, ${result.errors} failed`,
        variant: result.errors > 0 ? "destructive" : "default",
      });
      await loadData();
    } catch (e) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
      setShowImport(false);
    }
  };

  // Group records by date
  const grouped = {};
  for (const r of records) {
    if (!grouped[r.date]) grouped[r.date] = [];
    grouped[r.date].push(r);
  }
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (loading && records.length === 0) {
    return (
      <div className="space-y-4">
        <BackToHR label="Back to HR" to="/hr" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackToHR label="Back to HR" to="/hr" />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-brand-teal" /> Attendance
          </h1>
          <p className="text-sm text-muted-foreground">{activeOrg?.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowImport(true)}>
            <FileUp className="w-4 h-4" /> Import CSV
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setEditingRecord(null); setShowDialog(true); }}>
            <Plus className="w-4 h-4" /> Record
          </Button>
        </div>
      </div>

      {seeding && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-brand-mint/30 p-3 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin" /> Setting up demo attendance data...
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <ResponsiveSelect
          value={filterEmployee || ""}
          onValueChange={setFilterEmployee}
          placeholder="All employees"
          options={[
            { value: "", label: "All employees" },
            ...employees.map((e) => ({ value: e.id, label: fullName(e) })),
          ]}
        />
        <Input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} placeholder="From" />
        <Input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} placeholder="To" />
      </div>

      {/* Records */}
      {sortedDates.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No attendance records found. Click "Record" to add one manually, or "Import CSV" to bulk import.
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedDates.slice(0, 30).map((date) => (
            <div key={date}>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              </p>
              <div className="space-y-1">
                {grouped[date].map((r) => (
                  <Card key={r.id} className="p-2.5 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{r.employee_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.check_in_time ? `In: ${r.check_in_time}` : ""}
                        {r.check_out_time ? ` · Out: ${r.check_out_time}` : ""}
                        {r.notes ? ` · ${r.notes}` : ""}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOURS[r.status] || "bg-gray-100"}`}>
                      {r.status}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingRecord(r); setShowDialog(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          {sortedDates.length > 30 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              Showing 30 most recent dates. Use filters to narrow results.
            </p>
          )}
        </div>
      )}

      {/* Import dialog */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !importing && setShowImport(false)}>
          <Card className="p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-medium mb-2">Import Attendance from CSV</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Upload a CSV file with columns: <code className="text-xs">employee_name, date, status, check_in, check_out, notes</code>.
              Status must be one of: present, absent, late, remote, excused.
            </p>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              disabled={importing}
              onChange={(e) => handleImport(e.target.files[0])}
            />
            {importing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                <Loader2 className="w-4 h-4 animate-spin" /> Importing...
              </div>
            )}
          </Card>
        </div>
      )}

      <AttendanceRecordDialog
        open={showDialog}
        onClose={() => { setShowDialog(false); setEditingRecord(null); }}
        onSubmit={handleSave}
        employees={employees.filter((e) => e.employment_status !== "former_employee" && e.employment_status !== "inactive")}
        initial={editingRecord}
      />
    </div>
  );
}