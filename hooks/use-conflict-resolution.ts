/**
 * Conflict Resolution Hook
 * Provides React hooks for conflict management, detection, and resolution
 */

import { useState, useEffect, useCallback } from 'react';
import { Conflict, ConflictStats, ConflictHistoryEntry, ResolutionStrategy, ManualResolutionRequest, ConflictFilterOptions } from '@/lib/conflict-types';
import { ConflictResolver } from '@/lib/conflict-resolver';
import { useConflictResolutionContext } from '@/components/conflict-resolution/ConflictResolutionProvider';

/**
 * Hook for conflict resolution functionality
 */
export const useConflictResolution = () => {
  const context = useConflictResolutionContext();
  const [resolver] = useState(() => new ConflictResolver());
  const [filteredConflicts, setFilteredConflicts] = useState<Conflict[]>([]);
  const [filterOptions, setFilterOptions] = useState<ConflictFilterOptions>({});

  // Update filtered conflicts when conflicts or filter options change
  useEffect(() => {
    let result = [...context.state.conflicts];
    
    // Apply filters
    if (filterOptions.severity && filterOptions.severity.length > 0) {
      result = result.filter(conflict => filterOptions.severity!.includes(conflict.metadata.severity));
    }
    
    if (filterOptions.category && filterOptions.category.length > 0) {
      result = result.filter(conflict => filterOptions.category!.includes(conflict.metadata.category));
    }
    
    if (filterOptions.resolved !== undefined) {
      result = result.filter(conflict => conflict.metadata.resolved === filterOptions.resolved);
    }
    
    if (filterOptions.entityType && filterOptions.entityType.length > 0) {
      result = result.filter(conflict => filterOptions.entityType!.includes(conflict.metadata.entityType));
    }
    
    if (filterOptions.dateRange) {
      const { start, end } = filterOptions.dateRange;
      result = result.filter(conflict => {
        const conflictDate = conflict.metadata.timestamp;
        return conflictDate >= start && conflictDate <= end;
      });
    }
    
    if (filterOptions.tags && filterOptions.tags.length > 0) {
      result = result.filter(conflict => {
        if (!conflict.metadata.tags) return false;
        return filterOptions.tags!.some(tag => conflict.metadata.tags!.includes(tag));
      });
    }
    
    setFilteredConflicts(result);
  }, [context.state.conflicts, filterOptions]);

  // Detect conflicts between local and remote data
  const detectConflicts = useCallback(async (
    localData: Record<string, any>,
    remoteData: Record<string, any>,
    entityType: string,
    entityId: string,
    category?: string
  ) => {
    return await context.detectConflicts(localData, remoteData, entityType, entityId, category);
  }, [context]);

  // Resolve a conflict by ID
  const resolveConflict = useCallback(async (conflictId: string, strategy?: ResolutionStrategy) => {
    return await context.resolveConflict(conflictId, strategy);
  }, [context]);

  // Manually resolve a conflict
  const manuallyResolveConflict = useCallback(async (request: ManualResolutionRequest) => {
    return await context.manuallyResolveConflict(request);
  }, [context]);

  // Escalate a conflict
  const escalateConflict = useCallback(async (conflictId: string) => {
    return await context.escalateConflict(conflictId);
  }, [context]);

  // View a conflict
  const viewConflict = useCallback((conflictId: string) => {
    context.viewConflict(conflictId);
  }, [context]);

  // Open conflict modal
  const openConflictModal = useCallback((conflictId?: string) => {
    context.openConflictModal(conflictId);
  }, [context]);

  // Close conflict modal
  const closeConflictModal = useCallback(() => {
    context.closeConflictModal();
  }, [context]);

  // Clear resolved conflicts
  const clearResolvedConflicts = useCallback(() => {
    context.clearResolvedConflicts();
  }, [context]);

  // Mark notification as read
  const markNotificationAsRead = useCallback((notificationId: string) => {
    context.markNotificationAsRead(notificationId);
  }, [context]);

  // Refresh data
  const refreshData = useCallback(async () => {
    await context.refreshData();
  }, [context]);

  // Update filter options
  const updateFilterOptions = useCallback((options: Partial<ConflictFilterOptions>) => {
    setFilterOptions(prev => ({ ...prev, ...options }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilterOptions({});
  }, []);

  // Get conflict by ID
  const getConflict = useCallback((conflictId: string) => {
    return context.state.conflicts.find(c => c.metadata.id === conflictId);
  }, [context.state.conflicts]);

  // Get conflicts by entity type
  const getConflictsByEntityType = useCallback((entityType: string) => {
    return context.state.conflicts.filter(c => c.metadata.entityType === entityType);
  }, [context.state.conflicts]);

  // Get conflicts by severity
  const getConflictsBySeverity = useCallback((severity: string) => {
    return context.state.conflicts.filter(c => c.metadata.severity === severity);
  }, [context.state.conflicts]);

  // Get pending conflicts
  const getPendingConflicts = useCallback(() => {
    return context.state.conflicts.filter(c => !c.metadata.resolved);
  }, [context.state.conflicts]);

  // Get resolved conflicts
  const getResolvedConflicts = useCallback(() => {
    return context.state.conflicts.filter(c => c.metadata.resolved);
  }, [context.state.conflicts]);

  // Get critical conflicts
  const getCriticalConflicts = useCallback(() => {
    return context.state.conflicts.filter(c => c.metadata.severity === 'critical');
  }, [context.state.conflicts]);

  // Get unread notifications
  const getUnreadNotifications = useCallback(() => {
    return context.state.notifications.filter(n => !n.read);
  }, [context.state.notifications]);

  // Get conflict history for a specific conflict
  const getConflictHistory = useCallback((conflictId: string) => {
    return context.state.history.filter(h => h.conflictId === conflictId);
  }, [context.state.history]);

  return {
    // State
    conflicts: context.state.conflicts,
    filteredConflicts,
    stats: context.state.stats,
    history: context.state.history,
    selectedConflict: context.state.selectedConflict,
    isModalOpen: context.state.isModalOpen,
    isLoading: context.state.isLoading,
    notifications: context.state.notifications,
    filterOptions,
    
    // Actions
    loadConflicts: context.loadConflicts,
    detectConflicts,
    resolveConflict,
    manuallyResolveConflict,
    escalateConflict,
    viewConflict,
    openConflictModal,
    closeConflictModal,
    clearResolvedConflicts,
    markNotificationAsRead,
    refreshData,
    updateFilterOptions,
    clearFilters,
    
    // Utility functions
    getConflict,
    getConflictsByEntityType,
    getConflictsBySeverity,
    getPendingConflicts,
    getResolvedConflicts,
    getCriticalConflicts,
    getUnreadNotifications,
    getConflictHistory
  };
};

/**
 * Hook for conflict notifications
 */
export const useConflictNotifications = () => {
  const { notifications, markNotificationAsRead, getUnreadNotifications } = useConflictResolution();
  const [unreadCount, setUnreadCount] = useState(0);

  // Update unread count when notifications change
  useEffect(() => {
    setUnreadCount(getUnreadNotifications().length);
  }, [notifications, getUnreadNotifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    getUnreadNotifications().forEach(notification => {
      markNotificationAsRead(notification.id);
    });
  }, [getUnreadNotifications, markNotificationAsRead]);

  return {
    notifications,
    unreadCount,
    markNotificationAsRead,
    markAllAsRead,
    getUnreadNotifications
  };
};

/**
 * Hook for conflict statistics
 */
export const useConflictStats = () => {
  const { stats, conflicts } = useConflictResolution();
  const [pendingBySeverity, setPendingBySeverity] = useState<Record<string, number>>({});
  const [pendingByCategory, setPendingByCategory] = useState<Record<string, number>>({});

  // Calculate pending conflicts by severity
  useEffect(() => {
    const pending = conflicts.filter(c => !c.metadata.resolved);
    const bySeverity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    
    pending.forEach(conflict => {
      bySeverity[conflict.metadata.severity] = (bySeverity[conflict.metadata.severity] || 0) + 1;
      byCategory[conflict.metadata.category] = (byCategory[conflict.metadata.category] || 0) + 1;
    });
    
    setPendingBySeverity(bySeverity);
    setPendingByCategory(byCategory);
  }, [conflicts]);

  return {
    stats,
    pendingBySeverity,
    pendingByCategory
  };
};

/**
 * Hook for conflict history
 */
export const useConflictHistory = (conflictId?: string) => {
  const { history, getConflictHistory } = useConflictResolution();
  const [conflictHistory, setConflictHistory] = useState<ConflictHistoryEntry[]>([]);

  // Get history for specific conflict or all history
  useEffect(() => {
    if (conflictId) {
      setConflictHistory(getConflictHistory(conflictId));
    } else {
      setConflictHistory(history);
    }
  }, [conflictId, history, getConflictHistory]);

  return {
    history: conflictHistory,
    fullHistory: history
  };
};

/**
 * Hook for auto-resolution
 */
export const useAutoResolution = (options?: {
  autoResolveLowSeverity?: boolean;
  maxRetryAttempts?: number;
  strategy?: ResolutionStrategy;
}) => {
  const { 
    conflicts, 
    resolveConflict, 
    detectConflicts,
    getPendingConflicts 
  } = useConflictResolution();
  
  const [isAutoResolving, setIsAutoResolving] = useState(false);
  const [autoResolveCount, setAutoResolveCount] = useState(0);

  // Auto-resolve low severity conflicts
  const autoResolveConflicts = useCallback(async () => {
    setIsAutoResolving(true);
    let count = 0;
    
    try {
      const pendingConflicts = getPendingConflicts();
      const lowSeverityConflicts = pendingConflicts.filter(
        c => c.metadata.severity === 'low' || (options?.autoResolveLowSeverity !== false)
      );
      
      for (const conflict of lowSeverityConflicts) {
        const success = await resolveConflict(
          conflict.metadata.id, 
          options?.strategy || ResolutionStrategy.LAST_WRITE_WINS
        );
        
        if (success) {
          count++;
        }
      }
      
      setAutoResolveCount(prev => prev + count);
    } catch (error) {
      console.error('Error auto-resolving conflicts:', error);
    } finally {
      setIsAutoResolving(false);
    }
    
    return count;
  }, [getPendingConflicts, resolveConflict, options]);

  // Check for conflicts and auto-resolve if needed
  const checkAndAutoResolve = useCallback(async (
    localData: Record<string, any>,
    remoteData: Record<string, any>,
    entityType: string,
    entityId: string,
    category?: string
  ) => {
    const newConflicts = await detectConflicts(localData, remoteData, entityType, entityId, category);
    
    if (newConflicts.length > 0) {
      // Auto-resolve if enabled
      if (options?.autoResolveLowSeverity !== false) {
        await autoResolveConflicts();
      }
    }
    
    return newConflicts;
  }, [detectConflicts, autoResolveConflicts, options]);

  return {
    isAutoResolving,
    autoResolveCount,
    autoResolveConflicts,
    checkAndAutoResolve
  };
};

/**
 * Hook for manual resolution
 */
export const useManualResolution = (conflictId?: string) => {
  const { 
    getConflict, 
    manuallyResolveConflict, 
    escalateConflict,
    openConflictModal,
    closeConflictModal 
  } = useConflictResolution();
  
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState<ResolutionStrategy>(ResolutionStrategy.MANUAL);
  const [fieldResolutions, setFieldResolutions] = useState<Record<string, any>>({});

  const conflict = conflictId ? getConflict(conflictId) : null;

  // Submit manual resolution
  const submitManualResolution = useCallback(async () => {
    if (!conflict) return false;
    
    setIsResolving(true);
    
    try {
      const request: ManualResolutionRequest = {
        conflictId: conflict.metadata.id,
        resolution: fieldResolutions,
        strategy: selectedStrategy,
        userId: 'current-user', // This should come from auth context
        notes: resolutionNotes
      };
      
      const success = await manuallyResolveConflict(request);
      
      if (success) {
        closeConflictModal();
        // Reset form
        setResolutionNotes('');
        setFieldResolutions({});
      }
      
      return success;
    } catch (error) {
      console.error('Error manually resolving conflict:', error);
      return false;
    } finally {
      setIsResolving(false);
    }
  }, [conflict, fieldResolutions, selectedStrategy, resolutionNotes, manuallyResolveConflict, closeConflictModal]);

  // Escalate conflict
  const escalate = useCallback(async () => {
    if (!conflict) return false;
    
    setIsResolving(true);
    
    try {
      const success = await escalateConflict(conflict.metadata.id);
      
      if (success) {
        closeConflictModal();
      }
      
      return success;
    } catch (error) {
      console.error('Error escalating conflict:', error);
      return false;
    } finally {
      setIsResolving(false);
    }
  }, [conflict, escalateConflict, closeConflictModal]);

  // Open resolution modal
  const openResolutionModal = useCallback(() => {
    if (conflictId) {
      openConflictModal(conflictId);
    }
  }, [conflictId, openConflictModal]);

  return {
    conflict,
    isResolving,
    resolutionNotes,
    selectedStrategy,
    fieldResolutions,
    setResolutionNotes,
    setSelectedStrategy,
    setFieldResolutions,
    submitManualResolution,
    escalate,
    openResolutionModal,
    closeConflictModal
  };
};