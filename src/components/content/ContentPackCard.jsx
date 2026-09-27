import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, RefreshCw, Loader2, Pencil, Check as CheckIcon } from "lucide-react";

// A single content card in the Content Pack. Shows generated text with
// Copy / Edit / Regenerate. Optional "Prepare" button for WhatsApp/Email
// handoff to the existing CRM communication flow.
export default function ContentPackCard({
  title,
  icon: Icon,
  content,
  onChange,
  onRegenerate,
  onPrepare,
  prepareLabel,
  accent = "brand-teal",
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content || "");
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    setDraft(content || "");
    setEditing(false);
  }, [content]);

  const copy = () => {
    navigator.clipboard.writeText(draft || content || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveEdit = () => {
    onChange?.(draft);
    setEditing(false);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {Icon && <Icon className={`w-4 h-4 text-${accent}`} />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        {editing ? (
          <textarea
            className="w-full rounded-md border border-input bg-transparent p-3 text-sm min-h-32 flex-1"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        ) : (
          <div className="whitespace-pre-wrap text-sm text-brand-navy flex-1 min-h-32">
            {content || <span className="text-muted-foreground italic">Not generated yet.</span>}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 min-h-touch" onClick={copy} disabled={!content}>
            {copied ? <Check className="w-3.5 h-3.5 text-status-ok" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          {editing ? (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 min-h-touch" onClick={saveEdit}>
              <CheckIcon className="w-3.5 h-3.5" /> Save
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 min-h-touch" onClick={() => setEditing(true)} disabled={!content}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 min-h-touch"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Regenerate
          </Button>
          {onPrepare && content && (
            <Button size="sm" className="h-8 gap-1.5 min-h-touch ml-auto" onClick={onPrepare}>
              {prepareLabel || "Prepare"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}