/**
 * API Client Utility
 * Centralized API calls with authentication
 */

import { getSecureItem } from './secure-storage'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
export class ApiClient {
  private static getToken(): string | null {
    if (typeof window === 'undefined') return null
    
    // Try to get token from auth session (secure storage)
    try {
      const authSession = getSecureItem<any>('auth_session')
      if (authSession?.session?.access_token) {
        return authSession.session.access_token
      }
    } catch (error) {
      logger.error('Error getting auth token', error as Error)
    }

    // Fallback to localStorage (legacy)
    return localStorage.getItem('session-token')
  }

  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken()
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (!token) {
      logger.warn('No authentication token found. User may need to login.')
    } else {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers,
        credentials: 'include', // Include cookies
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ 
          error: response.status === 401 
            ? 'Unauthorized - No authentication token provided' 
            : 'Request failed' 
        }))
        throw new Error(error.error || error.message || `HTTP ${response.status}`)
      }

      return response.json()
    } catch (error) {
      logger.error('API request failed for ${endpoint}', error as Error)
      throw error
    }
  }

  // Dashboard API
  static async getDashboardStats() {
    return this.request<{
      success: boolean
      data: {
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
    }>('/api/admin/dashboard/stats')
  }

  // Employee API
  static async getEmployees(params?: {
    role?: string
    department?: string
    search?: string
    page?: number
    limit?: number
  }) {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) query.append(key, String(value))
      })
    }
    
    return this.request<any>(`/api/admin/employees?${query}`)
  }

  static async createEmployee(data: any) {
    return this.request<any>('/api/admin/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  static async updateEmployee(id: string, data: any) {
    return this.request<any>(`/api/admin/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  static async deleteEmployee(id: string) {
    return this.request<any>(`/api/admin/employees/${id}`, {
      method: 'DELETE',
    })
  }

  // Attendance API
  static async getAttendance(params?: {
    userId?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  }) {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) query.append(key, String(value))
      })
    }
    
    return this.request<any>(`/api/admin/attendance?${query}`)
  }

  // Face Recognition API
  static async getFaceEmbeddings(userId: string) {
    return this.request<any>(`/api/admin/face/embeddings?userId=${userId}`)
  }

  // Employee face enrollment (user can enroll their own face)
  static async enrollFace(data: {
    userId: string
    descriptor: number[]
    quality?: number
    metadata?: any
  }) {
    return this.request<any>('/api/employee/face/enroll', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Admin face enrollment (admin can enroll any user's face)
  static async enrollFaceAdmin(data: {
    userId: string
    descriptor: number[]
    quality?: number
    metadata?: any
  }) {
    return this.request<any>('/api/admin/face/embeddings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  static async getUserFaceEnrollments(userId: string) {
    return this.request<any>(`/api/employee/face/enroll?userId=${userId}`)
  }

  static async deleteFaceEmbedding(id: string, userId: string) {
    return this.request<any>(`/api/employee/face/enroll?id=${id}&userId=${userId}`, {
      method: 'DELETE',
    })
  }

  static async deleteFaceEmbeddingAdmin(id: string) {
    return this.request<any>(`/api/admin/face/embeddings?id=${id}`, {
      method: 'DELETE',
    })
  }

  static async faceCheckin(data: {
    descriptor: number[]
    timestamp?: string
    location?: any
    type?: string
  }) {
    return this.request<any>('/api/attendance/face-checkin', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  static async identifyFaceStatus(data: {
    descriptor: number[]
  }) {
    return this.request<{
      success: boolean
      data: {
        userId: string
        userName: string
        userEmail: string
        department: string
        todayAttendance: {
          clockIn: string | null
          clockOut: string | null
          breakStart: string | null
          breakEnd: string | null
          status: 'not-started' | 'checked-in' | 'on-break' | 'checked-out'
        }
        shift: {
          startTime: string
          endTime: string
          lateThresholdMinutes: number
        }
      }
      confidence: number
    }>('/api/face/identify-status', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  static async faceAction(data: {
    descriptor: number[]
    action: 'check-in' | 'break-start' | 'break-end' | 'check-out'
    timestamp: string
    location?: any
    lateExcuse?: {
      reasonType: string
      reason: string
      notes: string
    } | null
  }) {
    return this.request<any>('/api/face/action', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Reports API
  static async generateReport(config: {
    type: string
    format: string
    dateRange: {
      start: Date | string
      end: Date | string
    }
    fields: string[]
    filters?: any
  }) {
    const token = this.getToken()
    
    const response = await fetch('/api/admin/reports/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(config),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate report')
    }

    // Return blob for file download
    return response.blob()
  }

  // Data Management API
  static async getDataManagementStats() {
    return this.request<{
      success: boolean
      data: {
        totalRecords: number
        activeRecords: number
        lastBackup: string
        nextBackup: string
        storageUsed: number
        storageLimit: number
        storagePercentage: number
        recentImports: number
        recentExports: number
        archivedRecords: number
        systemHealth: 'healthy' | 'warning' | 'critical'
        breakdown: {
          users: number
          attendance: number
          activeUsers: number
          inactiveUsers: number
        }
      }
    }>('/api/admin/data-management/stats')
  }

  static async getDataManagementActivity() {
    return this.request<{
      success: boolean
      data: Array<{
        id: string
        type: 'import' | 'export' | 'backup' | 'archive' | 'cleanup'
        description: string
        status: 'success' | 'pending' | 'failed'
        timestamp: string
        user?: string
        recordsAffected?: number
      }>
    }>('/api/admin/data-management/activity')
  }

  // Reports API
  static async getReportsStats() {
    return this.request<{
      success: boolean
      data: {
        totalReports: number
        scheduledReports: number
        sharedReports: number
        templates: number
        monthlyChange: number
        recentReports: Array<{
          id: string
          type: string
          name: string
          createdAt: string
          createdBy: string
          status: string
        }>
        breakdown: {
          daily: number
          weekly: number
          monthly: number
        }
        sharing: {
          teams: number
          users: number
        }
        customTemplates: number
      }
    }>('/api/admin/reports/stats')
  }

  // Analytics API
  static async getAnalyticsStats() {
    return this.request<{
      success: boolean
      data: {
        avgAttendance: number
        avgAttendanceChange: number
        productivityScore: number
        productivityChange: number
        turnoverRisk: number
        turnoverChange: number
        predictionAccuracy: number
        totalEmployees: number
        activeEmployees: number
        attendanceRate: number
        performanceMetrics: any
      }
    }>('/api/admin/analytics')
  }

  // Shift Swap API
  static async getShiftSwaps(type: 'all' | 'incoming' | 'outgoing' | 'pending' = 'all') {
    return this.request<{
      swaps: any[]
    }>(`/api/shift-swap?type=${type}`)
  }

  static async createShiftSwap(data: {
    requestor_date: string
    requestor_shift_id?: string
    target_id: string
    target_date?: string
    target_shift_id?: string
    swap_type: string
    reason: string
    is_emergency?: boolean
    compensation_type?: string
    compensation_amount?: number
  }) {
    return this.request<{
      success: boolean
      swap: any
      message: string
    }>('/api/shift-swap', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  static async respondToSwap(swapId: string, response: 'accept' | 'reject', reason?: string) {
    return this.request<{
      success: boolean
      message: string
    }>(`/api/shift-swap/${swapId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response, rejection_reason: reason }),
    })
  }

  static async approveSwap(swapId: string, response: 'approve' | 'reject', reason?: string) {
    return this.request<{
      success: boolean
      message: string
    }>(`/api/shift-swap/${swapId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ response, rejection_reason: reason }),
    })
  }

  static async cancelSwap(swapId: string, reason: string) {
    return this.request<{
      success: boolean
      message: string
    }>(`/api/shift-swap/${swapId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }

  // Break Management API
  static async validateBreak() {
    return this.request<{
      allowed: boolean
      reason: string
      remainingMinutes: number
      usedMinutes?: number
      totalMinutes?: number
      suggestedDuration?: number
      policy?: any
    }>('/api/break/validate')
  }

  static async startBreak(data: { break_type?: string; location?: any }) {
    return this.request<{
      success: boolean
      breakSession: any
      message: string
      remainingMinutes: number
    }>('/api/break/start', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  static async endBreak() {
    return this.request<{
      success: boolean
      breakSession: any
      message: string
      summary: {
        duration: number
        isPaid: boolean
        exceeded: boolean
        exceededMinutes: number
        totalBreakToday: number
      }
    }>('/api/break/end', {
      method: 'POST',
    })
  }

  // Exception Management API
  static async requestException(data: {
    attendance_id: string
    exception_type: string
    reason: string
    supporting_document?: string
    request_adjustment?: boolean
  }) {
    return this.request<{
      success: boolean
      exception: any
      message: string
      impact: {
        timeAdjustment: number
        affectSalary: boolean
        salaryDeduction: number
        affectPerformance: boolean
        performancePenalty: number
      }
    }>('/api/exception/request', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  static async approveException(
    exceptionId: string,
    action: 'approve' | 'reject',
    notes?: string,
    adjustments?: any
  ) {
    return this.request<{
      success: boolean
      exception: any
      message: string
    }>(`/api/exception/${exceptionId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ action, notes, adjustments }),
    })
  }

  static async getPendingExceptions(status?: string, type?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (type) params.append('type', type);
    
    return this.request<{
      exceptions: any[]
      summary: {
        pending: number
        approved: number
        rejected: number
        auto_approved: number
        total: number
      }
    }>(`/api/exception/pending?${params.toString()}`)
  }
}
