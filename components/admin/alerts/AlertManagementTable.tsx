/**
 * Alert Management Table Component
 * Displays alerts in a table format with management actions
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { logger, logApiError, logApiRequest } from '@/lib/logger'
import {
  RefreshCw, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  XCircle,
  Clock,
  User,
  Search,
  Filter
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

interface AlertManagementTableProps {
  refreshInterval?: number;
  maxAlerts?: number;
  showActions?: boolean;
}

export function AlertManagementTable({ 
  refreshInterval = 60000, 
  maxAlerts = 50,
  showActions = true
}: AlertManagementTableProps) {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/alerts');
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
      const response = await fetch('/api/admin/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'acknowledgeAlert',
          alertId,
          acknowledgedBy: 'admin' // In a real app, this would be the current user
        }),
      });
      
      if (response.ok) {
        fetchAlerts();
      }
    } catch (err) {
      logger.error('Error acknowledging alert', err as Error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/admin/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      logger.error('Error resolving alert', err as Error);
    }
  };

  const assignAlert = async (alertId: string, assignedTo: string) => {
    try {
      const response = await fetch('/api/admin/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'assignAlert',
          alertId,
          assignedTo
        }),
      });
      
      if (response.ok) {
        fetchAlerts();
      }
    } catch (err) {
      logger.error('Error assigning alert', err as Error);
    }
  };

  useEffect(() => {
    fetchAlerts();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchAlerts, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, maxAlerts]);

  useEffect(() => {
    let filtered = alerts;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(alert => 
        alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.source.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(alert => alert.severity === severityFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(alert => alert.status === statusFilter);
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(alert => alert.type === typeFilter);
    }
    
    setFilteredAlerts(filtered);
  }, [alerts, searchTerm, severityFilter, statusFilter, typeFilter]);

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

  const getTypeColor = (type: SystemAlert['type']) => {
    switch (type) {
      case 'system':
        return 'default';
      case 'performance':
        return 'secondary';
      case 'security':
        return 'destructive';
      case 'business':
        return 'outline';
      case 'prediction':
        return 'secondary';
      case 'anomaly':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getAlertCounts = () => {
    const counts = {
      total: alerts.length,
      active: alerts.filter(a => a.status === 'active').length,
      acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
      resolved: alerts.filter(a => a.status === 'resolved').length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length
    };
    
    return counts;
  };

  const counts = getAlertCounts();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alert Management
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
          Manage and respond to system alerts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline">Total: {counts.total}</Badge>
          <Badge variant="destructive">Active: {counts.active}</Badge>
          <Badge variant="secondary">Acknowledged: {counts.acknowledged}</Badge>
          <Badge variant="outline">Resolved: {counts.resolved}</Badge>
          <Badge variant="destructive">Critical: {counts.critical}</Badge>
          <Badge variant="destructive">High: {counts.high}</Badge>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="prediction">Prediction</SelectItem>
              <SelectItem value="anomaly">Anomaly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {loading && alerts.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4">
            <p>Error loading alerts: {error}</p>
            <Button onClick={fetchAlerts} className="mt-2" variant="outline">
              Retry
            </Button>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-8">
            <Filter className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-muted-foreground">No alerts match the current filters</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timestamp</TableHead>
                  {showActions && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(alert.severity)}
                        <Badge variant={getSeverityColor(alert.severity)} className="text-xs">
                          {alert.severity}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {alert.message}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={getTypeColor(alert.type)} className="text-xs">
                          {alert.type}
                        </Badge>
                        <span className="text-sm">{alert.source}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(alert.status)} className="text-xs">
                        {alert.status}
                      </Badge>
                      {alert.acknowledgedBy && (
                        <div className="flex items-center gap-1 mt-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {alert.acknowledgedBy}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{formatTimestamp(alert.timestamp)}</span>
                      </div>
                    </TableCell>
                    {showActions && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {alert.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeAlert(alert.id)}
                              className="h-7 px-2 text-xs"
                            >
                              Acknowledge
                            </Button>
                          )}
                          {alert.status === 'acknowledged' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resolveAlert(alert.id)}
                              className="h-7 px-2 text-xs"
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}