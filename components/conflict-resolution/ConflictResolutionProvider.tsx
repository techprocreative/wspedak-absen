/**
 * Conflict Resolution Provider
 * Provides context management for conflict resolution across the application
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Conflict, ConflictStats, ConflictHistoryEntry, ResolutionStrategy, ManualResolutionRequest } from '@/lib/conflict-types';
import { ConflictResolver } from '@/lib/conflict-resolver';

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// Initial state
interface ConflictResolutionState {
  conflicts: Conflict[];
  stats: ConflictStats;
  history: ConflictHistoryEntry[];
  selectedConflict: Conflict | null;
  isModalOpen: boolean;
  isLoading: boolean;
  notifications: any[];
}

// Initial state
const initialState: ConflictResolutionState = {
  conflicts: [],
  stats: {
    total: 0,
    resolved: 0,
    pending: 0,
    bySeverity: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    },
    byCategory: {
      attendance: 0,
      user: 0,
      settings: 0,
      sync_metadata: 0,
      custom: 0,
    },
    byOutcome: {
      auto_resolved: 0,
      manually_resolved: 0,
      pending: 0,
      ignored: 0,
      escalated: 0,
    }
  },
  history: [],
  selectedConflict: null,
  isModalOpen: false,
  isLoading: false,
  notifications: []
};

// Action types
type ConflictResolutionAction =
  | { type: 'SET_CONFLICTS'; payload: Conflict[] }
  | { type: 'ADD_CONFLICT'; payload: Conflict }
  | { type: 'UPDATE_CONFLICT'; payload: Conflict }
  | { type: 'REMOVE_CONFLICT'; payload: string }
  | { type: 'SET_STATS'; payload: ConflictStats }
  | { type: 'SET_HISTORY'; payload: ConflictHistoryEntry[] }
  | { type: 'ADD_HISTORY_ENTRY'; payload: ConflictHistoryEntry }
  | { type: 'SET_SELECTED_CONFLICT'; payload: Conflict | null }
  | { type: 'SET_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_NOTIFICATIONS'; payload: any[] }
  | { type: 'ADD_NOTIFICATION'; payload: any }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_RESOLVED_CONFLICTS' }
  | { type: 'RESET_STATE' };

// Reducer
const conflictResolutionReducer = (
  state: ConflictResolutionState,
  action: ConflictResolutionAction
): ConflictResolutionState => {
  switch (action.type) {
    case 'SET_CONFLICTS':
      return { ...state, conflicts: action.payload };
    
    case 'ADD_CONFLICT':
      return { 
        ...state, 
        conflicts: [...state.conflicts, action.payload] 
      };
    
    case 'UPDATE_CONFLICT':
      return {
        ...state,
        conflicts: state.conflicts.map(conflict =>
          conflict.metadata.id === action.payload.metadata.id 
            ? action.payload 
            : conflict
        )
      };
    
    case 'REMOVE_CONFLICT':
      return {
        ...state,
        conflicts: state.conflicts.filter(
          conflict => conflict.metadata.id !== action.payload
        )
      };
    
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    
    case 'SET_HISTORY':
      return { ...state, history: action.payload };
    
    case 'ADD_HISTORY_ENTRY':
      return { 
        ...state, 
        history: [...state.history, action.payload] 
      };
    
    case 'SET_SELECTED_CONFLICT':
      return { ...state, selectedConflict: action.payload };
    
    case 'SET_MODAL_OPEN':
      return { ...state, isModalOpen: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload };
    
    case 'ADD_NOTIFICATION':
      return { 
        ...state, 
        notifications: [...state.notifications, action.payload] 
      };
    
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, read: true }
            : notification
        )
      };
    
    case 'CLEAR_RESOLVED_CONFLICTS':
      return {
        ...state,
        conflicts: state.conflicts.filter(conflict => !conflict.metadata.resolved)
      };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
};

// Context
interface ConflictResolutionContextType {
  state: ConflictResolutionState;
  // Actions
  loadConflicts: () => Promise<void>;
  detectConflicts: (
    localData: Record<string, any>,
    remoteData: Record<string, any>,
    entityType: string,
    entityId: string,
    category?: string
  ) => Promise<Conflict[]>;
  resolveConflict: (conflictId: string, strategy?: ResolutionStrategy) => Promise<boolean>;
  manuallyResolveConflict: (request: ManualResolutionRequest) => Promise<boolean>;
  escalateConflict: (conflictId: string) => Promise<boolean>;
  viewConflict: (conflictId: string) => void;
  openConflictModal: (conflictId?: string) => void;
  closeConflictModal: () => void;
  clearResolvedConflicts: () => void;
  markNotificationAsRead: (notificationId: string) => void;
  refreshData: () => Promise<void>;
}

const ConflictResolutionContext = createContext<ConflictResolutionContextType | undefined>(undefined);

// Provider component
interface ConflictResolutionProviderProps {
  children: ReactNode;
  resolver?: ConflictResolver;
}

export const ConflictResolutionProvider: React.FC<ConflictResolutionProviderProps> = ({
  children,
  resolver = new ConflictResolver()
}) => {
  const [state, dispatch] = useReducer(conflictResolutionReducer, initialState);

  // Load conflicts from resolver
  const loadConflicts = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const conflicts = resolver.getConflicts();
      const stats = resolver.getStats();
      const history = resolver.getHistory();
      const notifications = resolver.getNotifications();
      
      dispatch({ type: 'SET_CONFLICTS', payload: conflicts });
      dispatch({ type: 'SET_STATS', payload: stats });
      dispatch({ type: 'SET_HISTORY', payload: history });
      dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications });
    } catch (error) {
      logger.error('Error loading conflicts', error as Error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Detect conflicts
  const detectConflicts = async (
    localData: Record<string, any>,
    remoteData: Record<string, any>,
    entityType: string,
    entityId: string,
    category?: string
  ): Promise<Conflict[]> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const conflicts = resolver.detectConflicts(
        localData,
        remoteData,
        entityType,
        entityId,
        category as any
      );
      
      // Update state with new conflicts
      conflicts.forEach(conflict => {
        dispatch({ type: 'ADD_CONFLICT', payload: conflict });
      });
      
      // Update stats and other data
      const stats = resolver.getStats();
      const history = resolver.getHistory();
      const notifications = resolver.getNotifications();
      
      dispatch({ type: 'SET_STATS', payload: stats });
      dispatch({ type: 'SET_HISTORY', payload: history });
      dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications });
      
      return conflicts;
    } catch (error) {
      logger.error('Error detecting conflicts', error as Error);
      return [];
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Resolve conflict
  const resolveConflict = async (conflictId: string, strategy?: ResolutionStrategy): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const success = resolver.resolveConflict(conflictId, strategy);
      
      if (success) {
        // Update conflict in state
        const updatedConflict = resolver.getConflict(conflictId);
        if (updatedConflict) {
          dispatch({ type: 'UPDATE_CONFLICT', payload: updatedConflict });
        }
        
        // Update stats and other data
        const stats = resolver.getStats();
        const history = resolver.getHistory();
        const notifications = resolver.getNotifications();
        
        dispatch({ type: 'SET_STATS', payload: stats });
        dispatch({ type: 'SET_HISTORY', payload: history });
        dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications });
      }
      
      return success;
    } catch (error) {
      logger.error('Error resolving conflict', error as Error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Manually resolve conflict
  const manuallyResolveConflict = async (request: ManualResolutionRequest): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const success = resolver.manuallyResolveConflict(request);
      
      if (success) {
        // Update conflict in state
        const updatedConflict = resolver.getConflict(request.conflictId);
        if (updatedConflict) {
          dispatch({ type: 'UPDATE_CONFLICT', payload: updatedConflict });
        }
        
        // Update stats and other data
        const stats = resolver.getStats();
        const history = resolver.getHistory();
        const notifications = resolver.getNotifications();
        
        dispatch({ type: 'SET_STATS', payload: stats });
        dispatch({ type: 'SET_HISTORY', payload: history });
        dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications });
        
        // Close modal if open
        dispatch({ type: 'SET_MODAL_OPEN', payload: false });
        dispatch({ type: 'SET_SELECTED_CONFLICT', payload: null });
      }
      
      return success;
    } catch (error) {
      logger.error('Error manually resolving conflict', error as Error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Escalate conflict
  const escalateConflict = async (conflictId: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const success = resolver.escalateConflict(conflictId);
      
      if (success) {
        // Update conflict in state
        const updatedConflict = resolver.getConflict(conflictId);
        if (updatedConflict) {
          dispatch({ type: 'UPDATE_CONFLICT', payload: updatedConflict });
        }
        
        // Update stats and other data
        const stats = resolver.getStats();
        const history = resolver.getHistory();
        const notifications = resolver.getNotifications();
        
        dispatch({ type: 'SET_STATS', payload: stats });
        dispatch({ type: 'SET_HISTORY', payload: history });
        dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications });
      }
      
      return success;
    } catch (error) {
      logger.error('Error escalating conflict', error as Error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // View conflict
  const viewConflict = (conflictId: string) => {
    const conflict = state.conflicts.find(c => c.metadata.id === conflictId);
    if (conflict) {
      dispatch({ type: 'SET_SELECTED_CONFLICT', payload: conflict });
      dispatch({ type: 'SET_MODAL_OPEN', payload: true });
    }
  };

  // Open conflict modal
  const openConflictModal = (conflictId?: string) => {
    if (conflictId) {
      viewConflict(conflictId);
    } else {
      dispatch({ type: 'SET_SELECTED_CONFLICT', payload: null });
      dispatch({ type: 'SET_MODAL_OPEN', payload: true });
    }
  };

  // Close conflict modal
  const closeConflictModal = () => {
    dispatch({ type: 'SET_MODAL_OPEN', payload: false });
    dispatch({ type: 'SET_SELECTED_CONFLICT', payload: null });
  };

  // Clear resolved conflicts
  const clearResolvedConflicts = () => {
    const count = resolver.clearResolvedConflicts();
    if (count > 0) {
      dispatch({ type: 'CLEAR_RESOLVED_CONFLICTS' });
      
      // Update stats
      const stats = resolver.getStats();
      dispatch({ type: 'SET_STATS', payload: stats });
    }
  };

  // Mark notification as read
  const markNotificationAsRead = (notificationId: string) => {
    resolver.markNotificationAsRead(notificationId);
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: notificationId });
  };

  // Refresh data
  const refreshData = async () => {
    await loadConflicts();
  };

  // Load conflicts on mount
  useEffect(() => {
    loadConflicts();
  }, []);

  // Context value
  const contextValue: ConflictResolutionContextType = {
    state,
    loadConflicts,
    detectConflicts,
    resolveConflict,
    manuallyResolveConflict,
    escalateConflict,
    viewConflict,
    openConflictModal,
    closeConflictModal,
    clearResolvedConflicts,
    markNotificationAsRead,
    refreshData
  };

  return (
    <ConflictResolutionContext.Provider value={contextValue}>
      {children}
    </ConflictResolutionContext.Provider>
  );
};

// Hook to use the conflict resolution context
export const useConflictResolutionContext = (): ConflictResolutionContextType => {
  const context = useContext(ConflictResolutionContext);
  if (!context) {
    throw new Error('useConflictResolutionContext must be used within a ConflictResolutionProvider');
  }
  return context;
};