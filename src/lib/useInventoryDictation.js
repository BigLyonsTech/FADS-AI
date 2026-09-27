import { useVoiceDictation } from "@/lib/useVoiceDictation";

// Thin wrapper around the shared voice-dictation hook for the Inventory item
// form. See useVoiceDictation for the full implementation.
export function useInventoryDictation({ autoStart, onParsed } = {}) {
  return useVoiceDictation({
    action: "dictate_inventory_item",
    resultKey: "item",
    autoStart,
    onParsed,
  });
}