import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Loader2 } from "lucide-react";

export default function JobRoleDialog({ open, onClose, onSave, jobRole, departments = [] }) {
  const [title, setTitle] = useState(jobRole?.title || "");
  const [description, setDescription] = useState(jobRole?.description || "");
  const [departmentId, setDepartmentId] = useState(jobRole?.department_id || "");
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    setTitle(jobRole?.title || "");
    setDescription(jobRole?.description || "");
    setDepartmentId(jobRole?.department_id || "");
  }, [jobRole, open]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        department_id: departmentId || null,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{jobRole ? "Edit Role" : "New Role"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sales Representative" />
          </div>
          <div>
            <Label>Default Department (optional)</Label>
            <ResponsiveSelect
              value={departmentId || ""}
              onValueChange={setDepartmentId}
              placeholder="None"
              options={[
                { value: "", label: "None" },
                ...departments.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handleSave} disabled={busy || !title.trim()}>
            {busy && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}