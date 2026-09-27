import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import { getAuditIntro } from "@/lib/contentWording";
import {
  Loader2, FileSearch, CheckCircle2, AlertTriangle, Lightbulb,
  Sparkles, ChevronRight, Star,
} from "lucide-react";

const PLATFORMS = ["Facebook", "Instagram", "LinkedIn", "TikTok", "X (Twitter)", "YouTube"];
const FREQUENCIES = ["Daily", "A few times a week", "Weekly", "A few times a month", "Rarely"];

export default function SocialMediaAudit({ onCreateFromAudit }) {
  const { activeOrg } = useWorkspace();
  const orgType = activeOrg?.type || "small_business";

  const [platforms, setPlatforms] = useState([]);
  const [profileBio, setProfileBio] = useState("");
  const [recentPosts, setRecentPosts] = useState("");
  const [postFrequency, setPostFrequency] = useState("");
  const [auditing, setAuditing] = useState(false);
  const [error, setError] = useState("");
  const [audit, setAudit] = useState(null);

  const togglePlatform = (p) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const handleAudit = async () => {
    if (!profileBio.trim() && !recentPosts.trim()) {
      setError("Tell me your profile bio or paste a few recent posts so I can review them.");
      return;
    }
    setAuditing(true);
    setError("");
    try {
      const res = await base44.functions.invoke("assistant", {
        action: "audit_social_media",
        organisation_id: activeOrg?.id,
        audit_input: {
          platforms,
          profile_bio: profileBio.trim(),
          recent_posts: recentPosts.trim(),
          post_frequency: postFrequency,
        },
      });
      setAudit(res.audit);
    } catch (e) {
      setError(e.message || "I couldn't complete your audit. Please try again.");
    } finally {
      setAuditing(false);
    }
  };

  const scoreColor = (score) => {
    if (score >= 70) return "text-status-ok";
    if (score >= 40) return "text-status-warn";
    return "text-status-bad";
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="bg-brand-navy text-white border-0 overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col items-center text-center gap-4">
            <FadsRobotAvatar size="md" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">AUDIT MY SOCIAL MEDIA</h2>
              <p className="text-white/70 text-sm mt-1">{getAuditIntro(orgType)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Input form */}
      {!audit && (
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-5">
            {/* Platforms */}
            <div>
              <label className="text-sm font-medium text-brand-navy mb-2 block">Which platforms do you use?</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`px-3 py-2 rounded-full text-sm border transition-colors min-h-touch ${
                      platforms.includes(p)
                        ? "bg-brand-teal text-white border-brand-teal"
                        : "bg-transparent text-muted-foreground border-border hover:border-brand-teal"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Posting frequency */}
            <div>
              <label className="text-sm font-medium text-brand-navy mb-2 block">How often do you post?</label>
              <div className="flex flex-wrap gap-2">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f}
                    onClick={() => setPostFrequency(f === postFrequency ? "" : f)}
                    className={`px-3 py-2 rounded-full text-sm border transition-colors min-h-touch ${
                      postFrequency === f
                        ? "bg-brand-teal text-white border-brand-teal"
                        : "bg-transparent text-muted-foreground border-border hover:border-brand-teal"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Profile bio */}
            <div>
              <label className="text-sm font-medium text-brand-navy mb-2 block">Your profile bio</label>
              <textarea
                className="w-full rounded-md border border-input bg-transparent p-3 text-sm min-h-20"
                placeholder="Paste your social media bio or 'About' section here…"
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
              />
            </div>

            {/* Recent posts */}
            <div>
              <label className="text-sm font-medium text-brand-navy mb-2 block">A few of your recent posts</label>
              <textarea
                className="w-full rounded-md border border-input bg-transparent p-3 text-sm min-h-32"
                placeholder={"Paste 2-3 recent post captions or descriptions here…\n\nExample:\n1. Join us this Sunday for worship at 10am!\n2. Thank you to everyone who came to our fundraiser.\n3. Don't forget — school closes Friday at 12pm."}
                value={recentPosts}
                onChange={(e) => setRecentPosts(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This is a Profile / Content Review based on what you tell me — not connected analytics. I won't invent follower counts or engagement rates.
              </p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <Button
                size="lg"
                className="h-12 gap-2 bg-brand-teal hover:bg-brand-teal/90 text-white min-h-touch px-8"
                onClick={handleAudit}
                disabled={auditing}
              >
                {auditing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Reviewing your social media…</>
                ) : (
                  <><FileSearch className="w-5 h-5" /> Audit My Social Media</>
                )}
              </Button>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit result */}
      {audit && (
        <div className="space-y-4">
          {/* Score */}
          <Card className="border-brand-teal/30">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-lg font-bold text-brand-navy">FADS SOCIAL MEDIA AUDIT</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Profile / Content Review</p>
                </div>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${scoreColor(audit.overall_score)}`}>
                    {audit.overall_score}
                    <span className="text-lg text-muted-foreground">/100</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Doing well */}
          {audit.doing_well?.length > 0 && (
            <Card>
              <CardContent className="p-5 space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-status-ok">
                  <CheckCircle2 className="w-4 h-4" /> What you're doing well
                </h4>
                <ul className="space-y-1.5">
                  {audit.doing_well.map((item, i) => (
                    <li key={i} className="text-sm text-brand-navy flex items-start gap-2">
                      <span className="text-status-ok mt-0.5">•</span> {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Needs attention */}
          {audit.needs_attention?.length > 0 && (
            <Card>
              <CardContent className="p-5 space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-status-warn">
                  <AlertTriangle className="w-4 h-4" /> What needs attention
                </h4>
                <ul className="space-y-1.5">
                  {audit.needs_attention.map((item, i) => (
                    <li key={i} className="text-sm text-brand-navy flex items-start gap-2">
                      <span className="text-status-warn mt-0.5">•</span> {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Biggest opportunity */}
          {audit.biggest_opportunity && (
            <Card className="bg-brand-mint/40 border-brand-teal/20">
              <CardContent className="p-5">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-brand-teal mb-1">
                  <Lightbulb className="w-4 h-4" /> Your biggest opportunity
                </h4>
                <p className="text-sm text-brand-navy">{audit.biggest_opportunity}</p>
              </CardContent>
            </Card>
          )}

          {/* Next steps */}
          {audit.next_steps?.length > 0 && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
                  <Sparkles className="w-4 h-4 text-brand-teal" /> Do these 3 things next
                </h4>
                {audit.next_steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                    <div className="w-7 h-7 rounded-full bg-brand-teal/10 text-brand-teal flex items-center justify-center text-sm font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-brand-navy">{step.action}</p>
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 mt-2"
                        onClick={() => onCreateFromAudit?.(step)}
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Create this for me
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setAudit(null)}>
              Start a new audit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}