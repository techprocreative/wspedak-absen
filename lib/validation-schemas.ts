import { z } from 'zod'

// Common validation patterns
const emailSchema = z.string().email('Invalid email address').max(254, 'Email too long')
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
const uuidSchema = z.string().uuid('Invalid ID format')
const dateSchema = z.string().datetime('Invalid date format')
const roleSchema = z.enum(['employee', 'admin', 'hr', 'manager'])

// Authentication schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false)
})

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  role: roleSchema.optional().default('employee')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const forgotPasswordSchema = z.object({
  email: emailSchema
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Attendance record schemas
const attendanceRecordBaseSchema = z.object({
  userId: uuidSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
  checkIn: dateSchema.optional(),
  checkOut: dateSchema.optional(),
  breakStart: dateSchema.optional(),
  breakEnd: dateSchema.optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().nonnegative().optional()
  }).optional(),
  photos: z.array(z.string().url('Invalid photo URL')).optional(),
  status: z.enum(['present', 'absent', 'late', 'early_leave', 'on_leave']).optional(),
  workType: z.enum(['regular', 'overtime', 'holiday', 'weekend']).optional(),
  approvedBy: uuidSchema.optional(),
  approvedAt: dateSchema.optional()
})

export const attendanceRecordSchema = attendanceRecordBaseSchema.refine((data) => {
  // Validate time logic
  if (data.checkIn && data.checkOut) {
    return new Date(data.checkIn) < new Date(data.checkOut)
  }
  if (data.breakStart && data.breakEnd) {
    return new Date(data.breakStart) < new Date(data.breakEnd)
  }
  return true
}, {
  message: "Invalid time sequence",
  path: ["checkOut"]
})

export const attendanceUpdateSchema = attendanceRecordBaseSchema.partial()

export const attendanceQuerySchema = z.object({
  userId: uuidSchema.optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD').optional(),
  status: z.enum(['present', 'absent', 'late', 'early_leave', 'on_leave']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  // Allow 'timestamp' to match client sorting and underlying record field
  sortBy: z.enum(['date', 'checkIn', 'checkOut', 'status', 'timestamp']).optional().default('date'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
})

// User management schemas
export const userCreateSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  role: roleSchema,
  department: z.string().max(100, 'Department too long').optional(),
  position: z.string().max(100, 'Position too long').optional(),
  managerId: uuidSchema.optional(),
  employeeId: z.string().max(50, 'Employee ID too long').optional(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number').optional(),
  address: z.string().max(500, 'Address too long').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD').optional()
})

export const userUpdateSchema = userCreateSchema.partial().omit({
  email: true
})

export const userQuerySchema = z.object({
  role: roleSchema.optional(),
  department: z.string().optional(),
  search: z.string().min(1, 'Search term must be at least 1 character').optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.enum(['name', 'email', 'role', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
})

// Face recognition schemas
export const faceEnrollmentSchema = z.object({
  userId: uuidSchema,
  faceImages: z.array(z.string().url('Invalid image URL')).min(1, 'At least one face image is required').max(5, 'Maximum 5 images allowed'),
  descriptor: z.array(z.number()).optional() // Face descriptor if processed client-side
})

export const faceVerificationSchema = z.object({
  userId: uuidSchema,
  faceImage: z.string().url('Invalid image URL'),
  descriptor: z.array(z.number()).optional() // Face descriptor if processed client-side
})

// Settings schemas
export const settingsSchema = z.object({
  company: z.object({
    name: z.string().min(1, 'Company name is required').max(100),
    logo: z.string().url('Invalid logo URL').optional(),
    address: z.string().max(500).optional(),
    phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number').optional(),
    email: emailSchema.optional(),
    timezone: z.string().optional()
  }),
  attendance: z.object({
    checkInRadius: z.number().positive().max(1000).optional(), // meters
    allowRemoteCheckIn: z.boolean().optional(),
    requirePhoto: z.boolean().optional(),
    requireLocation: z.boolean().optional(),
    workingHours: z.object({
      start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format, expected HH:MM'),
      end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format, expected HH:MM'),
      breakDuration: z.number().int().min(0).max(480).optional() // minutes
    }).optional(),
    overtimeSettings: z.object({
      enabled: z.boolean().optional(),
      maxDailyHours: z.number().positive().max(24).optional(),
      requireApproval: z.boolean().optional()
    }).optional()
  }),
  security: z.object({
    sessionTimeout: z.number().int().positive().max(1440).optional(), // minutes
    maxLoginAttempts: z.number().int().positive().max(10).optional(),
    lockoutDuration: z.number().int().positive().max(1440).optional(), // minutes
    passwordPolicy: z.object({
      minLength: z.number().int().min(6).max(128).optional(),
      requireUppercase: z.boolean().optional(),
      requireLowercase: z.boolean().optional(),
      requireNumbers: z.boolean().optional(),
      requireSpecialChars: z.boolean().optional(),
      maxAge: z.number().int().positive().optional() // days
    }).optional()
  }).optional()
})

// Export/Import schemas
export const exportQuerySchema = z.object({
  type: z.enum(['attendance', 'users', 'reports']),
  format: z.enum(['json', 'csv', 'xlsx']).optional().default('json'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD').optional(),
  userIds: z.array(uuidSchema).optional(),
  includeDeleted: z.boolean().optional().default(false)
})

export const importSchema = z.object({
  type: z.enum(['attendance', 'users']),
  format: z.enum(['json', 'csv', 'xlsx']),
  data: z.any(), // Will be validated based on type
  overwrite: z.boolean().optional().default(false),
  validateOnly: z.boolean().optional().default(true)
})

// Report schemas
export const reportQuerySchema = z.object({
  type: z.enum(['attendance_summary', 'user_attendance', 'department_stats', 'overtime_report']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
  userIds: z.array(uuidSchema).optional(),
  departmentIds: z.array(z.string()).optional(),
  groupBy: z.enum(['day', 'week', 'month', 'user', 'department']).optional(),
  format: z.enum(['json', 'csv', 'xlsx']).optional().default('json')
})

// API response schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative()
  }).optional()
})

// Error response schema
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string().optional(),
  code: z.string().optional(),
  details: z.any().optional()
})

// Type exports
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type AttendanceRecordInput = z.infer<typeof attendanceRecordSchema>
export type AttendanceUpdateInput = z.infer<typeof attendanceUpdateSchema>
export type AttendanceQueryInput = z.infer<typeof attendanceQuerySchema>
export type UserCreateInput = z.infer<typeof userCreateSchema>
export type UserUpdateInput = z.infer<typeof userUpdateSchema>
export type UserQueryInput = z.infer<typeof userQuerySchema>
export type FaceEnrollmentInput = z.infer<typeof faceEnrollmentSchema>
export type FaceVerificationInput = z.infer<typeof faceVerificationSchema>
export type SettingsInput = z.infer<typeof settingsSchema>
export type ExportQueryInput = z.infer<typeof exportQuerySchema>
export type ImportInput = z.infer<typeof importSchema>
export type ReportQueryInput = z.infer<typeof reportQuerySchema>
