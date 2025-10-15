'use client'

import React, { useState, useEffect } from 'react'
import { WifiOff, AlertTriangle, RefreshCw, X, CheckCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logger, logApiError, logApiRequest } from '@/lib/logger'
import {
  getNetworkStatus, 
  NetworkStatus,
  OfflineMessages,
  OfflineMessage,
  debounce
} from '@/lib/offline-utils'

interface OfflineBannerProps {
  className?: string
  position?: 'top' | 'bottom'
  variant?: 'default' | 'compact'
  showDismiss?: boolean
  showRetry?: boolean
  onRetry?: () => void
  autoHide?: boolean
  autoHideDelay?: number // in milliseconds
  customMessage?: OfflineMessage
}

export function OfflineBanner({
  className,
  position = 'top',
  variant = 'default',
  showDismiss = true,
  showRetry = true,
  onRetry,
  autoHide = false,
  autoHideDelay = 5000,
  customMessage
}: OfflineBannerProps) {
  const [status, setStatus] = useState<NetworkStatus>(getNetworkStatus())
  const [isVisible, setIsVisible] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [message, setMessage] = useState<OfflineMessage | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  // Debounced status update to prevent flickering
  const debouncedStatusUpdate = debounce((newStatus: NetworkStatus) => {
    setStatus(newStatus)
    setIsTransitioning(false)
    
    // Show banner when offline
    if (newStatus === 'offline') {
      setIsVisible(true)
      setMessage(customMessage || OfflineMessages.offline())
    } else if (isVisible) {
      // Show success message briefly when coming back online
      setMessage(customMessage || OfflineMessages.online())
      
      if (autoHide) {
        setTimeout(() => {
          setIsVisible(false)
        }, autoHideDelay)
      }
    }
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

    // Initial check
    if (status === 'offline') {
      setIsVisible(true)
      setMessage(customMessage || OfflineMessages.offline())
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('networkStatusChange', handleNetworkStatusChange)
    }
  }, [debouncedStatusUpdate, status, isVisible, autoHide, autoHideDelay, customMessage])

  const handleRetry = async () => {
    if (isRetrying) return
    
    setIsRetrying(true)
    
    try {
      if (onRetry) {
        await onRetry()
      } else {
        // Default retry behavior - check if we're online
        if (navigator.onLine) {
          setStatus('online')
          setIsVisible(false)
        }
      }
    } catch (error) {
      logger.error('Retry failed', error as Error)
    } finally {
      setIsRetrying(false)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
  }

  if (!isVisible || !message) {
    return null
  }

  const positionClasses = {
    top: 'top-0 left-0 right-0',
    bottom: 'bottom-0 left-0 right-0'
  }

  const variantClasses = {
    default: 'p-4',
    compact: 'p-2'
  }

  const getIcon = () => {
    if (isRetrying) {
      return <RefreshCw className="animate-spin" size={20} />
    }
    
    switch (message.type) {
      case 'success':
        return <CheckCircle size={20} />
      case 'error':
        return <AlertTriangle size={20} />
      case 'warning':
        return <AlertTriangle size={20} />
      case 'info':
      default:
        return <Info size={20} />
    }
  }

  const getBgColor = () => {
    switch (message.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200'
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
    }
  }

  return (
    <div 
      className={cn(
        'fixed z-50 border-b transition-all duration-300',
        positionClasses[position],
        variantClasses[variant],
        getBgColor(),
        className
      )}
    >
      <div className="container mx-auto flex items-center">
        <div className="flex-shrink-0 mr-3">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          {variant === 'default' ? (
            <div>
              <h3 className="font-medium text-sm">{message.title}</h3>
              <p className="text-xs opacity-90 mt-1">{message.description}</p>
            </div>
          ) : (
            <p className="text-sm font-medium truncate">{message.title}</p>
          )}
        </div>
        
        <div className="flex-shrink-0 ml-4 flex items-center space-x-2">
          {showRetry && status === 'offline' && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className={cn(
                'inline-flex items-center px-3 py-1 rounded-md text-xs font-medium transition-colors',
                isRetrying 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30'
              )}
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="animate-spin mr-1" size={12} />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw size={12} className="mr-1" />
                  Retry
                </>
              )}
            </button>
          )}
          
          {showDismiss && (
            <button
              onClick={handleDismiss}
              className="inline-flex items-center p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}