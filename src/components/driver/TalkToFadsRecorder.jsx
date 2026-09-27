import React from "react";
import { useFadsMoneyCapture } from "@/lib/useFadsMoneyCapture";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import MoneyItemCard from "@/components/finance/MoneyItemCard";
import { Loader2, Mic, Sparkles, CheckCircle, X, Square } from "lucide-react";

// Talk to FADS to record money — a CORE driver experience. The user (safely
// parked) types natural language ("I earned €280 today and spent €45 on fuel").
// FADS parses it into structured income/expense items for review. Nothing is
// created until the user approves each item. On approval, items are created
// via the EXISTING finance create_transaction action — no duplicate Finance
// system. Driver safety wording is shown throughout.
//
// The capture/interpretation logic lives in the shared useFadsMoneyCapture
// hook (reused by the FADS Voice Player). Wording is overridable so the same
// conversational money engine can be reused by Self-Employed Home without
// duplicating the component.
export default function TalkToFadsRecorder({
  placeholder, safetyNote, emptyHint, reviewNote,
} = {}) {
  const {
    text, setText, parsing, items, note, adding, transcript, voiceBusy,
    recorder, micSupported, currency, incomeCats, expenseCats, accounts,
    toggleMic, parse, updateItem, removeItem, addAll,
    ph, safety, review,
  } = useFadsMoneyCapture({ placeholder, safetyNote, emptyHint, reviewNote });

  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-brand-teal" />
        <h2 className="font-semibold text-brand-navy">Talk to FADS to record money</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Tell FADS what you earned and spent in your own words. FADS prepares it for you to review — nothing is added until you approve.
      </p>
      <Textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={ph}
        disabled={parsing}
      />
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Button onClick={parse} disabled={parsing || !text.trim()} className="bg-brand-navy hover:bg-brand-navy/90 h-11 gap-2">
          {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
          {parsing ? "FADS is reading…" : "Tell FADS"}
        </Button>
        {micSupported && (
          <Button
            onClick={toggleMic}
            disabled={voiceBusy || parsing}
            variant={recorder.recording ? "destructive" : "outline"}
            className="h-11 gap-2"
          >
            {voiceBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : recorder.recording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {voiceBusy ? "Transcribing…" : recorder.recording ? "Stop & transcribe" : "Speak to FADS"}
          </Button>
        )}
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          {safety}
        </p>
      </div>

      {transcript && (
        <div className="rounded-lg bg-muted/40 border border-border p-3 text-sm text-brand-navy">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">FADS heard</p>
          <p className="italic">“{transcript}”</p>
        </div>
      )}

      {note && !items?.length && (
        <div className="rounded-lg bg-brand-mint/60 border border-brand-teal/20 p-3 text-sm text-brand-navy">
          {note}
        </div>
      )}

      {items && items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="w-3.5 h-3.5 text-status-ok" />
            FADS prepared {items.length} record{items.length === 1 ? "" : "s"}. Review and add what's right.
          </div>
          {items.map((it, i) => (
            <MoneyItemCard
              key={i}
              item={it}
              index={i}
              currency={currency}
              incomeCats={incomeCats}
              expenseCats={expenseCats}
              accounts={accounts}
              onUpdate={updateItem}
              onRemove={removeItem}
            />
          ))}
          <div className="flex flex-col gap-2">
            <Button onClick={addAll} disabled={adding} className="bg-brand-teal text-brand-navy hover:bg-brand-teal/90 h-11 gap-2">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {adding ? "Adding…" : "Review & Add"}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              {review}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}