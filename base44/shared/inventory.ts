// Shared inventory helpers for the Inventory module.
// Pure computation runs server-side (service-role) so stock figures are
// always derived from StockMovement records. Org-type-aware wording mirrors
// the client-side src/lib/inventoryWording.js.

const round2 = (n: number) => Math.round(n * 100) / 100;

// Recompute current stock on hand from a list of movements.
// stock_in: +qty, stock_out: -qty, adjustment: +qty (may be negative).
export function recomputeQuantity(movements: any[]): number {
  const qty = movements.reduce((sum, m) => {
    const q = Number(m.quantity) || 0;
    if (m.type === "stock_in") return sum + q;
    if (m.type === "stock_out") return sum - q;
    if (m.type === "adjustment") return sum + q;
    return sum;
  }, 0);
  return round2(qty);
}

// Inventory valuation + status summary. Used by the dashboard and the
// Reports Centre inventory report. Items are the InventoryItem records for
// one organisation (already org-isolated by the caller).
export function computeInventorySummary(items: any[]) {
  const active = items.filter((i) => i.is_active !== false);
  const qty = (i: any) => Number(i.current_quantity) || 0;
  const cost = (i: any) => Number(i.cost_price) || 0;
  const sell = (i: any) => Number(i.selling_price) || 0;
  const low = (i: any) => Number(i.low_stock_level) || 0;

  const inStock = active.filter((i) => qty(i) > 0);
  const lowStock = active.filter((i) => qty(i) > 0 && qty(i) <= low(i));
  const outStock = active.filter((i) => qty(i) <= 0);

  const costValue = round2(active.reduce((s, i) => s + qty(i) * cost(i), 0));
  const sellingValue = round2(active.reduce((s, i) => s + qty(i) * sell(i), 0));

  const rows = active
    .map((i) => {
      const q = qty(i);
      const l = low(i);
      let status = "in_stock";
      if (q <= 0) status = "out_of_stock";
      else if (q <= l) status = "low_stock";
      return {
        id: i.id,
        name: i.name,
        sku: i.sku || "",
        category: i.category || "",
        quantity: round2(q),
        low_stock_level: round2(l),
        cost_price: round2(cost(i)),
        selling_price: round2(sell(i)),
        cost_value: round2(q * cost(i)),
        selling_value: round2(q * sell(i)),
        status,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    totalItems: active.length,
    inStockCount: inStock.length,
    lowStockCount: lowStock.length,
    outOfStockCount: outStock.length,
    costValue,
    sellingValue,
    potentialProfit: round2(sellingValue - costValue),
    rows,
  };
}

// Org-type-aware wording. Mirrors src/lib/inventoryWording.js.
export function inventoryWording(orgType: string) {
  switch (orgType) {
    case "school":
      return {
        itemNoun: "Item",
        itemPlural: "Items",
        itemsLabel: "Uniforms, Books & Supplies",
        shopLabel: "School Shop",
      };
    case "church":
      return {
        itemNoun: "Item",
        itemPlural: "Items",
        itemsLabel: "Books & Resources",
        shopLabel: "Church Shop",
      };
    case "university":
      return {
        itemNoun: "Item",
        itemPlural: "Items",
        itemsLabel: "Books & Merchandise",
        shopLabel: "Store",
      };
    default:
      return {
        itemNoun: "Product",
        itemPlural: "Products",
        itemsLabel: "Products & Stock",
        shopLabel: "Inventory",
      };
  }
}

// Demo-only seed data. Fictional items + movements. Only used when
// org.data_mode === "demo" and no demo inventory exists yet.
export function buildDemoInventory(orgType: string) {
  const examples: Record<string, any[]> = {
    small_business: [
      { key: "p1", name: "Widget A", sku: "WID-001", category: "Products", supplier_name: "Acme Supplies", cost_price: 8, selling_price: 15, low_stock_level: 10 },
      { key: "p2", name: "Widget B", sku: "WID-002", category: "Products", supplier_name: "Acme Supplies", cost_price: 12, selling_price: 22, low_stock_level: 8 },
      { key: "p3", name: "Service Part", sku: "SVP-010", category: "Parts", supplier_name: "TechParts Ltd", cost_price: 5, selling_price: 9, low_stock_level: 5 },
      { key: "p4", name: "Accessory Pack", sku: "ACC-100", category: "Accessories", supplier_name: "GlobalSource", cost_price: 3, selling_price: 7, low_stock_level: 12 },
    ],
    school: [
      { key: "s1", name: "School Blazer", sku: "UNI-BLR", category: "Uniform", supplier_name: "UniformCo", cost_price: 18, selling_price: 35, low_stock_level: 10 },
      { key: "s2", name: "Maths Textbook Yr 5", sku: "BK-MTH5", category: "Books", supplier_name: "BookWorld Supplies", cost_price: 6, selling_price: 12, low_stock_level: 15 },
      { key: "s3", name: "Exercise Book Pack", sku: "BK-EXC", category: "Supplies", supplier_name: "BookWorld Supplies", cost_price: 2, selling_price: 5, low_stock_level: 30 },
      { key: "s4", name: "P.E. Kit", sku: "UNI-PE", category: "Uniform", supplier_name: "UniformCo", cost_price: 10, selling_price: 20, low_stock_level: 8 },
    ],
    church: [
      { key: "c1", name: "Hymn Book", sku: "BK-HYM", category: "Books", supplier_name: "FaithPress", cost_price: 4, selling_price: 9, low_stock_level: 20 },
      { key: "c2", name: "Devotional Guide", sku: "BK-DEV", category: "Books", supplier_name: "FaithPress", cost_price: 3, selling_price: 7, low_stock_level: 15 },
      { key: "c3", name: "Branded Mug", sku: "MRCH-MUG", category: "Merchandise", supplier_name: "GiftWorks", cost_price: 5, selling_price: 12, low_stock_level: 10 },
      { key: "c4", name: "Sermon USB Pack", sku: "RES-USB", category: "Resources", supplier_name: "MediaTech", cost_price: 6, selling_price: 14, low_stock_level: 8 },
    ],
    university: [
      { key: "u1", name: "Course Textbook", sku: "BK-CRS", category: "Books", supplier_name: "AcademicPress", cost_price: 20, selling_price: 38, low_stock_level: 12 },
      { key: "u2", name: "Lab Coat", sku: "SUP-LAB", category: "Supplies", supplier_name: "LabGear Co", cost_price: 12, selling_price: 25, low_stock_level: 10 },
      { key: "u3", name: "University Hoodie", sku: "MRCH-HOD", category: "Merchandise", supplier_name: "CampusWear", cost_price: 14, selling_price: 30, low_stock_level: 15 },
      { key: "u4", name: "Stationery Pack", sku: "SUP-STA", category: "Supplies", supplier_name: "OfficeSupplies", cost_price: 5, selling_price: 11, low_stock_level: 20 },
    ],
  };
  const items = examples[orgType] || examples.small_business;
  const movements = [
    { itemKey: items[0].key, type: "stock_in", quantity: 50, daysAgo: 20, reference: "Opening stock", note: "Initial delivery" },
    { itemKey: items[0].key, type: "stock_out", quantity: 12, daysAgo: 5, reference: "Counter sale", note: "" },
    { itemKey: items[1].key, type: "stock_in", quantity: 40, daysAgo: 18, reference: "Opening stock", note: "Initial delivery" },
    { itemKey: items[1].key, type: "stock_out", quantity: 33, daysAgo: 2, reference: "Class set", note: "" },
    { itemKey: items[2].key, type: "stock_in", quantity: 60, daysAgo: 15, reference: "Opening stock", note: "" },
    { itemKey: items[3].key, type: "stock_in", quantity: 8, daysAgo: 10, reference: "Opening stock", note: "Small delivery" },
  ];
  return { items, movements };
}