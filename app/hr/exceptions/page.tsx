"use client";

import { useState, useEffect } from "react";
import { ApiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2, User, CalendarDays, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function HRExceptionsPage() {
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const { toast } = useToast();

  // Dialog states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedException, setSelectedException] = useState<any>(null);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExceptions();
  }, [selectedStatus]);

  const fetchExceptions = async () => {
    setLoading(true);
    try {
      const result = await ApiClient.getPendingExceptions(selectedStatus);
      setExceptions(result.exceptions || []);
      setSummary(result.summary || {});
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch exceptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async () => {
    if (!selectedException) return;

    if (approvalAction === "reject" && !notes.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await ApiClient.approveException(
        selectedException.id,
        approvalAction,
        notes
      );

      toast({
        title: "Success",
        description: result.message,
      });

      setShowApprovalDialog(false);
      setNotes("");
      fetchExceptions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process exception",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getExceptionTypeBadge = (type: string) => {
    const typeConfig: any = {
      late_traffic: { label: "Late - Traffic", color: "bg-yellow-100 text-yellow-800" },
      late_medical: { label: "Late - Medical", color: "bg-red-100 text-red-800" },
      late_emergency: { label: "Late - Emergency", color: "bg-red-100 text-red-800" },
      late_weather: { label: "Late - Weather", color: "bg-blue-100 text-blue-800" },
      early_medical: { label: "Early - Medical", color: "bg-red-100 text-red-800" },
      early_personal: { label: "Early - Personal", color: "bg-purple-100 text-purple-800" },
      break_extended: { label: "Break Extended", color: "bg-orange-100 text-orange-800" },
    };

    const config = typeConfig[type] || { label: type, color: "bg-gray-100 text-gray-800" };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      pending: { label: "Pending", variant: "secondary", icon: Clock },
      approved: { label: "Approved", variant: "default", icon: CheckCircle },
      rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
      auto_approved: { label: "Auto-Approved", variant: "default", icon: CheckCircle },
    };

    const config = statusConfig[status] || { label: status, variant: "secondary", icon: AlertCircle };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityLevel = (exception: any) => {
    if (exception.exception_type.includes('emergency')) return 'high';
    if (exception.exception_type.includes('medical')) return 'medium';
    return 'low';
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: "bg-red-100 text-red-800 border-red-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: "bg-green-100 text-green-800 border-green-200"
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border ${colors[priority as keyof typeof colors]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Exception Approvals</h1>
          <p className="text-muted-foreground">Review and approve attendance exceptions</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl">{summary.pending || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-2xl text-green-600">{summary.approved || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rejected</CardDescription>
            <CardTitle className="text-2xl text-red-600">{summary.rejected || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{summary.total || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending ({summary.pending || 0})</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="">All</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus} className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : exceptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No exceptions found</p>
              </CardContent>
            </Card>
          ) : (
            exceptions.map((exception, index) => {
              const priority = getPriorityLevel(exception);
              
              return (
                <Card key={exception.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg">#{index + 1}</CardTitle>
                          {getExceptionTypeBadge(exception.exception_type)}
                          {getPriorityBadge(priority)}
                        </div>
                        <CardDescription className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {exception.user?.name} • {exception.user?.department}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(exception.approval_status)}
                        {exception.attendance?.date && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {format(new Date(exception.attendance.date), "MMM dd, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column */}
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Attendance Details</div>
                          <div className="text-sm space-y-1 mt-1">
                            {exception.attendance?.clock_in && (
                              <div>
                                Clock In: {format(new Date(exception.attendance.clock_in), "HH:mm")}
                                {exception.attendance.is_late && (
                                  <span className="text-red-600 ml-2">
                                    ({exception.attendance.late_minutes} min late)
                                  </span>
                                )}
                              </div>
                            )}
                            {exception.attendance?.clock_out && (
                              <div>
                                Clock Out: {format(new Date(exception.attendance.clock_out), "HH:mm")}
                                {exception.attendance.is_early_leave && (
                                  <span className="text-orange-600 ml-2">
                                    ({exception.attendance.early_leave_minutes} min early)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Reason</div>
                          <p className="text-sm mt-1">{exception.reason}</p>
                        </div>

                        {exception.supporting_document && (
                          <div>
                            <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              Supporting Document
                            </div>
                            <a 
                              href={exception.supporting_document} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                            >
                              View Document
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Right Column */}
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Impact</div>
                          <div className="text-sm space-y-1 mt-1">
                            <div>Time Adjustment: <span className="font-medium">+{exception.time_adjustment_minutes} min</span></div>
                            <div>Salary Impact: {exception.affect_salary ? (
                              <span className="text-red-600 font-medium">
                                -Rp {exception.salary_deduction_amount?.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-green-600 font-medium">None</span>
                            )}</div>
                            <div>Performance: {exception.affect_performance ? (
                              <span className="text-red-600">-{exception.performance_penalty_points} point(s)</span>
                            ) : (
                              <span className="text-green-600">No penalty</span>
                            )}</div>
                          </div>
                        </div>

                        {exception.approved_at && (
                          <div>
                            <div className="text-sm font-medium text-muted-foreground">Approval Info</div>
                            <div className="text-sm space-y-1 mt-1">
                              <div>Approved by: {exception.approver?.name || 'System'}</div>
                              <div>Date: {format(new Date(exception.approved_at), "MMM dd, yyyy HH:mm")}</div>
                              {exception.hr_notes && (
                                <div className="mt-2">
                                  <div className="text-xs text-muted-foreground">HR Notes:</div>
                                  <div className="text-sm italic">{exception.hr_notes}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {exception.approval_status === 'pending' && (
                      <div className="mt-4 pt-4 border-t flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedException(exception);
                            setApprovalAction("approve");
                            setShowApprovalDialog(true);
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedException(exception);
                            setApprovalAction("reject");
                            setShowApprovalDialog(true);
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button size="sm" variant="outline">
                          View Full Details
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve" ? "Approve Exception" : "Reject Exception"}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === "approve"
                ? "You are about to approve this exception request."
                : "Please provide a reason for rejecting this exception."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes {approvalAction === "reject" && "*"}</Label>
            <Textarea
              id="notes"
              placeholder={approvalAction === "approve" ? "Optional notes" : "Reason for rejection"}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApproval}
              disabled={submitting || (approvalAction === "reject" && !notes.trim())}
              variant={approvalAction === "approve" ? "default" : "destructive"}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {approvalAction === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
