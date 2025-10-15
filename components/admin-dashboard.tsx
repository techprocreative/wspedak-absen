"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Users, Clock, TrendingUp, UserCheck, UserX, AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useClientTime } from "@/hooks/use-client-time"
import { ApiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"

import { logger, logApiError, logApiRequest } from '@/lib/logger'
interface DashboardStats {
  total: number
  active: number
  byRole: {
    admin: number
    hr: number
    manager: number
    employee: number
  }
  byDepartment: Record<string, number>
  attendance: {
    today: number
    todayCheckIns: number
    todayCheckOuts: number
    todayLate: number
    todayPresent: number
  }
}

// Fallback mock data for chart (will be replaced with real data later)
const attendanceData: Array<{ date: string; present: number; absent: number; late: number }> = []

export function AdminDashboard() {
  const { currentTime, isClient } = useClientTime()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await ApiClient.getDashboardStats()
      setStats(response.data)
    } catch (err: any) {
      logger.error('Failed to fetch stats', err as Error)
      setError(err.message || 'Failed to fetch dashboard statistics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  // Calculate display stats
  const displayStats = stats ? {
    totalEmployees: stats.total,
    presentToday: stats.attendance.todayPresent,
    absentToday: stats.total - stats.attendance.todayCheckIns,
    lateToday: stats.attendance.todayLate,
    onTimeRate: stats.total > 0 
      ? ((stats.attendance.todayPresent / stats.total) * 100).toFixed(1)
      : '0',
  } : {
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    onTimeRate: '0',
  }

  // Convert department stats to array
  const departmentStats = stats 
    ? Object.entries(stats.byDepartment).map(([name, total]) => ({
        name,
        present: Math.floor(total * 0.85), // Estimate, will be improved with real data
        total,
        percentage: 85
      }))
    : []

  const recentAttendance: Array<{ id: number; name: string; department: string; time: string; status: string; type: string; avatar: string }> = []
  const alerts: Array<{ id: number; type: string; message: string; time: string }> = []

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">Real-time attendance statistics</p>
        </div>
        <Button 
          onClick={fetchStats} 
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">
          <p className="font-semibold">Failed to load dashboard data</p>
          <p className="text-sm mt-1">{error}</p>
          <Button onClick={fetchStats} variant="outline" size="sm" className="mt-2">
            Try Again
          </Button>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && !stats && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
        </div>
      )}

      {/* Stats Grid */}
      {!loading || stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Karyawan</CardTitle>
            <Users className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{displayStats.totalEmployees}</div>
            <p className="text-xs text-slate-400 flex items-center">
              <ArrowUpRight className="w-3 h-3 mr-1 text-green-400" />
              {displayStats.totalEmployees > 0 ? `${displayStats.totalEmployees} active employees` : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Hadir Hari Ini</CardTitle>
            <UserCheck className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{displayStats.presentToday}</div>
            <p className="text-xs text-slate-400">
              {displayStats.totalEmployees > 0 
                ? `${((displayStats.presentToday / displayStats.totalEmployees) * 100).toFixed(1)}% dari total`
                : 'No data'
              }
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Tidak Hadir</CardTitle>
            <UserX className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{displayStats.absentToday}</div>
            <p className="text-xs text-slate-400 flex items-center">
              <ArrowDownRight className="w-3 h-3 mr-1 text-red-400" />
              Termasuk {displayStats.lateToday} terlambat
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Tingkat Ketepatan</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{displayStats.onTimeRate}%</div>
            <p className="text-xs text-slate-400 flex items-center">
              <ArrowUpRight className="w-3 h-3 mr-1 text-green-400" />
              Real-time data
            </p>
          </CardContent>
        </Card>
        </div>
      ) : null}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Attendance Chart */}
        <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Tren Absensi 7 Hari Terakhir</CardTitle>
            <CardDescription className="text-slate-400">
              Grafik kehadiran karyawan dalam seminggu terakhir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" })
                  }
                />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#F9FAFB",
                  }}
                />
                <Line type="monotone" dataKey="present" stroke="#10B981" strokeWidth={2} name="Hadir" />
                <Line type="monotone" dataKey="absent" stroke="#EF4444" strokeWidth={2} name="Tidak Hadir" />
                <Line type="monotone" dataKey="late" stroke="#F59E0B" strokeWidth={2} name="Terlambat" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Notifikasi
            </CardTitle>
            <CardDescription className="text-slate-400">Peringatan dan informasi terbaru</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      alert.type === "warning"
                        ? "bg-yellow-400"
                        : alert.type === "info"
                          ? "bg-blue-400"
                          : "bg-green-400"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-white">{alert.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Attendance */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              Absensi Terbaru
            </CardTitle>
            <CardDescription className="text-slate-400">Aktivitas absensi hari ini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAttendance.map((attendance) => (
                <div key={attendance.id} className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg">
                  <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {attendance.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-white">{attendance.name}</p>
                      <Badge
                        className={
                          attendance.status === "masuk"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        }
                      >
                        {attendance.status === "masuk" ? "Masuk" : "Keluar"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-slate-400">
                        {attendance.department} • {attendance.time}
                      </p>
                      <p
                        className={`text-xs ${
                          attendance.type === "Tepat Waktu"
                            ? "text-green-400"
                            : attendance.type === "Terlambat"
                              ? "text-yellow-400"
                              : "text-orange-400"
                        }`}
                      >
                        {attendance.type}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Department Stats */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Kehadiran per Departemen</CardTitle>
            <CardDescription className="text-slate-400">Persentase kehadiran hari ini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departmentStats.map((dept) => (
                <div key={dept.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{dept.name}</span>
                    <span className="text-sm text-slate-400">
                      {dept.present}/{dept.total}
                    </span>
                  </div>
                  <Progress value={dept.percentage} className="h-2 bg-slate-700" />
                  <div className="text-right">
                    <span className="text-xs text-slate-400">{dept.percentage.toFixed(1)}%</span>
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
