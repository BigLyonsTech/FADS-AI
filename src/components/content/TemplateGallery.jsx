import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useAuth } from "@/lib/AuthContext";
import { TEMPLATE_CATEGORIES, TEMPLATE_WORKSPACES, isValidCanvaTemplateUrl } from "@/lib/contentWording";
import AdminTemplateManager from "@/components/content/AdminTemplateManager";
import { LayoutTemplate, ExternalLink, Star, Search, Shield } from "lucide-react";

// Customer-facing Canva template gallery. Shows active templates filtered by
// workspace and category. Admins see an "Add Template" button that opens the
// AdminTemplateManager. "Use in Canva" opens the admin-configured Canva share URL.
export default function TemplateGallery({ recommendedCategories = [], contentTypes = [] }) {
  const { activeOrg } = useWorkspace();
  const { user } = useAuth();
  const orgType = activeOrg?.type || "small_business";
  const isPlatformOwner = user?.role === "admin" || user?.platform_owner === true;

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const all = await base44.entities.CanvaTemplate.list("-updated_date", 200);
      setTemplates(all);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const filtered = useMemo(() => {
    return templates
      .filter((t) => t.active !== false)
      .filter((t) => isValidCanvaTemplateUrl(t.canva_url))
      .filter((t) => {
        // Workspace filter: "all" shows everything; otherwise match workspace or "all" templates
        if (workspaceFilter === "all") return true;
        return t.workspace === workspaceFilter || t.workspace === "all";
      })
      .filter((t) => {
        if (!categoryFilter) return true;
        return t.category === categoryFilter;
      })
      .filter((t) => {
        if (!search) return true;
        return (t.name || "").toLowerCase().includes(search.toLowerCase());
      })
      .sort((a, b) => {
        // Featured first, then recommended categories, then by name
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        const aRec = recommendedCategories.includes(a.category) ? 1 : 0;
        const bRec = recommendedCategories.includes(b.category) ? 1 : 0;
        if (aRec !== bRec) return bRec - aRec;
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [templates, workspaceFilter, categoryFilter, search, recommendedCategories]);

  // Keep the gallery aligned with the active workspace when organisations switch.
  useEffect(() => {
    if (orgType) setWorkspaceFilter(orgType);
  }, [orgType]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-brand-navy flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-brand-teal" /> FADS Template Library
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ready-made Canva templates. Click "Use in Canva" to open and customise.
          </p>
        </div>
        {isPlatformOwner && (
          <Button variant="outline" className="gap-1.5" onClick={() => setShowAdmin(true)}>
            <Shield className="w-4 h-4" /> Manage Templates
          </Button>
        )}
      </div>

      {/* Recommended banner */}
      {recommendedCategories.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-mint/40 border border-brand-teal/20 text-sm">
          <Star className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
          <div>
            <p className="text-brand-navy font-medium">Recommended for your content</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Templates matching: {recommendedCategories.join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_WORKSPACES.map((w) => (
            <button
              key={w.value}
              onClick={() => setWorkspaceFilter(w.value)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors min-h-touch ${
                workspaceFilter === w.value
                  ? "bg-brand-teal text-white border-brand-teal"
                  : "bg-transparent text-muted-foreground border-border hover:border-brand-teal"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter("")}
            className={`px-3 py-1.5 rounded-full text-xs border transition-colors min-h-touch ${
              !categoryFilter
                ? "bg-brand-navy text-white border-brand-navy"
                : "bg-transparent text-muted-foreground border-border hover:border-brand-navy"
            }`}
          >
            All categories
          </button>
          {TEMPLATE_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c === categoryFilter ? "" : c)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors min-h-touch ${
                categoryFilter === c
                  ? "bg-brand-navy text-white border-brand-navy"
                  : "bg-transparent text-muted-foreground border-border hover:border-brand-navy"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading templates…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <LayoutTemplate className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No configured Canva designs are available for this workspace yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <Card key={t.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
              {/* Preview */}
              <div className="aspect-video bg-muted overflow-hidden relative">
                {t.preview_url ? (
                  <img
                    src={t.preview_url}
                    alt={t.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <LayoutTemplate className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                )}
                {t.featured && (
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-brand-teal text-white gap-1">
                      <Star className="w-3 h-3" /> Featured
                    </Badge>
                  </div>
                )}
              </div>
              {/* Info */}
              <CardContent className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex-1">
                  <h3 className="font-medium text-sm text-brand-navy truncate">{t.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {t.category && (
                      <Badge variant="secondary" className="text-xs">{t.category}</Badge>
                    )}
                    {t.workspace && t.workspace !== "all" && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {t.workspace === "small_business" ? "Business" : t.workspace}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  asChild
                  className="w-full h-9 gap-1.5 bg-brand-teal hover:bg-brand-teal/90"
                >
                  <a href={t.canva_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" /> Use in Canva
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Admin manager dialog */}
      {showAdmin && isPlatformOwner && (
        <AdminTemplateManager
          open={showAdmin}
          onClose={() => { setShowAdmin(false); loadTemplates(); }}
        />
      )}
    </div>
  );
}