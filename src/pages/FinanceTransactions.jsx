import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useFinance } from "@/lib/useFinance";
import { financeWording, canManageFinance, formatMoney } from "@/lib/financeWording";
import { downloadFinanceCsv } from "@/lib/financeExport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Pencil,
  Trash2,
  SlidersHorizontal,
  FileDown,
  X,
} from "lucide-react";
import TransactionDialog from "@/components/finance/TransactionDialog";
import BackToFinance from "@/components/finance/BackToFinance";
import ConfirmDialog from "@/components/finance/ConfirmDialog";
import { base44 } from "@/api/base44Client";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { ResponsiveSelect } from "@/components/ui/responsive-select";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

const STATUS_BADGE = {
  cleared: "",
  pending: "text-status-warn",
  cancelled: "text-muted-foreground line-through",
};

export default function FinanceTransactions() {
  const { activeOrg, activeRole } = useWorkspace();
  const fin = useFinance();
  const w = financeWording(activeOrg);
  const canManage = canManageFinance(activeRole);
  const navigate = useNavigate();

  const [direction, setDirection] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [accountId, setAccountId] = useState("all");
  const [contactId, setContactId] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [status, setStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const { pullDistance, refreshing, threshold } = usePullToRefresh(() => fin.reload());

  const accountName = (id) => fin.accounts.find((a) => a.id === id)?.name || "—";
  const categoryName = (id) => fin.categories.find((c) => c.id === id)?.name || "—";
  const contactName = (id) => fin.contacts.find((c) => c.id === id)?.name || "";

  const filtered = useMemo(() => {
    return fin.transactions.filter((t) => {
      if (direction !== "all" && t.direction !== direction) return false;
      if (accountId !== "all" && t.account_id !== accountId) return false;
      if (categoryId !== "all" && t.category_id !== categoryId) return false;
      if (contactId !== "all" && t.contact_id !== contactId) return false;
      if (paymentMethod !== "all" && t.payment_method !== paymentMethod) return false;
      if (status !== "all" && t.status !== status) return false;
      if (dateFrom && (!t.date || t.date < dateFrom)) return false;
      if (dateTo && (!t.date || t.date > dateTo)) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${t.description || ""} ${t.reference || ""} ${contactName(t.contact_id)}`;
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [fin.transactions, fin.contacts, direction, accountId, categoryId, contactId, paymentMethod, status, dateFrom, dateTo, search]);

  const hasFilters =
    direction !== "all" || accountId !== "all" || categoryId !== "all" ||
    contactId !== "all" || paymentMethod !== "all" || status !== "all" ||
    dateFrom || dateTo || search;

  const clearFilters = () => {
    setDirection("all"); setAccountId("all"); setCategoryId("all");
    setContactId("all"); setPaymentMethod("all"); setStatus("all");
    setDateFrom(""); setDateTo(""); setSearch("");
  };

  const exportCsv = () => {
    downloadFinanceCsv(
      activeOrg.id,
      {
        direction: direction !== "all" ? direction : undefined,
        account_id: accountId !== "all" ? accountId : undefined,
        category_id: categoryId !== "all" ? categoryId : undefined,
        contact_id: contactId !== "all" ? contactId : undefined,
        payment_method: paymentMethod !== "all" ? paymentMethod : undefined,
        status: status !== "all" ? status : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: search || undefined,
      },
      activeOrg.name
    );
  };

  const remove = async () => {
    const id = confirm.id;
    setConfirm(null);
    fin.removeTransaction(id);
    setBusy(true);
    try {
      await base44.functions.invoke("finance", {
        action: "delete_transaction",
        organisation_id: activeOrg.id,
        transaction_id: id,
      });
    } catch (e) {
      alert(e.response?.data?.error || e.message);
      fin.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <BackToFinance />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Transactions</h1>
        <div className="flex gap-2">
          {canManage && (
            <Button variant="outline" className="h-11" onClick={exportCsv}>
              <FileDown className="w-4 h-4" /> Export
            </Button>
          )}
          {canManage && (
            <Button className="h-11" onClick={() => setDialog({ type: "txn" })}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          ["all", "All"],
          ["in", w.moneyIn],
          ["out", w.moneyOut],
        ].map(([k, label]) => (
          <Button
            key={k}
            variant={direction === k ? "default" : "outline"}
            size="sm"
            className="h-9"
            onClick={() => setDirection(k)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          className="h-11"
          placeholder="Search description, reference, contact…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          variant={showFilters ? "default" : "outline"}
          className="h-11 shrink-0"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </Button>
      </div>

      {showFilters && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-brand-navy">Filter by</span>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
                <X className="w-3 h-3" /> Clear
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">From date</label>
              <Input type="date" className="h-11" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">To date</label>
              <Input type="date" className="h-11" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Account</label>
              <ResponsiveSelect
                value={accountId}
                onValueChange={setAccountId}
                placeholder="All accounts"
                triggerClassName="h-11"
                options={[
                  { value: "all", label: "All accounts" },
                  ...fin.accounts.map((a) => ({ value: a.id, label: a.name })),
                ]}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Category</label>
              <ResponsiveSelect
                value={categoryId}
                onValueChange={setCategoryId}
                placeholder="All categories"
                triggerClassName="h-11"
                options={[
                  { value: "all", label: "All categories" },
                  ...fin.categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Contact</label>
              <ResponsiveSelect
                value={contactId}
                onValueChange={setContactId}
                placeholder="All contacts"
                triggerClassName="h-11"
                options={[
                  { value: "all", label: "All contacts" },
                  ...fin.contacts.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Payment method</label>
              <ResponsiveSelect
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                placeholder="All methods"
                triggerClassName="h-11"
                options={[
                  { value: "all", label: "All methods" },
                  ...PAYMENT_METHODS.map((p) => ({ value: p.value, label: p.label })),
                ]}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Status</label>
              <ResponsiveSelect
                value={status}
                onValueChange={setStatus}
                placeholder="All statuses"
                triggerClassName="h-11"
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "cleared", label: "Cleared" },
                  { value: "pending", label: "Pending" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} threshold={threshold} />

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {fin.transactions.length} transactions
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">
          No transactions match{hasFilters ? " these filters" : ""}.
          {canManage && !hasFilters && " Use Add to create your first entry."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="bg-card rounded-xl border border-border p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-brand-teal"
              onClick={() => navigate(`/finance/transactions/${t.id}`)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${t.direction === "in" ? "bg-status-ok/15 text-status-ok" : "bg-status-bad/15 text-status-bad"}`}>
                  {t.direction === "in" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-brand-navy truncate">
                    {t.description || t.reference || (t.direction === "in" ? w.moneyIn : w.moneyOut)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.date} · {accountName(t.account_id)} · {categoryName(t.category_id)}
                    {t.status !== "cleared" && <span className={STATUS_BADGE[t.status]}> · {t.status}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`font-semibold ${t.direction === "in" ? "text-status-ok" : "text-brand-navy"} ${t.status === "cancelled" ? "line-through opacity-60" : ""}`}>
                  {t.direction === "in" ? "+" : "−"}
                  {formatMoney(t.amount, t.currency)}
                </span>
                {canManage && (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDialog({ type: "txn", record: t })}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-status-bad" onClick={() => setConfirm(t)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {dialog?.type === "txn" && (
        <TransactionDialog
          open
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); fin.reload(); }}
          direction={dialog.record ? dialog.record.direction : "in"}
          accounts={fin.accounts}
          categories={fin.categories}
          contacts={fin.contacts}
          record={dialog.record}
          orgId={activeOrg.id}
          wording={w}
          currency={activeOrg.currency}
        />
      )}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        title="Delete transaction?"
        description="This permanently removes the record. This action cannot be undone."
        busy={busy}
      />
    </div>
  );
}