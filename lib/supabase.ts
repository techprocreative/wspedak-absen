import { createClient, SupabaseClient, User, Session, RealtimeChannel } from '@supabase/supabase-js'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// These environment variables should be set in .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Network status interface
export interface NetworkStatus {
  isOnline: boolean
  lastOnline?: Date
  lastOffline?: Date
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g'
  downlink?: number
  rtt?: number
}

// Auth state interface
export interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  error: Error | null
}

// Realtime subscription interface
export interface RealtimeSubscription {
  channel: RealtimeChannel
  table: string
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  callback: (payload: any) => void
}

// Retry configuration interface
export interface RetryConfig {
  maxRetries: number
  retryDelay: number
  maxRetryDelay: number
  retryBackoffFactor: number
}

// Connection pool configuration interface
export interface ConnectionPoolConfig {
  maxConnections: number
  minConnections: number
  acquireTimeout: number
  idleTimeout: number
  maxLifetime: number
  healthCheckInterval: number
}

// Connection pool statistics interface
export interface ConnectionPoolStats {
  totalConnections: number
  activeConnections: number
  idleConnections: number
  waitingRequests: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
}

// Pooled connection interface
interface PooledConnection {
  id: string
  client: SupabaseClient
  createdAt: Date
  lastUsedAt: Date
  lastHealthCheckAt: Date
  isActive: boolean
  isHealthy: boolean
  requestCount: number
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  maxRetryDelay: 30000,
  retryBackoffFactor: 2,
}

// Default connection pool configuration
const DEFAULT_CONNECTION_POOL_CONFIG: ConnectionPoolConfig = {
  maxConnections: 2, // Reduced: Maximum number of connections in the pool
  minConnections: 0, // Changed to 0 to avoid creating connections until needed
  acquireTimeout: 5000, // Maximum time to wait for a connection (ms)
  idleTimeout: 30000, // Time after which idle connections are closed (ms)
  maxLifetime: 300000, // Maximum lifetime of a connection (ms)
  healthCheckInterval: 10000, // Interval between health checks (ms)
}

// Connection pool class
class ConnectionPool {
  private config: ConnectionPoolConfig
  private connections: Map<string, PooledConnection> = new Map()
  private waitingQueue: Array<{
    resolve: (connection: PooledConnection) => void
    reject: (error: Error) => void
    timestamp: number
  }> = []
  private healthCheckIntervalId: number | null = null
  private connectionIdCounter = 0

  constructor(config: ConnectionPoolConfig = DEFAULT_CONNECTION_POOL_CONFIG) {
    this.config = config
    
    // Only initialize connections if minConnections > 0
    if (this.config.minConnections > 0) {
      this.initializeMinConnections()
    }
    
    // Start health check interval
    this.startHealthCheckInterval()
  }

  /**
   * Initialize minimum connections
   */
  private async initializeMinConnections(): Promise<void> {
    for (let i = 0; i < this.config.minConnections; i++) {
      await this.createConnection()
    }
  }

  /**
   * Create a new connection
   */
  private async createConnection(): Promise<PooledConnection> {
    const id = this.generateConnectionId()
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })

    const connection: PooledConnection = {
      id,
      client,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      lastHealthCheckAt: new Date(),
      isActive: false,
      isHealthy: true,
      requestCount: 0,
    }

    this.connections.set(id, connection)
    return connection
  }

  /**
   * Generate a unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${++this.connectionIdCounter}_${Date.now()}`
  }

  /**
   * Acquire a connection from the pool
   */
  async acquireConnection(): Promise<PooledConnection> {
    // Try to find an idle, healthy connection
    for (const connection of this.connections.values()) {
      if (!connection.isActive && connection.isHealthy) {
        connection.isActive = true
        connection.lastUsedAt = new Date()
        connection.requestCount++
        return connection
      }
    }

    // If no idle connection is available and we can create more, create a new one
    if (this.connections.size < this.config.maxConnections) {
      const connection = await this.createConnection()
      connection.isActive = true
      connection.lastUsedAt = new Date()
      connection.requestCount++
      return connection
    }

    // If we can't create more connections, wait for one to become available
    return new Promise((resolve, reject) => {
      this.waitingQueue.push({
        resolve,
        reject,
        timestamp: Date.now(),
      })

      // Set timeout for acquiring connection
      setTimeout(() => {
        const index = this.waitingQueue.findIndex(item => item.resolve === resolve)
        if (index !== -1) {
          this.waitingQueue.splice(index, 1)
          reject(new Error('Connection acquire timeout'))
        }
      }, this.config.acquireTimeout)
    })
  }

  /**
   * Release a connection back to the pool
   */
  releaseConnection(connection: PooledConnection): void {
    if (!this.connections.has(connection.id)) {
      return
    }

    connection.isActive = false
    connection.lastUsedAt = new Date()

    // Check if there are waiting requests
    if (this.waitingQueue.length > 0) {
      const waiting = this.waitingQueue.shift()!
      connection.isActive = true
      connection.lastUsedAt = new Date()
      connection.requestCount++
      waiting.resolve(connection)
    }
  }

  /**
   * Start health check interval
   */
  private startHealthCheckInterval(): void {
    if (typeof window === 'undefined') return
    
    this.healthCheckIntervalId = window.setInterval(() => {
      this.performHealthChecks()
    }, this.config.healthCheckInterval)
  }

  /**
   * Perform health checks on all connections
   */
  private async performHealthChecks(): Promise<void> {
    const now = Date.now()

    for (const connection of this.connections.values()) {
      // Skip active connections
      if (connection.isActive) {
        continue
      }

      // Check if connection is too old
      if (now - connection.createdAt.getTime() > this.config.maxLifetime) {
        this.connections.delete(connection.id)
        continue
      }

      // Check if connection has been idle for too long
      if (now - connection.lastUsedAt.getTime() > this.config.idleTimeout &&
          this.connections.size > this.config.minConnections) {
        this.connections.delete(connection.id)
        continue
      }

      // Perform health check if needed
      if (now - connection.lastHealthCheckAt.getTime() > this.config.healthCheckInterval) {
        try {
          // Simple health check - try to get session
          await connection.client.auth.getSession()
          connection.isHealthy = true
          connection.lastHealthCheckAt = new Date()
        } catch (error) {
          logger.error('Connection health check failed', error as Error)
          connection.isHealthy = false
          
          // Remove unhealthy connection
          this.connections.delete(connection.id)
          
          // Create a new connection if needed
          if (this.connections.size < this.config.minConnections) {
            this.createConnection()
          }
        }
      }
    }
  }

  /**
   * Get connection pool statistics
   */
  getStats(): ConnectionPoolStats {
    const totalConnections = this.connections.size
    const activeConnections = Array.from(this.connections.values())
      .filter(conn => conn.isActive).length
    const idleConnections = totalConnections - activeConnections
    const waitingRequests = this.waitingQueue.length

    return {
      totalConnections,
      activeConnections,
      idleConnections,
      waitingRequests,
      totalRequests: 0, // Would need to track this
      successfulRequests: 0, // Would need to track this
      failedRequests: 0, // Would need to track this
      averageResponseTime: 0, // Would need to track this
    }
  }

  /**
   * Close all connections and clean up the pool
   */
  async close(): Promise<void> {
    // Stop health check interval
    if (this.healthCheckIntervalId !== null) {
      clearInterval(this.healthCheckIntervalId)
      this.healthCheckIntervalId = null
    }

    // Reject all waiting requests
    for (const waiting of this.waitingQueue) {
      waiting.reject(new Error('Connection pool is closing'))
    }
    this.waitingQueue = []

    // Close all connections
    this.connections.clear()
  }
}

// Enhanced Supabase client with offline support and connection pooling
class SupabaseService {
  private connectionPool: ConnectionPool
  private networkStatus: NetworkStatus = { isOnline: true }
  private authState: AuthState = { user: null, session: null, isLoading: true, error: null }
  private subscriptions: RealtimeSubscription[] = []
  private networkListeners: (() => void)[] = []
  private authListeners: (() => void)[] = []
  private retryConfig: RetryConfig
  private connectionPoolConfig: ConnectionPoolConfig

  constructor(
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
    connectionPoolConfig: ConnectionPoolConfig = DEFAULT_CONNECTION_POOL_CONFIG
  ) {
    this.retryConfig = retryConfig
    this.connectionPoolConfig = connectionPoolConfig
    
    // Create connection pool
    this.connectionPool = new ConnectionPool(connectionPoolConfig)

    // Initialize network status
    this.initializeNetworkStatus()
    
    // Initialize auth state
    this.initializeAuthState()
  }

  // Network status management
  private initializeNetworkStatus(): void {
    if (typeof window === 'undefined') return

    // Set initial status
    this.networkStatus = {
      isOnline: navigator.onLine,
      lastOnline: navigator.onLine ? new Date() : undefined,
      lastOffline: !navigator.onLine ? new Date() : undefined,
    }

    // Get connection information if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      this.networkStatus.effectiveType = connection.effectiveType
      this.networkStatus.downlink = connection.downlink
      this.networkStatus.rtt = connection.rtt

      // Listen for connection changes
      connection.addEventListener('change', () => {
        this.networkStatus.effectiveType = connection.effectiveType
        this.networkStatus.downlink = connection.downlink
        this.networkStatus.rtt = connection.rtt
        this.notifyNetworkListeners()
      })
    }

    // Listen for online/offline events
    const handleOnline = () => {
      this.networkStatus.isOnline = true
      this.networkStatus.lastOnline = new Date()
      this.notifyNetworkListeners()
      
      // Retry failed operations when coming back online
      this.retryFailedOperations()
    }

    const handleOffline = () => {
      this.networkStatus.isOnline = false
      this.networkStatus.lastOffline = new Date()
      this.notifyNetworkListeners()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Store cleanup function
    this.networkListeners.push(() => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    })
  }

  // Auth state management
  private async initializeAuthState(): Promise<void> {
    // Get initial session
    try {
      const client = await this.getClient()
      const { data: { session }, error } = await client.auth.getSession()
      
      if (error) {
        this.authState.error = error
      } else {
        this.authState.session = session
        this.authState.user = session?.user || null
      }
      this.authState.isLoading = false
      this.notifyAuthListeners()
    } catch (error) {
      logger.error('Error initializing auth state', error as Error)
      this.authState.error = error as Error
      this.authState.isLoading = false
      this.notifyAuthListeners()
    }

    // Listen for auth changes
    try {
      const client = await this.getClient()
      const { data: { subscription } } = client.auth.onAuthStateChange(
        async (event: any, session: any) => {
          this.authState.isLoading = true
          this.notifyAuthListeners()

          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            this.authState.session = session
            this.authState.user = session?.user || null
            this.authState.error = null
          } else if (event === 'SIGNED_OUT') {
            this.authState.session = null
            this.authState.user = null
            this.authState.error = null
          } else if (event === 'USER_UPDATED') {
            this.authState.user = session?.user || null
          }

          this.authState.isLoading = false
          this.notifyAuthListeners()
        }
      )

      // Store cleanup function
      this.authListeners.push(() => {
        subscription.unsubscribe()
      })
    } catch (error) {
      logger.error('Error setting up auth state listener', error as Error)
    }
  }

  // Network status listeners
  private notifyNetworkListeners(): void {
    // This would typically notify React components or other parts of the app
    // For now, we'll just dispatch a custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('networkStatusChange', {
        detail: this.networkStatus,
      }))
    }
  }

  // Auth state listeners
  private notifyAuthListeners(): void {
    // This would typically notify React components or other parts of the app
    // For now, we'll just dispatch a custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('authStateChange', {
        detail: this.authState,
      }))
    }
  }

  // Retry failed operations with exponential backoff
  private async retryFailedOperations(): Promise<void> {
    // This would be implemented to retry operations that failed while offline
    // For now, it's a placeholder for future implementation
    logger.info('Retrying failed operations...')
  }

  // Calculate retry delay with exponential backoff
  private calculateRetryDelay(retryCount: number): number {
    const delay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.retryBackoffFactor, retryCount)
    return Math.min(delay, this.retryConfig.maxRetryDelay)
  }

  // Execute operation with retry logic
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number
      retryCondition?: (error: any) => boolean
    } = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? this.retryConfig.maxRetries
    const retryCondition = options.retryCondition ?? (() => true)
    
    let lastError: any
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        // If we shouldn't retry this error or we're on our last attempt, throw
        if (!retryCondition(error) || attempt === maxRetries) {
          throw error
        }
        
        // Wait before retrying
        const delay = this.calculateRetryDelay(attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  }

  // Realtime subscription management
  async subscribe(
    table: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
    callback: (payload: any) => void,
    filter?: string
  ): Promise<RealtimeChannel> {
    const client = await this.getClient()
    const channelName = `${table}_${event}_${Date.now()}`
    
    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event,
          schema: 'public',
          table,
          filter,
        },
        callback
      )
      .subscribe()
    
    const subscription: RealtimeSubscription = {
      channel,
      table,
      event,
      callback,
    }
    
    this.subscriptions.push(subscription)
    return channel
  }

  async unsubscribe(channel: RealtimeChannel): Promise<void> {
    const client = await this.getClient()
    client.removeChannel(channel)
    this.subscriptions = this.subscriptions.filter(sub => sub.channel !== channel)
  }

  async unsubscribeAll(): Promise<void> {
    const client = await this.getClient()
    this.subscriptions.forEach(sub => {
      client.removeChannel(sub.channel)
    })
    this.subscriptions = []
  }

  /**
   * Get a client from the connection pool
   */
  async getClient(): Promise<SupabaseClient> {
    const connection = await this.connectionPool.acquireConnection()
    
    // Return a proxy that releases the connection when done
    return new Proxy(connection.client, {
      get: (target, prop) => {
        const value = target[prop as keyof SupabaseClient]
        
        // If the property is a function, wrap it to release the connection
        if (typeof value === 'function') {
          return (...args: any[]) => {
            try {
              // Use call instead of apply to avoid TypeScript errors
              const result = (value as any).call(target, ...args)
              
              // Special handling for removeChannel which returns a promise
              if (prop === 'removeChannel' && result && typeof result.then === 'function') {
                return result.finally(() => {
                  this.connectionPool.releaseConnection(connection)
                })
              }
              
              // Special handling for channel.subscribe which doesn't return a promise
              if (prop === 'subscribe') {
                this.connectionPool.releaseConnection(connection)
                return result
              }
              
              // If the result is a promise, release the connection when it resolves/rejects
              if (result && typeof result.then === 'function') {
                return result.finally(() => {
                  this.connectionPool.releaseConnection(connection)
                })
              } else {
                // For synchronous operations, release immediately
                this.connectionPool.releaseConnection(connection)
                return result
              }
            } catch (error) {
              // Release connection on error
              this.connectionPool.releaseConnection(connection)
              throw error
            }
          }
        }
        
        return value
      }
    })
  }

  /**
   * Get a client without connection pooling for backward compatibility
   */
  getDirectClient(): SupabaseClient {
    // Create a new client without connection pooling
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
  }

  /**
   * Get connection pool statistics
   */
  getConnectionPoolStats(): ConnectionPoolStats {
    return this.connectionPool.getStats()
  }

  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus }
  }

  getAuthState(): AuthState {
    return { ...this.authState }
  }

  isOnline(): boolean {
    return this.networkStatus.isOnline
  }

  // Auth methods
  async signIn(email: string, password: string) {
    const client = await this.getClient()
    return await this.executeWithRetry(() =>
      client.auth.signInWithPassword({ email, password })
    )
  }

  async signOut() {
    const client = await this.getClient()
    return await client.auth.signOut()
  }

  async resetPassword(email: string) {
    const client = await this.getClient()
    return await this.executeWithRetry(() =>
      client.auth.resetPasswordForEmail(email)
    )
  }

  // Cleanup
  async destroy(): Promise<void> {
    // Remove all event listeners
    this.networkListeners.forEach(cleanup => cleanup())
    this.authListeners.forEach(cleanup => cleanup())
    
    // Unsubscribe from all realtime channels
    this.unsubscribeAll()
    
    // Close connection pool
    await this.connectionPool.close()
  }
}

// Create a singleton instance
export const supabaseService = new SupabaseService()

// Lazy-loaded singleton client to avoid multiple instances
let directClient: SupabaseClient | null = null

// Export the raw client for direct usage when needed
// Note: This is deprecated in favor of getClient() which uses connection pooling
export const supabase = (() => {
  // Only create the client when it's actually accessed
  if (!directClient) {
    directClient = supabaseService.getDirectClient()
  }
  return directClient
})()

// Helper function to check if we're online
export const isOnline = () => {
  return supabaseService.isOnline()
}

// Helper function to handle offline/online status
export const setupNetworkListeners = (callback: (isOnline: boolean) => void) => {
  if (typeof window === 'undefined') return

  const handleNetworkChange = (event: CustomEvent) => {
    callback(event.detail.isOnline)
  }

  window.addEventListener('networkStatusChange', handleNetworkChange as EventListener)

  // Return cleanup function
  return () => {
    window.removeEventListener('networkStatusChange', handleNetworkChange as EventListener)
  }
}

// Helper function to handle auth state changes
export const setupAuthListeners = (callback: (authState: AuthState) => void) => {
  if (typeof window === 'undefined') return

  const handleAuthChange = (event: CustomEvent) => {
    callback(event.detail)
  }

  window.addEventListener('authStateChange', handleAuthChange as EventListener)

  // Return cleanup function
  return () => {
    window.removeEventListener('authStateChange', handleAuthChange as EventListener)
  }
}