import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useHr } from "@/lib/useHr";
import { useWorkspace } from "@/lib/useWorkspace";
import { hrWording, fullName, initials, CONTRACT_TYPES } from "@/lib/hrWording";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import StatusBadge from "@/components/hr/StatusBadge";
import BackToHR from "@/components/hr/BackToHR";
import EmergencyContactDialog from "@/components/hr/EmergencyContactDialog";
import HrNoteDialog from "@/components/hr/HrNoteDialog";
import ConfirmDialog from "@/components/finance/ConfirmDialog";
import {
  Loader2, AlertCircle, Mail, Phone, MapPin, Calendar, User,
  Briefcase, Building2, Heart, FileText, History, Pencil, LogOut, Trash2, Plus,
  ClipboardList,
} from "lucide-react";

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeOrg } = useWorkspace();
  const w = hrWording(activeOrg?.type);
  const { getEmployee, offboardEmployee, deleteEmployee, createEmergencyContact, deleteEmergencyContact, createHrNote, deleteHrNote } = useHr();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showOffboard, setShowOffboard] = useState(false);
  const [offboardDate, setOffboardDate] = useState("");
  const [offboardNotes, setOffboardNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getEmployee(id);
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleOffboard = async () => {
    setBusy(true);
    try {
      await offboardEmployee(id, offboardDate || null, offboardNotes || null);
      setShowOffboard(false);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteEmployee(id);
      navigate("/hr/employees");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAddContact = async (contactData) => {
    await createEmergencyContact({ employee_id: id, ...contactData });
    await load();
  };

  const handleAddNote = async (noteData) => {
    await createHrNote({ employee_id: id, ...noteData });
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mb-3" />
        <p className="text-sm text-destructive mb-3">{error}</p>
        <BackToHR />
      </div>
    );
  }

  if (!data) return null;

  const emp = data.employee;
  const contacts = data.emergency_contacts || [];
  const notes = data.hr_notes || [];
  const history = data.employment_history || [];

  const canOffboard = emp.employment_status !== "former_employee" && emp.employment_status !== "inactive";
  const canDelete = emp.employment_status !== "active";

  return (
    <div className="space-y-4">
      <BackToHR label="Back to Directory" />

      {/* Header */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-navy text-white flex items-center justify-center text-xl font-medium shrink-0">
            {initials(emp)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-heading font-bold">{fullName(emp)}</h1>
              <StatusBadge status={emp.employment_status} />
            </div>
            {emp.job_role_title && <p className="text-sm text-muted-foreground mt-0.5">{emp.job_role_title}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
              {emp.department_name && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {emp.department_name}</span>}
              {emp.work_location_name && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {emp.work_location_name}</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to={`/hr/employees/${id}/documents`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Documents
              </Button>
            </Link>
            <Link to={`/hr/employees/${id}/onboarding`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ClipboardList className="w-3.5 h-3.5" /> Onboarding
              </Button>
            </Link>
            <Link to={`/hr/employees/${id}/offboarding`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <LogOut className="w-3.5 h-3.5" /> Offboarding
              </Button>
            </Link>
            <Link to={`/hr/employees/${id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            </Link>
            {canOffboard && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowOffboard(true)}>
                <LogOut className="w-3.5 h-3.5" /> Offboard
              </Button>
            )}
            {canDelete && (
              <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => setShowDelete(true)}>
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contact details */}
        <Card className="p-4">
          <h2 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-brand-teal" /> Contact Details
          </h2>
          <div className="space-y-2 text-sm">
            {emp.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-muted-foreground" /> {emp.email}</div>}
            {emp.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground" /> {emp.phone}</div>}
            {emp.personal_email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-muted-foreground" /> {emp.personal_email} <span className="text-xs text-muted-foreground">(personal)</span></div>}
            {emp.home_address && <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5" /> {emp.home_address}</div>}
            {!emp.email && !emp.phone && !emp.personal_email && !emp.home_address && (
              <p className="text-muted-foreground text-xs">No contact details recorded</p>
            )}
          </div>
        </Card>

        {/* Job information */}
        <Card className="p-4">
          <h2 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-brand-teal" /> Job Information
          </h2>
          <div className="space-y-2 text-sm">
            {emp.start_date && <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Start: {emp.start_date}</div>}
            {emp.end_date && <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-muted-foreground" /> End: {emp.end_date}</div>}
            <div className="flex items-center gap-2"><Briefcase className="w-3.5 h-3.5 text-muted-foreground" /> {CONTRACT_TYPES.find(c => c.value === emp.contract_type)?.label || emp.contract_type}</div>
            {emp.manager_name && <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-muted-foreground" /> Reports to: {emp.manager_name}</div>}
            {emp.annual_salary != null && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Salary:</span>
                <span className="font-medium">{new Intl.NumberFormat(undefined, { style: "currency", currency: emp.salary_currency || activeOrg?.currency || "USD" }).format(emp.annual_salary)}/yr</span>
              </div>
            )}
            {emp.date_of_birth && <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-muted-foreground" /> DOB: {emp.date_of_birth}</div>}
          </div>
        </Card>

        {/* Emergency contacts */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm flex items-center gap-2">
              <Heart className="w-4 h-4 text-brand-teal" /> Emergency Contacts
            </h2>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setShowContactDialog(true)}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
          {contacts.length > 0 ? (
            <div className="space-y-2">
              {contacts.map((c) => (
                <div key={c.id} className="flex items-start justify-between border-b last:border-0 pb-2 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{c.name} {c.is_primary && <span className="text-xs text-brand-teal">★ Primary</span>}</p>
                    <p className="text-xs text-muted-foreground">{c.relationship}</p>
                    <p className="text-xs">{c.phone}</p>
                    {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive h-7" onClick={async () => { await deleteEmergencyContact(c.id); await load(); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No emergency contacts recorded</p>
          )}
        </Card>

        {/* HR notes */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-teal" /> HR Notes
            </h2>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setShowNoteDialog(true)}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
          {notes.length > 0 ? (
            <div className="space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="border-b last:border-0 pb-2 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm">{n.content}</p>
                    <Button variant="ghost" size="sm" className="text-destructive h-7 shrink-0" onClick={async () => { await deleteHrNote(n.id); await load(); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">By {n.created_by_name} · {n.created_date ? new Date(n.created_date).toLocaleDateString() : ""}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No HR notes recorded</p>
          )}
        </Card>
      </div>

      {/* Employment history */}
      <Card className="p-4">
        <h2 className="font-medium text-sm mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-brand-teal" /> Employment History
        </h2>
        {history.length > 0 ? (
          <div className="space-y-3">
            {history.map((h) => (
              <div key={h.id} className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-brand-teal mt-1.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium capitalize">{h.event_type?.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.effective_date}
                    {h.from_status && h.to_status && ` · ${h.from_status} → ${h.to_status}`}
                    {h.to_role_title && ` · ${h.to_role_title}`}
                    {h.to_department_name && ` · ${h.to_department_name}`}
                  </p>
                  {h.notes && <p className="text-xs text-muted-foreground mt-0.5">{h.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">No history recorded</p>
        )}
      </Card>

      {/* Dialogs */}
      <EmergencyContactDialog open={showContactDialog} onClose={() => setShowContactDialog(false)} onSave={handleAddContact} />
      <HrNoteDialog open={showNoteDialog} onClose={() => setShowNoteDialog(false)} onSave={handleAddNote} />

      {/* Offboard dialog */}
      {showOffboard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !busy && setShowOffboard(false)}>
          <Card className="p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold mb-3">Offboard {w.staffNoun.toLowerCase()}</h2>
            <p className="text-sm text-muted-foreground mb-3">This will mark {fullName(emp)} as a former employee. This action is audited.</p>
            <div className="space-y-3">
              <div>
                <Label>End Date</Label>
                <Input type="date" value={offboardDate} onChange={(e) => setOffboardDate(e.target.value)} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={offboardNotes} onChange={(e) => setOffboardNotes(e.target.value)} rows={2} placeholder="Optional" />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setShowOffboard(false)} disabled={busy}>Cancel</Button>
              <Button onClick={handleOffboard} disabled={busy} className="gap-1.5">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Offboard
              </Button>
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title={`Delete ${w.staffNoun.toLowerCase()} record?`}
        description="This permanently deletes the employee record and all related data (contacts, notes, history). This action cannot be undone."
        confirmLabel="Delete"
        busy={busy}
      />
    </div>
  );
}