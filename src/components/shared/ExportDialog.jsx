import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Lock, Loader2 } from "lucide-react";

/**
 * Shared export dialog for CRM and HR.
 * Flow: Export → What do you want? → Download Spreadsheet / Google Sheets
 *
 * Props:
 * - open, onClose: dialog state
 * - title: e.g. "Export Contacts"
 * - options: [{ key, label, count }] — export targets with live counts
 * - onExport: async (optionKey, format) => void — format is "csv" or "google_sheets"
 * - googleSheetsAvailable: boolean — only true when a genuine Google Sheets connection exists
 */
export default function ExportDialog({
  open, onClose, title, options, onExport, googleSheetsAvailable = false,
}) {
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setSelected(options.find((o) => o.count > 0)?.key || options[0]?.key || "");
  }, [open, options]);

  const handleDownload = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await onExport(selected, "csv");
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSheets = async () => {
    if (!selected || !googleSheetsAvailable) return;
    setBusy(true);
    try {
      await onExport(selected, "google_sheets");
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const selectedOption = options.find((o) => o.key === selected);
  const count = selectedOption?.count ?? 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-brand-teal" />
            {title}
          </DialogTitle>
          <DialogDescription>Choose what you'd like to export.</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-1 max-h-[50vh] overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSelected(opt.key)}
              disabled={opt.count === 0}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between min-h-touch border transition-colors ${
                selected === opt.key
                  ? "border-brand-teal bg-brand-teal/5"
                  : "border-border hover:bg-accent"
              } ${opt.count === 0 ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <span>{opt.label}</span>
              <span className="text-xs font-medium text-muted-foreground">{opt.count}</span>
            </button>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full gap-2"
            onClick={handleDownload}
            disabled={busy || count === 0}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download Spreadsheet{count > 0 ? ` (${count})` : ""}
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogleSheets}
            disabled={busy || count === 0 || !googleSheetsAvailable}
            title={googleSheetsAvailable ? "Export to Google Sheets" : "Connect Google Sheets in Settings first"}
          >
            {googleSheetsAvailable ? <FileSpreadsheet className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {googleSheetsAvailable ? "Send to Google Sheets" : "Google Sheets (not connected)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}