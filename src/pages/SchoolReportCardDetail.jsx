import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useSchoolWorkspaceGuard } from "@/lib/useSchoolWorkspaceGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, Printer, FileDown, Pencil, MessageCircle } from "lucide-react";
import { generateReportCardPDF } from "@/lib/reportCardPdf";
import { computeReportCardAverage, averageRemark, buildReportCardWhatsAppUrl } from "@/lib/reportCardUtils";
import { openWhatsAppShare, printOrPdf } from "@/lib/webviewCompat";

export default function SchoolReportCardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeOrg } = useWorkspace();
  const blocked = useSchoolWorkspaceGuard();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    base44.entities.SchoolReportCard.get(id).then(setCard).finally(() => setLoading(false));
  }, [id]);

  // Org isolation: redirect if the card belongs to a different organisation
  // (e.g. the user switched workspace while viewing this report card).
  const wrongOrg = card && activeOrg && card.organisation_id !== activeOrg.id;
  useEffect(() => {
    if (wrongOrg) navigate("/", { replace: true });
  }, [wrongOrg, navigate]);

  if (loading) return <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin text-brand-teal mx-auto" /></div>;
  if (!activeOrg) return <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin text-brand-teal mx-auto" /></div>;
  if (blocked) return null;
  if (wrongOrg) return <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin text-brand-teal mx-auto" /></div>;
  if (!card) return <div className="py-20 text-center text-muted-foreground">Report card not found.</div>;

  const a = card.attendance_summary || {};

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link to="/school/reports" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-navy">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" className="h-10" onClick={() => printOrPdf(() => generateReportCardPDF(card, activeOrg))}><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" className="h-10" onClick={() => generateReportCardPDF(card, activeOrg)}><FileDown className="w-4 h-4" /> PDF</Button>
          <Button variant="outline" className="h-10" onClick={() => openWhatsAppShare(buildReportCardWhatsAppUrl(card, activeOrg))}>
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </Button>
          <Link to={`/school/reports/${card.id}/edit`}><Button className="h-10 bg-brand-navy hover:bg-brand-navy/90"><Pencil className="w-4 h-4" /> Edit</Button></Link>
        </div>
      </div>

      <Card className="print:shadow-none print:border-0">
        <CardContent className="p-6 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">{activeOrg?.name || "School"}</h1>
            <p className="text-sm text-muted-foreground">Student Report Card</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-y border-border py-4">
            <Field label="Student" value={card.student_name} />
            <Field label="Class" value={card.class_name || "—"} />
            <Field label="Term" value={card.academic_term || "—"} />
            <Field label="Academic year" value={card.academic_year || "—"} />
            <Field label="Status" value={card.status} />
            <Field label="Generated" value={card.created_date ? new Date(card.created_date).toLocaleDateString() : "—"} />
          </div>

          <div>
            <h2 className="font-semibold text-brand-navy mb-2">Subjects</h2>
            {(card.subjects || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-brand-navy text-white">
                      <th className="text-left p-2 rounded-l-md">Subject</th>
                      <th className="text-left p-2">Mark</th>
                      <th className="text-left p-2">Grade</th>
                      <th className="text-left p-2 rounded-r-md">Teacher comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {card.subjects.map((s, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="p-2">{s.subject || "—"}</td>
                        <td className="p-2">{s.mark ?? "—"}</td>
                        <td className="p-2">{s.grade || "—"}</td>
                        <td className="p-2">{s.teacher_comment || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {(() => {
            const avg = computeReportCardAverage(card.subjects);
            return avg != null ? (
              <div>
                <h2 className="font-semibold text-brand-navy mb-2">Overall result</h2>
                <p className="text-sm">Average: <span className="font-semibold text-brand-navy">{avg}%</span> · {averageRemark(avg)}</p>
              </div>
            ) : null;
          })()}

          <div>
            <h2 className="font-semibold text-brand-navy mb-2">Attendance</h2>
            <p className="text-sm">Present: <strong>{a.present || 0}</strong> · Absent: <strong>{a.absent || 0}</strong> · Late: <strong>{a.late || 0}</strong></p>
          </div>

          {card.overall_comment && (
            <div>
              <h2 className="font-semibold text-brand-navy mb-2">Overall comment</h2>
              <p className="text-sm whitespace-pre-wrap">{card.overall_comment}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium capitalize">{value}</div>
    </div>
  );
}