import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, FileText, AlertTriangle, Copy, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";

const DOC_TYPES = [
  { value: "employment_letter", label: "Employment letter" },
  { value: "warning_letter", label: "Warning / disciplinary letter" },
  { value: "promotion_letter", label: "Promotion letter" },
  { value: "general_letter", label: "General HR letter" },
  { value: "performance_summary", label: "Performance summary" },
];

// AI HR document drafting dialog. Generates a DRAFT requiring human review.
// Reuses the existing assistant backend (draft_hr_document action). Respects
// HR access roles (enforced server-side).
export default function HrDocumentDialog({ open, onClose, orgId, employees = [] }) {
  const [docType, setDocType] = useState("employment_letter");
  const [employeeId, setEmployeeId] = useState("");
  const [context, setContext] = useState("");
  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const employee = employees.find((e) => e.id === employeeId) || null;

  const draftWithAI = async () => {
    if (!context.trim()) {
      setError("Provide some context or instructions for the document.");
      return;
    }
    setDrafting(true);
    setError("");
    setCopied(false);
    try {
      const res = await base44.functions.invoke("assistant", {
        action: "draft_hr_document",
        organisation_id: orgId,
        docType,
        employeeName: employee
          ? `${employee.first_name} ${employee.last_name || ""}`.trim()
          : "",
        jobTitle: employee?.job_role_id || "",
        context: context.trim(),
      });
      setDraft(res.document || "");
    } catch (e) {
      setError(e.message || "Unable to draft document.");
    } finally {
      setDrafting(false);
    }
  };

  const copyDraft = () => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-teal" /> Draft HR Document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Doc type */}
          <div className="space-y-1.5">
            <Label>Document type</Label>
            <div className="flex flex-wrap gap-1.5">
              {DOC_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setDocType(t.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border ${
                    docType === t.value
                      ? "bg-brand-navy text-white border-brand-navy"
                      : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Employee (optional) */}
          {employees.length > 0 && (
            <div>
              <Label className="mb-1.5 block">Employee (optional)</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="">— Select employee —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.first_name} {e.last_name || ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Context */}
          <div>
            <Label className="mb-1.5 block">Context / instructions</Label>
            <textarea
              className="w-full rounded-md border border-input bg-transparent p-3 text-sm min-h-20"
              placeholder="e.g. Sales Manager role, starting 1 Oct 2026, annual salary €45,000, 3 months probation…"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>

          <Button onClick={draftWithAI} disabled={drafting} className="w-full h-11">
            {drafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Draft with AI
          </Button>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {draft && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Draft — review before use</Label>
                <Button variant="outline" size="sm" className="h-8 gap-1" onClick={copyDraft}>
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                </Button>
              </div>
              <textarea
                className="w-full rounded-md border border-input bg-transparent p-3 text-sm min-h-48 font-mono"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <Badge variant="outline" className="text-xs text-status-warn border-status-warn/30">
                Draft — requires human review. Not legal advice.
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}