import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, PackageX, AlertTriangle, Sparkles } from "lucide-react";
import { computeSmartStock } from "@/lib/inventoryIntelligence";

// FADS Smart Stock insights card. Renders fastest-selling, dead stock and
// low-stock predictions from existing InventoryItem + StockMovement data.
// All predictions are labelled as estimates.
export default function SmartStockCard({ items, movements, currency = "" }) {
  const insights = useMemo(
    () => computeSmartStock(items, movements),
    [items, movements]
  );

  if (!insights.hasEnoughHistory || insights.totalItems === 0) {
    return (
      <Card>
        <CardContent className="p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-brand-teal shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            Smart Stock insights appear once you have a few weeks of stock
            movement recorded. Keep logging stock in/out and predictions will
            show here.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-teal" /> Smart Stock Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {insights.fastestSelling.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-status-ok" /> Fastest-selling
            </div>
            <div className="space-y-1">
              {insights.fastestSelling.map((r) => (
                <div key={r.id} className="flex justify-between text-xs">
                  <span className="truncate">{r.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {r.totalSold90} sold (90d)
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights.deadStock.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
              <PackageX className="w-3.5 h-3.5 text-status-warn" /> Slow / dead stock
            </div>
            <div className="space-y-1">
              {insights.deadStock.map((r) => (
                <div key={r.id} className="flex justify-between text-xs">
                  <span className="truncate">{r.name}</span>
                  <span className="text-muted-foreground">
                    No sale in {r.daysSinceLastSale}d
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights.runningLow.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-status-bad" /> Running low
            </div>
            <div className="space-y-1">
              {insights.runningLow.map((r) => (
                <div key={r.id} className="flex justify-between text-xs gap-2">
                  <span className="truncate">{r.name}</span>
                  <span className="text-muted-foreground shrink-0 text-right">
                    {r.quantity} left
                    {r.daysToStockout != null && r.daysToStockout < 60
                      ? ` · ~${r.daysToStockout}d`
                      : ""}
                    {r.reorderQty > 0 ? ` · reorder ${r.reorderQty}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground italic">
          Estimates based on recorded FADS stock movements. Not guaranteed.
        </p>
      </CardContent>
    </Card>
  );
}