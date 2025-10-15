import { logger, logApiError, logApiRequest } from '@/lib/logger'

/**
 * Monitoring & Analytics Utilities
 * Integrates with Sentry, Google Analytics, and custom logging
 */

// Initialize monitoring (call in app/layout.tsx)
export function initMonitoring() {
  if (typeof window === 'undefined') return

  logger.info('Initializing monitoring...')
  
  // Sentry integration (if configured)
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // Note: Install @sentry/nextjs for full integration
    logger.info('Sentry DSN configured')
  }

  // Google Analytics (if configured)
  if (process.env.NEXT_PUBLIC_GA_ID) {
    loadGoogleAnalytics()
  }

  // Performance monitoring
  setupPerformanceMonitoring()
}

// Google Analytics loader
function loadGoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID
  if (!gaId) return

  const script1 = document.createElement('script')
  script1.async = true
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
  document.head.appendChild(script1)

  const script2 = document.createElement('script')
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gaId}');
  `
  document.head.appendChild(script2)
}

// Track custom events
export function trackEvent(event: string, data?: Record<string, any>) {
  if (typeof window === 'undefined') return

  // Google Analytics
  if ((window as any).gtag) {
    (window as any).gtag('event', event, data)
  }

  // Console log in development
  if (process.env.NODE_ENV === 'development') {
    logger.info('📊 Event tracked', { value: event, data })
  }
}

// Track page views
export function trackPageView(url: string) {
  if (typeof window === 'undefined') return

  if ((window as any).gtag) {
    (window as any).gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
      page_path: url,
    })
  }
}

// Track errors
export function trackError(error: Error, context?: Record<string, any>) {
  logger.error('Error tracked', error as Error, context)

  // Sentry (if configured)
  if ((window as any).Sentry) {
    (window as any).Sentry.captureException(error, { extra: context })
  }

  // Google Analytics error event
  trackEvent('error', {
    error_message: error.message,
    error_stack: error.stack,
    ...context
  })
}

// Performance monitoring
function setupPerformanceMonitoring() {
  if (!window.performance) return

  // Monitor page load time
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = window.performance.timing
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart
      
      trackEvent('performance', {
        metric: 'page_load_time',
        value: pageLoadTime,
        unit: 'ms'
      })

      logger.info('📈 Page load time: ${pageLoadTime}ms')
    }, 0)
  })
}

// API performance tracking
export function trackAPICall(endpoint: string, duration: number, success: boolean) {
  trackEvent('api_call', {
    endpoint,
    duration,
    success,
    unit: 'ms'
  })

  if (duration > 3000) {
    logger.warn('⚠️  Slow API call: ${endpoint} (${duration}ms)')
  }
}

// User activity tracking
export function trackUserAction(action: string, details?: Record<string, any>) {
  trackEvent('user_action', {
    action,
    ...details,
    timestamp: new Date().toISOString()
  })
}

// Export for use in components
export const monitoring = {
  init: initMonitoring,
  trackEvent,
  trackPageView,
  trackError,
  trackAPICall,
  trackUserAction
}

export default monitoring
