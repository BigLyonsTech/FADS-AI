import React from "react";
import { Link } from "react-router-dom";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import { MessageCircle, Share2, Mic, Sparkles, Users, ChevronRight } from "lucide-react";

// Help Me Promote FADS — connects to the EXISTING FADS AI Assistant via
// /assistant?q=<prompt> deep-links. Outputs are DRAFTS only — the assistant
// never auto-sends. The affiliate's referral link is included in draft
// prompts where appropriate.
export default function HelpMePromoteFads({ referralLink }) {
  const fullUrl = referralLink
    ? `${window.location.origin}${referralLink.url_path.replace("/signup", "/register")}`
    : "";

  const prompts = [
    {
      label: "Write me a WhatsApp message",
      icon: MessageCircle,
      q: `Write a short, friendly WhatsApp message introducing FADS AI Business Suite to a small business owner. Keep it under 100 words and conversational. End with my referral link: ${fullUrl}`,
    },
    {
      label: "Write me a social post",
      icon: Share2,
      q: `Write a short social media post about FADS AI Business Suite. Mention it helps small businesses with finance, HR, CRM and AI assistance. End with my referral link: ${fullUrl}`,
    },
    {
      label: "Give me a 30-second FADS pitch",
      icon: Mic,
      q: "Give me a 30-second spoken pitch for FADS AI Business Suite I can use when talking to a business owner face to face.",
    },
    {
      label: "Explain FADS simply",
      icon: Sparkles,
      q: "Explain FADS AI Business Suite simply in 3 sentences. What is it and who is it for?",
    },
    {
      label: "Who should I introduce FADS to?",
      icon: Users,
      q: "Who should I introduce FADS AI Business Suite to? List 5 types of businesses or organisations that would benefit most, with a one-line reason for each.",
    },
  ];

  return (
    <div id="promote" className="space-y-3 scroll-mt-4">
      <div className="flex items-center gap-2">
        <FadsRobotAvatar size="sm" />
        <h2 className="text-lg font-bold text-brand-navy">Help Me Promote FADS</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        FADS can draft messages for you. These are drafts — review them before sending.
      </p>
      <div className="space-y-2">
        {prompts.map((p) => (
          <Link
            key={p.label}
            to={`/assistant?q=${encodeURIComponent(p.q)}`}
            className="flex items-center justify-between bg-card rounded-xl border border-border p-3.5 hover:border-brand-teal transition-colors min-h-touch"
          >
            <span className="flex items-center gap-2.5 text-sm font-medium text-brand-navy min-w-0">
              <p.icon className="w-4 h-4 text-brand-teal shrink-0" /> {p.label}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}