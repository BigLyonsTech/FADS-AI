import React, { useEffect, useState } from "react";
import { useWorkspace } from "@/lib/useWorkspace";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, UserPlus, Loader2, ShieldOff } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "administrator", label: "Administrator" },
  { value: "finance_user", label: "Finance user" },
  { value: "hr_user", label: "HR user" },
  { value: "standard_staff", label: "Standard staff" },
  { value: "school_administrator", label: "School administrator" },
  { value: "teacher", label: "Teacher" },
  { value: "pastor", label: "Pastor" },
  { value: "church_administrator", label: "Church administrator" },
  { value: "ministry_leader", label: "Ministry leader" },
];

const STATUS_STYLES = {
  pending: "bg-status-warn/15 text-status-warn",
  active: "bg-status-ok/15 text-status-ok",
  revoked: "bg-status-bad/15 text-status-bad",
};

const STATUS_ORDER = { active: 0, pending: 1, revoked: 2 };

function RoleSelect({ value, onChange, disabled }) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9 w-full sm:w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLE_OPTIONS.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function Team() {
  const { activeOrg, activeRole, loading } = useWorkspace();
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("standard_staff");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [memberBusy, setMemberBusy] = useState({});

  const canManage =
    activeRole === "organisation_owner" || activeRole === "administrator";

  const loadMembers = async () => {
    if (!activeOrg) return;
    setLoadingMembers(true);
    try {
      const list = await base44.entities.OrganisationMembership.filter({
        organisation_id: activeOrg.id,
      });
      list.sort(
        (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
      );
      setMembers(list);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [activeOrg?.id]);

  const invite = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await base44.functions.invoke("members", {
        action: "invite",
        organisation_id: activeOrg.id,
        email,
        role_in_org: role,
      });
      setEmail("");
      await loadMembers();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (m, newRole) => {
    setMemberBusy((b) => ({ ...b, ["role_" + m.id]: true }));
    try {
      await base44.functions.invoke("members", {
        action: "update_role",
        organisation_id: activeOrg.id,
        target_user_id: m.user_id,
        role_in_org: newRole,
      });
      await loadMembers();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setMemberBusy((b) => ({ ...b, ["role_" + m.id]: false }));
    }
  };

  const revoke = async (m) => {
    const label = m.status === "pending" ? "invitation for" : "access for";
    if (!confirm(`Cancel ${label} ${m.user_email}?`)) return;
    setMemberBusy((b) => ({ ...b, ["rev_" + m.id]: true }));
    try {
      await base44.functions.invoke("members", {
        action: "revoke",
        organisation_id: activeOrg.id,
        membership_id: m.id,
      });
      await loadMembers();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setMemberBusy((b) => ({ ...b, ["rev_" + m.id]: false }));
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading team…</div>;
  }

  if (!activeOrg) {
    return (
      <div className="max-w-md mx-auto bg-card rounded-2xl border border-border p-8 text-center">
        <h2 className="text-xl font-semibold mb-2 text-brand-navy">Select a workspace</h2>
        <p className="text-muted-foreground text-sm">
          Choose an organisation from the switcher above to manage its team.
        </p>
      </div>
    );
  }

  const canRevoke = (m) =>
    canManage &&
    (m.status === "active" || m.status === "pending") &&
    m.role_in_org !== "organisation_owner";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-navy flex items-center justify-center shrink-0">
          <Users className="w-6 h-6 text-brand-teal" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Team &amp; Access</h1>
          <p className="text-muted-foreground text-sm truncate">
            Members of {activeOrg.name}.
          </p>
        </div>
      </div>

      {canManage && (
        <form
          onSubmit={invite}
          className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-4"
        >
          <div className="flex items-center gap-2 text-brand-navy font-medium">
            <UserPlus className="w-4 h-4" /> Invite a member
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <RoleSelect value={role} onChange={setRole} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={busy} className="w-full h-11 min-h-touch">
                {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Send invitation
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-status-bad">{error}</p>}
          <p className="text-xs text-muted-foreground">
            Invited users gain access only after signing in with this email and
            accepting the invitation.
          </p>
        </form>
      )}

      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-mint/60 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {canManage && <th className="px-4 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loadingMembers && (
                <tr>
                  <td colSpan={canManage ? 4 : 3} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!loadingMembers && members.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 4 : 3} className="px-4 py-8 text-center text-muted-foreground">
                    No members yet.
                  </td>
                </tr>
              )}
              {members.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium text-brand-navy">
                      {m.user_name || m.user_email}
                    </div>
                    <div className="text-xs text-muted-foreground">{m.user_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {canManage &&
                    m.status === "active" &&
                    m.role_in_org !== "organisation_owner" ? (
                      <RoleSelect
                        value={m.role_in_org}
                        onChange={(v) => changeRole(m, v)}
                        disabled={memberBusy["role_" + m.id]}
                      />
                    ) : (
                      <span className="capitalize">
                        {(m.role_in_org || "").replace(/_/g, " ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        STATUS_STYLES[m.status] || ""
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      {canRevoke(m) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={memberBusy["rev_" + m.id]}
                          onClick={() => revoke(m)}
                        >
                          {m.status === "active" && <ShieldOff className="w-3 h-3 mr-1" />}
                          {m.status === "active" ? "Revoke" : "Cancel invite"}
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loadingMembers && (
          <div className="text-center py-8 text-muted-foreground">Loading…</div>
        )}
        {!loadingMembers && members.length === 0 && (
          <div className="text-center py-8 text-muted-foreground bg-card rounded-2xl border border-border">
            No members yet.
          </div>
        )}
        {members.map((m) => (
          <div key={m.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <div>
              <div className="font-medium text-brand-navy">{m.user_name || m.user_email}</div>
              <div className="text-xs text-muted-foreground truncate">{m.user_email}</div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                  STATUS_STYLES[m.status] || ""
                }`}
              >
                {m.status}
              </span>
              <span className="text-sm capitalize text-muted-foreground">
                {(m.role_in_org || "").replace(/_/g, " ")}
              </span>
            </div>
            {canManage && m.status === "active" && m.role_in_org !== "organisation_owner" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Role</Label>
                <RoleSelect
                  value={m.role_in_org}
                  onChange={(v) => changeRole(m, v)}
                  disabled={memberBusy["role_" + m.id]}
                />
              </div>
            )}
            {canRevoke(m) && (
              <Button
                variant="outline"
                disabled={memberBusy["rev_" + m.id]}
                onClick={() => revoke(m)}
                className="w-full h-11 min-h-touch"
              >
                {m.status === "active" && <ShieldOff className="w-4 h-4 mr-1" />}
                {m.status === "active" ? "Revoke access" : "Cancel invite"}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}