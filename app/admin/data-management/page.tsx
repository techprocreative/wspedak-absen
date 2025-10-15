"use client"

export const dynamic = 'force-dynamic'

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { logger, logApiError, logApiRequest } from '@/lib/logger'
// Layout is provided by app/admin/layout.tsx
import {
  Database,
  Upload,
  Download,
  DatabaseBackup,
  Archive,
  BarChart3,
  FileText,
  Settings,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Calendar,
  Shield,
  Activity,
  RefreshCw,
  Eye,
  Filter,
  ChevronRight,
  FolderOpen,
  FileSpreadsheet,
  FileJson,
  FileArchive,
  Zap
} from "lucide-react"

// Define interfaces for data management stats
interface DataManagementStats {
  totalRecords: number
  lastBackup: string
  nextBackup: string
  storageUsed: number
  storageLimit: number
  recentImports: number
  recentExports: number
  archivedRecords: number
  systemHealth: "healthy" | "warning" | "critical"
}

interface RecentActivity {
  id: string
  type: "import" | "export" | "backup" | "archive" | "cleanup"
  description: string
  status: "success" | "pending" | "failed"
  timestamp: string
  user?: string
  recordsAffected?: number
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ElementType
  href: string
  badge?: string
  color: string
}

export default function DataManagementPage() {
  const router = useRouter()
  
  // State management
  const [stats, setStats] = useState<DataManagementStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  // Fetch data management stats
  const fetchStats = async () => {
    try {
      setLoading(true)
      
      // Fetch real data from API
      const { ApiClient } = await import('@/lib/api-client')
      
      // Get stats
      const statsResponse = await ApiClient.getDataManagementStats()
      if (statsResponse.success) {
        setStats(statsResponse.data)
      }
      
      // Get recent activity
      const activityResponse = await ApiClient.getDataManagementActivity()
      if (activityResponse.success) {
        setRecentActivity(activityResponse.data)
      }
    } catch (error) {
      logger.error('Error fetching data management stats', error as Error)
    } finally {
      setLoading(false)
    }
  }

  // Quick actions for data management
  const quickActions: QuickAction[] = [
    {
      id: "import",
      title: "Data Import",
      description: "Import data from CSV, Excel, or JSON files",
      icon: Upload,
      href: "/admin/data-management/import",
      badge: "New",
      color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    },
    {
      id: "export",
      title: "Data Export",
      description: "Export data in various formats",
      icon: Download,
      href: "/admin/data-management/export",
      color: "bg-blue-500/20 text-blue-400 border-blue-500/30"
    },
    {
      id: "backup",
      title: "Backup & Restore",
      description: "Manage database backups and restoration",
      icon: DatabaseBackup,
      href: "/admin/data-management/backup",
      color: "bg-purple-500/20 text-purple-400 border-purple-500/30"
    },
    {
      id: "archive",
      title: "Data Archival",
      description: "Archive and manage old records",
      icon: Archive,
      href: "/admin/data-management/archive",
      color: "bg-orange-500/20 text-orange-400 border-orange-500/30"
    },
    {
      id: "analytics",
      title: "Analytics Dashboard",
      description: "View advanced analytics and insights",
      icon: BarChart3,
      href: "/admin/analytics",
      badge: "Advanced",
      color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
    },
    {
      id: "cleanup",
      title: "Data Cleanup",
      description: "Clean up duplicate and invalid data",
      icon: Zap,
      href: "/admin/data-management/cleanup",
      color: "bg-red-500/20 text-red-400 border-red-500/30"
    }
  ]

  // Get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "import":
        return <Upload className="w-4 h-4" />
      case "export":
        return <Download className="w-4 h-4" />
      case "backup":
        return <DatabaseBackup className="w-4 h-4" />
      case "archive":
        return <Archive className="w-4 h-4" />
      case "cleanup":
        return <Zap className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  // Get activity color
  const getActivityColor = (type: string) => {
    switch (type) {
      case "import":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      case "export":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "backup":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case "archive":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case "cleanup":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-400" />
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-slate-400" />
    }
  }

  // Get system health color
  const getHealthColor = (health: string) => {
    switch (health) {
      case "healthy":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "warning":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="space-y-6">
      <div>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Data Management</h1>
              <p className="text-slate-400">Comprehensive data handling and management tools</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStats}
                disabled={loading}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Total Records</CardTitle>
                  <Database className="h-4 w-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.totalRecords.toLocaleString()}</div>
                  <p className="text-xs text-slate-400 mt-1">
                    {stats.archivedRecords} archived
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Last Backup</CardTitle>
                  <DatabaseBackup className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {new Date(stats.lastBackup).toLocaleDateString()}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Next: {new Date(stats.nextBackup).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Storage Used</CardTitle>
                  <Archive className="h-4 w-4 text-orange-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.storageUsed}GB</div>
                  <p className="text-xs text-slate-400 mt-1">
                    of {stats.storageLimit}GB ({((stats.storageUsed / stats.storageLimit) * 100).toFixed(1)}%)
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
                    <Badge className={getHealthColor(stats.systemHealth)}>
                      {stats.systemHealth.charAt(0).toUpperCase() + stats.systemHealth.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    All systems operational
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action) => (
              <Card key={action.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors cursor-pointer group">
                <Link href={action.href}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${action.color}`}>
                        <action.icon className="w-6 h-6" />
                      </div>
                      {action.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {action.badge}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors">
                      {action.title}
                    </CardTitle>
                    <p className="text-slate-400 text-sm">{action.description}</p>
                    <div className="flex items-center gap-1 mt-3 text-emerald-400 text-sm">
                      <span>Manage</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>

          {/* Recent Activity */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-white">{activity.description}</p>
                        {getStatusIcon(activity.status)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-slate-400">
                          {activity.user && `${activity.user} • `}
                          {new Date(activity.timestamp).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {activity.recordsAffected && (
                          <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                            {activity.recordsAffected} records
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  )
}
