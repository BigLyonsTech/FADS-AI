import React, { useEffect, useState, useCallback } from "react";
import { useHrAttendance } from "@/lib/useHrAttendance";
import { useWorkspace } from "@/lib/useWorkspace";
import BackToHR from "@/components/hr/BackToHR";
import WorkScheduleDialog from "@/components/hr/WorkScheduleDialog";
import PublicHolidayDialog from "@/components/hr/PublicHolidayDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Plus, Pencil, Trash2, Settings as SettingsIcon, Calendar } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AttendanceSettings() {
  const { activeOrg } = useWorkspace();
  const { toast } = useToast();
  const {
    listWorkSchedules, createWorkSchedule, updateWorkSchedule, deleteWorkSchedule,
    listPublicHolidays, createPublicHoliday, updatePublicHoliday, deletePublicHoliday,
  } = useHrAttendance();

  const [schedules, setSchedules] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [showHolidayDialog, setShowHolidayDialog] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);

  const loadData = useCallback(async () => {
    if (!activeOrg?.id) return;
    setLoading(true);
    try {
      const [schedData, holData] = await Promise.all([listWorkSchedules(), listPublicHolidays()]);
      setSchedules(schedData.schedules || []);
      setHolidays(holData.holidays || []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }, [activeOrg?.id, listWorkSchedules, listPublicHolidays]);

  useEffect(() => { loadData(); }, [activeOrg?.id]);

  const handleSaveSchedule = async (data) => {
    if (editingSchedule) {
      await updateWorkSchedule(editingSchedule.id, data);
      toast({ title: "Schedule updated" });
    } else {
      await createWorkSchedule(data);
      toast({ title: "Schedule created" });
    }
    setEditingSchedule(null);
    await loadData();
  };

  const handleDeleteSchedule = async (id) => {
    if (!confirm("Delete this work schedule?")) return;
    await deleteWorkSchedule(id);
    toast({ title: "Schedule deleted" });
    await loadData();
  };

  const handleSaveHoliday = async (data) => {
    if (editingHoliday) {
      await updatePublicHoliday(editingHoliday.id, data);
      toast({ title: "Holiday updated" });
    } else {
      await createPublicHoliday(data);
      toast({ title: "Holiday added" });
    }
    setEditingHoliday(null);
    await loadData();
  };

  const handleDeleteHoliday = async (id) => {
    if (!confirm("Delete this public holiday?")) return;
    await deletePublicHoliday(id);
    toast({ title: "Holiday deleted" });
    await loadData();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <BackToHR label="Back to HR" to="/hr" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackToHR label="Back to HR" to="/hr" />

      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-brand-teal" /> Attendance Settings
        </h1>
        <p className="text-sm text-muted-foreground">Work schedules and public holidays for {activeOrg?.name}</p>
      </div>

      <Tabs defaultValue="schedules">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedules">Work Schedules</TabsTrigger>
          <TabsTrigger value="holidays">Public Holidays</TabsTrigger>
        </TabsList>

        {/* Work Schedules */}
        <TabsContent value="schedules" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => { setEditingSchedule(null); setShowScheduleDialog(true); }}>
              <Plus className="w-4 h-4" /> Add Schedule
            </Button>
          </div>

          {schedules.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No work schedules configured. Add one to define standard working days and times.
            </Card>
          ) : (
            <div className="space-y-2">
              {schedules.map((s) => (
                <Card key={s.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(s.working_days || []).map((d) => DAY_LABELS[d]).join(", ")} · {s.start_time}–{s.end_time}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingSchedule(s); setShowScheduleDialog(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteSchedule(s.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Public Holidays */}
        <TabsContent value="holidays" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => { setEditingHoliday(null); setShowHolidayDialog(true); }}>
              <Plus className="w-4 h-4" /> Add Holiday
            </Button>
          </div>

          {holidays.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No public holidays configured. Add holidays to exclude them from leave day calculations.
            </Card>
          ) : (
            <div className="space-y-2">
              {holidays
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((h) => (
                  <Card key={h.id} className="p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Calendar className="w-4 h-4 text-brand-teal shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{h.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(h.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingHoliday(h); setShowHolidayDialog(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteHoliday(h.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <WorkScheduleDialog
        open={showScheduleDialog}
        onClose={() => { setShowScheduleDialog(false); setEditingSchedule(null); }}
        onSubmit={handleSaveSchedule}
        initial={editingSchedule}
      />
      <PublicHolidayDialog
        open={showHolidayDialog}
        onClose={() => { setShowHolidayDialog(false); setEditingHoliday(null); }}
        onSubmit={handleSaveHoliday}
        initial={editingHoliday}
      />
    </div>
  );
}