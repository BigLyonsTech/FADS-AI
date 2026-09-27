import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useHrLifecycle } from "@/lib/useHrLifecycle";
import { useHr } from "@/lib/useHr";
import { useWorkspace } from "@/lib/useWorkspace";
import { hrWording, fullName } from "@/lib/hrWording";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import BackToHR from "@/components/hr/BackToHR";
import TaskCompleteDialog from "@/components/hr/TaskCompleteDialog";
import ConfirmDialog from "@/components/finance/ConfirmDialog";
import {
  OFFBOARDING_TASK_CATEGORIES, OFFBOARDING_REASONS,
  checklistProgress, taskCategoryLabel,
} from "@/lib/hrLifecycle";
import {
  Loader2, AlertCircle, CheckCircle2, Circle, Calendar,
  ClipboardList, Plus, User, LogOut, AlertTriangle,
} from "lucide-react";

export default function OffboardingChecklist() {
  const { id } = useParams();
  const { activeOrg } = useWorkspace();
  const w = hrWording(activeOrg?.type);
  const isDemo = activeOrg?.data_mode === "demo";
  const { getEmployee } = useHr();
  const {
    getOffboardingChecklist, createOffboardingChecklist,
    updateOffboardingTask, completeOffboarding,
  } = useHrLifecycle();

  const [employee, setEmployee] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createForm, setCreateForm] = useState({
    template_id: "", final_working_date: "", reason_category: "", reason_notes: "",
  });
  const [creating, setCreating] = useState(false);
  const [taskDialog, setTaskDialog] = useState(null);
  const [showComplete, setShowComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const empData = await getEmployee(id);
      setEmployee(empData.employee);
      const data = await getOffboardingChecklist(id);
      setChecklist(data.checklist);
      setTemplates(data.templates || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, getEmployee, getOffboardingChecklist]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createOffboardingChecklist({
        employee_id: id,
        template_id: createForm.template_id || undefined,
        final_working_date: createForm.final_working_date || undefined,
        reason_category: createForm.reason_category || undefined,
        reason_notes: createForm.reason_notes || undefined,
      });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleTaskToggle = async (taskIndex, currentCompleted) => {
    if (currentCompleted) {
      // Optimistic uncomplete
      setChecklist((prev) => prev ? {
        ...prev,
        tasks: prev.tasks.map((t, i) =>
          i === taskIndex ? { ...t, is_completed: false, completed_date: null, completed_by: null, completed_by_name: null } : t
        ),
      } : prev);
      setBusy(true);
      try {
        await updateOffboardingTask({
          checklist_id: checklist.id, task_index: taskIndex, is_completed: false,
        });
      } catch (e) {
        setError(e.message);
        load();
      } finally { setBusy(false); }
    } else {
      setTaskDialog(checklist.tasks[taskIndex]);
    }
  };

  const handleTaskSave = async (data) => {
    const taskIndex = checklist.tasks.findIndex((t) => t === taskDialog);
    // Optimistic update
    setChecklist((prev) => prev ? {
      ...prev,
      tasks: prev.tasks.map((t, i) =>
        i === taskIndex ? { ...t, ...data, is_completed: true } : t
      ),
    } : prev);
    setTaskDialog(null);
    try {
      await updateOffboardingTask({
        checklist_id: checklist.id,
        task_index: taskIndex,
        ...data,
      });
    } catch (e) {
      setError(e.message);
      load();
    }
  };

  const handleComplete = async () => {
    // Optimistic update
    setChecklist((prev) => prev ? { ...prev, status: "completed", completed_date: new Date().toISOString().slice(0, 10) } : prev);
    setShowComplete(false);
    setBusy(true);
    try {
      await completeOffboarding(checklist.id);
    } catch (e) {
      setError(e.message);
      load();
    } finally { setBusy(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mb-3" />
        <p className="text-sm text-destructive mb-3">{error}</p>
        <Button variant="outline" onClick={load}>Retry</Button>
      </div>
    );
  }

  const progress = checklist ? checklistProgress(checklist.tasks) : null;
  const allDone = progress && progress.completed === progress.total && progress.total > 0;
  const isFormer = employee?.employment_status === "former_employee";

  return (
    <div className="space-y-4">
      <BackToHR label={`Back to ${fullName(employee)}`} to={`/hr/employees/${id}`} />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-heading font-bold flex items-center gap-2">
            <LogOut className="w-5 h-5 text-brand-teal" />
            Offboarding Checklist
          </h1>
          <p className="text-sm text-muted-foreground">{fullName(employee)}</p>
        </div>
        {checklist && checklist.status !== "completed" && allDone && !isFormer && (
          <Button size="sm" className="gap-1.5" onClick={() => setShowComplete(true)}>
            <CheckCircle2 className="w-4 h-4" /> Complete Offboarding
          </Button>
        )}
      </div>

      {!checklist ? (
        isFormer ? (
          <Card className="p-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">This employee has already been offboarded.</p>
          </Card>
        ) : (
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="font-medium mb-1">Create Offboarding Checklist</h2>
              <p className="text-sm text-muted-foreground">This will set the employee status to Offboarding and create a task checklist.</p>
            </div>
            {templates.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                No active offboarding templates found. Create one in HR Settings first.
              </div>
            ) : (
              <>
                <div>
                  <Label>Template</Label>
                  <ResponsiveSelect
                    value={createForm.template_id}
                    onValueChange={(v) => setCreateForm({ ...createForm, template_id: v })}
                    placeholder="Select a template"
                    options={templates.map((t) => ({ value: t.id, label: t.name }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Final Working Date</Label>
                    <Input
                      type="date"
                      value={createForm.final_working_date}
                      onChange={(e) => setCreateForm({ ...createForm, final_working_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <ResponsiveSelect
                      value={createForm.reason_category}
                      onValueChange={(v) => setCreateForm({ ...createForm, reason_category: v })}
                      placeholder="Select reason"
                      options={OFFBOARDING_REASONS}
                    />
                  </div>
                </div>
                <div>
                  <Label>Reason Notes</Label>
                  <Textarea
                    value={createForm.reason_notes}
                    onChange={(e) => setCreateForm({ ...createForm, reason_notes: e.target.value })}
                    rows={2}
                    placeholder="Additional context (optional, HR-only)"
                  />
                </div>
                <Button onClick={handleCreate} disabled={creating || !createForm.template_id} className="gap-1.5">
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Plus className="w-4 h-4" /> Create Checklist
                </Button>
              </>
            )}
          </Card>
        )
      ) : (
        <>
          {/* Summary */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  checklist.status === "completed" ? "bg-green-100 text-green-700" :
                  checklist.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {checklist.status?.replace(/_/g, " ")}
                </span>
                <span className="text-sm text-muted-foreground">{checklist.template_name}</span>
              </div>
              <span className="text-sm font-medium">{progress.completed}/{progress.total} tasks</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mb-3">
              <div className="bg-brand-teal h-2 rounded-full transition-all" style={{ width: `${progress.percent}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {checklist.final_working_date && (
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Final day: {checklist.final_working_date}</span>
              )}
              {checklist.reason_category && (
                <span>Reason: {OFFBOARDING_REASONS.find((r) => r.value === checklist.reason_category)?.label || checklist.reason_category}</span>
              )}
            </div>
          </Card>

          {/* Task list */}
          <div className="space-y-2">
            {(checklist.tasks || []).map((task, i) => (
              <Card key={i} className={`p-4 ${task.is_completed ? "opacity-75" : ""}`}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleTaskToggle(i, task.is_completed)}
                    disabled={busy || checklist.status === "completed"}
                    className="mt-0.5 shrink-0"
                  >
                    {task.is_completed ? (
                      <CheckCircle2 className="w-5 h-5 text-status-ok" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${task.is_completed ? "line-through" : ""}`}>
                        {task.title}
                      </p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {taskCategoryLabel(OFFBOARDING_TASK_CATEGORIES, task.category)}
                      </span>
                    </div>
                    {task.description && <p className="text-xs text-muted-foreground mt-1">{task.description}</p>}
                    {task.requires_confirmation && !task.confirmation_recorded && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-status-warn">
                        <AlertTriangle className="w-3 h-3" /> Confirmation required
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                      {task.due_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Due: {task.due_date}</span>}
                      {task.completed_by_name && <span className="flex items-center gap-1"><User className="w-3 h-3" /> By: {task.completed_by_name}</span>}
                      {task.evidence_notes && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {task.evidence_notes}</span>}
                    </div>
                    {task.is_completed && task.completed_date && (
                      <p className="text-xs text-status-ok mt-1">Completed on {task.completed_date}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {checklist.status === "completed" && (
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="w-5 h-5" />
                <p className="text-sm font-medium">
                  Offboarding completed on {checklist.completed_date}. Employee safely archived.
                </p>
              </div>
            </Card>
          )}
        </>
      )}

      <TaskCompleteDialog
        open={!!taskDialog}
        onClose={() => setTaskDialog(null)}
        onSave={handleTaskSave}
        task={taskDialog}
        isDemo={isDemo}
      />
      <ConfirmDialog
        open={showComplete}
        onClose={() => setShowComplete(false)}
        onConfirm={handleComplete}
        title="Complete offboarding?"
        description="This will mark the offboarding checklist as complete and safely archive the employee (status set to Former Employee). Historical records are preserved. This action is audited."
        confirmLabel="Complete Offboarding"
        busy={busy}
      />
    </div>
  );
}