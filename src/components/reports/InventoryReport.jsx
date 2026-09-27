import React from "react";
import { formatCurrency } from "@/lib/currencyFormat";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Boxes, AlertTriangle, PackageX, Package } from "lucide-react";

// Inventory valuation report — rendered inside the Reports Centre.
export default function InventoryReport({ data, org }) {
  if (!data) return null;
  const cur = org?.currency;

  const statusBadge = (s) => {
    if (s === "out_of_stock") return <Badge variant="destructive">Out of stock</Badge>;
    if (s === "low_stock") return <Badge className="bg-status-warn/15 text-status-warn border-status-warn/30">Low stock</Badge>;
    return <Badge className="bg-status-ok/15 text-status-ok border-status-ok/30">In stock</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat icon={Boxes} label="Total items" value={data.totalItems} />
        <Stat icon={Package} label="In stock" value={data.inStockCount} />
        <Stat icon={AlertTriangle} label="Low stock" value={data.lowStockCount} />
        <Stat icon={PackageX} label="Out of stock" value={data.outOfStockCount} />
        <MoneyStat label="Cost value" value={formatCurrency(data.costValue, cur)} />
        <MoneyStat label="Selling value" value={formatCurrency(data.sellingValue, cur)} />
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left p-3 font-medium">Item</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">SKU</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Category</th>
              <th className="text-right p-3 font-medium">Qty</th>
              <th className="text-right p-3 font-medium hidden sm:table-cell">Cost price</th>
              <th className="text-right p-3 font-medium hidden sm:table-cell">Sell price</th>
              <th className="text-right p-3 font-medium">Cost value</th>
              <th className="text-right p-3 font-medium hidden md:table-cell">Sell value</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No active inventory items.</td></tr>
            ) : data.rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 font-medium text-brand-navy">{r.name}</td>
                <td className="p-3 hidden sm:table-cell text-muted-foreground">{r.sku || "—"}</td>
                <td className="p-3 hidden md:table-cell text-muted-foreground">{r.category || "—"}</td>
                <td className="p-3 text-right">{r.quantity}</td>
                <td className="p-3 text-right hidden sm:table-cell">{formatCurrency(r.cost_price, cur)}</td>
                <td className="p-3 text-right hidden sm:table-cell">{formatCurrency(r.selling_price, cur)}</td>
                <td className="p-3 text-right font-medium">{formatCurrency(r.cost_value, cur)}</td>
                <td className="p-3 text-right hidden md:table-cell">{formatCurrency(r.selling_value, cur)}</td>
                <td className="p-3">{statusBadge(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <Icon className="w-4 h-4 text-brand-teal mb-1" />
      <div className="text-2xl font-bold text-brand-navy">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function MoneyStat({ label, value }) {
  return (
    <div className="bg-brand-mint border border-brand-mint rounded-xl p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold text-brand-navy">{value}</div>
    </div>
  );
}