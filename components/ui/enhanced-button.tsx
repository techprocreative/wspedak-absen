'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2, Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react'

import { cn } from '@/lib/utils'
import { getNetworkStatus } from '@/lib/offline-utils'

const enhancedButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive:
          'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
        offline: 'bg-yellow-500 text-white shadow-xs hover:bg-yellow-600',
        success: 'bg-green-500 text-white shadow-xs hover:bg-green-600',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
      },
      loadingState: {
        default: '',
        spinner: '',
        skeleton: 'animate-pulse',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      loadingState: 'default',
    },
  },
)

export interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof enhancedButtonVariants> {
  loading?: boolean
  offlineDisabled?: boolean
  showOfflineStatus?: boolean
  loadingText?: string
  offlineText?: string
  success?: boolean
  successText?: string
  error?: boolean
  errorText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  loadingPosition?: 'left' | 'right' | 'overlay'
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({
    className,
    variant,
    size,
    loadingState,
    loading = false,
    offlineDisabled = true,
    showOfflineStatus = false,
    loadingText,
    offlineText,
    success = false,
    successText,
    error = false,
    errorText,
    leftIcon,
    rightIcon,
    loadingPosition = 'left',
    disabled,
    children,
    ...props
  }, ref) => {
    const [isOnline, setIsOnline] = React.useState(getNetworkStatus() === 'online')

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

    const isDisabled = disabled || (offlineDisabled && !isOnline) || loading
    const showLoading = loading && !success && !error
    const showSuccess = success && !loading && !error
    const showError = error && !loading && !success

    const Comp = 'button'
    
    const renderIcon = (position: 'left' | 'right') => {
      if (showLoading && loadingPosition === position) {
        return <Loader2 className="animate-spin" size={16} />
      }
      
      if (position === 'left') {
        if (showSuccess) return <CheckCircle size={16} />
        if (showError) return <AlertTriangle size={16} />
        if (!isOnline && showOfflineStatus) return <WifiOff size={16} />
        return leftIcon
      } else {
        if (showSuccess) return <CheckCircle size={16} />
        if (showError) return <AlertTriangle size={16} />
        if (!isOnline && showOfflineStatus) return <WifiOff size={16} />
        return rightIcon
      }
    }
    
    const renderButtonText = () => {
      if (showLoading && loadingText) return loadingText
      if (showSuccess && successText) return successText
      if (showError && errorText) return errorText
      if (!isOnline && offlineText) return offlineText
      return children
    }
    
    const getVariant = () => {
      if (showSuccess) return 'success'
      if (showError) return 'destructive'
      if (!isOnline && showOfflineStatus) return 'offline'
      return variant
    }
    
    const getLoadingState = () => {
      if (showLoading) return loadingState
      return 'default'
    }
    
    return (
      <Comp
        ref={ref}
        className={cn(
          enhancedButtonVariants({ 
            variant: getVariant(), 
            size, 
            loadingState: getLoadingState(),
            className 
          })
        )}
        disabled={isDisabled}
        {...props}
      >
        {renderIcon('left')}
        {renderButtonText()}
        {renderIcon('right')}
        
        {/* Overlay loading indicator */}
        {showLoading && loadingPosition === 'overlay' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-md">
            <Loader2 className="animate-spin text-white" size={20} />
          </div>
        )}
        
        {/* Offline indicator */}
        {!isOnline && showOfflineStatus && (
          <div className="absolute -top-1 -right-1">
            <WifiOff size={12} className="text-yellow-500" />
          </div>
        )}
      </Comp>
    )
  }
)
EnhancedButton.displayName = 'EnhancedButton'

export { EnhancedButton, enhancedButtonVariants }