/**
 * Performance Dashboard Component
 * Displays performance metrics and statistics
 * Optimized for DS223J hardware constraints
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePerformanceMetrics } from '@/lib/performance-metrics';
import { useMemoryMonitor } from '@/lib/memory-monitor';
import { useQueryOptimizer } from '@/lib/query-optimizer';
import { useTransactionBatcher } from '@/lib/transaction-batcher';
import { useClientTime } from '@/hooks/use-client-time';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  HardDrive,
  Cpu as Memory,
  Network,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
  BarChart3,
  LineChart,
  PieChart
} from 'lucide-react';

interface PerformanceDashboardProps {
  className?: string;
}

export function PerformanceDashboard({ className }: PerformanceDashboardProps) {
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h'); // 1 hour
  const { formatTime, isClient } = useClientTime();
  
  // Performance metrics hooks
  const {
    getMetrics,
    getMetricSummary,
    generateReport,
    getThresholds
  } = usePerformanceMetrics();
  
  // Memory monitor hooks
  const {
    getCurrentMemoryUsage,
    getMemoryUsageHistory,
    getMemoryLeaks,
    forceGarbageCollection,
    startMonitoring,
    stopMonitoring,
    isMemoryCritical
  } = useMemoryMonitor();
  
  // Query optimizer hooks
  const {
    getCacheStats,
    clearCache
  } = useQueryOptimizer();
  
  // Transaction batcher hooks
  const {
    getBatchStats
  } = useTransactionBatcher();
  
  // State for metrics
  const [metrics, setMetrics] = useState<any[]>([]);
  const [memoryUsage, setMemoryUsage] = useState<any>(null);
  const [memoryHistory, setMemoryHistory] = useState<any[]>([]);
  const [memoryLeaks, setMemoryLeaks] = useState<any[]>([]);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [batchStats, setBatchStats] = useState<any>(null);
  const [thresholds, setThresholds] = useState<any[]>([]);
  
  // Function to refresh all data
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
      // Get performance metrics
      const now = new Date();
      const startTime = new Date(now.getTime() - getTimeRangeMs(selectedTimeRange));
      
      const performanceMetrics = getMetrics({
        startTime,
        endTime: now
      });
      setMetrics(performanceMetrics);
      
      // Get memory usage
      const currentMemory = getCurrentMemoryUsage();
      setMemoryUsage(currentMemory);
      
      // Get memory history
      const memoryUsageHistory = getMemoryUsageHistory({
        startTime,
        endTime: now
      });
      setMemoryHistory(memoryUsageHistory);
      
      // Get memory leaks
      const leaks = getMemoryLeaks({
        startTime,
        endTime: now
      });
      setMemoryLeaks(leaks);
      
      // Get cache stats
      const cache = getCacheStats();
      setCacheStats(cache);
      
      // Get batch stats
      const batch = getBatchStats();
      setBatchStats(batch);
      
      // Get thresholds
      const perfThresholds = getThresholds();
      setThresholds(perfThresholds);
    } catch (error) {
      console.error('Error refreshing performance data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedTimeRange, getMetrics, getCurrentMemoryUsage, getMemoryUsageHistory, getMemoryLeaks, getCacheStats, getBatchStats, getThresholds]);
  
  // Convert time range string to milliseconds
  const getTimeRangeMs = (timeRange: string): number => {
    switch (timeRange) {
      case '5m': return 5 * 60 * 1000;
      case '15m': return 15 * 60 * 1000;
      case '30m': return 30 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '12h': return 12 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000; // 1 hour
    }
  };
  
  // Initial data load
  useEffect(() => {
    refreshData();
  }, [refreshData]);
  
  // Set up auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval, refreshData]);
  
  // Calculate memory usage percentage
  const memoryUsagePercentage = useMemo(() => {
    if (!memoryUsage) return 0;
    return memoryUsage.percentage;
  }, [memoryUsage]);
  
  // Determine memory status
  const memoryStatus = useMemo(() => {
    if (!memoryUsage) return 'unknown';
    
    if (memoryUsage.percentage > 90) return 'critical';
    if (memoryUsage.percentage > 80) return 'warning';
    if (memoryUsage.percentage > 60) return 'caution';
    return 'good';
  }, [memoryUsage]);
  
  // Get memory status color
  const getMemoryStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'caution': return 'text-orange-500';
      case 'good': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };
  
  // Get memory status icon
  const getMemoryStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <AlertCircle className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'caution': return <AlertCircle className="h-4 w-4" />;
      case 'good': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };
  
  // Handle force garbage collection
  const handleForceGC = () => {
    forceGarbageCollection();
    // Refresh data after a short delay
    setTimeout(() => {
      refreshData();
    }, 1000);
  };
  
  // Handle clear cache
  const handleClearCache = () => {
    clearCache();
    // Refresh data after a short delay
    setTimeout(() => {
      refreshData();
    }, 1000);
  };
  
  // Handle generate report
  const handleGenerateReport = () => {
    const report = generateReport();
    console.log('Performance report:', report);
    // In a real application, you might download this report or send it to a server
  };
  
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Performance Dashboard</h2>
        <div className="flex items-center space-x-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="5m">Last 5 minutes</option>
            <option value="15m">Last 15 minutes</option>
            <option value="30m">Last 30 minutes</option>
            <option value="1h">Last hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="12h">Last 12 hours</option>
            <option value="24h">Last 24 hours</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Memory Status Alert */}
      {memoryStatus === 'critical' && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertTitle className="text-red-800">Critical Memory Usage</AlertTitle>
          <AlertDescription className="text-red-700">
            Memory usage is critically high. Consider performing garbage collection or closing unused applications.
          </AlertDescription>
        </Alert>
      )}
      
      {memoryStatus === 'warning' && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-800">High Memory Usage</AlertTitle>
          <AlertDescription className="text-yellow-700">
            Memory usage is high. Monitor closely and consider cleanup if it continues to increase.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Memory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`text-2xl font-bold ${getMemoryStatusColor(memoryStatus)}`}>
                {memoryUsage ? `${memoryUsage.used.toFixed(1)} MB` : 'N/A'}
              </div>
              <div className={`flex items-center ${getMemoryStatusColor(memoryStatus)}`}>
                {getMemoryStatusIcon(memoryStatus)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {memoryUsage ? `${memoryUsage.limit.toFixed(1)} MB total` : 'N/A'}
            </p>
            <Progress value={memoryUsagePercentage} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cacheStats ? `${((cacheStats.totalEntries - cacheStats.size) / cacheStats.totalEntries * 100).toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {cacheStats ? `${cacheStats.totalEntries} entries` : 'N/A'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Batch Queue</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {batchStats ? batchStats.pendingOperations : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {batchStats ? `${batchStats.activeConnections} active` : 'N/A'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Leaks</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {memoryLeaks ? memoryLeaks.length : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Detected in selected time range
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Detailed Tabs */}
      <Tabs defaultValue="memory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="memory">Memory</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="memory" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Memory Usage History</CardTitle>
                <CardDescription>
                  Memory usage over the selected time range
                </CardDescription>
              </CardHeader>
              <CardContent>
                {memoryHistory.length > 0 ? (
                  <div className="h-64 flex items-center justify-center border border-gray-200 rounded-md">
                    <div className="text-center">
                      <LineChart className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Memory usage chart would be displayed here</p>
                      <p className="text-xs text-gray-400">
                        {memoryHistory.length} data points
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center border border-gray-200 rounded-md">
                    <p className="text-sm text-gray-500">No memory usage data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Memory Leaks</CardTitle>
                <CardDescription>
                  Detected memory leaks in the selected time range
                </CardDescription>
              </CardHeader>
              <CardContent>
                {memoryLeaks.length > 0 ? (
                  <div className="space-y-2">
                    {memoryLeaks.slice(0, 5).map((leak, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border border-gray-200 rounded-md">
                        <div className="flex items-center space-x-2">
                          <Badge variant={leak.severity === 'critical' ? 'destructive' : leak.severity === 'high' ? 'destructive' : leak.severity === 'medium' ? 'default' : 'secondary'}>
                            {leak.severity}
                          </Badge>
                          <span className="text-sm">{leak.usage.toFixed(1)} MB</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {isClient ? formatTime(new Date(leak.timestamp)) : '--:--:--'}
                        </span>
                      </div>
                    ))}
                    {memoryLeaks.length > 5 && (
                      <p className="text-xs text-gray-500 text-center">
                        ... and {memoryLeaks.length - 5} more
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center border border-gray-200 rounded-md">
                    <div className="text-center">
                      <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                      <p className="text-sm text-gray-500">No memory leaks detected</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Response Time</CardTitle>
                <CardDescription>
                  Average response time over the selected time range
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average:</span>
                      <span className="text-sm font-medium">
                        {getMetricSummary('responseTime')?.average.toFixed(2)} ms
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Minimum:</span>
                      <span className="text-sm font-medium">
                        {getMetricSummary('responseTime')?.min.toFixed(2)} ms
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Maximum:</span>
                      <span className="text-sm font-medium">
                        {getMetricSummary('responseTime')?.max.toFixed(2)} ms
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No response time data available</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Performance Thresholds</CardTitle>
                <CardDescription>
                  Current performance thresholds and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {thresholds.length > 0 ? (
                  <div className="space-y-2">
                    {thresholds.map((threshold, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border border-gray-200 rounded-md">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{threshold.metric}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            Warning: {threshold.warning}{threshold.unit}
                          </span>
                          <span className="text-xs text-gray-500">
                            Critical: {threshold.critical}{threshold.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No threshold data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="database" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Query Cache</CardTitle>
                <CardDescription>
                  Query cache statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cacheStats ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Entries:</span>
                      <span className="text-sm font-medium">{cacheStats.totalEntries}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cache Size:</span>
                      <span className="text-sm font-medium">{cacheStats.size}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Hit Rate:</span>
                      <span className="text-sm font-medium">
                        {((cacheStats.totalEntries - cacheStats.size) / cacheStats.totalEntries * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Oldest Entry:</span>
                      <span className="text-sm font-medium">
                        {cacheStats.oldestEntry ? new Date(cacheStats.oldestEntry).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Newest Entry:</span>
                      <span className="text-sm font-medium">
                        {cacheStats.newestEntry ? new Date(cacheStats.newestEntry).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No cache data available</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Transaction Batching</CardTitle>
                <CardDescription>
                  Transaction batch statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {batchStats ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Pending Operations:</span>
                      <span className="text-sm font-medium">{batchStats.pendingOperations}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Active Connections:</span>
                      <span className="text-sm font-medium">{batchStats.activeConnections}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Idle Connections:</span>
                      <span className="text-sm font-medium">{batchStats.idleConnections}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Connections:</span>
                      <span className="text-sm font-medium">{batchStats.totalConnections}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Max Batch Size:</span>
                      <span className="text-sm font-medium">{batchStats.maxBatchSize}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No batch data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="actions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Memory Actions</CardTitle>
                <CardDescription>
                  Actions to manage memory usage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleForceGC}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Force Garbage Collection
                </Button>
                <p className="text-xs text-gray-500">
                  Manually trigger garbage collection to free up memory
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Cache Actions</CardTitle>
                <CardDescription>
                  Actions to manage query cache
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleClearCache}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Clear Query Cache
                </Button>
                <p className="text-xs text-gray-500">
                  Clear all cached queries to free up memory
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Reporting</CardTitle>
                <CardDescription>
                  Generate performance reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleGenerateReport}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Performance Report
                </Button>
                <p className="text-xs text-gray-500">
                  Generate a detailed performance report for analysis
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>
                  Performance monitoring settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Refresh Interval:</span>
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                  >
                    <option value={1000}>1 second</option>
                    <option value={5000}>5 seconds</option>
                    <option value={10000}>10 seconds</option>
                    <option value={30000}>30 seconds</option>
                    <option value={60000}>1 minute</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500">
                  How often to refresh performance data
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}