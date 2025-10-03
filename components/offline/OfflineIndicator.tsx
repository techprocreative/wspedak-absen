'use client'

import React, { useState, useEffect } from 'react'
import { Wifi, WifiOff, Cloud, CloudOff, Database, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  getNetworkStatus, 
  NetworkStatus,
  getNetworkStatusColor,
  getNetworkStatusIcon,
  debounce
} from '@/lib/offline-utils'

interface OfflineIndicatorProps {
  className?: string
  variant?: 'dot' | 'icon' | 'text' | 'full'
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
  pulseWhenOffline?: boolean
  showDataStatus?: boolean
  hasLocalData?: boolean
}

export function OfflineIndicator({
  className,
  variant = 'dot',
  position = 'top-right',
  size = 'md',
  showTooltip = true,
  pulseWhenOffline = true,
  showDataStatus = false,
  hasLocalData = true
}: OfflineIndicatorProps) {
  const [status, setStatus] = useState<NetworkStatus>(getNetworkStatus())
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)

  // Debounced status update to prevent flickering
  const debouncedStatusUpdate = debounce((newStatus: NetworkStatus) => {
    setStatus(newStatus)
    setIsTransitioning(false)
  }, 500)

  useEffect(() => {
    const handleOnline = () => {
      setIsTransitioning(true)
      debouncedStatusUpdate('online')
    }

    const handleOffline = () => {
      setIsTransitioning(true)
      debouncedStatusUpdate('offline')
    }

    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Custom event for more granular network status changes
    const handleNetworkStatusChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ status: NetworkStatus }>
      setIsTransitioning(true)
      debouncedStatusUpdate(customEvent.detail.status)
    }

    window.addEventListener('networkStatusChange', handleNetworkStatusChange)

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('networkStatusChange', handleNetworkStatusChange)
    }
  }, [debouncedStatusUpdate])

  const statusColor = getNetworkStatusColor(status)
  const statusIcon = getNetworkStatusIcon(status)

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }

  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  }

  const iconSize = {
    sm: 12,
    md: 16,
    lg: 20
  }

  const textSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const getStatusText = () => {
    if (isTransitioning) return 'Connecting...'
    
    switch (status) {
      case 'online':
        return 'Online'
      case 'offline':
        return 'Offline'
      case 'connecting':
        return 'Connecting...'
      case 'disconnecting':
        return 'Disconnecting...'
      default:
        return 'Unknown'
    }
  }

  const getStatusDescription = () => {
    if (isTransitioning) return 'Attempting to restore connection...'
    
    switch (status) {
      case 'online':
        return 'You are connected to the internet'
      case 'offline':
        return hasLocalData 
          ? 'You are offline but can access local data' 
          : 'You are offline and some features may be unavailable'
      case 'connecting':
        return 'Attempting to connect to the internet'
      case 'disconnecting':
        return 'Connection is being lost'
      default:
        return 'Network status unknown'
    }
  }

  const renderIcon = () => {
    if (isTransitioning) {
      return <Wifi className="animate-pulse" size={iconSize[size]} />
    }

    switch (statusIcon) {
      case 'wifi':
        return <Wifi size={iconSize[size]} />
      case 'wifi-off':
        return <WifiOff size={iconSize[size]} />
      case 'loader':
        return <Wifi className="animate-spin" size={iconSize[size]} />
      default:
        return <Wifi size={iconSize[size]} />
    }
  }

  const renderDataIcon = () => {
    if (status === 'online') {
      return <Cloud size={iconSize[size]} className="text-blue-500" />
    } else {
      return hasLocalData 
        ? <Database size={iconSize[size]} className="text-green-500" />
        : <CloudOff size={iconSize[size]} className="text-red-500" />
    }
  }

  if (variant === 'dot') {
    return (
      <div 
        className={cn(
          'fixed rounded-full z-50',
          positionClasses[position],
          sizeClasses[size],
          status === 'online' ? 'bg-green-500' :
          status === 'offline' ? 'bg-red-500' :
          'bg-yellow-500',
          pulseWhenOffline && status === 'offline' && 'animate-pulse',
          className
        )}
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
      >
        {showTooltip && isTooltipVisible && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded-md shadow-lg whitespace-nowrap">
            {getStatusDescription()}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
          </div>
        )}
      </div>
    )
  }

  if (variant === 'icon') {
    return (
      <div 
        className={cn(
          'fixed z-50',
          positionClasses[position],
          className
        )}
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
      >
        <div className={cn(statusColor, 'transition-colors duration-300')}>
          {renderIcon()}
        </div>
        
        {showTooltip && isTooltipVisible && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded-md shadow-lg whitespace-nowrap">
            {getStatusDescription()}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
          </div>
        )}
      </div>
    )
  }

  if (variant === 'text') {
    return (
      <div 
        className={cn(
          'fixed z-50 flex items-center space-x-1',
          positionClasses[position],
          textSize[size],
          statusColor,
          'transition-colors duration-300',
          className
        )}
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
      >
        {renderIcon()}
        <span className="font-medium">{getStatusText()}</span>
        
        {showTooltip && isTooltipVisible && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded-md shadow-lg whitespace-nowrap">
            {getStatusDescription()}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
          </div>
        )}
      </div>
    )
  }

  // Full variant
  return (
    <div 
      className={cn(
        'fixed z-50 rounded-lg border p-3 shadow-lg transition-all duration-300',
        positionClasses[position],
        status === 'online' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
        status === 'offline' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
        'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
        pulseWhenOffline && status === 'offline' && 'animate-pulse',
        className
      )}
    >
      <div className="flex items-center space-x-3">
        <div className={cn(statusColor, 'transition-colors duration-300')}>
          {renderIcon()}
        </div>
        
        <div>
          <div className={cn('font-medium', textSize[size])}>
            {getStatusText()}
          </div>
          <div className={cn('text-xs opacity-75', statusColor)}>
            {getStatusDescription()}
          </div>
        </div>
        
        {showDataStatus && (
          <div className="flex items-center space-x-1 ml-2">
            {renderDataIcon()}
            {status === 'offline' && (
              <span className="text-xs">
                {hasLocalData ? 'Local data available' : 'No local data'}
              </span>
            )}
          </div>
        )}
        
        {status === 'offline' && !hasLocalData && (
          <div className="flex items-center space-x-1 ml-2 text-yellow-600">
            <AlertTriangle size={iconSize[size]} />
            <span className="text-xs">Limited functionality</span>
          </div>
        )}
      </div>
    </div>
  )
}