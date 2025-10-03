/**
 * Bandwidth Throttler
 * Provides bandwidth throttling for network requests to optimize performance on constrained networks
 * Optimized for DS223J hardware constraints
 */

export interface BandwidthThrottlerOptions {
  // Throttling options
  enableThrottling?: boolean;
  checkInterval?: number; // ms
  
  // Bandwidth limits
  maxUploadSpeed?: number; // KB/s
  maxDownloadSpeed?: number; // KB/s
  adaptiveThrottling?: boolean;
  
  // Performance options
  enablePerformanceOptimization?: boolean;
  maxCheckTime?: number; // ms
}

export interface BandwidthUsage {
  timestamp: number;
  uploadSpeed: number; // KB/s
  downloadSpeed: number; // KB/s
  latency: number; // ms
}

export interface ThrottleConfig {
  uploadSpeed: number; // KB/s
  downloadSpeed: number; // KB/s
  reason: string;
  timestamp: number;
}

export class BandwidthThrottler {
  private options: BandwidthThrottlerOptions;
  private isChecking = false;
  private checkIntervalId: number | null = null;
  private currentConfig: ThrottleConfig | null = null;
  private bandwidthHistory: BandwidthUsage[] = [];
  private configChangeCallbacks: Array<(config: ThrottleConfig) => void> = [];
  private activeRequests: Map<string, { startTime: number; bytes: number; type: 'upload' | 'download' }> = new Map();

  constructor(options: BandwidthThrottlerOptions = {}) {
    this.options = {
      enableThrottling: true,
      checkInterval: 30000, // 30 seconds
      maxUploadSpeed: 500, // 500 KB/s
      maxDownloadSpeed: 1000, // 1 MB/s
      adaptiveThrottling: true,
      enablePerformanceOptimization: true,
      maxCheckTime: 100, // 100ms
      ...options,
    };
    
    // Initialize with default config
    this.currentConfig = {
      uploadSpeed: this.options.maxUploadSpeed!,
      downloadSpeed: this.options.maxDownloadSpeed!,
      reason: 'Initial configuration',
      timestamp: Date.now(),
    };
  }

  /**
   * Initialize the bandwidth throttler
   */
  initialize(): void {
    if (!this.options.enableThrottling) {
      return;
    }

    // Start periodic bandwidth checks
    this.startBandwidthChecks();
    
    console.log('Bandwidth throttler initialized');
  }

  /**
   * Cleanup the bandwidth throttler
   */
  cleanup(): void {
    // Stop bandwidth checks
    this.stopBandwidthChecks();
    
    console.log('Bandwidth throttler cleaned up');
  }

  /**
   * Start periodic bandwidth checks
   */
  private startBandwidthChecks(): void {
    if (this.checkIntervalId !== null) {
      return;
    }
    
    this.checkIntervalId = window.setInterval(() => {
      this.checkBandwidth();
    }, this.options.checkInterval);
  }

  /**
   * Stop periodic bandwidth checks
   */
  private stopBandwidthChecks(): void {
    if (this.checkIntervalId !== null) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  /**
   * Check current bandwidth and adjust throttling if needed
   */
  private checkBandwidth(): void {
    if (this.isChecking) {
      return;
    }
    
    this.isChecking = true;
    const startTime = performance.now();
    
    try {
      // Measure current bandwidth
      const bandwidthUsage = this.measureBandwidth();
      
      // Add to history
      this.bandwidthHistory.push(bandwidthUsage);
      
      // Limit history size
      if (this.bandwidthHistory.length > 20) {
        this.bandwidthHistory.shift();
      }
      
      // Adjust throttling if adaptive throttling is enabled
      if (this.options.adaptiveThrottling) {
        this.adjustThrottling(bandwidthUsage);
      }
      
      const endTime = performance.now();
      
      // Check if bandwidth check took too long
      if (this.options.enablePerformanceOptimization && 
          endTime - startTime > this.options.maxCheckTime!) {
        console.warn(`Bandwidth check took too long: ${endTime - startTime}ms`);
      }
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Measure current bandwidth
   */
  private measureBandwidth(): BandwidthUsage {
    // Calculate average upload speed from active requests
    let uploadSpeed = 0;
    let uploadCount = 0;
    
    // Calculate average download speed from active requests
    let downloadSpeed = 0;
    let downloadCount = 0;
    
    const now = Date.now();
    
    for (const [id, request] of this.activeRequests.entries()) {
      const elapsed = (now - request.startTime) / 1000; // seconds
      
      if (elapsed > 0) {
        const speed = request.bytes / 1024 / elapsed; // KB/s
        
        if (request.type === 'upload') {
          uploadSpeed += speed;
          uploadCount++;
        } else {
          downloadSpeed += speed;
          downloadCount++;
        }
      }
    }
    
    // Calculate averages
    if (uploadCount > 0) {
      uploadSpeed = uploadSpeed / uploadCount;
    }
    
    if (downloadCount > 0) {
      downloadSpeed = downloadSpeed / downloadCount;
    }
    
    // Estimate latency (simplified implementation)
    let latency = 100; // Default to 100ms
    
    if (this.bandwidthHistory.length > 0) {
      // Use previous latency as estimate
      latency = this.bandwidthHistory[this.bandwidthHistory.length - 1].latency;
    }
    
    return {
      timestamp: now,
      uploadSpeed,
      downloadSpeed,
      latency,
    };
  }

  /**
   * Adjust throttling based on bandwidth usage
   */
  private adjustThrottling(bandwidthUsage: BandwidthUsage): void {
    if (!this.currentConfig) {
      return;
    }
    
    let newUploadSpeed = this.currentConfig.uploadSpeed;
    let newDownloadSpeed = this.currentConfig.downloadSpeed;
    let reason = 'No change';
    
    // If we have enough history, make adjustments
    if (this.bandwidthHistory.length >= 3) {
      const recentHistory = this.bandwidthHistory.slice(-3);
      const avgUploadSpeed = recentHistory.reduce((sum, usage) => sum + usage.uploadSpeed, 0) / recentHistory.length;
      const avgDownloadSpeed = recentHistory.reduce((sum, usage) => sum + usage.downloadSpeed, 0) / recentHistory.length;
      const avgLatency = recentHistory.reduce((sum, usage) => sum + usage.latency, 0) / recentHistory.length;
      
      // If upload speed is close to limit, reduce throttling
      if (avgUploadSpeed > this.options.maxUploadSpeed! * 0.9) {
        newUploadSpeed = Math.max(
          this.currentConfig.uploadSpeed * 0.8,
          this.options.maxUploadSpeed! * 0.3
        );
        reason = `Upload speed approaching limit: ${avgUploadSpeed.toFixed(2)} KB/s`;
      }
      // If upload speed is low and latency is high, reduce throttling
      else if (avgUploadSpeed < this.options.maxUploadSpeed! * 0.5 && avgLatency > 500) {
        newUploadSpeed = Math.max(
          this.currentConfig.uploadSpeed * 0.9,
          this.options.maxUploadSpeed! * 0.2
        );
        reason = `Low upload speed and high latency: ${avgUploadSpeed.toFixed(2)} KB/s, ${avgLatency}ms`;
      }
      // If upload speed is good and latency is low, increase throttling
      else if (avgUploadSpeed < this.options.maxUploadSpeed! * 0.7 && avgLatency < 200) {
        newUploadSpeed = Math.min(
          this.currentConfig.uploadSpeed * 1.1,
          this.options.maxUploadSpeed!
        );
        reason = `Good upload speed and latency: ${avgUploadSpeed.toFixed(2)} KB/s, ${avgLatency}ms`;
      }
      
      // If download speed is close to limit, reduce throttling
      if (avgDownloadSpeed > this.options.maxDownloadSpeed! * 0.9) {
        newDownloadSpeed = Math.max(
          this.currentConfig.downloadSpeed * 0.8,
          this.options.maxDownloadSpeed! * 0.3
        );
        reason = `Download speed approaching limit: ${avgDownloadSpeed.toFixed(2)} KB/s`;
      }
      // If download speed is low and latency is high, reduce throttling
      else if (avgDownloadSpeed < this.options.maxDownloadSpeed! * 0.5 && avgLatency > 500) {
        newDownloadSpeed = Math.max(
          this.currentConfig.downloadSpeed * 0.9,
          this.options.maxDownloadSpeed! * 0.2
        );
        reason = `Low download speed and high latency: ${avgDownloadSpeed.toFixed(2)} KB/s, ${avgLatency}ms`;
      }
      // If download speed is good and latency is low, increase throttling
      else if (avgDownloadSpeed < this.options.maxDownloadSpeed! * 0.7 && avgLatency < 200) {
        newDownloadSpeed = Math.min(
          this.currentConfig.downloadSpeed * 1.1,
          this.options.maxDownloadSpeed!
        );
        reason = `Good download speed and latency: ${avgDownloadSpeed.toFixed(2)} KB/s, ${avgLatency}ms`;
      }
    }
    
    // Update config if changed
    if (newUploadSpeed !== this.currentConfig.uploadSpeed || 
        newDownloadSpeed !== this.currentConfig.downloadSpeed) {
      this.currentConfig = {
        uploadSpeed: newUploadSpeed,
        downloadSpeed: newDownloadSpeed,
        reason,
        timestamp: Date.now(),
      };
      
      // Notify callbacks
      this.configChangeCallbacks.forEach(callback => callback(this.currentConfig!));
      
      console.log(`Bandwidth throttling adjusted: Upload ${newUploadSpeed.toFixed(2)} KB/s, Download ${newDownloadSpeed.toFixed(2)} KB/s - ${reason}`);
    }
  }

  /**
   * Register a request for bandwidth tracking
   */
  registerRequest(id: string, type: 'upload' | 'download'): void {
    this.activeRequests.set(id, {
      startTime: Date.now(),
      bytes: 0,
      type,
    });
  }

  /**
   * Update request progress
   */
  updateRequestProgress(id: string, bytes: number): void {
    const request = this.activeRequests.get(id);
    if (request) {
      request.bytes = bytes;
    }
  }

  /**
   * Unregister a request
   */
  unregisterRequest(id: string): void {
    this.activeRequests.delete(id);
  }

  /**
   * Get current throttle config
   */
  getCurrentConfig(): ThrottleConfig | null {
    return this.currentConfig ? { ...this.currentConfig } : null;
  }

  /**
   * Get bandwidth history
   */
  getBandwidthHistory(): BandwidthUsage[] {
    return [...this.bandwidthHistory];
  }

  /**
   * Get active requests count
   */
  getActiveRequestsCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Get active requests by type
   */
  getActiveRequestsByType(): { upload: number; download: number } {
    let upload = 0;
    let download = 0;
    
    for (const request of this.activeRequests.values()) {
      if (request.type === 'upload') {
        upload++;
      } else {
        download++;
      }
    }
    
    return { upload, download };
  }

  /**
   * Register a config change callback
   */
  onConfigChange(callback: (config: ThrottleConfig) => void): void {
    this.configChangeCallbacks.push(callback);
  }

  /**
   * Unregister a config change callback
   */
  offConfigChange(callback: (config: ThrottleConfig) => void): void {
    const index = this.configChangeCallbacks.indexOf(callback);
    if (index !== -1) {
      this.configChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Manually set throttle config
   */
  setThrottleConfig(uploadSpeed: number, downloadSpeed: number, reason: string = 'Manual adjustment'): void {
    this.currentConfig = {
      uploadSpeed,
      downloadSpeed,
      reason,
      timestamp: Date.now(),
    };
    
    // Notify callbacks
    if (this.currentConfig) {
      this.configChangeCallbacks.forEach(callback => callback(this.currentConfig!));
    }
    
    console.log(`Bandwidth throttling set manually: Upload ${uploadSpeed.toFixed(2)} KB/s, Download ${downloadSpeed.toFixed(2)} KB/s - ${reason}`);
  }

  /**
   * Force bandwidth check
   */
  forceBandwidthCheck(): void {
    this.checkBandwidth();
  }

  /**
   * Check if currently checking bandwidth
   */
  isCurrentlyChecking(): boolean {
    return this.isChecking;
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<BandwidthThrottlerOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Restart bandwidth checks if interval changed
    if (this.checkIntervalId !== null && newOptions.checkInterval) {
      this.stopBandwidthChecks();
      this.startBandwidthChecks();
    }
  }

  /**
   * Get current options
   */
  getOptions(): BandwidthThrottlerOptions {
    return { ...this.options };
  }
}

// Singleton instance with default options
export const bandwidthThrottler = new BandwidthThrottler({
  enableThrottling: true,
  checkInterval: 30000,
  maxUploadSpeed: 500, // 500 KB/s
  maxDownloadSpeed: 1000, // 1 MB/s
  adaptiveThrottling: true,
  enablePerformanceOptimization: true,
  maxCheckTime: 100,
});

// Export a factory function for easier usage
export function createBandwidthThrottler(options?: BandwidthThrottlerOptions): BandwidthThrottler {
  return new BandwidthThrottler(options);
}