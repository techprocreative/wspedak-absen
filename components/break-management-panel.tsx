"use client";

import { useState, useEffect } from "react";
import { ApiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Coffee, Clock, PlayCircle, StopCircle, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { logger, logApiError, logApiRequest } from '@/lib/logger'
interface BreakManagementPanelProps {
  onBreakStatusChange?: (isOnBreak: boolean) => void;
}

export function BreakManagementPanel({ onBreakStatusChange }: BreakManagementPanelProps) {
  const [validation, setValidation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [breakType, setBreakType] = useState("meal");
  const { toast } = useToast();

  useEffect(() => {
    checkBreakStatus();
  }, []);

  const checkBreakStatus = async () => {
    setLoading(true);
    try {
      const result = await ApiClient.validateBreak();
      setValidation(result);
      
      // Check if currently on break (you might need to track this in state/localStorage)
      const onBreakStatus = localStorage.getItem("on_break") === "true";
      setIsOnBreak(onBreakStatus);
      onBreakStatusChange?.(onBreakStatus);
    } catch (error: any) {
      logger.error('Error checking break status', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setLoading(true);
    try {
      const result = await ApiClient.startBreak({ break_type: breakType });
      
      toast({
        title: "Success",
        description: result.message,
      });

      setIsOnBreak(true);
      localStorage.setItem("on_break", "true");
      onBreakStatusChange?.(true);
      setShowStartDialog(false);
      checkBreakStatus();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start break",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setLoading(true);
    try {
      const result = await ApiClient.endBreak();
      
      toast({
        title: "Success",
        description: result.message,
      });

      setIsOnBreak(false);
      localStorage.removeItem("on_break");
      onBreakStatusChange?.(false);
      checkBreakStatus();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to end break",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !validation) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const percentageUsed = validation?.totalMinutes 
    ? ((validation.usedMinutes || 0) / validation.totalMinutes) * 100 
    : 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Coffee className="w-5 h-5" />
                Break Time Management
              </CardTitle>
              <CardDescription>
                {validation?.policy?.name || "Loading break policy..."}
              </CardDescription>
            </div>
            {isOnBreak && (
              <Badge variant="default" className="bg-orange-500">
                On Break
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Break Usage */}
          {validation && validation.totalMinutes > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Break Usage Today</span>
                <span className="font-medium">
                  {validation.usedMinutes || 0} / {validation.totalMinutes} minutes
                </span>
              </div>
              <Progress value={percentageUsed} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{Math.round(percentageUsed)}% used</span>
                <span>{validation.remainingMinutes} min remaining</span>
              </div>
            </div>
          )}

          {/* Policy Info */}
          {validation?.policy && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1 text-sm">
                  <div>
                    <strong>Policy:</strong> {validation.policy.name}
                  </div>
                  {validation.policy.isFlexible && (
                    <div>
                      <strong>Type:</strong> Flexible (can split into {validation.policy.maxSplits} sessions)
                    </div>
                  )}
                  {!validation.policy.isFlexible && (
                    <div>
                      <strong>Type:</strong> Single break session
                    </div>
                  )}
                  <div>
                    <strong>Sessions used:</strong> {validation.policy.currentSessions} / {validation.policy.maxSplits}
                  </div>
                  {validation.policy.minDuration && (
                    <div>
                      <strong>Minimum duration:</strong> {validation.policy.minDuration} minutes per session
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Status Messages */}
          {!validation?.allowed && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Cannot take break:</strong> {validation?.reason}
                {validation?.requiredHours && (
                  <div className="mt-1 text-xs">
                    You need to work {validation.requiredHours} hours (worked: {validation.workedHours} hours)
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!isOnBreak ? (
              <>
                <Button
                  className="flex-1"
                  onClick={() => setShowStartDialog(true)}
                  disabled={!validation?.allowed || loading}
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Start Break
                </Button>
                {validation?.suggestedDuration && (
                  <Badge variant="outline" className="px-3 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {validation.suggestedDuration} min suggested
                  </Badge>
                )}
              </>
            ) : (
              <Button
                className="flex-1"
                variant="destructive"
                onClick={handleEndBreak}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <StopCircle className="w-4 h-4 mr-2" />
                )}
                End Break
              </Button>
            )}
          </div>

          {/* Tips */}
          {validation?.policy?.isFlexible && (
            <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
              <div className="font-medium">💡 Tips:</div>
              <ul className="list-disc list-inside space-y-1">
                <li>You can split your break into multiple sessions</li>
                <li>Minimum {validation.policy.minDuration} minutes per session</li>
                {validation.policy.currentSessions < validation.policy.maxSplits && (
                  <li>You have {validation.policy.maxSplits - validation.policy.currentSessions} session(s) remaining</li>
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Break Dialog */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Break</DialogTitle>
            <DialogDescription>
              Select the type of break you're taking
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="break-type">Break Type</Label>
              <Select value={breakType} onValueChange={setBreakType}>
                <SelectTrigger id="break-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meal">Meal Break</SelectItem>
                  <SelectItem value="rest">Rest Break</SelectItem>
                  <SelectItem value="prayer">Prayer Break</SelectItem>
                  <SelectItem value="coffee">Coffee Break</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {validation?.remainingMinutes && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1 text-sm">
                    <div>You have <strong>{validation.remainingMinutes} minutes</strong> of break time remaining</div>
                    {validation.suggestedDuration && (
                      <div className="text-xs text-muted-foreground">
                        Suggested duration: {validation.suggestedDuration} minutes
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartBreak} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Start Break
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
