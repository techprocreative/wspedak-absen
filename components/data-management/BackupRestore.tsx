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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { logger, logApiError, logApiRequest } from '@/lib/logger'
import {
  Database,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Settings,
  Calendar,
  Clock,
  FileArchive,
  Shield,
  Trash2,
  Play,
  Pause,
  Eye,
  ArrowLeft,
  Plus,
  X
} from "lucide-react"

// Define interfaces
interface BackupConfig {
  type: 'full' | 'incremental' | 'differential'
  includeTables: string[]
  excludeTables: string[]
  compression: boolean
  compressionLevel: number
  encryption: boolean
  location: string
  filename?: string
  retentionDays: number
}

interface RestoreConfig {
  backupId: string
  conflictResolution: 'skip' | 'overwrite' | 'merge'
  includeTables: string[]
  excludeTables: string[]
  dryRun: boolean
  validateBeforeRestore: boolean
}

interface BackupRecord {
  id: string
  name: string
  type: 'full' | 'incremental' | 'differential'
  status: 'completed' | 'failed' | 'running'
  progress: number
  totalRecords: number
  processedRecords: number
  fileSize: number
  compressedSize: number
  encrypted: boolean
  downloadUrl?: string
  errors: string[]
  warnings: string[]
  createdAt: string
  startedAt?: string
  completedAt?: string
  createdBy: string
  location: string
}

interface BackupSchedule {
  id: string
  name: string
  enabled: boolean
  type: 'full' | 'incremental'
  frequency: 'daily' | 'weekly' | 'monthly'
  time: string
  retentionDays: number
  location: string
  encryption: boolean
  notifications: boolean
  recipients: string[]
  lastRun?: string
  nextRun: string
}

interface BackupProgress {
  current: number
  total: number
  percentage: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  message?: string
  stage?: string
}

interface RestoreProgress {
  current: number
  total: number
  percentage: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  message?: string
  stage?: string
}

// Mock data
const mockBackupHistory: BackupRecord[] = [
  {
    id: 'backup-1',
    name: 'Full Backup - January 2025',
    type: 'full',
    status: 'completed',
    progress: 100,
    totalRecords: 15420,
    processedRecords: 15420,
    fileSize: 245.6 * 1024 * 1024, // 245.6 MB in bytes
    compressedSize: 89.2 * 1024 * 1024, // 89.2 MB in bytes
    encrypted: true,
    downloadUrl: '/downloads/backup-full-2025-01-01.zip',
    errors: [],
    warnings: [],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
    createdBy: 'System',
    location: '/backups/full'
  },
  {
    id: 'backup-2',
    name: 'Incremental Backup - Daily',
    type: 'incremental',
    status: 'completed',
    progress: 100,
    totalRecords: 125,
    processedRecords: 125,
    fileSize: 2.3 * 1024 * 1024, // 2.3 MB in bytes
    compressedSize: 0.8 * 1024 * 1024, // 0.8 MB in bytes
    encrypted: true,
    downloadUrl: '/downloads/backup-inc-2025-01-03.zip',
    errors: [],
    warnings: [],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 12 * 60 * 1000).toISOString(),
    createdBy: 'System',
    location: '/backups/incremental'
  }
]

const mockBackupSchedules: BackupSchedule[] = [
  {
    id: 'schedule-1',
    name: 'Daily Incremental Backup',
    enabled: true,
    type: 'incremental',
    frequency: 'daily',
    time: '02:00',
    retentionDays: 7,
    location: '/backups/incremental',
    encryption: true,
    notifications: true,
    recipients: ['admin@example.com'],
    lastRun: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    nextRun: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'schedule-2',
    name: 'Weekly Full Backup',
    enabled: true,
    type: 'full',
    frequency: 'weekly',
    time: '01:00',
    retentionDays: 30,
    location: '/backups/full',
    encryption: true,
    notifications: true,
    recipients: ['admin@example.com'],
    lastRun: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    nextRun: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString()
  }
]

export function BackupRestore() {
  const [activeTab, setActiveTab] = useState("backup")
  const [activeBackupTab, setActiveBackupTab] = useState("create")
  const [backupConfig, setBackupConfig] = useState<BackupConfig>({
    type: 'full',
    includeTables: ['employees', 'attendance', 'schedules'],
    excludeTables: [],
    compression: true,
    compressionLevel: 6,
    encryption: true,
    location: '/backups',
    retentionDays: 30
  })
  const [restoreConfig, setRestoreConfig] = useState<RestoreConfig>({
    backupId: '',
    conflictResolution: 'skip',
    includeTables: ['employees', 'attendance', 'schedules'],
    excludeTables: [],
    dryRun: true,
    validateBeforeRestore: true
  })
  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>(mockBackupHistory)
  const [backupSchedules, setBackupSchedules] = useState<BackupSchedule[]>(mockBackupSchedules)
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null)
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [backupProgress, setBackupProgress] = useState<BackupProgress | null>(null)
  const [restoreProgress, setRestoreProgress] = useState<RestoreProgress | null>(null)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)

  // Create backup
  const handleCreateBackup = useCallback(async () => {
    setIsCreatingBackup(true)
    setBackupProgress({ current: 0, total: 100, percentage: 0, status: 'pending' })
    
    try {
      // Mock API call with progress
      // In a real implementation, this would call the actual API
      const stages = [
        { name: 'initialization', duration: 1000 },
        { name: 'collection', duration: 2000 },
        { name: 'processing', duration: 3000 },
        { name: 'compression', duration: 2000 },
        { name: 'encryption', duration: 1000 },
        { name: 'saving', duration: 1000 }
      ]
      
      let currentProgress = 0
      const totalStages = stages.length
      
      for (let i = 0; i < totalStages; i++) {
        const stage = stages[i]
        setBackupProgress({
          current: currentProgress,
          total: 100,
          percentage: Math.round((currentProgress / 100) * 100),
          status: 'running',
          message: `Starting ${stage.name}...`,
          stage: stage.name
        })
        
        await new Promise(resolve => setTimeout(resolve, stage.duration))
        
        currentProgress += Math.round(100 / totalStages)
        setBackupProgress({
          current: currentProgress,
          total: 100,
          percentage: currentProgress,
          status: 'running',
          message: `Completed ${stage.name}`,
          stage: stage.name
        })
      }
      
      setBackupProgress({
        current: 100,
        total: 100,
        percentage: 100,
        status: 'completed',
        message: 'Backup completed successfully'
      })
      
      // Add to history
      const newBackup: BackupRecord = {
        id: `backup-${Date.now()}`,
        name: `${backupConfig.type === 'full' ? 'Full' : 'Incremental'} Backup - ${new Date().toLocaleDateString()}`,
        type: backupConfig.type,
        status: 'completed',
        progress: 100,
        totalRecords: 15420,
        processedRecords: 15420,
        fileSize: 245.6 * 1024 * 1024,
        compressedSize: 89.2 * 1024 * 1024,
        encrypted: backupConfig.encryption,
        downloadUrl: `/downloads/backup-${Date.now()}.zip`,
        errors: [],
        warnings: [],
        createdAt: new Date().toISOString(),
        startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        completedAt: new Date().toISOString(),
        createdBy: 'Current User',
        location: backupConfig.location
      }
      
      setBackupHistory(prev => [newBackup, ...prev])
    } catch (error) {
      logger.error('Backup error', error as Error)
      setBackupProgress({
        current: 0,
        total: 100,
        percentage: 0,
        status: 'failed',
        message: 'Backup failed'
      })
    } finally {
      setIsCreatingBackup(false)
    }
  }, [backupConfig])

  // Restore backup
  const handleRestoreBackup = useCallback(async () => {
    if (!selectedBackup) return
    
    setIsRestoring(true)
    setRestoreProgress({ current: 0, total: 100, percentage: 0, status: 'pending' })
    
    try {
      // Mock API call with progress
      // In a real implementation, this would call the actual API
      const stages = [
        { name: 'initialization', duration: 1000 },
        { name: 'loading', duration: 2000 },
        { name: 'validation', duration: 1000 },
        { name: 'restoration', duration: 3000 }
      ]
      
      let currentProgress = 0
      const totalStages = stages.length
      
      for (let i = 0; i < totalStages; i++) {
        const stage = stages[i]
        setRestoreProgress({
          current: currentProgress,
          total: 100,
          percentage: Math.round((currentProgress / 100) * 100),
          status: 'running',
          message: `Starting ${stage.name}...`,
          stage: stage.name
        })
        
        await new Promise(resolve => setTimeout(resolve, stage.duration))
        
        currentProgress += Math.round(100 / totalStages)
        setRestoreProgress({
          current: currentProgress,
          total: 100,
          percentage: currentProgress,
          status: 'running',
          message: `Completed ${stage.name}`,
          stage: stage.name
        })
      }
      
      setRestoreProgress({
        current: 100,
        total: 100,
        percentage: 100,
        status: 'completed',
        message: 'Restore completed successfully'
      })
    } catch (error) {
      logger.error('Restore error', error as Error)
      setRestoreProgress({
        current: 0,
        total: 100,
        percentage: 0,
        status: 'failed',
        message: 'Restore failed'
      })
    } finally {
      setIsRestoring(false)
    }
  }, [selectedBackup, restoreConfig])

  // Delete backup
  const handleDeleteBackup = useCallback(async (backupId: string) => {
    try {
      // Mock API call
      // In a real implementation, this would call the actual API
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setBackupHistory(prev => prev.filter(backup => backup.id !== backupId))
    } catch (error) {
      logger.error('Delete backup error', error as Error)
    }
  }, [])

  // Download backup
  const handleDownloadBackup = useCallback((backup: BackupRecord) => {
    if (!backup.downloadUrl) return
    
    // Create download link
    const a = document.createElement('a')
    a.href = backup.downloadUrl
    a.download = backup.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Backup & Restore</h2>
          <p className="text-slate-400">Create, manage, and restore database backups</p>
        </div>
        <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Backup
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Schedule Backup</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Schedule Name</Label>
                <Input
                  placeholder="My Backup Schedule"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div>
                <Label className="text-slate-300">Backup Type</Label>
                <Select defaultValue="incremental">
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Backup</SelectItem>
                    <SelectItem value="incremental">Incremental Backup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Frequency</Label>
                <Select defaultValue="daily">
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Time</Label>
                <Input
                  type="time"
                  defaultValue="02:00"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="encryption" defaultChecked />
                <Label htmlFor="encryption" className="text-slate-300">
                  Enable encryption
                </Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleDialog(false)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowScheduleDialog(false)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Create Schedule
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="backup" className="data-[state=active]:bg-slate-700">
            <Database className="w-4 h-4 mr-2" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="restore" className="data-[state=active]:bg-slate-700">
            <Upload className="w-4 h-4 mr-2" />
            Restore
          </TabsTrigger>
          <TabsTrigger value="schedules" className="data-[state=active]:bg-slate-700">
            <Calendar className="w-4 h-4 mr-2" />
            Schedules
          </TabsTrigger>
        </TabsList>

        {/* Backup Tab */}
        <TabsContent value="backup" className="space-y-6">
          <Tabs value={activeBackupTab} onValueChange={setActiveBackupTab} className="space-y-6">
            <TabsList className="bg-slate-800 border-slate-700">
              <TabsTrigger value="create" className="data-[state=active]:bg-slate-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Backup
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-slate-700">
                <Clock className="w-4 h-4 mr-2" />
                Backup History
              </TabsTrigger>
            </TabsList>

            {/* Create Backup */}
            <TabsContent value="create" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Backup Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Backup Type</Label>
                    <Select 
                      value={backupConfig.type} 
                      onValueChange={(value: any) => setBackupConfig(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full Backup</SelectItem>
                        <SelectItem value="incremental">Incremental Backup</SelectItem>
                        <SelectItem value="differential">Differential Backup</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-300">Include Tables</Label>
                    <div className="space-y-2 mt-2">
                      {['employees', 'attendance', 'schedules'].map(table => (
                        <div key={table} className="flex items-center space-x-2">
                          <Checkbox
                            id={table}
                            checked={backupConfig.includeTables.includes(table)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setBackupConfig(prev => ({
                                  ...prev,
                                  includeTables: [...prev.includeTables, table]
                                }))
                              } else {
                                setBackupConfig(prev => ({
                                  ...prev,
                                  includeTables: prev.includeTables.filter(t => t !== table)
                                }))
                              }
                            }}
                          />
                          <Label htmlFor={table} className="text-slate-300 capitalize">
                            {table}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="compression"
                        checked={backupConfig.compression}
                        onCheckedChange={(checked) => setBackupConfig(prev => ({ ...prev, compression: checked as boolean }))}
                      />
                      <Label htmlFor="compression" className="text-slate-300">
                        Enable compression
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="encryption"
                        checked={backupConfig.encryption}
                        onCheckedChange={(checked) => setBackupConfig(prev => ({ ...prev, encryption: checked as boolean }))}
                      />
                      <Label htmlFor="encryption" className="text-slate-300">
                        Enable encryption
                      </Label>
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300">Retention Period (days)</Label>
                    <Input
                      type="number"
                      value={backupConfig.retentionDays}
                      onChange={(e) => setBackupConfig(prev => ({ ...prev, retentionDays: parseInt(e.target.value) || 30 }))}
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300">Backup Location</Label>
                    <Input
                      value={backupConfig.location}
                      onChange={(e) => setBackupConfig(prev => ({ ...prev, location: e.target.value }))}
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
                </CardContent>
              </Card>

              {backupProgress && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Backup Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Progress</span>
                        <span className="text-slate-300">{backupProgress.percentage}%</span>
                      </div>
                      <Progress value={backupProgress.percentage} className="h-2 bg-slate-700" />
                      {backupProgress.message && (
                        <p className="text-slate-400 text-sm">{backupProgress.message}</p>
                      )}
                      {backupProgress.stage && (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                          {backupProgress.stage}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleCreateBackup}
                  disabled={isCreatingBackup || backupConfig.includeTables.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Database className="w-4 h-4 mr-2" />
                  {isCreatingBackup ? 'Creating Backup...' : 'Create Backup'}
                </Button>
              </div>
            </TabsContent>

            {/* Backup History */}
            <TabsContent value="history" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Backup History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {backupHistory.length === 0 ? (
                      <p className="text-slate-400 text-center py-8">
                        No backups found. Create your first backup to see it here.
                      </p>
                    ) : (
                      backupHistory.map(backup => (
                        <div key={backup.id} className="p-4 bg-slate-700/30 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="text-white font-medium">{backup.name}</h3>
                              <p className="text-slate-400 text-sm">
                                Created by {backup.createdBy} on {formatDate(backup.createdAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={
                                backup.type === 'full' 
                                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                  : 'bg-green-500/20 text-green-400 border-green-500/30'
                              }>
                                {backup.type}
                              </Badge>
                              {backup.encrypted && (
                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Encrypted
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                            <div>
                              <p className="text-slate-400">Status</p>
                              <p className="text-white font-medium capitalize">{backup.status}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Records</p>
                              <p className="text-white font-medium">{backup.totalRecords.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Size</p>
                              <p className="text-white font-medium">{formatFileSize(backup.fileSize)}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Compressed</p>
                              <p className="text-white font-medium">{formatFileSize(backup.compressedSize)}</p>
                            </div>
                          </div>
                          
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadBackup(backup)}
                              className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteBackup(backup.id)}
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
          </Tabs>
        </TabsContent>

        {/* Restore Tab */}
        <TabsContent value="restore" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Select Backup to Restore</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {backupHistory.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">
                    No backups available for restore.
                  </p>
                ) : (
                  backupHistory.filter(backup => backup.status === 'completed').map(backup => (
                    <div 
                      key={backup.id} 
                      className={`p-4 bg-slate-700/30 rounded-lg cursor-pointer border ${
                        selectedBackup?.id === backup.id 
                          ? 'border-emerald-500' 
                          : 'border-slate-600'
                      }`}
                      onClick={() => setSelectedBackup(backup)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-white font-medium">{backup.name}</h3>
                          <p className="text-slate-400 text-sm">
                            Created on {formatDate(backup.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            backup.type === 'full' 
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : 'bg-green-500/20 text-green-400 border-green-500/30'
                          }>
                            {backup.type}
                          </Badge>
                          {selectedBackup?.id === backup.id && (
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {selectedBackup && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Restore Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-300">Conflict Resolution</Label>
                  <Select 
                    value={restoreConfig.conflictResolution} 
                    onValueChange={(value: any) => setRestoreConfig(prev => ({ ...prev, conflictResolution: value }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip Conflicts</SelectItem>
                      <SelectItem value="overwrite">Overwrite Existing</SelectItem>
                      <SelectItem value="merge">Merge Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="dryRun"
                      checked={restoreConfig.dryRun}
                      onCheckedChange={(checked) => setRestoreConfig(prev => ({ ...prev, dryRun: checked as boolean }))}
                    />
                    <Label htmlFor="dryRun" className="text-slate-300">
                      Dry run (no changes)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="validate"
                      checked={restoreConfig.validateBeforeRestore}
                      onCheckedChange={(checked) => setRestoreConfig(prev => ({ ...prev, validateBeforeRestore: checked as boolean }))}
                    />
                    <Label htmlFor="validate" className="text-slate-300">
                      Validate before restore
                    </Label>
                  </div>
                </div>

                {restoreProgress && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Restore Progress</span>
                      <span className="text-slate-300">{restoreProgress.percentage}%</span>
                    </div>
                    <Progress value={restoreProgress.percentage} className="h-2 bg-slate-700" />
                    {restoreProgress.message && (
                      <p className="text-slate-400 text-sm">{restoreProgress.message}</p>
                    )}
                    {restoreProgress.stage && (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        {restoreProgress.stage}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={handleRestoreBackup}
                    disabled={isRestoring}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isRestoring ? 'Restoring...' : 'Start Restore'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Backup Schedules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {backupSchedules.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">
                    No backup schedules configured.
                  </p>
                ) : (
                  backupSchedules.map(schedule => (
                    <div key={schedule.id} className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-white font-medium">{schedule.name}</h3>
                          <p className="text-slate-400 text-sm">
                            {schedule.frequency === 'daily' ? 'Daily' : 
                             schedule.frequency === 'weekly' ? 'Weekly' : 'Monthly'} at {schedule.time}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            schedule.enabled 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                          }>
                            {schedule.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <Badge className={
                            schedule.type === 'full' 
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : 'bg-green-500/20 text-green-400 border-green-500/30'
                          }>
                            {schedule.type}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-slate-400">Location</p>
                          <p className="text-white font-medium">{schedule.location}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Retention</p>
                          <p className="text-white font-medium">{schedule.retentionDays} days</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Last Run</p>
                          <p className="text-white font-medium">
                            {schedule.lastRun ? formatDate(schedule.lastRun) : 'Never'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Next Run</p>
                          <p className="text-white font-medium">{formatDate(schedule.nextRun)}</p>
                        </div>
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
                        <Button
                          variant="outline"
                          size="sm"
                          className={schedule.enabled 
                            ? "border-yellow-600 text-yellow-400 hover:bg-yellow-600/20"
                            : "border-emerald-600 text-emerald-400 hover:bg-emerald-600/20"
                          }
                        >
                          {schedule.enabled ? (
                            <>
                              <Pause className="w-4 h-4 mr-1" />
                              Disable
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Enable
                            </>
                          )}
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
    </div>
  )
}