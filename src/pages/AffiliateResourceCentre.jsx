import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAffiliate } from "@/lib/useAffiliate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, ArrowLeft, Copy, Check, Link2, Sparkles, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  AUDIENCES, CHANNELS, GETTING_STARTED_STEPS, TALKING_TO,
  SOCIAL_POSTS, EMAILS, MESSAGES, FEATURED, SOCIAL_TYPES, insertLink,
} from "@/lib/affiliateResources";
import ResourceCard from "@/components/affiliate/ResourceCard";
import PersonaliseResourceDialog from "@/components/affiliate/PersonaliseResourceDialog";
import AffiliateGraphics from "@/components/affiliate/AffiliateGraphics";
import AffiliateSharingGuide from "@/components/affiliate/AffiliateSharingGuide";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";

const TABS = [
  { key: "start", label: "Getting Started" },
  { key: "business", label: "Business" },
  { key: "school", label: "School" },
  { key: "church", label: "Church" },
  { key: "social", label: "Social Posts" },
  { key: "emails", label: "Emails & Messages" },
  { key: "graphics", label: "Graphics" },
  { key: "link", label: "My Affiliate Link" },
];

export default function AffiliateResourceCentre() {
  const { data, loading, error } = useAffiliate();
  const [tab, setTab] = useState("start");
  const [personalise, setPersonalise] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const { toast } = useToast();

  // Guided "FADS Experience" flow
  const [flowAudience, setFlowAudience] = useState("");
  const [flowChannel, setFlowChannel] = useState("");

  const profile = data?.profile;
  const referralLink = data?.referralLink;
  const fullUrl = referralLink
    ? `${window.location.origin}${referralLink.url_path.replace("/signup", "/register")}`
    : "";

  const copyLink = () => {
    if (!fullUrl) return;
    navigator.clipboard.writeText(fullUrl);
    setLinkCopied(true);
    toast({ title: "Link copied", description: "Your FADS affiliate link is ready to share" });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-destructive/10 rounded-xl p-6 text-center">
        <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
        <p className="text-destructive">{error}</p>
        <Link to="/affiliate"><Button variant="outline" className="mt-4">Back to Affiliate Centre</Button></Link>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-4 py-12">
        <FadsRobotAvatar size="md" />
        <h1 className="text-xl font-bold text-brand-navy">FADS Affiliate Resource Centre</h1>
        <p className="text-sm text-muted-foreground">
          You need an active affiliate account to access the Resource Centre. Apply from the Affiliate Centre first.
        </p>
        <Link to="/affiliate"><Button className="bg-brand-teal text-brand-navy hover:bg-brand-teal/90">Go to Affiliate Centre</Button></Link>
      </div>
    );
  }

  // Guided flow results (plain computation — no hook, so early returns above are safe)
  const flowResults = (() => {
    if (!flowAudience || !flowChannel) return [];
    if (flowChannel === "social") return SOCIAL_POSTS.filter((p) => p.audience === flowAudience);
    if (flowChannel === "email") {
      const t = TALKING_TO[flowAudience];
      const list = [];
      if (t?.email) list.push({ _title: t.email.subject, _body: `${t.email.subject}\n\n${t.email.body}`, _audience: flowAudience, _type: "Email" });
      list.push(...EMAILS.filter((e) => e.audience === flowAudience || e.audience === "general").map((e) => ({ _title: e.title, _body: `Subject: ${e.subject}\n\n${e.body}`, _audience: e.audience, _type: "Email" })));
      return list;
    }
    // whatsapp + dm
    return MESSAGES.filter((m) => m.audience === flowAudience);
  })();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Back link */}
      <Link to="/affiliate" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-teal">
        <ArrowLeft className="w-4 h-4" /> Affiliate Centre
      </Link>

      {/* Hero */}
      <div className="bg-brand-navy text-white rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center gap-3">
        <FadsRobotAvatar size="md" />
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">FADS AFFILIATE RESOURCE CENTRE</h1>
        <p className="text-white/80 text-sm max-w-xl">
          Everything you need to confidently introduce FADS to businesses, schools and churches.
        </p>
        <p className="text-white/60 text-sm max-w-xl">
          Choose who you're speaking to and FADS will give you simple words, posts and messages you can use.
        </p>
      </div>

      {/* The FADS Experience — guided flow */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-teal" />
          <h2 className="font-semibold text-brand-navy">Who do you want to tell about FADS?</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.filter((a) => a.key !== "general").map((a) => (
            <button
              key={a.key}
              onClick={() => { setFlowAudience(a.key); setFlowChannel(""); }}
              className={`px-4 py-2.5 rounded-full text-sm border min-h-touch ${flowAudience === a.key ? "bg-brand-teal text-brand-navy border-brand-teal" : "bg-transparent text-muted-foreground border-border"}`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {flowAudience && (
          <>
            <p className="text-sm font-medium text-brand-navy pt-1">How do you want to tell them?</p>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setFlowChannel(c.key)}
                  className={`px-4 py-2.5 rounded-full text-sm border min-h-touch ${flowChannel === c.key ? "bg-brand-navy text-white border-brand-navy" : "bg-transparent text-muted-foreground border-border"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </>
        )}

        {flowAudience && flowChannel && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">Here's something you can use:</p>
            {flowResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ready-made resources for this combination yet — try another option.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {flowResults.slice(0, 4).map((r, i) => (
                  <ResourceCard
                    key={i}
                    title={r._title || r.title}
                    body={r._body || r.body}
                    audience={r._audience || r.audience}
                    typeLabel={r._type || (r.type ? r.type.replace(/_/g, " ") : "")}
                    referralLink={fullUrl}
                    onPersonalise={() => setPersonalise(r._body || r.body)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap border min-h-touch ${tab === t.key ? "bg-brand-teal text-brand-navy border-brand-teal" : "bg-card text-muted-foreground border-border"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "start" && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="font-semibold text-brand-navy mb-3">How to introduce FADS</h2>
            <ol className="space-y-3">
              {GETTING_STARTED_STEPS.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-brand-teal text-brand-navy font-bold text-sm flex items-center justify-center shrink-0">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-brand-navy">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-lg bg-brand-mint/40 border border-brand-teal/20 p-3">
              <p className="text-sm text-brand-navy">
                <strong>Remember:</strong> Don't spam people. Share FADS where it's genuinely useful and be transparent that you may earn a referral commission.
              </p>
            </div>
          </div>
          <AffiliateSharingGuide />
        </div>
      )}

      {tab === "business" && <AudienceTab audience="business" referralLink={fullUrl} onPersonalise={setPersonalise} />}
      {tab === "school" && <AudienceTab audience="school" referralLink={fullUrl} onPersonalise={setPersonalise} />}
      {tab === "church" && <AudienceTab audience="church" referralLink={fullUrl} onPersonalise={setPersonalise} />}

      {tab === "social" && (
        <div className="space-y-3">
          <h2 className="font-semibold text-brand-navy">Social Posts</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {SOCIAL_POSTS.map((p, i) => (
              <ResourceCard
                key={i}
                title={p.title}
                body={p.body}
                audience={p.audience}
                typeLabel={p.type.replace(/_/g, " ")}
                referralLink={fullUrl}
                onPersonalise={() => setPersonalise(p.body)}
              />
            ))}
          </div>
        </div>
      )}

      {tab === "emails" && (
        <div className="space-y-5">
          <div className="space-y-3">
            <h2 className="font-semibold text-brand-navy">Emails</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {EMAILS.map((e) => (
                <ResourceCard
                  key={e.id}
                  title={e.title}
                  body={`Subject: ${e.subject}\n\n${e.body}`}
                  audience={e.audience}
                  typeLabel="Email"
                  referralLink={fullUrl}
                  onPersonalise={() => setPersonalise(`Subject: ${e.subject}\n\n${e.body}`)}
                />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="font-semibold text-brand-navy">WhatsApp & DM Messages</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {MESSAGES.map((m, i) => (
                <ResourceCard
                  key={i}
                  title={m.title}
                  body={m.body}
                  audience={m.audience}
                  typeLabel={m.type.replace(/_/g, " ")}
                  referralLink={fullUrl}
                  onPersonalise={() => setPersonalise(m.body)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "graphics" && <AffiliateGraphics referralLink={fullUrl} />}

      {tab === "link" && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-brand-teal" />
              <h2 className="font-semibold text-brand-navy">My FADS Affiliate Link</h2>
            </div>
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-3">
              <span className="text-sm text-brand-navy truncate flex-1">{fullUrl || "No link available"}</span>
            </div>
            <Button className="w-full h-11 gap-1.5" onClick={copyLink} disabled={!fullUrl}>
              {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {linkCopied ? "Copied" : "Copy Link"}
            </Button>
            {profile.affiliate_code && (
              <p className="text-xs text-muted-foreground text-center">Your code: <span className="font-mono font-medium text-brand-navy">{profile.affiliate_code}</span></p>
            )}
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-semibold text-brand-navy mb-2">Featured This Week</h3>
            <div className="space-y-2">
              {FEATURED.map((f, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-navy">{f.title}</p>
                    <Badge variant="outline" className="text-xs capitalize mt-1">{f.audience}</Badge>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => { navigator.clipboard.writeText(insertLink(f.body, fullUrl)); toast({ title: "Copied" }); }}>
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <PersonaliseResourceDialog
        open={!!personalise}
        onClose={() => setPersonalise(null)}
        originalText={personalise || ""}
        referralLink={fullUrl}
      />
    </div>
  );
}

// Per-audience tab: talking-to intros + social posts + messages + email
function AudienceTab({ audience, referralLink, onPersonalise }) {
  const t = TALKING_TO[audience];
  const posts = SOCIAL_POSTS.filter((p) => p.audience === audience);
  const msgs = MESSAGES.filter((m) => m.audience === audience);
  const aud = AUDIENCES.find((a) => a.key === audience);
  return (
    <div className="space-y-5">
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <h2 className="font-semibold text-brand-navy">Talking to a {aud?.label}</h2>
        <p className="text-sm text-muted-foreground">{t?.intro}</p>
        <div className="grid sm:grid-cols-2 gap-3 pt-1">
          <ResourceCard title="Short Introduction" body={t.short} audience={audience} referralLink={referralLink} onPersonalise={() => onPersonalise(t.short)} />
          <ResourceCard title="Social Post" body={t.social} audience={audience} referralLink={referralLink} onPersonalise={() => onPersonalise(t.social)} />
          <ResourceCard title="WhatsApp Message" body={t.whatsapp} audience={audience} referralLink={referralLink} onPersonalise={() => onPersonalise(t.whatsapp)} />
          <ResourceCard title="DM" body={t.dm} audience={audience} referralLink={referralLink} onPersonalise={() => onPersonalise(t.dm)} />
          {t.email && (
            <ResourceCard title="Email" body={`Subject: ${t.email.subject}\n\n${t.email.body}`} audience={audience} typeLabel="Email" referralLink={referralLink} onPersonalise={() => onPersonalise(`Subject: ${t.email.subject}\n\n${t.email.body}`)} />
          )}
          {audience === "school" && t.admin_intro && (
            <ResourceCard title="School Administrator Introduction" body={t.admin_intro} audience={audience} referralLink={referralLink} onPersonalise={() => onPersonalise(t.admin_intro)} />
          )}
          {audience === "church" && t.starter && (
            <ResourceCard title="Conversation Starter" body={t.starter} audience={audience} referralLink={referralLink} onPersonalise={() => onPersonalise(t.starter)} />
          )}
        </div>
      </div>

      {posts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-brand-navy">More {aud?.label} Social Posts</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {posts.map((p, i) => (
              <ResourceCard key={i} title={p.title} body={p.body} audience={p.audience} typeLabel={p.type.replace(/_/g, " ")} referralLink={referralLink} onPersonalise={() => onPersonalise(p.body)} />
            ))}
          </div>
        </div>
      )}

      {msgs.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-brand-navy">{aud?.label} Messages</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {msgs.map((m, i) => (
              <ResourceCard key={i} title={m.title} body={m.body} audience={m.audience} typeLabel={m.type.replace(/_/g, " ")} referralLink={referralLink} onPersonalise={() => onPersonalise(m.body)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}