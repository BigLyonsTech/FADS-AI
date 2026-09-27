import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useSchoolWorkspaceGuard } from "@/lib/useSchoolWorkspaceGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Loader2, GraduationCap } from "lucide-react";

export default function SchoolReports() {
  const { activeOrg, loading: wsLoading } = useWorkspace();
  const blocked = useSchoolWorkspaceGuard();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeOrg) { setCards([]); setLoading(false); return; }
    setLoading(true);
    base44.entities.SchoolReportCard
      .filter({ organisation_id: activeOrg.id, data_mode: activeOrg.data_mode }, "-updated_date", 500)
      .then(setCards)
      .finally(() => setLoading(false));
  }, [activeOrg?.id, activeOrg?.data_mode]);

  if (wsLoading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  if (blocked) return null;

  const drafts = cards.filter((c) => c.status === "draft").length;
  const published = cards.filter((c) => c.status === "published").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Student Report Cards</h1>
          <p className="text-sm text-muted-foreground">{activeOrg.name} · {activeOrg.data_mode === "demo" ? "Demo" : "Live"}</p>
        </div>
        <Link to="/school/reports/new">
          <Button className="h-11 bg-brand-navy hover:bg-brand-navy/90"><Plus className="w-4 h-4" /> New Report Card</Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total" value={cards.length} />
        <StatCard label="Drafts" value={drafts} />
        <StatCard label="Published" value={published} />
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="w-8 h-8 animate-spin text-brand-teal mx-auto" /></div>
      ) : cards.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-10 text-center">
          <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No report cards yet. Create one to record student results.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cards.map((c) => (
            <Link key={c.id} to={`/school/reports/${c.id}`}>
              <Card className="hover:shadow-sm transition-shadow cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-brand-navy truncate">{c.student_name || "—"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${c.status === "published" ? "bg-status-ok/15 text-status-ok" : "bg-status-warn/15 text-status-warn"}`}>{c.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.class_name || "No class"} · {c.academic_term || "—"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{(c.subjects || []).length} subjects</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 text-center">
      <div className="text-2xl font-bold text-brand-navy">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}