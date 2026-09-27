// Workspace-aware wording for the Inventory module.
// One shared inventory engine — labels/examples adapt to the workspace type.
// Mirrors the server wording in base44/shared/inventory.ts.

export function inventoryWording(orgType) {
  switch (orgType) {
    case "school":
      return {
        itemNoun: "Item",
        itemPlural: "Items",
        itemsLabel: "Uniforms, Books & Supplies",
        shopLabel: "School Shop",
        categoryExamples: ["Uniform", "Books", "Supplies", "Stationery"],
      };
    case "church":
      return {
        itemNoun: "Item",
        itemPlural: "Items",
        itemsLabel: "Books & Resources",
        shopLabel: "Church Shop",
        categoryExamples: ["Books", "Merchandise", "Resources"],
      };
    case "university":
      return {
        itemNoun: "Item",
        itemPlural: "Items",
        itemsLabel: "Books & Merchandise",
        shopLabel: "Store",
        categoryExamples: ["Books", "Supplies", "Merchandise"],
      };
    default:
      return {
        itemNoun: "Product",
        itemPlural: "Products",
        itemsLabel: "Products & Stock",
        shopLabel: "Inventory",
        categoryExamples: ["Products", "Parts", "Accessories", "Services"],
      };
  }
}