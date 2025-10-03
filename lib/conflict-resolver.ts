/**
 * Conflict Resolution System for Offline-First Attendance System
 * Implements conflict detection, resolution strategies, and tracking
 */

import { 
  Conflict, 
  ConflictMetadata, 
  ConflictedField, 
  ResolutionOptions, 
  ResolutionStrategy, 
  ConflictSeverity, 
  ConflictCategory, 
  ResolutionOutcome,
  ConflictStats,
  ConflictHistoryEntry,
  ManualResolutionRequest,
  ConflictNotification
} from './conflict-types';

/**
 * Default resolution options
 */
const DEFAULT_RESOLUTION_OPTIONS: ResolutionOptions = {
  strategy: ResolutionStrategy.LAST_WRITE_WINS,
  autoResolveLowSeverity: true,
  maxRetryAttempts: 3,
};

/**
 * Conflict Resolver class
 */
export class ConflictResolver {
  private options: ResolutionOptions;
  private conflicts: Map<string, Conflict> = new Map();
  private history: ConflictHistoryEntry[] = [];
  private notifications: ConflictNotification[] = [];
  private stats: ConflictStats = {
    total: 0,
    resolved: 0,
    pending: 0,
    bySeverity: {
      [ConflictSeverity.LOW]: 0,
      [ConflictSeverity.MEDIUM]: 0,
      [ConflictSeverity.HIGH]: 0,
      [ConflictSeverity.CRITICAL]: 0,
    },
    byCategory: {
      [ConflictCategory.ATTENDANCE]: 0,
      [ConflictCategory.USER]: 0,
      [ConflictCategory.SETTINGS]: 0,
      [ConflictCategory.SYNC_METADATA]: 0,
      [ConflictCategory.CUSTOM]: 0,
    },
    byOutcome: {
      [ResolutionOutcome.AUTO_RESOLVED]: 0,
      [ResolutionOutcome.MANUALLY_RESOLVED]: 0,
      [ResolutionOutcome.PENDING]: 0,
      [ResolutionOutcome.IGNORED]: 0,
      [ResolutionOutcome.ESCALATED]: 0,
    }
  };

  constructor(options: Partial<ResolutionOptions> = {}) {
    this.options = { ...DEFAULT_RESOLUTION_OPTIONS, ...options };
  }

  /**
   * Detect conflicts between local and remote data
   */
  detectConflicts(
    localData: Record<string, any>,
    remoteData: Record<string, any>,
    entityType: string,
    entityId: string,
    category: ConflictCategory = ConflictCategory.CUSTOM
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const conflictedFields: ConflictedField[] = [];
    
    // Get all field names from both local and remote data
    const allFields = new Set([
      ...Object.keys(localData || {}),
      ...Object.keys(remoteData || {})
    ]);

    // Check each field for conflicts
    for (const fieldName of allFields) {
      const localValue = localData?.[fieldName];
      const remoteValue = remoteData?.[fieldName];
      
      // Skip if values are the same
      if (this.isEqual(localValue, remoteValue)) {
        continue;
      }
      
      // Determine severity based on field and entity type
      const severity = this.determineSeverity(fieldName, entityType, localValue, remoteValue);
      
      conflictedFields.push({
        name: fieldName,
        localValue,
        remoteValue,
      });
    }

    // If we have conflicted fields, create a conflict
    if (conflictedFields.length > 0) {
      const conflictId = this.generateConflictId(entityType, entityId);
      const metadata: ConflictMetadata = {
        id: conflictId,
        timestamp: new Date(),
        entityType,
        entityId,
        severity: this.getHighestSeverity(conflictedFields, entityType),
        category,
        resolved: false,
        retryCount: 0,
      };
      
      const conflict: Conflict = {
        metadata,
        localData,
        remoteData,
        conflictedFields,
      };
      
      // Add to conflicts map
      this.conflicts.set(conflictId, conflict);
      
      // Update stats
      this.updateStatsForNewConflict(conflict);
      
      // Add to history
      this.addToHistory(conflictId, 'detected', { conflictedFields: conflictedFields.length });
      
      // Create notification
      this.createNotification(conflict);
      
      conflicts.push(conflict);
      
      // Auto-resolve if enabled and severity is low
      if (this.options.autoResolveLowSeverity && metadata.severity === ConflictSeverity.LOW) {
        this.resolveConflict(conflictId);
      }
    }
    
    return conflicts;
  }

  /**
   * Resolve a conflict by ID
   */
  resolveConflict(conflictId: string, strategy?: ResolutionStrategy): boolean {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      return false;
    }
    
    const resolutionStrategy = strategy || this.options.strategy;
    let resolved = false;
    let resolutionData: Record<string, any> = {};
    
    try {
      switch (resolutionStrategy) {
        case ResolutionStrategy.LAST_WRITE_WINS:
          resolutionData = this.lastWriteWins(conflict);
          resolved = true;
          break;
          
        case ResolutionStrategy.FIRST_WRITE_WINS:
          resolutionData = this.firstWriteWins(conflict);
          resolved = true;
          break;
          
        case ResolutionStrategy.FIELD_LEVEL:
          resolutionData = this.fieldLevelResolution(conflict);
          resolved = true;
          break;
          
        case ResolutionStrategy.CUSTOM_BUSINESS_LOGIC:
          if (this.options.customLogic) {
            resolutionData = this.options.customLogic(conflict);
            resolved = true;
          }
          break;
          
        case ResolutionStrategy.MANUAL:
          // Manual resolution requires user input
          resolved = false;
          break;
      }
      
      if (resolved) {
        // Update conflict with resolution data
        conflict.metadata.resolved = true;
        conflict.metadata.resolutionOutcome = ResolutionOutcome.AUTO_RESOLVED;
        conflict.metadata.resolvedAt = new Date();
        conflict.metadata.resolvedBy = 'system';
        conflict.metadata.resolutionStrategy = resolutionStrategy;
        conflict.suggestedResolution = resolutionData;
        
        // Update conflicted fields with resolved values
        conflict.conflictedFields.forEach(field => {
          field.resolvedValue = resolutionData[field.name];
          field.resolutionStrategy = resolutionStrategy;
        });
        
        // Update stats
        this.updateStatsForResolvedConflict(conflict);
        
        // Add to history
        this.addToHistory(conflictId, 'resolved', { 
          strategy: resolutionStrategy,
          outcome: ResolutionOutcome.AUTO_RESOLVED
        });
        
        // Create notification
        this.createNotification(conflict, 'resolved');
      }
    } catch (error) {
      // Handle resolution error
      conflict.metadata.error = error instanceof Error ? error.message : String(error);
      conflict.metadata.retryCount += 1;
      conflict.metadata.lastAttemptAt = new Date();
      
      // Add to history
      this.addToHistory(conflictId, 'error', { 
        error: conflict.metadata.error,
        retryCount: conflict.metadata.retryCount
      });
      
      // If max retries reached, escalate
      if (conflict.metadata.retryCount >= this.options.maxRetryAttempts) {
        this.escalateConflict(conflictId);
      }
    }
    
    return resolved;
  }

  /**
   * Manually resolve a conflict
   */
  manuallyResolveConflict(request: ManualResolutionRequest): boolean {
    const conflict = this.conflicts.get(request.conflictId);
    if (!conflict) {
      return false;
    }
    
    try {
      // Update conflict with resolution data
      conflict.metadata.resolved = true;
      conflict.metadata.resolutionOutcome = ResolutionOutcome.MANUALLY_RESOLVED;
      conflict.metadata.resolvedAt = new Date();
      conflict.metadata.resolvedBy = request.userId;
      conflict.metadata.resolutionStrategy = request.strategy;
      conflict.suggestedResolution = request.resolution;
      conflict.customResolutionData = {
        notes: request.notes,
        userId: request.userId
      };
      
      // Update conflicted fields with resolved values
      Object.keys(request.resolution).forEach(fieldName => {
        const field = conflict.conflictedFields.find(f => f.name === fieldName);
        if (field) {
          field.resolvedValue = request.resolution[fieldName];
          field.resolutionStrategy = request.strategy;
        }
      });
      
      // Update stats
      this.updateStatsForResolvedConflict(conflict);
      
      // Add to history
      this.addToHistory(request.conflictId, 'manually_resolved', { 
        strategy: request.strategy,
        userId: request.userId,
        notes: request.notes
      });
      
      // Create notification
      this.createNotification(conflict, 'resolved');
      
      return true;
    } catch (error) {
      // Handle resolution error
      conflict.metadata.error = error instanceof Error ? error.message : String(error);
      conflict.metadata.retryCount += 1;
      conflict.metadata.lastAttemptAt = new Date();
      
      // Add to history
      this.addToHistory(request.conflictId, 'error', { 
        error: conflict.metadata.error,
        retryCount: conflict.metadata.retryCount
      });
      
      return false;
    }
  }

  /**
   * Escalate a conflict for admin review
   */
  escalateConflict(conflictId: string): boolean {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      return false;
    }
    
    conflict.metadata.resolutionOutcome = ResolutionOutcome.ESCALATED;
    conflict.metadata.severity = ConflictSeverity.CRITICAL;
    
    // Update stats
    this.stats.byOutcome[ResolutionOutcome.ESCALATED] += 1;
    this.stats.bySeverity[ConflictSeverity.CRITICAL] += 1;
    
    // Add to history
    this.addToHistory(conflictId, 'escalated', {});
    
    // Create notification
    this.createNotification(conflict, 'escalated');
    
    return true;
  }

  /**
   * Get all conflicts
   */
  getConflicts(): Conflict[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Get conflict by ID
   */
  getConflict(conflictId: string): Conflict | undefined {
    return this.conflicts.get(conflictId);
  }

  /**
   * Get conflict statistics
   */
  getStats(): ConflictStats {
    return { ...this.stats };
  }

  /**
   * Get conflict history
   */
  getHistory(): ConflictHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Get notifications
   */
  getNotifications(): ConflictNotification[] {
    return [...this.notifications];
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId: string): boolean {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  }

  /**
   * Clear resolved conflicts
   */
  clearResolvedConflicts(): number {
    let count = 0;
    for (const [id, conflict] of this.conflicts.entries()) {
      if (conflict.metadata.resolved) {
        this.conflicts.delete(id);
        count++;
      }
    }
    return count;
  }

  /**
   * Last Write Wins resolution strategy
   */
  private lastWriteWins(conflict: Conflict): Record<string, any> {
    const resolution: Record<string, any> = {};
    
    // For attendance records, check timestamps
    if (conflict.metadata.category === ConflictCategory.ATTENDANCE) {
      const localTimestamp = new Date(conflict.localData.updated_at || conflict.localData.created_at || 0);
      const remoteTimestamp = new Date(conflict.remoteData.updated_at || conflict.remoteData.created_at || 0);
      
      conflict.conflictedFields.forEach(field => {
        if (localTimestamp > remoteTimestamp) {
          resolution[field.name] = field.localValue;
        } else {
          resolution[field.name] = field.remoteValue;
        }
      });
    } else {
      // For other entities, prefer remote data
      conflict.conflictedFields.forEach(field => {
        resolution[field.name] = field.remoteValue;
      });
    }
    
    return resolution;
  }

  /**
   * First Write Wins resolution strategy
   */
  private firstWriteWins(conflict: Conflict): Record<string, any> {
    const resolution: Record<string, any> = {};
    
    // For attendance records, check timestamps
    if (conflict.metadata.category === ConflictCategory.ATTENDANCE) {
      const localTimestamp = new Date(conflict.localData.created_at || 0);
      const remoteTimestamp = new Date(conflict.remoteData.created_at || 0);
      
      conflict.conflictedFields.forEach(field => {
        if (localTimestamp < remoteTimestamp) {
          resolution[field.name] = field.localValue;
        } else {
          resolution[field.name] = field.remoteValue;
        }
      });
    } else {
      // For other entities, prefer local data
      conflict.conflictedFields.forEach(field => {
        resolution[field.name] = field.localValue;
      });
    }
    
    return resolution;
  }

  /**
   * Field Level resolution strategy
   */
  private fieldLevelResolution(conflict: Conflict): Record<string, any> {
    const resolution: Record<string, any> = {};
    
    conflict.conflictedFields.forEach(field => {
      // Use field-specific strategy if available
      const fieldStrategy = this.options.fieldStrategies?.[field.name];
      
      if (fieldStrategy === ResolutionStrategy.LAST_WRITE_WINS) {
        // For attendance records, check timestamps
        if (conflict.metadata.category === ConflictCategory.ATTENDANCE) {
          const localTimestamp = new Date(conflict.localData.updated_at || conflict.localData.created_at || 0);
          const remoteTimestamp = new Date(conflict.remoteData.updated_at || conflict.remoteData.created_at || 0);
          
          resolution[field.name] = localTimestamp > remoteTimestamp ? field.localValue : field.remoteValue;
        } else {
          // Default to remote
          resolution[field.name] = field.remoteValue;
        }
      } else if (fieldStrategy === ResolutionStrategy.FIRST_WRITE_WINS) {
        // For attendance records, check timestamps
        if (conflict.metadata.category === ConflictCategory.ATTENDANCE) {
          const localTimestamp = new Date(conflict.localData.created_at || 0);
          const remoteTimestamp = new Date(conflict.remoteData.created_at || 0);
          
          resolution[field.name] = localTimestamp < remoteTimestamp ? field.localValue : field.remoteValue;
        } else {
          // Default to local
          resolution[field.name] = field.localValue;
        }
      } else {
        // Default to global strategy
        if (this.options.strategy === ResolutionStrategy.LAST_WRITE_WINS) {
          resolution[field.name] = field.remoteValue;
        } else {
          resolution[field.name] = field.localValue;
        }
      }
    });
    
    return resolution;
  }

  /**
   * Determine severity of a conflict
   */
  private determineSeverity(
    fieldName: string, 
    entityType: string, 
    localValue: any, 
    remoteValue: any
  ): ConflictSeverity {
    // Critical fields for attendance records
    if (entityType === 'attendance') {
      if (fieldName === 'id' || fieldName === 'user_id' || fieldName === 'timestamp') {
        return ConflictSeverity.CRITICAL;
      }
      if (fieldName === 'status' || fieldName === 'location_id') {
        return ConflictSeverity.HIGH;
      }
      if (fieldName === 'notes' || fieldName === 'photo_url') {
        return ConflictSeverity.LOW;
      }
    }
    
    // Critical fields for user records
    if (entityType === 'user') {
      if (fieldName === 'id' || fieldName === 'email' || fieldName === 'role') {
        return ConflictSeverity.CRITICAL;
      }
      if (fieldName === 'name' || fieldName === 'department') {
        return ConflictSeverity.HIGH;
      }
      if (fieldName === 'profile_image' || fieldName === 'bio') {
        return ConflictSeverity.LOW;
      }
    }
    
    // Default to medium severity
    return ConflictSeverity.MEDIUM;
  }

  /**
   * Get the highest severity from conflicted fields
   */
  private getHighestSeverity(conflictedFields: ConflictedField[], entityType: string): ConflictSeverity {
    let highestSeverity = ConflictSeverity.LOW;
    
    conflictedFields.forEach(field => {
      const severity = this.determineSeverity(field.name, entityType, field.localValue, field.remoteValue);
      if (severity > highestSeverity) {
        highestSeverity = severity;
      }
    });
    
    return highestSeverity;
  }

  /**
   * Generate a unique conflict ID
   */
  private generateConflictId(entityType: string, entityId: string): string {
    return `${entityType}_${entityId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if two values are equal
   */
  private isEqual(value1: any, value2: any): boolean {
    if (value1 === value2) return true;
    
    // Handle null/undefined
    if (value1 == null || value2 == null) return value1 === value2;
    
    // Handle dates
    if (value1 instanceof Date && value2 instanceof Date) {
      return value1.getTime() === value2.getTime();
    }
    
    // Handle objects
    if (typeof value1 === 'object' && typeof value2 === 'object') {
      return JSON.stringify(value1) === JSON.stringify(value2);
    }
    
    return false;
  }

  /**
   * Update stats for a new conflict
   */
  private updateStatsForNewConflict(conflict: Conflict): void {
    this.stats.total += 1;
    this.stats.pending += 1;
    this.stats.bySeverity[conflict.metadata.severity] += 1;
    this.stats.byCategory[conflict.metadata.category] += 1;
    this.stats.byOutcome[ResolutionOutcome.PENDING] += 1;
  }

  /**
   * Update stats for a resolved conflict
   */
  private updateStatsForResolvedConflict(conflict: Conflict): void {
    this.stats.resolved += 1;
    this.stats.pending -= 1;
    
    if (conflict.metadata.resolutionOutcome) {
      this.stats.byOutcome[conflict.metadata.resolutionOutcome] += 1;
      this.stats.byOutcome[ResolutionOutcome.PENDING] -= 1;
    }
    
    // Calculate average resolution time
    if (conflict.metadata.resolvedAt) {
      const resolutionTime = conflict.metadata.resolvedAt.getTime() - conflict.metadata.timestamp.getTime();
      if (this.stats.averageResolutionTime) {
        this.stats.averageResolutionTime = (this.stats.averageResolutionTime + resolutionTime) / 2;
      } else {
        this.stats.averageResolutionTime = resolutionTime;
      }
    }
  }

  /**
   * Add entry to conflict history
   */
  private addToHistory(
    conflictId: string, 
    action: string, 
    details: Record<string, any> = {}
  ): void {
    const entry: ConflictHistoryEntry = {
      conflictId,
      timestamp: new Date(),
      action,
      details
    };
    
    this.history.push(entry);
    
    // Keep history at a reasonable size
    if (this.history.length > 1000) {
      this.history = this.history.slice(-1000);
    }
  }

  /**
   * Create a notification for a conflict
   */
  private createNotification(conflict: Conflict, type: 'new' | 'resolved' | 'escalated' = 'new'): void {
    const notification: ConflictNotification = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conflictId: conflict.metadata.id,
      type,
      message: this.getNotificationMessage(conflict, type),
      timestamp: new Date(),
      read: false,
      severity: conflict.metadata.severity,
      actionUrl: `/conflicts/${conflict.metadata.id}`
    };
    
    this.notifications.push(notification);
    
    // Keep notifications at a reasonable size
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(-100);
    }
  }

  /**
   * Get notification message based on conflict and type
   */
  private getNotificationMessage(conflict: Conflict, type: 'new' | 'resolved' | 'escalated'): string {
    const { entityType, entityId, severity } = conflict.metadata;
    
    switch (type) {
      case 'new':
        return `New ${severity} conflict detected for ${entityType} ${entityId}`;
      case 'resolved':
        return `Conflict for ${entityType} ${entityId} has been resolved`;
      case 'escalated':
        return `Conflict for ${entityType} ${entityId} has been escalated for admin review`;
      default:
        return `Conflict update for ${entityType} ${entityId}`;
    }
  }
}

// Export a singleton instance
export const conflictResolver = new ConflictResolver();