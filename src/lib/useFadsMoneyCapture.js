import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";
import { useFinance } from "@/lib/useFinance";
import { useToast } from "@/components/ui/use-toast";
import { useAudioRecorder } from "@/lib/useAudioRecorder";

// Shared conversational-money capture engine used by both the Driver FADS
// Voice Player and the Self-Employed TalkToFadsRecorder. This is the EXISTING
// working logic, extracted verbatim into a hook so neither UI duplicates it:
// microphone capture (useAudioRecorder), client-allowed upload, the assistant
// voice_money (Whisper + parse) and parse_money actions, item review/edit, and
// approval via the existing finance.create_transaction action. Nothing is
// added until the user approves. Wording is overridable per surface.
//
// Added for the Voice Player (presentation only — no logic change): retains
// the real recorded audio as an object URL for genuine playback, and exposes
// cancel/reset helpers.
export function useFadsMoneyCapture({
  placeholder, safetyNote, emptyHint, reviewNote,
} = {}) {
  const { activeOrg } = useWorkspace();
  const { dataMode } = useDataMode();
  const { accounts, categories, reload } = useFinance();
  const { toast } = useToast();
  const ph = placeholder || "e.g. I earned €280 in fares today and spent €45 on fuel";
  const safety = safetyNote || "Only use this when safely parked.";
  const empty = emptyHint || "I couldn't find any clear income or expenses in that. Try something like \"I earned €280 in fares and spent €45 on fuel\".";
  const review = reviewNote || "I've prepared that for you. Review it when you're safely parked.";

  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [items, setItems] = useState(null);
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const recorder = useAudioRecorder();
  const micSupported = typeof navigator !== "undefined" && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia && typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined";

  const orgId = activeOrg?.id;
  const currency = activeOrg?.currency || "";
  const incomeCats = categories.filter((c) => c.kind === "income");
  const expenseCats = categories.filter((c) => c.kind === "expense");

  const applyParsed = (parsed) => {
    const parsedItems = parsed.items || [];
    setTranscript(parsed.transcript || "");
    if (!parsedItems.length) {
      setItems([]);
      setNote(parsed.note || empty);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const withMeta = parsedItems.map((it) => {
      const list = it.direction === "in" ? incomeCats : expenseCats;
      const match = list.find(
        (c) => c.name.toLowerCase() === (it.category_name || "").toLowerCase()
      );
      return {
        direction: it.direction,
        amount: Number(it.amount) || 0,
        description: it.description || "",
        category_id: match?.id || "",
        category_name: it.category_name || "",
        payment_method: it.payment_method || "cash",
        account_id: accounts[0]?.id || "",
        date: today,
      };
    });
    setItems(withMeta);
  };

  const stopAndTranscribe = async () => {
    const blob = await recorder.stop();
    if (!blob || voiceBusy) return;
    // Retain the REAL recording for genuine playback (not faked).
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(blob));
    setVoiceBusy(true);
    setNote("");
    try {
      const file = new File([blob], "talk-to-fads.webm", { type: blob.type || "audio/webm" });
      const up = await base44.integrations.Core.UploadFile({ file });
      const uploadedUrl = up?.file_url;
      if (!uploadedUrl) throw new Error("Upload failed");
      const res = await base44.functions.invoke("assistant", {
        action: "voice_money",
        organisation_id: orgId,
        data_mode: dataMode,
        audio_url: uploadedUrl,
      });
      applyParsed(res.data || {});
    } catch (e) {
      toast({ title: "FADS couldn't transcribe that", description: e.message, variant: "destructive" });
    } finally {
      setVoiceBusy(false);
    }
  };

  const toggleMic = async () => {
    if (voiceBusy) return;
    if (recorder.recording) {
      await stopAndTranscribe();
    } else {
      setItems(null);
      setNote("");
      setTranscript("");
      if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
      try {
        await recorder.start();
      } catch (e) {
        toast({ title: "Microphone unavailable", description: "Type your message instead.", variant: "destructive" });
      }
    }
  };

  const cancelRecording = () => {
    recorder.cancel();
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
  };

  const reset = () => {
    setItems(null);
    setNote("");
    setTranscript("");
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
  };

  const parse = async () => {
    if (!text.trim() || parsing) return;
    setParsing(true);
    setNote("");
    try {
      const res = await base44.functions.invoke("assistant", {
        action: "parse_money",
        organisation_id: orgId,
        data_mode: dataMode,
        text: text.trim(),
      });
      applyParsed(res.data || {});
    } catch (e) {
      toast({ title: "FADS couldn't parse that", description: e.message, variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const updateItem = (i, patch) =>
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const removeItem = (i) => setItems((prev) => prev.filter((_, j) => j !== i));

  const addAll = async () => {
    const kept = (items || []).filter((it) => it.amount > 0 && it.account_id);
    if (!kept.length || adding) return;
    setAdding(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const it of kept) {
        try {
          await base44.functions.invoke("finance", {
            action: "create_transaction",
            organisation_id: orgId,
            data_mode: dataMode,
            direction: it.direction,
            account_id: it.account_id,
            category_id: it.category_id || null,
            amount: Number(it.amount),
            date: it.date,
            description: it.description,
            payment_method: it.payment_method,
            status: "cleared",
          });
          ok++;
        } catch {
          fail++;
        }
      }
      await reload();
      toast({
        title: `Added ${ok} record${ok === 1 ? "" : "s"}`,
        description: fail ? `${fail} failed — review and try again.` : "Your records are up to date.",
      });
      setText("");
      setItems(null);
      setNote("");
      setTranscript("");
      if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
    } finally {
      setAdding(false);
    }
  };

  return {
    text, setText, parsing, items, note, adding, transcript, voiceBusy, audioUrl,
    recorder, micSupported, orgId, currency, incomeCats, expenseCats, accounts,
    applyParsed, stopAndTranscribe, toggleMic, cancelRecording, reset, parse,
    updateItem, removeItem, addAll,
    ph, safety, empty, review,
  };
}