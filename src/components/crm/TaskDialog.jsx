import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Loader2 } from "lucide-react";
import { TASK_TYPE_OPTIONS } from "@/lib/crmWording";

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const TASK_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "done", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const APPOINTMENT_STATUS_OPTIONS = [
  { value: "open", label: "Scheduled" },
  { value: "done", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const REMINDER_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "done", label: "Completed" },
];

export default function TaskDialog({
  open,
  onClose,
  onSaved,
  record,
  contacts,
  tasks = [],
  defaultContactId,
  defaultType,
}) {
  const isEdit = !!record;
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const contactOptions = [
    { value: "", label: "—" },
    ...contacts.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name || ""}`.trim() })),
  ];

  const appointmentOptions = [
    { value: "", label: "—" },
    ...tasks
      .filter((t) => t.type === "appointment" && t.id !== record?.id)
      .map((t) => ({
        value: t.id,
        label: `${t.title}${t.due_date ? ` · ${t.due_date}` : ""}${t.due_time ? ` ${t.due_time}` : ""}`,
      })),
  ];

  useEffect(() => {
    if (!open) return;
    setError("");
    if (record) {
      setForm({
        type: record.type || "task",
        title: record.title || "",
        description: record.description || "",
        contact_id: record.contact_id || "",
        related_task_id: record.related_task_id || "",
        due_date: record.due_date || "",
        due_time: record.due_time || "",
        end_time: record.end_time || "",
        location: record.location || "",
        priority: record.priority || "medium",
        status: record.status || "open",
      });
    } else {
      setForm({
        type: defaultType || "task",
        title: "",
        description: "",
        contact_id: defaultContactId || "",
        related_task_id: "",
        due_date: "",
        due_time: "",
        end_time: "",
        location: "",
        priority: "medium",
        status: "open",
      });
    }
  }, [open, record, defaultContactId, defaultType]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const isAppointment = form.type === "appointment";
  const isReminder = form.type === "reminder";
  const statusOptions = isAppointment
    ? APPOINTMENT_STATUS_OPTIONS
    : isReminder
      ? REMINDER_STATUS_OPTIONS
      : TASK_STATUS_OPTIONS;

  const submit = async () => {
    setError("");
    if (!form.title) { setError(isAppointment ? "Service / reason is required" : "Title is required"); return; }
    if ((isAppointment || isReminder) && !form.due_date) { setError("Date is required"); return; }
    if (isAppointment && !form.due_time) { setError("Start time is required"); return; }
    setBusy(true);
    try {
      const contact = contacts.find((c) => c.id === form.contact_id);
      const payload = {
        ...form,
        contact_name: contact ? `${contact.first_name} ${contact.last_name || ""}`.trim() : "",
        related_task_id: isReminder ? (form.related_task_id || "") : "",
        due_time: (isAppointment || isReminder) ? (form.due_time || "") : form.due_time,
        end_time: isAppointment ? (form.end_time || "") : "",
        location: isAppointment ? (form.location || "") : "",
      };
      await onSaved(payload, isEdit, record?.id);
    } catch (e) {
      setError(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const itemLabel = isAppointment ? "Appointment" : isReminder ? "Reminder" : "Task";
  const titleLabel = isAppointment ? "Service / Reason" : isReminder ? "Reminder" : "Title";
  const notesLabel = isAppointment || isReminder ? "Notes" : "Description";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit" : "New"} {itemLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div>
            <Label>Type</Label>
            <ResponsiveSelect
              value={form.type || "task"}
              onValueChange={(v) => set("type", v)}
              placeholder="Select type"
              triggerClassName="h-11"
              options={TASK_TYPE_OPTIONS}
            />
          </div>
          <div>
            <Label>{titleLabel} *</Label>
            <Input className="h-11" value={form.title || ""} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <Label>Contact / Customer</Label>
            <ResponsiveSelect
              value={form.contact_id || ""}
              onValueChange={(v) => set("contact_id", v)}
              placeholder="Select contact"
              triggerClassName="h-11"
              options={contactOptions}
            />
          </div>
          {isReminder && (
            <div>
              <Label>Related appointment (optional)</Label>
              <ResponsiveSelect
                value={form.related_task_id || ""}
                onValueChange={(v) => set("related_task_id", v)}
                placeholder="Select appointment"
                triggerClassName="h-11"
                options={appointmentOptions}
              />
            </div>
          )}
          <div className={isAppointment || isReminder ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 gap-3"}>
            <div>
              <Label>{isAppointment ? "Date" : "Due date"}</Label>
              <Input className="h-11" type="date" value={form.due_date || ""} onChange={(e) => set("due_date", e.target.value)} />
            </div>
            {isAppointment || isReminder ? (
              <div>
                <Label>{isAppointment ? "Start time" : "Due time"}</Label>
                <Input className="h-11" type="time" value={form.due_time || ""} onChange={(e) => set("due_time", e.target.value)} />
              </div>
            ) : (
              <div>
                <Label>Priority</Label>
                <ResponsiveSelect
                  value={form.priority || "medium"}
                  onValueChange={(v) => set("priority", v)}
                  placeholder="Select priority"
                  triggerClassName="h-11"
                  options={PRIORITY_OPTIONS}
                />
              </div>
            )}
          </div>
          {isAppointment && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>End time</Label>
                  <Input className="h-11" type="time" value={form.end_time || ""} onChange={(e) => set("end_time", e.target.value)} />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input className="h-11" value={form.location || ""} onChange={(e) => set("location", e.target.value)} />
                </div>
              </div>
            </>
          )}
          {(isAppointment || isReminder) && (
            <div>
              <Label>Status</Label>
              <ResponsiveSelect
                value={form.status || "open"}
                onValueChange={(v) => set("status", v)}
                placeholder="Select status"
                triggerClassName="h-11"
                options={statusOptions}
              />
            </div>
          )}
          <div>
            <Label>{notesLabel}</Label>
            <Textarea value={form.description || ""} onChange={(e) => set("description", e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="h-11" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}