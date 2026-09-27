import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useFinance } from "@/lib/useFinance";
import { canManageFinance, formatMoney } from "@/lib/financeWording";
import BackToFinance from "@/components/finance/BackToFinance";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Upload, AlertCircle, CheckCircle2, Copy, ArrowLeft, RefreshCw } from "lucide-react";

const FIELDS = [
  { key: "date", label: "Date", required: true },
  { key: "description", label: "Description", required: false },
  { key: "reference", label: "Reference", required: false },
  { key: "amount_in", label: "Money In", required: false },
  { key: "amount_out", label: "Money Out", required: false },
  { key: "balance", label: "Balance", required: false },
];

export default function ReconciliationNew() {
  const { activeOrg, activeRole } = useWorkspace();
  const fin = useFinance();
  const canManage = canManageFinance(activeRole);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState("details"); // details | preview
  const [accountId, setAccountId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingBalance, setClosingBalance] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [error, setError] = useState(null);

  const accounts = fin.accounts.filter((a) => a.is_active !== false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(result.file_url);
      setFileName(file.name);
    } catch (e) {
      setError("Failed to upload file: " + (e.message || ""));
    } finally {
      setUploading(false);
    }
  };

  const doPreview = async (customMapping) => {
    if (!fileUrl) return;
    setPreviewing(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("reconciliation", {
        action: "preview_csv",
        organisation_id: activeOrg.id,
        file_url: fileUrl,
        column_mapping: customMapping || undefined,
      });
      const data = res.data;
      setPreview(data);
      setMapping(data.detected_mapping || {});
      setStep("preview");
    } catch (e) {
      setError(e.response?.data?.error || e.data?.error || e.message || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("reconciliation", {
        action: "import_statement",
        organisation_id: activeOrg.id,
        file_url: fileUrl,
        column_mapping: mapping,
        account_id: accountId,
        period_start: periodStart,
        period_end: periodEnd,
        opening_balance: Number(openingBalance) || 0,
        closing_balance: Number(closingBalance) || 0,
        skip_duplicates: skipDuplicates,
      });
      toast({ title: "Statement imported", description: `${res.data.imported_count} lines imported` });
      navigate(`/finance/reconciliation/${res.data.id}`);
    } catch (e) {
      setError(e.response?.data?.error || e.data?.error || e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  if (!canManage) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <BackToFinance />
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">You do not have permission to create reconciliations.</p>
        </div>
      </div>
    );
  }

  if (fin.loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  }

  if (accounts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <BackToFinance />
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Create a finance account first before reconciling.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <BackToFinance />
      <div className="flex items-center gap-2">
        {step === "preview" && (
          <Button variant="ghost" size="icon" onClick={() => setStep("details")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <h1 className="text-2xl font-bold text-brand-navy">New Reconciliation</h1>
      </div>

      {error && (
        <div className="bg-status-bad/10 border border-status-bad/30 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-status-bad shrink-0 mt-0.5" />
          <p className="text-sm text-status-bad">{error}</p>
        </div>
      )}

      {step === "details" && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="space-y-2">
            <Label>Account to reconcile</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name} ({a.account_type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Period start</Label>
              <Input type="date" className="h-11" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Period end</Label>
              <Input type="date" className="h-11" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Opening balance ({activeOrg?.currency})</Label>
              <Input type="number" step="0.01" className="h-11" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Closing balance ({activeOrg?.currency})</Label>
              <Input type="number" step="0.01" className="h-11" value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Statement CSV file</Label>
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
              <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" id="csv-upload" />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-brand-navy">
                  {uploading ? "Uploading…" : fileName || "Click to select a CSV file"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Bank or cash statement export</p>
              </label>
            </div>
          </div>

          <Button
            className="w-full h-12"
            disabled={!accountId || !periodStart || !periodEnd || !fileUrl || previewing}
            onClick={() => doPreview()}
          >
            {previewing ? "Previewing…" : "Preview Statement"}
          </Button>
        </div>
      )}

      {step === "preview" && preview && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card rounded-xl border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">Valid rows</p>
              <p className="text-lg font-bold text-status-ok">{preview.valid_rows}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">Invalid</p>
              <p className="text-lg font-bold text-status-bad">{preview.invalid_rows}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">Duplicates</p>
              <p className="text-lg font-bold text-status-warn">{preview.duplicate_rows}</p>
            </div>
          </div>

          {/* Column mapping */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Copy className="w-4 h-4 text-brand-teal" />
              <h2 className="font-semibold text-brand-navy text-sm">Column Mapping</h2>
            </div>
            <p className="text-xs text-muted-foreground">Map your CSV columns to the matching fields.</p>
            <div className="space-y-2">
              {FIELDS.map((f) => (
                <div key={f.key} className="flex items-center gap-3">
                  <div className="w-28 shrink-0">
                    <Label className="text-xs">
                      {f.label}{f.required && <span className="text-status-bad"> *</span>}
                    </Label>
                  </div>
                  <Select
                    value={String(mapping[f.key] ?? "")}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === "__none" ? undefined : parseInt(v, 10) }))}
                  >
                    <SelectTrigger className="h-10 flex-1">
                      <SelectValue placeholder="— Not mapped —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— Not mapped —</SelectItem>
                      {preview.headers.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>{h || `Column ${i + 1}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => doPreview(mapping)} disabled={previewing}>
              <RefreshCw className="w-3 h-3" /> {previewing ? "Re-previewing…" : "Re-preview with mapping"}
            </Button>
          </div>

          {/* Preview table */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <h2 className="font-semibold text-brand-navy text-sm">Preview ({preview.preview.length} rows)</h2>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-xs min-w-[600px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 pr-2">Date</th>
                    <th className="py-2 pr-2">Description</th>
                    <th className="py-2 pr-2 text-right">In</th>
                    <th className="py-2 pr-2 text-right">Out</th>
                    <th className="py-2 pr-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.slice(0, 20).map((row) => (
                    <tr key={row.row_index} className="border-b border-border/50">
                      <td className="py-2 pr-2 text-muted-foreground">{row.row_index}</td>
                      <td className="py-2 pr-2 whitespace-nowrap">{row.date || <span className="text-status-bad">Invalid</span>}</td>
                      <td className="py-2 pr-2 max-w-[180px] truncate">{row.description}</td>
                      <td className="py-2 pr-2 text-right text-status-ok">{row.amount_in > 0 ? formatMoney(row.amount_in, activeOrg?.currency) : ""}</td>
                      <td className="py-2 pr-2 text-right text-status-bad">{row.amount_out > 0 ? formatMoney(row.amount_out, activeOrg?.currency) : ""}</td>
                      <td className="py-2 pr-2">
                        {!row.valid && <span className="text-status-bad">Invalid</span>}
                        {row.valid && row.is_duplicate && <span className="text-status-warn">Duplicate</span>}
                        {row.valid && !row.is_duplicate && <CheckCircle2 className="w-3.5 h-3.5 text-status-ok" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.preview.length > 20 && (
              <p className="text-xs text-muted-foreground text-center">Showing first 20 of {preview.preview.length} rows</p>
            )}
          </div>

          {/* Import options */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Skip duplicate rows ({preview.duplicate_rows} detected)</span>
            </label>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• {preview.valid_rows - (skipDuplicates ? preview.duplicate_rows : 0)} rows will be imported</p>
              {preview.invalid_rows > 0 && <p className="text-status-bad">• {preview.invalid_rows} invalid rows will be skipped (missing date or amount)</p>}
            </div>
          </div>

          <Button
            className="w-full h-12"
            disabled={importing || preview.valid_rows === 0}
            onClick={handleImport}
          >
            {importing ? "Importing…" : `Import ${preview.valid_rows - (skipDuplicates ? preview.duplicate_rows : 0)} Statement Lines`}
          </Button>
        </div>
      )}
    </div>
  );
}