import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useInventory } from "@/lib/useInventory";
import { inventoryWording } from "@/lib/inventoryWording";
import { useDataMode } from "@/lib/useDataMode";
import { formatCurrency } from "@/lib/currencyFormat";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, AlertTriangle, PackageX, Boxes, Sparkles, Loader2, Mic } from "lucide-react";
import SmartStockCard from "@/components/inventory/SmartStockCard";
import BeginnerGuide from "@/components/BeginnerGuide";
import BackToFinance from "@/components/finance/BackToFinance";

export default function InventoryHome() {
  const { activeOrg } = useWorkspace();
  const { items, movements, loading, reload, invalidate } = useInventory();
  const { isDemoMode } = useDataMode();
  const w = inventoryWording(activeOrg?.type);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [seeding, setSeeding] = useState(false);
  const micSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    !!navigator.mediaDevices.getUserMedia &&
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined";

  const stats = useMemo(() => {
    const active = items.filter((i) => i.is_active !== false);
    const qty = (i) => Number(i.current_quantity) || 0;
    const low = (i) => Number(i.low_stock_level) || 0;
    return {
      total: active.length,
      inStock: active.filter((i) => qty(i) > 0).length,
      lowStock: active.filter((i) => qty(i) > 0 && qty(i) <= low(i)).length,
      outStock: active.filter((i) => qty(i) <= 0).length,
      costValue: active.reduce((s, i) => s + qty(i) * (Number(i.cost_price) || 0), 0),
      sellingValue: active.reduce((s, i) => s + qty(i) * (Number(i.selling_price) || 0), 0),
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (q && !(`${i.name} ${i.sku || ""} ${i.category || ""}`.toLowerCase().includes(q))) return false;
      const qty = Number(i.current_quantity) || 0;
      const low = Number(i.low_stock_level) || 0;
      let s = "in_stock";
      if (qty <= 0) s = "out_of_stock";
      else if (qty <= low) s = "low_stock";
      if (statusFilter !== "all" && statusFilter !== s) return false;
      return true;
    });
  }, [items, search, statusFilter]);

  const seedDemo = async () => {
    setSeeding(true);
    try {
      await base44.functions.invoke("inventory", {
        action: "seed_demo",
        organisation_id: activeOrg.id,
      });
      await invalidate();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setSeeding(false);
    }
  };

  const statusBadge = (i) => {
    const qty = Number(i.current_quantity) || 0;
    const low = Number(i.low_stock_level) || 0;
    if (qty <= 0) return <Badge variant="destructive">Out of stock</Badge>;
    if (qty <= low) return <Badge className="bg-status-warn/15 text-status-warn border-status-warn/30">Low stock</Badge>;
    return <Badge className="bg-status-ok/15 text-status-ok border-status-ok/30">In stock</Badge>;
  };

  return (
    <div className="space-y-5">
      <BackToFinance />
      <BeginnerGuide
        module="inventory"
        orgType={activeOrg?.type}
        onAction={(action) => {
          if (action === "filter_low") setStatusFilter("low_stock");
          else if (action === "filter_out") setStatusFilter("out_of_stock");
        }}
      />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">{w.shopLabel}</h1>
          <p className="text-sm text-muted-foreground">{activeOrg?.name} · {activeOrg?.currency} · {isDemoMode ? "Demo" : "Live"}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {micSupported && (
            <Link to="/inventory/new?speak=1">
              <Button variant="outline" className="h-11 gap-1.5"><Mic className="w-4 h-4" /> Speak an Item</Button>
            </Link>
          )}
          <Link to="/inventory/new">
            <Button className="h-11"><Plus className="w-4 h-4" /> New {w.itemNoun}</Button>
          </Link>
          <Link to="/finance/reports">
            <Button variant="outline" className="h-11">Reports</Button>
          </Link>
        </div>
      </div>

      {/* Dashboard stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Stat icon={Boxes} label="Total items" value={stats.total} />
        <Stat icon={Package} label="In stock" value={stats.inStock} />
        <Stat icon={AlertTriangle} label="Low stock" value={stats.lowStock} accent="warn" />
        <Stat icon={PackageX} label="Out of stock" value={stats.outStock} accent="bad" />
        <MoneyStat label="Inventory value (cost)" value={formatCurrency(stats.costValue, activeOrg?.currency)} />
      </div>

      {/* Smart Stock insights */}
      {!loading && items.length > 0 && (
        <SmartStockCard items={items} movements={movements} currency={activeOrg?.currency} />
      )}

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${w.itemPlural.toLowerCase()}…`} className="pl-9" />
        </div>
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1 overflow-x-auto">
          {[
            { v: "all", l: "All" },
            { v: "in_stock", l: "In stock" },
            { v: "low_stock", l: "Low" },
            { v: "out_of_stock", l: "Out" },
          ].map((s) => (
            <button
              key={s.v}
              onClick={() => setStatusFilter(s.v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                statusFilter === s.v ? "bg-brand-navy text-white" : "text-muted-foreground"
              }`}
            >
              {s.l}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 text-center"><Loader2 className="w-8 h-8 animate-spin text-brand-teal mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center space-y-3">
          <Package className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No {w.itemPlural.toLowerCase()} yet.</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Link to="/inventory/new"><Button className="h-11"><Plus className="w-4 h-4" /> Add your first {w.itemNoun.toLowerCase()}</Button></Link>
            {micSupported && (
              <Link to="/inventory/new?speak=1"><Button variant="outline" className="h-11"><Mic className="w-4 h-4" /> Speak a {w.itemNoun.toLowerCase()}</Button></Link>
            )}
            <Link to="/getting-started?guide=1"><Button variant="ghost" className="h-11">I’m not sure — guide me</Button></Link>
            {isDemoMode && (
              <Button variant="outline" className="h-11" onClick={seedDemo} disabled={seeding}>
                {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Load demo {w.itemPlural.toLowerCase()}
              </Button>
            )}
          </div>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((i) => (
            <Link key={i.id} to={`/inventory/${i.id}`} className="block">
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-brand-navy truncate">{i.name}</p>
                      <p className="text-xs text-muted-foreground">{i.sku || "—"} · {i.category || "—"}</p>
                    </div>
                    {statusBadge(i)}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-bold text-brand-navy">{Number(i.current_quantity) || 0}</div>
                      <div className="text-xs text-muted-foreground">in stock</div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground space-y-0.5">
                      <div>Cost {formatCurrency(i.cost_price, activeOrg?.currency)}</div>
                      <div className="text-brand-navy font-medium">Sell {formatCurrency(i.selling_price, activeOrg?.currency)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }) {
  const color = accent === "warn" ? "text-status-warn" : accent === "bad" ? "text-status-bad" : "text-brand-navy";
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <Icon className={`w-4 h-4 mb-1 ${accent === "warn" ? "text-status-warn" : accent === "bad" ? "text-status-bad" : "text-brand-teal"}`} />
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function MoneyStat({ label, value }) {
  return (
    <div className="bg-brand-mint border border-brand-mint rounded-xl p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold text-brand-navy">{value}</div>
    </div>
  );
}