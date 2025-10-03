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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, Clock, User, CalendarDays, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function ShiftSwapPage() {
  const [swaps, setSwaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("all");
  const { toast } = useToast();

  // Dialog states
  const [showRespondDialog, setShowRespondDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedSwap, setSelectedSwap] = useState<any>(null);
  const [respondType, setRespondType] = useState<"accept" | "reject">("accept");
  const [rejectionReason, setRejectionReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSwaps();
  }, [selectedTab]);

  const fetchSwaps = async () => {
    setLoading(true);
    try {
      const result = await ApiClient.getShiftSwaps(selectedTab as any);
      setSwaps(result.swaps || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch shift swaps",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!selectedSwap) return;
    
    if (respondType === "reject" && !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await ApiClient.respondToSwap(
        selectedSwap.id,
        respondType,
        rejectionReason
      );

      toast({
        title: "Success",
        description: result.message,
      });

      setShowRespondDialog(false);
      setRejectionReason("");
      fetchSwaps();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to respond to swap request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedSwap || !cancelReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a cancellation reason",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await ApiClient.cancelSwap(selectedSwap.id, cancelReason);

      toast({
        title: "Success",
        description: result.message,
      });

      setShowCancelDialog(false);
      setCancelReason("");
      fetchSwaps();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel swap request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      pending_target: { label: "Pending Target", variant: "secondary", icon: Clock },
      pending_manager: { label: "Pending Manager", variant: "secondary", icon: Clock },
      pending_hr: { label: "Pending HR", variant: "secondary", icon: Clock },
      approved: { label: "Approved", variant: "default", icon: CheckCircle },
      rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
      cancelled: { label: "Cancelled", variant: "outline", icon: XCircle },
      completed: { label: "Completed", variant: "default", icon: CheckCircle },
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

  const getSwapTypeBadge = (type: string) => {
    const typeConfig: any = {
      direct_swap: "Direct Swap",
      one_way_coverage: "Coverage",
      temporary_coverage: "Temporary",
      emergency_swap: "Emergency",
      partial_swap: "Partial",
    };

    return <Badge variant="outline">{typeConfig[type] || type}</Badge>;
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "EEE, MMM dd, yyyy");
    } catch {
      return date;
    }
  };

  const formatTime = (time: string) => {
    try {
      return format(new Date(`2000-01-01T${time}`), "HH:mm");
    } catch {
      return time;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Shift Swap</h1>
          <p className="text-muted-foreground">Request and manage shift swaps with colleagues</p>
        </div>
        <Button>
          <ArrowLeftRight className="w-4 h-4 mr-2" />
          Request Swap
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Swaps</TabsTrigger>
          <TabsTrigger value="incoming">Incoming</TabsTrigger>
          <TabsTrigger value="outgoing">My Requests</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : swaps.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No shift swaps found</p>
              </CardContent>
            </Card>
          ) : (
            swaps.map((swap) => (
              <Card key={swap.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{swap.swap_code}</CardTitle>
                        {getSwapTypeBadge(swap.swap_type)}
                        {swap.is_emergency && <Badge variant="destructive">Emergency</Badge>}
                      </div>
                      <CardDescription>{swap.reason}</CardDescription>
                    </div>
                    {getStatusBadge(swap.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Requestor */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <User className="w-4 h-4" />
                        From: {swap.requestor?.name}
                      </div>
                      <div className="pl-6 space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-3 h-3" />
                          {formatDate(swap.requestor_date)}
                        </div>
                        {swap.requestor_shift && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {swap.requestor_shift.name} ({formatTime(swap.requestor_shift.start_time)} - {formatTime(swap.requestor_shift.end_time)})
                          </div>
                        )}
                        {swap.requestor?.department && (
                          <div className="text-xs">{swap.requestor.department}</div>
                        )}
                      </div>
                    </div>

                    {/* Target */}
                    {swap.target && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium flex items-center gap-2">
                          <User className="w-4 h-4" />
                          To: {swap.target?.name}
                        </div>
                        <div className="pl-6 space-y-1 text-sm text-muted-foreground">
                          {swap.target_date && (
                            <div className="flex items-center gap-2">
                              <CalendarDays className="w-3 h-3" />
                              {formatDate(swap.target_date)}
                            </div>
                          )}
                          {swap.target_shift && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              {swap.target_shift.name} ({formatTime(swap.target_shift.start_time)} - {formatTime(swap.target_shift.end_time)})
                            </div>
                          )}
                          {swap.target?.department && (
                            <div className="text-xs">{swap.target.department}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Approval Status */}
                  {swap.status !== "pending_target" && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <div className="text-sm font-medium">Approval Progress:</div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {swap.target_response && (
                          <div className="flex items-center gap-2">
                            {swap.target_response === "accepted" ? (
                              <CheckCircle className="w-3 h-3 text-green-600" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-600" />
                            )}
                            Target: {swap.target_response}
                            {swap.target_approved_at && ` (${format(new Date(swap.target_approved_at), "MMM dd, HH:mm")})`}
                          </div>
                        )}
                        {swap.manager_response && (
                          <div className="flex items-center gap-2">
                            {swap.manager_response === "approved" ? (
                              <CheckCircle className="w-3 h-3 text-green-600" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-600" />
                            )}
                            Manager: {swap.manager_response}
                            {swap.manager_approved_at && ` (${format(new Date(swap.manager_approved_at), "MMM dd, HH:mm")})`}
                          </div>
                        )}
                        {swap.hr_response && (
                          <div className="flex items-center gap-2">
                            {swap.hr_response === "approved" ? (
                              <CheckCircle className="w-3 h-3 text-green-600" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-600" />
                            )}
                            HR: {swap.hr_response}
                            {swap.hr_approved_at && ` (${format(new Date(swap.hr_approved_at), "MMM dd, HH:mm")})`}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t flex gap-2">
                    {swap.status === "pending_target" && swap.target_id === "current-user-id" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedSwap(swap);
                            setRespondType("accept");
                            setShowRespondDialog(true);
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedSwap(swap);
                            setRespondType("reject");
                            setShowRespondDialog(true);
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}

                    {swap.status.includes("pending") && swap.requestor_id === "current-user-id" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSwap(swap);
                          setShowCancelDialog(true);
                        }}
                      >
                        Cancel Request
                      </Button>
                    )}

                    <Button size="sm" variant="ghost">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Respond Dialog */}
      <Dialog open={showRespondDialog} onOpenChange={setShowRespondDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {respondType === "accept" ? "Accept Swap Request" : "Reject Swap Request"}
            </DialogTitle>
            <DialogDescription>
              {respondType === "accept"
                ? "You are about to accept this shift swap request."
                : "Please provide a reason for rejecting this swap request."}
            </DialogDescription>
          </DialogHeader>

          {respondType === "reject" && (
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Why are you rejecting this request?"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRespondDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRespond}
              disabled={submitting || (respondType === "reject" && !rejectionReason.trim())}
              variant={respondType === "accept" ? "default" : "destructive"}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {respondType === "accept" ? "Accept Request" : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Swap Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this swap request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Cancellation Reason *</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Why are you cancelling this request?"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Close
            </Button>
            <Button
              onClick={handleCancel}
              disabled={submitting || !cancelReason.trim()}
              variant="destructive"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cancel Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
