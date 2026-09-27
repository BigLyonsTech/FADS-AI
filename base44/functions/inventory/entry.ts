import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { getOrgConfig, assertOrgWritable } from "../../shared/finance.ts";
import { getActiveMembership } from "../../shared/workspace.ts";
import { recomputeQuantity, buildDemoInventory } from "../../shared/inventory.ts";

// One shared Inventory engine for all workspace types. Stock is always
// derived from StockMovement records (current_quantity is recomputed here
// on every movement so the frontend can read a single live figure). All
// actions require the caller to be an active member of the target org.
//
// Actions:
//   add_movement     Create a stock_in / stock_out / adjustment movement,
//                    recompute the item's current_quantity, return both.
//   delete_movement  Remove a movement and recompute the item's quantity.
//   seed_demo        Seed fictional demo items + movements for a demo org.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { action, organisation_id } = body;
    const svc = base44.asServiceRole;

    if (!organisation_id) {
      return Response.json({ error: "Missing organisation_id" }, { status: 400 });
    }

    // Any active member of the org may manage inventory.
    const membership = await getActiveMembership(svc, user.id, organisation_id);
    if (!membership) {
      return Response.json({ error: "Not authorised for this organisation" }, { status: 403 });
    }

    if (action === "add_movement") {
      const { item_id, type, quantity, date, reference, note } = body;
      if (!item_id) return Response.json({ error: "Missing item_id" }, { status: 400 });
      if (!["stock_in", "stock_out", "adjustment"].includes(type)) {
        return Response.json({ error: "Invalid movement type" }, { status: 400 });
      }
      const q = Number(quantity);
      if (isNaN(q) || q === 0) return Response.json({ error: "Quantity must be a non-zero number" }, { status: 400 });
      if (!date) return Response.json({ error: "Date is required" }, { status: 400 });

      const item = await svc.entities.InventoryItem.get(item_id);
      if (!item || item.organisation_id !== organisation_id) {
        return Response.json({ error: "Item not found" }, { status: 404 });
      }
      const org = await getOrgConfig(svc, organisation_id);
      assertOrgWritable(org);

      const movement = await svc.entities.StockMovement.create({
        organisation_id,
        item_id,
        item_name: item.name,
        type,
        quantity: q,
        date,
        reference: reference || "",
        note: note || "",
        data_mode: item.data_mode,
      });

      const movements = await svc.entities.StockMovement.filter({ item_id }, "-date", 5000);
      const current_quantity = recomputeQuantity(movements);
      const updated = await svc.entities.InventoryItem.update(item_id, { current_quantity });
      return Response.json({ ok: true, movement, item: updated });
    }

    if (action === "delete_movement") {
      const { movement_id } = body;
      if (!movement_id) return Response.json({ error: "Missing movement_id" }, { status: 400 });
      const m = await svc.entities.StockMovement.get(movement_id);
      if (!m || m.organisation_id !== organisation_id) {
        return Response.json({ error: "Movement not found" }, { status: 404 });
      }
      const item_id = m.item_id;
      await svc.entities.StockMovement.delete(movement_id);
      const movements = await svc.entities.StockMovement.filter({ item_id }, "-date", 5000);
      const current_quantity = recomputeQuantity(movements);
      const updated = await svc.entities.InventoryItem.update(item_id, { current_quantity });
      return Response.json({ ok: true, item: updated });
    }

    if (action === "seed_demo") {
      const org = await getOrgConfig(svc, organisation_id);
      if (org.data_mode !== "demo") {
        return Response.json({ error: "Demo seed is only available for demo organisations" }, { status: 400 });
      }
      const existing = await svc.entities.InventoryItem.filter({ organisation_id, data_mode: "demo" }, undefined, 1);
      if (existing.length > 0) {
        return Response.json({ ok: true, seeded: false, message: "Demo inventory already exists" });
      }
      const seed = buildDemoInventory(org.type);
      const idByKey: Record<string, string> = {};
      for (const it of seed.items) {
        const created = await svc.entities.InventoryItem.create({
          organisation_id,
          name: it.name,
          sku: it.sku,
          category: it.category,
          supplier_name: it.supplier_name,
          cost_price: it.cost_price,
          selling_price: it.selling_price,
          low_stock_level: it.low_stock_level,
          is_active: true,
          current_quantity: 0,
          data_mode: "demo",
        });
        idByKey[it.key] = created.id;
      }
      const today = new Date();
      const iso = (days: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() - days);
        return d.toISOString().slice(0, 10);
      };
      for (const mv of seed.movements) {
        const itemName = seed.items.find((i) => i.key === mv.itemKey)?.name || "";
        await svc.entities.StockMovement.create({
          organisation_id,
          item_id: idByKey[mv.itemKey],
          item_name: itemName,
          type: mv.type,
          quantity: mv.quantity,
          date: iso(mv.daysAgo),
          reference: mv.reference || "",
          note: mv.note || "",
          data_mode: "demo",
        });
      }
      for (const it of seed.items) {
        const movements = await svc.entities.StockMovement.filter({ item_id: idByKey[it.key] }, "-date", 5000);
        await svc.entities.InventoryItem.update(idByKey[it.key], { current_quantity: recomputeQuantity(movements) });
      }
      return Response.json({ ok: true, seeded: true, count: seed.items.length });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const status = error.message === "Not authorised for this organisation" ? 403 : 500;
    return Response.json({ error: error.message }, { status });
  }
}