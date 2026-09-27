import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useFinance } from "@/lib/useFinance";
import { useInvoices } from "@/lib/useInvoices";
import { useInventory } from "@/lib/useInventory";
import {
  canManageFinance,
  canViewFinanceTotals,
  formatMoney,
} from "@/lib/financeWording";
import { deriveSalesSummary } from "@/lib/salesSummary";
import { buildSalesTrend, deriveProductSales } from "@/lib/salesVisualTracker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RecordSaleDialog from "@/components/finance/RecordSaleDialog";
import BackToFinance from "@/components/finance/BackToFinance";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Mic,
  Plus,
  ReceiptText,
  Wallet,
  Package,
  TrendingUp,
  Trophy,
} from "lucide-react";

function MetricCard({ label, value, note, icon: Icon }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="text-xl sm:text-2xl font-bold text-brand-navy mt-1">{value}</p>
            {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
          </div>
          <div className="w-9 h-9 rounded-lg bg-brand-teal/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-brand-teal" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Sales() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeOrg, activeRole } = useWorkspace();
  const finance = useFinance();
  const invoices = useInvoices();
  const inventory = useInventory();
  const [saleDialog, setSaleDialog] = useState({ open: false, autoDictate: false });
  const [trendRange, setTrendRange] = useState("month");

  const canView = canViewFinanceTotals(activeRole);
  const canManage = canManageFinance(activeRole);

  useEffect(() => {
    if (searchParams.get("record") !== "1" || !canManage) return;
    setSaleDialog({ open: true, autoDictate: false });
    const next = new URLSearchParams(searchParams);
    next.delete("record");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, canManage]);

  const summary = useMemo(
    () =>
      deriveSalesSummary({
        transactions: finance.transactions,
        invoices: invoices.invoices,
        payments: invoices.payments,
        categories: finance.categories,
        contacts: finance.contacts,
      }),
    [
      finance.transactions,
      finance.categories,
      finance.contacts,
      invoices.invoices,
      invoices.payments,
    ]
  );

  const trendData = useMemo(
    () => buildSalesTrend(summary.salesRows, trendRange),
    [summary.salesRows, trendRange]
  );

  const productSales = useMemo(
    () =>
      deriveProductSales({
        directSales: summary.directSales,
        invoiceSales: summary.invoiceSales,
        inventoryItems: inventory.items,
      }),
    [summary.directSales, summary.invoiceSales, inventory.items]
  );

  const stockRows = useMemo(
    () =>
      inventory.items
        .filter((item) => item.is_active !== false)
        .map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku || "",
          quantity: Number(item.current_quantity) || 0,
          low: Number(item.low_stock_level) || 0,
        }))
        .sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name))
        .slice(0, 8),
    [inventory.items]
  );

  if (activeOrg?.type !== "small_business") {
    return <Navigate to="/finance" replace />;
  }
  if (!canView) {
    return <Navigate to="/finance" replace />;
  }

  const currency = activeOrg?.currency || "";

  const refreshSales = async () => {
    await Promise.all([finance.reload(), invoices.reload(), inventory.reload()]);
  };

  return (
    <div className="space-y-5">
      <BackToFinance />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Sales</h1>
          <p className="text-sm text-muted-foreground">
            See what you sold, what you received, and what customers still owe.
          </p>
        </div>

        {canManage && (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              className="h-11 gap-2"
              onClick={() => setSaleDialog({ open: true, autoDictate: true })}
            >
              <Mic className="w-4 h-4" /> Tell FADS About a Sale
            </Button>
            <Button
              className="h-11 gap-2"
              onClick={() => setSaleDialog({ open: true, autoDictate: false })}
            >
              <Plus className="w-4 h-4" /> Record a Sale
            </Button>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-brand-navy">Sales Overview</h2>
        <p className="text-sm text-muted-foreground">
          Your existing Sales V1 totals — unchanged.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard
          label="Sales Today"
          value={formatMoney(summary.salesToday, currency)}
          note="Sales recorded for today"
          icon={CircleDollarSign}
        />
        <MetricCard
          label="Sales This Week"
          value={formatMoney(summary.salesThisWeek, currency)}
          note="From Monday to today"
          icon={CalendarDays}
        />
        <MetricCard
          label="Sales This Month"
          value={formatMoney(summary.salesThisMonth, currency)}
          note="Based on recorded sales"
          icon={Clock3}
        />
        <MetricCard
          label="Money Received"
          value={formatMoney(summary.moneyReceived, currency)}
          note="Paid sales and payments received"
          icon={Wallet}
        />
        <Link to="/finance/money-owed" className="block">
          <MetricCard
            label="Money Still Owed"
            value={formatMoney(summary.moneyStillOwed, currency)}
            note="Open invoice balances"
            icon={ReceiptText}
          />
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-teal" />
                <h2 className="font-semibold text-brand-navy">Sales Trend</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Built from the same authoritative Sales V1 sales used above.
              </p>
            </div>
            <div className="flex gap-1 rounded-lg border border-border bg-muted/20 p-1">
              {[
                { value: "today", label: "Today" },
                { value: "week", label: "This Week" },
                { value: "month", label: "This Month" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTrendRange(option.value)}
                  className={`min-h-9 rounded-md px-3 text-xs font-medium transition-colors ${
                    trendRange === option.value
                      ? "bg-brand-navy text-white"
                      : "text-muted-foreground hover:bg-card"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  width={72}
                  tickFormatter={(value) => formatMoney(value, currency).replace(/\.\d+/, "")}
                />
                <Tooltip
                  formatter={(value) => [formatMoney(value, currency), "Sales"]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ""}
                  contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#0d9488"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-0">
            <div className="p-4 sm:p-5 border-b border-border">
              <h2 className="font-semibold text-brand-navy">What You’re Selling</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Only sales where you explicitly linked an inventory item.
              </p>
            </div>

            {productSales.products.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <Package className="w-8 h-8 text-brand-teal mx-auto mb-2" />
                <p className="font-medium text-brand-navy">
                  Start linking items when you record sales and FADS will show what’s selling here.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Historical and service sales still count in your Sales Overview and trend.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {productSales.products.map((row) => (
                  <div key={row.inventory_item_id} className="p-4 sm:px-5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-brand-navy truncate">{row.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {row.sku || "No SKU"} · {row.quantity_sold} sold
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-brand-navy">{formatMoney(row.sales_value, currency)}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.stock_remaining === null ? "Stock unavailable" : `${row.stock_remaining} in stock`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="p-4 sm:p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-brand-teal" />
                <h2 className="font-semibold text-brand-navy">Top Sellers</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Ranked by quantity sold from explicit inventory links only.
              </p>
            </div>

            {productSales.topSellers.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-sm text-muted-foreground">
                No linked product sales yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {productSales.topSellers.map((row, index) => (
                  <div key={row.inventory_item_id} className="p-4 sm:px-5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-mint text-brand-navy flex items-center justify-center text-sm font-bold shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-brand-navy truncate">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.quantity_sold} sold</p>
                    </div>
                    <p className="font-semibold text-brand-navy whitespace-nowrap">
                      {formatMoney(row.sales_value, currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 sm:p-5 border-b border-border">
            <h2 className="font-semibold text-brand-navy">Stock Remaining</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Existing Inventory stock on hand. Sales are not automatically deducted in this version.
            </p>
          </div>

          {inventory.loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading stock…</div>
          ) : stockRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No inventory items recorded yet.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
              {stockRows.map((item) => {
                const low = item.quantity <= item.low && item.low > 0;
                return (
                  <Link
                    key={item.id}
                    to={`/inventory/${item.id}`}
                    className="bg-card p-4 hover:bg-muted/20 transition-colors"
                  >
                    <p className="font-medium text-brand-navy truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.sku || "No SKU"}</p>
                    <div className="flex items-end justify-between gap-2 mt-3">
                      <div>
                        <p className="text-2xl font-bold text-brand-navy">{item.quantity}</p>
                        <p className="text-xs text-muted-foreground">in stock</p>
                      </div>
                      {low && (
                        <Badge className="bg-status-warn/10 text-status-warn border-status-warn/30">
                          Low
                        </Badge>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 sm:p-5 border-b border-border">
            <h2 className="font-semibold text-brand-navy">Recent Sales</h2>
            <p className="text-sm text-muted-foreground">
              Paid-now sales and issued invoices shown together without counting invoice payments twice.
            </p>
          </div>

          {finance.loading || invoices.loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading sales…</div>
          ) : summary.recentSales.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-medium text-brand-navy">No sales recorded yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Record a paid sale or create an invoice when a customer will pay later.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {summary.recentSales.map((sale) => (
                <Link
                  key={`${sale.kind}-${sale.id}`}
                  to={sale.href}
                  className="block p-4 sm:px-5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-brand-navy truncate">{sale.description}</p>
                        <Badge
                          variant="outline"
                          className={
                            sale.payment_status === "paid"
                              ? "border-status-ok/30 text-status-ok bg-status-ok/10"
                              : "border-status-warn/30 text-status-warn bg-status-warn/10"
                          }
                        >
                          {sale.payment_status === "paid" ? "Paid" : "Money Owed"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {sale.customer} · {sale.date || "No date"}
                        {sale.reference ? ` · ${sale.reference}` : ""}
                      </p>
                      {sale.outstanding > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Received {formatMoney(sale.amount_received, currency)} · Still owed{" "}
                          {formatMoney(sale.outstanding, currency)}
                        </p>
                      )}
                    </div>
                    <p className="font-bold text-brand-navy whitespace-nowrap">
                      {formatMoney(sale.amount, currency)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <RecordSaleDialog
          open={saleDialog.open}
          autoDictate={saleDialog.autoDictate}
          onClose={() => setSaleDialog({ open: false, autoDictate: false })}
          onSaved={refreshSales}
          onAccountsChanged={finance.reload}
          onCreateInvoice={() => navigate("/finance/invoices/new")}
          accounts={finance.accounts}
          categories={finance.categories}
          contacts={finance.contacts}
          inventoryItems={inventory.items}
          orgId={activeOrg?.id}
          currency={activeOrg?.currency}
        />
      )}
    </div>
  );
}
