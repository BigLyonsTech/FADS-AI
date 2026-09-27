import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import TemplateCard from "@/components/templates/TemplateCard";
import {
  TEMPLATE_PURPOSES,
  getPurposeLabel,
  getTextTemplatesForWorkspace,
  inferCanvaPurpose,
} from "@/lib/templatePurposeLibrary";
import { isValidCanvaTemplateUrl } from "@/lib/contentWording";
import {
  LayoutGrid,
  Wallet,
  RefreshCw,
  HandHeart,
  CalendarCheck,
  Megaphone,
  Heart,
  Bell,
  Search,
  Copy,
  LayoutTemplate,
} from "lucide-react";

const PURPOSE_ICONS = {
  all: LayoutGrid,
  get_paid: Wallet,
  follow_up: RefreshCw,
  welcome: HandHeart,
  book_confirm: CalendarCheck,
  promote: Megaphone,
  thank_you: Heart,
  announce: Bell,
};

function workspaceLabel(orgType) {
  if (orgType === "school") return "your school";
  if (orgType === "church") return "your church";
  if (orgType === "small_business") return "your business";
  return "your organisation";
}

export default function TemplateCentre() {
  const { activeOrg } = useWorkspace();
  const orgType = activeOrg?.type || "small_business";
  const [activePurpose, setActivePurpose] = useState("all");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState(null);
  const [canvaTemplates, setCanvaTemplates] = useState([]);
  const [loadingCanva, setLoadingCanva] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setActivePurpose("all");
    setPreview(null);
  }, [orgType]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingCanva(true);
      try {
        const all = await base44.entities.CanvaTemplate.list("-updated_date", 200);
        if (!cancelled) setCanvaTemplates(all || []);
      } catch {
        if (!cancelled) setCanvaTemplates([]);
      } finally {
        if (!cancelled) setLoadingCanva(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const textTemplates = useMemo(
    () => getTextTemplatesForWorkspace(orgType),
    [orgType]
  );

  const configuredCanva = useMemo(() => {
    return canvaTemplates
      .filter((t) => t.active !== false)
      .filter((t) => t.workspace === orgType || t.workspace === "all")
      .filter((t) => isValidCanvaTemplateUrl(t.canva_url))
      .map((t) => {
        const purpose = inferCanvaPurpose(t);
        return {
          id: `canva_${t.id}`,
          source_id: t.id,
          type: "canva",
          workspace: t.workspace,
          purpose,
          purpose_label: getPurposeLabel(purpose),
          title: t.name,
          description: `Ready-made Canva design for ${getPurposeLabel(purpose).toLowerCase()}.`,
          preview_url: t.preview_url || "",
          canva_url: t.canva_url,
          featured: !!t.featured,
        };
      })
      .sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return a.title.localeCompare(b.title);
      });
  }, [canvaTemplates, orgType]);

  const allTemplates = useMemo(
    () => [...textTemplates, ...configuredCanva],
    [textTemplates, configuredCanva]
  );

  const counts = useMemo(() => {
    const map = { all: allTemplates.length };
    for (const purpose of TEMPLATE_PURPOSES) {
      if (purpose.key !== "all") {
        map[purpose.key] = allTemplates.filter((t) => t.purpose === purpose.key).length;
      }
    }
    return map;
  }, [allTemplates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTemplates.filter((t) => {
      const purposeMatch = activePurpose === "all" || t.purpose === activePurpose;
      const qMatch =
        !q ||
        (t.title || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.purpose_label || "").toLowerCase().includes(q);
      return purposeMatch && qMatch;
    });
  }, [allTemplates, activePurpose, query]);

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
      toast({ title: "Copied!", description: "Paste it anywhere you need it." });
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Please copy the text manually.",
        variant: "destructive",
      });
    }
  };

  const useTemplate = (template) => {
    if (template.type === "text") {
      setPreview(template);
      return;
    }
    if (template.type === "canva" && isValidCanvaTemplateUrl(template.canva_url)) {
      window.open(template.canva_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="space-y-5">
      <Card className="bg-brand-navy text-white border-0 overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-teal/20 flex items-center justify-center shrink-0">
              <LayoutTemplate className="w-5 h-5 text-brand-teal" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">FADS Template Centre</h1>
              <p className="text-white/70 text-sm mt-0.5">
                Ready-to-use words and configured designs for {workspaceLabel(orgType)}.
              </p>
            </div>
          </div>
          <p className="text-white/60 text-sm mt-4 max-w-2xl">
            Pick the job you need to do. Copy the wording, customise it, or open a configured Canva design when one is available.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-brand-navy">What do you want to do?</h2>
          <p className="text-sm text-muted-foreground">
            Choose a simple job and FADS will show the most useful templates for this workspace.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TEMPLATE_PURPOSES.map((purpose) => {
            const Icon = PURPOSE_ICONS[purpose.key] || LayoutGrid;
            const active = activePurpose === purpose.key;
            return (
              <button
                key={purpose.key}
                onClick={() => setActivePurpose(purpose.key)}
                className={`min-h-20 rounded-xl border p-3 text-left transition-colors ${
                  active
                    ? "bg-brand-teal text-white border-brand-teal"
                    : "bg-card text-brand-navy border-border hover:border-brand-teal"
                }`}
              >
                <Icon className="w-5 h-5 mb-2" />
                <div className="font-medium text-sm">{purpose.label}</div>
                <div className={`text-xs mt-0.5 ${active ? "text-white/70" : "text-muted-foreground"}`}>
                  {counts[purpose.key] || 0} template{counts[purpose.key] === 1 ? "" : "s"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-10 h-11"
          placeholder="Search by job or template name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loadingCanva && (
        <p className="text-xs text-muted-foreground">
          Checking configured FADS Canva designs…
        </p>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No templates match this job or search for {workspaceLabel(orgType)}.
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUse={useTemplate}
              onCopy={copyText}
            />
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
            <DialogDescription>
              {preview?.purpose_label || "Template"} · Copy and customise the placeholders before using it.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border bg-brand-mint/30 p-4">
            <pre className="whitespace-pre-wrap font-body text-sm text-brand-navy leading-relaxed">
              {preview?.body}
            </pre>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Close
            </Button>
            <Button
              className="bg-brand-teal hover:bg-brand-teal/90 text-white"
              onClick={() => copyText(preview?.body)}
            >
              <Copy className="w-4 h-4" /> Copy Text
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
