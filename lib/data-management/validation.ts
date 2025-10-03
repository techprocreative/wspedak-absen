import { z } from 'zod'
import type { 
  ImportConfig, 
  ExportConfig, 
  BackupConfig, 
  RestoreConfig,
  ArchivalRule,
  CleanupRule,
  DataRetentionPolicy,
  ValidationError,
  ImportError,
  ExportError,
  BackupError,
  RestoreError
} from '@/types/data-management'

// Validation schemas
export const importConfigSchema = z.object({
  fileType: z.enum(['csv', 'excel', 'json']),
  delimiter: z.string().optional(),
  encoding: z.string().optional(),
  hasHeader: z.boolean().optional(),
  fieldMapping: z.array(z.object({
    sourceField: z.string(),
    targetField: z.string(),
    required: z.boolean()
  })).optional()
})

export const exportConfigSchema = z.object({
  format: z.enum(['csv', 'excel', 'pdf', 'json']),
  fields: z.array(z.string()),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'contains', 'greater_than', 'less_than', 'between', 'in']),
    value: z.any()
  })),
  filename: z.string().optional(),
  includeHeader: z.boolean().optional(),
  encoding: z.string().optional(),
  delimiter: z.string().optional()
})

export const backupConfigSchema = z.object({
  type: z.enum(['full', 'incremental', 'differential']),
  includeTables: z.array(z.string()),
  excludeTables: z.array(z.string()),
  compression: z.boolean(),
  compressionLevel: z.number().min(1).max(9),
  encryption: z.boolean(),
  location: z.string(),
  filename: z.string().optional(),
  retentionDays: z.number().min(1)
})

export const restoreConfigSchema = z.object({
  backupId: z.string(),
  conflictResolution: z.enum(['skip', 'overwrite', 'merge']),
  includeTables: z.array(z.string()),
  excludeTables: z.array(z.string()),
  dryRun: z.boolean(),
  validateBeforeRestore: z.boolean()
})

export const archivalRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean(),
  entityType: z.enum(['employees', 'attendance', 'schedules']),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'between', 'contains', 'in', 'older_than']),
    value: z.any(),
    logicalOperator: z.enum(['and', 'or']).optional()
  })),
  actions: z.array(z.object({
    type: z.enum(['archive', 'delete', 'flag']),
    parameters: z.object({
      location: z.string().optional(),
      retentionDays: z.number().min(1).optional(),
      flag: z.string().optional()
    }).optional()
  })),
  schedule: z.object({
    enabled: z.boolean(),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    time: z.string(),
    nextRun: z.string()
  }).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
})

export const cleanupRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean(),
  entityType: z.enum(['employees', 'attendance', 'schedules', 'logs', 'temp_files']),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'between', 'contains', 'in', 'older_than']),
    value: z.any(),
    logicalOperator: z.enum(['and', 'or']).optional()
  })),
  dryRun: z.boolean(),
  schedule: z.object({
    enabled: z.boolean(),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    time: z.string(),
    nextRun: z.string()
  }).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
})

export const dataRetentionPolicySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  entityType: z.enum(['employees', 'attendance', 'schedules']),
  retentionPeriod: z.number().min(1),
  archivalAction: z.enum(['archive', 'delete']),
  archivalDelay: z.number().min(0),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'between', 'contains', 'in', 'older_than']),
    value: z.any()
  })),
  enabled: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
})

// Validation functions
export function validateImportConfig(config: ImportConfig): { isValid: boolean; errors: ValidationError[] } {
  try {
    importConfigSchema.parse(config)
    return { isValid: true, errors: [] }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        value: 'received' in err ? err.received : undefined
      }))
      return { isValid: false, errors }
    }
    return { 
      isValid: false, 
      errors: [{ field: 'unknown', message: 'Unknown validation error', value: error }] 
    }
  }
}

export function validateExportConfig(config: ExportConfig): { isValid: boolean; errors: ValidationError[] } {
  try {
    exportConfigSchema.parse(config)
    return { isValid: true, errors: [] }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        value: 'received' in err ? err.received : undefined
      }))
      return { isValid: false, errors }
    }
    return { 
      isValid: false, 
      errors: [{ field: 'unknown', message: 'Unknown validation error', value: error }] 
    }
  }
}

export function validateBackupConfig(config: BackupConfig): { isValid: boolean; errors: ValidationError[] } {
  try {
    backupConfigSchema.parse(config)
    return { isValid: true, errors: [] }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        value: 'received' in err ? err.received : undefined
      }))
      return { isValid: false, errors }
    }
    return { 
      isValid: false, 
      errors: [{ field: 'unknown', message: 'Unknown validation error', value: error }] 
    }
  }
}

export function validateRestoreConfig(config: RestoreConfig): { isValid: boolean; errors: ValidationError[] } {
  try {
    restoreConfigSchema.parse(config)
    return { isValid: true, errors: [] }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        value: 'received' in err ? err.received : undefined
      }))
      return { isValid: false, errors }
    }
    return { 
      isValid: false, 
      errors: [{ field: 'unknown', message: 'Unknown validation error', value: error }] 
    }
  }
}

export function validateArchivalRule(rule: ArchivalRule): { isValid: boolean; errors: ValidationError[] } {
  try {
    archivalRuleSchema.parse(rule)
    return { isValid: true, errors: [] }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        value: 'received' in err ? err.received : undefined
      }))
      return { isValid: false, errors }
    }
    return { 
      isValid: false, 
      errors: [{ field: 'unknown', message: 'Unknown validation error', value: error }] 
    }
  }
}

export function validateCleanupRule(rule: CleanupRule): { isValid: boolean; errors: ValidationError[] } {
  try {
    cleanupRuleSchema.parse(rule)
    return { isValid: true, errors: [] }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        value: 'received' in err ? err.received : undefined
      }))
      return { isValid: false, errors }
    }
    return { 
      isValid: false, 
      errors: [{ field: 'unknown', message: 'Unknown validation error', value: error }] 
    }
  }
}

export function validateDataRetentionPolicy(policy: DataRetentionPolicy): { isValid: boolean; errors: ValidationError[] } {
  try {
    dataRetentionPolicySchema.parse(policy)
    return { isValid: true, errors: [] }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        value: 'received' in err ? err.received : undefined
      }))
      return { isValid: false, errors }
    }
    return { 
      isValid: false, 
      errors: [{ field: 'unknown', message: 'Unknown validation error', value: error }] 
    }
  }
}

// Custom validation functions
export function validateFile(file: File, allowedTypes: string[], maxSize: number): { isValid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push({
      field: 'file',
      message: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      value: file.type
    })
  }
  
  // Check file size
  if (file.size > maxSize) {
    errors.push({
      field: 'file',
      message: `File size ${file.size} exceeds maximum allowed size of ${maxSize}`,
      value: file.size
    })
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validateEmail(email: string): { isValid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(email)) {
    errors.push({
      field: 'email',
      message: 'Invalid email format',
      value: email
    })
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validateDate(date: string, format?: string): { isValid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  const parsedDate = new Date(date)
  
  if (isNaN(parsedDate.getTime())) {
    errors.push({
      field: 'date',
      message: 'Invalid date format',
      value: date
    })
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validateRequired(value: any, fieldName: string): { isValid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  
  if (value === null || value === undefined || value === '') {
    errors.push({
      field: fieldName,
      message: `${fieldName} is required`,
      value
    })
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Error creation functions
export function createImportError(code: string, message: string, row?: number, field?: string, details?: any): ImportError {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    row,
    field
  }
}

export function createExportError(code: string, message: string, record?: number, field?: string, details?: any): ExportError {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    record,
    field
  }
}

export function createBackupError(code: string, message: string, table?: string, record?: number, details?: any): BackupError {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    table,
    record
  }
}

export function createRestoreError(code: string, message: string, table?: string, record?: number, details?: any): RestoreError {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    table,
    record
  }
}

// Error codes
export const ERROR_CODES = {
  // Import errors
  IMPORT_FILE_NOT_FOUND: 'IMPORT_FILE_NOT_FOUND',
  IMPORT_INVALID_FILE_TYPE: 'IMPORT_INVALID_FILE_TYPE',
  IMPORT_FILE_TOO_LARGE: 'IMPORT_FILE_TOO_LARGE',
  IMPORT_PARSE_ERROR: 'IMPORT_PARSE_ERROR',
  IMPORT_VALIDATION_ERROR: 'IMPORT_VALIDATION_ERROR',
  IMPORT_MAPPING_ERROR: 'IMPORT_MAPPING_ERROR',
  IMPORT_DATABASE_ERROR: 'IMPORT_DATABASE_ERROR',
  
  // Export errors
  EXPORT_INVALID_FORMAT: 'EXPORT_INVALID_FORMAT',
  EXPORT_NO_DATA: 'EXPORT_NO_DATA',
  EXPORT_GENERATION_ERROR: 'EXPORT_GENERATION_ERROR',
  EXPORT_FILE_ERROR: 'EXPORT_FILE_ERROR',
  
  // Backup errors
  BACKUP_INVALID_CONFIG: 'BACKUP_INVALID_CONFIG',
  BACKUP_CONNECTION_ERROR: 'BACKUP_CONNECTION_ERROR',
  BACKUP_PERMISSION_ERROR: 'BACKUP_PERMISSION_ERROR',
  BACKUP_STORAGE_ERROR: 'BACKUP_STORAGE_ERROR',
  BACKUP_ENCRYPTION_ERROR: 'BACKUP_ENCRYPTION_ERROR',
  
  // Restore errors
  RESTORE_BACKUP_NOT_FOUND: 'RESTORE_BACKUP_NOT_FOUND',
  RESTORE_INVALID_BACKUP: 'RESTORE_INVALID_BACKUP',
  RESTORE_CONFLICT_ERROR: 'RESTORE_CONFLICT_ERROR',
  RESTORE_VALIDATION_ERROR: 'RESTORE_VALIDATION_ERROR',
  RESTORE_DATABASE_ERROR: 'RESTORE_DATABASE_ERROR',
  
  // Archival errors
  ARCHIVAL_RULE_NOT_FOUND: 'ARCHIVAL_RULE_NOT_FOUND',
  ARCHIVAL_INVALID_RULE: 'ARCHIVAL_INVALID_RULE',
  ARCHIVAL_EXECUTION_ERROR: 'ARCHIVAL_EXECUTION_ERROR',
  ARCHIVAL_STORAGE_ERROR: 'ARCHIVAL_STORAGE_ERROR',
  
  // Cleanup errors
  CLEANUP_RULE_NOT_FOUND: 'CLEANUP_RULE_NOT_FOUND',
  CLEANUP_INVALID_RULE: 'CLEANUP_INVALID_RULE',
  CLEANUP_EXECUTION_ERROR: 'CLEANUP_EXECUTION_ERROR',
  
  // General errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const