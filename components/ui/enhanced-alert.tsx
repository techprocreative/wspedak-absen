'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  RefreshCw,
  X,
  Cloud,
  Database,
  Shield
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { getNetworkStatus } from '@/lib/offline-utils'

const enhancedAlertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive:
          'text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90',
        // Network status variants
        online:
          'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200 [&>svg]:text-green-600',
        offline:
          'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200 [&>svg]:text-yellow-600',
        connecting:
          'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200 [&>svg]:text-blue-600',
        disconnecting:
          'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-200 [&>svg]:text-orange-600',
        // Sync status variants
        synced:
          'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200 [&>svg]:text-green-600',
        syncing:
          'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200 [&>svg]:text-blue-600',
        syncError:
          'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200 [&>svg]:text-red-600',
        // Data status variants
        localData:
          'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-200 [&>svg]:text-purple-600',
        remoteData:
          'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-200 [&>svg]:text-indigo-600',
        // Security variants
        secure:
          'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200 [&>svg]:text-green-600',
        warning:
          'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200 [&>svg]:text-yellow-600',
        info:
          'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200 [&>svg]:text-blue-600',
      },
      size: {
        sm: 'px-3 py-2 text-xs [&>svg]:size-3',
        md: 'px-4 py-3 text-sm [&>svg]:size-4',
        lg: 'px-5 py-4 text-base [&>svg]:size-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

export interface EnhancedAlertProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof enhancedAlertVariants> {
  showIcon?: boolean
  dismissible?: boolean
  autoDismiss?: boolean
  autoDismissTimeout?: number // in milliseconds
  autoDetectNetworkStatus?: boolean
  autoDetectSyncStatus?: boolean
  onDismiss?: () => void
  action?: React.ReactNode
}

const EnhancedAlert = React.forwardRef<HTMLDivElement, EnhancedAlertProps>(
  ({
    className,
    variant,
    size,
    showIcon = true,
    dismissible = false,
    autoDismiss = false,
    autoDismissTimeout = 5000,
    autoDetectNetworkStatus = false,
    autoDetectSyncStatus = false,
    onDismiss,
    action,
    children,
    ...props
  }, ref) => {
    const [isOnline, setIsOnline] = React.useState(getNetworkStatus() === 'online')
    const [isSyncing, setIsSyncing] = React.useState(false)
    const [isVisible, setIsVisible] = React.useState(true)
    
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
    
    // Auto-dismiss functionality
    React.useEffect(() => {
      if (autoDismiss && isVisible) {
        const timer = setTimeout(() => {
          handleDismiss()
        }, autoDismissTimeout)
        
        return () => clearTimeout(timer)
      }
    }, [autoDismiss, autoDismissTimeout, isVisible])
    
    const handleDismiss = () => {
      setIsVisible(false)
      onDismiss?.()
    }
    
    const getIcon = () => {
      if (!showIcon) return null
      
      switch (effectiveVariant) {
        // Network status icons
        case 'online':
          return <Wifi />
        case 'offline':
          return <WifiOff />
        case 'connecting':
          return <RefreshCw className="animate-spin" />
        case 'disconnecting':
          return <RefreshCw className="animate-spin" />
          
        // Sync status icons
        case 'synced':
          return <CheckCircle />
        case 'syncing':
          return <RefreshCw className="animate-spin" />
        case 'syncError':
          return <AlertTriangle />
          
        // Data status icons
        case 'localData':
          return <Database />
        case 'remoteData':
          return <Cloud />
          
        // Security variants
        case 'secure':
          return <Shield />
        case 'warning':
          return <AlertTriangle />
        case 'info':
          return <Info />
          
        default:
          return effectiveVariant === 'destructive' ? <AlertTriangle /> : <Info />
      }
    }
    
    if (!isVisible) {
      return null
    }
    
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(enhancedAlertVariants({ variant: effectiveVariant, size, className }))}
        {...props}
      >
        {getIcon()}
        <div className="grid gap-1">
          {children}
          {action && (
            <div className="mt-2">
              {action}
            </div>
          )}
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 rounded-md opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }
)
EnhancedAlert.displayName = 'EnhancedAlert'

const EnhancedAlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentProps<'h5'>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
))
EnhancedAlertTitle.displayName = 'EnhancedAlertTitle'

const EnhancedAlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentProps<'p'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
))
EnhancedAlertDescription.displayName = 'EnhancedAlertDescription'

export { EnhancedAlert, EnhancedAlertTitle, EnhancedAlertDescription }