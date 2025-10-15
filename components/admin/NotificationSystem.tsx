"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { logger, logApiError, logApiRequest } from '@/lib/logger'
import {
  Bell, 
  X, 
  Check, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  AlertTriangle,
  UserCheck,
  UserX,
  Calendar,
  Clock,
  Settings,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"

// Define notification types
export type NotificationType = 
  | "info" 
  | "success" 
  | "warning" 
  | "error"
  | "user_check_in"
  | "user_check_out"
  | "user_late"
  | "user_absent"
  | "system"

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  actionText?: string
  userId?: string
  userName?: string
}

interface NotificationSystemProps {
  className?: string
  maxNotifications?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

// Mock notifications for demonstration
const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "user_check_in",
    title: "Check In Baru",
    message: "John Doe telah check in pada pukul 08:15",
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    read: false,
    userId: "user1",
    userName: "John Doe",
    actionUrl: "/admin/attendance",
    actionText: "Lihat Detail"
  },
  {
    id: "2",
    type: "user_late",
    title: "Karyawan Terlambat",
    message: "Jane Smith terlambat 20 menit hari ini",
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    read: false,
    userId: "user2",
    userName: "Jane Smith",
    actionUrl: "/admin/attendance?status=late",
    actionText: "Lihat Karyawan Terlambat"
  },
  {
    id: "3",
    type: "info",
    title: "Sistem Pemeliharaan",
    message: "Sistem akan melakukan pemeliharaan pada pukul 22:00 WIB",
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    read: true,
    actionUrl: "/admin/settings",
    actionText: "Pengaturan"
  },
  {
    id: "4",
    type: "success",
    title: "Backup Selesai",
    message: "Backup data harian telah selesai dengan sukses",
    timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    read: true
  },
  {
    id: "5",
    type: "user_absent",
    title: "Karyawan Tidak Hadir",
    message: "3 karyawan tidak hadir hari ini tanpa keterangan",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    read: false,
    actionUrl: "/admin/attendance?status=absent",
    actionText: "Lihat Detail"
  }
]

export function NotificationSystem({ 
  className, 
  maxNotifications = 10,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      
      // In a real implementation, you would fetch from your API
      // const response = await fetch("/api/admin/notifications")
      // const data = await response.json()
      
      // For now, use mock data
      await new Promise(resolve => setTimeout(resolve, 500))
      setNotifications(mockNotifications.slice(0, maxNotifications))
    } catch (error) {
      logger.error('Error fetching notifications', error as Error)
    } finally {
      setLoading(false)
    }
  }, [maxNotifications])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // In a real implementation, you would call your API
      // await fetch(`/api/admin/notifications/${notificationId}`, {
      //   method: "PATCH",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ read: true })
      // })
      
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      )
    } catch (error) {
      logger.error('Error marking notification as read', error as Error)
    }
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      // In a real implementation, you would call your API
      // await fetch("/api/admin/notifications/mark-all-read", {
      //   method: "POST"
      // })
      
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      )
    } catch (error) {
      logger.error('Error marking all notifications as read', error as Error)
    }
  }, [])

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      // In a real implementation, you would call your API
      // await fetch(`/api/admin/notifications/${notificationId}`, {
      //   method: "DELETE"
      // })
      
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      )
    } catch (error) {
      logger.error('Error deleting notification', error as Error)
    }
  }, [])

  // Calculate unread count
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length)
  }, [notifications])

  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Auto-refresh notifications
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(fetchNotifications, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchNotifications])

  // Get icon for notification type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "info":
        return <Info className="h-4 w-4 text-blue-400" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-400" />
      case "user_check_in":
        return <UserCheck className="h-4 w-4 text-green-400" />
      case "user_check_out":
        return <UserX className="h-4 w-4 text-blue-400" />
      case "user_late":
        return <Clock className="h-4 w-4 text-yellow-400" />
      case "user_absent":
        return <UserX className="h-4 w-4 text-red-400" />
      case "system":
        return <Settings className="h-4 w-4 text-slate-400" />
      default:
        return <Bell className="h-4 w-4 text-slate-400" />
    }
  }

  // Get background color for notification type
  const getNotificationBg = (type: NotificationType) => {
    switch (type) {
      case "info":
        return "bg-blue-500/10 border-blue-500/20"
      case "success":
        return "bg-green-500/10 border-green-500/20"
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/20"
      case "error":
        return "bg-red-500/10 border-red-500/20"
      case "user_check_in":
        return "bg-green-500/10 border-green-500/20"
      case "user_check_out":
        return "bg-blue-500/10 border-blue-500/20"
      case "user_late":
        return "bg-yellow-500/10 border-yellow-500/20"
      case "user_absent":
        return "bg-red-500/10 border-red-500/20"
      case "system":
        return "bg-slate-500/10 border-slate-500/20"
      default:
        return "bg-slate-500/10 border-slate-500/20"
    }
  }

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return "Baru saja"
    if (diffMins < 60) return `${diffMins} menit yang lalu`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} jam yang lalu`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} hari yang lalu`
  }

  return (
    <div className={cn("relative", className)}>
      {/* Notification Bell Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-slate-300 hover:text-white hover:bg-slate-700"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-5 h-5 flex items-center justify-center p-0">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-50">
          <Card className="bg-transparent border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-white text-lg">Notifikasi</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchNotifications}
                  disabled={loading}
                  className="text-slate-400 hover:text-white"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-slate-400 hover:text-white"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Tandai Semua
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Tidak ada notifikasi</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="p-2 space-y-2">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "p-3 rounded-md border transition-colors",
                          getNotificationBg(notification.type),
                          notification.read ? "opacity-70" : ""
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-slate-300 mt-1">
                                  {notification.message}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-xs text-slate-400">
                                    {formatTimestamp(notification.timestamp)}
                                  </p>
                                  <div className="flex items-center gap-1">
                                    {!notification.read && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => markAsRead(notification.id)}
                                        className="h-6 px-2 text-xs text-slate-400 hover:text-white"
                                      >
                                        <Check className="h-3 w-3 mr-1" />
                                        Baca
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteNotification(notification.id)}
                                      className="h-6 px-2 text-xs text-slate-400 hover:text-red-400"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                {notification.actionUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 mt-2"
                                  >
                                    <a href={notification.actionUrl}>
                                      {notification.actionText || "Lihat Detail"}
                                    </a>
                                  </Button>
                                )}
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// Hook to use notifications in components
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Add a new notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false
    }
    
    setNotifications(prev => [newNotification, ...prev])
  }, [])

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    notifications,
    addNotification,
    clearNotifications
  }
}