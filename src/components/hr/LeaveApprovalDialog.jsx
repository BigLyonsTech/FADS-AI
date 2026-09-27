import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function LeaveApprovalDialog({ open, onClose, request, onApprove, onReject }) {
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    if (open) { setComments(""); setError(null); }
  }, [open]);

  if (!request) return null;

  const handleDecision = async (decision) => {
    setLoading(true);
    setError(null);
    try {
      if (decision === "approve") {
        await onApprove(request.id, comments);
      } else {
        await onReject(request.id, comments);
      }
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Review Leave Request</DialogTitle>
          <DialogDescription>
            {request.employee_name} — {request.leave_type_name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">From</Label>
              <p className="font-medium">{request.start_date}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <p className="font-medium">{request.end_date}</p>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Working Days</Label>
            <p className="font-medium">{request.total_days} day(s)</p>
          </div>
          {request.reason && (
            <div>
              <Label className="text-xs text-muted-foreground">Reason</Label>
              <p>{request.reason}</p>
            </div>
          )}
          <div>
            <Label>Comments (recorded in audit log)</Label>
            <Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} placeholder="Approval or rejection comments..." />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={() => handleDecision("reject")} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
          </Button>
          <Button onClick={() => handleDecision("approve")} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}