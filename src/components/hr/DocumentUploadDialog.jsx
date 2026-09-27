import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  validateFile, CONFIDENTIALITY_LEVELS, DOCUMENT_STATUSES,
} from "@/lib/hrDocuments";
import { base44 } from "@/api/base44Client";
import { Loader2, Upload, X, FileText } from "lucide-react";

export default function DocumentUploadDialog({
  open, onClose, onSave, documentTypes, editDoc, isDemo,
}) {
  const [form, setForm] = useState({
    title: "", description: "", document_type_id: "",
    issue_date: "", expiry_date: "", status: "current",
    confidentiality_level: "confidential", internal_notes: "",
    shared_with_employee: false,
  });
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) {
      setForm({
        title: editDoc?.title || "",
        description: editDoc?.description || "",
        document_type_id: editDoc?.document_type_id || "",
        issue_date: editDoc?.issue_date || "",
        expiry_date: editDoc?.expiry_date || "",
        status: editDoc?.status || "current",
        confidentiality_level: editDoc?.confidentiality_level || "confidential",
        internal_notes: editDoc?.internal_notes || "",
        shared_with_employee: editDoc?.shared_with_employee || false,
      });
      setFile(null);
      setFileError(null);
    }
  }, [open, editDoc]);

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
    if (!form.title) return;
    setSaving(true);
    try {
      let fileData = {};
      if (file && !isDemo) {
        setUploading(true);
        const result = await base44.integrations.Core.UploadPrivateFile({ file });
        setUploading(false);
        fileData = {
          file_uri: result.file_uri,
          file_name: file.name,
          file_size: file.size,
          file_content_type: file.type,
        };
      } else if (file && isDemo) {
        // In demo mode, store metadata only (no real file upload)
        fileData = {
          file_name: file.name,
          file_size: file.size,
          file_content_type: file.type,
        };
      }
      await onSave({ ...form, ...fileData });
      onClose();
    } catch (e) {
      setFileError(e.message);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !saving && onClose()}>
      <Card className="p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">{editDoc ? "Edit Document" : "Upload Document"}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}><X className="w-4 h-4" /></Button>
        </div>
        <div className="space-y-3">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Document title" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Document Type</Label>
            <Select value={form.document_type_id} onValueChange={(v) => setForm({ ...form, document_type_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {(documentTypes || []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Issue Date</Label>
              <Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Confidentiality</Label>
              <Select value={form.confidentiality_level} onValueChange={(v) => setForm({ ...form, confidentiality_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONFIDENTIALITY_LEVELS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {!editDoc?.file_uri && (
            <div>
              <Label>File {isDemo && <span className="text-xs text-muted-foreground">(demo mode — metadata only)</span>}</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                {file ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <FileText className="w-4 h-4 text-brand-teal shrink-0" />
                      <span className="truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setFile(null)} disabled={saving}><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Select a file to attach</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, images, documents · Max 10MB · No executables</p>
                    <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => fileRef.current?.click()}>Select File</Button>
                  </div>
                )}
              </div>
              {fileError && <p className="text-xs text-destructive mt-1">{fileError}</p>}
            </div>
          )}
          <div>
            <Label>Internal HR Notes</Label>
            <Textarea value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} rows={2} placeholder="Private notes for HR" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={form.shared_with_employee} onCheckedChange={(v) => setForm({ ...form, shared_with_employee: v })} id="shared" />
            <Label htmlFor="shared" className="text-sm font-normal cursor-pointer">Share with employee</Label>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || uploading || !form.title} className="gap-1.5">
            {(saving || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}
            {uploading ? "Uploading..." : editDoc ? "Save Changes" : "Upload Document"}
          </Button>
        </div>
      </Card>
    </div>
  );
}