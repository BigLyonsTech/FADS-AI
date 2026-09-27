import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useFinanceOfficer } from "@/lib/useFinanceOfficer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bot,
  Send,
  Trash2,
  Mic,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import OfficerMessage from "@/components/officer/OfficerMessage";
import OfficerSuggestions from "@/components/officer/OfficerSuggestions";
import OfficerContextBar from "@/components/officer/OfficerContextBar";

export default function FinanceOfficer() {
  const { activeOrg, loading: wsLoading } = useWorkspace();
  const {
    conversation,
    status,
    suggestions,
    accounts,
    loading,
    asking,
    error,
    filters,
    setFilters,
    ask,
    deleteConversation,
  } = useFinanceOfficer(activeOrg);

  const [input, setInput] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const messages = conversation?.messages || [];
  const showSuggestions = messages.length <= 2 && !asking;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, asking]);

  const handleSend = () => {
    const q = input.trim();
    if (!q || asking || !status?.is_enabled) return;
    setInput("");
    ask(q);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    await deleteConversation();
    setConfirmDelete(false);
  };

  if (wsLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal mb-3" />
        <p className="text-sm text-muted-foreground">Loading Finance Officer…</p>
      </div>
    );
  }

  if (!activeOrg) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Select an organisation to start chatting with the Finance Officer.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-11rem)] md:h-[calc(100dvh-7rem)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand-teal flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-brand-navy" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-brand-navy truncate">Finance Officer</h1>
            <p className="text-xs text-muted-foreground truncate">
              {activeOrg.name} · {activeOrg.currency}
              {status && (
                <span className={`ml-1.5 ${status.is_enabled ? "text-status-ok" : "text-status-bad"}`}>
                  · {status.is_enabled ? `${status.remaining}/${status.allowance} questions left` : "Unavailable"}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowContext(!showContext)}
            className="h-8 text-xs"
          >
            {showContext ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Filters
          </Button>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className={`h-8 text-xs ${confirmDelete ? "text-status-bad" : "text-muted-foreground"}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {confirmDelete ? "Confirm?" : ""}
            </Button>
          )}
        </div>
      </div>

      {/* Context bar (collapsible) */}
      {showContext && (
        <div className="mb-3">
          <OfficerContextBar filters={filters} setFilters={setFilters} accounts={accounts} />
        </div>
      )}

      {/* Disabled banner */}
      {status && !status.is_enabled && (
        <div className="bg-status-warn/10 border border-status-warn/30 rounded-xl p-3 mb-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-status-warn shrink-0 mt-0.5" />
          <p className="text-xs text-status-warn">{status.reason || "The Finance Officer is currently unavailable."}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 mb-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto space-y-4 pb-2 scrollbar-hide"
      >
        {messages.length === 0 && !asking && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-brand-teal/20 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-7 h-7 text-brand-teal" />
            </div>
            <h2 className="text-base font-semibold text-brand-navy mb-1">
              Hi! I'm your Finance Officer
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Ask me anything about your {activeOrg.type === "school" ? "fees" : activeOrg.type === "church" ? "tithes and offerings" : "sales"} and expenses.
              I'll analyse your verified records and cite my sources.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <OfficerMessage key={i} message={msg} />
        ))}

        {asking && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-teal flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-brand-navy" />
            </div>
            <div className="bg-card rounded-2xl rounded-bl-md border border-border px-4 py-3">
              <div className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-teal" />
                <span className="text-xs text-muted-foreground">Analysing your records…</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && status?.is_enabled && (
        <div className="pb-2">
          <OfficerSuggestions suggestions={suggestions} onAsk={ask} disabled={asking} />
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-border pt-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={status?.is_enabled ? "Ask about your finances…" : "Finance Officer unavailable"}
              disabled={!status?.is_enabled || asking}
              className="h-11 pr-10 text-sm rounded-xl"
            />
            <button
              type="button"
              disabled
              title="Voice input coming soon"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || asking || !status?.is_enabled}
            size="icon"
            className="h-11 w-11 rounded-xl shrink-0"
          >
            {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Informational only — not professional accounting, tax, legal or investment advice.
        </p>
      </div>
    </div>
  );
}