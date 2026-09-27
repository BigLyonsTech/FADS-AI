function num(value) {
  return Number(value) || 0;
}

function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function localDateFromIso(value) {
  return new Date(`${value}T00:00:00`);
}

function mondayOfWeek(now) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay();
  const offset = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - offset);
  return d;
}

function monthStart(now) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function dateRange(start, end) {
  const rows = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    rows.push(isoDate(cursor));
  }
  return rows;
}

export function buildSalesTrend(salesRows = [], range = "month", now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = monthStart(today);

  if (range === "today") start = today;
  if (range === "week") start = mondayOfWeek(today);

  const totalsByDate = new Map();
  for (const sale of salesRows) {
    if (!sale?.date) continue;
    const saleDate = localDateFromIso(sale.date);
    if (Number.isNaN(saleDate.getTime()) || saleDate < start || saleDate > today) continue;
    totalsByDate.set(sale.date, (totalsByDate.get(sale.date) || 0) + num(sale.amount));
  }

  return dateRange(start, today).map((date) => {
    const d = localDateFromIso(date);
    const label = range === "today"
      ? "Today"
      : range === "week"
        ? d.toLocaleDateString(undefined, { weekday: "short" })
        : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });

    return {
      date,
      label,
      sales: Math.round((totalsByDate.get(date) || 0) * 100) / 100,
    };
  });
}

export function deriveProductSales({
  directSales = [],
  invoiceSales = [],
  inventoryItems = [],
} = {}) {
  const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]));
  const grouped = new Map();

  const add = ({ itemId, quantity, salesValue, description, date }) => {
    if (!itemId) return;
    const qty = num(quantity);
    if (qty <= 0) return;

    const item = inventoryById.get(itemId);
    const current = grouped.get(itemId) || {
      inventory_item_id: itemId,
      name: item?.name || description || "Archived inventory item",
      sku: item?.sku || "",
      quantity_sold: 0,
      sales_value: 0,
      stock_remaining: item ? num(item.current_quantity) : null,
      last_sold_date: null,
    };

    current.quantity_sold += qty;
    current.sales_value += num(salesValue);
    if (date && (!current.last_sold_date || date > current.last_sold_date)) {
      current.last_sold_date = date;
    }
    grouped.set(itemId, current);
  };

  for (const transaction of directSales) {
    add({
      itemId: transaction.inventory_item_id,
      quantity: transaction.inventory_quantity,
      salesValue: transaction.amount,
      description: transaction.description,
      date: transaction.date,
    });
  }

  for (const invoice of invoiceSales) {
    for (const line of invoice.line_items || []) {
      add({
        itemId: line.inventory_item_id,
        quantity: line.quantity,
        salesValue: line.total,
        description: line.description,
        date: invoice.issue_date,
      });
    }
  }

  const products = [...grouped.values()]
    .map((row) => ({
      ...row,
      quantity_sold: Math.round(row.quantity_sold * 100) / 100,
      sales_value: Math.round(row.sales_value * 100) / 100,
    }))
    .sort((a, b) =>
      b.quantity_sold - a.quantity_sold ||
      b.sales_value - a.sales_value ||
      a.name.localeCompare(b.name)
    );

  return {
    products,
    topSellers: products.slice(0, 5),
    linkedItemCount: products.length,
  };
}
