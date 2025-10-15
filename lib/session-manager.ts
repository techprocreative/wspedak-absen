import { secureStorage, setSecureSessionData, getSecureSessionData } from './secure-storage'
import { AuthSession } from './auth'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// Session management configuration
const SESSION_STORAGE_KEY = 'enhanced_sessions'
const SESSION_ACTIVITY_KEY = 'session_activity'
const MAX_CONCURRENT_SESSIONS = 3
const DEFAULT_SESSION_TIMEOUT = 480 // 8 hours in minutes
const SESSION_REFRESH_THRESHOLD = 30 // Refresh session if less than 30 minutes remaining

// Enhanced session interface
export interface EnhancedSession {
  sessionId: string
  userId: string
  userEmail: string
  userRole: string
  createdAt: string
  lastActivityAt: string
  expiresAt: string
  isActive: boolean
  deviceInfo: {
    userAgent: string
    ip: string
    deviceName?: string
    platform?: string
  }
  location?: {
    country?: string
    city?: string
    timezone?: string
  }
  securityFlags: {
    requiresMFA: boolean
    mfaVerified: boolean
    trustedDevice: boolean
    suspiciousActivity: boolean
  }
}

// Session activity interface
export interface SessionActivity {
  sessionId: string
  userId: string
  timestamp: string
  action: string
  details?: any
  ip: string
  userAgent: string
  success: boolean
}

// Session statistics interface
export interface SessionStats {
  totalSessions: number
  activeSessions: number
  expiredSessions: number
  suspiciousSessions: number
  averageSessionDuration: number
  lastLoginTime?: string
  uniqueDevices: number
  uniqueLocations: number
}

// Session manager class
export class SessionManager {
  private static instance: SessionManager
  private sessionTimeoutMinutes: number
  private maxConcurrentSessions: number

  private constructor() {
    this.sessionTimeoutMinutes = DEFAULT_SESSION_TIMEOUT
    this.maxConcurrentSessions = MAX_CONCURRENT_SESSIONS
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Create new enhanced session
  createSession(
    authSession: AuthSession,
    deviceInfo: EnhancedSession['deviceInfo'],
    location?: EnhancedSession['location']
  ): EnhancedSession {
    if (!authSession.user || !authSession.isAuthenticated) {
      throw new Error('Invalid authentication session')
    }

    const sessionId = this.generateSessionId()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.sessionTimeoutMinutes * 60 * 1000)

    const session: EnhancedSession = {
      sessionId,
      userId: authSession.user.id,
      userEmail: authSession.user.email || '',
      userRole: authSession.user.role,
      createdAt: now.toISOString(),
      lastActivityAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isActive: true,
      deviceInfo,
      location,
      securityFlags: {
        requiresMFA: false, // Will be updated based on user settings
        mfaVerified: false,
        trustedDevice: false,
        suspiciousActivity: false,
      },
    }

    // Store session
    this.storeSession(session)

    // Log session creation
    this.logActivity(sessionId, session.userId, 'session_created', {
      deviceName: deviceInfo.deviceName,
      platform: deviceInfo.platform,
    }, deviceInfo.ip, deviceInfo.userAgent, true)

    return session
  }

  // Store session in secure storage
  private storeSession(session: EnhancedSession): void {
    try {
      const sessions = this.getAllSessions()
      
      // Check concurrent session limit
      const userActiveSessions = sessions.filter(s => 
        s.userId === session.userId && s.isActive && !this.isSessionExpired(s)
      )
      
      if (userActiveSessions.length >= this.maxConcurrentSessions) {
        // Remove oldest session
        const oldestSession = userActiveSessions
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]
        
        if (oldestSession) {
          this.terminateSession(oldestSession.sessionId, 'concurrent_session_limit')
        }
      }
      
      // Add new session
      sessions.push(session)
      secureStorage.setItem(SESSION_STORAGE_KEY, sessions)
    } catch (error) {
      logger.error('Error storing session', error as Error)
      throw new Error('Failed to store session')
    }
  }

  // Get all sessions
  getAllSessions(): EnhancedSession[] {
    try {
      return secureStorage.getItem<EnhancedSession[]>(SESSION_STORAGE_KEY) || []
    } catch (error) {
      logger.error('Error retrieving sessions', error as Error)
      return []
    }
  }

  // Get active sessions for user
  getActiveSessionsForUser(userId: string): EnhancedSession[] {
    const sessions = this.getAllSessions()
    const now = new Date()
    
    return sessions.filter(session => 
      session.userId === userId && 
      session.isActive && 
      new Date(session.expiresAt) > now
    )
  }

  // Get session by ID
  getSessionById(sessionId: string): EnhancedSession | null {
    const sessions = this.getAllSessions()
    return sessions.find(s => s.sessionId === sessionId) || null
  }

  // Check if session is expired
  private isSessionExpired(session: EnhancedSession): boolean {
    return new Date(session.expiresAt) < new Date()
  }

  // Update session activity
  updateSessionActivity(sessionId: string, action: string, details?: any, ip?: string, userAgent?: string): void {
    try {
      const sessions = this.getAllSessions()
      const session = sessions.find(s => s.sessionId === sessionId)
      
      if (!session) {
        return
      }
      
      // Update last activity
      session.lastActivityAt = new Date().toISOString()
      
      // Extend session if not expired
      if (!this.isSessionExpired(session)) {
        const newExpiresAt = new Date(Date.now() + this.sessionTimeoutMinutes * 60 * 1000)
        session.expiresAt = newExpiresAt.toISOString()
      }
      
      // Save updated sessions
      secureStorage.setItem(SESSION_STORAGE_KEY, sessions)
      
      // Log activity
      this.logActivity(sessionId, session.userId, action, details, ip || session.deviceInfo.ip, userAgent || session.deviceInfo.userAgent, true)
    } catch (error) {
      logger.error('Error updating session activity', error as Error)
    }
  }

  // Terminate session
  terminateSession(sessionId: string, reason?: string): boolean {
    try {
      const sessions = this.getAllSessions()
      const session = sessions.find(s => s.sessionId === sessionId)
      
      if (!session) {
        return false
      }
      
      session.isActive = false
      
      // Log session termination
      this.logActivity(sessionId, session.userId, 'session_terminated', { reason }, session.deviceInfo.ip, session.deviceInfo.userAgent, true)
      
      // Save updated sessions
      secureStorage.setItem(SESSION_STORAGE_KEY, sessions)
      
      return true
    } catch (error) {
      logger.error('Error terminating session', error as Error)
      return false
    }
  }

  // Terminate all sessions for user
  terminateAllSessionsForUser(userId: string, reason?: string): number {
    try {
      const sessions = this.getAllSessions()
      const userSessions = sessions.filter(s => s.userId === userId && s.isActive)
      
      userSessions.forEach(session => {
        session.isActive = false
        this.logActivity(session.sessionId, session.userId, 'session_terminated', { 
          reason: reason || 'all_sessions_terminated' 
        }, session.deviceInfo.ip, session.deviceInfo.userAgent, true)
      })
      
      secureStorage.setItem(SESSION_STORAGE_KEY, sessions)
      
      return userSessions.length
    } catch (error) {
      logger.error('Error terminating all sessions for user', error as Error)
      return 0
    }
  }

  // Clean up expired sessions
  cleanupExpiredSessions(): number {
    try {
      const sessions = this.getAllSessions()
      const now = new Date()
      const expiredSessions = sessions.filter(session => 
        this.isSessionExpired(session) && session.isActive
      )
      
      expiredSessions.forEach(session => {
        session.isActive = false
        this.logActivity(session.sessionId, session.userId, 'session_expired', {}, session.deviceInfo.ip, session.deviceInfo.userAgent, true)
      })
      
      secureStorage.setItem(SESSION_STORAGE_KEY, sessions)
      
      return expiredSessions.length
    } catch (error) {
      logger.error('Error cleaning up expired sessions', error as Error)
      return 0
    }
  }

  // Log session activity
  private logActivity(
    sessionId: string, 
    userId: string, 
    action: string, 
    details?: any, 
    ip?: string, 
    userAgent?: string, 
    success: boolean = true
  ): void {
    try {
      const activities = this.getSessionActivities()
      
      const activity: SessionActivity = {
        sessionId,
        userId,
        timestamp: new Date().toISOString(),
        action,
        details,
        ip: ip || 'unknown',
        userAgent: userAgent || 'unknown',
        success,
      }
      
      activities.push(activity)
      
      // Keep only last 1000 activities per user
      const userActivities = activities.filter(a => a.userId === userId)
      if (userActivities.length > 1000) {
        const toRemove = userActivities.slice(0, userActivities.length - 1000)
        toRemove.forEach(activity => {
          const index = activities.findIndex(a => a.timestamp === activity.timestamp)
          if (index !== -1) {
            activities.splice(index, 1)
          }
        })
      }
      
      secureStorage.setItem(SESSION_ACTIVITY_KEY, activities)
    } catch (error) {
      logger.error('Error logging session activity', error as Error)
    }
  }

  // Get session activities
  getSessionActivities(): SessionActivity[] {
    try {
      return secureStorage.getItem<SessionActivity[]>(SESSION_ACTIVITY_KEY) || []
    } catch (error) {
      logger.error('Error retrieving session activities', error as Error)
      return []
    }
  }

  // Get session activities for user
  getSessionActivitiesForUser(userId: string, limit?: number): SessionActivity[] {
    try {
      const activities = this.getSessionActivities()
      const userActivities = activities
        .filter(a => a.userId === userId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      
      return limit ? userActivities.slice(0, limit) : userActivities
    } catch (error) {
      logger.error('Error retrieving session activities for user', error as Error)
      return []
    }
  }

  // Get session statistics
  getSessionStats(userId?: string): SessionStats {
    try {
      const sessions = this.getAllSessions()
      const activities = this.getSessionActivities()
      
      let filteredSessions = sessions
      let filteredActivities = activities
      
      if (userId) {
        filteredSessions = sessions.filter(s => s.userId === userId)
        filteredActivities = activities.filter(a => a.userId === userId)
      }
      
      const activeSessions = filteredSessions.filter(s => s.isActive && !this.isSessionExpired(s))
      const expiredSessions = filteredSessions.filter(s => this.isSessionExpired(s))
      const suspiciousSessions = filteredSessions.filter(s => s.securityFlags.suspiciousActivity)
      
      // Calculate average session duration
      const completedSessions = filteredSessions.filter(s => !s.isActive)
      const totalDuration = completedSessions.reduce((sum, session) => {
        const duration = new Date(session.lastActivityAt).getTime() - new Date(session.createdAt).getTime()
        return sum + duration
      }, 0)
      const averageDuration = completedSessions.length > 0 ? totalDuration / completedSessions.length : 0
      
      // Count unique devices and locations
      const uniqueDevices = new Set(filteredSessions.map(s => s.deviceInfo.userAgent)).size
      const uniqueLocations = new Set(filteredSessions.map(s => s.location?.city || s.deviceInfo.ip)).size
      
      // Get last login time
      const lastLoginActivity = filteredActivities
        .filter(a => a.action === 'session_created')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
      
      return {
        totalSessions: filteredSessions.length,
        activeSessions: activeSessions.length,
        expiredSessions: expiredSessions.length,
        suspiciousSessions: suspiciousSessions.length,
        averageSessionDuration: averageDuration,
        lastLoginTime: lastLoginActivity?.timestamp,
        uniqueDevices,
        uniqueLocations,
      }
    } catch (error) {
      logger.error('Error getting session statistics', error as Error)
      return {
        totalSessions: 0,
        activeSessions: 0,
        expiredSessions: 0,
        suspiciousSessions: 0,
        averageSessionDuration: 0,
        uniqueDevices: 0,
        uniqueLocations: 0,
      }
    }
  }

  // Detect suspicious activity
  detectSuspiciousActivity(userId: string): boolean {
    try {
      const activities = this.getSessionActivitiesForUser(userId, 50)
      const sessions = this.getActiveSessionsForUser(userId)
      
      // Check for multiple failed login attempts
      const failedLogins = activities.filter(a => 
        a.action === 'login_attempt' && !a.success && 
        new Date(a.timestamp).getTime() > Date.now() - 60 * 60 * 1000 // Last hour
      )
      
      if (failedLogins.length >= 5) {
        return true
      }
      
      // Check for sessions from multiple locations in short time
      const recentSessions = sessions.filter(s => 
        new Date(s.createdAt).getTime() > Date.now() - 30 * 60 * 1000 // Last 30 minutes
      )
      
      const uniqueLocations = new Set(recentSessions.map(s => s.location?.city || s.deviceInfo.ip)).size
      if (uniqueLocations > 2) {
        return true
      }
      
      // Check for unusual device usage
      const uniqueDevices = new Set(recentSessions.map(s => s.deviceInfo.userAgent)).size
      if (uniqueDevices > 3) {
        return true
      }
      
      return false
    } catch (error) {
      logger.error('Error detecting suspicious activity', error as Error)
      return false
    }
  }

  // Update security flags for session
  updateSessionSecurityFlags(sessionId: string, flags: Partial<EnhancedSession['securityFlags']>): boolean {
    try {
      const sessions = this.getAllSessions()
      const session = sessions.find(s => s.sessionId === sessionId)
      
      if (!session) {
        return false
      }
      
      session.securityFlags = { ...session.securityFlags, ...flags }
      secureStorage.setItem(SESSION_STORAGE_KEY, sessions)
      
      return true
    } catch (error) {
      logger.error('Error updating session security flags', error as Error)
      return false
    }
  }

  // Set session timeout
  setSessionTimeout(minutes: number): void {
    this.sessionTimeoutMinutes = minutes
  }

  // Set max concurrent sessions
  setMaxConcurrentSessions(max: number): void {
    this.maxConcurrentSessions = max
  }

  // Get current session timeout
  getSessionTimeout(): number {
    return this.sessionTimeoutMinutes
  }

  // Get max concurrent sessions
  getMaxConcurrentSessions(): number {
    return this.maxConcurrentSessions
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance()

// Export convenience functions
export const createSession = (authSession: AuthSession, deviceInfo: EnhancedSession['deviceInfo'], location?: EnhancedSession['location']) =>
  sessionManager.createSession(authSession, deviceInfo, location)

export const getSessionById = (sessionId: string) =>
  sessionManager.getSessionById(sessionId)

export const updateSessionActivity = (sessionId: string, action: string, details?: any, ip?: string, userAgent?: string) =>
  sessionManager.updateSessionActivity(sessionId, action, details, ip, userAgent)

export const terminateSession = (sessionId: string, reason?: string) =>
  sessionManager.terminateSession(sessionId, reason)

export const terminateAllSessionsForUser = (userId: string, reason?: string) =>
  sessionManager.terminateAllSessionsForUser(userId, reason)

export const getActiveSessionsForUser = (userId: string) =>
  sessionManager.getActiveSessionsForUser(userId)

export const getSessionStats = (userId?: string) =>
  sessionManager.getSessionStats(userId)

export const detectSuspiciousActivity = (userId: string) =>
  sessionManager.detectSuspiciousActivity(userId)

export const cleanupExpiredSessions = () =>
  sessionManager.cleanupExpiredSessions()