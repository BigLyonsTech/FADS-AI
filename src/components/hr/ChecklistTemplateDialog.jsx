import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import {
  ONBOARDING_TASK_CATEGORIES, OFFBOARDING_TASK_CATEGORIES,
} from "@/lib/hrLifecycle";
import { Loader2, X, Plus, Trash2 } from "lucide-react";

export default function ChecklistTemplateDialog({
  open, onClose, onSave, editTemplate, type,
}) {
  const isOffboarding = type === "offboarding";
  const categories = isOffboarding ? OFFBOARDING_TASK_CATEGORIES : ONBOARDING_TASK_CATEGORIES;

  const [form, setForm] = useState({ name: "", description: "", tasks: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: editTemplate?.name || "",
        description: editTemplate?.description || "",
        tasks: (editTemplate?.tasks || []).map((t) => ({ ...t })),
      });
    }
  }, [open, editTemplate]);

  const updateTask = (index, patch) => {
    const tasks = [...form.tasks];
    tasks[index] = { ...tasks[index], ...patch };
    setForm({ ...form, tasks });
  };

  const addTask = () => {
    setForm({
      ...form,
      tasks: [...form.tasks, {
        title: "", description: "", category: categories[0].value,
        default_due_days: 0, requires_confirmation: false,
      }],
    });
  };

  const removeTask = (index) => {
    setForm({ ...form, tasks: form.tasks.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    if (!form.name) return;
    const cleanTasks = form.tasks.filter((t) => t.title);
    setSaving(true);
    try {
      await onSave({ ...form, tasks: cleanTasks });
      onClose();
    } catch (e) {
      // handled by parent
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !saving && onClose()}>
      <Card className="p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">
            {editTemplate ? `Edit ${isOffboarding ? "Offboarding" : "Onboarding"} Template` : `New ${isOffboarding ? "Offboarding" : "Onboarding"} Template`}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}><X className="w-4 h-4" /></Button>
        </div>
        <div className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Standard Onboarding" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Tasks ({form.tasks.length})</Label>
              <Button variant="ghost" size="sm" onClick={addTask} className="gap-1 text-xs">
                <Plus className="w-3.5 h-3.5" /> Add Task
              </Button>
            </div>
            {form.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No tasks yet. Click "Add Task" to create one.</p>
            ) : (
              <div className="space-y-2">
                {form.tasks.map((task, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Input
                        value={task.title}
                        onChange={(e) => updateTask(i, { title: e.target.value })}
                        placeholder="Task title"
                        className="flex-1"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeTask(i)} className="text-destructive shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={task.description || ""}
                      onChange={(e) => updateTask(i, { description: e.target.value })}
                      rows={1}
                      placeholder="Description (optional)"
                      className="text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <ResponsiveSelect
                        value={task.category}
                        onValueChange={(v) => updateTask(i, { category: v })}
                        placeholder="Select category"
                        options={categories}
                      />
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={task.default_due_days || 0}
                          onChange={(e) => updateTask(i, { default_due_days: parseInt(e.target.value) || 0 })}
                          className="w-20"
                        />
                        <span className="text-xs text-muted-foreground">days from start</span>
                      </div>
                    </div>
                    {isOffboarding && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={task.requires_confirmation || false}
                          onCheckedChange={(v) => updateTask(i, { requires_confirmation: v })}
                          id={`conf-${i}`}
                        />
                        <Label htmlFor={`conf-${i}`} className="text-sm font-normal cursor-pointer">Requires explicit confirmation</Label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.name} className="gap-1.5">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editTemplate ? "Save Changes" : "Create Template"}
          </Button>
        </div>
      </Card>
    </div>
  );
}