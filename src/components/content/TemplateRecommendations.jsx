import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { recommendCategories, isValidCanvaTemplateUrl } from "@/lib/contentWording";
import { Sparkles, ExternalLink, ChevronRight, Star } from "lucide-react";

// Shows after a Content Pack is generated: "Your content is ready. Want to
// make it look good?" Recommends Canva templates based on workspace, topic,
// and content types. Keeps generated copy visible/easy to copy while the
// user opens Canva.
export default function TemplateRecommendations({ pack, onGoToTemplates }) {
  const { activeOrg } = useWorkspace();
  const orgType = activeOrg?.type || "small_business";
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const recommendedCats = useMemo(
    () => recommendCategories(pack?.topic, orgType, pack?.content_types || []),
    [pack?.topic, orgType, pack?.content_types]
  );

  const loadTemplates = useCallback(async () => {
    try {
      const all = await base44.entities.CanvaTemplate.list("-updated_date", 200);
      setTemplates(
        all.filter((t) => t.active !== false && isValidCanvaTemplateUrl(t.canva_url))
      );
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const recommended = useMemo(() => {
    return templates
      .filter((t) => t.workspace === orgType || t.workspace === "all")
      .filter((t) => {
        if (recommendedCats.length === 0) return true;
        return recommendedCats.includes(t.category);
      })
      .sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return 0;
      })
      .slice(0, 3);
  }, [templates, orgType, recommendedCats]);

  if (loading) return null;
  if (recommended.length === 0) return null;

  return (
    <Card className="bg-brand-mint/40 border-brand-teal/20">
      <CardContent className="p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-brand-navy flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-teal" />
            Your content is ready. Want to make it look good?
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a FADS template and open it in Canva. Your generated copy stays here to copy across.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {recommended.map((t) => (
            <div key={t.id} className="border rounded-lg overflow-hidden bg-card flex flex-col">
              <div className="aspect-video bg-muted overflow-hidden relative">
                {t.preview_url ? (
                  <img src={t.preview_url} alt={t.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
                {t.featured && (
                  <div className="absolute top-1.5 left-1.5">
                    <Star className="w-4 h-4 fill-brand-teal text-brand-teal" />
                  </div>
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col gap-2">
                <div className="text-xs font-medium text-brand-navy truncate">{t.name}</div>
                <Button asChild size="sm" className="w-full h-8 gap-1.5">
                  <a href={t.canva_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" /> Use in Canva
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button variant="ghost" className="gap-1.5 text-sm" onClick={onGoToTemplates}>
          Browse all templates <ChevronRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}