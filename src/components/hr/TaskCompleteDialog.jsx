import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { validateFile } from "@/lib/hrDocuments";
import { base44 } from "@/api/base44Client";
import { Loader2, X, Upload, FileText, AlertTriangle } from "lucide-react";

export default function TaskCompleteDialog({ open, onClose, onSave, task, isDemo }) {
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) {
      setEvidenceNotes("");
      setFile(null);
      setFileError(null);
      setConfirmed(false);
    }
  }, [open]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const check = validateFile(f.name, f.size);
    if (!check.valid) {
      setFileError(check.error);
      setFile(null);
      return;
    }
    setFileError(null);
    setFile(f);
  };

  const handleSave = async () => {
    if (task?.requires_confirmation && !confirmed) return;
    setSaving(true);
    try {
      let evidenceFileUri = null;
      if (file && !isDemo) {
        const result = await base44.integrations.Core.UploadPrivateFile({ file });
        evidenceFileUri = result.file_uri;
      }
      await onSave({
        is_completed: true,
        evidence_notes: evidenceNotes || null,
        evidence_file_uri: evidenceFileUri,
        confirmation_recorded: task?.requires_confirmation ? confirmed : false,
      });
      onClose();
    } catch (e) {
      setFileError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const canSave = !task?.requires_confirmation || confirmed;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !saving && onClose()}>
      <Card className="p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Complete Task</h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}><X className="w-4 h-4" /></Button>
        </div>
        <p className="text-sm font-medium mb-1">{task?.title}</p>
        {task?.description && <p className="text-sm text-muted-foreground mb-3">{task.description}</p>}
        <div className="space-y-3">
          {task?.requires_confirmation && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-status-warn shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Confirmation Required</p>
                <p className="text-xs text-amber-700 mt-0.5">This task requires explicit confirmation before it can be marked complete.</p>
                <div className="flex items-center gap-2 mt-2">
                  <Checkbox checked={confirmed} onCheckedChange={setConfirmed} id="task-conf" />
                  <Label htmlFor="task-conf" className="text-sm font-normal cursor-pointer">I confirm this action has been completed</Label>
                </div>
              </div>
            </div>
          )}
          <div>
            <Label>Evidence Notes</Label>
            <Textarea value={evidenceNotes} onChange={(e) => setEvidenceNotes(e.target.value)} rows={3} placeholder="Notes about how this task was completed..." />
          </div>
          <div>
            <Label>Supporting Evidence (optional)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-3 text-center">
              {file ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <FileText className="w-4 h-4 text-brand-teal shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setFile(null)} disabled={saving}><X className="w-4 h-4" /></Button>
                </div>
              ) : (
                <div>
                  <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                  <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Select File</Button>
                </div>
              )}
            </div>
            {fileError && <p className="text-xs text-destructive mt-1">{fileError}</p>}
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !canSave} className="gap-1.5">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Mark Complete
          </Button>
        </div>
      </Card>
    </div>
  );
}