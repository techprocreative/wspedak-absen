"use client";

import { useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExceptionRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendanceId: string;
  attendanceData: {
    date: string;
    clock_in: string;
    clock_out?: string;
    is_late: boolean;
    late_minutes: number;
    is_early_leave: boolean;
    early_leave_minutes: number;
  };
  onSuccess?: () => void;
}

const EXCEPTION_TYPES = {
  late_traffic: {
    label: "Late - Traffic Jam",
    description: "Heavy traffic or road congestion",
    autoApprove: false,
  },
  late_medical: {
    label: "Late - Medical Emergency",
    description: "Medical emergency or urgent health issue",
    autoApprove: true,
  },
  late_emergency: {
    label: "Late - Family Emergency",
    description: "Family emergency or urgent personal matter",
    autoApprove: false,
  },
  late_vehicle: {
    label: "Late - Vehicle Breakdown",
    description: "Vehicle breakdown or mechanical issue",
    autoApprove: false,
  },
  late_transport: {
    label: "Late - Public Transport Delay",
    description: "Public transportation delay",
    autoApprove: false,
  },
  late_weather: {
    label: "Late - Weather/Disaster",
    description: "Bad weather, flood, or natural disaster",
    autoApprove: true, // If mass event
  },
  early_medical: {
    label: "Early Leave - Medical",
    description: "Medical reason for early departure",
    autoApprove: true, // With document
  },
  early_personal: {
    label: "Early Leave - Personal",
    description: "Pre-approved personal matter",
    autoApprove: false,
  },
};

export function ExceptionRequestForm({
  open,
  onOpenChange,
  attendanceId,
  attendanceData,
  onSuccess,
}: ExceptionRequestFormProps) {
  const [exceptionType, setExceptionType] = useState<string>("");
  const [reason, setReason] = useState("");
  const [supportingDocument, setSupportingDocument] = useState("");
  const [requestAdjustment, setRequestAdjustment] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!exceptionType || !reason.trim()) {
      toast({
        title: "Error",
        description: "Please select exception type and provide a reason",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await ApiClient.requestException({
        attendance_id: attendanceId,
        exception_type: exceptionType,
        reason: reason.trim(),
        supporting_document: supportingDocument || undefined,
        request_adjustment: requestAdjustment,
      });

      toast({
        title: "Success",
        description: result.message,
      });

      // Reset form
      setExceptionType("");
      setReason("");
      setSupportingDocument("");
      setRequestAdjustment(true);

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit exception request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getImpactPreview = () => {
    const hourlyRate = 125000; // Example rate
    let timeAdjustment = 0;

    if (exceptionType.startsWith("late_")) {
      timeAdjustment = attendanceData.late_minutes;
    } else if (exceptionType.startsWith("early_")) {
      timeAdjustment = attendanceData.early_leave_minutes;
    }

    const salaryDeduction = (timeAdjustment / 60) * hourlyRate;

    return {
      timeAdjustment,
      salaryDeduction,
      willAutoApprove: EXCEPTION_TYPES[exceptionType as keyof typeof EXCEPTION_TYPES]?.autoApprove,
    };
  };

  const impact = exceptionType ? getImpactPreview() : null;
  const selectedType = exceptionType ? EXCEPTION_TYPES[exceptionType as keyof typeof EXCEPTION_TYPES] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Exception</DialogTitle>
          <DialogDescription>
            Request an exception for your attendance on {new Date(attendanceData.date).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Attendance Summary */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1 text-sm">
                <div><strong>Date:</strong> {new Date(attendanceData.date).toLocaleDateString()}</div>
                <div><strong>Clock In:</strong> {new Date(attendanceData.clock_in).toLocaleTimeString()}</div>
                {attendanceData.clock_out && (
                  <div><strong>Clock Out:</strong> {new Date(attendanceData.clock_out).toLocaleTimeString()}</div>
                )}
                {attendanceData.is_late && (
                  <div className="text-red-600">
                    <strong>Late:</strong> {attendanceData.late_minutes} minutes
                  </div>
                )}
                {attendanceData.is_early_leave && (
                  <div className="text-orange-600">
                    <strong>Early Leave:</strong> {attendanceData.early_leave_minutes} minutes
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* Exception Type */}
          <div className="space-y-2">
            <Label htmlFor="exception-type">Exception Type *</Label>
            <Select value={exceptionType} onValueChange={setExceptionType}>
              <SelectTrigger id="exception-type">
                <SelectValue placeholder="Select exception type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXCEPTION_TYPES).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex flex-col items-start">
                      <div className="font-medium">{value.label}</div>
                      <div className="text-xs text-muted-foreground">{value.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType?.autoApprove && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                May be auto-approved if conditions are met
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason / Explanation *</Label>
            <Textarea
              id="reason"
              placeholder="Provide detailed explanation for your exception request..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Be specific and honest. This will be reviewed by HR.
            </p>
          </div>

          {/* Supporting Document */}
          <div className="space-y-2">
            <Label htmlFor="document">Supporting Document (Optional)</Label>
            <input
              id="document"
              type="text"
              placeholder="URL to supporting document (e.g., sick letter, photo)"
              value={supportingDocument}
              onChange={(e) => setSupportingDocument(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              Provide a link to your supporting document (Google Drive, etc.)
            </p>
          </div>

          {/* Request Adjustment */}
          <div className="flex items-center space-x-2 border rounded-md p-3">
            <Checkbox
              id="adjustment"
              checked={requestAdjustment}
              onCheckedChange={(checked) => setRequestAdjustment(checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="adjustment"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Request work hour adjustment (no salary deduction)
              </label>
              <p className="text-xs text-muted-foreground">
                If approved, your work hours will be adjusted and you won't be penalized
              </p>
            </div>
          </div>

          {/* Impact Preview */}
          {impact && (
            <Alert className={requestAdjustment ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-semibold text-sm">
                    {requestAdjustment ? "If Approved:" : "If Rejected:"}
                  </div>
                  
                  {requestAdjustment ? (
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        Time adjustment: +{impact.timeAdjustment} minutes
                      </div>
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        No salary deduction
                      </div>
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        No performance penalty
                      </div>
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        Full work hour credit
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-red-700">
                        <XCircle className="w-4 h-4" />
                        Work hours deducted: -{(impact.timeAdjustment / 60).toFixed(2)}h
                      </div>
                      <div className="flex items-center gap-2 text-red-700">
                        <XCircle className="w-4 h-4" />
                        Salary deduction: Rp {impact.salaryDeduction.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2 text-red-700">
                        <XCircle className="w-4 h-4" />
                        Performance penalty: -1 point
                      </div>
                    </div>
                  )}

                  {impact.willAutoApprove && (
                    <div className="mt-2 pt-2 border-t border-green-300">
                      <p className="text-xs text-green-700 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        This type of exception may be auto-approved
                      </p>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !exceptionType || !reason.trim()}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit for HR Approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
