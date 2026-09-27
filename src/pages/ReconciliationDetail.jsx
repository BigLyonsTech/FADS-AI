import React, { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useFinance } from "@/lib/useFinance";
import { useReconciliationDetail } from "@/lib/useReconciliation";
import { formatMoney } from "@/lib/financeWording";
import { canManageFinance } from "@/lib/financeWording";
import {
  computeDifference,
  buildRecSummary,
  downloadTextFile,
  lineStatusLabel,
} from "@/lib/reconciliationUtils";
import ReconciliationStatusBadge from "@/components/finance/ReconciliationStatusBadge";
import CreateFromLineDialog from "@/components/finance/CreateFromLineDialog";
import BackToFinance from "@/components/finance/BackToFinance";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import FadsRobotLoader from "@/components/FadsRobotLoader";
import {
  Check,
  X,
  Link2,
  Plus,
  Ban,
  Unlink,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  Landmark,
} from "lucide-react";

const CONFIDENCE_STYLES = {
  high: "bg-status-ok/15 text-status-ok",
  medium: "bg-status-warn/15 text-status-warn",
  low: "bg-muted text-muted-foreground",
};

export default function ReconciliationDetail() {
  const { id } = useParams();
  const { activeOrg, activeRole } = useWorkspace();
  const fin = useFinance();
  const { reconciliation: rec, lines, transactions, loading, error, reload } = useReconciliationDetail(id);
  const canManage = canManageFinance(activeRole);
  const { toast } = useToast();

  const [filter, setFilter] = useState("all");
  const [matchingLineId, setMatchingLineId] = useState(null);
  const [selectedTxn, setSelectedTxn] = useState("");
  const [createLine, setCreateLine] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const callRec = async (payload) => {
    await base44.functions.invoke("reconciliation", { organisation_id: activeOrg.id, ...payload });
  };

  const handleAction = async (label, payload, successMsg) => {
    setActionLoading(label);
    try {
      await callRec(payload);
      await reload();
      if (successMsg) toast({ title: successMsg });
    } catch (e) {
      toast({ title: "Action failed", description: e.response?.data?.error || e.data?.error || e.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
      setMatchingLineId(null);
      setSelectedTxn("");
    }
  };

  // Transactions available for manual matching (cleared, same account, not matched to another line)
  const matchedTxnIds = useMemo(() => {
    const ids = new Set();
    lines.forEach((l) => {
      if (l.status === "matched" && l.matched_transaction_id) ids.add(l.matched_transaction_id);
    });
    return ids;
  }, [lines]);

  const availableTxns = useMemo(
    () => transactions.filter((t) => !matchedTxnIds.has(t.id)),
    [transactions, matchedTxnIds]
  );

  const filteredLines = useMemo(() => {
    if (filter === "all") return lines;
    return lines.filter((l) => l.status === filter);
  }, [lines, filter]);

  const difference = rec ? computeDifference(rec, lines) : 0;
  const allResolved = lines.length > 0 && lines.every((l) => l.status === "matched" || l.status === "ignored");
  const matchedCount = lines.filter((l) => l.status === "matched").length;
  const progress = lines.length > 0 ? Math.round((matchedCount / lines.length) * 100) : 0;

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const res = await callRec({ action: "complete_reconciliation", reconciliation_id: id });
      await reload();
      toast({
        title: "Reconciliation completed",
        description: `Difference: ${formatMoney(res.data.difference, rec.currency)}`,
      });
    } catch (e) {
      toast({ title: "Cannot complete", description: e.response?.data?.error || e.data?.error || e.message, variant: "destructive" });
    } finally {
      setCompleting(false);
    }
  };

  const handleDownload = () => {
    const summary = buildRecSummary(rec, lines);
    downloadTextFile(`reconciliation-${rec.account_name}-${rec.period_end}.txt`, summary);
  };

  const handleRefreshSuggestions = async () => {
    setSuggestionLoading(true);
    try {
      const res = await callRec({ action: "suggest_matches", reconciliation_id: id });
      await reload();
      toast({ title: `${res.data.suggestions} suggestions found` });
    } catch (e) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSuggestionLoading(false);
    }
  };

  if (loading) {
    return <FadsRobotLoader compact message="FADS AI IS LOADING YOUR RECONCILIATION..." />;
  }

  if (error || !rec) {
    return (
      <div className="space-y-4">
        <BackToFinance />
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <AlertCircle className="w-10 h-10 text-status-bad mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{error || "Reconciliation not found"}</p>
        </div>
      </div>
    );
  }

  if (rec.organisation_id !== activeOrg?.id) {
    return (
      <div className="space-y-4">
        <BackToFinance />
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <AlertCircle className="w-10 h-10 text-status-bad mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">This reconciliation belongs to a different organisation.</p>
        </div>
      </div>
    );
  }

  const filters = ["all", "suggested", "unmatched", "matched", "ignored"];

  return (
    <div className="space-y-4">
      {suggestionLoading && (
        <div className="rounded-2xl border border-brand-teal/30 bg-card/70">
          <FadsRobotLoader compact message="FADS AI IS CHECKING FOR MATCHES..." />
        </div>
      )}

      <BackToFinance />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-brand-navy">{rec.account_name}</h1>
            <ReconciliationStatusBadge rec={rec} />
          </div>
          <p className="text-sm text-muted-foreground">
            {rec.period_start} → {rec.period_end} · {activeOrg?.currency}
          </p>
        </div>
        {canManage && rec.status !== "completed" && (
          <Button variant="outline" size="sm" onClick={handleRefreshSuggestions} disabled={suggestionLoading}>
            <RefreshCw className={`w-3.5 h-3.5 ${suggestionLoading ? "animate-spin" : ""}`} />
            {suggestionLoading ? "Checking..." : "Refresh Suggestions"}
          </Button>
        )}
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-card rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Opening</p>
          <p className="text-lg font-bold text-brand-navy">{formatMoney(rec.opening_balance, rec.currency)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Closing</p>
          <p className="text-lg font-bold text-brand-navy">{formatMoney(rec.closing_balance, rec.currency)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Computed</p>
          <p className="text-lg font-bold text-brand-navy">
            {formatMoney(Number(rec.opening_balance) + lines.reduce((s, l) => s + (Number(l.amount_in) || 0), 0) - lines.reduce((s, l) => s + (Number(l.amount_out) || 0), 0), rec.currency)}
          </p>
        </div>
        <div className={`rounded-xl border p-3 ${Math.abs(difference) < 0.01 ? "bg-status-ok/10 border-status-ok/30" : "bg-status-warn/10 border-status-warn/30"}`}>
          <p className="text-xs text-muted-foreground">Difference</p>
          <p className={`text-lg font-bold ${Math.abs(difference) < 0.01 ? "text-status-ok" : "text-status-warn"}`}>
            {formatMoney(difference, rec.currency)}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-brand-navy">Progress</span>
          <span className="text-sm text-muted-foreground">{matchedCount} / {lines.length} matched</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-brand-teal rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
              filter === f ? "bg-brand-navy text-white border-brand-navy" : "bg-card text-muted-foreground border-border"
            }`}
          >
            {f === "all" ? "All" : lineStatusLabel(f)}
          </button>
        ))}
      </div>

      {/* Lines */}
      {filteredLines.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <Landmark className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No {filter === "all" ? "" : lineStatusLabel(filter).toLowerCase()} lines.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLines.map((line) => {
            const isIn = Number(line.amount_in) > 0;
            const amount = isIn ? Number(line.amount_in) : Number(line.amount_out);
            const suggestedTxn = line.suggested_transaction_id
              ? transactions.find((t) => t.id === line.suggested_transaction_id)
              : null;
            const matchedTxn = line.matched_transaction_id
              ? transactions.find((t) => t.id === line.matched_transaction_id)
              : null;

            return (
              <div key={line.id} className={`bg-card rounded-xl border p-4 ${line.status === "matched" ? "border-status-ok/30" : line.status === "suggested" ? "border-brand-teal/30" : "border-border"}`}>
                {/* Line header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">{line.date}</span>
                      <LineStatusChip status={line.status} />
                      {line.is_duplicate && <span className="text-xs text-status-warn">Duplicate</span>}
                    </div>
                    <p className="text-sm font-medium text-brand-navy mt-1 truncate">{line.description || "—"}</p>
                    {line.reference && <p className="text-xs text-muted-foreground">Ref: {line.reference}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold ${isIn ? "text-status-ok" : "text-brand-navy"}`}>
                      {isIn ? "+" : "−"}{formatMoney(amount, rec.currency)}
                    </p>
                  </div>
                </div>

                {/* Suggested match details */}
                {line.status === "suggested" && suggestedTxn && (
                  <div className="mt-3 bg-brand-teal/5 border border-brand-teal/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-brand-teal">Suggested Match</span>
                      {line.suggestion_confidence && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${CONFIDENCE_STYLES[line.suggestion_confidence] || ""}`}>
                          {line.suggestion_confidence}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-brand-navy truncate">{suggestedTxn.description || "—"}</p>
                        <p className="text-xs text-muted-foreground">{suggestedTxn.date} · {suggestedTxn.direction === "in" ? "Money In" : "Money Out"}</p>
                      </div>
                      <span className="font-semibold text-brand-navy">{formatMoney(suggestedTxn.amount, suggestedTxn.currency)}</span>
                    </div>
                  </div>
                )}

                {/* Matched details */}
                {line.status === "matched" && matchedTxn && (
                  <div className="mt-3 bg-status-ok/5 border border-status-ok/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-status-ok" />
                      <span className="text-xs font-medium text-status-ok">Matched to Transaction</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-brand-navy truncate">{matchedTxn.description || "—"}</p>
                        <p className="text-xs text-muted-foreground">{matchedTxn.date} · {matchedTxn.direction === "in" ? "Money In" : "Money Out"}</p>
                      </div>
                      <span className="font-semibold text-brand-navy">{formatMoney(matchedTxn.amount, matchedTxn.currency)}</span>
                    </div>
                  </div>
                )}

                {/* Manual match panel */}
                {matchingLineId === line.id && (
                  <div className="mt-3 bg-muted/30 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-brand-navy">Select a transaction to match:</p>
                    <Select value={selectedTxn} onValueChange={setSelectedTxn}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Choose a transaction" /></SelectTrigger>
                      <SelectContent>
                        {availableTxns.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.date} · {t.description || "—"} · {formatMoney(t.amount, t.currency)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={!selectedTxn || actionLoading === `match-${line.id}`}
                        onClick={() => handleAction(`match-${line.id}`, { action: "match_line", line_id: line.id, transaction_id: selectedTxn }, "Matched")}
                      >
                        <Check className="w-3.5 h-3.5" /> Confirm Match
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setMatchingLineId(null); setSelectedTxn(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {canManage && rec.status !== "completed" && matchingLineId !== line.id && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {line.status === "suggested" && (
                      <>
                        <Button
                          size="sm"
                          disabled={actionLoading === `confirm-${line.id}`}
                          onClick={() => handleAction(`confirm-${line.id}`, { action: "match_line", line_id: line.id, transaction_id: line.suggested_transaction_id }, "Match confirmed")}
                        >
                          <Check className="w-3.5 h-3.5" /> Confirm Match
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading === `reject-${line.id}`}
                          onClick={() => handleAction(`reject-${line.id}`, { action: "unmatch_line", line_id: line.id })}
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    {line.status === "unmatched" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setMatchingLineId(line.id)}>
                          <Link2 className="w-3.5 h-3.5" /> Find Match
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setCreateLine(line)}>
                          <Plus className="w-3.5 h-3.5" /> Create
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={actionLoading === `ignore-${line.id}`}
                          onClick={() => handleAction(`ignore-${line.id}`, { action: "ignore_line", line_id: line.id }, "Line ignored")}
                        >
                          <Ban className="w-3.5 h-3.5" /> Ignore
                        </Button>
                      </>
                    )}
                    {line.status === "matched" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={actionLoading === `unmatch-${line.id}`}
                        onClick={() => handleAction(`unmatch-${line.id}`, { action: "unmatch_line", line_id: line.id }, "Unmatched")}
                      >
                        <Unlink className="w-3.5 h-3.5" /> Unmatch
                      </Button>
                    )}
                    {line.status === "ignored" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading === `restore-${line.id}`}
                        onClick={() => handleAction(`restore-${line.id}`, { action: "unmatch_line", line_id: line.id })}
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom action bar */}
      {canManage && (
        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1 h-12"
            disabled={!allResolved || completing || rec.status === "completed"}
            onClick={handleComplete}
          >
            {rec.status === "completed" ? (
              <><CheckCircle2 className="w-4 h-4" /> Completed</>
            ) : completing ? (
              "Completing…"
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Complete Reconciliation</>
            )}
          </Button>
          <Button variant="outline" className="h-12" onClick={handleDownload}>
            <Download className="w-4 h-4" /> Summary
          </Button>
        </div>
      )}
      {rec.status !== "completed" && !allResolved && (
        <p className="text-xs text-muted-foreground text-center">
          {lines.filter((l) => l.status === "unmatched" || l.status === "suggested").length} line(s) still need to be matched or ignored.
        </p>
      )}

      {/* Create transaction dialog */}
      {createLine && (
        <CreateFromLineDialog
          open
          onClose={() => setCreateLine(null)}
          line={createLine}
          categories={fin.categories}
          contacts={fin.contacts}
          currency={rec.currency}
          onSubmit={async (data) => {
            await callRec({
              action: "create_transaction_from_line",
              line_id: createLine.id,
              ...data,
            });
            await reload();
            setCreateLine(null);
            toast({ title: "Transaction created & matched" });
          }}
        />
      )}
    </div>
  );
}

function LineStatusChip({ status }) {
  const styles = {
    matched: "bg-status-ok/15 text-status-ok",
    suggested: "bg-brand-teal/15 text-brand-teal",
    unmatched: "bg-muted text-muted-foreground",
    ignored: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${styles[status] || styles.unmatched}`}>
      {lineStatusLabel(status)}
    </span>
  );
}