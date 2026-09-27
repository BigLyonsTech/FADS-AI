import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2, Copy, Check, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { insertLink } from "@/lib/affiliateResources";

// Personalise with FADS — reuses the existing assistant InvokeLLM infrastructure
// (personalise_resource action) to adapt an approved resource for a specific
// audience the affiliate describes. The affiliate reviews the result before
// using it. Never auto-sends. Grounded in real FADS features only.
export default function PersonaliseResourceDialog({ open, onClose, originalText, referralLink }) {
  const [context, setContext] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [linkAdded, setLinkAdded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setContext("");
      setResult("");
      setError("");
      setCopied(false);
      setLinkAdded(false);
    }
  }, [open]);

  const handlePersonalise = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("assistant", {
        action: "personalise_resource",
        original_text: originalText,
        context: context.trim(),
      });
      if (res.error) throw new Error(res.error);
      setResult(res.message || "");
    } catch (e) {
      setError(e.message || "FADS couldn't personalise this. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const display = linkAdded && referralLink ? insertLink(result, referralLink) : result;

  const handleCopy = () => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    toast({ title: "Copied", description: "Ready to paste" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-brand-teal" /> Personalise with FADS
          </DialogTitle>
          <DialogDescription>
            Tell FADS who you're speaking to and it'll adapt the message for you. Review the result before sharing.
          </DialogDescription>
        </DialogHeader>

        {!result && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">Who are you speaking to?</Label>
              <Textarea
                className="text-sm"
                rows={3}
                placeholder="e.g. I'm talking to a small beauty salon in Lagos."
                value={context}
                onChange={(e) => setContext(e.target.value)}
              />
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Original message:</p>
              <p className="text-xs text-brand-navy whitespace-pre-wrap max-h-32 overflow-y-auto">{originalText}</p>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <DialogFooter>
              <Button className="w-full h-11 gap-1.5" onClick={handlePersonalise} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? "FADS is adapting it…" : "Personalise with FADS"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <p className="text-sm text-brand-navy whitespace-pre-wrap break-words leading-relaxed bg-brand-mint/30 rounded-lg p-3 max-h-64 overflow-y-auto">
              {display}
            </p>
            <p className="text-xs text-muted-foreground">
              FADS adapted this from the approved original. Review it before sharing — only share what you're happy with.
            </p>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button className="w-full h-11 gap-1.5" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copied" : "Copy"}
              </Button>
              <div className="flex gap-2 w-full">
                {referralLink && (
                  <Button
                    variant={linkAdded ? "secondary" : "outline"}
                    className="flex-1 h-10 gap-1.5"
                    onClick={() => setLinkAdded((v) => !v)}
                  >
                    {linkAdded ? "Link added" : "Add My Link"}
                  </Button>
                )}
                <Button variant="ghost" className="flex-1 h-10" onClick={() => setResult("")}>
                  Try again
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}