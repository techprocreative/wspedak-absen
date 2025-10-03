/**
 * Adaptive Sync Manager
 * Provides adaptive synchronization intervals based on network conditions
 * Optimized for DS223J hardware constraints
 */

export interface NetworkCondition {
  isOnline: boolean;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number; // Mbps
  rtt: number; // ms
  saveData: boolean;
  timestamp: number;
}

export interface AdaptiveSyncOptions {
  // Adaptive options
  enableAdaptiveSync?: boolean;
  networkCheckInterval?: number; // ms
  
  // Sync interval options
  baseSyncInterval?: number; // ms
  minSyncInterval?: number; // ms
  maxSyncInterval?: number; // ms
  
  // Network condition thresholds
  slowNetworkThreshold?: number; // Mbps
  fastNetworkThreshold?: number; // Mbps
  highLatencyThreshold?: number; // ms
  
  // Performance options
  enablePerformanceOptimization?: boolean;
  maxNetworkCheckTime?: number; // ms
}

export interface SyncIntervalConfig {
  interval: number; // ms
  reason: string;
  networkCondition: NetworkCondition;
  timestamp: number;
}

export class AdaptiveSyncManager {
  private options: AdaptiveSyncOptions;
  private isAdapting = false;
  private networkCheckIntervalId: number | null = null;
  private currentNetworkCondition: NetworkCondition | null = null;
  private currentSyncInterval: number;
  private syncIntervalHistory: SyncIntervalConfig[] = [];
  private networkConditionHistory: NetworkCondition[] = [];
  private syncIntervalChangeCallbacks: Array<(config: SyncIntervalConfig) => void> = [];

  constructor(options: AdaptiveSyncOptions = {}) {
    this.options = {
      enableAdaptiveSync: true,
      networkCheckInterval: 30000, // 30 seconds
      baseSyncInterval: 300000, // 5 minutes
      minSyncInterval: 60000, // 1 minute
      maxSyncInterval: 600000, // 10 minutes
      slowNetworkThreshold: 1, // 1 Mbps
      fastNetworkThreshold: 10, // 10 Mbps
      highLatencyThreshold: 1000, // 1 second
      enablePerformanceOptimization: true,
      maxNetworkCheckTime: 100, // 100ms
      ...options,
    };
    
    this.currentSyncInterval = this.options.baseSyncInterval!;
  }

  /**
   * Initialize the adaptive sync manager
   */
  initialize(): void {
    if (!this.options.enableAdaptiveSync) {
      return;
    }

    // Get initial network condition
    this.updateNetworkCondition();
    
    // Start periodic network checks
    this.startNetworkChecks();
    
    console.log('Adaptive sync manager initialized');
  }

  /**
   * Cleanup the adaptive sync manager
   */
  cleanup(): void {
    // Stop network checks
    this.stopNetworkChecks();
    
    console.log('Adaptive sync manager cleaned up');
  }

  /**
   * Start periodic network checks
   */
  startNetworkChecks(): void {
    if (this.networkCheckIntervalId !== null) {
      return;
    }
    
    this.networkCheckIntervalId = window.setInterval(() => {
      this.updateNetworkCondition();
      this.adaptSyncInterval();
    }, this.options.networkCheckInterval);
  }

  /**
   * Stop periodic network checks
   */
  stopNetworkChecks(): void {
    if (this.networkCheckIntervalId !== null) {
      clearInterval(this.networkCheckIntervalId);
      this.networkCheckIntervalId = null;
    }
  }

  /**
   * Update network condition
   */
  updateNetworkCondition(): NetworkCondition | null {
    const startTime = performance.now();
    
    try {
      // Get network information
      const connection = this.getConnectionInformation();
      
      // Create network condition
      const networkCondition: NetworkCondition = {
        isOnline: navigator.onLine,
        effectiveType: connection?.effectiveType || '4g',
        downlink: connection?.downlink || 10,
        rtt: connection?.rtt || 100,
        saveData: connection?.saveData || false,
        timestamp: Date.now(),
      };
      
      // Update current network condition
      this.currentNetworkCondition = networkCondition;
      
      // Add to history
      this.networkConditionHistory.push(networkCondition);
      
      // Limit history size
      if (this.networkConditionHistory.length > 20) {
        this.networkConditionHistory.shift();
      }
      
      const endTime = performance.now();
      
      // Check if network check took too long
      if (this.options.enablePerformanceOptimization && 
          endTime - startTime > this.options.maxNetworkCheckTime!) {
        console.warn(`Network condition check took too long: ${endTime - startTime}ms`);
      }
      
      return networkCondition;
    } catch (error) {
      console.error('Failed to update network condition:', error);
      return null;
    }
  }

  /**
   * Get connection information
   */
  private getConnectionInformation(): any {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      return (navigator as any).connection;
    }
    
    return null;
  }

  /**
   * Adapt sync interval based on network condition
   */
  adaptSyncInterval(): SyncIntervalConfig | null {
    if (!this.currentNetworkCondition || this.isAdapting) {
      return null;
    }
    
    this.isAdapting = true;
    
    try {
      const networkCondition = this.currentNetworkCondition;
      let newInterval = this.currentSyncInterval;
      let reason = 'No change';
      
      // If offline, use max interval
      if (!networkCondition.isOnline) {
        newInterval = this.options.maxSyncInterval!;
        reason = 'Device is offline';
      }
      // If save data mode, use max interval
      else if (networkCondition.saveData) {
        newInterval = this.options.maxSyncInterval!;
        reason = 'Save data mode is enabled';
      }
      // If slow network, use longer interval
      else if (networkCondition.downlink < this.options.slowNetworkThreshold!) {
        newInterval = Math.min(
          this.currentSyncInterval * 1.5,
          this.options.maxSyncInterval!
        );
        reason = `Slow network detected: ${networkCondition.downlink} Mbps`;
      }
      // If high latency, use longer interval
      else if (networkCondition.rtt > this.options.highLatencyThreshold!) {
        newInterval = Math.min(
          this.currentSyncInterval * 1.2,
          this.options.maxSyncInterval!
        );
        reason = `High latency detected: ${networkCondition.rtt} ms`;
      }
      // If fast network, use shorter interval
      else if (networkCondition.downlink > this.options.fastNetworkThreshold! && 
               networkCondition.rtt < this.options.highLatencyThreshold! / 2) {
        newInterval = Math.max(
          this.currentSyncInterval * 0.8,
          this.options.minSyncInterval!
        );
        reason = `Fast network detected: ${networkCondition.downlink} Mbps, ${networkCondition.rtt} ms RTT`;
      }
      // If network improved, gradually reduce interval
      else if (this.networkConditionHistory.length > 1) {
        const previousCondition = this.networkConditionHistory[this.networkConditionHistory.length - 2];
        
        if (networkCondition.downlink > previousCondition.downlink * 1.2 &&
            networkCondition.rtt < previousCondition.rtt * 0.8) {
          newInterval = Math.max(
            this.currentSyncInterval * 0.9,
            this.options.minSyncInterval!
          );
          reason = 'Network condition improved';
        }
        // If network degraded, gradually increase interval
        else if (networkCondition.downlink < previousCondition.downlink * 0.8 ||
                  networkCondition.rtt > previousCondition.rtt * 1.2) {
          newInterval = Math.min(
            this.currentSyncInterval * 1.1,
            this.options.maxSyncInterval!
          );
          reason = 'Network condition degraded';
        }
      }
      
      // Round to nearest second
      newInterval = Math.round(newInterval / 1000) * 1000;
      
      // Update current sync interval if changed
      if (newInterval !== this.currentSyncInterval) {
        this.currentSyncInterval = newInterval;
        
        // Create config
        const config: SyncIntervalConfig = {
          interval: newInterval,
          reason,
          networkCondition,
          timestamp: Date.now(),
        };
        
        // Add to history
        this.syncIntervalHistory.push(config);
        
        // Limit history size
        if (this.syncIntervalHistory.length > 20) {
          this.syncIntervalHistory.shift();
        }
        
        // Notify callbacks
        this.syncIntervalChangeCallbacks.forEach(callback => callback(config));
        
        console.log(`Sync interval adapted to ${newInterval / 1000}s: ${reason}`);
        
        return config;
      }
      
      return null;
    } finally {
      this.isAdapting = false;
    }
  }

  /**
   * Force adaptation of sync interval
   */
  forceAdaptation(): SyncIntervalConfig | null {
    // Update network condition
    this.updateNetworkCondition();
    
    // Adapt sync interval
    return this.adaptSyncInterval();
  }

  /**
   * Get current sync interval
   */
  getCurrentSyncInterval(): number {
    return this.currentSyncInterval;
  }

  /**
   * Get current network condition
   */
  getCurrentNetworkCondition(): NetworkCondition | null {
    return this.currentNetworkCondition;
  }

  /**
   * Get sync interval history
   */
  getSyncIntervalHistory(): SyncIntervalConfig[] {
    return [...this.syncIntervalHistory];
  }

  /**
   * Get network condition history
   */
  getNetworkConditionHistory(): NetworkCondition[] {
    return [...this.networkConditionHistory];
  }

  /**
   * Register a sync interval change callback
   */
  onSyncIntervalChange(callback: (config: SyncIntervalConfig) => void): void {
    this.syncIntervalChangeCallbacks.push(callback);
  }

  /**
   * Unregister a sync interval change callback
   */
  offSyncIntervalChange(callback: (config: SyncIntervalConfig) => void): void {
    const index = this.syncIntervalChangeCallbacks.indexOf(callback);
    if (index !== -1) {
      this.syncIntervalChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Check if currently adapting
   */
  isCurrentlyAdapting(): boolean {
    return this.isAdapting;
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<AdaptiveSyncOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Restart network checks if interval changed
    if (this.networkCheckIntervalId !== null && newOptions.networkCheckInterval) {
      this.stopNetworkChecks();
      this.startNetworkChecks();
    }
  }

  /**
   * Get current options
   */
  getOptions(): AdaptiveSyncOptions {
    return { ...this.options };
  }
}

// Singleton instance with default options
export const adaptiveSyncManager = new AdaptiveSyncManager({
  enableAdaptiveSync: true,
  networkCheckInterval: 30000,
  baseSyncInterval: 300000,
  minSyncInterval: 60000,
  maxSyncInterval: 600000,
  slowNetworkThreshold: 1,
  fastNetworkThreshold: 10,
  highLatencyThreshold: 1000,
  enablePerformanceOptimization: true,
  maxNetworkCheckTime: 100,
});

// Export a factory function for easier usage
export function createAdaptiveSyncManager(options?: AdaptiveSyncOptions): AdaptiveSyncManager {
  return new AdaptiveSyncManager(options);
}