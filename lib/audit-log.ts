import { secureStorage } from './secure-storage'
import { UserRole } from './auth'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// Audit log configuration
const AUDIT_LOG_KEY = 'audit_logs'
const MAX_LOG_ENTRIES = 10000
const LOG_RETENTION_DAYS = 365

// Audit event types
export type AuditEventType = 
  | 'user_login'
  | 'user_logout'
  | 'user_login_failed'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'password_changed'
  | 'password_reset'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'mfa_verification_failed'
  | 'permission_granted'
  | 'permission_denied'
  | 'role_assigned'
  | 'role_removed'
  | 'session_created'
  | 'session_terminated'
  | 'session_expired'
  | 'settings_updated'
  | 'security_settings_updated'
  | 'data_exported'
  | 'data_imported'
  | 'system_backup'
  | 'system_restore'
  | 'suspicious_activity'
  | 'security_breach'
  | 'admin_action'
  | 'api_access'
  | 'file_uploaded'
  | 'file_downloaded'
  | 'report_generated'
  | 'attendance_created'
  | 'attendance_updated'
  | 'attendance_deleted'
  | 'employee_created'
  | 'employee_updated'
  | 'employee_deleted'

// Audit log severity levels
export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical'

// Audit log entry interface
export interface AuditLogEntry {
  id: string
  timestamp: string
  eventType: AuditEventType
  severity: AuditSeverity
  userId?: string
  userRole?: UserRole
  userEmail?: string
  action: string
  description: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  resourceId?: string
  resourceType?: string
  success: boolean
  errorMessage?: string
  sessionId?: string
  location?: {
    country?: string
    city?: string
    timezone?: string
  }
  metadata?: Record<string, any>
}

// Audit log filter options
export interface AuditLogFilter {
  userId?: string
  eventType?: AuditEventType | AuditEventType[]
  severity?: AuditSeverity | AuditSeverity[]
  startDate?: Date
  endDate?: Date
  success?: boolean
  ipAddress?: string
  resourceType?: string
  sessionId?: string
  search?: string // Search in action and description
}

// Audit log statistics
export interface AuditLogStats {
  totalEvents: number
  eventsByType: Record<AuditEventType, number>
  eventsBySeverity: Record<AuditSeverity, number>
  eventsByUser: Array<{ userId: string; email: string; count: number }>
  eventsByDay: Array<{ date: string; count: number }>
  failedEvents: number
  suspiciousEvents: number
  criticalEvents: number
  topIPs: Array<{ ip: string; count: number }>
  averageEventsPerDay: number
}

// Audit log manager class
export class AuditLogManager {
  private static instance: AuditLogManager
  private logs: AuditLogEntry[]

  private constructor() {
    this.logs = this.loadLogs()
    this.cleanupOldLogs()
  }

  public static getInstance(): AuditLogManager {
    if (!AuditLogManager.instance) {
      AuditLogManager.instance = new AuditLogManager()
    }
    return AuditLogManager.instance
  }

  // Load logs from storage
  private loadLogs(): AuditLogEntry[] {
    try {
      return secureStorage.getItem<AuditLogEntry[]>(AUDIT_LOG_KEY) || []
    } catch (error) {
      logger.error('Error loading audit logs', error as Error)
      return []
    }
  }

  // Save logs to storage
  private saveLogs(): void {
    try {
      secureStorage.setItem(AUDIT_LOG_KEY, this.logs)
    } catch (error) {
      logger.error('Error saving audit logs', error as Error)
    }
  }

  // Generate unique log entry ID
  private generateLogId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Create audit log entry
  createLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const logEntry: AuditLogEntry = {
      ...entry,
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
    }

    this.logs.unshift(logEntry)

    // Maintain maximum log entries
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(0, MAX_LOG_ENTRIES)
    }

    this.saveLogs()

    // Log critical events to console for immediate visibility
    if (entry.severity === 'critical') {
      logger.error('CRITICAL AUDIT EVENT', logEntry as Error)
    }
  }

  // Log user authentication event
  logAuthEvent(
    eventType: 'user_login' | 'user_logout' | 'user_login_failed',
    userId?: string,
    userEmail?: string,
    userRole?: UserRole,
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string,
    success: boolean = true,
    errorMessage?: string,
    details?: Record<string, any>
  ): void {
    const severity: AuditSeverity = 
      eventType === 'user_login_failed' ? 'medium' : 
      eventType === 'user_login' ? 'low' : 'low'

    this.createLog({
      eventType,
      severity,
      userId,
      userRole,
      userEmail,
      action: eventType.replace('_', ' '),
      description: this.getAuthEventDescription(eventType, success, userEmail),
      details,
      ipAddress,
      userAgent,
      sessionId,
      success,
      errorMessage,
    })
  }

  // Get description for auth events
  private getAuthEventDescription(eventType: string, success: boolean, userEmail?: string): string {
    const email = userEmail || 'Unknown user'
    
    switch (eventType) {
      case 'user_login':
        return success ? `User ${email} logged in successfully` : `Failed login attempt for ${email}`
      case 'user_logout':
        return `User ${email} logged out`
      case 'user_login_failed':
        return `Failed login attempt for ${email}`
      default:
        return `Authentication event for ${email}`
    }
  }

  // Log security event
  logSecurityEvent(
    eventType: AuditEventType,
    action: string,
    description: string,
    userId?: string,
    userEmail?: string,
    userRole?: UserRole,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
    severity: AuditSeverity = 'medium'
  ): void {
    this.createLog({
      eventType,
      severity,
      userId,
      userRole,
      userEmail,
      action,
      description,
      details,
      ipAddress,
      userAgent,
      success: true,
    })
  }

  // Log admin action
  logAdminAction(
    userId: string,
    userEmail: string,
    userRole: UserRole,
    action: string,
    description: string,
    resourceType?: string,
    resourceId?: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true,
    errorMessage?: string
  ): void {
    this.createLog({
      eventType: 'admin_action',
      severity: 'high',
      userId,
      userRole,
      userEmail,
      action,
      description,
      details,
      ipAddress,
      userAgent,
      resourceType,
      resourceId,
      success,
      errorMessage,
    })
  }

  // Log data access event
  logDataAccess(
    eventType: 'data_exported' | 'data_imported' | 'file_downloaded' | 'file_uploaded' | 'report_generated',
    userId: string,
    userEmail: string,
    userRole: UserRole,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): void {
    const severity: AuditSeverity = 
      eventType === 'data_exported' || eventType === 'data_imported' ? 'high' : 'low'

    this.createLog({
      eventType,
      severity,
      userId,
      userRole,
      userEmail,
      action: eventType.replace('_', ' '),
      description: `${eventType.replace('_', ' ')} by ${userEmail}`,
      details,
      ipAddress,
      userAgent,
      resourceType,
      resourceId,
      success: true,
    })
  }

  // Log suspicious activity
  logSuspiciousActivity(
    action: string,
    description: string,
    userId?: string,
    userEmail?: string,
    userRole?: UserRole,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
    severity: AuditSeverity = 'high'
  ): void {
    this.createLog({
      eventType: 'suspicious_activity',
      severity,
      userId,
      userRole,
      userEmail,
      action,
      description,
      details,
      ipAddress,
      userAgent,
      success: false,
    })
  }

  // Get audit logs with filtering
  getLogs(filter?: AuditLogFilter, limit?: number, offset?: number): {
    logs: AuditLogEntry[]
    total: number
    hasMore: boolean
  } {
    let filteredLogs = [...this.logs]

    // Apply filters
    if (filter) {
      if (filter.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filter.userId)
      }

      if (filter.eventType) {
        const eventTypes = Array.isArray(filter.eventType) ? filter.eventType : [filter.eventType]
        filteredLogs = filteredLogs.filter(log => eventTypes.includes(log.eventType))
      }

      if (filter.severity) {
        const severities = Array.isArray(filter.severity) ? filter.severity : [filter.severity]
        filteredLogs = filteredLogs.filter(log => severities.includes(log.severity))
      }

      if (filter.startDate) {
        const startDate = filter.startDate.getTime()
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp).getTime() >= startDate)
      }

      if (filter.endDate) {
        const endDate = filter.endDate.getTime()
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp).getTime() <= endDate)
      }

      if (filter.success !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.success === filter.success)
      }

      if (filter.ipAddress) {
        filteredLogs = filteredLogs.filter(log => log.ipAddress === filter.ipAddress)
      }

      if (filter.resourceType) {
        filteredLogs = filteredLogs.filter(log => log.resourceType === filter.resourceType)
      }

      if (filter.sessionId) {
        filteredLogs = filteredLogs.filter(log => log.sessionId === filter.sessionId)
      }

      if (filter.search) {
        const searchLower = filter.search.toLowerCase()
        filteredLogs = filteredLogs.filter(log => 
          log.action.toLowerCase().includes(searchLower) ||
          log.description.toLowerCase().includes(searchLower)
        )
      }
    }

    const total = filteredLogs.length

    // Apply pagination
    if (offset) {
      filteredLogs = filteredLogs.slice(offset)
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(0, limit)
    }

    return {
      logs: filteredLogs,
      total,
      hasMore: (offset || 0) + (limit || 0) < total,
    }
  }

  // Get audit log statistics
  getStats(filter?: AuditLogFilter): AuditLogStats {
    const { logs } = this.getLogs(filter)
    
    const stats: AuditLogStats = {
      totalEvents: logs.length,
      eventsByType: {} as Record<AuditEventType, number>,
      eventsBySeverity: {} as Record<AuditSeverity, number>,
      eventsByUser: [],
      eventsByDay: [],
      failedEvents: 0,
      suspiciousEvents: 0,
      criticalEvents: 0,
      topIPs: [],
      averageEventsPerDay: 0,
    }

    // Count events by type
    logs.forEach(log => {
      stats.eventsByType[log.eventType] = (stats.eventsByType[log.eventType] || 0) + 1
      stats.eventsBySeverity[log.severity] = (stats.eventsBySeverity[log.severity] || 0) + 1

      if (!log.success) {
        stats.failedEvents++
      }

      if (log.eventType === 'suspicious_activity') {
        stats.suspiciousEvents++
      }

      if (log.severity === 'critical') {
        stats.criticalEvents++
      }
    })

    // Count events by user
    const userCounts = new Map<string, { email: string; count: number }>()
    logs.forEach(log => {
      if (log.userId && log.userEmail) {
        const existing = userCounts.get(log.userId)
        if (existing) {
          existing.count++
        } else {
          userCounts.set(log.userId, { email: log.userEmail, count: 1 })
        }
      }
    })
    stats.eventsByUser = Array.from(userCounts.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Count events by day
    const dayCounts = new Map<string, number>()
    logs.forEach(log => {
      const day = log.timestamp.split('T')[0]
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1)
    })
    stats.eventsByDay = Array.from(dayCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30) // Last 30 days

    // Count top IPs
    const ipCounts = new Map<string, number>()
    logs.forEach(log => {
      if (log.ipAddress) {
        ipCounts.set(log.ipAddress, (ipCounts.get(log.ipAddress) || 0) + 1)
      }
    })
    stats.topIPs = Array.from(ipCounts.entries())
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Calculate average events per day
    if (stats.eventsByDay.length > 0) {
      const totalDays = stats.eventsByDay.length
      const totalEvents = stats.eventsByDay.reduce((sum, day) => sum + day.count, 0)
      stats.averageEventsPerDay = Math.round(totalEvents / totalDays)
    }

    return stats
  }

  // Get log by ID
  getLogById(id: string): AuditLogEntry | null {
    return this.logs.find(log => log.id === id) || null
  }

  // Get logs for a specific user
  getUserLogs(userId: string, limit?: number): AuditLogEntry[] {
    const userLogs = this.logs.filter(log => log.userId === userId)
    return limit ? userLogs.slice(0, limit) : userLogs
  }

  // Get recent logs
  getRecentLogs(limit: number = 100): AuditLogEntry[] {
    return this.logs.slice(0, limit)
  }

  // Get critical events
  getCriticalEvents(limit?: number): AuditLogEntry[] {
    const criticalLogs = this.logs.filter(log => log.severity === 'critical')
    return limit ? criticalLogs.slice(0, limit) : criticalLogs
  }

  // Get failed login attempts
  getFailedLoginAttempts(hours: number = 24): AuditLogEntry[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.logs.filter(log => 
      log.eventType === 'user_login_failed' && 
      new Date(log.timestamp) > cutoffTime
    )
  }

  // Get suspicious activities
  getSuspiciousActivities(hours: number = 24): AuditLogEntry[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.logs.filter(log => 
      log.eventType === 'suspicious_activity' && 
      new Date(log.timestamp) > cutoffTime
    )
  }

  // Export logs to CSV
  exportToCSV(filter?: AuditLogFilter): string {
    const { logs } = this.getLogs(filter)
    
    const headers = [
      'ID', 'Timestamp', 'Event Type', 'Severity', 'User ID', 'User Email', 
      'User Role', 'Action', 'Description', 'IP Address', 'User Agent', 
      'Resource Type', 'Resource ID', 'Success', 'Error Message'
    ]

    const csvRows = [headers.join(',')]

    logs.forEach(log => {
      const row = [
        log.id,
        log.timestamp,
        log.eventType,
        log.severity,
        log.userId || '',
        log.userEmail || '',
        log.userRole || '',
        `"${log.action.replace(/"/g, '""')}"`,
        `"${log.description.replace(/"/g, '""')}"`,
        log.ipAddress || '',
        `"${(log.userAgent || '').replace(/"/g, '""')}"`,
        log.resourceType || '',
        log.resourceId || '',
        log.success,
        `"${(log.errorMessage || '').replace(/"/g, '""')}"`
      ]
      csvRows.push(row.join(','))
    })

    return csvRows.join('\n')
  }

  // Export logs to JSON
  exportToJSON(filter?: AuditLogFilter): string {
    const { logs } = this.getLogs(filter)
    return JSON.stringify(logs, null, 2)
  }

  // Clean up old logs
  cleanupOldLogs(): number {
    const cutoffDate = new Date(Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    const initialLength = this.logs.length
    
    this.logs = this.logs.filter(log => new Date(log.timestamp) > cutoffDate)
    
    const removed = initialLength - this.logs.length
    if (removed > 0) {
      this.saveLogs()
    }

    return removed
  }

  // Clear all logs (admin only)
  clearAllLogs(): void {
    this.logs = []
    this.saveLogs()
  }

  // Get log retention settings
  getRetentionSettings(): { maxEntries: number; retentionDays: number } {
    return {
      maxEntries: MAX_LOG_ENTRIES,
      retentionDays: LOG_RETENTION_DAYS,
    }
  }
}

// Export singleton instance
export const auditLogManager = AuditLogManager.getInstance()

// Export convenience functions
export const logAuthEvent = (
  eventType: 'user_login' | 'user_logout' | 'user_login_failed',
  userId?: string,
  userEmail?: string,
  userRole?: UserRole,
  ipAddress?: string,
  userAgent?: string,
  sessionId?: string,
  success?: boolean,
  errorMessage?: string,
  details?: Record<string, any>
) => auditLogManager.logAuthEvent(eventType, userId, userEmail, userRole, ipAddress, userAgent, sessionId, success, errorMessage, details)

export const logSecurityEvent = (
  eventType: AuditEventType,
  action: string,
  description: string,
  userId?: string,
  userEmail?: string,
  userRole?: UserRole,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string,
  severity?: AuditSeverity
) => auditLogManager.logSecurityEvent(eventType, action, description, userId, userEmail, userRole, details, ipAddress, userAgent, severity)

export const logAdminAction = (
  userId: string,
  userEmail: string,
  userRole: UserRole,
  action: string,
  description: string,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string,
  success?: boolean,
  errorMessage?: string
) => auditLogManager.logAdminAction(userId, userEmail, userRole, action, description, resourceType, resourceId, details, ipAddress, userAgent, success, errorMessage)

export const logSuspiciousActivity = (
  action: string,
  description: string,
  userId?: string,
  userEmail?: string,
  userRole?: UserRole,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string,
  severity?: AuditSeverity
) => auditLogManager.logSuspiciousActivity(action, description, userId, userEmail, userRole, details, ipAddress, userAgent, severity)