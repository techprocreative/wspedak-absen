/**
 * Custom Report Builder Page
 * Interactive report builder with drag-and-drop functionality
 */

'use client'

export const dynamic = 'force-dynamic'

import { Metadata } from 'next';
import { Suspense, useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiClient } from '@/lib/api-client';
import { 
  FileText, 
  BarChart3, 
  PieChart, 
  TrendingUp,
  Plus,
  Save,
  Download,
  Eye,
  Settings,
  Layout,
  Database,
  RefreshCw
} from 'lucide-react';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
    </div>
  );
}

function ReportBuilder() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await ApiClient.getReportsStats()
      if (response.success) {
        setStats(response.data)
      }
    } catch (err: any) {
      console.error('Failed to fetch reports stats:', err)
      setError(err.message || 'Failed to fetch reports statistics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Custom Report Builder</h1>
          <p className="text-muted-foreground">
            Create custom reports with interactive builder
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold">...</div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalReports || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.monthlyChange >= 0 ? '+' : ''}{stats?.monthlyChange || 0} from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Reports</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold">...</div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.scheduledReports || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.breakdown?.daily || 0} daily, {stats?.breakdown?.weekly || 0} weekly
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shared Reports</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold">...</div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.sharedReports || 0}</div>
                <p className="text-xs text-muted-foreground">
                  With {stats?.sharing?.teams || 0} teams
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <Layout className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold">...</div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.templates || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.customTemplates || 0} custom templates
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="builder" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="builder" className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            Builder
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1">
            <Layout className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            My Reports
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            Scheduled
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="builder" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Report Configuration</CardTitle>
                <CardDescription>
                  Configure your report settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="reportName" className="text-sm font-medium">
                    Report Name
                  </label>
                  <Input id="reportName" placeholder="Enter report name" />
                </div>
                
                <div>
                  <label htmlFor="reportType" className="text-sm font-medium">
                    Report Type
                  </label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attendance">Attendance Report</SelectItem>
                      <SelectItem value="performance">Performance Report</SelectItem>
                      <SelectItem value="turnover">Turnover Report</SelectItem>
                      <SelectItem value="productivity">Productivity Report</SelectItem>
                      <SelectItem value="custom">Custom Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label htmlFor="dataSource" className="text-sm font-medium">
                    Data Source
                  </label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select data source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attendance">Attendance Data</SelectItem>
                      <SelectItem value="performance">Performance Data</SelectItem>
                      <SelectItem value="employees">Employee Data</SelectItem>
                      <SelectItem value="departments">Department Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label htmlFor="dateRange" className="text-sm font-medium">
                    Date Range
                  </label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="1y">Last Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label htmlFor="chartType" className="text-sm font-medium">
                    Chart Type
                  </label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select chart type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                      <SelectItem value="line">Line Chart</SelectItem>
                      <SelectItem value="pie">Pie Chart</SelectItem>
                      <SelectItem value="table">Data Table</SelectItem>
                      <SelectItem value="mixed">Mixed Charts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Report Preview</CardTitle>
                <CardDescription>
                  Preview of your report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Configure your report settings to see a preview
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Data Fields</CardTitle>
              <CardDescription>
                Select the data fields to include in your report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Attendance Fields</h4>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" />
                      <span>Present</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" />
                      <span>Absent</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" />
                      <span>Late</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" />
                      <span>Early Leave</span>
                    </label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Performance Fields</h4>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" />
                      <span>Productivity Score</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" />
                      <span>Quality Score</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" />
                      <span>Efficiency</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" />
                      <span>Goals Met</span>
                    </label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Employee Fields</h4>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" />
                      <span>Name</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" />
                      <span>Department</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" />
                      <span>Position</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" />
                      <span>Hire Date</span>
                    </label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Time Fields</h4>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" />
                      <span>Date</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" />
                      <span>Day of Week</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" />
                      <span>Week</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" />
                      <span>Month</span>
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Attendance Summary
                </CardTitle>
                <CardDescription>
                  Monthly attendance summary with trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Popular</Badge>
                  <Button size="sm" variant="outline">
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Analysis
                </CardTitle>
                <CardDescription>
                  Department performance comparison
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Popular</Badge>
                  <Button size="sm" variant="outline">
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Attendance Distribution
                </CardTitle>
                <CardDescription>
                  Attendance status distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">New</Badge>
                  <Button size="sm" variant="outline">
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Employee Report
                </CardTitle>
                <CardDescription>
                  Individual employee performance report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Custom</Badge>
                  <Button size="sm" variant="outline">
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Department Comparison
                </CardTitle>
                <CardDescription>
                  Multi-department comparison report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Advanced</Badge>
                  <Button size="sm" variant="outline">
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trend Analysis
                </CardTitle>
                <CardDescription>
                  Long-term trend analysis report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Advanced</Badge>
                  <Button size="sm" variant="outline">
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Reports</CardTitle>
              <CardDescription>
                Reports you have created
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Monthly Attendance Report</h4>
                    <p className="text-sm text-muted-foreground">Created on May 15, 2023</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Published</Badge>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Q2 Performance Analysis</h4>
                    <p className="text-sm text-muted-foreground">Created on June 20, 2023</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Draft</Badge>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Department Comparison</h4>
                    <p className="text-sm text-muted-foreground">Created on July 10, 2023</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Published</Badge>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>
                Reports that are automatically generated and sent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Weekly Attendance Summary</h4>
                    <p className="text-sm text-muted-foreground">Every Monday at 9:00 AM</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Active</Badge>
                    <Button size="sm" variant="outline">
                      Edit
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Monthly Performance Report</h4>
                    <p className="text-sm text-muted-foreground">1st of every month at 10:00 AM</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Active</Badge>
                    <Button size="sm" variant="outline">
                      Edit
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Quarterly Analytics Report</h4>
                    <p className="text-sm text-muted-foreground">First day of quarter at 9:00 AM</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Paused</Badge>
                    <Button size="sm" variant="outline">
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Scheduled Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Layout is provided by app/admin/layout.tsx

export default function ReportsPage() {
  return (
    <div className="container mx-auto py-6">
      <ReportBuilder />
    </div>
  );
}
