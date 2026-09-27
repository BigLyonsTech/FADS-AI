import React, { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useInventory } from "@/lib/useInventory";
import { inventoryWording } from "@/lib/inventoryWording";
import { formatCurrency } from "@/lib/currencyFormat";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Pencil, Plus, Trash2, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal } from "lucide-react";
import StockMovementDialog from "@/components/inventory/StockMovementDialog";

export default function InventoryItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeOrg } = useWorkspace();
  const { items, movements, invalidate } = useInventory();
  const w = inventoryWording(activeOrg?.type);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultType, setDefaultType] = useState("stock_in");

  const item = items.find((i) => i.id === id);
  const itemMovements = useMemo(() => movements.filter((m) => m.item_id === id), [movements, id]);

  if (!item) {
    return (
      <div className="space-y-4">
        <Link to="/inventory" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-navy"><ChevronLeft className="w-4 h-4" /> Back</Link>
        <p className="text-sm text-muted-foreground py-10 text-center">Item not found.</p>
      </div>
    );
  }

  const qty = Number(item.current_quantity) || 0;
  const low = Number(item.low_stock_level) || 0;
  const status = qty <= 0 ? "out_of_stock" : qty <= low ? "low_stock" : "in_stock";

  const statusBadge = () => {
    if (status === "out_of_stock") return <Badge variant="destructive">Out of stock</Badge>;
    if (status === "low_stock") return <Badge className="bg-status-warn/15 text-status-warn border-status-warn/30">Low stock</Badge>;
    return <Badge className="bg-status-ok/15 text-status-ok border-status-ok/30">In stock</Badge>;
  };

  const openMovement = (type) => {
    setDefaultType(type);
    setDialogOpen(true);
  };

  const removeItem = async () => {
    if (!confirm(`Delete "${item.name}" and all its stock movements?`)) return;
    try {
      for (const m of itemMovements) {
        await base44.entities.StockMovement.delete(m.id);
      }
      await base44.entities.InventoryItem.delete(item.id);
      await invalidate();
      navigate("/inventory");
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  };

  const movementIcon = (t) => {
    if (t === "stock_in") return <ArrowDownCircle className="w-4 h-4 text-status-ok" />;
    if (t === "stock_out") return <ArrowUpCircle className="w-4 h-4 text-status-bad" />;
    return <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />;
  };
  const movementQty = (m) => (m.type === "stock_out" ? -Number(m.quantity) : Number(m.quantity));

  return (
    <div className="space-y-4">
      <Link to="/inventory" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-navy"><ChevronLeft className="w-4 h-4" /> {w.shopLabel}</Link>

      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">{item.name}</h1>
          <p className="text-sm text-muted-foreground">{item.sku || "—"} · {item.category || "—"}{item.supplier_name ? ` · ${item.supplier_name}` : ""}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/inventory/${item.id}/edit`}><Button variant="outline" className="h-11"><Pencil className="w-4 h-4" /> Edit</Button></Link>
          <Button variant="outline" className="h-11 text-status-bad" onClick={removeItem}><Trash2 className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Stock summary */}
      <Card><CardContent className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-3xl font-bold text-brand-navy">{qty}</div>
              <div className="text-xs text-muted-foreground">current stock</div>
            </div>
            {statusBadge()}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div className="text-muted-foreground">Cost price</div><div className="text-right font-medium">{formatCurrency(item.cost_price, activeOrg?.currency)}</div>
            <div className="text-muted-foreground">Selling price</div><div className="text-right font-medium">{formatCurrency(item.selling_price, activeOrg?.currency)}</div>
            <div className="text-muted-foreground">Low-stock level</div><div className="text-right font-medium">{low}</div>
            <div className="text-muted-foreground">Stock value (cost)</div><div className="text-right font-medium">{formatCurrency(qty * (Number(item.cost_price) || 0), activeOrg?.currency)}</div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button className="h-11" onClick={() => openMovement("stock_in")}><Plus className="w-4 h-4" /> Stock In</Button>
          <Button variant="outline" className="h-11" onClick={() => openMovement("stock_out")}>Stock Out</Button>
          <Button variant="outline" className="h-11" onClick={() => openMovement("adjustment")}>Adjustment</Button>
        </div>
      </CardContent></Card>

      {/* Movement history */}
      <div>
        <h2 className="text-lg font-semibold text-brand-navy mb-2">Stock Movements</h2>
        {itemMovements.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center bg-card rounded-xl border border-border">No movements recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {itemMovements.map((m) => (
              <div key={m.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
                {movementIcon(m.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">{m.type.replace("_", " ")}</span>
                    <span className={`text-sm font-semibold ${movementQty(m) >= 0 ? "text-status-ok" : "text-status-bad"}`}>
                      {movementQty(m) >= 0 ? "+" : ""}{movementQty(m)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{m.date}{m.reference ? ` · ${m.reference}` : ""}{m.note ? ` · ${m.note}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <StockMovementDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={invalidate}
        item={item}
        defaultType={defaultType}
      />
    </div>
  );
}