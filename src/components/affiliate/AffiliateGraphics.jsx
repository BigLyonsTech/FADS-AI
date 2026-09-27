import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { LayoutTemplate, ExternalLink, Star, Loader2 } from "lucide-react";
import { AUDIENCES } from "@/lib/affiliateResources";

// Affiliate Graphics — reuses the existing CanvaTemplate entity + admin
// AdminTemplateManager. Shows active templates tagged "Affiliate/Promotion"
// (or matching the selected audience workspace). "Use in Canva" opens the
// admin-configured public share URL. Only genuine admin-added templates appear.
export default function AffiliateGraphics({ referralLink }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [audience, setAudience] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.CanvaTemplate.list("-updated_date", 200);
      setTemplates(all.filter((t) => t.active !== false));
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return templates
      .filter((t) => t.category === "Affiliate/Promotion" || audience === "all" ? true : t.workspace === audience || t.workspace === "all")
      .filter((t) => audience === "all" ? true : (t.workspace === audience || t.workspace === "all"))
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }, [templates, audience]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-brand-navy flex items-center gap-2">
          <LayoutTemplate className="w-5 h-5 text-brand-teal" /> Graphics
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Ready-made Canva templates for promoting FADS. Click "Use in Canva" to open and customise.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setAudience("all")}
          className={`px-3 py-1.5 rounded-full text-xs border min-h-touch ${audience === "all" ? "bg-brand-teal text-white border-brand-teal" : "bg-transparent text-muted-foreground border-border"}`}
        >
          All
        </button>
        {AUDIENCES.map((a) => (
          <button
            key={a.key}
            onClick={() => setAudience(a.key)}
            className={`px-3 py-1.5 rounded-full text-xs border min-h-touch capitalize ${audience === a.key ? "bg-brand-teal text-white border-brand-teal" : "bg-transparent text-muted-foreground border-border"}`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-brand-teal" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <LayoutTemplate className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No affiliate graphics available yet. Your FADS administrator can add Canva templates tagged "Affiliate/Promotion".
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((t) => (
            <Card key={t.id} className="flex flex-col overflow-hidden">
              <div className="aspect-video bg-muted overflow-hidden relative">
                {t.preview_url ? (
                  <img src={t.preview_url} alt={t.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <LayoutTemplate className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                )}
                {t.featured && (
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-brand-teal text-white gap-1"><Star className="w-3 h-3" /> Featured</Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex-1">
                  <h3 className="font-medium text-sm text-brand-navy truncate">{t.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {t.workspace && t.workspace !== "all" && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {t.workspace === "small_business" ? "Business" : t.workspace}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button asChild className="w-full h-9 gap-1.5 bg-brand-teal hover:bg-brand-teal/90">
                  <a href={t.canva_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" /> Use in Canva
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}