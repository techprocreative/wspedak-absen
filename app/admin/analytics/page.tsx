/**
 * Advanced Analytics Page
 * Comprehensive analytics dashboard with predictive insights
 */

'use client'

export const dynamic = 'force-dynamic'

import { Metadata } from 'next';
import { Suspense, useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AttendanceAnalyticsChart } from '@/components/admin/analytics/AttendanceAnalyticsChart';
import { PredictiveAnalyticsCard } from '@/components/admin/analytics/PredictiveAnalyticsCard';
import { ApiClient } from '@/lib/api-client';
import { logger, logApiError, logApiRequest } from '@/lib/logger'
import {
  BarChart3, 
  TrendingUp, 
  Users, 
  Target,
  Calendar,
  Activity,
  PieChart,
  Brain,
  RefreshCw
} from 'lucide-react';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-32">
      <Activity className="h-6 w-6 animate-spin" />
    </div>
  );
}

function AnalyticsDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await ApiClient.getAnalyticsStats()
      if (response.success) {
        setStats(response.data)
      } else {
        setError('No analytics data available')
      }
    } catch (err: any) {
      logger.error('Failed to fetch analytics stats', err as Error)
      setError(err.message || 'Failed to fetch analytics statistics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  // Show error state
  if (error && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
            <p className="text-muted-foreground">
              Comprehensive analytics and predictive insights
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to Load Analytics Data</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              {error}
            </p>
            <Button onClick={fetchStats}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show empty state when no data
  if (!loading && (!stats || Object.keys(stats).length === 0)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
            <p className="text-muted-foreground">
              Comprehensive analytics and predictive insights
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Analytics Data Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Analytics data will appear here once you have employee attendance records.
              Start by adding employees and recording their attendance.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.location.href = '/admin/employees'}>
                <Users className="h-4 w-4 mr-2" />
                Manage Employees
              </Button>
              <Button onClick={() => window.location.href = '/admin/attendance'}>
                <Calendar className="h-4 w-4 mr-2" />
                View Attendance
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and predictive insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Badge variant="outline" className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            AI-Powered
          </Badge>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Attendance</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold">...</div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.avgAttendance?.toFixed(1) || '0.0'}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.avgAttendanceChange >= 0 ? '+' : ''}{stats?.avgAttendanceChange?.toFixed(1) || '0.0'}% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productivity Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold">...</div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.productivityScore?.toFixed(1) || '0.0'}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.productivityChange >= 0 ? '+' : ''}{stats?.productivityChange?.toFixed(1) || '0.0'}% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turnover Risk</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold">...</div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.turnoverRisk?.toFixed(1) || '0.0'}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.turnoverChange >= 0 ? '+' : ''}{stats?.turnoverChange?.toFixed(1) || '0.0'}% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prediction Accuracy</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold">...</div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.predictionAccuracy?.toFixed(1) || '0.0'}%</div>
                <p className="text-xs text-muted-foreground">
                  Last 30 days
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="attendance" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="predictive" className="flex items-center gap-1">
            <Brain className="h-4 w-4" />
            Predictive
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center gap-1">
            <PieChart className="h-4 w-4" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="attendance" className="space-y-4">
          <Suspense fallback={<LoadingSpinner />}>
            <AttendanceAnalyticsChart height={400} showControls={true} />
          </Suspense>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Patterns</CardTitle>
                <CardDescription>
                  Key attendance patterns and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Peak Attendance Day</span>
                    <span className="font-medium">Wednesday</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Lowest Attendance Day</span>
                    <span className="font-medium">Friday</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Most Common Issue</span>
                    <span className="font-medium">Late Arrival</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Absenteeism Rate</span>
                    <span className="font-medium">5.2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Attendance Distribution</CardTitle>
                <CardDescription>
                  Current attendance status distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Present</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                      <span className="font-medium">85%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Late</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '8%' }}></div>
                      </div>
                      <span className="font-medium">8%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Absent</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                      </div>
                      <span className="font-medium">5%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Early Leave</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '2%' }}></div>
                      </div>
                      <span className="font-medium">2%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department Performance Comparison</CardTitle>
              <CardDescription>
                Performance metrics across departments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Engineering</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                    <span className="font-medium">92%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sales</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '88%' }}></div>
                    </div>
                    <span className="font-medium">88%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Marketing</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                    <span className="font-medium">85%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>HR</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '82%' }}></div>
                    </div>
                    <span className="font-medium">82%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Finance</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                    </div>
                    <span className="font-medium">78%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>
                  Employees with highest performance scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>John Doe</span>
                    <Badge variant="outline">Engineering</Badge>
                    <span className="font-medium">98%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Jane Smith</span>
                    <Badge variant="outline">Sales</Badge>
                    <span className="font-medium">96%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Mike Johnson</span>
                    <Badge variant="outline">Engineering</Badge>
                    <span className="font-medium">95%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Sarah Williams</span>
                    <Badge variant="outline">Marketing</Badge>
                    <span className="font-medium">94%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>
                  Monthly performance trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>January</span>
                    <span className="font-medium">82%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>February</span>
                    <span className="font-medium">84%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>March</span>
                    <span className="font-medium">85%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>April</span>
                    <span className="font-medium">87%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>May</span>
                    <span className="font-medium">89%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="predictive" className="space-y-4">
          <Suspense fallback={<LoadingSpinner />}>
            <PredictiveAnalyticsCard />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="departments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Department Size</CardTitle>
                <CardDescription>
                  Number of employees by department
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Engineering</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                      </div>
                      <span className="font-medium">40</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Sales</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                      </div>
                      <span className="font-medium">30</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Marketing</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                      </div>
                      <span className="font-medium">15</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>HR</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                      </div>
                      <span className="font-medium">10</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Finance</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                      </div>
                      <span className="font-medium">5</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Department Attendance</CardTitle>
                <CardDescription>
                  Average attendance rate by department
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Engineering</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                      </div>
                      <span className="font-medium">92%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Sales</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '88%' }}></div>
                      </div>
                      <span className="font-medium">88%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Marketing</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                      <span className="font-medium">85%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>HR</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '90%' }}></div>
                      </div>
                      <span className="font-medium">90%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Finance</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                      </div>
                      <span className="font-medium">95%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Key Trends</CardTitle>
              <CardDescription>
                Important trends and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span>Attendance rate has increased by 5% over the last quarter</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span>Productivity has improved by 3% month-over-month</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span>Employee satisfaction has increased by 7% this year</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                  <span>Turnover rate has decreased by 2% compared to last year</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span>Late arrivals have decreased by 10% this month</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>
                AI-powered recommendations based on data analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium">Improve Friday Attendance</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Consider implementing flexible work hours on Fridays to improve attendance.
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium">Address Late Arrivals</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Implement a reminder system 30 minutes before start time to reduce late arrivals.
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium">Focus on Finance Department</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Provide additional training and resources to improve performance in the Finance department.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Layout is provided by app/admin/layout.tsx

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto py-6">
      <AnalyticsDashboard />
    </div>
  );
}
