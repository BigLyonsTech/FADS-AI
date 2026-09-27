import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, Lock, Loader2, FileText } from "lucide-react";
import { downloadSpreadsheet, exportFilename } from "@/lib/spreadsheetExport";
import { downloadStatementPdf } from "@/lib/statementPdf";
import { useToast } from "@/components/ui/use-toast";

// Download Statement — exports FADS-recorded financial activity as a
// "FADS Account Activity" PDF or spreadsheet. NOT an official bank statement.
// Reuses shared spreadsheetExport + a simple jspdf generator. Google Sheets
// is only offered when a genuine connection exists (none yet).
export default function DownloadStatementDialog({ open, onClose, accounts, transactions, org }) {
  const [accountId, setAccountId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setAccountId("");
      setDateFrom("");
      setDateTo("");
    }
  }, [open]);

  const filtered = transactions.filter((t) => {
    if (t.status === "cancelled") return false;
    if (accountId && t.account_id !== accountId) return false;
    if (dateFrom && (!t.date || t.date < dateFrom)) return false;
    if (dateTo && (!t.date || t.date > dateTo)) return false;
    return true;
  });

  const account = accounts.find((a) => a.id === accountId) || null;

  const handlePdf = () => {
    if (filtered.length === 0) {
      toast({ title: "No activity in this period.", description: "Try a wider date range or another account." });
      return;
    }
    setBusy(true);
    try {
      downloadStatementPdf({ org, account, dateFrom, dateTo, rows: filtered });
      toast({ title: "Statement downloaded.", description: `${filtered.length} transactions · FADS Account Activity (PDF)` });
      onClose();
    } catch (e) {
      toast({ title: "Couldn't create the PDF.", description: e?.message || "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleSpreadsheet = () => {
    if (filtered.length === 0) {
      toast({ title: "No activity in this period.", description: "Try a wider date range or another account." });
      return;
    }
    setBusy(true);
    try {
      const columns = [
        { key: "date", label: "Date" },
        { key: "description", label: "Description" },
        { key: "direction", label: "Type" },
        { key: "amount", label: "Amount" },
        { key: "category_name", label: "Category" },
        { key: "account_name", label: "Account" },
        { key: "reference", label: "Reference" },
      ];
      const rows = filtered.map((t) => ({
        ...t,
        category_name: t.category_name || "",
        account_name: (accounts.find((a) => a.id === t.account_id) || {}).name || "",
        direction: t.direction === "in" ? "Money In" : "Money Out",
      }));
      downloadSpreadsheet(rows, columns, exportFilename("Account-Activity", org?.name));
      toast({ title: "Statement downloaded.", description: `${filtered.length} transactions · Spreadsheet` });
      onClose();
    } catch (e) {
      toast({ title: "Couldn't create the spreadsheet.", description: e?.message || "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-teal" /> Download Statement
          </DialogTitle>
          <DialogDescription>
            Download a summary of financial activity recorded in FADS. This is a FADS Account Activity report, not an official bank-issued statement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-1 block">Account</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs mb-1 block">From</Label>
              <input
                type="date"
                className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">To</Label>
              <input
                type="date"
                className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {filtered.length} transaction{filtered.length === 1 ? "" : "s"} found in this period.
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full gap-2 h-11" onClick={handlePdf} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download PDF
          </Button>
          <Button variant="outline" className="w-full gap-2 h-11" onClick={handleSpreadsheet} disabled={busy}>
            <FileSpreadsheet className="w-4 h-4" /> Download Spreadsheet
          </Button>
          <Button variant="outline" className="w-full gap-2 h-11" disabled title="Connect Google Sheets in Settings first">
            <Lock className="w-4 h-4" /> Google Sheets (not connected)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}