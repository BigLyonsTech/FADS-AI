import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle } from "lucide-react";

export default function LeaveRequestDialog({ open, onClose, onSubmit, employees, leaveTypes }) {
  const [employeeId, setEmployeeId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [docProvided, setDocProvided] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setEmployeeId("");
      setLeaveTypeId("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setDocProvided(false);
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!employeeId || !leaveTypeId || !startDate || !endDate) {
      setError("Please fill in all required fields");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        employee_id: employeeId,
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        reason,
        documentation_provided: docProvided,
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
          <DialogTitle>New Leave Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Employee *</Label>
            <ResponsiveSelect
              value={employeeId}
              onValueChange={setEmployeeId}
              placeholder="Select employee"
              options={(employees || []).map((e) => ({
                value: e.id,
                label: [e.first_name, e.last_name].filter(Boolean).join(" "),
              }))}
            />
          </div>
          <div>
            <Label>Leave Type *</Label>
            <ResponsiveSelect
              value={leaveTypeId}
              onValueChange={setLeaveTypeId}
              placeholder="Select leave type"
              options={(leaveTypes || []).filter((t) => t.is_active).map((t) => ({ value: t.id, label: t.name }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>End Date *</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Reason (optional — no medical details)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. Family holiday, personal matters" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={docProvided} onCheckedChange={setDocProvided} />
            <Label className="text-sm font-normal cursor-pointer" onClick={() => setDocProvided(!docProvided)}>
              Supporting documentation provided
            </Label>
          </div>
          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}