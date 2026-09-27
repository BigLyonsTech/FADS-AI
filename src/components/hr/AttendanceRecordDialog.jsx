import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Loader2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "remote", label: "Remote" },
  { value: "excused", label: "Excused" },
];

export default function AttendanceRecordDialog({ open, onClose, onSubmit, employees, initial }) {
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("present");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setEmployeeId(initial?.employee_id || "");
      setDate(initial?.date || new Date().toISOString().slice(0, 10));
      setStatus(initial?.status || "present");
      setCheckIn(initial?.check_in_time || "");
      setCheckOut(initial?.check_out_time || "");
      setNotes(initial?.notes || "");
      setError(null);
    }
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!employeeId || !date || !status) {
      setError("Employee, date and status are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        employee_id: employeeId,
        date,
        status,
        check_in_time: checkIn || null,
        check_out_time: checkOut || null,
        notes,
      });
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Attendance" : "Record Attendance"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Employee *</Label>
            <ResponsiveSelect
              value={employeeId}
              onValueChange={setEmployeeId}
              placeholder="Select employee"
              disabled={!!initial}
              options={(employees || []).map((e) => ({
                value: e.id,
                label: [e.first_name, e.last_name].filter(Boolean).join(" "),
              }))}
            />
          </div>
          <div>
            <Label>Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!!initial} />
          </div>
          <div>
            <Label>Status *</Label>
            <ResponsiveSelect
              value={status}
              onValueChange={setStatus}
              placeholder="Select status"
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Check In</Label>
              <Input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div>
              <Label>Check Out</Label>
              <Input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes (optional — no surveillance details)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            {initial ? "Save" : "Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}