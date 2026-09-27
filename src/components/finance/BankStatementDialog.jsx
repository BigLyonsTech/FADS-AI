import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload, FileUp, Sparkles, Check, AlertTriangle, Landmark,
  Bot, ChevronRight, RotateCcw, CheckCircle2,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useFinance } from "@/lib/useFinance";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";
import { useToast } from "@/components/ui/use-toast";
import { formatMoney } from "@/lib/financeWording";
import { parseXlsxRows } from "@/lib/bankStatementFileParser";
import FadsRobotLoader from "@/components/FadsRobotLoader";
import AccountDialog from "@/components/finance/AccountDialog";

// AI Bank Statement reader. Upload a PDF/CSV/XLSX statement, FADS extracts
// the rows, matches them against existing Finance transactions, and shows a
// review screen. Nothing is created until the owner approves each row.
// Reuses: bankStatement parse function, finance create_transaction, UploadFile.
// Preserves: Demo/Live separation (data_mode), existing Finance architecture.
const STEPS = { upload: "upload", reviewing: "reviewing", summary: "summary", review: "review", committing: "committing", done: "done" };

const CLASS_BADGE = {
  matched: { label: "Matched", className: "bg-status-ok/15 text-status-ok border-status-ok/30" },
  possible_match: { label: "Possible Match", className: "bg-status-warn/15 text-status-warn border-status-warn/30" },
  new: { label: "New", className: "bg-brand-teal/10 text-brand-teal border-brand-teal/30" },
  possible_duplicate: { label: "Possible Duplicate", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

const STATEMENT_ACCOUNT_TYPES = new Set(["bank", "cash", "savings", "mobile_money", "petty_cash"]);

function statementRowImportKey(statementName, accountId, row) {
  const value = [
    statementName,
    accountId,
    row.key,
    row.date,
    row.direction,
    row.amount,
    row.reference || "",
    row.description || "",
  ].join("|").toLowerCase();
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `v1-${(hash >>> 0).toString(16)}`;
}

export default function BankStatementDialog({ open, onClose, onSaved }) {
  const { activeOrg } = useWorkspace();
  const { dataMode } = useDataMode();
  const fin = useFinance();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const commitInFlightRef = useRef(false);
  const isDemo = dataMode === "demo";

  const [step, setStep] = useState(STEPS.upload);
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [fileName, setFileName] = useState("");
  const [commitProgress, setCommitProgress] = useState({ done: 0, total: 0 });
  const [addedCount, setAddedCount] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);

  const statementAccounts = fin.accounts.filter(
    (account) =>
      account.is_active !== false &&
      STATEMENT_ACCOUNT_TYPES.has(account.account_type) &&
      (!account.account_class || account.account_class === "asset")
  );

  useEffect(() => {
    setSelectedAccountId((current) => {
      if (statementAccounts.some((account) => account.id === current)) return current;
      return (
        statementAccounts.find((account) => account.account_type === "bank")?.id ||
        statementAccounts.find((account) => account.account_type === "cash")?.id ||
        statementAccounts[0]?.id ||
        ""
      );
    });
  }, [activeOrg?.id, dataMode, fin.accounts]);

  const reset = () => {
    setStep(STEPS.upload);
    setFile(null);
    setRows([]);
    setSummary(null);
    setError("");
    setFileName("");
    setAddedCount(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const close = () => { reset(); onClose(); };

  const expenseCategories = (fin.categories || []).filter((c) => c.kind === "expense");
  const incomeCategories = (fin.categories || []).filter((c) => c.kind === "income");

  const handleFile = async (f) => {
    if (!f) return;
    let failureStage = "prepare";
    const okTypes = ["pdf", "csv", "xls", "xlsx", "txt"];
    const okMimeTypes = [
      "application/pdf",
      "text/csv",
      "text/plain",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    const mime = String(f.type || "").toLowerCase();
    if (!okTypes.includes(ext) && !okMimeTypes.includes(mime)) {
      setError("Please upload a PDF, CSV, or Excel (.xls/.xlsx) file.");
      return;
    }
    setError("");
    setFile(f);
    setFileName(f.name);
    setParsing(true);
    setStep(STEPS.reviewing);
    try {
      let fileUrl;
      let csvText;
      let structuredRows;

      if (ext === "csv" || ext === "txt") {
        csvText = await f.text();
      } else if (ext === "xlsx") {
        structuredRows = await parseXlsxRows(f);
      } else {
        failureStage = "upload";
        const uploaded = await base44.integrations.Core.UploadFile({ file: f });
        fileUrl = uploaded.file_url;
      }

      failureStage = "parse";
      const res = await base44.functions.invoke("bankStatement", {
        action: "parse_statement",
        organisation_id: activeOrg.id,
        data_mode: dataMode,
        file_url: fileUrl,
        file_name: f.name,
        mime_type: f.type || "",
        csv_text: csvText,
        structured_rows: structuredRows,
      });
      const data = res?.data ?? res;
      if (data?.error) throw new Error(data.error);
      if (!data?.rows || data.rows.length === 0) {
        throw new Error("FADS couldn't find any transactions in this file. Try a different file or format.");
      }
      // attach editable flags
      setRows(data.rows.map((r) => ({ ...r, accepted: r.classification !== "matched" && r.classification !== "possible_duplicate" })));
      setSummary(data.summary);
      setStep(STEPS.summary);
    } catch (e) {
      const responseData = e?.data || e?.response?.data || {};
      const status = e?.status || e?.response?.status || null;
      const safeMessage =
        responseData.error ||
        responseData.message ||
        responseData.detail ||
        e?.message ||
        "FADS couldn't read this statement. Please try another file.";

      if (status === 429 || /rate limit/i.test(safeMessage)) {
        const stageLabel =
          failureStage === "upload"
            ? "File upload"
            : failureStage === "parse"
              ? "Statement processing"
              : "Statement preparation";
        setError(`${stageLabel}: ${safeMessage}`);
      } else {
        setError(safeMessage);
      }
      setStep(STEPS.upload);
    } finally {
      setParsing(false);
    }
  };

  const handleDemoSample = () => {
    setError("");
    setFileName("Sample-Bank-Statement.csv");
    setParsing(true);
    setStep(STEPS.reviewing);
    setTimeout(() => {
      const today = new Date();
      const d = (offset) => {
        const dt = new Date(today);
        dt.setDate(dt.getDate() - offset);
        return dt.toISOString().slice(0, 10);
      };
      const sample = [
        { date: d(2), description: "Canva", money_in: 0, money_out: 18500, suggested_category: "Software" },
        { date: d(4), description: "Customer Payment — Ade Ltd", money_in: 250000, money_out: 0, suggested_category: "Sales" },
        { date: d(5), description: "Shop Rent", money_in: 0, money_out: 120000, suggested_category: "Rent" },
        { date: d(7), description: "Mobile Data Recharge", money_in: 0, money_out: 5000, suggested_category: "" },
        { date: d(8), description: "Customer Payment — Ade Ltd", money_in: 250000, money_out: 0, suggested_category: "Sales" },
        { date: d(9), description: "Petty Purchase — Tea", money_in: 0, money_out: 1500, suggested_category: "" },
      ];
      const parsed = sample.map((p, i) => {
        const direction = p.money_in > 0 ? "in" : "out";
        const amount = p.money_in > 0 ? p.money_in : p.money_out;
        const cat = [...expenseCategories, ...incomeCategories].find(
          (c) => c.name.toLowerCase() === (p.suggested_category || "").toLowerCase()
        );
        return {
          key: String(i),
          date: p.date,
          description: p.description,
          reference: "",
          amount,
          direction,
          running_balance: null,
          suggested_category: p.suggested_category,
          category_id: cat?.id || "",
          classification: "new",
          matched_txn_id: null,
          accepted: true,
          _demo: true,
        };
      });
      // mark the duplicate Ade payment
      parsed[4].classification = "possible_duplicate";
      parsed[4].accepted = false;
      setRows(parsed);
      setSummary({
        found: parsed.length,
        matched: 0,
        possible_match: 0,
        new: 4,
        duplicates: 1,
        need_category: 2,
      });
      setParsing(false);
      setStep(STEPS.summary);
    }, 1000);
  };

  const updateRow = (key, patch) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const acceptAll = () => {
    setRows((prev) =>
      prev.map((r) =>
        r.classification === "matched" || r.classification === "possible_duplicate"
          ? r
          : { ...r, accepted: true }
      )
    );
    toast({ title: "FADS' suggestions accepted", description: "Review each row before approving." });
  };

  const commit = async () => {
    if (commitInFlightRef.current) return;
    const toAdd = rows.filter((r) => r.accepted && r.classification !== "matched");
    if (toAdd.length === 0) {
      toast({ title: "Nothing selected", description: "Select at least one statement row to add." });
      return;
    }
    commitInFlightRef.current = true;
    setError("");

    let account;
    try {
      const resolutionResponse = await base44.functions.invoke("finance", {
        action: "resolve_statement_account",
        organisation_id: activeOrg.id,
        data_mode: dataMode,
        preferred_account_id: selectedAccountId || null,
      });
      const resolution = resolutionResponse?.data ?? resolutionResponse;
      account = resolution?.account;
      if (!account?.id) throw new Error("Select or create a Finance account before approving this statement.");
      setSelectedAccountId(account.id);
    } catch (accountError) {
      const responseData = accountError?.data || accountError?.response?.data || {};
      await fin.reload();
      setError(
        responseData.error ||
        responseData.message ||
        accountError?.message ||
        "Select or create a Finance account before approving this statement."
      );
      commitInFlightRef.current = false;
      return;
    }

    setStep(STEPS.committing);
    setCommitProgress({ done: 0, total: toAdd.length });
    let added = 0;
    let alreadyExisting = 0;
    const completedKeys = [];
    const failures = [];

    try {
      for (let i = 0; i < toAdd.length; i++) {
        const r = toAdd[i];
        try {
          // The built-in sample remains a non-persisting preview. Uploaded Demo
          // statements use the normal save path with data_mode="demo".
          if (isDemo && r._demo) {
            added++;
            completedKeys.push(r.key);
          } else {
            const response = await base44.functions.invoke("finance", {
              action: "create_transaction",
              organisation_id: activeOrg.id,
              direction: r.direction,
              account_id: account.id,
              category_id: r.category_id || null,
              amount: r.amount,
              currency: activeOrg?.currency,
              date: r.date,
              description: r.description,
              reference: r.reference || "",
              payment_method: "bank_transfer",
              status: "cleared",
              data_mode: dataMode,
              source_import_key: statementRowImportKey(fileName, account.id, r),
            });
            const result = response?.data ?? response;
            if (result?.duplicate) alreadyExisting++;
            else added++;
            completedKeys.push(r.key);
          }
        } catch (saveError) {
          const responseData = saveError?.data || saveError?.response?.data || {};
          failures.push({
            key: r.key,
            message:
              responseData.error ||
              responseData.message ||
              saveError?.message ||
              "The Finance transaction could not be saved.",
          });
        }
        setCommitProgress({ done: i + 1, total: toAdd.length });
      }

      if (completedKeys.length > 0) {
        setRows((current) =>
          current.map((row) =>
            completedKeys.includes(row.key)
              ? { ...row, accepted: false, classification: "matched" }
              : row
          )
        );
        if (onSaved) await onSaved();
      }

      if (failures.length > 0) {
        const failureMessage = `${failures.length} transaction${failures.length === 1 ? "" : "s"} could not be added. ${failures[0].message} Correct the highlighted row or Finance account, then retry; saved rows will not be duplicated.`;
        setError(failureMessage);
        setStep(STEPS.review);
        toast({
          title: "Some transactions were not added",
          description: failureMessage,
          variant: "destructive",
        });
        return;
      }

      setAddedCount(added);
      setStep(STEPS.done);
      toast({
        title: "Bank statement saved",
        description:
          alreadyExisting > 0
            ? `${added} added; ${alreadyExisting} already existed and was not duplicated.`
            : `${added} transaction${added === 1 ? "" : "s"} added to Finance.`,
      });
    } finally {
      commitInFlightRef.current = false;
    }
  };

  const selectedCount = rows.filter((r) => r.accepted && r.classification !== "matched").length;
  const needsHelp = rows.filter((r) => !r.category_id && r.accepted && r.classification !== "matched").length;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-brand-teal" /> Upload Bank Statement
          </DialogTitle>
          <DialogDescription>
            Upload a statement and FADS will read it, match what it can, and ask you about the rest.
          </DialogDescription>
        </DialogHeader>

        {/* STEP: upload */}
        {step === STEPS.upload && (
          <div className="space-y-3">
            {isDemo && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-brand-teal/5 border border-brand-teal/20 text-xs">
                <Badge variant="outline" className="bg-brand-teal/10 text-brand-teal border-brand-teal/30">Demo</Badge>
                <span className="text-muted-foreground">You're in Demo mode. Try a sample statement — no Live data will be changed.</span>
              </div>
            )}
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center space-y-3">
              <FileUp className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Upload a bank statement to begin.</p>
              <p className="text-xs text-muted-foreground">Supported: PDF, CSV, Excel (.xls / .xlsx)</p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.csv,.xls,.xlsx,.txt,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <div className="flex flex-col gap-2">
                <Button className="h-12 gap-1.5" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-5 h-5" /> Upload Statement
                </Button>
                {isDemo && (
                  <Button variant="ghost" className="h-10 gap-1.5 text-brand-teal" onClick={handleDemoSample}>
                    <Sparkles className="w-4 h-4" /> Try a Sample Statement
                  </Button>
                )}
              </div>
            </div>
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </div>
            )}
          </div>
        )}

        {/* STEP: reviewing */}
        {step === STEPS.reviewing && (
          <div className="space-y-2">
            <FadsRobotLoader compact message="FADS is reviewing your statement…" />
            <p className="text-xs text-muted-foreground text-center">{fileName}</p>
          </div>
        )}

        {/* STEP: summary */}
        {step === STEPS.summary && summary && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-status-ok">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-semibold text-brand-navy">FADS has reviewed your statement.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SummaryStat label="Transactions found" value={summary.found} />
              <SummaryStat label="Matched" value={summary.matched} accent="ok" />
              <SummaryStat label="Need a category" value={summary.need_category} accent="warn" />
              <SummaryStat label="May be duplicates" value={summary.duplicates} accent="bad" />
            </div>
            {summary.possible_match > 0 && (
              <p className="text-xs text-muted-foreground">{summary.possible_match} look like possible matches — FADS will show these for you to confirm.</p>
            )}
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button className="w-full h-11 gap-1.5 bg-brand-teal text-brand-navy hover:bg-brand-teal/90" onClick={() => setStep(STEPS.review)}>
                <Bot className="w-4 h-4" /> Review with FADS
              </Button>
              <Button variant="ghost" className="w-full h-10 gap-1.5" onClick={reset}>
                <RotateCcw className="w-4 h-4" /> Upload a different file
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP: review rows */}
        {step === STEPS.review && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-semibold">{selectedCount} selected to add</Badge>
                {isDemo && <Badge variant="outline" className="bg-brand-teal/10 text-brand-teal border-brand-teal/30">Demo records</Badge>}
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={acceptAll}>
                <Check className="w-3.5 h-3.5" /> Accept FADS' Suggestions
              </Button>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <label htmlFor="statement-finance-account" className="text-sm font-medium text-brand-navy">
                Finance account
              </label>
              {statementAccounts.length > 0 ? (
                <>
                  <select
                    id="statement-finance-account"
                    className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={selectedAccountId}
                    onChange={(event) => setSelectedAccountId(event.target.value)}
                  >
                    {statementAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} · {String(account.account_type || "").replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Only accounts from {activeOrg?.name} in {isDemo ? "Demo" : "Live"} mode are available.
                  </p>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    This workspace has no bank or cash account in {isDemo ? "Demo" : "Live"} mode.
                  </p>
                  <Button type="button" variant="outline" className="h-10 w-full" onClick={() => setAccountDialogOpen(true)}>
                    Create Finance Account
                  </Button>
                </div>
              )}
            </div>
            <div className="max-h-[48vh] overflow-y-auto space-y-2 -mx-1 px-1">
              {rows.map((r) => {
                const cats = r.direction === "in" ? incomeCategories : expenseCategories;
                const badge = CLASS_BADGE[r.classification] || CLASS_BADGE.new;
                return (
                  <div key={r.key} className={`rounded-lg border p-3 ${r.accepted ? "border-brand-teal/40 bg-brand-teal/5" : "border-border"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <Checkbox
                          id={`statement-row-${r.key}`}
                          checked={r.classification === "matched" ? true : r.accepted}
                          disabled={r.classification === "matched"}
                          onCheckedChange={(checked) => updateRow(r.key, { accepted: checked === true })}
                          aria-label={
                            r.classification === "matched"
                              ? `${r.description || "Transaction"} is already in Finance`
                              : `${r.accepted ? "Deselect" : "Select"} ${r.description || "transaction"}`
                          }
                          className="mt-0.5 shrink-0"
                        />
                        <label htmlFor={`statement-row-${r.key}`} className="min-w-0">
                          <p className="text-sm font-medium text-brand-navy truncate">{r.description || "—"}</p>
                          <p className="text-xs text-muted-foreground">{r.date}</p>
                        </label>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold ${r.direction === "in" ? "text-status-ok" : "text-brand-navy"}`}>
                          {r.direction === "in" ? "+" : "−"}{formatMoney(r.amount, activeOrg?.currency)}
                        </p>
                        <Badge variant="outline" className={`text-xs mt-1 ${badge.className}`}>{badge.label}</Badge>
                      </div>
                    </div>
                    {r.classification !== "matched" && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground shrink-0">Category:</span>
                          <select
                            className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                            value={r.category_id}
                            onChange={(e) => updateRow(r.key, { category_id: e.target.value })}
                          >
                            <option value="">— Category —</option>
                            {cats.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        {r.classification === "possible_duplicate" && (
                          <p className="text-xs text-destructive">
                            Looks like a duplicate — skipped by default. Select it only if it is genuinely new.
                          </p>
                        )}
                      </div>
                    )}
                    {r.classification === "matched" && (
                      <p className="text-xs text-status-ok mt-1.5 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Already in your Finance records — won't be added again.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </div>
            )}
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button className="w-full h-11 gap-1.5" onClick={commit} disabled={selectedCount === 0}>
                <Check className="w-4 h-4" /> Approve &amp; Add {selectedCount || ""} to Finance
              </Button>
              <Button variant="outline" className="w-full h-10" onClick={() => setStep(STEPS.summary)}>Back</Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP: committing */}
        {step === STEPS.committing && (
          <div className="space-y-2">
            <FadsRobotLoader compact message="FADS is adding your transactions…" />
            <p className="text-xs text-muted-foreground text-center">{commitProgress.done} of {commitProgress.total}</p>
          </div>
        )}

        {/* STEP: done */}
        {step === STEPS.done && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-status-ok">
              <CheckCircle2 className="w-6 h-6" />
              <p className="font-semibold text-brand-navy">Done — {addedCount} transaction{addedCount === 1 ? "" : "s"} added to Finance.</p>
            </div>
            {needsHelp > 0 && (
              <div className="rounded-lg bg-brand-mint/40 border border-brand-teal/20 p-3">
                <p className="text-sm font-medium text-brand-navy flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-teal" /> FADS' Pick
                </p>
                <p className="text-sm text-brand-navy mt-1">
                  {needsHelp} transaction{needsHelp === 1 ? "" : "s"} still need a category. Review them next.
                </p>
                <Button variant="outline" size="sm" className="h-9 mt-2 gap-1" onClick={() => { setStep(STEPS.review); }}>
                  Review {needsHelp} Transactions <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button className="w-full h-11 gap-1.5" onClick={() => navigate("/finance/reconciliation")}>
                <Landmark className="w-4 h-4" /> Go to Reconciliation
              </Button>
              <Button variant="outline" className="w-full h-10" onClick={close}>Close</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
      </Dialog>
      {accountDialogOpen && activeOrg?.id && (
        <AccountDialog
          open
          orgId={activeOrg.id}
          onClose={() => setAccountDialogOpen(false)}
          onSaved={async (accountId) => {
            await fin.reload();
            if (accountId) setSelectedAccountId(accountId);
            setError("");
          }}
        />
      )}
    </>
  );
}

function SummaryStat({ label, value, accent }) {
  const color = accent === "ok" ? "text-status-ok" : accent === "warn" ? "text-status-warn" : accent === "bad" ? "text-destructive" : "text-brand-navy";
  return (
    <div className="bg-card rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 font-mono ${color}`}>{value}</p>
    </div>
  );
}