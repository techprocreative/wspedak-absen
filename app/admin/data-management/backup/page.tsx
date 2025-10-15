"use client"

export const dynamic = 'force-dynamic'

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { logger, logApiError, logApiRequest } from '@/lib/logger'
// Layout is provided by app/admin/layout.tsx
import {
  DatabaseBackup,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Trash2,
  RefreshCw,
  FileArchive,
  FileText,
  Calendar,
  Settings,
  ArrowRight,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Shield,
  HardDrive,
  Timer,
  Mail,
  Save,
  FolderOpen,
  Zap,
  History,
  Activity
} from "lucide-react"

// Define interfaces for backup system
interface BackupJob {
  id: string
  name: string
  type: "full" | "incremental" | "differential"
  status: "pending" | "running" | "completed" | "failed" | "scheduled"
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

interface RestoreJob {
  id: string
  backupId: string
  backupName: string
  status: "pending" | "running" | "completed" | "failed"
  progress: number
  totalRecords: number
  processedRecords: number
  errors: string[]
  warnings: string[]
  createdAt: string
  startedAt?: string
  completedAt?: string
  createdBy: string
  restorePoint?: string
  conflictResolution: "skip" | "overwrite" | "merge"
}

interface BackupSchedule {
  id: string
  name: string
  enabled: boolean
  type: "full" | "incremental"
  frequency: "daily" | "weekly" | "monthly"
  time: string
  retention: number // days
  location: string
  encrypted: boolean
  notifications: boolean
  recipients: string[]
  lastRun?: string
  nextRun: string
}

interface BackupSettings {
  encryption: boolean
  compression: boolean
  compressionLevel: number
  location: string
  retentionPolicy: {
    full: number // days
    incremental: number // days
    differential: number // days
  }
  notifications: {
    enabled: boolean
    onSuccess: boolean
    onFailure: boolean
    recipients: string[]
  }
}

export default function BackupRestorePage() {
  const router = useRouter()
  
  // State management
  const [activeTab, setActiveTab] = useState("overview")
  const [backupType, setBackupType] = useState<"full" | "incremental" | "differential">("full")
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [backupProgress, setBackupProgress] = useState(0)
  const [currentBackupJob, setCurrentBackupJob] = useState<BackupJob | null>(null)
  const [currentRestoreJob, setCurrentRestoreJob] = useState<RestoreJob | null>(null)
  const [backupHistory, setBackupHistory] = useState<BackupJob[]>([])
  const [restoreHistory, setRestoreHistory] = useState<RestoreJob[]>([])
  const [schedules, setSchedules] = useState<BackupSchedule[]>([])
  const [settings, setSettings] = useState<BackupSettings>({
    encryption: true,
    compression: true,
    compressionLevel: 6,
    location: "/backups",
    retentionPolicy: {
      full: 30,
      incremental: 7,
      differential: 14
    },
    notifications: {
      enabled: true,
      onSuccess: true,
      onFailure: true,
      recipients: ["admin@example.com"]
    }
  })
  const [selectedBackup, setSelectedBackup] = useState<BackupJob | null>(null)
  const [restoreOptions, setRestoreOptions] = useState({
    conflictResolution: "skip" as "skip" | "overwrite" | "merge",
    restorePoint: ""
  })
  const [loading, setLoading] = useState(true)

  // Mock backup history
  const mockBackupHistory: BackupJob[] = [
    {
      id: "1",
      name: "Full Backup - January 2025",
      type: "full",
      status: "completed",
      progress: 100,
      totalRecords: 15420,
      processedRecords: 15420,
      fileSize: 245.6,
      compressedSize: 89.2,
      encrypted: true,
      downloadUrl: "/downloads/backup-full-2025-01-01.zip",
      errors: [],
      warnings: [],
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      createdBy: "System",
      location: "/backups/full"
    },
    {
      id: "2",
      name: "Incremental Backup - Daily",
      type: "incremental",
      status: "completed",
      progress: 100,
      totalRecords: 125,
      processedRecords: 125,
      fileSize: 2.3,
      compressedSize: 0.8,
      encrypted: true,
      downloadUrl: "/downloads/backup-inc-2025-01-03.zip",
      errors: [],
      warnings: [],
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 12 * 60 * 1000).toISOString(),
      createdBy: "System",
      location: "/backups/incremental"
    },
    {
      id: "3",
      name: "Full Backup - December 2024",
      type: "full",
      status: "failed",
      progress: 45,
      totalRecords: 15280,
      processedRecords: 6876,
      fileSize: 0,
      compressedSize: 0,
      encrypted: true,
      errors: ["Storage space insufficient", "Connection timeout"],
      warnings: [],
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      startedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
      createdBy: "System",
      location: "/backups/full"
    }
  ]

  // Mock restore history
  const mockRestoreHistory: RestoreJob[] = [
    {
      id: "1",
      backupId: "1",
      backupName: "Full Backup - January 2025",
      status: "completed",
      progress: 100,
      totalRecords: 15420,
      processedRecords: 15420,
      errors: [],
      warnings: ["Some records were skipped due to conflicts"],
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000).toISOString(),
      createdBy: "Admin",
      conflictResolution: "merge"
    }
  ]

  // Mock schedules
  const mockSchedules: BackupSchedule[] = [
    {
      id: "1",
      name: "Daily Incremental Backup",
      enabled: true,
      type: "incremental",
      frequency: "daily",
      time: "02:00",
      retention: 7,
      location: "/backups/incremental",
      encrypted: true,
      notifications: true,
      recipients: ["admin@example.com"],
      lastRun: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      nextRun: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "2",
      name: "Weekly Full Backup",
      enabled: true,
      type: "full",
      frequency: "weekly",
      time: "01:00",
      retention: 30,
      location: "/backups/full",
      encrypted: true,
      notifications: true,
      recipients: ["admin@example.com"],
      lastRun: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      nextRun: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setBackupHistory(mockBackupHistory)
      setRestoreHistory(mockRestoreHistory)
      setSchedules(mockSchedules)
    } catch (error) {
      logger.error('Error fetching backup data', error as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Start backup
  const startBackup = async () => {
    setIsBackingUp(true)
    setBackupProgress(0)

    const newJob: BackupJob = {
      id: Date.now().toString(),
      name: `${backupType.charAt(0).toUpperCase() + backupType.slice(1)} Backup - ${new Date().toLocaleDateString()}`,
      type: backupType,
      status: "running",
      progress: 0,
      totalRecords: Math.floor(Math.random() * 5000) + 10000,
      processedRecords: 0,
      fileSize: 0,
      compressedSize: 0,
      encrypted: settings.encryption,
      errors: [],
      warnings: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      createdBy: "Admin",
      location: settings.location
    }

    setCurrentBackupJob(newJob)
    setActiveTab("progress")

    // Simulate backup progress
    const interval = setInterval(() => {
      setCurrentBackupJob(prev => {
        if (!prev) return null
        
        const newProgress = Math.min(prev.progress + 3, 100)
        const newProcessedRecords = Math.floor((newProgress / 100) * prev.totalRecords)
        
        if (newProgress >= 100) {
          clearInterval(interval)
          setIsBackingUp(false)
          return {
            ...prev,
            progress: 100,
            processedRecords: prev.totalRecords,
            status: "completed",
            completedAt: new Date().toISOString(),
            fileSize: Math.random() * 200 + 50,
            compressedSize: Math.random() * 80 + 20,
            downloadUrl: `/downloads/backup-${prev.id}.zip`
          }
        }
        
        return {
          ...prev,
          progress: newProgress,
          processedRecords: newProcessedRecords
        }
      })
      setBackupProgress(prev => Math.min(prev + 3, 100))
    }, 500)
  }

  // Start restore
  const startRestore = async () => {
    if (!selectedBackup) return

    const newJob: RestoreJob = {
      id: Date.now().toString(),
      backupId: selectedBackup.id,
      backupName: selectedBackup.name,
      status: "running",
      progress: 0,
      totalRecords: selectedBackup.totalRecords,
      processedRecords: 0,
      errors: [],
      warnings: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      createdBy: "Admin",
      conflictResolution: restoreOptions.conflictResolution
    }

    setCurrentRestoreJob(newJob)
    setActiveTab("restore-progress")

    // Simulate restore progress
    const interval = setInterval(() => {
      setCurrentRestoreJob(prev => {
        if (!prev) return null
        
        const newProgress = Math.min(prev.progress + 4, 100)
        const newProcessedRecords = Math.floor((newProgress / 100) * prev.totalRecords)
        
        if (newProgress >= 100) {
          clearInterval(interval)
          return {
            ...prev,
            progress: 100,
            processedRecords: prev.totalRecords,
            status: "completed",
            completedAt: new Date().toISOString(),
            warnings: prev.warnings.length > 0 ? ["Some records were skipped due to conflicts"] : []
          }
        }
        
        return {
          ...prev,
          progress: newProgress,
          processedRecords: newProcessedRecords
        }
      })
    }, 400)
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case "running":
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-400" />
      case "scheduled":
        return <Clock className="w-4 h-4 text-yellow-400" />
      default:
        return <Clock className="w-4 h-4 text-slate-400" />
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "running":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "scheduled":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  // Get backup type color
  const getBackupTypeColor = (type: string) => {
    switch (type) {
      case "full":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case "incremental":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "differential":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Backup & Restore</h1>
              <p className="text-slate-400">Manage database backups and restoration</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin/data-management")}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Data Management
              </Button>
            </div>
          </div>

          {/* Backup Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-slate-800 border-slate-700">
              <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">
                <DatabaseBackup className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="create" className="data-[state=active]:bg-slate-700">
                <Save className="w-4 h-4 mr-2" />
                Create Backup
              </TabsTrigger>
              <TabsTrigger value="restore" className="data-[state=active]:bg-slate-700">
                <RotateCcw className="w-4 h-4 mr-2" />
                Restore
              </TabsTrigger>
              <TabsTrigger value="progress" className="data-[state=active]:bg-slate-700" disabled={!currentBackupJob}>
                <Activity className="w-4 h-4 mr-2" />
                Progress
              </TabsTrigger>
              <TabsTrigger value="restore-progress" className="data-[state=active]:bg-slate-700" disabled={!currentRestoreJob}>
                <Activity className="w-4 h-4 mr-2" />
                Restore Progress
              </TabsTrigger>
              <TabsTrigger value="schedules" className="data-[state=active]:bg-slate-700">
                <Timer className="w-4 h-4 mr-2" />
                Schedules
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-slate-700">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-300">Last Backup</CardTitle>
                    <DatabaseBackup className="h-4 w-4 text-emerald-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">2 days ago</div>
                    <p className="text-xs text-slate-400 mt-1">
                      Next: Daily at 2:00 AM
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-300">Total Backups</CardTitle>
                    <History className="h-4 w-4 text-blue-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">12</div>
                    <p className="text-xs text-slate-400 mt-1">
                      3 full, 9 incremental
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-300">Storage Used</CardTitle>
                    <HardDrive className="h-4 w-4 text-orange-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">1.2 GB</div>
                    <p className="text-xs text-slate-400 mt-1">
                      of 10 GB available
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-300">System Health</CardTitle>
                    <Shield className="h-4 w-4 text-green-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Healthy
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      All systems operational
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Backups */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Recent Backups
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {backupHistory.slice(0, 5).map((backup) => (
                      <div key={backup.id} className="p-4 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(backup.status)}
                            <div>
                              <p className="text-white font-medium">{backup.name}</p>
                              <p className="text-slate-400 text-sm">
                                {backup.processedRecords} records
                                {backup.compressedSize > 0 && ` • ${backup.compressedSize.toFixed(1)} MB compressed`}
                                {backup.encrypted && " • Encrypted"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getBackupTypeColor(backup.type)}>
                              {backup.type}
                            </Badge>
                            <Badge className={getStatusColor(backup.status)}>
                              {backup.status}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <p className="text-slate-400">
                            Created by {backup.createdBy} • {new Date(backup.createdAt).toLocaleString()}
                          </p>
                          {backup.status === "running" && (
                            <div className="flex items-center gap-2">
                              <Progress value={backup.progress} className="w-20 h-2 bg-slate-600" />
                              <span className="text-slate-300">{backup.progress}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Create Backup Tab */}
            <TabsContent value="create" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Create New Backup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Backup Type Selection */}
                  <div>
                    <Label className="text-slate-300 mb-3 block">Backup Type</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          backupType === "full"
                            ? "bg-purple-500/20 border-purple-500/30"
                            : "bg-slate-700/30 border-slate-600 hover:bg-slate-700/50"
                        }`}
                        onClick={() => setBackupType("full")}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <DatabaseBackup className="w-5 h-5 text-purple-400" />
                          <h3 className="font-medium text-white">Full Backup</h3>
                        </div>
                        <p className="text-sm text-slate-400">
                          Complete backup of all data. Slower but comprehensive.
                        </p>
                      </div>
                      
                      <div
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          backupType === "incremental"
                            ? "bg-blue-500/20 border-blue-500/30"
                            : "bg-slate-700/30 border-slate-600 hover:bg-slate-700/50"
                        }`}
                        onClick={() => setBackupType("incremental")}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Zap className="w-5 h-5 text-blue-400" />
                          <h3 className="font-medium text-white">Incremental</h3>
                        </div>
                        <p className="text-sm text-slate-400">
                          Only changes since last backup. Fast and efficient.
                        </p>
                      </div>
                      
                      <div
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          backupType === "differential"
                            ? "bg-orange-500/20 border-orange-500/30"
                            : "bg-slate-700/30 border-slate-600 hover:bg-slate-700/50"
                        }`}
                        onClick={() => setBackupType("differential")}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Activity className="w-5 h-5 text-orange-400" />
                          <h3 className="font-medium text-white">Differential</h3>
                        </div>
                        <p className="text-sm text-slate-400">
                          Changes since last full backup. Balanced approach.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Backup Options */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="encrypt"
                        checked={settings.encryption}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, encryption: checked as boolean }))
                        }
                      />
                      <Label htmlFor="encrypt" className="text-slate-300">
                        Encrypt backup (recommended)
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="compress"
                        checked={settings.compression}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, compression: checked as boolean }))
                        }
                      />
                      <Label htmlFor="compress" className="text-slate-300">
                        Compress backup to save space
                      </Label>
                    </div>

                    {settings.compression && (
                      <div>
                        <Label className="text-slate-300">Compression Level</Label>
                        <Select
                          value={settings.compressionLevel.toString()}
                          onValueChange={(value) => 
                            setSettings(prev => ({ ...prev, compressionLevel: parseInt(value) }))
                          }
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Fast (Low Compression)</SelectItem>
                            <SelectItem value="6">Balanced</SelectItem>
                            <SelectItem value="9">Maximum (Slow)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Backup Progress */}
                  {isBackingUp && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-300">Creating backup...</span>
                        <span className="text-sm text-slate-300">{backupProgress}%</span>
                      </div>
                      <Progress value={backupProgress} className="h-2 bg-slate-700" />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end">
                    <Button
                      onClick={startBackup}
                      disabled={isBackingUp}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isBackingUp ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Creating Backup...
                        </>
                      ) : (
                        <>
                          <DatabaseBackup className="w-4 h-4 mr-2" />
                          Start Backup
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Restore Tab */}
            <TabsContent value="restore" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Restore from Backup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Backup Selection */}
                  <div>
                    <Label className="text-slate-300 mb-3 block">Select Backup to Restore</Label>
                    <div className="space-y-3">
                      {backupHistory.filter(b => b.status === "completed").map((backup) => (
                        <div
                          key={backup.id}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedBackup?.id === backup.id
                              ? "bg-emerald-500/20 border-emerald-500/30"
                              : "bg-slate-700/30 border-slate-600 hover:bg-slate-700/50"
                          }`}
                          onClick={() => setSelectedBackup(backup)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileArchive className="w-5 h-5 text-emerald-400" />
                              <div>
                                <p className="text-white font-medium">{backup.name}</p>
                                <p className="text-slate-400 text-sm">
                                  {backup.totalRecords} records • {backup.fileSize.toFixed(1)} MB
                                  {backup.encrypted && " • Encrypted"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getBackupTypeColor(backup.type)}>
                                {backup.type}
                              </Badge>
                              <p className="text-slate-400 text-sm">
                                {new Date(backup.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Restore Options */}
                  {selectedBackup && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-slate-300">Conflict Resolution</Label>
                        <Select
                          value={restoreOptions.conflictResolution}
                          onValueChange={(value: any) => 
                            setRestoreOptions(prev => ({ ...prev, conflictResolution: value }))
                          }
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

                      <Alert className="bg-yellow-500/10 border-yellow-500/30">
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                        <AlertDescription className="text-yellow-400">
                          <p className="text-sm">
                            <strong>Warning:</strong> Restoring from backup will modify current data. 
                            This action cannot be undone. Consider creating a backup before restoring.
                          </p>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end">
                    <Button
                      onClick={startRestore}
                      disabled={!selectedBackup}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Start Restore
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="space-y-6">
              {currentBackupJob && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      {getStatusIcon(currentBackupJob.status)}
                      Backup Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-300">
                            Creating {currentBackupJob.name}
                          </span>
                          <span className="text-sm text-slate-300">
                            {currentBackupJob.processedRecords} / {currentBackupJob.totalRecords} records
                          </span>
                        </div>
                        <Progress value={currentBackupJob.progress} className="h-2 bg-slate-700" />
                        <p className="text-center text-white mt-2">{currentBackupJob.progress}%</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">Started</p>
                          <p className="text-white">
                            {currentBackupJob.startedAt && new Date(currentBackupJob.startedAt).toLocaleString()}
                          </p>
                        </div>
                        {currentBackupJob.completedAt && (
                          <div>
                            <p className="text-slate-400">Completed</p>
                            <p className="text-white">
                              {new Date(currentBackupJob.completedAt).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {currentBackupJob.status === "completed" && currentBackupJob.downloadUrl && (
                        <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                          <div>
                            <p className="text-emerald-400 font-medium">Backup completed!</p>
                            <p className="text-slate-400 text-sm">
                              File size: {currentBackupJob.fileSize.toFixed(1)} MB
                              {currentBackupJob.compressedSize > 0 && 
                                ` (compressed to ${currentBackupJob.compressedSize.toFixed(1)} MB)`
                              }
                            </p>
                          </div>
                          <Button>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      )}

                      {currentBackupJob.errors.length > 0 && (
                        <Alert className="bg-red-500/10 border-red-500/30">
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          <AlertDescription className="text-red-400">
                            <div className="space-y-1">
                              {currentBackupJob.errors.map((error, index) => (
                                <p key={index} className="text-sm">{error}</p>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Restore Progress Tab */}
            <TabsContent value="restore-progress" className="space-y-6">
              {currentRestoreJob && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      {getStatusIcon(currentRestoreJob.status)}
                      Restore Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-300">
                            Restoring from {currentRestoreJob.backupName}
                          </span>
                          <span className="text-sm text-slate-300">
                            {currentRestoreJob.processedRecords} / {currentRestoreJob.totalRecords} records
                          </span>
                        </div>
                        <Progress value={currentRestoreJob.progress} className="h-2 bg-slate-700" />
                        <p className="text-center text-white mt-2">{currentRestoreJob.progress}%</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">Started</p>
                          <p className="text-white">
                            {currentRestoreJob.startedAt && new Date(currentRestoreJob.startedAt).toLocaleString()}
                          </p>
                        </div>
                        {currentRestoreJob.completedAt && (
                          <div>
                            <p className="text-slate-400">Completed</p>
                            <p className="text-white">
                              {new Date(currentRestoreJob.completedAt).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {currentRestoreJob.status === "completed" && (
                        <Alert className="bg-emerald-500/10 border-emerald-500/30">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <AlertDescription className="text-emerald-400">
                            <p className="text-sm">Restore completed successfully!</p>
                          </AlertDescription>
                        </Alert>
                      )}

                      {currentRestoreJob.warnings.length > 0 && (
                        <Alert className="bg-yellow-500/10 border-yellow-500/30">
                          <AlertCircle className="w-4 h-4 text-yellow-400" />
                          <AlertDescription className="text-yellow-400">
                            <div className="space-y-1">
                              {currentRestoreJob.warnings.map((warning, index) => (
                                <p key={index} className="text-sm">{warning}</p>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
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
                    {schedules.map((schedule) => (
                      <div key={schedule.id} className="p-4 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Timer className="w-5 h-5 text-blue-400" />
                            <div>
                              <p className="text-white font-medium">{schedule.name}</p>
                              <p className="text-slate-400 text-sm">
                                {schedule.frequency} at {schedule.time} • {schedule.type} backup
                                {schedule.encrypted && " • Encrypted"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={schedule.enabled ? 
                              "bg-green-500/20 text-green-400 border-green-500/30" : 
                              "bg-slate-500/20 text-slate-400 border-slate-500/30"
                            }>
                              {schedule.enabled ? "Active" : "Inactive"}
                            </Badge>
                            <Badge className={getBackupTypeColor(schedule.type)}>
                              {schedule.type}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <p className="text-slate-400">
                            Retention: {schedule.retention} days
                            {schedule.lastRun && ` • Last run: ${new Date(schedule.lastRun).toLocaleDateString()}`}
                            {schedule.nextRun && ` • Next run: ${new Date(schedule.nextRun).toLocaleDateString()}`}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Settings className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Play className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Backup Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* General Settings */}
                  <div>
                    <h3 className="text-white font-medium mb-3">General Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-slate-300">Backup Location</Label>
                        <Input
                          value={settings.location}
                          onChange={(e) => setSettings(prev => ({ ...prev, location: e.target.value }))}
                          className="bg-slate-700 border-slate-600"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="default-encrypt"
                          checked={settings.encryption}
                          onCheckedChange={(checked) => 
                            setSettings(prev => ({ ...prev, encryption: checked as boolean }))
                          }
                        />
                        <Label htmlFor="default-encrypt" className="text-slate-300">
                          Encrypt backups by default
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="default-compress"
                          checked={settings.compression}
                          onCheckedChange={(checked) => 
                            setSettings(prev => ({ ...prev, compression: checked as boolean }))
                          }
                        />
                        <Label htmlFor="default-compress" className="text-slate-300">
                          Compress backups by default
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Retention Policy */}
                  <div>
                    <h3 className="text-white font-medium mb-3">Retention Policy</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-slate-300">Full Backups (days)</Label>
                        <Input
                          type="number"
                          value={settings.retentionPolicy.full}
                          onChange={(e) => setSettings(prev => ({ 
                            ...prev, 
                            retentionPolicy: { 
                              ...prev.retentionPolicy, 
                              full: parseInt(e.target.value) 
                            }
                          }))}
                          className="bg-slate-700 border-slate-600"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Incremental Backups (days)</Label>
                        <Input
                          type="number"
                          value={settings.retentionPolicy.incremental}
                          onChange={(e) => setSettings(prev => ({ 
                            ...prev, 
                            retentionPolicy: { 
                              ...prev.retentionPolicy, 
                              incremental: parseInt(e.target.value) 
                            }
                          }))}
                          className="bg-slate-700 border-slate-600"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Differential Backups (days)</Label>
                        <Input
                          type="number"
                          value={settings.retentionPolicy.differential}
                          onChange={(e) => setSettings(prev => ({ 
                            ...prev, 
                            retentionPolicy: { 
                              ...prev.retentionPolicy, 
                              differential: parseInt(e.target.value) 
                            }
                          }))}
                          className="bg-slate-700 border-slate-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notifications */}
                  <div>
                    <h3 className="text-white font-medium mb-3">Notifications</h3>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="notify-enabled"
                          checked={settings.notifications.enabled}
                          onCheckedChange={(checked) => 
                            setSettings(prev => ({ 
                              ...prev, 
                              notifications: { 
                                ...prev.notifications, 
                                enabled: checked as boolean 
                              }
                            }))
                          }
                        />
                        <Label htmlFor="notify-enabled" className="text-slate-300">
                          Enable notifications
                        </Label>
                      </div>

                      {settings.notifications.enabled && (
                        <>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="notify-success"
                              checked={settings.notifications.onSuccess}
                              onCheckedChange={(checked) => 
                                setSettings(prev => ({ 
                                  ...prev, 
                                  notifications: { 
                                    ...prev.notifications, 
                                    onSuccess: checked as boolean 
                                  }
                                }))
                              }
                            />
                            <Label htmlFor="notify-success" className="text-slate-300">
                              Notify on successful backup
                            </Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="notify-failure"
                              checked={settings.notifications.onFailure}
                              onCheckedChange={(checked) => 
                                setSettings(prev => ({ 
                                  ...prev, 
                                  notifications: { 
                                    ...prev.notifications, 
                                    onFailure: checked as boolean 
                                  }
                                }))
                              }
                            />
                            <Label htmlFor="notify-failure" className="text-slate-300">
                              Notify on backup failure
                            </Label>
                          </div>

                          <div>
                            <Label className="text-slate-300">Notification Recipients</Label>
                            <Input
                              placeholder="admin@example.com"
                              value={settings.notifications.recipients.join(", ")}
                              onChange={(e) => setSettings(prev => ({ 
                                ...prev, 
                                notifications: { 
                                  ...prev.notifications, 
                                  recipients: e.target.value.split(",").map(r => r.trim())
                                }
                              }))}
                              className="bg-slate-700 border-slate-600"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end">
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
  )
}
