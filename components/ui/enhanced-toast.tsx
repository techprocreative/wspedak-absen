'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import {
  Wifi,
  WifiOff,
  CheckCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Cloud,
  Database,
  Shield
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { getNetworkStatus } from '@/lib/offline-utils'

// Simple toast implementation without Radix UI dependencies
const enhancedToastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all',
  {
    variants: {
      variant: {
        default: 'border bg-background text-foreground',
        destructive:
          'destructive group border-destructive bg-destructive text-destructive-foreground',
        // Network status variants
        online:
          'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200',
        offline:
          'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
        connecting:
          'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
        disconnecting:
          'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-200',
        // Sync status variants
        synced:
          'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200',
        syncing:
          'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
        syncError:
          'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200',
        // Data status variants
        localData:
          'border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-200',
        remoteData:
          'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-200',
        // Security variants
        secure:
          'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200',
        warning:
          'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
        info:
          'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
      },
      size: {
        sm: 'p-4 pr-7',
        md: 'p-6 pr-8',
        lg: 'p-7 pr-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

export interface EnhancedToastProps
  extends VariantProps<typeof enhancedToastVariants> {
  showIcon?: boolean
  autoDetectNetworkStatus?: boolean
  autoDetectSyncStatus?: boolean
  onAutoClose?: () => void
  autoClose?: boolean
  autoCloseDelay?: number
  title?: React.ReactNode
  description?: React.ReactNode
  className?: string
}

const EnhancedToast = React.forwardRef<
  HTMLDivElement,
  EnhancedToastProps
>(({
  className,
  variant,
  size,
  showIcon = true,
  autoDetectNetworkStatus = false,
  autoDetectSyncStatus = false,
  onAutoClose,
  autoClose = false,
  autoCloseDelay = 5000,
  title,
  description,
  ...props
}, ref) => {
  const [isOnline, setIsOnline] = React.useState(getNetworkStatus() === 'online')
  const [isSyncing, setIsSyncing] = React.useState(false)

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-detect network status
  const effectiveVariant = React.useMemo(() => {
    if (autoDetectNetworkStatus) {
      if (isOnline) return 'online'
      return 'offline'
    }

    if (autoDetectSyncStatus) {
      if (isSyncing) return 'syncing'
      return 'synced'
    }

    return variant
  }, [autoDetectNetworkStatus, autoDetectSyncStatus, isOnline, isSyncing, variant])

  // Auto-close functionality
  React.useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onAutoClose?.()
      }, autoCloseDelay)

      return () => clearTimeout(timer)
    }
  }, [autoClose, autoCloseDelay, onAutoClose])

  const getIcon = () => {
    if (!showIcon) return null

    switch (effectiveVariant) {
      // Network status icons
      case 'online':
        return <Wifi className="text-green-600" />
      case 'offline':
        return <WifiOff className="text-yellow-600" />
      case 'connecting':
        return <RefreshCw className="text-blue-600 animate-spin" />
      case 'disconnecting':
        return <RefreshCw className="text-orange-600 animate-spin" />

      // Sync status icons
      case 'synced':
        return <CheckCircle className="text-green-600" />
      case 'syncing':
        return <RefreshCw className="text-blue-600 animate-spin" />
      case 'syncError':
        return <AlertTriangle className="text-red-600" />

      // Data status icons
      case 'localData':
        return <Database className="text-purple-600" />
      case 'remoteData':
        return <Cloud className="text-indigo-600" />

      // Security variants
      case 'secure':
        return <Shield className="text-green-600" />
      case 'warning':
        return <AlertTriangle className="text-yellow-600" />
      case 'info':
        return <Info className="text-blue-600" />

      default:
        return effectiveVariant === 'destructive' ?
          <AlertTriangle className="text-red-600" /> :
          <Info className="text-blue-600" />
    }
  }

  return (
    <div
      ref={ref}
      className={cn(enhancedToastVariants({ variant: effectiveVariant, size, className }))}
      {...props}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 space-y-1">
          {title && (
            <div className="font-semibold text-sm">
              {title}
            </div>
          )}
          {description && (
            <div className="text-sm opacity-90">
              {description}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
EnhancedToast.displayName = 'EnhancedToast'

type EnhancedToastPropsType = React.ComponentPropsWithoutRef<typeof EnhancedToast>

export {
  type EnhancedToastPropsType,
  EnhancedToast,
}