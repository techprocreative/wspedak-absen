/**
 * System Metrics Card Component
 * Displays real-time system performance metrics
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, Cpu, HardDrive, Database, Activity } from 'lucide-react';

interface SystemMetrics {
  timestamp: string;
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercentage: number;
  };
  storage: {
    total: number;
    used: number;
    free: number;
    usagePercentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  uptime: number;
  processes: number;
}

interface SystemMetricsCardProps {
  refreshInterval?: number;
  showDetails?: boolean;
}

export function SystemMetricsCard({ 
  refreshInterval = 30000, 
  showDetails = true 
}: SystemMetricsCardProps) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/monitoring/metrics', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      
      const data = await response.json();
      if (data.success) {
        setMetrics(data.data.current);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getStatusColor = (usage: number): string => {
    if (usage < 50) return 'text-green-500';
    if (usage < 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusBadge = (usage: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (usage < 50) return 'default';
    if (usage < 80) return 'secondary';
    return 'destructive';
  };

  if (loading && !metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 p-4">
            <p>Error loading metrics: {error}</p>
            <Button onClick={fetchMetrics} className="mt-2" variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Metrics
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={fetchMetrics}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription>
          Real-time system performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showDetails ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="cpu">CPU</TabsTrigger>
              <TabsTrigger value="memory">Memory</TabsTrigger>
              <TabsTrigger value="storage">Storage</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">CPU Usage</span>
                    <Badge variant={getStatusBadge(metrics.cpu.usage)}>
                      {metrics.cpu.usage.toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress value={metrics.cpu.usage} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Memory Usage</span>
                    <Badge variant={getStatusBadge(metrics.memory.usagePercentage)}>
                      {metrics.memory.usagePercentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress value={metrics.memory.usagePercentage} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Storage Usage</span>
                    <Badge variant={getStatusBadge(metrics.storage.usagePercentage)}>
                      {metrics.storage.usagePercentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress value={metrics.storage.usagePercentage} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Uptime</span>
                    <span className="text-sm">{formatUptime(metrics.uptime)}</span>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="cpu" className="space-y-4">
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                <span className="text-lg font-semibold">CPU</span>
                <Badge variant={getStatusBadge(metrics.cpu.usage)}>
                  {metrics.cpu.usage.toFixed(1)}%
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Usage</span>
                  <span className={getStatusColor(metrics.cpu.usage)}>
                    {metrics.cpu.usage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={metrics.cpu.usage} className="h-2" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Cores:</span>
                  <span className="ml-2">{metrics.cpu.cores}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Load Average:</span>
                  <span className="ml-2">
                    {metrics.cpu.loadAverage[0].toFixed(2)}, {metrics.cpu.loadAverage[1].toFixed(2)}, {metrics.cpu.loadAverage[2].toFixed(2)}
                  </span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="memory" className="space-y-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                <span className="text-lg font-semibold">Memory</span>
                <Badge variant={getStatusBadge(metrics.memory.usagePercentage)}>
                  {metrics.memory.usagePercentage.toFixed(1)}%
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Usage</span>
                  <span className={getStatusColor(metrics.memory.usagePercentage)}>
                    {metrics.memory.usagePercentage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={metrics.memory.usagePercentage} className="h-2" />
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="ml-2">{formatBytes(metrics.memory.total)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Used:</span>
                  <span className="ml-2">{formatBytes(metrics.memory.used)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Free:</span>
                  <span className="ml-2">{formatBytes(metrics.memory.free)}</span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="storage" className="space-y-4">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                <span className="text-lg font-semibold">Storage</span>
                <Badge variant={getStatusBadge(metrics.storage.usagePercentage)}>
                  {metrics.storage.usagePercentage.toFixed(1)}%
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Usage</span>
                  <span className={getStatusColor(metrics.storage.usagePercentage)}>
                    {metrics.storage.usagePercentage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={metrics.storage.usagePercentage} className="h-2" />
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="ml-2">{formatBytes(metrics.storage.total)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Used:</span>
                  <span className="ml-2">{formatBytes(metrics.storage.used)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Free:</span>
                  <span className="ml-2">{formatBytes(metrics.storage.free)}</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">CPU</span>
                <Badge variant={getStatusBadge(metrics.cpu.usage)}>
                  {metrics.cpu.usage.toFixed(1)}%
                </Badge>
              </div>
              <Progress value={metrics.cpu.usage} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Memory</span>
                <Badge variant={getStatusBadge(metrics.memory.usagePercentage)}>
                  {metrics.memory.usagePercentage.toFixed(1)}%
                </Badge>
              </div>
              <Progress value={metrics.memory.usagePercentage} className="h-2" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
