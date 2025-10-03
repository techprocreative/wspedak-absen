/**
 * Conflict Types and Interfaces for Offline-First Attendance System
 * Defines the structure and behavior of conflict resolution mechanisms
 */

/**
 * Conflict severity levels
 */
export enum ConflictSeverity {
  LOW = 'low',           // Minor conflicts that can be auto-resolved
  MEDIUM = 'medium',     // Conflicts that may require user attention
  HIGH = 'high',         // Critical conflicts requiring manual resolution
  CRITICAL = 'critical'  // System-blocking conflicts
}

/**
 * Conflict categories for different data types
 */
export enum ConflictCategory {
  ATTENDANCE = 'attendance',       // Attendance record conflicts
  USER = 'user',                   // User profile conflicts
  SETTINGS = 'settings',           // System settings conflicts
  SYNC_METADATA = 'sync_metadata', // Sync metadata conflicts
  CUSTOM = 'custom'                // Custom business logic conflicts
}

/**
 * Resolution outcome types
 */
export enum ResolutionOutcome {
  AUTO_RESOLVED = 'auto_resolved',       // Automatically resolved
  MANUALLY_RESOLVED = 'manually_resolved', // Resolved by user
  PENDING = 'pending',                   // Awaiting resolution
  IGNORED = 'ignored',                   // Conflict was ignored
  ESCALATED = 'escalated'                // Escalated for admin review
}

/**
 * Resolution strategies
 */
export enum ResolutionStrategy {
  LAST_WRITE_WINS = 'last_write_wins',     // Most recent change wins
  FIRST_WRITE_WINS = 'first_write_wins',   // Original change wins
  FIELD_LEVEL = 'field_level',             // Merge field by field
  CUSTOM_BUSINESS_LOGIC = 'custom_logic',  // Apply custom business rules
  MANUAL = 'manual'                        // Require manual resolution
}

/**
 * Base conflict metadata structure
 */
export interface ConflictMetadata {
  id: string;                    // Unique conflict identifier
  timestamp: Date;               // When conflict was detected
  entityType: string;            // Type of entity (e.g., 'attendance', 'user')
  entityId: string;              // ID of the conflicting entity
  severity: ConflictSeverity;    // Severity level
  category: ConflictCategory;    // Conflict category
  resolved: boolean;             // Resolution status
  resolutionOutcome?: ResolutionOutcome; // Outcome of resolution
  resolvedAt?: Date;             // When conflict was resolved
  resolvedBy?: string;           // Who resolved the conflict (user ID or 'system')
  resolutionStrategy?: ResolutionStrategy; // Strategy used for resolution
  retryCount: number;            // Number of resolution attempts
  lastAttemptAt?: Date;          // Last resolution attempt timestamp
  error?: string;                // Error message if resolution failed
  tags?: string[];               // Additional tags for categorization
}

/**
 * Represents a single conflicting field
 */
export interface ConflictedField {
  name: string;                  // Field name
  localValue: any;               // Value from local storage
  remoteValue: any;              // Value from remote storage
  resolvedValue?: any;           // Value after resolution
  resolutionStrategy?: ResolutionStrategy; // Strategy used for this field
}

/**
 * Represents a complete conflict between local and remote data
 */
export interface Conflict {
  metadata: ConflictMetadata;    // Conflict metadata
  localData: Record<string, any>; // Local version of the data
  remoteData: Record<string, any>; // Remote version of the data
  conflictedFields: ConflictedField[]; // List of conflicting fields
  suggestedResolution?: Record<string, any>; // Suggested resolution
  customResolutionData?: any;    // Additional data for custom resolution
}

/**
 * Conflict resolution options
 */
export interface ResolutionOptions {
  strategy: ResolutionStrategy;  // Resolution strategy to use
  autoResolveLowSeverity: boolean; // Auto-resolve low severity conflicts
  maxRetryAttempts: number;      // Maximum retry attempts
  customLogic?: (conflict: Conflict) => Record<string, any>; // Custom resolution logic
  fieldStrategies?: Record<string, ResolutionStrategy>; // Field-specific strategies
}

/**
 * Conflict filter options
 */
export interface ConflictFilterOptions {
  severity?: ConflictSeverity[]; // Filter by severity levels
  category?: ConflictCategory[]; // Filter by categories
  resolved?: boolean;            // Filter by resolution status
  entityType?: string[];         // Filter by entity types
  dateRange?: {
    start: Date;
    end: Date;
  }; // Filter by date range
  tags?: string[];               // Filter by tags
}

/**
 * Conflict statistics
 */
export interface ConflictStats {
  total: number;                 // Total number of conflicts
  resolved: number;              // Number of resolved conflicts
  pending: number;               // Number of pending conflicts
  bySeverity: Record<ConflictSeverity, number>; // Count by severity
  byCategory: Record<ConflictCategory, number>; // Count by category
  byOutcome: Record<ResolutionOutcome, number>; // Count by resolution outcome
  averageResolutionTime?: number; // Average resolution time in ms
}

/**
 * Conflict history entry
 */
export interface ConflictHistoryEntry {
  conflictId: string;            // ID of the conflict
  timestamp: Date;               // When the action occurred
  action: string;                // Action performed (e.g., 'detected', 'resolved')
  userId?: string;               // User who performed the action
  details: Record<string, any>;  // Additional details about the action
}

/**
 * Conflict resolution context
 */
export interface ConflictResolutionContext {
  conflicts: Conflict[];         // Current conflicts
  stats: ConflictStats;          // Conflict statistics
  history: ConflictHistoryEntry[]; // Conflict history
  options: ResolutionOptions;    // Resolution options
}

/**
 * Manual resolution request
 */
export interface ManualResolutionRequest {
  conflictId: string;            // ID of the conflict to resolve
  resolution: Record<string, any>; // Manual resolution data
  strategy: ResolutionStrategy;  // Strategy used for resolution
  userId: string;                // User resolving the conflict
  notes?: string;                // Optional notes about the resolution
}

/**
 * Conflict notification
 */
export interface ConflictNotification {
  id: string;                    // Notification ID
  conflictId: string;            // Associated conflict ID
  type: 'new' | 'resolved' | 'escalated'; // Notification type
  message: string;               // Notification message
  timestamp: Date;               // When notification was created
  read: boolean;                 // Whether notification has been read
  severity: ConflictSeverity;    // Severity level
  actionUrl?: string;            // URL to take action
}