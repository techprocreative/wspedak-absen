'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Users, TrendingUp, BarChart3, PieChart, Activity, RefreshCw } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { attendanceService } from '@/lib/attendance';
import { useAuth } from '@/components/auth/AuthProvider';
import { AttendanceStats } from '@/types';

interface DepartmentStats {
  name: string;
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  attendanceRate: number;
}

export function AttendanceDashboard() {
  const { authState } = useAuth();
  const user = authState.user;
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<{
    total: number;
    present: number;
    absent: number;
    late: number;
  }>({ total: 0, present: 0, absent: 0, late: 0 });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, timeRange]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get date range based on selected time range
      let startDate: Date;
      let endDate: Date = new Date();
      
      switch (timeRange) {
        case 'week':
          startDate = startOfWeek(new Date());
          endDate = endOfWeek(new Date());
          break;
        case 'month':
          startDate = startOfMonth(new Date());
          endDate = endOfMonth(new Date());
          break;
        case 'today':
        default:
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date();
          endDate.setHours(23, 59, 59, 999);
          break;
      }

      // Fetch attendance statistics
      const stats = await attendanceService.calculateAttendanceStats(user.id, startDate, endDate);
      setAttendanceStats(stats);

      // Mock department data (in a real app, this would come from an API)
      setDepartmentStats([
        { name: 'Engineering', totalEmployees: 25, presentToday: 22, absentToday: 3, lateToday: 2, attendanceRate: 88 },
        { name: 'Marketing', totalEmployees: 15, presentToday: 14, absentToday: 1, lateToday: 1, attendanceRate: 93 },
        { name: 'Sales', totalEmployees: 20, presentToday: 18, absentToday: 2, lateToday: 3, attendanceRate: 90 },
        { name: 'HR', totalEmployees: 8, presentToday: 7, absentToday: 1, lateToday: 0, attendanceRate: 87 },
        { name: 'Finance', totalEmployees: 10, presentToday: 9, absentToday: 1, lateToday: 1, attendanceRate: 90 },
      ]);

      // Mock today's attendance data (in a real app, this would come from an API)
      setTodayAttendance({
        total: 78,
        present: 70,
        absent: 8,
        late: 7,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeRangeChange = (value: 'today' | 'week' | 'month') => {
    setTimeRange(value);
  };

  const refreshData = () => {
    fetchDashboardData();
  };

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAttendanceRateBadge = (rate: number) => {
    if (rate >= 90) return <Badge className="bg-green-500">Excellent</Badge>;
    if (rate >= 80) return <Badge className="bg-yellow-500">Good</Badge>;
    return <Badge className="bg-red-500">Needs Improvement</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of attendance statistics and reports
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Today's Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAttendance.total}</div>
            <p className="text-xs text-muted-foreground">
              Registered employees
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{todayAttendance.present}</div>
            <p className="text-xs text-muted-foreground">
              {todayAttendance.total > 0 ? Math.round((todayAttendance.present / todayAttendance.total) * 100) : 0}% attendance rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{todayAttendance.absent}</div>
            <p className="text-xs text-muted-foreground">
              {todayAttendance.total > 0 ? Math.round((todayAttendance.absent / todayAttendance.total) * 100) : 0}% absence rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{todayAttendance.late}</div>
            <p className="text-xs text-muted-foreground">
              {todayAttendance.present > 0 ? Math.round((todayAttendance.late / todayAttendance.present) * 100) : 0}% of present
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Personal Statistics</TabsTrigger>
          <TabsTrigger value="department">Department Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Attendance Statistics</CardTitle>
              <CardDescription>
                Your attendance data for the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : attendanceStats ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Days</span>
                      <span className="text-lg font-bold">{attendanceStats.total_days}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Present Days</span>
                      <span className="text-lg font-bold text-green-600">{attendanceStats.present_days}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Absent Days</span>
                      <span className="text-lg font-bold text-red-600">{attendanceStats.absent_days}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Late Days</span>
                      <span className="text-lg font-bold text-yellow-600">{attendanceStats.late_days}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Early Leave Days</span>
                      <span className="text-lg font-bold text-orange-600">{attendanceStats.early_leave_days}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Overtime Hours</span>
                      <span className="text-lg font-bold text-blue-600">{attendanceStats.overtime_hours.toFixed(1)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Work Hours</span>
                      <span className="text-lg font-bold">{attendanceStats.total_work_hours.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Average Work Hours</span>
                      <span className="text-lg font-bold">{attendanceStats.average_work_hours.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Attendance Rate</span>
                      <span className="text-lg font-bold">
                        {attendanceStats.total_days > 0 
                          ? Math.round((attendanceStats.present_days / attendanceStats.total_days) * 100) 
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No attendance data available for the selected time period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="department" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department-wise Attendance</CardTitle>
              <CardDescription>
                Attendance statistics by department
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {departmentStats.map((dept) => (
                    <div key={dept.name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h3 className="font-medium">{dept.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{dept.totalEmployees} employees</span>
                          <span>{dept.presentToday} present</span>
                          <span>{dept.absentToday} absent</span>
                          <span>{dept.lateToday} late</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${getAttendanceRateColor(dept.attendanceRate)}`}>
                          {dept.attendanceRate}%
                        </span>
                        {getAttendanceRateBadge(dept.attendanceRate)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}