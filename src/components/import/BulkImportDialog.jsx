import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Upload, Download, Check, AlertTriangle, Loader2, ArrowRight, Users,
  FileSpreadsheet,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  IMPORT_CONFIGS, parseCSV, autoMatchColumns, validateRow,
  checkDuplicate, normalizeFieldValue, generateTemplateCSV, downloadCSV,
} from "@/lib/importUtils";
import { getCrmConfig } from "@/lib/crmWording";

// Reusable multi-step bulk import dialog. Works for CRM contacts and HR staff.
// Flow: Upload → Map Columns (CSV) → Preview → Confirm → Import → Complete.
// Never writes to the database without user confirmation. Respects Demo/Live
// separation — imported records use the org's current data_mode.
export default function BulkImportDialog({
  open, onClose, importType, orgId, orgType, orgName, dataMode,
  existingRecords = [], onComplete,
}) {
  const config = IMPORT_CONFIGS[importType];
  const { toast } = useToast();
  const fileRef = useRef(null);

  const [step, setStep] = useState("upload");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [defaultContactType, setDefaultContactType] = useState("");
  const [previewRows, setPreviewRows] = useState([]);
  const [dupInfo, setDupInfo] = useState({});
  const [errInfo, setErrInfo] = useState({});
  const [duplicateAction, setDuplicateAction] = useState("skip");
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep("source");
      setParsing(false);
      setParseError("");
      setHeaders([]);
      setRawRows([]);
      setMapping({});
      setPreviewRows([]);
      setDupInfo({});
      setErrInfo({});
      setSummary(null);
      setDuplicateAction("skip");
      if (importType === "crm") {
        const def = orgType === "church" ? "member"
          : orgType === "school" ? "parent"
          : orgType === "university" ? "student"
          : "customer";
        setDefaultContactType(def);
      }
    }
  }, [open, importType, orgType]);

  // Run duplicate check + validation on preview rows
  const runChecks = (rows) => {
    const dups = {};
    const errs = {};
    rows.forEach((row, i) => {
      const e = validateRow(row, config);
      if (e.length) errs[i] = e;
      const d = checkDuplicate(row, existingRecords, config.duplicateKeys);
      if (d.isDup) dups[i] = d;
    });
    setDupInfo(dups);
    setErrInfo(errs);
  };

  // Handle file selection
  const handleFile = async (file) => {
    if (!file) return;
    setParsing(true);
    setParseError("");
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      if (ext === "csv") {
        const text = await file.text();
        const { headers: hdrs, rows } = parseCSV(text);
        if (!hdrs.length || !rows.length) {
          setParseError("No data found in the CSV file.");
          setParsing(false);
          return;
        }
        setHeaders(hdrs);
        setRawRows(rows);
        setMapping(autoMatchColumns(hdrs, config.fields.map((f) => f.key)));
        setStep("mapping");
      } else if (ext === "xlsx" || ext === "xls") {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const schema = {
          type: "object",
          properties: {
            rows: {
              type: "array",
              items: {
                type: "object",
                properties: Object.fromEntries(
                  config.fields.map((f) => [f.key, { type: "string" }])
                ),
              },
            },
          },
        };
        const res = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: schema,
        });
        const extracted = res.output?.rows || (Array.isArray(res.output) ? res.output : []);
        if (!extracted.length) {
          setParseError("No data could be extracted from the file.");
          setParsing(false);
          return;
        }
        // Normalize field values
        const normalized = extracted.map((r) => {
          const obj = {};
          for (const f of config.fields) {
            obj[f.key] = normalizeFieldValue(f.key, r[f.key] || "");
          }
          if (importType === "crm" && !obj.contact_type && defaultContactType) {
            obj.contact_type = defaultContactType;
          }
          return obj;
        });
        setPreviewRows(normalized);
        runChecks(normalized);
        setStep("preview");
      } else {
        setParseError("Please upload a CSV or XLSX file.");
      }
    } catch (e) {
      setParseError(e.message || "Failed to read the file.");
    } finally {
      setParsing(false);
    }
  };

  // Apply CSV column mapping and go to preview
  const applyMapping = () => {
    const mapped = rawRows.map((row) => {
      const obj = {};
      for (const f of config.fields) {
        const colIdx = mapping[f.key];
        obj[f.key] = colIdx != null ? normalizeFieldValue(f.key, row[colIdx] || "") : "";
      }
      if (importType === "crm" && !obj.contact_type && defaultContactType) {
        obj.contact_type = defaultContactType;
      }
      return obj;
    });
    setPreviewRows(mapped);
    runChecks(mapped);
    setStep("preview");
  };

  // Handle import
  const handleImport = async () => {
    setImporting(true);
    setStep("importing");
    try {
      const newRows = [];
      const dupRows = [];
      previewRows.forEach((row, i) => {
        if (errInfo[i]) return;
        if (dupInfo[i]) { dupRows.push({ row, existing: dupInfo[i].existing }); return; }
        newRows.push(row);
      });

      let added = 0, updated = 0, skipped = 0, errors = Object.keys(errInfo).length;

      if (importType === "crm") {
        if (newRows.length) {
          const records = newRows.map((r) => ({
            organisation_id: orgId,
            first_name: r.first_name?.trim(),
            last_name: r.last_name?.trim() || null,
            email: r.email?.trim() || null,
            phone: r.phone?.trim() || null,
            contact_type: r.contact_type || defaultContactType,
            status: r.status || "new",
            address: r.address || null,
            notes: r.notes || null,
            organisation_name: r.organisation_name || null,
            source: r.source || null,
            data_mode: dataMode,
          }));
          const created = await base44.entities.CRMContact.bulkCreate(records);
          added = Array.isArray(created) ? created.length : newRows.length;
          // Create pipeline entries for lead-type contacts so they appear
          // in the existing Pipeline board automatically.
          if (Array.isArray(created) && created.length > 0) {
            const leadTypes = ["lead", "prospect", "enquiry", "prospective_family", "applicant", "prospective_student"];
            const leadsToCreate = [];
            created.forEach((contact, i) => {
              const row = newRows[i];
              const type = row.contact_type || defaultContactType;
              if (leadTypes.includes(type)) {
                leadsToCreate.push({
                  organisation_id: orgId,
                  title: `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Imported lead",
                  contact_id: contact.id,
                  contact_name: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
                  stage: row.stage || "New",
                  value: 0,
                  source: row.source || "Import",
                  data_mode: dataMode,
                });
              }
            });
            if (leadsToCreate.length) {
              await base44.entities.CRMLead.bulkCreate(leadsToCreate);
            }
          }
        }
        if (duplicateAction === "update") {
          for (const { row, existing } of dupRows) {
            await base44.entities.CRMContact.update(existing.id, {
              first_name: row.first_name?.trim() || existing.first_name,
              last_name: row.last_name?.trim() || existing.last_name,
              email: row.email?.trim() || existing.email,
              phone: row.phone?.trim() || existing.phone,
              address: row.address || existing.address,
              notes: row.notes || existing.notes,
              organisation_name: row.organisation_name || existing.organisation_name,
            });
            updated++;
          }
        } else {
          skipped = dupRows.length;
        }
      } else {
        const res = await base44.functions.invoke("hr", {
          action: "bulk_import",
          organisation_id: orgId,
          employees: newRows,
          duplicate_action: duplicateAction,
          duplicates: dupRows.map((d) => ({ ...d.row, existing_id: d.existing.id })),
        });
        added = res.added || 0;
        updated = res.updated || 0;
        skipped = res.skipped || 0;
        if (res.errors?.length) errors += res.errors.length;
      }

      setSummary({ added, updated, skipped, errors, total: previewRows.length });
      setStep("complete");
      if (onComplete) onComplete();
    } catch (e) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
      setStep("preview");
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadCSV(`${config.label}-import-template.csv`, generateTemplateCSV(config));
  };

  const counts = useMemo(() => {
    let n = 0, d = 0, e = 0;
    previewRows.forEach((_, i) => {
      if (errInfo[i]) e++;
      else if (dupInfo[i]) d++;
      else n++;
    });
    return { n, d, e };
  }, [previewRows, errInfo, dupInfo]);

  const crmContactTypes = importType === "crm"
    ? (getCrmConfig({ type: orgType })?.contactTypes || [])
    : [];

  const canImport = counts.n > 0 || (duplicateAction === "update" && counts.d > 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !importing) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-brand-teal" /> Bring Data Into FADS
          </DialogTitle>
        </DialogHeader>

        {/* Step 0: Source */}
        {step === "source" && (
          <div className="space-y-4">
            {importType === "crm" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">What does your spreadsheet contain?</Label>
                <select
                  className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={defaultContactType}
                  onChange={(e) => setDefaultContactType(e.target.value)}
                >
                  {crmContactTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm font-medium">How do you want to bring it in?</Label>
              <button
                className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-border hover:border-brand-teal hover:bg-brand-teal/5 transition-colors text-left min-h-touch"
                onClick={() => setStep("upload")}
              >
                <Upload className="w-6 h-6 text-brand-teal" />
                <div>
                  <p className="text-sm font-medium">Upload Spreadsheet</p>
                  <p className="text-xs text-muted-foreground">CSV or Excel file from your device</p>
                </div>
              </button>
              <button
                className="w-full flex items-center gap-3 p-4 rounded-lg border border-border opacity-50 cursor-not-allowed text-left min-h-touch"
                disabled
                title="Connect Google Sheets in Settings first"
              >
                <FileSpreadsheet className="w-6 h-6 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Connect Google Sheet</p>
                  <p className="text-xs text-muted-foreground">Not connected yet</p>
                </div>
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>Importing into: <strong>{orgName}</strong> ({dataMode === "demo" ? "Demo" : "Live"} mode)</p>
            </div>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center space-y-3">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                Upload a CSV or Excel file to bring into FADS.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <Button
                variant="outline"
                className="h-11"
                onClick={() => fileRef.current?.click()}
                disabled={parsing}
              >
                {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {parsing ? "Reading file…" : "Choose file"}
              </Button>
            </div>
            <Button
              variant="ghost"
              className="h-9 gap-1.5"
              onClick={handleDownloadTemplate}
            >
              <Download className="w-4 h-4" /> Download {config.label} import template
            </Button>
            {parseError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {parseError}
              </div>
            )}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• CSV files are parsed on your device. XLSX files use AI extraction.</p>
              <p>• You'll see a preview and can adjust column mapping before anything is saved.</p>
            </div>
            <Button variant="outline" className="h-9" onClick={() => setStep("source")}>
              Back
            </Button>
          </div>
        )}

        {/* Step 2: Mapping (CSV only) */}
        {step === "mapping" && (
          <div className="space-y-4">
            <p className="text-sm font-medium">FADS found these columns</p>
            <p className="text-xs text-muted-foreground">
              Check everything looks right — we've matched your spreadsheet headings to FADS fields. Adjust if needed.
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {config.fields.map((f) => (
                <div key={f.key} className="flex items-center gap-3">
                  <div className="w-40 shrink-0">
                    <Label className="text-xs">
                      {f.label}{f.required && <span className="text-destructive"> *</span>}
                    </Label>
                  </div>
                  <select
                    className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={mapping[f.key] ?? ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? undefined : parseInt(e.target.value);
                      setMapping((m) => {
                        const next = { ...m };
                        if (val === undefined) delete next[f.key];
                        else next[f.key] = val;
                        return next;
                      });
                    }}
                  >
                    <option value="">— Skip —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {importType === "crm" && (
              <div className="flex items-center gap-3 pt-2 border-t">
                <div className="w-40 shrink-0">
                  <Label className="text-xs">Default Type</Label>
                </div>
                <select
                  className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={defaultContactType}
                  onChange={(e) => setDefaultContactType(e.target.value)}
                >
                  {crmContactTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="h-11" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button className="h-11 flex-1 gap-1.5" onClick={applyMapping}>
                Preview <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-status-ok" />
                <span><strong>Ready to import:</strong> {counts.n}</span>
              </div>
              {counts.d > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-status-warn" />
                  <span><strong>Possible duplicates:</strong> {counts.d}</span>
                </div>
              )}
              {counts.e > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-status-bad" />
                  <span><strong>Missing information:</strong> {counts.e}</span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-brand-navy text-white text-sm">
              You are importing {previewRows.length} {config.label} into:{" "}
              <strong>{orgName}</strong> ({dataMode === "demo" ? "Demo" : "Live"} mode)
            </div>

            {counts.d > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-xs">Duplicates:</Label>
                <select
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={duplicateAction}
                  onChange={(e) => setDuplicateAction(e.target.value)}
                >
                  <option value="skip">Keep Existing (skip)</option>
                  <option value="update">Update Existing</option>
                </select>
              </div>
            )}

            <div className="overflow-x-auto max-h-64 overflow-y-auto border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">#</th>
                    <th className="text-left p-2 font-medium">Status</th>
                    {config.fields.slice(0, 5).map((f) => (
                      <th key={f.key} className="text-left p-2 font-medium">{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 100).map((row, i) => {
                    const isErr = !!errInfo[i];
                    const isDup = !!dupInfo[i];
                    return (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-2 text-muted-foreground">{i + 1}</td>
                        <td className="p-2">
                          {isErr ? (
                            <Badge className="bg-status-bad/15 text-status-bad text-xs">Error</Badge>
                          ) : isDup ? (
                            <Badge className="bg-status-warn/15 text-status-warn text-xs">Duplicate</Badge>
                          ) : (
                            <Badge className="bg-status-ok/15 text-status-ok text-xs">New</Badge>
                          )}
                        </td>
                        {config.fields.slice(0, 5).map((f) => (
                          <td key={f.key} className="p-2 truncate max-w-32">
                            {row[f.key] || "—"}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {previewRows.length > 100 && (
              <p className="text-xs text-muted-foreground">
                Showing first 100 of {previewRows.length} rows.
              </p>
            )}
            {counts.e > 0 && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                <strong>{counts.e} rows have errors</strong> and will be skipped.
                Fix these in your file and re-upload, or continue without them.
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-11"
                onClick={() => setStep(rawRows.length ? "mapping" : "upload")}
              >
                Back
              </Button>
              <Button
                className="h-11 flex-1 gap-1.5"
                onClick={handleImport}
                disabled={!canImport}
              >
                <Check className="w-4 h-4" /> Bring {counts.n + (duplicateAction === "update" ? counts.d : 0)} {importType === "crm" ? "people" : "staff"} into FADS
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === "importing" && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-brand-teal mx-auto" />
            <p className="text-sm text-muted-foreground">Importing {config.label}…</p>
          </div>
        )}

        {/* Step 5: Complete */}
        {step === "complete" && summary && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-status-ok/15 flex items-center justify-center mx-auto mb-3">
                <Check className="w-7 h-7 text-status-ok" />
              </div>
              <h3 className="text-lg font-bold">Done!</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-status-ok/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-status-ok">{summary.added}</p>
                <p className="text-xs text-muted-foreground">Brought into FADS</p>
              </div>
              <div className="bg-status-warn/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-status-warn">{summary.skipped}</p>
                <p className="text-xs text-muted-foreground">Kept existing</p>
              </div>
              {summary.updated > 0 && (
                <div className="bg-brand-teal/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-brand-teal">{summary.updated}</p>
                  <p className="text-xs text-muted-foreground">Records updated</p>
                </div>
              )}
              {summary.errors > 0 && (
                <div className="bg-status-bad/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-status-bad">{summary.errors}</p>
                  <p className="text-xs text-muted-foreground">Needs review</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-11 flex-1 gap-1.5"
                onClick={() => {
                  if (importType === "crm") window.location.assign("/crm/contacts");
                  else window.location.assign("/hr/employees");
                }}
              >
                <Users className="w-4 h-4" /> Go to {importType === "crm" ? "People & Contacts" : "Staff"}
              </Button>
              <Button className="h-11 flex-1" onClick={onClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}