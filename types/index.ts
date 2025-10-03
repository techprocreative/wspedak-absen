// User types
export interface User {
  id: string
  name: string
  email: string
  role: 'employee' | 'admin' | 'hr' | 'manager'
  department?: string
  photo?: string
  createdAt?: Date
  updatedAt?: Date
}

// Attendance types
export interface AttendanceRecord {
  id: string
  userId: string
  timestamp: Date
  type: 'check-in' | 'check-out'
  location?: {
    latitude: number
    longitude: number
  }
  photo?: string // Base64 encoded photo
  synced: boolean
  pendingSync?: boolean
  createdAt?: Date
  updatedAt?: Date
}

// Extended attendance record for daily attendance
export interface DailyAttendanceRecord {
  id: string
  user_id: string
  date: string
  clock_in?: string
  clock_out?: string
  clock_in_location?: {
    latitude: number
    longitude: number
  }
  clock_out_location?: {
    latitude: number
    longitude: number
  }
  clock_in_photo?: string
  clock_out_photo?: string
  status: 'present' | 'absent' | 'late' | 'early_leave'
  absence_reason?: string
  sync_status: 'pending' | 'synced' | 'error'
  created_at?: string
  updated_at?: string
}

// Attendance policy
export interface AttendancePolicy {
  id: string
  work_start_time: string
  work_end_time: string
  late_threshold_minutes: number
  early_leave_threshold_minutes: number
  overtime_enabled: boolean
  weekend_work_enabled: boolean
  created_at: string
  updated_at: string
}

// Sync queue types
export interface SyncQueueItem {
  id: string
  type: 'attendance' | 'user'
  data: any
  timestamp: Date
  retryCount: number
}

// Offline data types
export interface OfflineData {
  lastSync: Date
  userData: User[]
  attendanceData: AttendanceRecord[]
}

// Network status types
export interface NetworkStatus {
  isOnline: boolean
  lastOnline?: Date
  lastOffline?: Date
}

// App state types
export interface AppState {
  user: User | null
  networkStatus: NetworkStatus
  isLoading: boolean
  error: string | null
}

// API response types
export interface ApiResponse<T> {
  data: T
  message?: string
  error?: string
  status: 'success' | 'error'
}

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface AttendanceForm {
  userId: string
  type: 'check-in' | 'check-out'
  location?: {
    latitude: number
    longitude: number
  }
  photo?: string
}

// Service worker types
export interface ServiceWorkerMessage {
  type: 'SYNC' | 'CACHE_UPDATED' | 'OFFLINE_READY'
  payload?: any
}

// Database store names
export const DB_STORES = {
  ATTENDANCE: 'attendance',
  USERS: 'users',
  SYNC_QUEUE: 'syncQueue',
  OFFLINE_DATA: 'offlineData',
} as const

// Error types
export interface AppError {
  code: string
  message: string
  details?: any
}

// Pagination types
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Filter types
export interface AttendanceFilter {
  userId?: string
  startDate?: Date
  endDate?: Date
  type?: 'check-in' | 'check-out'
  synced?: boolean
}

export interface UserFilter {
  role?: 'employee' | 'admin' | 'hr' | 'manager'
  department?: string
  search?: string
}

// Statistics types
export interface AttendanceStats {
  totalEmployees: number
  presentToday: number
  absentToday: number
  onTime: number
  late: number
  total_days: number
  present_days: number
  absent_days: number
  late_days: number
  early_leave_days: number
  total_work_hours: number
  overtime_hours: number
  average_work_hours: number
}

export interface UserStats {
  totalAttendance: number
  presentDays: number
  absentDays: number
  lateDays: number
  averageCheckInTime?: string
  averageCheckOutTime?: string
}