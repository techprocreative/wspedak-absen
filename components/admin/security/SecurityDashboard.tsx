'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { logger, logApiError, logApiRequest } from '@/lib/logger'
import {
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Shield, 
  Users, 
  Key, 
  History, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Download,
  RefreshCw,
  Settings,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  Activity,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

interface SecurityStats {
  totalEvents: number
  eventsByType: Record<string, number>
  eventsBySeverity: Record<string, number>
  eventsByUser: Array<{ userId: string; email: string; count: number }>
  eventsByDay: Array<{ date: string; count: number }>
  failedEvents: number
  suspiciousEvents: number
  criticalEvents: number
  topIPs: Array<{ ip: string; count: number }>
  averageEventsPerDay: number
}

interface AuditLog {
  id: string
  timestamp: string
  eventType: string
  severity: string
  userId?: string
  userEmail?: string
  action: string
  description: string
  ipAddress?: string
  success: boolean
  errorMessage?: string
}

interface MFADevice {
  deviceId: string
  deviceName: string
  createdAt: string
  lastUsedAt: string
  expiresAt: string
}

interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  maxAge: number
  historyCount: number
  preventCommonPasswords: boolean
  preventUserInfo: boolean
}

export default function SecurityDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null)
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([])
  const [criticalEvents, setCriticalEvents] = useState<AuditLog[]>([])
  const [failedLogins, setFailedLogins] = useState<AuditLog[]>([])
  const [suspiciousActivities, setSuspiciousActivities] = useState<AuditLog[]>([])
  const [mfaDevices, setMfaDevices] = useState<MFADevice[]>([])
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [logsFilter, setLogsFilter] = useState({
    userId: '',
    eventType: 'all',
    severity: 'all',
    startDate: '',
    endDate: '',
    search: ''
  })

  // Fetch security data
  const fetchSecurityData = async () => {
    setIsLoading(true)
    try {
      // Fetch security stats
      const statsResponse = await fetch('/api/admin/security/audit?action=stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setSecurityStats(statsData.data)
      }

      // Fetch recent logs
      const logsResponse = await fetch('/api/admin/security/audit?action=recent&limit=20')
      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        setRecentLogs(logsData.data)
      }

      // Fetch critical events
      const criticalResponse = await fetch('/api/admin/security/audit?action=critical&limit=10')
      if (criticalResponse.ok) {
        const criticalData = await criticalResponse.json()
        setCriticalEvents(criticalData.data)
      }

      // Fetch failed logins
      const failedResponse = await fetch('/api/admin/security/audit?action=failed-logins&hours=24')
      if (failedResponse.ok) {
        const failedData = await failedResponse.json()
        setFailedLogins(failedData.data)
      }

      // Fetch suspicious activities
      const suspiciousResponse = await fetch('/api/admin/security/audit?action=suspicious&hours=24')
      if (suspiciousResponse.ok) {
        const suspiciousData = await suspiciousResponse.json()
        setSuspiciousActivities(suspiciousData.data)
      }

      // Fetch password policy
      const policyResponse = await fetch('/api/admin/security/password?action=policy')
      if (policyResponse.ok) {
        const policyData = await policyResponse.json()
        setPasswordPolicy(policyData.data)
      }
    } catch (error) {
      logger.error('Error fetching security data', error as Error)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  // Refresh data
  const refreshData = () => {
    setRefreshing(true)
    fetchSecurityData()
  }

  // Export audit logs
  const exportLogs = (format: 'csv' | 'json') => {
    const filter: any = { ...logsFilter }
    if (filter.eventType === 'all') delete filter.eventType
    if (filter.severity === 'all') delete filter.severity
    const queryParams = new URLSearchParams({
      action: `export-${format}`,
      ...filter
    })
    
    window.open(`/api/admin/security/audit?${queryParams}`, '_blank')
  }

  // Fetch filtered logs
  const fetchFilteredLogs = async () => {
    setIsLoading(true)
    try {
      const filter: any = { ...logsFilter }
      if (filter.eventType === 'all') delete filter.eventType
      if (filter.severity === 'all') delete filter.severity
      const queryParams = new URLSearchParams({
        action: 'logs',
        limit: '50',
        ...filter
      })
      
      const response = await fetch(`/api/admin/security/audit?${queryParams}`)
      if (response.ok) {
        const data = await response.json()
        setRecentLogs(data.data.logs)
      }
    } catch (error) {
      logger.error('Error fetching filtered logs', error as Error)
    } finally {
      setIsLoading(false)
    }
  }

  // Update password policy
  const updatePasswordPolicy = async (policyUpdates: Partial<PasswordPolicy>) => {
    try {
      const response = await fetch('/api/admin/security/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-policy',
          policyUpdates
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setPasswordPolicy(data.data)
        refreshData()
      }
    } catch (error) {
      logger.error('Error updating password policy', error as Error)
    }
  }

  // Initialize data
  useEffect(() => {
    fetchSecurityData()
  }, [])

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  // Get event type icon
  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'user_login':
      case 'user_logout':
        return <UserCheck className="h-4 w-4" />
      case 'user_login_failed':
        return <UserX className="h-4 w-4" />
      case 'password_changed':
      case 'password_reset':
        return <Key className="h-4 w-4" />
      case 'mfa_enabled':
      case 'mfa_disabled':
        return <Shield className="h-4 w-4" />
      case 'admin_action':
        return <Settings className="h-4 w-4" />
      case 'suspicious_activity':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  if (isLoading && !securityStats) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage system security
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={refreshData}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="mfa">MFA</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Security Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{securityStats?.totalEvents || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {securityStats?.averageEventsPerDay || 0} per day
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Events</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{securityStats?.failedEvents || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Last 24 hours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Suspicious Activity</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{securityStats?.suspiciousEvents || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Last 24 hours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{securityStats?.criticalEvents || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Requires attention
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity and Critical Events */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest security events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center space-x-4">
                      <div className={`w-2 h-2 rounded-full ${getSeverityColor(log.severity)}`} />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {log.action}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {log.userEmail} • {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getEventTypeIcon(log.eventType)}
                        {log.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Critical Events</CardTitle>
                <CardDescription>
                  Events requiring immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {criticalEvents.length > 0 ? (
                    criticalEvents.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-center space-x-4">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {log.action}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {log.userEmail} • {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getEventTypeIcon(log.eventType)}
                          <Badge variant="destructive">Critical</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-24 text-muted-foreground">
                      <p>No critical events</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Failed Logins and Suspicious Activities */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Failed Login Attempts</CardTitle>
                <CardDescription>
                  Recent failed authentication attempts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {failedLogins.length > 0 ? (
                    failedLogins.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-center space-x-4">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {log.userEmail || 'Unknown user'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {log.ipAddress} • {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <UserX className="h-4 w-4 text-red-500" />
                          <Badge variant="destructive">Failed</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-24 text-muted-foreground">
                      <p>No failed login attempts</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Suspicious Activities</CardTitle>
                <CardDescription>
                  Activities that may indicate security issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {suspiciousActivities.length > 0 ? (
                    suspiciousActivities.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-center space-x-4">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {log.action}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {log.userEmail} • {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <Badge variant="secondary">Suspicious</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-24 text-muted-foreground">
                      <p>No suspicious activities</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          {/* Audit Logs Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                View and filter system audit logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="userId">User ID</Label>
                  <Input
                    id="userId"
                    placeholder="Enter user ID"
                    value={logsFilter.userId}
                    onChange={(e) => setLogsFilter({ ...logsFilter, userId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select
                    value={logsFilter.eventType}
                    onValueChange={(value) => setLogsFilter({ ...logsFilter, eventType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="user_login">User Login</SelectItem>
                      <SelectItem value="user_logout">User Logout</SelectItem>
                      <SelectItem value="user_login_failed">Failed Login</SelectItem>
                      <SelectItem value="password_changed">Password Changed</SelectItem>
                      <SelectItem value="mfa_enabled">MFA Enabled</SelectItem>
                      <SelectItem value="admin_action">Admin Action</SelectItem>
                      <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Select
                    value={logsFilter.severity}
                    onValueChange={(value) => setLogsFilter({ ...logsFilter, severity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={logsFilter.startDate}
                    onChange={(e) => setLogsFilter({ ...logsFilter, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={logsFilter.endDate}
                    onChange={(e) => setLogsFilter({ ...logsFilter, endDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search logs"
                    value={logsFilter.search}
                    onChange={(e) => setLogsFilter({ ...logsFilter, search: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-between mt-4">
                <Button onClick={fetchFilteredLogs} disabled={isLoading}>
                  <Eye className="h-4 w-4 mr-2" />
                  Apply Filters
                </Button>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => exportLogs('csv')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportLogs('json')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                System audit logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.userEmail || 'System'}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getEventTypeIcon(log.eventType)}
                          <span>{log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.description}
                      </TableCell>
                      <TableCell>{log.ipAddress || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${getSeverityColor(log.severity)} text-white`}>
                          {log.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mfa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Factor Authentication</CardTitle>
              <CardDescription>
                Manage MFA settings and devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>MFA Status</AlertTitle>
                  <AlertDescription>
                    Multi-factor authentication adds an extra layer of security to user accounts.
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">MFA Enrollment</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="mfaUser">User ID</Label>
                        <Input id="mfaUser" placeholder="Enter user ID" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="mfaEmail">Email</Label>
                        <Input id="mfaEmail" placeholder="Enter user email" />
                      </div>
                      <Button>Enroll User in MFA</Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">MFA Verification</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="mfaVerifyUser">User ID</Label>
                        <Input id="mfaVerifyUser" placeholder="Enter user ID" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="mfaToken">Verification Code</Label>
                        <Input id="mfaToken" placeholder="Enter verification code" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="rememberDevice" />
                        <Label htmlFor="rememberDevice">Remember this device</Label>
                      </div>
                      <Button>Verify Code</Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Password Security</CardTitle>
              <CardDescription>
                Configure password policies and security settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {passwordPolicy && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Password Requirements</h3>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="requireUppercase"
                          checked={passwordPolicy.requireUppercase}
                          onCheckedChange={(checked) => 
                            updatePasswordPolicy({ requireUppercase: checked })
                          }
                        />
                        <Label htmlFor="requireUppercase">Require Uppercase Letters</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="requireLowercase"
                          checked={passwordPolicy.requireLowercase}
                          onCheckedChange={(checked) => 
                            updatePasswordPolicy({ requireLowercase: checked })
                          }
                        />
                        <Label htmlFor="requireLowercase">Require Lowercase Letters</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="requireNumbers"
                          checked={passwordPolicy.requireNumbers}
                          onCheckedChange={(checked) => 
                            updatePasswordPolicy({ requireNumbers: checked })
                          }
                        />
                        <Label htmlFor="requireNumbers">Require Numbers</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="requireSpecialChars"
                          checked={passwordPolicy.requireSpecialChars}
                          onCheckedChange={(checked) => 
                            updatePasswordPolicy({ requireSpecialChars: checked })
                          }
                        />
                        <Label htmlFor="requireSpecialChars">Require Special Characters</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="preventCommonPasswords"
                          checked={passwordPolicy.preventCommonPasswords}
                          onCheckedChange={(checked) => 
                            updatePasswordPolicy({ preventCommonPasswords: checked })
                          }
                        />
                        <Label htmlFor="preventCommonPasswords">Prevent Common Passwords</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="preventUserInfo"
                          checked={passwordPolicy.preventUserInfo}
                          onCheckedChange={(checked) => 
                            updatePasswordPolicy({ preventUserInfo: checked })
                          }
                        />
                        <Label htmlFor="preventUserInfo">Prevent User Info in Password</Label>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Password Settings</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="minLength">Minimum Length</Label>
                        <Input
                          id="minLength"
                          type="number"
                          value={passwordPolicy.minLength}
                          onChange={(e) => 
                            updatePasswordPolicy({ minLength: parseInt(e.target.value) })
                          }
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="maxAge">Password Expiry (days)</Label>
                        <Input
                          id="maxAge"
                          type="number"
                          value={passwordPolicy.maxAge}
                          onChange={(e) => 
                            updatePasswordPolicy({ maxAge: parseInt(e.target.value) })
                          }
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="historyCount">Remember Last Passwords</Label>
                        <Input
                          id="historyCount"
                          type="number"
                          value={passwordPolicy.historyCount}
                          onChange={(e) => 
                            updatePasswordPolicy({ historyCount: parseInt(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Account Lockout</h3>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="maxFailedAttempts">Max Failed Attempts</Label>
                        <Input
                          id="maxFailedAttempts"
                          type="number"
                          placeholder="5"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
                        <Input
                          id="lockoutDuration"
                          type="number"
                          placeholder="15"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure system-wide security settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Session Management</h3>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        placeholder="480"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maxConcurrentSessions">Max Concurrent Sessions</Label>
                      <Input
                        id="maxConcurrentSessions"
                        type="number"
                        placeholder="3"
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Audit Log Settings</h3>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="maxLogEntries">Max Log Entries</Label>
                      <Input
                        id="maxLogEntries"
                        type="number"
                        placeholder="10000"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="logRetentionDays">Log Retention (days)</Label>
                      <Input
                        id="logRetentionDays"
                        type="number"
                        placeholder="365"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline">Clear Old Logs</Button>
                    <Button>Save Settings</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
