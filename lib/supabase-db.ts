/**
 * Supabase Database Manager
 * Complete implementation using Supabase for data persistence
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { 
  ServerUser, 
  ServerAttendanceRecord, 
  ServerSchedule,
  ServerScheduleAssignment,
  ServerSettings,
  ServerFaceEmbedding
} from './server-db'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Please check your environment variables.')
}

export class SupabaseDbManager {
  private supabase: SupabaseClient
  
  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  
  // ============================================
  // USER OPERATIONS
  // ============================================
  
  async getUsers(options?: {
    role?: string
    department?: string
    search?: string
    limit?: number
    offset?: number
    isActive?: boolean
  }): Promise<ServerUser[]> {
    let query = this.supabase
      .from('users')
      .select('*')
    
    if (options?.isActive !== undefined) {
      query = query.eq('is_active', options.isActive)
    } else {
      query = query.eq('is_active', true)
    }
    
    if (options?.role && options.role !== 'all') {
      query = query.eq('role', options.role)
    }
    
    if (options?.department) {
      query = query.eq('department', options.department)
    }
    
    if (options?.search) {
      query = query.or(`name.ilike.%${options.search}%,email.ilike.%${options.search}%,employee_id.ilike.%${options.search}%`)
    }
    
    query = query.order('created_at', { ascending: false })
    
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching users:', error)
      throw new Error(`Failed to fetch users: ${error.message}`)
    }
    
    return (data || []).map(this.mapDbUserToServerUser)
  }
  
  async getUser(id: string): Promise<ServerUser | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      console.error('Error fetching user:', error)
      return null
    }
    
    return this.mapDbUserToServerUser(data)
  }
  
  async getUserByEmail(email: string): Promise<ServerUser | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle()
    
    if (error) {
      console.error('Error fetching user by email:', error)
      return null
    }
    
    if (!data) return null
    
    return this.mapDbUserToServerUser(data)
  }
  
  async saveUser(user: ServerUser): Promise<ServerUser> {
    const dbUser = this.mapServerUserToDbUser(user)
    
    const { data, error } = await this.supabase
      .from('users')
      .upsert(dbUser, { onConflict: 'id' })
      .select()
      .single()
    
    if (error) {
      console.error('Error saving user:', error)
      throw new Error(`Failed to save user: ${error.message}`)
    }
    
    return this.mapDbUserToServerUser(data)
  }
  
  async deleteUser(id: string): Promise<boolean> {
    // Soft delete - set is_active to false
    const { error } = await this.supabase
      .from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting user:', error)
      return false
    }
    
    return true
  }
  
  // ============================================
  // ATTENDANCE OPERATIONS
  // ============================================
  
  async getAttendanceRecords(options?: {
    userId?: string
    startDate?: Date
    endDate?: Date
    type?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<ServerAttendanceRecord[]> {
    let query = this.supabase
      .from('attendance_records')
      .select('*')
    
    if (options?.userId) {
      query = query.eq('user_id', options.userId)
    }
    
    if (options?.startDate) {
      query = query.gte('timestamp', options.startDate.toISOString())
    }
    
    if (options?.endDate) {
      query = query.lte('timestamp', options.endDate.toISOString())
    }
    
    if (options?.type) {
      query = query.eq('type', options.type)
    }
    
    if (options?.status) {
      query = query.eq('status', options.status)
    }
    
    query = query.order('timestamp', { ascending: false })
    
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching attendance records:', error)
      throw new Error(`Failed to fetch attendance records: ${error.message}`)
    }
    
    return (data || []).map(this.mapDbAttendanceToServerAttendance)
  }
  
  async getAttendanceRecord(id: string): Promise<ServerAttendanceRecord | null> {
    const { data, error } = await this.supabase
      .from('attendance_records')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching attendance record:', error)
      return null
    }
    
    return this.mapDbAttendanceToServerAttendance(data)
  }
  
  async saveAttendanceRecord(record: ServerAttendanceRecord): Promise<ServerAttendanceRecord> {
    const dbRecord = this.mapServerAttendanceToDbAttendance(record)
    
    const { data, error } = await this.supabase
      .from('attendance_records')
      .upsert(dbRecord, { onConflict: 'id' })
      .select()
      .single()
    
    if (error) {
      console.error('Error saving attendance record:', error)
      throw new Error(`Failed to save attendance record: ${error.message}`)
    }
    
    return this.mapDbAttendanceToServerAttendance(data)
  }
  
  async deleteAttendanceRecord(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('attendance_records')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting attendance record:', error)
      return false
    }
    
    return true
  }
  
  // ============================================
  // SCHEDULE OPERATIONS
  // ============================================
  
  async getSchedules(options?: {
    isActive?: boolean
    startDate?: Date
    endDate?: Date
    userId?: string
    limit?: number
    offset?: number
  }): Promise<ServerSchedule[]> {
    let query = this.supabase
      .from('schedules')
      .select('*')
    
    if (options?.isActive !== undefined) {
      query = query.eq('is_active', options.isActive)
    }
    
    if (options?.startDate) {
      query = query.gte('start_date', options.startDate.toISOString().split('T')[0])
    }
    
    if (options?.endDate) {
      query = query.lte('end_date', options.endDate.toISOString().split('T')[0])
    }
    
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching schedules:', error)
      throw new Error(`Failed to fetch schedules: ${error.message}`)
    }
    
    return (data || []).map(this.mapDbScheduleToServerSchedule)
  }
  
  async getSchedule(id: string): Promise<ServerSchedule | null> {
    const { data, error } = await this.supabase
      .from('schedules')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching schedule:', error)
      return null
    }
    
    return this.mapDbScheduleToServerSchedule(data)
  }
  
  async saveSchedule(schedule: ServerSchedule): Promise<ServerSchedule> {
    const dbSchedule = this.mapServerScheduleToDbSchedule(schedule)
    
    const { data, error } = await this.supabase
      .from('schedules')
      .upsert(dbSchedule, { onConflict: 'id' })
      .select()
      .single()
    
    if (error) {
      console.error('Error saving schedule:', error)
      throw new Error(`Failed to save schedule: ${error.message}`)
    }
    
    return this.mapDbScheduleToServerSchedule(data)
  }
  
  async deleteSchedule(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('schedules')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting schedule:', error)
      return false
    }
    
    return true
  }
  
  // ============================================
  // SETTINGS OPERATIONS
  // ============================================
  
  async getSettings(section?: string): Promise<any> {
    if (section) {
      const { data, error } = await this.supabase
        .from('settings')
        .select('data')
        .eq('section', section)
        .maybeSingle()
      
      if (error) {
        console.error('Error fetching settings:', error)
        return null
      }
      
      return data?.data || null
    }
    
    // Get all settings and merge
    const { data, error } = await this.supabase
      .from('settings')
      .select('*')
    
    if (error) {
      console.error('Error fetching settings:', error)
      return {}
    }
    
    const merged: any = {}
    (data || []).forEach(item => {
      merged[item.section] = item.data
    })
    
    return merged
  }
  
  async saveSettings(section: string, data: any): Promise<boolean> {
    const { error } = await this.supabase
      .from('settings')
      .upsert({
        section,
        data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'section' })
    
    if (error) {
      console.error('Error saving settings:', error)
      return false
    }
    
    return true
  }
  
  // ============================================
  // FACE EMBEDDINGS OPERATIONS
  // ============================================
  
  async getFaceEmbeddings(userId: string): Promise<ServerFaceEmbedding[]> {
    const { data, error } = await this.supabase
      .from('face_embeddings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
    
    if (error) {
      console.error('Error fetching face embeddings:', error)
      return []
    }
    
    return (data || []).map(this.mapDbFaceEmbeddingToServerFaceEmbedding)
  }
  
  async getAllFaceEmbeddings(): Promise<ServerFaceEmbedding[]> {
    const { data, error } = await this.supabase
      .from('face_embeddings')
      .select('*')
      .eq('is_active', true)
    
    if (error) {
      console.error('Error fetching all face embeddings:', error)
      return []
    }
    
    return (data || []).map(this.mapDbFaceEmbeddingToServerFaceEmbedding)
  }
  
  async saveFaceEmbedding(embedding: ServerFaceEmbedding): Promise<ServerFaceEmbedding> {
    const dbEmbedding = {
      id: embedding.id,
      user_id: embedding.userId,
      embedding: embedding.embedding,
      quality: embedding.quality,
      metadata: embedding.metadata,
      is_active: embedding.isActive ?? true,
      created_at: embedding.createdAt?.toISOString() || new Date().toISOString(),
      updated_at: embedding.updatedAt?.toISOString() || new Date().toISOString()
    }
    
    const { data, error } = await this.supabase
      .from('face_embeddings')
      .upsert(dbEmbedding, { onConflict: 'id' })
      .select()
      .single()
    
    if (error) {
      console.error('Error saving face embedding:', error)
      throw new Error(`Failed to save face embedding: ${error.message}`)
    }
    
    return this.mapDbFaceEmbeddingToServerFaceEmbedding(data)
  }
  
  async deleteFaceEmbedding(id: string): Promise<boolean> {
    // Soft delete
    const { error } = await this.supabase
      .from('face_embeddings')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting face embedding:', error)
      return false
    }
    
    return true
  }
  
  // ============================================
  // AUDIT LOG OPERATIONS
  // ============================================
  
  async createAuditLog(log: {
    userId?: string
    action: string
    resource: string
    resourceId?: string
    details?: any
    ipAddress?: string
    userAgent?: string
  }): Promise<void> {
    const { error } = await this.supabase
      .from('audit_logs')
      .insert({
        user_id: log.userId,
        action: log.action,
        resource: log.resource,
        resource_id: log.resourceId,
        details: log.details,
        ip_address: log.ipAddress,
        user_agent: log.userAgent,
        created_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Error creating audit log:', error)
    }
  }
  
  async getAuditLogs(options?: {
    userId?: string
    action?: string
    resource?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }): Promise<any[]> {
    let query = this.supabase
      .from('audit_logs')
      .select('*')
    
    if (options?.userId) {
      query = query.eq('user_id', options.userId)
    }
    
    if (options?.action) {
      query = query.eq('action', options.action)
    }
    
    if (options?.resource) {
      query = query.eq('resource', options.resource)
    }
    
    if (options?.startDate) {
      query = query.gte('created_at', options.startDate.toISOString())
    }
    
    if (options?.endDate) {
      query = query.lte('created_at', options.endDate.toISOString())
    }
    
    query = query.order('created_at', { ascending: false })
    
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching audit logs:', error)
      return []
    }
    
    return data || []
  }
  
  // ============================================
  // NOTIFICATION OPERATIONS
  // ============================================
  
  async getNotifications(userId: string, unreadOnly: boolean = false): Promise<any[]> {
    let query = this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
    
    if (unreadOnly) {
      query = query.eq('read', false)
    }
    
    query = query.order('created_at', { ascending: false }).limit(50)
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching notifications:', error)
      return []
    }
    
    return data || []
  }
  
  async createNotification(notification: {
    userId: string
    title: string
    message: string
    type: 'info' | 'warning' | 'error' | 'success'
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    data?: any
  }): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .insert({
        user_id: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority || 'normal',
        data: notification.data,
        created_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Error creating notification:', error)
    }
  }
  
  async markNotificationRead(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
    
    if (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
    
    return true
  }
  
  // ============================================
  // MAPPING FUNCTIONS
  // ============================================
  
  private mapDbUserToServerUser(dbUser: any): ServerUser {
    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      department: dbUser.department,
      position: dbUser.position,
      managerId: dbUser.manager_id,
      employeeId: dbUser.employee_id,
      phone: dbUser.phone,
      address: dbUser.address,
      startDate: dbUser.start_date ? new Date(dbUser.start_date) : undefined,
      isActive: dbUser.is_active,
      createdAt: new Date(dbUser.created_at),
      updatedAt: new Date(dbUser.updated_at)
    }
  }
  
  private mapServerUserToDbUser(user: ServerUser): any {
    return {
      id: user.id,
      email: user.email,
      password_hash: (user as any).passwordHash || '',
      name: user.name,
      role: user.role,
      department: user.department,
      position: user.position,
      manager_id: user.managerId,
      employee_id: user.employeeId,
      phone: user.phone,
      address: user.address,
      start_date: user.startDate?.toISOString().split('T')[0],
      is_active: (user as any).isActive ?? true,
      created_at: user.createdAt?.toISOString() || new Date().toISOString(),
      updated_at: user.updatedAt?.toISOString() || new Date().toISOString()
    }
  }
  
  private mapDbAttendanceToServerAttendance(dbRecord: any): ServerAttendanceRecord {
    return {
      id: dbRecord.id,
      userId: dbRecord.user_id,
      timestamp: new Date(dbRecord.timestamp),
      type: dbRecord.type,
      location: dbRecord.location,
      photoUrl: dbRecord.photo_url,
      notes: dbRecord.notes,
      status: dbRecord.status,
      verified: dbRecord.verified,
      synced: dbRecord.synced,
      metadata: dbRecord.metadata,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: new Date(dbRecord.updated_at)
    }
  }
  
  private mapServerAttendanceToDbAttendance(record: ServerAttendanceRecord): any {
    return {
      id: record.id,
      user_id: record.userId,
      timestamp: record.timestamp.toISOString(),
      type: record.type,
      location: record.location,
      photo_url: record.photoUrl,
      notes: record.notes,
      status: record.status,
      verified: record.verified ?? false,
      synced: record.synced ?? true,
      metadata: record.metadata,
      created_at: record.createdAt?.toISOString() || new Date().toISOString(),
      updated_at: record.updatedAt?.toISOString() || new Date().toISOString()
    }
  }
  
  private mapDbScheduleToServerSchedule(dbSchedule: any): ServerSchedule {
    return {
      id: dbSchedule.id,
      name: dbSchedule.name,
      type: dbSchedule.type,
      description: dbSchedule.description,
      startDate: new Date(dbSchedule.start_date),
      endDate: new Date(dbSchedule.end_date),
      startTime: dbSchedule.start_time,
      endTime: dbSchedule.end_time,
      location: dbSchedule.location,
      assignedUsers: dbSchedule.assigned_users || [],
      assignedDepartments: dbSchedule.assigned_departments || [],
      isActive: dbSchedule.is_active,
      isRecurring: dbSchedule.is_recurring,
      recurringPattern: dbSchedule.recurring_pattern,
      createdBy: dbSchedule.created_by,
      createdAt: new Date(dbSchedule.created_at),
      updatedAt: new Date(dbSchedule.updated_at)
    }
  }
  
  private mapServerScheduleToDbSchedule(schedule: ServerSchedule): any {
    return {
      id: schedule.id,
      name: schedule.name,
      type: schedule.type,
      description: schedule.description,
      start_date: schedule.startDate.toISOString().split('T')[0],
      end_date: schedule.endDate.toISOString().split('T')[0],
      start_time: schedule.startTime,
      end_time: schedule.endTime,
      location: schedule.location,
      assigned_users: schedule.assignedUsers,
      assigned_departments: schedule.assignedDepartments,
      is_active: schedule.isActive,
      is_recurring: schedule.isRecurring,
      recurring_pattern: schedule.recurringPattern,
      created_by: schedule.createdBy,
      created_at: schedule.createdAt?.toISOString() || new Date().toISOString(),
      updated_at: schedule.updatedAt?.toISOString() || new Date().toISOString()
    }
  }
  
  private mapDbFaceEmbeddingToServerFaceEmbedding(dbEmbedding: any): ServerFaceEmbedding {
    return {
      id: dbEmbedding.id,
      userId: dbEmbedding.user_id,
      embedding: dbEmbedding.embedding,
      quality: dbEmbedding.quality,
      metadata: dbEmbedding.metadata,
      isActive: dbEmbedding.is_active,
      createdAt: new Date(dbEmbedding.created_at),
      updatedAt: new Date(dbEmbedding.updated_at)
    }
  }
  
  // ============================================
  // FACE EMBEDDINGS - Additional Methods
  // ============================================
  
  async getFaceEmbeddingsByUser(userId: string): Promise<ServerFaceEmbedding[]> {
    const { data, error } = await this.supabase
      .from('face_embeddings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching face embeddings by user:', error)
      throw new Error(`Failed to fetch face embeddings: ${error.message}`)
    }
    
    return (data || []).map(this.mapDbFaceEmbeddingToServerFaceEmbedding)
  }
  
  // ============================================
  // SCHEDULE ASSIGNMENTS
  // ============================================
  
  async getScheduleAssignments(options?: {
    userId?: string
    scheduleId?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }): Promise<ServerScheduleAssignment[]> {
    let query = this.supabase
      .from('schedule_assignments')
      .select('*')
    
    if (options?.userId) {
      query = query.eq('user_id', options.userId)
    }
    
    if (options?.scheduleId) {
      query = query.eq('schedule_id', options.scheduleId)
    }
    
    if (options?.startDate) {
      query = query.gte('effective_from', options.startDate.toISOString())
    }
    
    if (options?.endDate) {
      query = query.lte('effective_from', options.endDate.toISOString())
    }
    
    query = query.order('effective_from', { ascending: false })
    
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching schedule assignments:', error)
      throw new Error(`Failed to fetch schedule assignments: ${error.message}`)
    }
    
    return (data || []).map(this.mapDbScheduleAssignmentToServerScheduleAssignment)
  }
  
  async getScheduleAssignment(id: string): Promise<ServerScheduleAssignment | null> {
    const { data, error } = await this.supabase
      .from('schedule_assignments')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching schedule assignment:', error)
      return null
    }
    
    return this.mapDbScheduleAssignmentToServerScheduleAssignment(data)
  }
  
  async saveScheduleAssignment(assignment: ServerScheduleAssignment): Promise<ServerScheduleAssignment> {
    const dbAssignment = this.mapServerScheduleAssignmentToDbScheduleAssignment(assignment)
    
    const { data, error } = await this.supabase
      .from('schedule_assignments')
      .upsert(dbAssignment, { onConflict: 'id' })
      .select()
      .single()
    
    if (error) {
      console.error('Error saving schedule assignment:', error)
      throw new Error(`Failed to save schedule assignment: ${error.message}`)
    }
    
    return this.mapDbScheduleAssignmentToServerScheduleAssignment(data)
  }
  
  async deleteScheduleAssignment(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('schedule_assignments')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting schedule assignment:', error)
      return false
    }
    
    return true
  }
  
  // ============================================
  // SETTINGS - Additional Methods
  // ============================================
  
  async updateSettings(section: string, settings: Partial<ServerSettings>): Promise<ServerSettings> {
    const current = await this.getSettings(section)
    const updated = { ...current, ...settings }
    return this.saveSettings(section, updated)
  }
  
  async resetSettings(section: string): Promise<ServerSettings> {
    // Get default settings based on section
    const defaultSettings: Record<string, any> = {
      general: {
        appName: 'Attendance System',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm',
      },
      attendance: {
        lateThreshold: 15,
        earlyLeaveThreshold: 15,
        overtimeEnabled: true,
        requiredWorkHours: 8,
      },
      notifications: {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
      },
    }
    
    const defaults = defaultSettings[section] || {}
    return this.saveSettings(section, defaults)
  }
}

// Export singleton instance
export const supabaseDb = new SupabaseDbManager()

// Also export for backward compatibility
export const serverDbManager = supabaseDb
