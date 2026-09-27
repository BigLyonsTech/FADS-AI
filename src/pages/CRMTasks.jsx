import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Plus, Check, Trash2, Calendar, Clock, MapPin, Pencil, XCircle } from "lucide-react";
import { useCrm } from "@/lib/useCrm";
import { TASK_TYPE_OPTIONS } from "@/lib/crmWording";
import TaskDialog from "@/components/crm/TaskDialog";
import CrmPageIntro from "@/components/crm/CrmPageIntro";
import CrmEmptyState from "@/components/crm/CrmEmptyState";
import CrmNav from "@/components/crm/CrmNav";

function statusLabel(task) {
  if (task.type === "appointment") {
    if (task.status === "open") return "Scheduled";
    if (task.status === "done") return "Completed";
    return "Cancelled";
  }
  if (task.type === "reminder") {
    return task.status === "done" ? "Completed" : "Open";
  }
  if (task.status === "done") return "Completed";
  if (task.status === "cancelled") return "Cancelled";
  return "Open";
}

export default function CRMTasks() {
  const crm = useCrm();
  const { loading, tasks, contacts } = crm;

  const [showDialog, setShowDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [defaultType, setDefaultType] = useState("task");
  const [typeFilter, setTypeFilter] = useState("");
  const [showClosed, setShowClosed] = useState(false);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (typeFilter && t.type !== typeFilter) return false;
      if (!showClosed && t.status !== "open") return false;
      return true;
    });
  }, [tasks, typeFilter, showClosed]);

  const sorted = [...filtered].sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    const aKey = `${a.due_date || "9999"} ${a.due_time || "99:99"}`;
    const bKey = `${b.due_date || "9999"} ${b.due_time || "99:99"}`;
    return aKey > bKey ? 1 : -1;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  const openNew = (type) => {
    setEditingTask(null);
    setDefaultType(type);
    setShowDialog(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setDefaultType(task.type);
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingTask(null);
    setDefaultType("task");
  };

  const setTaskStatus = async (task, status) => {
    await crm.updateTask(task.id, {
      status,
      completed_date: status === "done" ? new Date().toISOString().slice(0, 10) : null,
    });
  };

  const toggleDone = async (task) => {
    await setTaskStatus(task, task.status === "done" ? "open" : "done");
  };

  const handleDelete = async (task) => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    await crm.deleteTask(task.id);
  };

  const today = new Date().toDateString();

  return (
    <div className="space-y-4">
      <CrmNav orgType={crm.orgType} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold">Tasks, Reminders & Appointments</h1>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="h-9 gap-1" onClick={() => openNew("reminder")}>
            <Plus className="w-4 h-4" /> Reminder
          </Button>
          <Button size="sm" variant="outline" className="h-9 gap-1" onClick={() => openNew("appointment")}>
            <Plus className="w-4 h-4" /> Appointment
          </Button>
          <Button size="sm" className="h-9 gap-1" onClick={() => openNew("task")}>
            <Plus className="w-4 h-4" /> Task
          </Button>
        </div>
      </div>

      <CrmPageIntro
        whatIs="Keep everyday tasks, in-app reminders and customer appointments together in your CRM."
        whatYouCanDo="Add a task, reminder or appointment, link it to a contact, and mark it complete or cancelled when appropriate."
      />

      <div className="grid sm:grid-cols-2 gap-2">
        <ResponsiveSelect
          value={typeFilter}
          onValueChange={setTypeFilter}
          placeholder="All types"
          triggerClassName="h-11"
          options={[{ value: "", label: "All types" }, ...TASK_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label === "Follow-up" ? "Follow-up (contact again)" : o.label }))]}
        />
        <Button
          variant={showClosed ? "default" : "outline"}
          className="h-11"
          onClick={() => setShowClosed(!showClosed)}
        >
          {showClosed ? "Showing completed / cancelled" : "Show completed / cancelled"}
        </Button>
      </div>

      {sorted.length === 0 ? (
        <Card><CardContent className="py-2">
          <CrmEmptyState
            message={showClosed
              ? "No matching tasks, reminders or appointments."
              : "You're all caught up. No open tasks, reminders or appointments right now."}
            actionLabel="Add a task"
            actionIcon={Plus}
            onAction={() => openNew("task")}
          />
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((task) => {
            const isOverdue = task.status === "open" && task.due_date && new Date(task.due_date) < new Date(today);
            const relatedAppointment = task.related_task_id
              ? tasks.find((t) => t.id === task.related_task_id)
              : null;
            const typeLabel = TASK_TYPE_OPTIONS.find((o) => o.value === task.type)?.label || task.type;
            return (
              <Card key={task.id}>
                <CardContent className="p-3 flex items-start gap-3">
                  <button
                    onClick={() => toggleDone(task)}
                    disabled={task.status === "cancelled"}
                    className="mt-0.5 shrink-0 p-1.5 min-h-touch rounded hover:bg-accent disabled:opacity-40"
                    aria-label={task.status === "done" ? "Reopen" : "Complete"}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${task.status === "done" ? "bg-brand-teal border-brand-teal text-white" : "border-border"}`}>
                      {task.status === "done" && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-medium text-sm ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
                      <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
                      <Badge variant="secondary" className="text-xs">{statusLabel(task)}</Badge>
                      {task.priority === "high" && task.type !== "appointment" && task.type !== "reminder" && (
                        <Badge variant="destructive" className="text-xs">High</Badge>
                      )}
                    </div>
                    {task.description && <p className="text-xs text-muted-foreground mt-1">{task.description}</p>}
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {task.contact_name && <span>{task.contact_name}</span>}
                      {task.due_date && (
                        <span className={`flex items-center gap-1 ${isOverdue ? "text-status-bad font-medium" : ""}`}>
                          <Calendar className="w-3 h-3" />
                          {task.due_date}{isOverdue ? " · overdue" : ""}
                        </span>
                      )}
                      {task.due_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {task.due_time}{task.end_time ? `–${task.end_time}` : ""}</span>}
                      {task.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {task.location}</span>}
                      {relatedAppointment && <span>Related: {relatedAppointment.title}</span>}
                    </div>
                    {task.type === "appointment" && task.status === "open" && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => setTaskStatus(task, "done")}>Complete</Button>
                        <Button size="sm" variant="outline" className="h-8 text-destructive" onClick={() => setTaskStatus(task, "cancelled")}>Cancel appointment</Button>
                      </div>
                    )}
                    {task.type === "reminder" && task.status === "open" && (
                      <div className="mt-2">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => setTaskStatus(task, "done")}>Complete reminder</Button>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0">
                    <button onClick={() => openEdit(task)} className="p-2 min-h-touch min-w-touch rounded-lg hover:bg-accent" aria-label="Edit">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    {task.type === "appointment" && task.status === "open" && (
                      <button onClick={() => setTaskStatus(task, "cancelled")} className="p-2 min-h-touch min-w-touch rounded-lg hover:bg-accent" aria-label="Cancel appointment">
                        <XCircle className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(task)} className="p-2 min-h-touch min-w-touch rounded-lg hover:bg-accent" aria-label="Delete">
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TaskDialog
        key={`${crm?.orgId || ""}:${crm?.dataMode || ""}`}
        open={showDialog}
        onClose={closeDialog}
        contacts={contacts}
        tasks={tasks}
        record={editingTask}
        defaultType={defaultType}
        onSaved={async (payload, isEdit, id) => {
          if (isEdit) await crm.updateTask(id, payload);
          else await crm.createTask(payload);
          closeDialog();
        }}
      />
    </div>
  );
}