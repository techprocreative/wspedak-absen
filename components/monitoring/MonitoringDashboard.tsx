/**
 * Comprehensive Monitoring Dashboard
 * Provides a unified view of all monitoring systems
 * Optimized for DS223J hardware constraints
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  Network,
  RefreshCw,
  Server,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle
} from 'lucide-react';
import { useClientTime } from '@/hooks/use-client-time';

// Import monitoring hooks
// Import monitoring hooks
// Import monitoring hooks
// Health check will be fetched via API
import { useMetricsCollector } from '@/lib/metrics-collector';
import { useErrorTracker } from '@/lib/error-tracker';
import { useSecurityMonitor } from '@/lib/security-monitor';
import { useSystemMonitor } from '@/lib/system-monitor';
import { useBusinessMetrics } from '@/lib/business-metrics';
import { useLogAggregator } from '@/lib/log-aggregator';

interface DashboardProps {
  className?: string;
  refreshInterval?: number; // ms
}

export const MonitoringDashboard: React.FC<DashboardProps> = ({ 
  className = '',
  refreshInterval = 30000 // 30 seconds
}) => {
  // State for dashboard data
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const { formatTime, isClient } = useClientTime();
  
  // Monitoring hooks
  const metricsCollector = useMetricsCollector();
  const errorTracker = useErrorTracker();
  const securityMonitor = useSecurityMonitor();
  const systemMonitor = useSystemMonitor();
  const businessMetrics = useBusinessMetrics();
  const logAggregator = useLogAggregator();
  
  // State for monitoring data
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [errorStats, setErrorStats] = useState<any>(null);
  const [securityStats, setSecurityStats] = useState<any>(null);
  const [businessStats, setBusinessStats] = useState<any>(null);
  const [logAggregation, setLogAggregation] = useState<any>(null);
  
  // Function to refresh all data
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Fetch health status
      const healthResponse = await fetch('/api/health');
      if (healthResponse.ok) {
        const health = await healthResponse.json();
        setHealthStatus(health);
      }
      
      // Fetch system metrics
      const system = systemMonitor.getCurrentMetrics();
      setSystemMetrics(system);
      
      // Fetch error statistics
      const errors = errorTracker.getErrorStats();
      setErrorStats(errors);
      
      // Fetch security statistics
      const security = securityMonitor.getSecurityStats();
      setSecurityStats(security);
      
      // Fetch business metrics
      const business = businessMetrics.getMetricsByCategory('attendance');
      setBusinessStats(business);
      
      // Fetch log aggregation
      const logs = logAggregator.getLatestAggregation();
      setLogAggregation(logs);
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error refreshing monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [
    systemMonitor,
    errorTracker,
    securityMonitor,
    businessMetrics,
    logAggregator
  ]);
  
  // Initial data load
  useEffect(() => {
    refreshData();
  }, [refreshData]);
  
  // Set up auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refreshData]);
  
  // Get status color based on health status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'unhealthy':
        return 'text-red-500';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };
  
  // Get status icon based on health status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Render overview tab
  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Health Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Health</CardTitle>
          {healthStatus ? getStatusIcon(healthStatus.status) : <Clock className="h-5 w-5 text-gray-500" />}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {healthStatus ? healthStatus.status.toUpperCase() : 'UNKNOWN'}
          </div>
          <p className="text-xs text-muted-foreground">
            {healthStatus ? healthStatus.summary : 'Loading...'}
          </p>
        </CardContent>
      </Card>
      
      {/* System Metrics Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
          <Cpu className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {systemMetrics ? `${systemMetrics.cpu.usage.toFixed(1)}%` : 'N/A'}
          </div>
          <Progress 
            value={systemMetrics ? systemMetrics.cpu.usage : 0} 
            className="mt-2" 
          />
        </CardContent>
      </Card>
      
      {/* Memory Usage Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
          <MemoryStick className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {systemMetrics ? `${systemMetrics.memory.usagePercentage.toFixed(1)}%` : 'N/A'}
          </div>
          <Progress 
            value={systemMetrics ? systemMetrics.memory.usagePercentage : 0} 
            className="mt-2" 
          />
        </CardContent>
      </Card>
      
      {/* Storage Usage Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
          <HardDrive className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {systemMetrics ? `${systemMetrics.storage.usagePercentage.toFixed(1)}%` : 'N/A'}
          </div>
          <Progress 
            value={systemMetrics ? systemMetrics.storage.usagePercentage : 0} 
            className="mt-2" 
          />
        </CardContent>
      </Card>
      
      {/* Error Statistics Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Errors</CardTitle>
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {errorStats ? errorStats.totalErrors : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground">
            {errorStats ? `${errorStats.unacknowledgedAlerts} unacknowledged` : 'Loading...'}
          </p>
        </CardContent>
      </Card>
      
      {/* Security Events Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Security Events</CardTitle>
          <Shield className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {securityStats ? securityStats.totalEvents : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground">
            {securityStats ? `${securityStats.activeThreats} active threats` : 'Loading...'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
  
  // Render system monitoring tab
  const renderSystemMonitoring = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU</CardTitle>
            <Cpu className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics ? `${systemMetrics.cpu.usage.toFixed(1)}%` : 'N/A'}
            </div>
            <Progress 
              value={systemMetrics ? systemMetrics.cpu.usage : 0} 
              className="mt-2" 
            />
            <p className="text-xs text-muted-foreground mt-2">
              {systemMetrics ? `Temp: ${systemMetrics.cpu.temperature.toFixed(1)}°C` : 'Loading...'}
            </p>
          </CardContent>
        </Card>
        
        {/* Memory Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory</CardTitle>
            <MemoryStick className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics ? `${systemMetrics.memory.usagePercentage.toFixed(1)}%` : 'N/A'}
            </div>
            <Progress 
              value={systemMetrics ? systemMetrics.memory.usagePercentage : 0} 
              className="mt-2" 
            />
            <p className="text-xs text-muted-foreground mt-2">
              {systemMetrics ? `${systemMetrics.memory.used.toFixed(0)}MB / ${systemMetrics.memory.used + systemMetrics.memory.free}MB` : 'Loading...'}
            </p>
          </CardContent>
        </Card>
        
        {/* Storage Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
            <HardDrive className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics ? `${systemMetrics.storage.usagePercentage.toFixed(1)}%` : 'N/A'}
            </div>
            <Progress 
              value={systemMetrics ? systemMetrics.storage.usagePercentage : 0} 
              className="mt-2" 
            />
            <p className="text-xs text-muted-foreground mt-2">
              {systemMetrics ? `${systemMetrics.storage.used.toFixed(0)}MB / ${systemMetrics.storage.used + systemMetrics.storage.free}MB` : 'Loading...'}
            </p>
          </CardContent>
        </Card>
        
        {/* Network Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network</CardTitle>
            <Network className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics ? 'Active' : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {systemMetrics ? `Errors: ${systemMetrics.network.errorsReceived + systemMetrics.network.errorsSent}` : 'Loading...'}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* System Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>System Alerts</CardTitle>
          <CardDescription>Recent system alerts and warnings</CardDescription>
        </CardHeader>
        <CardContent>
          {systemMonitor ? (
            <div className="space-y-2">
              {systemMonitor.getAlerts({ resolved: false }).slice(0, 5).map((alert: any) => (
                <Alert key={alert.id} className={`border-${alert.severity === 'critical' ? 'red' : alert.severity === 'high' ? 'orange' : 'yellow'}-200`}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{alert.title}</AlertTitle>
                  <AlertDescription>{alert.message}</AlertDescription>
                </Alert>
              ))}
              {systemMonitor.getAlerts({ resolved: false }).length === 0 && (
                <p className="text-sm text-muted-foreground">No active system alerts</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading system alerts...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
  
  // Render business metrics tab
  const renderBusinessMetrics = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Attendance Records Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Records</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {businessStats['attendance.total_records'] ? 
                businessStats['attendance.total_records'][businessStats['attendance.total_records'].length - 1].value.toFixed(0) : 
                'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Total records in system
            </p>
          </CardContent>
        </Card>
        
        {/* Today Check-ins Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today Check-ins</CardTitle>
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {businessStats['attendance.today_checkins'] ? 
                businessStats['attendance.today_checkins'][businessStats['attendance.today_checkins'].length - 1].value.toFixed(0) : 
                'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Check-ins today
            </p>
          </CardContent>
        </Card>
        
        {/* Face Recognition Success Rate Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Face Recognition</CardTitle>
            <Shield className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {businessStats['face_recognition.success_rate'] ? 
                `${businessStats['face_recognition.success_rate'][businessStats['face_recognition.success_rate'].length - 1].value.toFixed(1)}%` : 
                'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Success rate
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Business Goals */}
      <Card>
        <CardHeader>
          <CardTitle>Business Goals</CardTitle>
          <CardDescription>Progress towards business objectives</CardDescription>
        </CardHeader>
        <CardContent>
          {businessMetrics ? (
            <div className="space-y-4">
              {businessMetrics.getGoals({ achieved: false }).slice(0, 5).map((goal: any) => (
                <div key={goal.id} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{goal.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {goal.currentValue} / {goal.targetValue}
                    </span>
                  </div>
                  <Progress 
                    value={(goal.currentValue / goal.targetValue) * 100} 
                    className="h-2" 
                  />
                </div>
              ))}
              {businessMetrics.getGoals({ achieved: false }).length === 0 && (
                <p className="text-sm text-muted-foreground">No active business goals</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading business goals...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
  
  // Render error tracking tab
  const renderErrorTracking = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Errors Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {errorStats ? errorStats.totalErrors : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
        
        {/* Error Groups Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Groups</CardTitle>
            <Database className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {errorStats ? errorStats.totalGroups : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {errorStats ? `${errorStats.resolvedGroups} resolved` : 'Loading...'}
            </p>
          </CardContent>
        </Card>
        
        {/* Unacknowledged Alerts Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unacknowledged</CardTitle>
            <XCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {errorStats ? errorStats.unacknowledgedAlerts : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Alerts
            </p>
          </CardContent>
        </Card>
        
        {/* Top Errors Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Error</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {errorStats && errorStats.topErrors.length > 0 ? 
                errorStats.topErrors[0].title.substring(0, 10) + '...' : 
                'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {errorStats && errorStats.topErrors.length > 0 ? 
                `${errorStats.topErrors[0].count} occurrences` : 
                'Loading...'
              }
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Errors</CardTitle>
          <CardDescription>Most recent error reports</CardDescription>
        </CardHeader>
        <CardContent>
          {errorTracker ? (
            <div className="space-y-2">
              {errorTracker.getErrorReports({ resolved: false }).slice(0, 5).map((error: any) => (
                <Alert key={error.id} className="border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{error.type}: {error.message.substring(0, 50)}...</AlertTitle>
                  <AlertDescription>
                    {new Date(error.timestamp).toLocaleString()} - {error.context.component}
                  </AlertDescription>
                </Alert>
              ))}
              {errorTracker.getErrorReports({ resolved: false }).length === 0 && (
                <p className="text-sm text-muted-foreground">No unresolved errors</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading errors...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
  
  // Render security monitoring tab
  const renderSecurityMonitoring = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Security Events Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
            <Shield className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityStats ? securityStats.totalEvents : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Total events
            </p>
          </CardContent>
        </Card>
        
        {/* Active Threats Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityStats ? securityStats.activeThreats : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
        
        {/* Authentication Failures Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auth Failures</CardTitle>
            <XCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityStats ? securityStats.eventsByType['authentication_failure'] || 0 : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Recent failures
            </p>
          </CardContent>
        </Card>
        
        {/* Suspicious Activity Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Activity</CardTitle>
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityStats ? securityStats.eventsByType['suspicious_activity'] || 0 : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Detected events
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
          <CardDescription>Most recent security events and threats</CardDescription>
        </CardHeader>
        <CardContent>
          {securityMonitor ? (
            <div className="space-y-2">
              {securityMonitor.getEvents({ resolved: false }).slice(0, 5).map((event: any) => (
                <Alert key={event.id} className={`border-${event.severity === 'critical' ? 'red' : event.severity === 'high' ? 'orange' : 'yellow'}-200`}>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>{event.type}: {event.title}</AlertTitle>
                  <AlertDescription>
                    {new Date(event.timestamp).toLocaleString()} - {event.source}
                  </AlertDescription>
                </Alert>
              ))}
              {securityMonitor.getEvents({ resolved: false }).length === 0 && (
                <p className="text-sm text-muted-foreground">No unresolved security events</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading security events...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
  
  // Render log aggregation tab
  const renderLogAggregation = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Logs Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <Database className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logAggregation ? logAggregation.totalLogs : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              In current aggregation
            </p>
          </CardContent>
        </Card>
        
        {/* Error Logs Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Logs</CardTitle>
            <XCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logAggregation ? logAggregation.logsByLevel.error + logAggregation.logsByLevel.fatal : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Error and fatal logs
            </p>
          </CardContent>
        </Card>
        
        {/* Warning Logs Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warning Logs</CardTitle>
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logAggregation ? logAggregation.logsByLevel.warn : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Warning logs
            </p>
          </CardContent>
        </Card>
        
        {/* Error Rate Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logAggregation ? `${logAggregation.performanceMetrics.errorRate.toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Of total logs
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Log Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Log Insights</CardTitle>
          <CardDescription>Key insights from log aggregation</CardDescription>
        </CardHeader>
        <CardContent>
          {logAggregation ? (
            <div className="space-y-2">
              {logAggregation.insights.map((insight: string, index: number) => (
                <Alert key={index}>
                  <Activity className="h-4 w-4" />
                  <AlertTitle>Insight</AlertTitle>
                  <AlertDescription>{insight}</AlertDescription>
                </Alert>
              ))}
              {logAggregation.insights.length === 0 && (
                <p className="text-sm text-muted-foreground">No insights available</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading log insights...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Monitoring Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            Last refresh: {isClient && lastRefresh ? formatTime(lastRefresh) : '--:--:--'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {renderOverview()}
        </TabsContent>
        
        <TabsContent value="system" className="space-y-4">
          {renderSystemMonitoring()}
        </TabsContent>
        
        <TabsContent value="business" className="space-y-4">
          {renderBusinessMetrics()}
        </TabsContent>
        
        <TabsContent value="errors" className="space-y-4">
          {renderErrorTracking()}
        </TabsContent>
        
        <TabsContent value="security" className="space-y-4">
          {renderSecurityMonitoring()}
        </TabsContent>
        
        <TabsContent value="logs" className="space-y-4">
          {renderLogAggregation()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringDashboard;