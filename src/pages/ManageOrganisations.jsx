import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import OrganisationEditDialog from "@/components/organisation/OrganisationEditDialog";
import BackToSettings from "@/components/BackToSettings";
import {
  Briefcase, School, GraduationCap, Church, Plus, Edit3,
  Check, ArrowRight, Loader2, Building2,
} from "lucide-react";

const TYPE_META = {
  small_business: { label: "Small Business", icon: Briefcase },
  school: { label: "School", icon: School },
  university: { label: "University", icon: GraduationCap },
  church: { label: "Church", icon: Church },
};

const CURRENCY_SYMBOL = { NGN: "₦", EUR: "€", GBP: "£", USD: "$" };

// Manage Organisations — owner-facing area for viewing, editing, switching
// and adding organisations. Reuses the existing workspace architecture; each
// organisation retains its own isolated data (RLS-enforced).
export default function ManageOrganisations() {
  const { organisations, memberships, activeOrg, activeRole, switchWorkspace, loading } = useWorkspace();
  const [editOrg, setEditOrg] = useState(null);
  const [switching, setSwitching] = useState("");

  const handleSwitch = async (orgId) => {
    if (orgId === activeOrg?.id) return;
    setSwitching(orgId);
    try {
      await switchWorkspace(orgId);
      window.location.href = "/";
    } catch (e) {
      setSwitching("");
    }
  };

  const roleFor = (orgId) =>
    memberships.find((m) => m.organisation_id === orgId && m.status === "active")?.role_in_org || "—";

  const isOwner = (orgId) => roleFor(orgId) === "organisation_owner";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <BackToSettings />
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Manage Organisations</h1>
        <p className="text-muted-foreground text-sm">
          View, edit and switch between your organisations. Each organisation
          keeps its own country, currency, contacts, employees and finance records.
        </p>
      </div>

      {/* Active organisation indicator */}
      {activeOrg && (
        <div className="bg-brand-mint/60 border border-brand-mint rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-teal flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">Currently active</div>
            <div className="font-semibold text-brand-navy truncate">{activeOrg.name}</div>
          </div>
          <Badge className="bg-brand-teal text-white border-0">
            {TYPE_META[activeOrg.type]?.label || activeOrg.type}
          </Badge>
        </div>
      )}

      {/* Organisation list */}
      <div className="space-y-3">
        {loading && organisations.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          organisations.map((org) => {
            const meta = TYPE_META[org.type] || { label: org.type, icon: Building2 };
            const Icon = meta.icon;
            const isActive = org.id === activeOrg?.id;
            const owner = isOwner(org.id);
            return (
              <Card key={org.id} className={isActive ? "border-brand-teal" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-brand-teal" : "bg-brand-mint"}`}>
                      <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-brand-teal"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-brand-navy truncate">{org.name}</h3>
                        {isActive && (
                          <Badge className="bg-brand-teal text-white border-0 text-xs">Active</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {meta.label} · {org.country} · {CURRENCY_SYMBOL[org.currency] || ""}{org.currency}
                        {" · "}Role: {roleFor(org.id)?.replace("organisation_", "").replace("_", " ") || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {org.data_mode === "demo" ? "Demo mode" : "Live mode"}
                        {org.access_status ? ` · ${org.access_status}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {owner && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 gap-1"
                          onClick={() => setEditOrg(org)}
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </Button>
                      )}
                      {!isActive && (
                        <Button
                          size="sm"
                          className="h-9 gap-1"
                          onClick={() => handleSwitch(org.id)}
                          disabled={switching === org.id}
                        >
                          {switching === org.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ArrowRight className="w-3.5 h-3.5" />
                          )}
                          Switch
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add another organisation */}
      <Link to="/onboarding">
        <Button className="w-full h-12 bg-brand-navy hover:bg-brand-navy/90">
          <Plus className="w-4 h-4 mr-2" /> Add another organisation
        </Button>
      </Link>
      <p className="text-center text-xs text-muted-foreground">
        You can have multiple organisations — two businesses, a business and a
        school, or any combination of supported workspace types.
      </p>

      {editOrg && (
        <OrganisationEditDialog
          open
          org={editOrg}
          onClose={() => setEditOrg(null)}
          onSaved={() => setEditOrg(null)}
        />
      )}
    </div>
  );
}