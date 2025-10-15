'use client'

import React, { useState, useEffect } from 'react'
import { logger, logApiError, logApiRequest } from '@/lib/logger'
import {
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  WifiOff, 
  Clock, 
  AlertTriangle,
  Calendar,
  BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatSyncStatus,
  formatTimestamp,
  formatDate,
  getSyncStatusColor,
  getSyncStatusIcon,
  SyncStatusUI,
  formatSyncProgress
} from '@/lib/offline-utils'
import { SyncStatus as SyncStatusType } from '@/lib/sync-manager'
import { useSync } from '@/hooks/use-sync'

interface SyncStatusProps {
  className?: string
  variant?: 'icon' | 'badge' | 'card' | 'detailed'
  size?: 'sm' | 'md' | 'lg'
  showLastSyncTime?: boolean
  showStats?: boolean
  showSyncButton?: boolean
  autoRefresh?: boolean
  refreshInterval?: number // in milliseconds
}

export function SyncStatus({
  className,
  variant = 'badge',
  size = 'md',
  showLastSyncTime = true,
  showStats = false,
  showSyncButton = true,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: SyncStatusProps) {
  const { 
    status, 
    isOnline, 
    isSyncing, 
    lastSync, 
    lastSuccessfulSync,
    totalSyncs,
    successfulSyncs,
    failedSyncs,
    itemsSynced,
    sync,
    forceSync
  } = useSync({ autoSync: false })
  
  const [isManualSyncing, setIsManualSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState({ processed: 0, total: 0 })
  
  const statusUI = formatSyncStatus(status)
  const statusColor = getSyncStatusColor(statusUI)
  const statusIcon = getSyncStatusIcon(statusUI)

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const iconSize = {
    sm: 14,
    md: 16,
    lg: 20
  }

  // Simulate sync progress
  useEffect(() => {
    if (isSyncing) {
      // Simulate progress for demo purposes
      // In a real app, this would come from actual sync progress
      const interval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev.processed >= prev.total) {
            return { processed: 0, total: Math.floor(Math.random() * 20) + 5 }
          }
          return { ...prev, processed: prev.processed + 1 }
        })
      }, 500)
      
      return () => clearInterval(interval)
    }
  }, [isSyncing])

  // Auto-refresh status
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      // This would typically check for status updates
      // For now, we'll just rely on the hook's internal state
    }, refreshInterval)
    
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  const handleSync = async () => {
    if (isManualSyncing || isSyncing) return
    
    setIsManualSyncing(true)
    try {
      await forceSync()
    } catch (error) {
      logger.error('Sync failed', error as Error)
    } finally {
      setIsManualSyncing(false)
    }
  }

  const renderIcon = () => {
    const isSpinning = isSyncing || isManualSyncing
    
    switch (statusIcon) {
      case 'refresh-cw':
        return <RefreshCw className={cn(isSpinning && 'animate-spin')} size={iconSize[size]} />
      case 'check-circle':
        return <CheckCircle size={iconSize[size]} />
      case 'x-circle':
        return <XCircle size={iconSize[size]} />
      case 'wifi-off':
        return <WifiOff size={iconSize[size]} />
      case 'clock':
        return <Clock size={iconSize[size]} />
      default:
        return <RefreshCw className={cn(isSpinning && 'animate-spin')} size={iconSize[size]} />
    }
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline'
    if (isSyncing || isManualSyncing) return 'Syncing...'
    
    switch (statusUI) {
      case 'idle':
        return 'Up to date'
      case 'completed':
        return 'Synced'
      case 'error':
        return 'Sync failed'
      case 'offline':
        return 'Offline'
      case 'pending':
        return 'Pending sync'
      default:
        return 'Unknown'
    }
  }

  if (variant === 'icon') {
    return (
      <div className={cn('flex items-center', className)}>
        <div className={cn(statusColor, 'transition-colors duration-300')}>
          {renderIcon()}
        </div>
      </div>
    )
  }

  if (variant === 'badge') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div 
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 font-medium transition-colors duration-300',
            sizeClasses[size],
            statusUI === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
            statusUI === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
            statusUI === 'offline' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
            statusUI === 'syncing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
            'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
          )}
        >
          {renderIcon()}
          <span className="ml-1">{getStatusText()}</span>
        </div>
        
        {showLastSyncTime && lastSuccessfulSync && (
          <span className={cn('text-xs', statusColor)}>
            {formatTimestamp(lastSuccessfulSync)}
          </span>
        )}
        
        {showSyncButton && (
          <button
            onClick={handleSync}
            disabled={isManualSyncing || isSyncing || !isOnline}
            className={cn(
              'p-1 rounded-md transition-colors',
              isManualSyncing || isSyncing || !isOnline
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
            aria-label="Sync now"
          >
            <RefreshCw 
              size={iconSize[size]} 
              className={cn(isManualSyncing && 'animate-spin')} 
            />
          </button>
        )}
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div 
        className={cn(
          'rounded-lg border p-4 transition-colors duration-300',
          statusUI === 'completed' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
          statusUI === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
          statusUI === 'offline' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' :
          statusUI === 'syncing' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' :
          'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800',
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn(statusColor)}>
              {renderIcon()}
            </div>
            <div>
              <h3 className={cn('font-medium', sizeClasses[size])}>{getStatusText()}</h3>
              {showLastSyncTime && lastSuccessfulSync && (
                <p className={cn('text-xs', statusColor)}>
                  Last sync: {formatTimestamp(lastSuccessfulSync)}
                </p>
              )}
            </div>
          </div>
          
          {showSyncButton && (
            <button
              onClick={handleSync}
              disabled={isManualSyncing || isSyncing || !isOnline}
              className={cn(
                'inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors',
                isManualSyncing || isSyncing || !isOnline
                  ? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-gray-700'
                  : 'bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'
              )}
            >
              {isManualSyncing || isSyncing ? (
                <>
                  <RefreshCw className="animate-spin mr-1" size={14} />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw size={14} className="mr-1" />
                  Sync Now
                </>
              )}
            </button>
          )}
        </div>
        
        {isSyncing && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(syncProgress.processed / syncProgress.total) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formatSyncProgress(syncProgress.processed, syncProgress.total).text}
            </p>
          </div>
        )}
      </div>
    )
  }

  // Detailed variant
  return (
    <div 
      className={cn(
        'rounded-lg border p-4 transition-colors duration-300',
        statusUI === 'completed' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
        statusUI === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
        statusUI === 'offline' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' :
        statusUI === 'syncing' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' :
        'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={cn(statusColor)}>
            {renderIcon()}
          </div>
          <div>
            <h3 className={cn('font-medium', sizeClasses[size])}>{getStatusText()}</h3>
            {showLastSyncTime && lastSuccessfulSync && (
              <p className={cn('text-xs', statusColor)}>
                Last sync: {formatDate(lastSuccessfulSync)}
              </p>
            )}
          </div>
        </div>
        
        {showSyncButton && (
          <button
            onClick={handleSync}
            disabled={isManualSyncing || isSyncing || !isOnline}
            className={cn(
              'inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors',
              isManualSyncing || isSyncing || !isOnline
                ? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-gray-700'
                : 'bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'
            )}
          >
            {isManualSyncing || isSyncing ? (
              <>
                <RefreshCw className="animate-spin mr-1" size={14} />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw size={14} className="mr-1" />
                Sync Now
              </>
            )}
          </button>
        )}
      </div>
      
      {isSyncing && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(syncProgress.processed / syncProgress.total) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatSyncProgress(syncProgress.processed, syncProgress.total).text}
          </p>
        </div>
      )}
      
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <BarChart3 size={16} className="text-gray-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Syncs</p>
              <p className="font-medium">{totalSyncs}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <CheckCircle size={16} className="text-green-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Successful</p>
              <p className="font-medium">{successfulSyncs}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <XCircle size={16} className="text-red-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
              <p className="font-medium">{failedSyncs}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar size={16} className="text-blue-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Items Synced</p>
              <p className="font-medium">{itemsSynced}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}