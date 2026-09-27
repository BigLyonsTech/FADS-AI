import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useSchoolWorkspaceGuard } from "@/lib/useSchoolWorkspaceGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, Plus, Trash2, ArrowLeft, Save } from "lucide-react";
import { computeReportCardAverage, averageRemark } from "@/lib/reportCardUtils";

export default function SchoolReportCardEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeOrg, loading: wsLoading } = useWorkspace();
  const blocked = useSchoolWorkspaceGuard();
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({
    student_contact_id: "", student_name: "", class_name: "", academic_term: "", academic_year: "",
    subjects: [], attendance_summary: { present: 0, absent: 0, late: 0 },
    overall_comment: "", status: "draft",
  });
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeOrg) return;
    base44.entities.CRMContact
      .filter({ organisation_id: activeOrg.id, data_mode: activeOrg.data_mode, contact_type: "student" }, "first_name", 200)
      .then(setStudents);
  }, [activeOrg?.id, activeOrg?.data_mode]);

  useEffect(() => {
    if (!id || !activeOrg) return;
    setLoading(true);
    base44.entities.SchoolReportCard.get(id).then((c) => {
      if (c.organisation_id !== activeOrg.id) { navigate("/", { replace: true }); return; }
      setForm({
        student_contact_id: c.student_contact_id || "",
        student_name: c.student_name || "",
        class_name: c.class_name || "",
        academic_term: c.academic_term || "",
        academic_year: c.academic_year || "",
        subjects: c.subjects || [],
        attendance_summary: c.attendance_summary || { present: 0, absent: 0, late: 0 },
        overall_comment: c.overall_comment || "",
        status: c.status || "draft",
      });
    }).finally(() => setLoading(false));
  }, [id, activeOrg?.id]);

  if (wsLoading || loading) return <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin text-brand-teal mx-auto" /></div>;
  if (blocked) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setAtt = (k, v) => setForm((f) => ({ ...f, attendance_summary: { ...f.attendance_summary, [k]: Number(v) || 0 } }));
  const setSubject = (i, k, v) => setForm((f) => {
    const s = [...f.subjects];
    s[i] = { ...s[i], [k]: k === "mark" ? (v === "" ? "" : Number(v)) : v };
    return { ...f, subjects: s };
  });
  const addSubject = () => setForm((f) => ({ ...f, subjects: [...f.subjects, { subject: "", mark: "", grade: "", teacher_comment: "" }] }));
  const removeSubject = (i) => setForm((f) => ({ ...f, subjects: f.subjects.filter((_, idx) => idx !== i) }));

  const onStudentChange = (v) => {
    const s = students.find((x) => x.id === v);
    setForm((f) => ({ ...f, student_contact_id: v, student_name: s ? `${s.first_name} ${s.last_name || ""}`.trim() : f.student_name }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.student_name.trim()) { setError("Select a student or enter a name"); return; }
    if (!form.academic_term.trim()) { setError("Academic term is required"); return; }
    setSaving(true);
    try {
      const payload = { ...form, organisation_id: activeOrg.id, data_mode: activeOrg.data_mode };
      const rec = id
        ? await base44.entities.SchoolReportCard.update(id, payload)
        : await base44.entities.SchoolReportCard.create(payload);
      navigate(`/school/reports/${rec.id}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link to={id ? `/school/reports/${id}` : "/school/reports"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-navy">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">{id ? "Edit Report Card" : "New Report Card"}</h1>

      <form onSubmit={submit} className="space-y-5">
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

        <Card><CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={form.student_contact_id || undefined} onValueChange={onStudentChange}>
                <SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name || ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sn">Student name (if not listed)</Label>
              <Input id="sn" value={form.student_name} onChange={(e) => set("student_name", e.target.value)} placeholder="Free text" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cn">Class</Label>
              <Input id="cn" value={form.class_name} onChange={(e) => set("class_name", e.target.value)} placeholder="e.g. Year 6" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="term">Term *</Label>
              <Input id="term" value={form.academic_term} onChange={(e) => set("academic_term", e.target.value)} placeholder="e.g. Term 1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ay">Academic year</Label>
              <Input id="ay" value={form.academic_year} onChange={(e) => set("academic_year", e.target.value)} placeholder="e.g. 2026/2027" />
            </div>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Label>Subjects</Label>
            <Button type="button" variant="outline" size="sm" onClick={addSubject}><Plus className="w-4 h-4" /> Add subject</Button>
          </div>
          {(form.subjects || []).map((s, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center border border-border rounded-lg p-3">
              <Input className="sm:col-span-4" placeholder="Subject" value={s.subject} onChange={(e) => setSubject(i, "subject", e.target.value)} />
              <Input className="sm:col-span-2" type="number" placeholder="Mark" value={s.mark} onChange={(e) => setSubject(i, "mark", e.target.value)} />
              <Input className="sm:col-span-2" placeholder="Grade" value={s.grade} onChange={(e) => setSubject(i, "grade", e.target.value)} />
              <Input className="sm:col-span-3" placeholder="Teacher comment" value={s.teacher_comment} onChange={(e) => setSubject(i, "teacher_comment", e.target.value)} />
              <Button type="button" variant="ghost" size="icon" className="sm:col-span-1" onClick={() => removeSubject(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          ))}
          {(!form.subjects || form.subjects.length === 0) && <p className="text-sm text-muted-foreground">No subjects added yet.</p>}
          {(() => {
            const avg = computeReportCardAverage(form.subjects);
            return avg != null ? (
              <div className="text-sm text-muted-foreground pt-1">
                Overall average: <span className="font-semibold text-brand-navy">{avg}%</span> · {averageRemark(avg)}
              </div>
            ) : null;
          })()}
        </CardContent></Card>

        <Card><CardContent className="p-5 space-y-4">
          <Label>Attendance summary</Label>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label htmlFor="p">Present</Label><Input id="p" type="number" min="0" value={form.attendance_summary.present} onChange={(e) => setAtt("present", e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="ab">Absent</Label><Input id="ab" type="number" min="0" value={form.attendance_summary.absent} onChange={(e) => setAtt("absent", e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="lt">Late</Label><Input id="lt" type="number" min="0" value={form.attendance_summary.late} onChange={(e) => setAtt("late", e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="oc">Overall comment</Label>
            <Textarea id="oc" rows={3} value={form.overall_comment} onChange={(e) => set("overall_comment", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent></Card>

        <Button type="submit" className="w-full h-12 bg-brand-navy hover:bg-brand-navy/90" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save report card
        </Button>
      </form>
    </div>
  );
}