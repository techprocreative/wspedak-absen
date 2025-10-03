// Data Management Types

// Import/Export Types
export interface ImportConfig {
  fileType: 'csv' | 'excel' | 'json'
  delimiter?: string
  encoding?: string
  hasHeader?: boolean
  fieldMapping?: FieldMapping[]
}

export interface FieldMapping {
  sourceField: string
  targetField: string
  required: boolean
}

export interface ImportResult {
  success: boolean
  totalRows: number
  validRows: number
  invalidRows: number
  errors: string[]
  warnings: string[]
}

export interface ExportConfig {
  format: 'csv' | 'excel' | 'pdf' | 'json'
  fields: string[]
  filters: ExportFilter[]
  filename?: string
  includeHeader?: boolean
  encoding?: string
  delimiter?: string
}

export interface ExportFilter {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in'
  value: any
}

export interface ExportResult {
  success: boolean
  filename: string
  downloadUrl: string
  totalRecords: number
  exportedRecords: number
  fileSize: number
  errors: string[]
  warnings: string[]
}

// Backup/Restore Types
export interface BackupConfig {
  type: 'full' | 'incremental' | 'differential'
  includeTables: string[]
  excludeTables: string[]
  compression: boolean
  compressionLevel: number
  encryption: boolean
  location: string
  filename?: string
  retentionDays: number
}

export interface RestoreConfig {
  backupId: string
  conflictResolution: 'skip' | 'overwrite' | 'merge'
  includeTables: string[]
  excludeTables: string[]
  dryRun: boolean
  validateBeforeRestore: boolean
}

export interface BackupRecord {
  id: string
  name: string
  type: 'full' | 'incremental' | 'differential'
  status: 'completed' | 'failed' | 'running'
  progress: number
  totalRecords: number
  processedRecords: number
  fileSize: number
  compressedSize: number
  encrypted: boolean
  downloadUrl?: string
  errors: string[]
  warnings: string[]
  createdAt: string
  startedAt?: string
  completedAt?: string
  createdBy: string
  location: string
}

export interface BackupSchedule {
  id: string
  name: string
  enabled: boolean
  type: 'full' | 'incremental'
  frequency: 'daily' | 'weekly' | 'monthly'
  time: string
  retentionDays: number
  location: string
  encryption: boolean
  notifications: boolean
  recipients: string[]
  lastRun?: string
  nextRun: string
}

// Archival/Cleanup Types
export interface ArchivalRule {
  id: string
  name: string
  description: string
  enabled: boolean
  entityType: 'employees' | 'attendance' | 'schedules'
  conditions: ArchivalCondition[]
  actions: ArchivalAction[]
  schedule?: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly'
    time: string
    nextRun: string
  }
  createdAt: string
  updatedAt: string
}

export interface ArchivalCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'in' | 'older_than'
  value: any
  logicalOperator?: 'and' | 'or'
}

export interface ArchivalAction {
  type: 'archive' | 'delete' | 'flag'
  parameters?: {
    location?: string
    retentionDays?: number
    flag?: string
  }
}

export interface CleanupRule {
  id: string
  name: string
  description: string
  enabled: boolean
  entityType: 'employees' | 'attendance' | 'schedules' | 'logs' | 'temp_files'
  conditions: CleanupCondition[]
  dryRun: boolean
  schedule?: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly'
    time: string
    nextRun: string
  }
  createdAt: string
  updatedAt: string
}

export interface CleanupCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'in' | 'older_than'
  value: any
  logicalOperator?: 'and' | 'or'
}

export interface ArchivedRecord {
  id: string
  originalId: string
  entityType: 'employees' | 'attendance' | 'schedules'
  data: any
  archivedAt: string
  archivedBy: string
  retentionExpiresAt?: string
  location: string
  size: number
}

export interface DataRetentionPolicy {
  id: string
  name: string
  entityType: 'employees' | 'attendance' | 'schedules'
  retentionPeriod: number // in days
  archivalAction: 'archive' | 'delete'
  archivalDelay: number // in days
  conditions: RetentionCondition[]
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface RetentionCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'in' | 'older_than'
  value: any
}

// Progress Tracking Types
export interface OperationProgress {
  current: number
  total: number
  percentage: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  message?: string
  stage?: string
}

export interface ImportProgress extends OperationProgress {
  currentRow?: number
  totalRows?: number
}

export interface ExportProgress extends OperationProgress {
  currentRecord?: number
  totalRecords?: number
}

export interface BackupProgress extends OperationProgress {
  currentTable?: string
  totalTables?: number
  currentRecord?: number
  totalRecords?: number
}

export interface RestoreProgress extends OperationProgress {
  currentTable?: string
  totalTables?: number
  currentRecord?: number
  totalRecords?: number
}

export interface ArchivalProgress extends OperationProgress {
  currentRecord?: number
  totalRecords?: number
}

// Error Handling Types
export interface DataManagementError {
  code: string
  message: string
  details?: any
  timestamp: string
  stack?: string
}

export interface ValidationError {
  field: string
  message: string
  value?: any
}

export interface ImportError extends DataManagementError {
  row?: number
  field?: string
}

export interface ExportError extends DataManagementError {
  record?: number
  field?: string
}

export interface BackupError extends DataManagementError {
  table?: string
  record?: number
}

export interface RestoreError extends DataManagementError {
  table?: string
  record?: number
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Data Source Types
export type DataSource = 'employees' | 'attendance' | 'schedules'

export interface DataSourceField {
  name: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean'
  required: boolean
  searchable: boolean
  filterable: boolean
  sortable: boolean
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>