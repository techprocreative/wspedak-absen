'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { 
  Wifi, 
  WifiOff, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  Database
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { getNetworkStatus } from '@/lib/offline-utils'

const enhancedBadgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        // Network status variants
        online:
          'border-transparent bg-green-500 text-white [a&]:hover:bg-green-600',
        offline:
          'border-transparent bg-yellow-500 text-white [a&]:hover:bg-yellow-600',
        connecting:
          'border-transparent bg-blue-500 text-white [a&]:hover:bg-blue-600',
        disconnecting:
          'border-transparent bg-orange-500 text-white [a&]:hover:bg-orange-600',
        // Sync status variants
        synced:
          'border-transparent bg-green-500 text-white [a&]:hover:bg-green-600',
        syncing:
          'border-transparent bg-blue-500 text-white [a&]:hover:bg-blue-600',
        pending:
          'border-transparent bg-yellow-500 text-white [a&]:hover:bg-yellow-600',
        syncError:
          'border-transparent bg-red-500 text-white [a&]:hover:bg-red-600',
        // Data status variants
        localData:
          'border-transparent bg-purple-500 text-white [a&]:hover:bg-purple-600',
        remoteData:
          'border-transparent bg-indigo-500 text-white [a&]:hover:bg-indigo-600',
        noData:
          'border-transparent bg-gray-500 text-white [a&]:hover:bg-gray-600',
      },
      size: {
        sm: 'h-5 px-1.5 text-xs',
        md: 'h-6 px-2 py-0.5 text-xs',
        lg: 'h-7 px-2.5 py-1 text-sm',
      },
      pulse: {
        true: 'animate-pulse',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      pulse: false,
    },
  },
)

export interface EnhancedBadgeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof enhancedBadgeVariants> {
  showIcon?: boolean
  iconPosition?: 'left' | 'right'
  autoDetectNetworkStatus?: boolean
  autoDetectSyncStatus?: boolean
  pulseWhenOffline?: boolean
  pulseWhenSyncing?: boolean
}

const EnhancedBadge = React.forwardRef<HTMLSpanElement, EnhancedBadgeProps>(
  ({
    className,
    variant,
    size,
    pulse,
    showIcon = true,
    iconPosition = 'left',
    autoDetectNetworkStatus = false,
    autoDetectSyncStatus = false,
    pulseWhenOffline = true,
    pulseWhenSyncing = true,
    children,
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

    // Auto-detect pulse
    const effectivePulse = React.useMemo(() => {
      if (pulse) return true

      if (pulseWhenOffline && effectiveVariant === 'offline') return true
      if (pulseWhenSyncing && effectiveVariant === 'syncing') return true

      return false
    }, [pulse, pulseWhenOffline, pulseWhenSyncing, effectiveVariant])

    const getIcon = () => {
      if (!showIcon) return null

      switch (effectiveVariant) {
        // Network status icons
        case 'online':
          return <Wifi size={12} />
        case 'offline':
          return <WifiOff size={12} />
        case 'connecting':
          return <RefreshCw className="animate-spin" size={12} />
        case 'disconnecting':
          return <RefreshCw className="animate-spin" size={12} />

        // Sync status icons
        case 'synced':
          return <CheckCircle size={12} />
        case 'syncing':
          return <RefreshCw className="animate-spin" size={12} />
        case 'pending':
          return <Clock size={12} />
        case 'syncError':
          return <XCircle size={12} />

        // Data status icons
        case 'localData':
          return <Database size={12} />
        case 'remoteData':
          return <Cloud size={12} />
        case 'noData':
          return <CloudOff size={12} />

        default:
          return null
      }
    }

    const Comp = 'span'
    
    return (
      <Comp
        ref={ref}
        className={cn(
          enhancedBadgeVariants({ 
            variant: effectiveVariant, 
            size, 
            pulse: effectivePulse,
            className 
          })
        )}
        {...props}
      >
        {iconPosition === 'left' && getIcon()}
        {children}
        {iconPosition === 'right' && getIcon()}
      </Comp>
    )
  }
)
EnhancedBadge.displayName = 'EnhancedBadge'

export { EnhancedBadge, enhancedBadgeVariants }