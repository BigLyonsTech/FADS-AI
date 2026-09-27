import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { Card, CardContent } from "@/components/ui/card";
import { workspaceTypeLabel } from "@/lib/workspaceTypes";
import { Button } from "@/components/ui/button";
import {
  Download, Upload, Sparkles, FileText, Compass, Check,
  Bot, LifeBuoy, ChevronRight, RotateCcw, ExternalLink,
} from "lucide-react";
import { GUIDE_SECTIONS } from "@/lib/userGuideContent";
import { generateUserGuidePDF } from "@/lib/userGuidePdf";
import { base44 } from "@/api/base44Client";
import GuidedTour from "@/components/GuidedTour";
import { TOURS } from "@/lib/tourContent";
import { useToast } from "@/components/ui/use-toast";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import HelpHero from "@/components/help/HelpHero";
import HowDoI from "@/components/help/HowDoI";
import QuickStart from "@/components/help/QuickStart";
import Troubleshooting from "@/components/help/Troubleshooting";

// Set this to the uploaded PDF URL to make the Introduction available to all users.
const INTRO_PDF_URL = "";

const SECTIONS = GUIDE_SECTIONS;

// Friendlier display descriptions for existing tours (does NOT modify tour
// infrastructure — just the help-centre presentation of it).
const TOUR_DESCRIPTIONS = {
  overview: "See what needs your attention.",
  finance: "Learn how to record money, invoices and receipts.",
  crm: "Learn how to manage customers and follow-ups.",
  hr: "Learn where your people records live.",
  inventory: "Learn how to track products and stock.",
  tax: "Learn how FADS helps organise your tax records.",
  transcribe: "Learn how to record and turn conversations into useful notes.",
};

const ASK_FADS_QUESTIONS = [
  "Where do I record an expense?",
  "How do I scan a receipt?",
  "What should I do first?",
  "What does business health mean?",
  "How do I import my contacts?",
  "What is Demo mode?",
  "How do I start using FADS?",
];

export default function HelpCentre() {
  const { activeOrg } = useWorkspace();
  const orgType = activeOrg?.type || "small_business";
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const active = params.get("section") || "welcome";
  const introRef = useRef(null);
  const [introUrl, setIntroUrl] = useState(
    INTRO_PDF_URL || (typeof localStorage !== "undefined" && localStorage.getItem("fads-intro-pdf-url")) || ""
  );
  const [activeTour, setActiveTour] = useState(null);

  // Auto-launch a tour when navigated with ?tour=<id>.
  useEffect(() => {
    const tourId = params.get("tour");
    if (tourId && TOURS[tourId]) {
      setActiveTour(TOURS[tourId]);
      const next = new URLSearchParams(params);
      next.delete("tour");
      setParams(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIntroUpload = async (file) => {
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      localStorage.setItem("fads-intro-pdf-url", file_url);
      setIntroUrl(file_url);
      toast({ title: "Introduction uploaded", description: "The brochure is now available to all users." });
    } catch (e) {
      toast({ title: "Upload failed", description: e.message || "", variant: "destructive" });
    }
  };

  const handleDownloadGuide = () => {
    toast({ title: "Generating User Guide…", description: "Your PDF will open in a new tab." });
    generateUserGuidePDF(activeOrg);
  };

  const handleShowMeAround = () => {
    setActiveTour(TOURS.overview);
  };

  const startTour = (tour) => {
    // Clear the "completed" flag so it's a fresh start, then launch.
    try {
      localStorage.removeItem(`fads-tour-completed-${tour.id}`);
    } catch {}
    setActiveTour(tour);
  };

  const sections = useMemo(
    () => SECTIONS.filter((s) => !s.orgTypes || s.orgTypes.includes(orgType)),
    [orgType]
  );
  const current = sections.find((s) => s.id === active) || sections[0];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <HelpHero onShowMeAround={handleShowMeAround} />

      {/* I'm new here */}
      <div id="new-here" className="space-y-3 scroll-mt-4">
        <div className="flex items-center gap-2">
          <FadsRobotAvatar size="sm" />
          <h2 className="text-lg font-bold text-brand-navy">I'm new here</h2>
        </div>
        <div className="flex items-start gap-2 bg-brand-teal/5 rounded-xl p-3">
          <FadsRobotAvatar size="sm" className="shrink-0" />
          <p className="text-sm text-brand-navy">
            &ldquo;Welcome! You don't need to learn everything today. Let's start with what you need.&rdquo;
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <a href="#how-do-i" className="flex items-center justify-between bg-card rounded-xl border border-border p-3.5 hover:border-brand-teal transition-colors min-h-touch">
            <span className="text-sm font-medium text-brand-navy">Show me the basics</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </a>
          <Link to="/getting-started" className="flex items-center justify-between bg-card rounded-xl border border-border p-3.5 hover:border-brand-teal transition-colors min-h-touch">
            <span className="text-sm font-medium text-brand-navy">Set up my business</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          <Link to="/settings" className="flex items-center justify-between bg-card rounded-xl border border-border p-3.5 hover:border-brand-teal transition-colors min-h-touch">
            <span className="text-sm font-medium text-brand-navy">Understand Demo vs Live</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          <button onClick={handleShowMeAround} className="flex items-center justify-between bg-card rounded-xl border border-border p-3.5 hover:border-brand-teal transition-colors min-h-touch text-left">
            <span className="text-sm font-medium text-brand-navy">Take the Home tour</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {["finance", "crm", "hr", "transcribe"].map((id) => (
            <Button key={id} variant="outline" className="h-11 gap-1.5 min-h-touch" onClick={() => startTour(TOURS[id])}>
              <Compass className="w-4 h-4 text-brand-teal" /> {TOURS[id].name.replace(" Tour", "")}
            </Button>
          ))}
        </div>
      </div>

      {/* How do I...? */}
      <HowDoI />

      {/* Ask FADS */}
      <div id="ask-fads" className="space-y-3 scroll-mt-4">
        <div className="flex items-center gap-2">
          <FadsRobotAvatar size="sm" />
          <h2 className="text-lg font-bold text-brand-navy">Ask FADS for help</h2>
        </div>
        <p className="text-sm text-muted-foreground">Ask in your own words — FADS explains things simply and tells you where to click.</p>
        <div className="flex flex-wrap gap-2">
          {ASK_FADS_QUESTIONS.map((q) => (
            <Link
              key={q}
              to={`/assistant?q=${encodeURIComponent(q)}`}
              className="inline-flex items-center gap-1.5 bg-card rounded-full border border-border px-3 py-2 text-sm text-brand-navy hover:border-brand-teal transition-colors min-h-touch"
            >
              <Bot className="w-3.5 h-3.5 text-brand-teal" /> {q}
            </Link>
          ))}
        </div>
        <Link to="/assistant" className="inline-flex items-center gap-1.5 text-sm text-brand-teal hover:underline">
          Or type your own question <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Quick Start */}
      <QuickStart />

      {/* Guided Tours */}
      <div id="tours" className="space-y-3 scroll-mt-4">
        <div className="flex items-center gap-2">
          <FadsRobotAvatar size="sm" />
          <h2 className="text-lg font-bold text-brand-navy">Guided Tours</h2>
        </div>
        <p className="text-sm text-muted-foreground">Let the FADS robot show you around. Takes about a minute.</p>
        <div className="space-y-2">
          {Object.values(TOURS).map((tour) => {
            const done =
              typeof localStorage !== "undefined" &&
              localStorage.getItem(`fads-tour-completed-${tour.id}`) === "1";
            return (
              <div key={tour.id} className="flex items-center justify-between bg-card rounded-xl border border-border p-3.5 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-brand-navy flex items-center gap-1.5">
                    {tour.name.replace(" Tour", "")}
                    {done && <Check className="w-3.5 h-3.5 text-status-ok" />}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{TOUR_DESCRIPTIONS[tour.id] || tour.description}</p>
                </div>
                <Button
                  variant={done ? "outline" : "default"}
                  size="sm"
                  className="h-9 gap-1.5 shrink-0 min-h-touch"
                  onClick={() => startTour(tour)}
                >
                  {done ? (<><RotateCcw className="w-3.5 h-3.5" /> Restart</>) : (<>Start Tour <ChevronRight className="w-3.5 h-3.5" /></>)}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Guides & PDFs */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-brand-navy">Guides & PDFs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Introductory Brochure */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-mint flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-brand-teal" />
                </div>
                <div>
                  <p className="font-semibold text-brand-navy text-sm">FADS Introduction</p>
                  <p className="text-xs text-muted-foreground">New to FADS? Start here.</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">A quick introduction to what FADS does and how the different parts work together.</p>
              <input ref={introRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => handleIntroUpload(e.target.files?.[0])} />
              {introUrl ? (
                <div className="flex gap-2">
                  <Button variant="outline" className="h-10 flex-1 gap-1.5 min-h-touch" onClick={() => window.open(introUrl, "_blank")}>
                    <ExternalLink className="w-4 h-4" /> View
                  </Button>
                  <Button variant="outline" className="h-10 gap-1.5 min-h-touch" onClick={() => window.open(introUrl, "_blank")}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-status-warn bg-status-warn/10 rounded-lg p-2">
                    The introduction PDF hasn't been uploaded yet. An admin can upload it below.
                  </p>
                  <Button variant="outline" className="h-10 w-full gap-1.5 min-h-touch" onClick={() => introRef.current?.click()}>
                    <Upload className="w-4 h-4" /> Upload Introduction PDF
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Guide */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-mint flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-brand-teal" />
                </div>
                <div>
                  <p className="font-semibold text-brand-navy text-sm">FADS User Guide</p>
                  <p className="text-xs text-muted-foreground">More detailed help using FADS.</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Opens in a new tab where you can read, download or print it.</p>
              <Button
                className="h-10 w-full gap-1.5 bg-brand-navy hover:bg-brand-navy/90 min-h-touch"
                onClick={handleDownloadGuide}
              >
                <Download className="w-4 h-4" /> Download User Guide
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Something isn't working */}
      <Troubleshooting />

      {/* Contact Support */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FadsRobotAvatar size="sm" />
          <h2 className="text-lg font-bold text-brand-navy">Contact Support</h2>
        </div>
        <Link to="/support" className="flex items-center justify-between bg-card rounded-xl border border-border p-3.5 hover:border-brand-teal transition-colors min-h-touch">
          <span className="flex items-center gap-2.5 text-sm font-medium text-brand-navy">
            <LifeBuoy className="w-4 h-4 text-brand-teal" /> Get help from the FADS team
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      </div>

      {/* Detailed Help — existing user guide sections */}
      <div className="space-y-3 pt-2 border-t border-border">
        <h2 className="text-lg font-bold text-brand-navy">Detailed Help</h2>
        <p className="text-sm text-muted-foreground">
          Everything in FADS, explained — tailored to your {workspaceTypeLabel(orgType)} workspace.
        </p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setParams({ section: s.id })}
              className={`shrink-0 px-3 h-9 rounded-full text-xs font-medium border min-h-touch ${
                current?.id === s.id
                  ? "bg-brand-navy text-white border-brand-navy"
                  : "bg-card text-foreground border-border hover:bg-accent"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
        {current && (
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-brand-mint flex items-center justify-center">
                  <current.icon className="w-4 h-4 text-brand-teal" />
                </div>
                <h3 className="text-lg font-semibold text-brand-navy">{current.title}</h3>
              </div>
              {current.body.map((p, i) =>
                p.startsWith("- ") ? (
                  <div key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="text-brand-teal shrink-0">•</span>
                    <span>{p.slice(2)}</span>
                  </div>
                ) : (
                  <p key={i} className="text-sm text-muted-foreground">{p}</p>
                )
              )}
              {current.links && current.links.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-1">
                  {current.links.map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      className="text-sm text-brand-teal hover:underline inline-flex items-center gap-1"
                    >
                      {l.label} →
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {activeTour && (
        <GuidedTour tour={activeTour} onClose={() => setActiveTour(null)} />
      )}
    </div>
  );
}