import { UserRole } from './auth'

// User interface for server-side
export interface ServerUser {
  id: string
  email: string
  name: string
  role: UserRole
  department?: string
  position?: string
  managerId?: string
  employeeId?: string
  phone?: string
  address?: string
  startDate?: Date
  isActive?: boolean
  createdAt: Date
  updatedAt: Date
}

// Attendance interface for server-side
export interface ServerAttendanceRecord {
  id: string
  userId: string
  timestamp: Date
  type: "check-in" | "check-out" | "break-start" | "break-end"
  location?: any
  photoUrl?: string
  notes?: string
  status?: 'present' | 'late' | 'absent' | 'early_leave' | 'on_leave'
  verified?: boolean
  synced?: boolean
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

// Schedule interface for server-side
export interface ServerSchedule {
  id: string
  name: string
  type: 'regular' | 'overtime' | 'holiday' | 'weekend' | 'special'
  description?: string
  startDate: Date
  endDate: Date
  startTime: string
  endTime: string
  location?: {
    name: string
    address: string
    latitude: number
    longitude: number
    radius: number
  }
  assignedUsers: string[]
  assignedDepartments: string[]
  isActive: boolean
  isRecurring: boolean
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    daysOfWeek?: number[]
    dayOfMonth?: number
  }
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// Schedule assignment interface for server-side
export interface ServerScheduleAssignment {
  id: string
  scheduleId: string
  userId: string
  date: Date
  status: 'assigned' | 'confirmed' | 'completed' | 'absent' | 'cancelled'
  checkInTime?: Date
  checkOutTime?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// Settings interface for server-side
export interface ServerSettings {
  company: {
    name: string
    logo?: string
    address?: string
    phone?: string
    email?: string
    timezone?: string
  }
  attendance: {
    checkInRadius?: number
    allowRemoteCheckIn?: boolean
    requirePhoto?: boolean
    requireLocation?: boolean
    workingHours?: {
      start: string
      end: string
      breakDuration?: number
    }
    overtimeSettings?: {
      enabled?: boolean
      maxDailyHours?: number
      requireApproval?: boolean
    }
  }
  security: {
    sessionTimeout?: number
    maxLoginAttempts?: number
    lockoutDuration?: number
    passwordPolicy?: {
      minLength?: number
      requireUppercase?: boolean
      requireLowercase?: boolean
      requireNumbers?: boolean
      requireSpecialChars?: boolean
      maxAge?: number
    }
  }
  notifications: {
    email?: {
      enabled?: boolean
      smtpHost?: string
      smtpPort?: number
      smtpUser?: string
      smtpPassword?: string
      fromEmail?: string
      fromName?: string
    }
    push?: {
      enabled?: boolean
      serverKey?: string
    }
    inApp?: {
      enabled?: boolean
      soundEnabled?: boolean
      vibrationEnabled?: boolean
    }
  }
  mobile?: {
    appVersion?: string
    forceUpdate?: boolean
    maintenanceMode?: boolean
    maintenanceMessage?: string
  }
}

// Face embedding interface for server-side
export interface ServerFaceEmbedding {
  id: string
  userId: string
  embedding: number[]
  quality?: number
  metadata?: Record<string, any>
  isActive?: boolean
  createdAt: Date
  updatedAt: Date
}

// In-memory data store for server-side (in production, this would be a real database)
// Initialize users array - will be populated based on environment configuration
let users: ServerUser[] = []

// Production: start with empty datasets. Use real DB integration in production deployments.
users = []

let attendanceRecords: ServerAttendanceRecord[] = []

// In-memory data store for face embeddings
let faceEmbeddings: ServerFaceEmbedding[] = []

// In-memory data store for schedules
let schedules: ServerSchedule[] = [
  {
    id: "1",
    name: "Regular Work Schedule",
    type: "regular",
    description: "Standard work schedule for all employees",
    startDate: new Date(new Date().setHours(0, 0, 0, 0)),
    endDate: new Date(new Date().setHours(23, 59, 59, 999)),
    startTime: "08:00",
    endTime: "17:00",
    location: {
      name: "Main Office",
      address: "123 Main St, Jakarta, Indonesia",
      latitude: -6.2088,
      longitude: 106.8456,
      radius: 100,
    },
    assignedUsers: ["1", "2", "3", "4", "5"],
    assignedDepartments: ["IT", "Engineering", "Human Resources"],
    isActive: true,
    isRecurring: true,
    recurringPattern: {
      frequency: "daily",
    },
    createdBy: "1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// In-memory data store for schedule assignments
let scheduleAssignments: ServerScheduleAssignment[] = [
  {
    id: "1",
    scheduleId: "1",
    userId: "1",
    date: new Date(),
    status: "completed",
    checkInTime: new Date(new Date().setHours(8, 0, 0, 0)),
    checkOutTime: new Date(new Date().setHours(17, 0, 0, 0)),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// In-memory data store for settings
let settings: ServerSettings = {
  company: {
    name: "PT Teknologi Maju",
    logo: "",
    address: "123 Main St, Jakarta, Indonesia",
    phone: "+628123456789",
    email: "info@teknologimaju.com",
    timezone: "Asia/Jakarta",
  },
  attendance: {
    checkInRadius: 100,
    allowRemoteCheckIn: false,
    requirePhoto: true,
    requireLocation: true,
    workingHours: {
      start: "08:00",
      end: "17:00",
      breakDuration: 60,
    },
    overtimeSettings: {
      enabled: false,
      maxDailyHours: 10,
      requireApproval: true,
    },
  },
  security: {
    sessionTimeout: 480,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxAge: 90,
    },
  },
  notifications: {
    email: {
      enabled: true,
      smtpHost: "smtp.example.com",
      smtpPort: 587,
      smtpUser: "noreply@example.com",
      smtpPassword: "password",
      fromEmail: "noreply@example.com",
      fromName: "PT Teknologi Maju",
    },
    push: {
      enabled: true,
      serverKey: "server-key",
    },
    inApp: {
      enabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
    },
  },
  mobile: {
    appVersion: "1.0.0",
    forceUpdate: false,
    maintenanceMode: false,
    maintenanceMessage: "",
  },
}

// Server-side database manager
export class ServerDatabaseManager {
  // User operations
  async getUsers(options?: {
    role?: UserRole
    department?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<ServerUser[]> {
    let filteredUsers = [...users]
    
    // Apply filters
    if (options?.role) {
      filteredUsers = filteredUsers.filter(user => user.role === options.role)
    }
    
    if (options?.department) {
      filteredUsers = filteredUsers.filter(user => 
        user.department?.toLowerCase().includes(options.department!.toLowerCase())
      )
    }
    
    if (options?.search) {
      const searchLower = options.search.toLowerCase()
      filteredUsers = filteredUsers.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.employeeId?.toLowerCase().includes(searchLower) ||
        user.department?.toLowerCase().includes(searchLower) ||
        user.position?.toLowerCase().includes(searchLower)
      )
    }
    
    // Apply pagination
    if (options?.offset !== undefined) {
      filteredUsers = filteredUsers.slice(options.offset)
    }
    
    if (options?.limit !== undefined) {
      filteredUsers = filteredUsers.slice(0, options.limit)
    }
    
    return filteredUsers
  }
  
  async getUser(id: string): Promise<ServerUser | null> {
    return users.find(user => user.id === id) || null
  }
  
  async getUserByEmail(email: string): Promise<ServerUser | null> {
    return users.find(user => user.email === email) || null
  }
  
  async saveUser(user: ServerUser): Promise<void> {
    const existingIndex = users.findIndex(u => u.id === user.id)
    
    if (existingIndex >= 0) {
      users[existingIndex] = { ...user, updatedAt: new Date() }
    } else {
      users.push({ ...user, createdAt: new Date(), updatedAt: new Date() })
    }
  }
  
  async deleteUser(id: string): Promise<void> {
    users = users.filter(user => user.id !== id)
  }
  
  async getUsersCount(options?: {
    role?: UserRole
    department?: string
    search?: string
  }): Promise<number> {
    const filteredUsers = await this.getUsers(options)
    return filteredUsers.length
  }
  
  // Attendance operations
  async getAttendanceRecords(options?: {
    userId?: string
    type?: "check-in" | "check-out"
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }): Promise<ServerAttendanceRecord[]> {
    let filteredRecords = [...attendanceRecords]
    
    // Apply filters
    if (options?.userId) {
      filteredRecords = filteredRecords.filter(record => record.userId === options.userId)
    }
    
    if (options?.type) {
      filteredRecords = filteredRecords.filter(record => record.type === options.type)
    }
    
    if (options?.startDate) {
      filteredRecords = filteredRecords.filter(record => record.timestamp >= options.startDate!)
    }
    
    if (options?.endDate) {
      filteredRecords = filteredRecords.filter(record => record.timestamp <= options.endDate!)
    }
    
    // Apply pagination
    if (options?.offset !== undefined) {
      filteredRecords = filteredRecords.slice(options.offset)
    }
    
    if (options?.limit !== undefined) {
      filteredRecords = filteredRecords.slice(0, options.limit)
    }
    
    return filteredRecords
  }
  
  async getAttendanceRecord(id: string): Promise<ServerAttendanceRecord | null> {
    return attendanceRecords.find(record => record.id === id) || null
  }
  
  async saveAttendanceRecord(record: ServerAttendanceRecord): Promise<void> {
    const existingIndex = attendanceRecords.findIndex(r => r.id === record.id)
    
    if (existingIndex >= 0) {
      attendanceRecords[existingIndex] = { ...record, updatedAt: new Date() }
    } else {
      attendanceRecords.push({ ...record, createdAt: new Date(), updatedAt: new Date() })
    }
  }
  
  async deleteAttendanceRecord(id: string): Promise<void> {
    attendanceRecords = attendanceRecords.filter(record => record.id !== id)
  }
  
  async getAttendanceRecordsCount(options?: {
    userId?: string
    type?: "check-in" | "check-out"
    startDate?: Date
    endDate?: Date
  }): Promise<number> {
    const filteredRecords = await this.getAttendanceRecords(options)
    return filteredRecords.length
  }
  
  // Schedule operations
  async getSchedules(options?: {
    type?: 'regular' | 'overtime' | 'holiday' | 'weekend' | 'special'
    isActive?: boolean
    isRecurring?: boolean
    limit?: number
    offset?: number
  }): Promise<ServerSchedule[]> {
    let filteredSchedules = [...schedules]
    
    // Apply filters
    if (options?.type) {
      filteredSchedules = filteredSchedules.filter(schedule => schedule.type === options.type)
    }
    
    if (options?.isActive !== undefined) {
      filteredSchedules = filteredSchedules.filter(schedule => schedule.isActive === options.isActive)
    }
    
    if (options?.isRecurring !== undefined) {
      filteredSchedules = filteredSchedules.filter(schedule => schedule.isRecurring === options.isRecurring)
    }
    
    // Apply pagination
    if (options?.offset !== undefined) {
      filteredSchedules = filteredSchedules.slice(options.offset)
    }
    
    if (options?.limit !== undefined) {
      filteredSchedules = filteredSchedules.slice(0, options.limit)
    }
    
    return filteredSchedules
  }
  
  async getSchedule(id: string): Promise<ServerSchedule | null> {
    return schedules.find(schedule => schedule.id === id) || null
  }
  
  async saveSchedule(schedule: ServerSchedule): Promise<void> {
    const existingIndex = schedules.findIndex(s => s.id === schedule.id)
    
    if (existingIndex >= 0) {
      schedules[existingIndex] = { ...schedule, updatedAt: new Date() }
    } else {
      schedules.push({ ...schedule, createdAt: new Date(), updatedAt: new Date() })
    }
  }
  
  async deleteSchedule(id: string): Promise<void> {
    schedules = schedules.filter(schedule => schedule.id !== id)
  }
  
  async getSchedulesCount(options?: {
    type?: 'regular' | 'overtime' | 'holiday' | 'weekend' | 'special'
    isActive?: boolean
    isRecurring?: boolean
  }): Promise<number> {
    const filteredSchedules = await this.getSchedules(options)
    return filteredSchedules.length
  }
  
  // Schedule assignment operations
  async getScheduleAssignments(options?: {
    scheduleId?: string
    userId?: string
    status?: 'assigned' | 'confirmed' | 'completed' | 'absent' | 'cancelled'
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }): Promise<ServerScheduleAssignment[]> {
    let filteredAssignments = [...scheduleAssignments]
    
    // Apply filters
    if (options?.scheduleId) {
      filteredAssignments = filteredAssignments.filter(assignment => assignment.scheduleId === options.scheduleId)
    }
    
    if (options?.userId) {
      filteredAssignments = filteredAssignments.filter(assignment => assignment.userId === options.userId)
    }
    
    if (options?.status) {
      filteredAssignments = filteredAssignments.filter(assignment => assignment.status === options.status)
    }
    
    if (options?.startDate) {
      filteredAssignments = filteredAssignments.filter(assignment => assignment.date >= options.startDate!)
    }
    
    if (options?.endDate) {
      filteredAssignments = filteredAssignments.filter(assignment => assignment.date <= options.endDate!)
    }
    
    // Apply pagination
    if (options?.offset !== undefined) {
      filteredAssignments = filteredAssignments.slice(options.offset)
    }
    
    if (options?.limit !== undefined) {
      filteredAssignments = filteredAssignments.slice(0, options.limit)
    }
    
    return filteredAssignments
  }
  
  async getScheduleAssignment(id: string): Promise<ServerScheduleAssignment | null> {
    return scheduleAssignments.find(assignment => assignment.id === id) || null
  }
  
  async saveScheduleAssignment(assignment: ServerScheduleAssignment): Promise<void> {
    const existingIndex = scheduleAssignments.findIndex(a => a.id === assignment.id)
    
    if (existingIndex >= 0) {
      scheduleAssignments[existingIndex] = { ...assignment, updatedAt: new Date() }
    } else {
      scheduleAssignments.push({ ...assignment, createdAt: new Date(), updatedAt: new Date() })
    }
  }
  
  async deleteScheduleAssignment(id: string): Promise<void> {
    scheduleAssignments = scheduleAssignments.filter(assignment => assignment.id !== id)
  }
  
  async getScheduleAssignmentsCount(options?: {
    scheduleId?: string
    userId?: string
    status?: 'assigned' | 'confirmed' | 'completed' | 'absent' | 'cancelled'
    startDate?: Date
    endDate?: Date
  }): Promise<number> {
    const filteredAssignments = await this.getScheduleAssignments(options)
    return filteredAssignments.length
  }
  
  // Settings operations
  async getSettings(): Promise<ServerSettings> {
    return settings
  }
  
  async updateSettings(section: string, data: any): Promise<void> {
    settings = {
      ...settings,
      [section]: {
        ...settings[section as keyof ServerSettings],
        ...data,
      },
    }
  }
  
  async resetSettings(section: string): Promise<void> {
    // Reset to default values
    switch (section) {
      case 'company':
        settings.company = {
          name: "PT Teknologi Maju",
          logo: "",
          address: "123 Main St, Jakarta, Indonesia",
          phone: "+628123456789",
          email: "info@teknologimaju.com",
          timezone: "Asia/Jakarta",
        }
        break
      case 'attendance':
        settings.attendance = {
          checkInRadius: 100,
          allowRemoteCheckIn: false,
          requirePhoto: true,
          requireLocation: true,
          workingHours: {
            start: "08:00",
            end: "17:00",
            breakDuration: 60,
          },
          overtimeSettings: {
            enabled: false,
            maxDailyHours: 10,
            requireApproval: true,
          },
        }
        break
      case 'security':
        settings.security = {
          sessionTimeout: 480,
          maxLoginAttempts: 5,
          lockoutDuration: 15,
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            maxAge: 90,
          },
        }
        break
      case 'notifications':
        settings.notifications = {
          email: {
            enabled: true,
            smtpHost: "smtp.example.com",
            smtpPort: 587,
            smtpUser: "noreply@example.com",
            smtpPassword: "password",
            fromEmail: "noreply@example.com",
            fromName: "PT Teknologi Maju",
          },
          push: {
            enabled: true,
            serverKey: "server-key",
          },
          inApp: {
            enabled: true,
            soundEnabled: true,
            vibrationEnabled: true,
          },
        }
        break
      case 'mobile':
        settings.mobile = {
          appVersion: "1.0.0",
          forceUpdate: false,
          maintenanceMode: false,
          maintenanceMessage: "",
        }
        break
    }
  }

  // Face embedding operations
  async getFaceEmbeddings(options?: { userId?: string; limit?: number; offset?: number }): Promise<ServerFaceEmbedding[]> {
    let list = [...faceEmbeddings]
    if (options?.userId) {
      list = list.filter(e => e.userId === options.userId)
    }
    if (options?.offset !== undefined) {
      list = list.slice(options.offset)
    }
    if (options?.limit !== undefined) {
      list = list.slice(0, options.limit)
    }
    return list
  }

  async getFaceEmbeddingsByUser(userId: string): Promise<ServerFaceEmbedding[]> {
    return faceEmbeddings.filter(e => e.userId === userId)
  }

  async saveFaceEmbedding(embedding: ServerFaceEmbedding): Promise<void> {
    const idx = faceEmbeddings.findIndex(e => e.id === embedding.id)
    if (idx >= 0) {
      faceEmbeddings[idx] = { ...embedding, updatedAt: new Date() }
    } else {
      faceEmbeddings.push({ ...embedding, createdAt: embedding.createdAt ?? new Date(), updatedAt: new Date() })
    }
  }

  async deleteFaceEmbedding(id: string): Promise<void> {
    faceEmbeddings = faceEmbeddings.filter(e => e.id !== id)
  }
}

// Export Supabase DB Manager (replaces in-memory implementation)
// Import from supabase-db for persistent storage
export { supabaseDb as serverDbManager, SupabaseDbManager as ServerDbManager } from './supabase-db'

// Legacy in-memory implementation kept for reference/fallback
// Uncomment below if you need to use in-memory storage
// export const serverDbManager = new ServerDatabaseManager()
