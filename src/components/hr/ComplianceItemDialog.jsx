import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Loader2 } from "lucide-react";

const CATEGORIES = [
  { value: "tax", label: "Tax" },
  { value: "employment_law", label: "Employment Law" },
  { value: "health_safety", label: "Health & Safety" },
  { value: "data_protection", label: "Data Protection" },
  { value: "licensing", label: "Licensing" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
];

const RECURRENCES = [
  { value: "one_off", label: "One-off" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

export default function ComplianceItemDialog({ open, onClose, onSubmit, initial, employees }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("tax");
  const [ownerId, setOwnerId] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [reminderDays, setReminderDays] = useState(7);
  const [recurrence, setRecurrence] = useState("annual");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title || "");
      setDescription(initial?.description || "");
      setCategory(initial?.category || "tax");
      setOwnerId(initial?.owner_employee_id || "");
      setDeadlineDate(initial?.deadline_date || "");
      setReminderDays(initial?.reminder_days ?? 7);
      setRecurrence(initial?.recurrence || "annual");
      setNotes(initial?.notes || "");
      setError(null);
    }
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!title || !category) { setError("Title and category are required"); return; }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        title,
        description,
        category,
        owner_employee_id: ownerId || null,
        deadline_date: deadlineDate || null,
        reminder_days: Number(reminderDays),
        recurrence,
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Compliance Item" : "New Compliance Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Annual Tax Filing" />
          </div>
          <div>
            <Label>Description (operational guidance, not legal advice)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Category *</Label>
            <ResponsiveSelect
              value={category}
              onValueChange={setCategory}
              placeholder="Select category"
              options={CATEGORIES}
            />
          </div>
          <div>
            <Label>Owner (optional)</Label>
            <ResponsiveSelect
              value={ownerId}
              onValueChange={setOwnerId}
              placeholder="Assign to employee"
              options={(employees || []).map((e) => ({
                value: e.id,
                label: [e.first_name, e.last_name].filter(Boolean).join(" "),
              }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Deadline</Label>
              <Input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} />
            </div>
            <div>
              <Label>Reminder (days before)</Label>
              <Input type="number" min="0" value={reminderDays} onChange={(e) => setReminderDays(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Recurrence</Label>
            <ResponsiveSelect
              value={recurrence}
              onValueChange={setRecurrence}
              placeholder="Select recurrence"
              options={RECURRENCES}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            {initial ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}