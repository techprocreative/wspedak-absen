/**
 * System Monitoring Page
 * Comprehensive system monitoring dashboard
 */

export const dynamic = 'force-dynamic'

import { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SystemMetricsCard } from '@/components/admin/monitoring/SystemMetricsCard';
import { AlertsCard } from '@/components/admin/monitoring/AlertsCard';
import { MetricsChart } from '@/components/admin/monitoring/MetricsChart';
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Server,
  Cpu,
  HardDrive,
  Database,
  Shield,
  TrendingUp
} from 'lucide-react';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-32">
      <Activity className="h-6 w-6 animate-spin" />
    </div>
  );
}

function MonitoringDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time system performance and health monitoring
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          Live
        </Badge>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42%</div>
            <p className="text-xs text-muted-foreground">
              +2% from last hour
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68%</div>
            <p className="text-xs text-muted-foreground">
              +5% from last hour
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">35%</div>
            <p className="text-xs text-muted-foreground">
              +1% from last hour
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              1 critical, 2 medium
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-1">
            <Server className="h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Suspense fallback={<LoadingSpinner />}>
              <SystemMetricsCard showDetails={false} />
            </Suspense>
            
            <Suspense fallback={<LoadingSpinner />}>
              <AlertsCard maxAlerts={5} showActions={false} />
            </Suspense>
          </div>
          
          <Suspense fallback={<LoadingSpinner />}>
            <MetricsChart height={300} showControls={true} />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-1">
            <Suspense fallback={<LoadingSpinner />}>
              <MetricsChart height={400} showControls={true} />
            </Suspense>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Suspense fallback={<LoadingSpinner />}>
              <SystemMetricsCard showDetails={true} />
            </Suspense>
            
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Key performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Response Time</span>
                    <span className="font-medium">120ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Request Rate</span>
                    <span className="font-medium">450/min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Error Rate</span>
                    <span className="font-medium">0.2%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Uptime</span>
                    <span className="font-medium">99.9%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="alerts" className="space-y-4">
          <Suspense fallback={<LoadingSpinner />}>
            <AlertsCard maxAlerts={20} showActions={true} />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Suspense fallback={<LoadingSpinner />}>
              <SystemMetricsCard showDetails={true} />
            </Suspense>
            
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>
                  System configuration and status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Operating System</span>
                    <span className="font-medium">Linux</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Kernel Version</span>
                    <span className="font-medium">5.15.0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Architecture</span>
                    <span className="font-medium">x86_64</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Node Version</span>
                    <span className="font-medium">18.17.0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Application Version</span>
                    <span className="font-medium">1.0.0</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent System Events</CardTitle>
              <CardDescription>
                Recent system events and logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">Info</Badge>
                  <span>System started successfully</span>
                  <span className="text-muted-foreground ml-auto">2 hours ago</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">Warning</Badge>
                  <span>High memory usage detected</span>
                  <span className="text-muted-foreground ml-auto">3 hours ago</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">Info</Badge>
                  <span>Automatic backup completed</span>
                  <span className="text-muted-foreground ml-auto">5 hours ago</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="destructive">Error</Badge>
                  <span>Failed to connect to database</span>
                  <span className="text-muted-foreground ml-auto">6 hours ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Status</CardTitle>
              <CardDescription>
                System security and vulnerability status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Security Score</span>
                  <span className="font-medium">85/100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Active Threats</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Vulnerabilities</span>
                  <span className="font-medium">2 (Low)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last Security Scan</span>
                  <span className="font-medium">1 day ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Security Events</CardTitle>
              <CardDescription>
                Recent security events and alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">Info</Badge>
                  <span>Security scan completed</span>
                  <span className="text-muted-foreground ml-auto">1 day ago</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">Warning</Badge>
                  <span>Failed login attempt detected</span>
                  <span className="text-muted-foreground ml-auto">2 days ago</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">Info</Badge>
                  <span>SSL certificate renewed</span>
                  <span className="text-muted-foreground ml-auto">5 days ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


export default function MonitoringPage() {
  return (
    <div className="container mx-auto py-6">
      <MonitoringDashboard />
    </div>
  );
}
