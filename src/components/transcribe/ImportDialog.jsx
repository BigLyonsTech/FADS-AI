import React, { useState, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Upload, FileText, Loader2 } from "lucide-react";
import { TRANSCRIBE_SESSION_TYPES, TRANSCRIBE_LANGUAGES } from "@/lib/transcribeConstants";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

// Dialog for importing a TXT transcript file. The file is uploaded as a
// private file (protected access) and the text is used to create a session.
export default function ImportDialog({ open, onClose, folders, onImport }) {
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [fileUri, setFileUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [meta, setMeta] = useState({
    title: "",
    session_type: "other",
    language: "en",
    folder_id: null,
    tags: [],
  });
  const fileInputRef = useRef(null);

  const reset = () => {
    setFile(null);
    setText("");
    setFileUri(null);
    setMeta({ title: "", session_type: "other", language: "en", folder_id: null, tags: [] });
  };

  const handleFileSelect = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".txt")) {
      toast({ title: "Please select a .txt file", variant: "destructive" });
      return;
    }
    setFile(selected);
    setMeta((m) => ({ ...m, title: m.title || selected.name.replace(/\.txt$/i, "") }));

    // Read text content
    const reader = new FileReader();
    reader.onload = (ev) => setText(ev.target.result);
    reader.readAsText(selected);

    // Upload as private file
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadPrivateFile({ file: selected });
      setFileUri(res.data.file_uri);
    } catch (err) {
      toast({ title: "File upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    if (!meta.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!text.trim()) {
      toast({ title: "File is empty", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      await onImport({
        ...meta,
        text,
        imported_file_uri: fileUri,
        imported_file_name: file?.name || null,
      });
      toast({ title: "Transcript imported" });
      reset();
      onClose();
    } catch (err) {
      toast({ title: err.response?.data?.error || "Import failed", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const update = (field, val) => setMeta((m) => ({ ...m, [field]: val }));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onClose(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import TXT Transcript</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Text file (.txt)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full mt-1 border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-muted transition-colors"
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-brand-teal" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              ) : uploading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                  <Upload className="w-5 h-5" />
                  <span>Click to select a .txt file</span>
                </div>
              )}
            </button>
          </div>

          <div>
            <Label htmlFor="import-title">Title *</Label>
            <Input
              id="import-title"
              value={meta.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Transcript title"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Session type</Label>
              <Select value={meta.session_type} onValueChange={(v) => update("session_type", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSCRIBE_SESSION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Language</Label>
              <Select value={meta.language} onValueChange={(v) => update("language", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSCRIBE_LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Folder (optional)</Label>
            <Select
              value={meta.folder_id || "none"}
              onValueChange={(v) => update("folder_id", v === "none" ? null : v)}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No folder</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">Cancel</Button>
          <Button
            onClick={handleImport}
            disabled={!text.trim() || !meta.title.trim() || uploading || importing}
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}