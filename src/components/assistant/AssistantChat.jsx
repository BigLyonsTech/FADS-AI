import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Trash2 } from "lucide-react";
import AssistantMessage from "@/components/assistant/AssistantMessage";
import AssistantSuggestions from "@/components/assistant/AssistantSuggestions";
import FadsRobotLoader from "@/components/FadsRobotLoader";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";

export default function AssistantChat({ conversation, suggestions, asking, onAsk, onClear, orgName, dataMode }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  const messages = conversation?.messages || [];
  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, asking]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || asking) return;
    onAsk(input);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-[300px]">
        {!hasMessages && !asking && (
          <div className="text-center py-6 space-y-3">
            <div className="flex justify-center">
              <FadsRobotAvatar size="lg" />
            </div>
            <div>
              <p className="text-lg font-medium">Hi, I'm FADS.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ask me what's happening in your organisation, what needs attention, or what you should do next.
              </p>
            </div>
            <div className="max-w-lg mx-auto">
              <AssistantSuggestions suggestions={suggestions} onPick={onAsk} />
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <AssistantMessage key={i} message={msg} />
        ))}

        {asking && (
          <div className="rounded-2xl border bg-card/60">
            <FadsRobotLoader compact message="FADS AI IS THINKING..." />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t pt-3 space-y-2">
        {hasMessages && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={onClear} disabled={asking}>
              <Trash2 className="w-3 h-3" /> Clear conversation
            </Button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances, staff, meetings, contacts…"
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
            disabled={asking}
          />
          <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={!input.trim() || asking}>
            {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}