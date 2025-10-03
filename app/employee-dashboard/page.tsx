"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, TrendingUp, Download, ArrowLeft, User, MapPin, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { APP_NAME, COMPANY_NAME } from '@/lib/app-config'
import { useAuth } from '@/components/auth/AuthProvider'
import { attendanceService } from '@/lib/attendance'
import { useRouter } from 'next/navigation'

export default function EmployeeDashboardPage() {
  const { authState } = useAuth()
  const router = useRouter()
  const user = authState.user
  const [todayAttendance, setTodayAttendance] = useState<any>(null)
  const [weekStats, setWeekStats] = useState({
    present: 0,
    late: 0,
    absent: 0,
    total: 5
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      // Redirect to login if not authenticated
      router.push('/admin/login')
      return
    }
    loadDashboardData()
  }, [user, router])

  const loadDashboardData = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Get today's attendance
      const today = await attendanceService.getTodayAttendance(user.id)
      setTodayAttendance(today)

      // Get this week's stats
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      const endOfWeek = new Date()
      endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()))

      const stats = await attendanceService.getStats(user.id, startOfWeek, endOfWeek)
      if (stats) {
        setWeekStats({
          present: stats.totalPresent || 0,
          late: stats.totalLate || 0,
          absent: stats.totalAbsent || 0,
          total: 5 // Business days per week
        })
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAttendanceStatus = () => {
    if (!todayAttendance) return { text: 'Not Checked In', color: 'bg-gray-500', icon: XCircle }
    if (todayAttendance.clock_in && todayAttendance.clock_out) {
      return { text: 'Completed', color: 'bg-blue-500', icon: CheckCircle2 }
    }
    if (todayAttendance.clock_in) {
      return { text: 'Checked In', color: 'bg-green-500', icon: CheckCircle2 }
    }
    return { text: 'Not Checked In', color: 'bg-gray-500', icon: XCircle }
  }

  const status = getAttendanceStatus()
  const StatusIcon = status.icon

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-slate-300">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Employee Dashboard</h1>
                <p className="text-sm text-slate-400">{user?.name || 'Guest'}</p>
              </div>
            </div>
            <Link href="/face-checkin">
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Clock className="w-4 h-4 mr-2" />
                Check-in
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Today's Attendance Status */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                Today's Attendance
              </CardTitle>
              <CardDescription className="text-slate-400">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <StatusIcon className={`w-8 h-8 ${status.text === 'Completed' || status.text === 'Checked In' ? 'text-green-400' : 'text-gray-400'}`} />
                    <div>
                      <div className="text-sm text-slate-400">Status</div>
                      <Badge className={status.color}>{status.text}</Badge>
                    </div>
                  </div>
                  
                  {todayAttendance?.clock_in && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-400">Check-in:</span>
                        <span className="text-white font-medium">
                          {new Date(todayAttendance.clock_in).toLocaleTimeString('id-ID')}
                        </span>
                      </div>
                      
                      {todayAttendance.clock_out && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-400">Check-out:</span>
                          <span className="text-white font-medium">
                            {new Date(todayAttendance.clock_out).toLocaleTimeString('id-ID')}
                          </span>
                        </div>
                      )}
                      
                      {todayAttendance.clock_in_location && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-400">Location verified</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!todayAttendance?.clock_in && (
                    <div className="text-slate-400 text-sm">
                      You haven't checked in today yet.
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-center">
                  {!todayAttendance?.clock_in && (
                    <Link href="/face-checkin" className="w-full">
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" size="lg">
                        <Clock className="w-5 h-5 mr-2" />
                        Check In Now
                      </Button>
                    </Link>
                  )}
                  {todayAttendance?.clock_in && !todayAttendance?.clock_out && (
                    <Link href="/face-checkin" className="w-full">
                      <Button className="w-full" variant="outline" size="lg">
                        <Clock className="w-5 h-5 mr-2" />
                        Check Out
                      </Button>
                    </Link>
                  )}
                  {todayAttendance?.clock_in && todayAttendance?.clock_out && (
                    <div className="text-center">
                      <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-2" />
                      <p className="text-slate-300">All done for today!</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* This Week Statistics */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                This Week Summary
              </CardTitle>
              <CardDescription className="text-slate-400">
                Your attendance performance this week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-4 gap-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-emerald-400 mb-1">{weekStats.present}</div>
                  <div className="text-sm text-slate-400">Present</div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-400 mb-1">{weekStats.late}</div>
                  <div className="text-sm text-slate-400">Late</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-400 mb-1">{weekStats.absent}</div>
                  <div className="text-sm text-slate-400">Absent</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400 mb-1">
                    {weekStats.total > 0 ? Math.round((weekStats.present / weekStats.total) * 100) : 0}%
                  </div>
                  <div className="text-sm text-slate-400">Attendance Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/40 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-white text-lg">View Full History</CardTitle>
                <CardDescription>See all your attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-slate-600" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/40 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-white text-lg">Download Report</CardTitle>
                <CardDescription>Get your attendance report</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-slate-600" disabled>
                  <Download className="w-4 h-4 mr-2" />
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-slate-400 text-sm">
            <p>&copy; {new Date().getFullYear()} {COMPANY_NAME}. {APP_NAME}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
