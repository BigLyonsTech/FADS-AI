import React from "react";
import { Link } from "react-router-dom";
import { FileText, Mic, MessageCircle, Share2, Link2, ChevronRight } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { generateUserGuidePDF } from "@/lib/userGuidePdf";

// Affiliate Resources — a simple resources area. Reuses the existing FADS
// User Guide PDF generator as the introductory brochure (no duplicate file
// created). Other resources deep-link to the existing FADS AI Assistant.
export default function AffiliateResources({ referralLink, profile }) {
  const fullUrl = referralLink
    ? `${window.location.origin}${referralLink.url_path.replace("/signup", "/register")}`
    : "";

  const copyLink = () => {
    if (!fullUrl) return;
    navigator.clipboard.writeText(fullUrl);
    toast({ title: "Link copied", description: "Your referral link is ready to share" });
  };

  const downloadBrochure = () => {
    generateUserGuidePDF({ name: "FADS AI Business Suite" });
    toast({ title: "Guide downloaded", description: "FADS Introductory Guide PDF saved" });
  };

  const resources = [
    { label: "FADS Introductory Guide (PDF)", icon: FileText, action: downloadBrochure, desc: "Download the FADS guide" },
    { label: "30-Second Pitch", icon: Mic, to: `/assistant?q=${encodeURIComponent("Give me a 30-second spoken pitch for FADS AI Business Suite.")}` },
    { label: "WhatsApp Introduction", icon: MessageCircle, to: `/assistant?q=${encodeURIComponent(`Write a short WhatsApp message introducing FADS. My referral link: ${fullUrl}`)}` },
    { label: "Social Post", icon: Share2, to: `/assistant?q=${encodeURIComponent(`Write a short social media post about FADS. My referral link: ${fullUrl}`)}` },
    { label: "My Referral Link", icon: Link2, action: copyLink, desc: profile?.affiliate_code ? `Code: ${profile.affiliate_code}` : "Copy link" },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-brand-navy">Affiliate Resources</h2>
      <div className="space-y-2">
        {resources.map((r) =>
          r.to ? (
            <Link
              key={r.label}
              to={r.to}
              className="flex items-center justify-between bg-card rounded-xl border border-border p-3.5 hover:border-brand-teal transition-colors min-h-touch"
            >
              <span className="flex items-center gap-2.5 text-sm font-medium text-brand-navy">
                <r.icon className="w-4 h-4 text-brand-teal" /> {r.label}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ) : (
            <button
              key={r.label}
              onClick={r.action}
              className="w-full flex items-center justify-between bg-card rounded-xl border border-border p-3.5 hover:border-brand-teal transition-colors min-h-touch text-left"
            >
              <span className="flex items-center gap-2.5 text-sm font-medium text-brand-navy min-w-0">
                <r.icon className="w-4 h-4 text-brand-teal shrink-0" />
                <span className="min-w-0">
                  {r.label}
                  {r.desc && <span className="block text-xs text-muted-foreground font-normal truncate">{r.desc}</span>}
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          )
        )}
      </div>
    </div>
  );
}