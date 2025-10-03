'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Wifi, WifiOff, AlertTriangle, Cloud, Database, RefreshCw } from 'lucide-react'
import { getNetworkStatus } from '@/lib/offline-utils'

interface EnhancedCardProps extends React.ComponentProps<'div'> {
  offline?: boolean
  offlineVariant?: 'default' | 'warning' | 'error'
  showOfflineIndicator?: boolean
  offlineIndicatorPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  syncStatus?: 'synced' | 'syncing' | 'pending' | 'error'
  showSyncStatus?: boolean
  syncStatusPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  collapsible?: boolean
  defaultCollapsed?: boolean
  loading?: boolean
  skeleton?: boolean
}

const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(
  ({
    className,
    offline,
    offlineVariant = 'default',
    showOfflineIndicator = true,
    offlineIndicatorPosition = 'top-right',
    syncStatus,
    showSyncStatus = false,
    syncStatusPosition = 'bottom-right',
    collapsible = false,
    defaultCollapsed = false,
    loading = false,
    skeleton = false,
    children,
    ...props
  }, ref) => {
    const [isOnline, setIsOnline] = React.useState(getNetworkStatus() === 'online')
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
    
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
    
    const isActuallyOffline = offline || !isOnline
    
    const getOfflineVariantClasses = () => {
      if (!isActuallyOffline) return ''
      
      switch (offlineVariant) {
        case 'warning':
          return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
        case 'error':
          return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
        case 'default':
        default:
          return 'border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
      }
    }
    
    const getSyncStatusClasses = () => {
      if (!showSyncStatus || !syncStatus) return ''
      
      switch (syncStatus) {
        case 'synced':
          return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
        case 'syncing':
          return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
        case 'pending':
          return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
        case 'error':
          return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
        default:
          return ''
      }
    }
    
    const getPositionClasses = (position: string) => {
      switch (position) {
        case 'top-right':
          return 'top-2 right-2'
        case 'top-left':
          return 'top-2 left-2'
        case 'bottom-right':
          return 'bottom-2 right-2'
        case 'bottom-left':
          return 'bottom-2 left-2'
        default:
          return 'top-2 right-2'
      }
    }
    
    const renderOfflineIndicator = () => {
      if (!showOfflineIndicator || !isActuallyOffline) return null
      
      return (
        <div className={cn('absolute z-10', getPositionClasses(offlineIndicatorPosition))}>
          <div className={cn(
            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
            offlineVariant === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
            offlineVariant === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
            'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
          )}>
            <WifiOff size={12} className="mr-1" />
            Offline
          </div>
        </div>
      )
    }
    
    const renderSyncStatus = () => {
      if (!showSyncStatus || !syncStatus) return null
      
      const getSyncIcon = () => {
        switch (syncStatus) {
          case 'synced':
            return <Cloud size={14} className="text-green-500" />
          case 'syncing':
            return <RefreshCw size={14} className="text-blue-500 animate-spin" />
          case 'pending':
            return <RefreshCw size={14} className="text-yellow-500" />
          case 'error':
            return <AlertTriangle size={14} className="text-red-500" />
          default:
            return null
        }
      }
      
      const getSyncText = () => {
        switch (syncStatus) {
          case 'synced':
            return 'Synced'
          case 'syncing':
            return 'Syncing...'
          case 'pending':
            return 'Pending'
          case 'error':
            return 'Sync Error'
          default:
            return ''
        }
      }
      
      const getSyncColorClasses = () => {
        switch (syncStatus) {
          case 'synced':
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          case 'syncing':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          case 'pending':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
          case 'error':
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          default:
            return ''
        }
      }
      
      return (
        <div className={cn('absolute z-10', getPositionClasses(syncStatusPosition))}>
          <div className={cn(
            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
            getSyncColorClasses()
          )}>
            {getSyncIcon()}
            <span className="ml-1">{getSyncText()}</span>
          </div>
        </div>
      )
    }
    
    const renderCollapseButton = () => {
      if (!collapsible) return null
      
      return (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            'absolute top-2 right-2 z-10 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
            (showOfflineIndicator && isActuallyOffline && offlineIndicatorPosition === 'top-right') ||
            (showSyncStatus && syncStatusPosition === 'top-right')
              ? 'right-10' 
              : ''
          )}
          aria-label={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? 
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg> : 
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/>
            </svg>
          }
        </button>
      )
    }
    
    if (skeleton) {
      return (
        <div
          ref={ref}
          className={cn(
            'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm animate-pulse',
            getOfflineVariantClasses(),
            getSyncStatusClasses(),
            className
          )}
          {...props}
        >
          <div className="px-6">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
          <div className="px-6">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      )
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm relative',
          getOfflineVariantClasses(),
          getSyncStatusClasses(),
          loading && 'opacity-70',
          className
        )}
        {...props}
      >
        {renderOfflineIndicator()}
        {renderSyncStatus()}
        {renderCollapseButton()}
        
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 rounded-xl z-20">
            <RefreshCw className="animate-spin text-gray-500" size={24} />
          </div>
        )}
        
        {!isCollapsed && children}
      </div>
    )
  }
)
EnhancedCard.displayName = 'EnhancedCard'

const EnhancedCardHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
      className,
    )}
    {...props}
  />
))
EnhancedCardHeader.displayName = 'EnhancedCardHeader'

const EnhancedCardTitle = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('leading-none font-semibold', className)}
    {...props}
  />
))
EnhancedCardTitle.displayName = 'EnhancedCardTitle'

const EnhancedCardDescription = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-muted-foreground text-sm', className)}
    {...props}
  />
))
EnhancedCardDescription.displayName = 'EnhancedCardDescription'

const EnhancedCardAction = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
      className,
    )}
    {...props}
  />
))
EnhancedCardAction.displayName = 'EnhancedCardAction'

const EnhancedCardContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-6', className)}
    {...props}
  />
))
EnhancedCardContent.displayName = 'EnhancedCardContent'

const EnhancedCardFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
    {...props}
  />
))
EnhancedCardFooter.displayName = 'EnhancedCardFooter'

export {
  EnhancedCard,
  EnhancedCardHeader,
  EnhancedCardFooter,
  EnhancedCardTitle,
  EnhancedCardAction,
  EnhancedCardDescription,
  EnhancedCardContent,
}