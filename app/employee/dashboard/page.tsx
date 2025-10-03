"use client";

import { useState, useEffect } from "react";
import { ApiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Coffee, AlertCircle, CheckCircle, XCircle, TrendingUp, Loader2, ArrowLeftRight } from "lucide-react";
import { BreakManagementPanel } from "@/components/break-management-panel";
import { ExceptionRequestForm } from "@/components/exception-request-form";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import Link from "next/link";

export default function EmployeeDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [pendingExceptions, setPendingExceptions] = useState<any[]>([]);
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch attendance records (you'd need to create this API)
      // For now, we'll use mock data structure
      
      // Mock stats
      setStats({
        workDays: 20,
        present: 18,
        late: 2,
        absent: 0,
        totalHours: 144.5,
        overtime: 4.5,
        avgPerDay: 8.0,
        presentPercentage: 90,
      });

      // Mock recent attendance
      setRecentAttendance([
        {
          id: '1',
          date: '2024-01-15',
          clock_in: '2024-01-15T08:25:00',
          clock_out: '2024-01-15T17:00:00',
          actual_work_hours: 8.0,
          adjusted_work_hours: 8.0,
          is_late: true,
          late_minutes: 25,
          status: 'present',
          total_break_minutes: 60,
        },
        {
          id: '2',
          date: '2024-01-14',
          clock_in: '2024-01-14T08:00:00',
          clock_out: '2024-01-14T17:30:00',
          actual_work_hours: 9.5,
          is_late: false,
          status: 'present',
          overtime_hours: 1.5,
          total_break_minutes: 60,
        },
      ]);

      // Fetch pending exceptions
      const exceptionsResult = await ApiClient.getPendingExceptions('pending');
      setPendingExceptions(exceptionsResult.exceptions || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestException = (attendance: any) => {
    setSelectedAttendance(attendance);
    setShowExceptionForm(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Attendance</h1>
        <p className="text-muted-foreground">Track your attendance, breaks, and exceptions</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/face-checkin-v2">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="font-semibold">Check In/Out</div>
                  <div className="text-sm text-muted-foreground">Face recognition check-in</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/shift-swap">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-blue-100">
                  <ArrowLeftRight className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold">Shift Swap</div>
                  <div className="text-sm text-muted-foreground">Request shift swaps</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="font-semibold">This Month</div>
                <div className="text-sm text-muted-foreground">{stats?.presentPercentage}% attendance</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance History</TabsTrigger>
          <TabsTrigger value="exceptions">
            Exceptions {pendingExceptions.length > 0 && `(${pendingExceptions.length})`}
          </TabsTrigger>
          <TabsTrigger value="breaks">Break Management</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Monthly Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Summary</CardTitle>
              <CardDescription>January 2024</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Work Days</div>
                  <div className="text-2xl font-bold">{stats?.workDays}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Present</div>
                  <div className="text-2xl font-bold text-green-600">
                    {stats?.present} <span className="text-sm">({stats?.presentPercentage}%)</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Late</div>
                  <div className="text-2xl font-bold text-orange-600">{stats?.late}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Absent</div>
                  <div className="text-2xl font-bold text-red-600">{stats?.absent}</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Hours</div>
                  <div className="text-xl font-bold">{stats?.totalHours}h</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Overtime</div>
                  <div className="text-xl font-bold text-blue-600">{stats?.overtime}h</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Avg/Day</div>
                  <div className="text-xl font-bold">{stats?.avgPerDay}h</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Attendance */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentAttendance.map((record) => (
                <div key={record.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">
                        {format(new Date(record.date), "EEEE, MMM dd, yyyy")}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                        <span>{format(new Date(record.clock_in), "HH:mm")} - {record.clock_out ? format(new Date(record.clock_out), "HH:mm") : "..."}</span>
                        <span>{record.actual_work_hours}h</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {record.is_late ? (
                        <Badge variant="destructive">Late {record.late_minutes}m</Badge>
                      ) : (
                        <Badge variant="default">On Time</Badge>
                      )}
                      {record.overtime_hours > 0 && (
                        <Badge variant="secondary">+{record.overtime_hours}h OT</Badge>
                      )}
                    </div>
                  </div>

                  {record.total_break_minutes > 0 && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Coffee className="w-3 h-3" />
                      Break: {record.total_break_minutes} minutes
                    </div>
                  )}

                  {record.adjusted_work_hours && record.adjusted_work_hours !== record.actual_work_hours && (
                    <div className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Adjusted to {record.adjusted_work_hours}h (Exception approved)
                    </div>
                  )}

                  {record.is_late && !record.adjusted_work_hours && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRequestException(record)}
                    >
                      Request Exception
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance History Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>Complete record of your attendance</CardDescription>
            </CardHeader>
            <CardContent>
              {/* This would show a full list or calendar view */}
              <div className="text-center py-8 text-muted-foreground">
                Full attendance history would be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exceptions Tab */}
        <TabsContent value="exceptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exception Requests</CardTitle>
              <CardDescription>Your pending and processed exception requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingExceptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending exception requests
                </div>
              ) : (
                pendingExceptions.map((exception) => (
                  <div key={exception.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{exception.exception_type.replace(/_/g, ' ')}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {exception.attendance?.date && format(new Date(exception.attendance.date), "MMM dd, yyyy")}
                        </div>
                      </div>
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        {exception.approval_status}
                      </Badge>
                    </div>
                    <div className="text-sm">{exception.reason}</div>
                    {exception.time_adjustment_minutes > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Requested adjustment: +{exception.time_adjustment_minutes} minutes
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Break Management Tab */}
        <TabsContent value="breaks" className="space-y-4">
          <BreakManagementPanel />
        </TabsContent>
      </Tabs>

      {/* Exception Request Form */}
      {selectedAttendance && (
        <ExceptionRequestForm
          open={showExceptionForm}
          onOpenChange={setShowExceptionForm}
          attendanceId={selectedAttendance.id}
          attendanceData={{
            date: selectedAttendance.date,
            clock_in: selectedAttendance.clock_in,
            clock_out: selectedAttendance.clock_out,
            is_late: selectedAttendance.is_late,
            late_minutes: selectedAttendance.late_minutes,
            is_early_leave: selectedAttendance.is_early_leave || false,
            early_leave_minutes: selectedAttendance.early_leave_minutes || 0,
          }}
          onSuccess={() => {
            fetchDashboardData();
            setShowExceptionForm(false);
          }}
        />
      )}
    </div>
  );
}
