/**
 * Alerts Card Component
 * Displays system alerts and allows management
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { logger, logApiError, logApiRequest } from '@/lib/logger'
import {
  RefreshCw, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  XCircle,
  Clock,
  User
} from 'lucide-react';

interface SystemAlert {
  id: string;
  type: 'system' | 'performance' | 'security' | 'business' | 'prediction' | 'anomaly';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  description?: string;
  source: string;
  category: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  assignedTo?: string;
  tags: string[];
  status: 'active' | 'acknowledged' | 'escalated' | 'resolved' | 'closed';
}

interface AlertsCardProps {
  refreshInterval?: number;
  maxAlerts?: number;
  showActions?: boolean;
}

export function AlertsCard({ 
  refreshInterval = 60000, 
  maxAlerts = 10,
  showActions = true
}: AlertsCardProps) {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('active');

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/monitoring/alerts', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }
      
      const data = await response.json();
      if (data.success) {
        setAlerts(data.data.alerts.slice(0, maxAlerts));
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

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/admin/monitoring/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          action: 'resolveAlert',
          alertId,
          resolvedBy: 'admin' // In a real app, this would be the current user
        }),
      });
      
      if (response.ok) {
        fetchAlerts();
      }
    } catch (err) {
      logger.error('Error acknowledging alert', err as Error);
    }
  };

  useEffect(() => {
    fetchAlerts();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchAlerts, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, maxAlerts]);

  const getSeverityIcon = (severity: SystemAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-gray-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: SystemAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      case 'info':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: SystemAlert['status']) => {
    switch (status) {
      case 'active':
        return 'destructive';
      case 'acknowledged':
        return 'secondary';
      case 'escalated':
        return 'destructive';
      case 'resolved':
        return 'outline';
      case 'closed':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  const filteredAlerts = alerts.filter(alert => {
    switch (activeTab) {
      case 'active':
        return alert.status === 'active';
      case 'acknowledged':
        return alert.status === 'acknowledged';
      case 'resolved':
        return alert.status === 'resolved';
      default:
        return true;
    }
  });

  if (loading && alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            System Alerts
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
            <AlertTriangle className="h-5 w-5" />
            System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 p-4">
            <p>Error loading alerts: {error}</p>
            <Button onClick={fetchAlerts} className="mt-2" variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            System Alerts
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={fetchAlerts}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription>
          System alerts and notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-muted-foreground">No active alerts</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="active" className="flex items-center gap-1">
                Active
                <Badge variant="outline" className="ml-1 h-5 px-1 text-xs">
                  {alerts.filter(a => a.status === 'active').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="acknowledged" className="flex items-center gap-1">
                Acknowledged
                <Badge variant="outline" className="ml-1 h-5 px-1 text-xs">
                  {alerts.filter(a => a.status === 'acknowledged').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="resolved" className="flex items-center gap-1">
                Resolved
                <Badge variant="outline" className="ml-1 h-5 px-1 text-xs">
                  {alerts.filter(a => a.status === 'resolved').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-4">
              <div className="space-y-3">
                {filteredAlerts.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">No alerts in this category</p>
                  </div>
                ) : (
                  filteredAlerts.map((alert) => (
                    <Alert key={alert.id} className="relative">
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(alert.severity)}
                        <div className="flex-1 min-w-0">
                          <AlertTitle className="text-sm font-medium">
                            {alert.title}
                          </AlertTitle>
                          <AlertDescription className="text-sm mt-1">
                            {alert.message}
                          </AlertDescription>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={getSeverityColor(alert.severity)} className="text-xs">
                              {alert.severity}
                            </Badge>
                            <Badge variant={getStatusColor(alert.status)} className="text-xs">
                              {alert.status}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatTimestamp(alert.timestamp)}
                            </div>
                            {alert.acknowledgedBy && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                {alert.acknowledgedBy}
                              </div>
                            )}
                          </div>
                        </div>
                        {showActions && alert.status === 'active' && (
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeAlert(alert.id)}
                              className="h-7 px-2 text-xs"
                            >
                              Acknowledge
                            </Button>
                          </div>
                        )}
                      </div>
                    </Alert>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
