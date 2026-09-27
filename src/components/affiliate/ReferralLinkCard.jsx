import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Share2, MousePointerClick, Link2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ReferralLinkCard({ link, profile }) {
  if (!link) return null;
  const fullUrl = `${window.location.origin}${link.url_path.replace('/signup', '/register')}`;

  const copyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    toast({ title: "Link copied", description: "Referral link copied to clipboard" });
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join FADS AI Business Suite", url: fullUrl });
      } catch {}
    } else {
      copyLink();
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="w-5 h-5 text-brand-teal" />
        <h3 className="font-semibold text-brand-navy">Your Referral Link</h3>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input readOnly value={fullUrl} className="flex-1 font-mono text-sm" />
        <div className="flex gap-2">
          <Button onClick={copyLink} size="default" className="min-h-touch">
            <Copy className="w-4 h-4" /> Copy
          </Button>
          <Button onClick={shareLink} variant="outline" size="default" className="min-h-touch">
            <Share2 className="w-4 h-4" /> Share
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <MousePointerClick className="w-4 h-4" /> {link.visit_count || 0} visits
        </span>
        <span>
          Code: <strong className="text-brand-navy font-mono">{profile.affiliate_code}</strong>
        </span>
      </div>
    </div>
  );
}