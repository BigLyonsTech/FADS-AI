// FADS Smart Stock — pure FE computation over existing InventoryItem +
// StockMovement records. No new entities, no backend calls. All predictions
// are labelled as estimates based on recorded FADS data.

const DAY = 86400000;

function num(n) {
  return Number(n) || 0;
}

function parseDate(s) {
  if (!s) return null;
  const d = s.length === 10 ? new Date(s + "T00:00:00") : new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// Per-item sales velocity + stockout prediction from stock_out movements.
function itemVelocity(item, movements) {
  const now = Date.now();
  const outs = movements.filter(
    (m) => m.item_id === item.id && m.type === "stock_out"
  );
  const outs90 = outs.filter((m) => {
    const d = parseDate(m.date);
    return d && now - d.getTime() <= 90 * DAY;
  });
  const totalSold90 = outs90.reduce((s, m) => s + num(m.quantity), 0);
  const avgDailyOut = totalSold90 / 90;
  const qty = num(item.current_quantity);
  let daysToStockout = null;
  if (avgDailyOut > 0) daysToStockout = Math.floor(qty / avgDailyOut);
  const lastSaleDate = outs.length
    ? outs.map((m) => m.date).sort().reverse()[0]
    : null;
  const daysSinceLastSale = lastSaleDate
    ? Math.floor((now - parseDate(lastSaleDate).getTime()) / DAY)
    : null;
  return {
    avgDailyOut: Math.round(avgDailyOut * 100) / 100,
    totalSold90,
    daysToStockout,
    lastSaleDate,
    daysSinceLastSale,
  };
}

// Suggested reorder quantity: bring stock up to cover ~30 days of sales,
// but at least to the low-stock level × 2. Never negative.
function suggestedReorder(item, vel) {
  const qty = num(item.current_quantity);
  const low = num(item.low_stock_level);
  const target = Math.max(low * 2, vel.avgDailyOut * 30, low);
  return Math.max(0, Math.ceil(target - qty));
}

// Full Smart Stock picture for an organisation's inventory.
export function computeSmartStock(items, movements) {
  const active = items.filter((i) => i.is_active !== false);
  const rows = active.map((item) => {
    const vel = itemVelocity(item, movements);
    const qty = num(item.current_quantity);
    const low = num(item.low_stock_level);
    let status = "in_stock";
    if (qty <= 0) status = "out_of_stock";
    else if (qty <= low) status = "low_stock";
    return {
      id: item.id,
      name: item.name,
      sku: item.sku || "",
      category: item.category || "",
      quantity: qty,
      low_stock_level: low,
      status,
      ...vel,
      reorderQty: suggestedReorder(item, vel),
    };
  });

  const withSales = rows.filter((r) => r.totalSold90 > 0);
  const fastestSelling = [...withSales]
    .sort((a, b) => b.totalSold90 - a.totalSold90)
    .slice(0, 5);

  const deadStock = rows
    .filter((r) => r.daysSinceLastSale !== null && r.daysSinceLastSale >= 90)
    .sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale)
    .slice(0, 5);

  const runningLow = rows
    .filter((r) => r.status === "low_stock" || r.status === "out_of_stock")
    .sort((a, b) => (a.daysToStockout ?? 999) - (b.daysToStockout ?? 999))
    .slice(0, 10);

  const hasEnoughHistory = withSales.length >= 2;

  return {
    fastestSelling,
    deadStock,
    runningLow,
    hasEnoughHistory,
    totalItems: active.length,
  };
}