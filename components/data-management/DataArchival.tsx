"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { logger, logApiError, logApiRequest } from '@/lib/logger'
import {
  Archive,
  Trash2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Settings,
  Calendar,
  Clock,
  FileArchive,
  Shield,
  Play,
  Pause,
  Eye,
  Download,
  Plus,
  X,
  Filter,
  Search,
  ArrowLeft
} from "lucide-react"

// Define interfaces
interface ArchivalRule {
  id: string
  name: string
  description: string
  enabled: boolean
  entityType: 'employees' | 'attendance' | 'schedules'
  conditions: ArchivalCondition[]
  actions: ArchivalAction[]
  schedule?: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly'
    time: string
    nextRun: string
  }
  createdAt: string
  updatedAt: string
}

interface ArchivalCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'in' | 'older_than'
  value: any
  logicalOperator?: 'and' | 'or'
}

interface ArchivalAction {
  type: 'archive' | 'delete' | 'flag'
  parameters?: {
    location?: string
    retentionDays?: number
    flag?: string
  }
}

interface CleanupRule {
  id: string
  name: string
  description: string
  enabled: boolean
  entityType: 'employees' | 'attendance' | 'schedules' | 'logs' | 'temp_files'
  conditions: CleanupCondition[]
  dryRun: boolean
  schedule?: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly'
    time: string
    nextRun: string
  }
  createdAt: string
  updatedAt: string
}

interface CleanupCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'in' | 'older_than'
  value: any
  logicalOperator?: 'and' | 'or'
}

interface ArchivedRecord {
  id: string
  originalId: string
  entityType: 'employees' | 'attendance' | 'schedules'
  data: any
  archivedAt: string
  archivedBy: string
  retentionExpiresAt?: string
  location: string
  size: number
}

interface DataRetentionPolicy {
  id: string
  name: string
  entityType: 'employees' | 'attendance' | 'schedules'
  retentionPeriod: number // in days
  archivalAction: 'archive' | 'delete'
  archivalDelay: number // in days
  conditions: RetentionCondition[]
  enabled: boolean
  createdAt: string
  updatedAt: string
}

interface RetentionCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'in' | 'older_than'
  value: any
}

interface ArchivalProgress {
  current: number
  total: number
  percentage: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  message?: string
  stage?: string
}

// Mock data
const mockArchivalRules: ArchivalRule[] = [
  {
    id: 'rule-1',
    name: 'Archive Old Attendance Records',
    description: 'Archive attendance records older than 1 year',
    enabled: true,
    entityType: 'attendance',
    conditions: [
      {
        field: 'date',
        operator: 'older_than',
        value: '365d'
      }
    ],
    actions: [
      {
        type: 'archive',
        parameters: {
          location: '/archives/attendance',
          retentionDays: 2555 // 7 years
        }
      }
    ],
    schedule: {
      enabled: true,
      frequency: 'monthly',
      time: '02:00',
      nextRun: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rule-2',
    name: 'Archive Inactive Employee Records',
    description: 'Archive employee records for inactive employees',
    enabled: true,
    entityType: 'employees',
    conditions: [
      {
        field: 'status',
        operator: 'equals',
        value: 'inactive'
      },
      {
        field: 'lastActiveDate',
        operator: 'older_than',
        value: '180d',
        logicalOperator: 'and'
      }
    ],
    actions: [
      {
        type: 'archive',
        parameters: {
          location: '/archives/employees',
          retentionDays: 2555 // 7 years
        }
      }
    ],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
]

const mockCleanupRules: CleanupRule[] = [
  {
    id: 'cleanup-1',
    name: 'Clean Up Old Log Files',
    description: 'Delete log files older than 30 days',
    enabled: true,
    entityType: 'logs',
    conditions: [
      {
        field: 'createdAt',
        operator: 'older_than',
        value: '30d'
      }
    ],
    dryRun: false,
    schedule: {
      enabled: true,
      frequency: 'weekly',
      time: '03:00',
      nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'cleanup-2',
    name: 'Clean Up Temporary Files',
    description: 'Delete temporary files older than 7 days',
    enabled: true,
    entityType: 'temp_files',
    conditions: [
      {
        field: 'createdAt',
        operator: 'older_than',
        value: '7d'
      }
    ],
    dryRun: false,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
]

const mockArchivedRecords: ArchivedRecord[] = [
  {
    id: 'archived-1',
    originalId: 'attendance-12345',
    entityType: 'attendance',
    data: {
      employeeId: 'EMP001',
      date: '2023-01-01',
      type: 'check-in',
      timestamp: '2023-01-01T08:00:00Z'
    },
    archivedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    archivedBy: 'System',
    retentionExpiresAt: new Date(Date.now() + 2525 * 24 * 60 * 60 * 1000).toISOString(),
    location: '/archives/attendance/2023/01',
    size: 256
  },
  {
    id: 'archived-2',
    originalId: 'employee-67890',
    entityType: 'employees',
    data: {
      name: 'John Doe',
      email: 'john@example.com',
      employeeId: 'EMP001',
      department: 'IT',
      status: 'inactive'
    },
    archivedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    archivedBy: 'Admin',
    retentionExpiresAt: new Date(Date.now() + 2495 * 24 * 60 * 60 * 1000).toISOString(),
    location: '/archives/employees/2023/12',
    size: 512
  }
]

const mockRetentionPolicies: DataRetentionPolicy[] = [
  {
    id: 'policy-1',
    name: 'Attendance Data Retention',
    entityType: 'attendance',
    retentionPeriod: 2555, // 7 years
    archivalAction: 'archive',
    archivalDelay: 365, // 1 year
    conditions: [
      {
        field: 'date',
        operator: 'older_than',
        value: '365d'
      }
    ],
    enabled: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'policy-2',
    name: 'Employee Data Retention',
    entityType: 'employees',
    retentionPeriod: 2555, // 7 years
    archivalAction: 'archive',
    archivalDelay: 180, // 6 months
    conditions: [
      {
        field: 'status',
        operator: 'equals',
        value: 'inactive'
      }
    ],
    enabled: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
]

export function DataArchival() {
  const [activeTab, setActiveTab] = useState("archival-rules")
  const [archivalRules, setArchivalRules] = useState<ArchivalRule[]>(mockArchivalRules)
  const [cleanupRules, setCleanupRules] = useState<CleanupRule[]>(mockCleanupRules)
  const [archivedRecords, setArchivedRecords] = useState<ArchivedRecord[]>(mockArchivedRecords)
  const [retentionPolicies, setRetentionPolicies] = useState<DataRetentionPolicy[]>(mockRetentionPolicies)
  const [selectedRule, setSelectedRule] = useState<ArchivalRule | CleanupRule | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<ArchivedRecord | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [archivalProgress, setArchivalProgress] = useState<ArchivalProgress | null>(null)
  const [showRuleDialog, setShowRuleDialog] = useState(false)
  const [showRecordDialog, setShowRecordDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")

  // Run archival rule
  const handleRunArchivalRule = useCallback(async (rule: ArchivalRule, dryRun: boolean = false) => {
    setIsRunning(true)
    setArchivalProgress({ current: 0, total: 100, percentage: 0, status: 'pending' })
    
    try {
      // Mock API call with progress
      // In a real implementation, this would call the actual API
      const stages = [
        { name: 'scanning', duration: 1000 },
        { name: 'processing', duration: 2000 },
        { name: 'archiving', duration: 3000 }
      ]
      
      let currentProgress = 0
      const totalStages = stages.length
      
      for (let i = 0; i < totalStages; i++) {
        const stage = stages[i]
        setArchivalProgress({
          current: currentProgress,
          total: 100,
          percentage: Math.round((currentProgress / 100) * 100),
          status: 'running',
          message: `Starting ${stage.name}...`,
          stage: stage.name
        })
        
        await new Promise(resolve => setTimeout(resolve, stage.duration))
        
        currentProgress += Math.round(100 / totalStages)
        setArchivalProgress({
          current: currentProgress,
          total: 100,
          percentage: currentProgress,
          status: 'running',
          message: `Completed ${stage.name}`,
          stage: stage.name
        })
      }
      
      setArchivalProgress({
        current: 100,
        total: 100,
        percentage: 100,
        status: 'completed',
        message: `Archival completed successfully${dryRun ? ' (dry run)' : ''}`
      })
    } catch (error) {
      logger.error('Archival error', error as Error)
      setArchivalProgress({
        current: 0,
        total: 100,
        percentage: 0,
        status: 'failed',
        message: 'Archival failed'
      })
    } finally {
      setIsRunning(false)
    }
  }, [])

  // Run cleanup rule
  const handleRunCleanupRule = useCallback(async (rule: CleanupRule) => {
    setIsRunning(true)
    setArchivalProgress({ current: 0, total: 100, percentage: 0, status: 'pending' })
    
    try {
      // Mock API call with progress
      // In a real implementation, this would call the actual API
      const stages = [
        { name: 'scanning', duration: 1000 },
        { name: 'processing', duration: 2000 },
        { name: 'cleanup', duration: 3000 }
      ]
      
      let currentProgress = 0
      const totalStages = stages.length
      
      for (let i = 0; i < totalStages; i++) {
        const stage = stages[i]
        setArchivalProgress({
          current: currentProgress,
          total: 100,
          percentage: Math.round((currentProgress / 100) * 100),
          status: 'running',
          message: `Starting ${stage.name}...`,
          stage: stage.name
        })
        
        await new Promise(resolve => setTimeout(resolve, stage.duration))
        
        currentProgress += Math.round(100 / totalStages)
        setArchivalProgress({
          current: currentProgress,
          total: 100,
          percentage: currentProgress,
          status: 'running',
          message: `Completed ${stage.name}`,
          stage: stage.name
        })
      }
      
      setArchivalProgress({
        current: 100,
        total: 100,
        percentage: 100,
        status: 'completed',
        message: `Cleanup completed successfully${rule.dryRun ? ' (dry run)' : ''}`
      })
    } catch (error) {
      logger.error('Cleanup error', error as Error)
      setArchivalProgress({
        current: 0,
        total: 100,
        percentage: 0,
        status: 'failed',
        message: 'Cleanup failed'
      })
    } finally {
      setIsRunning(false)
    }
  }, [])

  // Restore archived record
  const handleRestoreRecord = useCallback(async (recordId: string) => {
    try {
      // Mock API call
      // In a real implementation, this would call the actual API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setArchivedRecords(prev => prev.filter(record => record.id !== recordId))
      
      alert('Record restored successfully')
    } catch (error) {
      logger.error('Restore error', error as Error)
      alert('Failed to restore record')
    }
  }, [])

  // Delete archived record
  const handleDeleteRecord = useCallback(async (recordId: string) => {
    try {
      // Mock API call
      // In a real implementation, this would call the actual API
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setArchivedRecords(prev => prev.filter(record => record.id !== recordId))
    } catch (error) {
      logger.error('Delete error', error as Error)
      alert('Failed to delete record')
    }
  }, [])

  // Apply retention policies
  const handleApplyRetentionPolicies = useCallback(async () => {
    setIsRunning(true)
    setArchivalProgress({ current: 0, total: 100, percentage: 0, status: 'pending' })
    
    try {
      // Mock API call with progress
      // In a real implementation, this would call the actual API
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200))
        setArchivalProgress({
          current: i,
          total: 100,
          percentage: i,
          status: 'running',
          message: `Applying retention policies... ${i}%`
        })
      }
      
      setArchivalProgress({
        current: 100,
        total: 100,
        percentage: 100,
        status: 'completed',
        message: 'Retention policies applied successfully'
      })
    } catch (error) {
      logger.error('Retention policy application error', error as Error)
      setArchivalProgress({
        current: 0,
        total: 100,
        percentage: 0,
        status: 'failed',
        message: 'Failed to apply retention policies'
      })
    } finally {
      setIsRunning(false)
    }
  }, [])

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Filter archived records
  const filteredArchivedRecords = archivedRecords.filter(record => {
    if (filterType !== "all" && record.entityType !== filterType) {
      return false
    }
    
    if (searchTerm && !JSON.stringify(record.data).toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Data Archival & Cleanup</h2>
          <p className="text-slate-400">Archive old data and clean up unnecessary records</p>
        </div>
        <Button
          onClick={handleApplyRetentionPolicies}
          disabled={isRunning}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Apply Retention Policies
        </Button>
      </div>

      {archivalProgress && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Operation Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Progress</span>
                <span className="text-slate-300">{archivalProgress.percentage}%</span>
              </div>
              <Progress value={archivalProgress.percentage} className="h-2 bg-slate-700" />
              {archivalProgress.message && (
                <p className="text-slate-400 text-sm">{archivalProgress.message}</p>
              )}
              {archivalProgress.stage && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  {archivalProgress.stage}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="archival-rules" className="data-[state=active]:bg-slate-700">
            <Archive className="w-4 h-4 mr-2" />
            Archival Rules
          </TabsTrigger>
          <TabsTrigger value="cleanup-rules" className="data-[state=active]:bg-slate-700">
            <Trash2 className="w-4 h-4 mr-2" />
            Cleanup Rules
          </TabsTrigger>
          <TabsTrigger value="archived-records" className="data-[state=active]:bg-slate-700">
            <FileArchive className="w-4 h-4 mr-2" />
            Archived Records
          </TabsTrigger>
          <TabsTrigger value="retention-policies" className="data-[state=active]:bg-slate-700">
            <Shield className="w-4 h-4 mr-2" />
            Retention Policies
          </TabsTrigger>
        </TabsList>

        {/* Archival Rules Tab */}
        <TabsContent value="archival-rules" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Archival Rules</span>
                <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Rule
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-white">Create Archival Rule</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-slate-300">Rule Name</Label>
                        <Input
                          placeholder="My Archival Rule"
                          className="bg-slate-700 border-slate-600"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Description</Label>
                        <Textarea
                          placeholder="Describe what this rule does"
                          className="bg-slate-700 border-slate-600"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Entity Type</Label>
                        <Select defaultValue="attendance">
                          <SelectTrigger className="bg-slate-700 border-slate-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employees">Employees</SelectItem>
                            <SelectItem value="attendance">Attendance</SelectItem>
                            <SelectItem value="schedules">Schedules</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-300">Action</Label>
                        <Select defaultValue="archive">
                          <SelectTrigger className="bg-slate-700 border-slate-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="archive">Archive</SelectItem>
                            <SelectItem value="delete">Delete</SelectItem>
                            <SelectItem value="flag">Flag</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowRuleDialog(false)}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => setShowRuleDialog(false)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          Create Rule
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {archivalRules.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">
                    No archival rules configured.
                  </p>
                ) : (
                  archivalRules.map(rule => (
                    <div key={rule.id} className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-white font-medium">{rule.name}</h3>
                          <p className="text-slate-400 text-sm">{rule.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            rule.enabled 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                          }>
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            {rule.entityType}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-slate-400">Conditions</p>
                          <p className="text-white font-medium">
                            {rule.conditions.map(condition => 
                              `${condition.field} ${condition.operator} ${condition.value}`
                            ).join(', ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Actions</p>
                          <p className="text-white font-medium">
                            {rule.actions.map(action => 
                              `${action.type}${action.parameters ? ` (${action.parameters.location})` : ''}`
                            ).join(', ')}
                          </p>
                        </div>
                      </div>
                      
                      {rule.schedule && (
                        <div className="mb-3">
                          <p className="text-slate-400 text-sm">Schedule</p>
                          <p className="text-white font-medium text-sm">
                            {rule.schedule.frequency} at {rule.schedule.time}
                            {rule.schedule.enabled && ` (Next run: ${formatDate(rule.schedule.nextRun)})`}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunArchivalRule(rule, true)}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Dry Run
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunArchivalRule(rule)}
                          className="border-emerald-600 text-emerald-400 hover:bg-emerald-600/20"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Run Now
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cleanup Rules Tab */}
        <TabsContent value="cleanup-rules" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Cleanup Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cleanupRules.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">
                    No cleanup rules configured.
                  </p>
                ) : (
                  cleanupRules.map(rule => (
                    <div key={rule.id} className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-white font-medium">{rule.name}</h3>
                          <p className="text-slate-400 text-sm">{rule.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            rule.enabled 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                          }>
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <Badge className={
                            rule.dryRun
                              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                              : 'bg-red-500/20 text-red-400 border-red-500/30'
                          }>
                            {rule.dryRun ? 'Dry Run' : 'Delete'}
                          </Badge>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            {rule.entityType}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-slate-400 text-sm">Conditions</p>
                        <p className="text-white font-medium text-sm">
                          {rule.conditions.map(condition => 
                            `${condition.field} ${condition.operator} ${condition.value}`
                          ).join(', ')}
                        </p>
                      </div>
                      
                      {rule.schedule && (
                        <div className="mb-3">
                          <p className="text-slate-400 text-sm">Schedule</p>
                          <p className="text-white font-medium text-sm">
                            {rule.schedule.frequency} at {rule.schedule.time}
                            {rule.schedule.enabled && ` (Next run: ${formatDate(rule.schedule.nextRun)})`}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunCleanupRule(rule)}
                          className={rule.dryRun
                            ? "border-slate-600 text-slate-300 hover:bg-slate-700"
                            : "border-red-600 text-red-400 hover:bg-red-600/20"
                          }
                        >
                          <Play className="w-4 h-4 mr-1" />
                          {rule.dryRun ? 'Run Dry' : 'Run Now'}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Archived Records Tab */}
        <TabsContent value="archived-records" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Archived Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search archived records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-700 border-slate-600 pl-10"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="employees">Employees</SelectItem>
                    <SelectItem value="attendance">Attendance</SelectItem>
                    <SelectItem value="schedules">Schedules</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-4">
                {filteredArchivedRecords.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">
                    No archived records found.
                  </p>
                ) : (
                  filteredArchivedRecords.map(record => (
                    <div key={record.id} className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-white font-medium">
                            {record.entityType} - {record.originalId}
                          </h3>
                          <p className="text-slate-400 text-sm">
                            Archived by {record.archivedBy} on {formatDate(record.archivedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            {record.entityType}
                          </Badge>
                          {record.retentionExpiresAt && (
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                              Expires: {formatDate(record.retentionExpiresAt)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-slate-400">Location</p>
                          <p className="text-white font-medium">{record.location}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Size</p>
                          <p className="text-white font-medium">{formatFileSize(record.size)}</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRecord(record)
                            setShowRecordDialog(true)
                          }}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreRecord(record.id)}
                          className="border-emerald-600 text-emerald-400 hover:bg-emerald-600/20"
                        >
                          <ArrowLeft className="w-4 h-4 mr-1" />
                          Restore
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRecord(record.id)}
                          className="border-red-600 text-red-400 hover:bg-red-600/20"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retention Policies Tab */}
        <TabsContent value="retention-policies" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Data Retention Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {retentionPolicies.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">
                    No retention policies configured.
                  </p>
                ) : (
                  retentionPolicies.map(policy => (
                    <div key={policy.id} className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-white font-medium">{policy.name}</h3>
                          <p className="text-slate-400 text-sm">
                            {policy.entityType} data retention policy
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            policy.enabled 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                          }>
                            {policy.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            {policy.entityType}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-slate-400">Retention Period</p>
                          <p className="text-white font-medium">{policy.retentionPeriod} days</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Action</p>
                          <p className="text-white font-medium capitalize">{policy.archivalAction}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Delay</p>
                          <p className="text-white font-medium">{policy.archivalDelay} days</p>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-slate-400 text-sm">Conditions</p>
                        <p className="text-white font-medium text-sm">
                          {policy.conditions.map(condition => 
                            `${condition.field} ${condition.operator} ${condition.value}`
                          ).join(', ')}
                        </p>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Record Details Dialog */}
      <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Archived Record Details</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Original ID</p>
                  <p className="text-white font-medium">{selectedRecord.originalId}</p>
                </div>
                <div>
                  <p className="text-slate-400">Entity Type</p>
                  <p className="text-white font-medium">{selectedRecord.entityType}</p>
                </div>
                <div>
                  <p className="text-slate-400">Archived At</p>
                  <p className="text-white font-medium">{formatDate(selectedRecord.archivedAt)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Archived By</p>
                  <p className="text-white font-medium">{selectedRecord.archivedBy}</p>
                </div>
                <div>
                  <p className="text-slate-400">Location</p>
                  <p className="text-white font-medium">{selectedRecord.location}</p>
                </div>
                <div>
                  <p className="text-slate-400">Size</p>
                  <p className="text-white font-medium">{formatFileSize(selectedRecord.size)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-slate-400 mb-2">Data</p>
                <div className="p-3 bg-slate-700/50 rounded">
                  <pre className="text-slate-300 text-sm overflow-x-auto">
                    {JSON.stringify(selectedRecord.data, null, 2)}
                  </pre>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRecordDialog(false)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    handleRestoreRecord(selectedRecord.id)
                    setShowRecordDialog(false)
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Restore
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}