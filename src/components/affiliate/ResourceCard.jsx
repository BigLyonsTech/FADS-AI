import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Wand2, Link2, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { insertLink } from "@/lib/affiliateResources";

// A single affiliate resource card. Shows the copy and three actions:
// Copy, Personalise with FADS, and Add My Link (toggles the real link in).
export default function ResourceCard({ title, body, audience, typeLabel, referralLink, onPersonalise, featured }) {
  const [linkAdded, setLinkAdded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const hasLink = body.includes("[MY FADS LINK]");
  const display = linkAdded && referralLink ? insertLink(body, referralLink) : body;

  const handleCopy = () => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    toast({ title: "Copied", description: "Ready to paste wherever you're sharing" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-card rounded-xl border p-4 space-y-3 ${featured ? "border-brand-teal/40 ring-1 ring-brand-teal/20" : "border-border"}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-medium text-sm text-brand-navy">{title}</h3>
        <div className="flex items-center gap-1 flex-wrap">
          {audience && <Badge variant="outline" className="text-xs capitalize">{audience}</Badge>}
          {typeLabel && <Badge variant="secondary" className="text-xs">{typeLabel}</Badge>}
          {featured && <Badge className="text-xs bg-brand-teal text-white gap-1"><Check className="w-3 h-3" /> Featured</Badge>}
        </div>
      </div>
      <div className="text-sm text-brand-navy whitespace-pre-wrap break-words leading-relaxed bg-muted/30 rounded-lg p-3 max-h-64 overflow-y-auto">
        {display}
      </div>
      <div className="flex flex-col gap-2">
        <Button className="w-full h-10 gap-1.5" onClick={handleCopy}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <div className="flex gap-2">
          {onPersonalise && (
            <Button variant="outline" className="flex-1 h-10 gap-1.5" onClick={onPersonalise}>
              <Wand2 className="w-4 h-4 text-brand-teal" /> Personalise
            </Button>
          )}
          {hasLink && (
            <Button
              variant={linkAdded ? "secondary" : "outline"}
              className="flex-1 h-10 gap-1.5"
              onClick={() => setLinkAdded((v) => !v)}
              disabled={!referralLink}
            >
              <Link2 className="w-4 h-4" /> {linkAdded ? "Link added" : "Add My Link"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}