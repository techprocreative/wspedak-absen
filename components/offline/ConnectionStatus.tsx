'use client'

import React, { useState, useEffect } from 'react'
import { Wifi, WifiOff, Loader, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  getNetworkStatus, 
  getNetworkStatusColor, 
  getNetworkStatusIcon,
  NetworkStatus,
  debounce
} from '@/lib/offline-utils'

interface ConnectionStatusProps {
  className?: string
  showText?: boolean
  variant?: 'icon' | 'badge' | 'full'
  size?: 'sm' | 'md' | 'lg'
}

export function ConnectionStatus({
  className,
  showText = true,
  variant = 'badge',
  size = 'md'
}: ConnectionStatusProps) {
  const [status, setStatus] = useState<NetworkStatus>(getNetworkStatus())
  const [isTransitioning, setIsTransitioning] = useState(false)

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

  const sizeClasses = {
    sm: 'text-xs h-6',
    md: 'text-sm h-8',
    lg: 'text-base h-10'
  }

  const iconSize = {
    sm: 14,
    md: 16,
    lg: 20
  }

  const renderIcon = () => {
    if (isTransitioning) {
      return <Loader className="animate-spin" size={iconSize[size]} />
    }

    switch (statusIcon) {
      case 'wifi':
        return <Wifi size={iconSize[size]} />
      case 'wifi-off':
        return <WifiOff size={iconSize[size]} />
      case 'loader':
        return <Loader className="animate-spin" size={iconSize[size]} />
      default:
        return <Wifi size={iconSize[size]} />
    }
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

  if (variant === 'icon') {
    return (
      <div className={cn('flex items-center', className)}>
        <div className={cn(statusColor, 'transition-colors duration-300')}>
          {renderIcon()}
        </div>
        {showText && (
          <span className={cn('ml-2 font-medium', statusColor, 'transition-colors duration-300')}>
            {getStatusText()}
          </span>
        )}
      </div>
    )
  }

  if (variant === 'badge') {
    return (
      <div 
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 font-medium transition-colors duration-300',
          sizeClasses[size],
          status === 'online' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
          status === 'offline' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
          className
        )}
      >
        {renderIcon()}
        {showText && <span className="ml-1">{getStatusText()}</span>}
      </div>
    )
  }

  // Full variant
  return (
    <div 
      className={cn(
        'flex items-center rounded-lg border px-3 py-2 transition-colors duration-300',
        sizeClasses[size],
        status === 'online' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' :
        status === 'offline' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200' :
        'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
        className
      )}
    >
      <div className={cn(statusColor, 'mr-2')}>
        {renderIcon()}
      </div>
      <div>
        <div className="font-medium">{getStatusText()}</div>
        {status === 'offline' && (
          <div className="text-xs opacity-75 flex items-center">
            <AlertTriangle size={12} className="mr-1" />
            Working in offline mode
          </div>
        )}
      </div>
    </div>
  )
}