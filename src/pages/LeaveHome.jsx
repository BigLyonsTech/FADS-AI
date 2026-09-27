import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useHrLeave } from "@/lib/useHrLeave";
import { useHr } from "@/lib/useHr";
import { useWorkspace } from "@/lib/useWorkspace";
import { hrWording, fullName } from "@/lib/hrWording";
import BackToHR from "@/components/hr/BackToHR";
import LeaveRequestDialog from "@/components/hr/LeaveRequestDialog";
import LeaveApprovalDialog from "@/components/hr/LeaveApprovalDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Loader2, CalendarDays, Plus, Settings as SettingsIcon, Check, X, Ban, Clock } from "lucide-react";

const STATUS_COLOURS = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function LeaveHome() {
  const { activeOrg } = useWorkspace();
  const w = hrWording(activeOrg?.type);
  const { employees, loadEmployees } = useHr();
  const {
    loadLeaveTypes, createRequest, approveRequest, rejectRequest, cancelRequest,
    listRequests, listCalendar, seedDemo, invoke,
  } = useHrLeave();

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [approvalRequest, setApprovalRequest] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [balanceEmployeeId, setBalanceEmployeeId] = useState("");
  const [balances, setBalances] = useState([]);

  const loadData = useCallback(async () => {
    if (!activeOrg?.id) return;
    setLoading(true);
    try {
      const [typesData, reqData, calData] = await Promise.all([
        loadLeaveTypes(), listRequests(), listCalendar(),
      ]);
      setLeaveTypes(typesData.leave_types || []);
      setRequests(reqData.requests || []);
      setCalendarEvents(calData.events || []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeOrg?.id, loadLeaveTypes, listRequests, listCalendar]);

  useEffect(() => {
    if (activeOrg?.id) {
      loadEmployees();
      loadData();
    }
  }, [activeOrg?.id]);

  // Auto-seed demo
  useEffect(() => {
    if (activeOrg?.data_mode === "demo" && leaveTypes.length === 0 && !loading && !seeding) {
      const doSeed = async () => {
        setSeeding(true);
        try {
          await seedDemo();
          await loadData();
        } catch (e) { /* ignore */ }
        finally { setSeeding(false); }
      };
      doSeed();
    }
  }, [activeOrg?.data_mode, leaveTypes.length, loading, seeding]);

  // Load balances when employee selected
  useEffect(() => {
    if (balanceEmployeeId) {
      invoke({ action: "get_balances", employee_id: balanceEmployeeId })
        .then((data) => setBalances(data.balances || []))
        .catch(() => setBalances([]));
    } else {
      setBalances([]);
    }
  }, [balanceEmployeeId]);

  const handleCreate = async (data) => {
    await createRequest(data);
    await loadData();
  };

  const handleApprove = async (id, comments) => {
    await approveRequest(id, comments);
    await loadData();
  };

  const handleReject = async (id, comments) => {
    await rejectRequest(id, comments);
    await loadData();
  };

  const handleCancel = async (id) => {
    if (!confirm("Cancel this leave request?")) return;
    await cancelRequest(id, "Cancelled by HR");
    await loadData();
  };

  const filteredRequests = statusFilter === "all"
    ? requests
    : requests.filter((r) => r.status === statusFilter);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const onLeaveToday = calendarEvents.filter(
    (e) => e.start_date <= todayStr && e.end_date >= todayStr && e.status === "approved"
  );

  if (loading && requests.length === 0) {
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

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-brand-teal" /> Leave Management
          </h1>
          <p className="text-sm text-muted-foreground">{activeOrg?.name}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/hr/leave/settings">
            <Button variant="outline" size="sm" className="gap-1.5">
              <SettingsIcon className="w-4 h-4" /> Settings
            </Button>
          </Link>
          <Button size="sm" className="gap-1.5" onClick={() => setShowRequestDialog(true)}>
            <Plus className="w-4 h-4" /> New Request
          </Button>
        </div>
      </div>

      {seeding && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-brand-mint/30 p-3 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin" /> Setting up demo leave data...
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-status-warn" />
            <span className="text-xs text-muted-foreground">Pending</span>
          </div>
          <p className="text-2xl font-heading font-bold">{pendingCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Check className="w-4 h-4 text-status-ok" />
            <span className="text-xs text-muted-foreground">Approved</span>
          </div>
          <p className="text-2xl font-heading font-bold">{approvedCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-4 h-4 text-brand-teal" />
            <span className="text-xs text-muted-foreground">On Leave Today</span>
          </div>
          <p className="text-2xl font-heading font-bold">{onLeaveToday.length}</p>
        </Card>
      </div>

      <Tabs defaultValue="requests">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-3">
          <div className="flex items-center gap-2">
            <ResponsiveSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder="All Requests"
              triggerClassName="w-40"
              options={[
                { value: "all", label: "All Requests" },
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
                { value: "cancelled", label: "Cancelled" },
              ]}
            />
          </div>

          {filteredRequests.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No leave requests found.
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredRequests.map((r) => (
                <Card key={r.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{r.employee_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOURS[r.status] || "bg-gray-100"}`}>
                          {r.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.leave_type_name} · {r.start_date} to {r.end_date} · {r.total_days} day(s)
                      </p>
                      {r.reason && <p className="text-xs text-muted-foreground mt-1 italic">"{r.reason}"</p>}
                      {r.decision_comments && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {r.status === "approved" ? "Approved" : r.status === "rejected" ? "Rejected" : "Comments"}: {r.decision_comments}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setApprovalRequest(r)}>
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleCancel(r.id)}>
                            <Ban className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                      {(r.status === "approved" || r.status === "pending") && (
                        <Button size="sm" variant="ghost" onClick={() => handleCancel(r.id)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Balances Tab */}
        <TabsContent value="balances" className="space-y-3">
          <ResponsiveSelect
            value={balanceEmployeeId}
            onValueChange={setBalanceEmployeeId}
            placeholder="Select employee to view balances"
            options={employees.map((e) => ({ value: e.id, label: fullName(e) }))}
          />

          {!balanceEmployeeId ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Select an employee to view their leave balances.
            </Card>
          ) : balances.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No leave balances found for this employee.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {balances.map((b) => (
                <Card key={b.id} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{b.leave_type_name}</span>
                    <span className="text-xs text-muted-foreground">{b.year}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Allowance</p>
                      <p className="font-medium">{b.annual_allowance}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Carried</p>
                      <p className="font-medium">{b.carried_over}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Used</p>
                      <p className="font-medium">{b.used_days}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Remaining</p>
                      <p className="font-medium text-brand-teal">{b.remaining_days}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-3">
          {calendarEvents.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No upcoming leave events.
            </Card>
          ) : (
            <div className="space-y-2">
              {calendarEvents
                .sort((a, b) => a.start_date.localeCompare(b.start_date))
                .map((e) => (
                  <Card key={e.id} className="p-3 flex items-center gap-3">
                    <div
                      className="w-2 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: leaveTypes.find((t) => t.id === e.leave_type_id)?.colour || "#3b82f6" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{e.employee_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.leave_type_name} · {e.start_date} to {e.end_date} · {e.total_days} day(s)
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOURS[e.status] || "bg-gray-100"}`}>
                      {e.status}
                    </span>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <LeaveRequestDialog
        open={showRequestDialog}
        onClose={() => setShowRequestDialog(false)}
        onSubmit={handleCreate}
        employees={employees.filter((e) => e.employment_status === "active" || e.employment_status === "on_leave")}
        leaveTypes={leaveTypes}
      />

      <LeaveApprovalDialog
        open={!!approvalRequest}
        onClose={() => setApprovalRequest(null)}
        request={approvalRequest}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}