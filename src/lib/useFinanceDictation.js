import { useVoiceDictation } from "@/lib/useVoiceDictation";

// Thin wrapper around the shared voice-dictation hook for the Finance
// transaction form. Kept as its own export so TransactionForm's import is
// unchanged. See useVoiceDictation for the full implementation.
export function useFinanceDictation({ autoStart, onParsed } = {}) {
  return useVoiceDictation({
    action: "dictate_transaction",
    resultKey: "transaction",
    autoStart,
    onParsed,
  });
}