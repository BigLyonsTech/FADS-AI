import React from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail, Tag, ArrowRight, Sparkles, X, CheckSquare, MessageSquare } from "lucide-react";

// Sticky bulk-action bar shown when contacts are selected in the contacts list.
// Provides: WhatsApp, Message, Email, Add label, Move stage, Create follow-up.
// ALL communication actions are review-first — nothing is sent automatically.
export default function BulkActionsBar({
  selectedCount, totalCount, onSelectAll, onClear, onWhatsApp, onDirectMessage, onEmail, onAddLabel, onMoveStage, onFollowUp,
}) {
  if (selectedCount === 0) return null;
  return (
    <div className="sticky bottom-3 z-30 bg-brand-navy text-white rounded-xl shadow-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <button onClick={onClear} className="p-1 rounded hover:bg-white/10 min-h-touch min-w-touch">
            <X className="w-4 h-4" />
          </button>
        </div>
        {onSelectAll && selectedCount < totalCount && (
          <button
            onClick={onSelectAll}
            className="text-xs text-brand-teal hover:underline flex items-center gap-1 min-h-touch"
          >
            <CheckSquare className="w-3.5 h-3.5" /> Select all ({totalCount})
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {onWhatsApp && (
          <Button size="sm" variant="secondary" className="h-9 gap-1.5 min-h-touch" onClick={onWhatsApp}>
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </Button>
        )}
        {onDirectMessage && (
          <Button size="sm" variant="secondary" className="h-9 gap-1.5 min-h-touch" onClick={onDirectMessage}>
            <MessageSquare className="w-4 h-4" /> Message
          </Button>
        )}
        {onEmail && (
          <Button size="sm" variant="secondary" className="h-9 gap-1.5 min-h-touch" onClick={onEmail}>
            <Mail className="w-4 h-4" /> Email
          </Button>
        )}
        {onFollowUp && (
          <Button size="sm" variant="secondary" className="h-9 gap-1.5 min-h-touch" onClick={onFollowUp}>
            <Sparkles className="w-4 h-4" /> Follow up
          </Button>
        )}
        {onAddLabel && (
          <Button size="sm" variant="secondary" className="h-9 gap-1.5 min-h-touch" onClick={onAddLabel}>
            <Tag className="w-4 h-4" /> Add label
          </Button>
        )}
        {onMoveStage && (
          <Button size="sm" variant="secondary" className="h-9 gap-1.5 min-h-touch" onClick={onMoveStage}>
            <ArrowRight className="w-4 h-4" /> Move stage
          </Button>
        )}
      </div>
      <p className="text-[11px] text-white/50">
        FADS will never send anything until you approve it.
      </p>
    </div>
  );
}