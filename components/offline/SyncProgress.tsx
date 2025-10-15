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
  Pause,
  Play,
  BarChart3,
  List,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  formatSyncStatus,
  formatTimestamp,
  formatDate,
  getSyncStatusColor,
  getSyncStatusIcon,
  SyncStatusUI,
  formatSyncProgress,
  formatSyncDirection,
  formatSyncPriority
} from '@/lib/offline-utils'
import { SyncStatus as SyncStatusType, SyncDirection, SyncPriority } from '@/lib/sync-manager'
import { useSync } from '@/hooks/use-sync'

interface SyncProgressProps {
  className?: string
  variant?: 'minimal' | 'detailed' | 'expanded'
  size?: 'sm' | 'md' | 'lg'
  showStats?: boolean
  showItems?: boolean
  autoRefresh?: boolean
  refreshInterval?: number // in milliseconds
  collapsible?: boolean
  defaultCollapsed?: boolean
}

interface SyncItem {
  id: string
  type: 'attendance' | 'user' | 'settings'
  name: string
  status: 'pending' | 'syncing' | 'completed' | 'failed'
  progress?: number
  error?: string
  timestamp: Date
}

export function SyncProgress({
  className,
  variant = 'detailed',
  size = 'md',
  showStats = true,
  showItems = true,
  autoRefresh = true,
  refreshInterval = 1000, // 1 second for more frequent updates
  collapsible = false,
  defaultCollapsed = false
}: SyncProgressProps) {
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
  const [syncProgress, setSyncProgress] = useState({ processed: 0, total: 0, percentage: 0 })
  const [syncItems, setSyncItems] = useState<SyncItem[]>([])
  const [currentDirection, setCurrentDirection] = useState<SyncDirection>(SyncDirection.BIDIRECTIONAL)
  const [currentPriority, setCurrentPriority] = useState<SyncPriority>(SyncPriority.MEDIUM)
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [isPaused, setIsPaused] = useState(false)
  
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

  // Simulate sync progress and items
  useEffect(() => {
    if (isSyncing && !isPaused) {
      // Simulate progress for demo purposes
      // In a real app, this would come from actual sync progress
      const interval = setInterval(() => {
        setSyncProgress(prev => {
          const newProcessed = prev.processed >= prev.total ? 0 : prev.processed + 1
          const newTotal = prev.total === 0 ? Math.floor(Math.random() * 20) + 5 : prev.total
          const newPercentage = Math.round((newProcessed / newTotal) * 100)
          
          return { processed: newProcessed, total: newTotal, percentage: newPercentage }
        })
        
        // Simulate sync items
        if (syncItems.length === 0) {
          const mockItems: SyncItem[] = [
            {
              id: '1',
              type: 'attendance',
              name: 'Attendance records',
              status: 'syncing',
              progress: 30,
              timestamp: new Date()
            },
            {
              id: '2',
              type: 'user',
              name: 'User profiles',
              status: 'pending',
              timestamp: new Date()
            },
            {
              id: '3',
              type: 'settings',
              name: 'App settings',
              status: 'pending',
              timestamp: new Date()
            }
          ]
          setSyncItems(mockItems)
        } else {
          // Update item statuses
          setSyncItems(prev => {
            return prev.map(item => {
              if (item.status === 'syncing' && item.progress !== undefined) {
                const newProgress = Math.min(item.progress + 10, 100)
                return {
                  ...item,
                  progress: newProgress,
                  status: newProgress >= 100 ? 'completed' : 'syncing'
                }
              } else if (item.status === 'pending' && Math.random() > 0.7) {
                return {
                  ...item,
                  status: 'syncing',
                  progress: 0
                }
              }
              return item
            })
          })
        }
      }, 500)
      
      return () => clearInterval(interval)
    } else if (!isSyncing) {
      // Reset when not syncing
      setSyncProgress({ processed: 0, total: 0, percentage: 0 })
      setSyncItems([])
    }
  }, [isSyncing, isPaused, syncItems.length])

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
    setIsPaused(false)
    try {
      await forceSync()
    } catch (error) {
      logger.error('Sync failed', error as Error)
    } finally {
      setIsManualSyncing(false)
    }
  }

  const handlePauseResume = () => {
    setIsPaused(!isPaused)
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  const renderIcon = () => {
    const isSpinning = isSyncing || isManualSyncing
    
    switch (statusIcon) {
      case 'refresh-cw':
        return <RefreshCw className={cn(isSpinning && !isPaused && 'animate-spin')} size={iconSize[size]} />
      case 'check-circle':
        return <CheckCircle size={iconSize[size]} />
      case 'x-circle':
        return <XCircle size={iconSize[size]} />
      case 'wifi-off':
        return <WifiOff size={iconSize[size]} />
      case 'clock':
        return <Clock size={iconSize[size]} />
      default:
        return <RefreshCw className={cn(isSpinning && !isPaused && 'animate-spin')} size={iconSize[size]} />
    }
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline'
    if (isManualSyncing || isSyncing) return isPaused ? 'Paused' : 'Syncing...'
    
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

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'attendance':
        return <Calendar size={14} />
      case 'user':
        return <List size={14} />
      case 'settings':
        return <BarChart3 size={14} />
      default:
        return <List size={14} />
    }
  }

  const getItemStatusColor = (itemStatus: string) => {
    switch (itemStatus) {
      case 'pending':
        return 'text-gray-500'
      case 'syncing':
        return 'text-blue-500'
      case 'completed':
        return 'text-green-500'
      case 'failed':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getItemStatusIcon = (itemStatus: string) => {
    switch (itemStatus) {
      case 'pending':
        return <Clock size={12} />
      case 'syncing':
        return <RefreshCw className="animate-spin" size={12} />
      case 'completed':
        return <CheckCircle size={12} />
      case 'failed':
        return <XCircle size={12} />
      default:
        return <Clock size={12} />
    }
  }

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center space-x-3', className)}>
        <div className={cn(statusColor, 'transition-colors duration-300')}>
          {renderIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={cn('font-medium', sizeClasses[size])}>
              {getStatusText()}
            </span>
            <span className={cn('text-xs', statusColor)}>
              {syncProgress.percentage > 0 ? `${syncProgress.percentage}%` : ''}
            </span>
          </div>
          
          {isSyncing && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
              <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${syncProgress.percentage}%` }}
              ></div>
            </div>
          )}
        </div>
        
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
      </div>
    )
  }

  if (variant === 'detailed') {
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
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={cn(statusColor)}>
              {renderIcon()}
            </div>
            <div>
              <h3 className={cn('font-medium', sizeClasses[size])}>{getStatusText()}</h3>
              {lastSuccessfulSync && (
                <p className={cn('text-xs', statusColor)}>
                  Last sync: {formatTimestamp(lastSuccessfulSync)}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isSyncing && (
              <button
                onClick={handlePauseResume}
                className={cn(
                  'p-1 rounded-md transition-colors',
                  'hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
                aria-label={isPaused ? "Resume sync" : "Pause sync"}
              >
                {isPaused ? <Play size={iconSize[size]} /> : <Pause size={iconSize[size]} />}
              </button>
            )}
            
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
                  <RefreshCw className={cn('animate-spin mr-1', isPaused && 'hidden')} size={14} />
                  {isPaused ? 'Paused' : 'Syncing...'}
                </>
              ) : (
                <>
                  <RefreshCw size={14} className="mr-1" />
                  Sync Now
                </>
              )}
            </button>
          </div>
        </div>
        
        {isSyncing && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatSyncProgress(syncProgress.processed, syncProgress.total).text}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatSyncDirection(currentDirection)} • {formatSyncPriority(currentPriority)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  isPaused ? 'bg-yellow-500' : 'bg-blue-600'
                )}
                style={{ width: `${syncProgress.percentage}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {showStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
        
        {showItems && syncItems.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Sync Items
            </h4>
            {syncItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2">
                  <div className={cn('p-1 rounded', getItemStatusColor(item.status))}>
                    {getItemIcon(item.type)}
                  </div>
                  <span className={cn('text-sm', getItemStatusColor(item.status))}>
                    {item.name}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {item.status === 'syncing' && item.progress !== undefined && (
                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                  )}
                  
                  <div className={cn(getItemStatusColor(item.status))}>
                    {getItemStatusIcon(item.status)}
                  </div>
                  
                  {item.status === 'failed' && item.error && (
                    <div className="text-xs text-red-500 max-w-xs truncate">
                      {item.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Expanded variant
  return (
    <div 
      className={cn(
        'rounded-lg border transition-colors duration-300',
        statusUI === 'completed' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
        statusUI === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
        statusUI === 'offline' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' :
        statusUI === 'syncing' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' :
        'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800',
        className
      )}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn(statusColor)}>
              {renderIcon()}
            </div>
            <div>
              <h3 className={cn('font-medium', sizeClasses[size])}>{getStatusText()}</h3>
              {lastSuccessfulSync && (
                <p className={cn('text-xs', statusColor)}>
                  Last sync: {formatDate(lastSuccessfulSync)}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {collapsible && (
              <button
                onClick={toggleCollapse}
                className={cn(
                  'p-1 rounded-md transition-colors',
                  'hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
                aria-label={isCollapsed ? "Expand sync details" : "Collapse sync details"}
              >
                {isCollapsed ? 
                  <BarChart3 size={iconSize[size]} /> : 
                  <BarChart3 size={iconSize[size]} className="rotate-180" />
                }
              </button>
            )}
            
            {isSyncing && (
              <button
                onClick={handlePauseResume}
                className={cn(
                  'p-1 rounded-md transition-colors',
                  'hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
                aria-label={isPaused ? "Resume sync" : "Pause sync"}
              >
                {isPaused ? <Play size={iconSize[size]} /> : <Pause size={iconSize[size]} />}
              </button>
            )}
            
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
                  <RefreshCw className={cn('animate-spin mr-1', isPaused && 'hidden')} size={14} />
                  {isPaused ? 'Paused' : 'Syncing...'}
                </>
              ) : (
                <>
                  <RefreshCw size={14} className="mr-1" />
                  Sync Now
                </>
              )}
            </button>
          </div>
        </div>
        
        {!isCollapsed && (
          <>
            {isSyncing && (
              <div className="my-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatSyncProgress(syncProgress.processed, syncProgress.total).text}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatSyncDirection(currentDirection)} • {formatSyncPriority(currentPriority)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={cn(
                      'h-2 rounded-full transition-all duration-300',
                      isPaused ? 'bg-yellow-500' : 'bg-blue-600'
                    )}
                    style={{ width: `${syncProgress.percentage}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {showStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4 py-4 border-t border-gray-200 dark:border-gray-700">
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
            
            {showItems && syncItems.length > 0 && (
              <div className="space-y-2 py-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Sync Items
                </h4>
                {syncItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-2">
                      <div className={cn('p-1 rounded', getItemStatusColor(item.status))}>
                        {getItemIcon(item.type)}
                      </div>
                      <span className={cn('text-sm', getItemStatusColor(item.status))}>
                        {item.name}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {item.status === 'syncing' && item.progress !== undefined && (
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          ></div>
                        </div>
                      )}
                      
                      <div className={cn(getItemStatusColor(item.status))}>
                        {getItemStatusIcon(item.status)}
                      </div>
                      
                      {item.status === 'failed' && item.error && (
                        <div className="text-xs text-red-500 max-w-xs truncate">
                          {item.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}