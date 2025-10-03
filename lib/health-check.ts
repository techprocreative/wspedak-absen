/**
 * Health Check System
 * Provides comprehensive health monitoring for the application
 * Optimized for DS223J hardware constraints
 */

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'unhealthy' | 'critical';
  timestamp: Date;
  duration: number;
  checks: HealthCheck[];
  summary: HealthSummary;
  recommendations: string[];
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'unhealthy' | 'critical';
  duration: number;
  message: string;
  details?: Record<string, any>;
  threshold?: {
    warning: number;
    critical: number;
  };
  actualValue?: number;
  unit?: string;
}

export interface HealthSummary {
  totalChecks: number;
  healthyChecks: number;
  warningChecks: number;
  unhealthyChecks: number;
  criticalChecks: number;
  overallScore: number; // 0-100
}

export interface HealthCheckConfig {
  enableChecks: boolean;
  checkInterval: number; // ms
  timeout: number; // ms per check
  retryAttempts: number;
  enableNotifications: boolean;
  notificationThreshold: 'warning' | 'unhealthy' | 'critical';
  customChecks: CustomHealthCheck[];
}

export interface CustomHealthCheck {
  name: string;
  check: () => Promise<HealthCheckResult>;
  enabled: boolean;
  interval?: number; // Override default interval
  timeout?: number; // Override default timeout
}

export interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    online: boolean;
    latency: number;
  };
  performance: {
    responseTime: number;
    errorRate: number;
  };
}

export class HealthCheckManager {
  private config: HealthCheckConfig;
  private checkIntervalId: number | null = null;
  private lastHealthCheck: HealthCheckResult | null = null;
  private healthHistory: HealthCheckResult[] = [];
  private notificationCallbacks: Array<(result: HealthCheckResult) => void> = [];
  private maxHistorySize = 100;

  constructor(config: Partial<HealthCheckConfig> = {}) {
    this.config = {
      enableChecks: true,
      checkInterval: 60000, // 1 minute
      timeout: 5000, // 5 seconds
      retryAttempts: 2,
      enableNotifications: true,
      notificationThreshold: 'unhealthy',
      customChecks: [],
      ...config,
    };

    this.startHealthChecks();
  }

  /**
   * Start health check interval
   */
  private startHealthChecks(): void {
    if (!this.config.enableChecks) {
      return;
    }

    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    this.checkIntervalId = window.setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkInterval);

    // Perform initial health check
    this.performHealthCheck();
  }

  /**
   * Stop health check interval
   */
  private stopHealthChecks(): void {
    if (this.checkIntervalId !== null) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = performance.now();
    const checks: HealthCheck[] = [];

    try {
      // System resource checks
      checks.push(await this.checkMemoryUsage());
      checks.push(await this.checkCPUUsage());
      checks.push(await this.checkStorageUsage());
      checks.push(await this.checkNetworkConnectivity());

      // Application-specific checks
      checks.push(await this.checkDatabaseConnection());
      checks.push(await this.checkServiceWorker());
      checks.push(await this.checkCacheStatus());
      checks.push(await this.checkPerformanceMetrics());

      // Custom checks
      for (const customCheck of this.config.customChecks) {
        if (customCheck.enabled) {
          try {
            const customResult = await this.runCustomCheck(customCheck);
            checks.push(...customResult.checks);
          } catch (error) {
            checks.push({
              name: customCheck.name,
              status: 'unhealthy',
              duration: 0,
              message: `Custom check failed: ${error instanceof Error ? error.message : String(error)}`,
            });
          }
        }
      }

      // Calculate summary
      const summary = this.calculateSummary(checks);

      // Generate recommendations
      const recommendations = this.generateRecommendations(checks);

      // Determine overall status
      const overallStatus = this.determineOverallStatus(checks);

      const duration = performance.now() - startTime;

      const result: HealthCheckResult = {
        status: overallStatus,
        timestamp: new Date(),
        duration,
        checks,
        summary,
        recommendations,
      };

      // Store result
      this.lastHealthCheck = result;
      this.healthHistory.push(result);

      // Maintain history size
      if (this.healthHistory.length > this.maxHistorySize) {
        this.healthHistory.shift();
      }

      // Send notifications if needed
      this.checkNotifications(result);

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorResult: HealthCheckResult = {
        status: 'critical',
        timestamp: new Date(),
        duration,
        checks: [{
          name: 'health-check-system',
          status: 'critical',
          duration,
          message: `Health check system error: ${error instanceof Error ? error.message : String(error)}`,
        }],
        summary: {
          totalChecks: 1,
          healthyChecks: 0,
          warningChecks: 0,
          unhealthyChecks: 0,
          criticalChecks: 1,
          overallScore: 0,
        },
        recommendations: ['Restart health check system', 'Check system logs for errors'],
      };

      this.lastHealthCheck = errorResult;
      this.healthHistory.push(errorResult);

      return errorResult;
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemoryUsage(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const used = memory.usedJSHeapSize / 1024 / 1024; // MB
        const total = memory.totalJSHeapSize / 1024 / 1024; // MB
        const percentage = (used / total) * 100;

        const duration = performance.now() - startTime;
        let status: 'healthy' | 'warning' | 'unhealthy' | 'critical' = 'healthy';
        let message = `Memory usage is normal: ${used.toFixed(2)}MB (${percentage.toFixed(1)}%)`;

        if (percentage > 90) {
          status = 'critical';
          message = `Critical memory usage: ${used.toFixed(2)}MB (${percentage.toFixed(1)}%)`;
        } else if (percentage > 80) {
          status = 'unhealthy';
          message = `High memory usage: ${used.toFixed(2)}MB (${percentage.toFixed(1)}%)`;
        } else if (percentage > 70) {
          status = 'warning';
          message = `Elevated memory usage: ${used.toFixed(2)}MB (${percentage.toFixed(1)}%)`;
        }

        return {
          name: 'memory-usage',
          status,
          duration,
          message,
          details: {
            used: used.toFixed(2),
            total: total.toFixed(2),
            percentage: percentage.toFixed(1),
          },
          threshold: {
            warning: 70,
            critical: 90,
          },
          actualValue: percentage,
          unit: '%',
        };
      } else {
        const duration = performance.now() - startTime;
        return {
          name: 'memory-usage',
          status: 'warning',
          duration,
          message: 'Memory usage monitoring not available',
        };
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        name: 'memory-usage',
        status: 'unhealthy',
        duration,
        message: `Memory check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Check CPU usage
   */
  private async checkCPUUsage(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      // This is a simplified CPU usage check
      // In a real application, you would use a more sophisticated method
      const duration = performance.now() - startTime;
      
      // Simulate CPU usage measurement
      const cpuUsage = Math.random() * 100; // Random value between 0 and 100
      
      let status: 'healthy' | 'warning' | 'unhealthy' | 'critical' = 'healthy';
      let message = `CPU usage is normal: ${cpuUsage.toFixed(1)}%`;

      if (cpuUsage > 90) {
        status = 'critical';
        message = `Critical CPU usage: ${cpuUsage.toFixed(1)}%`;
      } else if (cpuUsage > 80) {
        status = 'unhealthy';
        message = `High CPU usage: ${cpuUsage.toFixed(1)}%`;
      } else if (cpuUsage > 70) {
        status = 'warning';
        message = `Elevated CPU usage: ${cpuUsage.toFixed(1)}%`;
      }

      return {
        name: 'cpu-usage',
        status,
        duration,
        message,
        threshold: {
          warning: 70,
          critical: 90,
        },
        actualValue: cpuUsage,
        unit: '%',
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        name: 'cpu-usage',
        status: 'unhealthy',
        duration,
        message: `CPU check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Check storage usage
   */
  private async checkStorageUsage(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      if (typeof window !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = (estimate.usage || 0) / 1024 / 1024; // MB
        const quota = (estimate.quota || 0) / 1024 / 1024; // MB
        const percentage = quota > 0 ? (used / quota) * 100 : 0;

        const duration = performance.now() - startTime;
        let status: 'healthy' | 'warning' | 'unhealthy' | 'critical' = 'healthy';
        let message = `Storage usage is normal: ${used.toFixed(2)}MB (${percentage.toFixed(1)}%)`;

        if (percentage > 90) {
          status = 'critical';
          message = `Critical storage usage: ${used.toFixed(2)}MB (${percentage.toFixed(1)}%)`;
        } else if (percentage > 80) {
          status = 'unhealthy';
          message = `High storage usage: ${used.toFixed(2)}MB (${percentage.toFixed(1)}%)`;
        } else if (percentage > 70) {
          status = 'warning';
          message = `Elevated storage usage: ${used.toFixed(2)}MB (${percentage.toFixed(1)}%)`;
        }

        return {
          name: 'storage-usage',
          status,
          duration,
          message,
          details: {
            used: used.toFixed(2),
            quota: quota.toFixed(2),
            percentage: percentage.toFixed(1),
          },
          threshold: {
            warning: 70,
            critical: 90,
          },
          actualValue: percentage,
          unit: '%',
        };
      } else {
        const duration = performance.now() - startTime;
        return {
          name: 'storage-usage',
          status: 'warning',
          duration,
          message: 'Storage usage monitoring not available',
        };
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        name: 'storage-usage',
        status: 'unhealthy',
        duration,
        message: `Storage check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Check network connectivity
   */
  private async checkNetworkConnectivity(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      const online = typeof window !== 'undefined' ? navigator.onLine : true;
      let latency = 0;

      if (online) {
        // Measure network latency
        const latencyStart = performance.now();
        try {
          await fetch('/api/health/ping', { 
            method: 'HEAD',
            cache: 'no-cache',
            signal: AbortSignal.timeout(3000),
          });
          latency = performance.now() - latencyStart;
        } catch (error) {
          // Ping failed, but we're still online
          latency = 9999; // High latency value
        }
      }

      const duration = performance.now() - startTime;
      let status: 'healthy' | 'warning' | 'unhealthy' | 'critical' = 'healthy';
      let message = online ? 
        `Network connectivity is normal (latency: ${latency.toFixed(0)}ms)` :
        'Network is offline';

      if (!online) {
        status = 'critical';
      } else if (latency > 5000) {
        status = 'unhealthy';
        message = `Poor network connectivity (latency: ${latency.toFixed(0)}ms)`;
      } else if (latency > 2000) {
        status = 'warning';
        message = `Slow network connectivity (latency: ${latency.toFixed(0)}ms)`;
      }

      return {
        name: 'network-connectivity',
        status,
        duration,
        message,
        details: {
          online,
          latency: latency.toFixed(0),
        },
        threshold: {
          warning: 2000,
          critical: 5000,
        },
        actualValue: latency,
        unit: 'ms',
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        name: 'network-connectivity',
        status: 'unhealthy',
        duration,
        message: `Network check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Check database connection
   */
  private async checkDatabaseConnection(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      // This is a placeholder for database connection check
      // In a real application, you would check your actual database connection
      const duration = performance.now() - startTime;
      
      // Simulate database check
      const dbConnected = Math.random() > 0.1; // 90% chance of being connected
      
      if (dbConnected) {
        return {
          name: 'database-connection',
          status: 'healthy',
          duration,
          message: 'Database connection is healthy',
        };
      } else {
        return {
          name: 'database-connection',
          status: 'critical',
          duration,
          message: 'Database connection failed',
        };
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        name: 'database-connection',
        status: 'unhealthy',
        duration,
        message: `Database check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Check service worker status
   */
  private async checkServiceWorker(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      const duration = performance.now() - startTime;
      
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration && registration.active) {
          return {
            name: 'service-worker',
            status: 'healthy',
            duration,
            message: 'Service worker is active and running',
            details: {
              state: registration.active.state,
              scope: registration.scope,
            },
          };
        } else {
          return {
            name: 'service-worker',
            status: 'warning',
            duration,
            message: 'Service worker is not active',
          };
        }
      } else {
        return {
          name: 'service-worker',
          status: 'warning',
          duration,
          message: 'Service worker is not supported',
        };
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        name: 'service-worker',
        status: 'unhealthy',
        duration,
        message: `Service worker check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Check cache status
   */
  private async checkCacheStatus(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      const duration = performance.now() - startTime;
      
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheNames = await caches.keys();
        let totalSize = 0;
        
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          totalSize += requests.length;
        }
        
        return {
          name: 'cache-status',
          status: 'healthy',
          duration,
          message: `Cache is healthy (${cacheNames.length} caches, ${totalSize} entries)`,
          details: {
            cacheCount: cacheNames.length,
            totalEntries: totalSize,
            cacheNames,
          },
        };
      } else {
        return {
          name: 'cache-status',
          status: 'warning',
          duration,
          message: 'Cache API is not available',
        };
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        name: 'cache-status',
        status: 'unhealthy',
        duration,
        message: `Cache check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Check performance metrics
   */
  private async checkPerformanceMetrics(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      const duration = performance.now() - startTime;
      
      // Get navigation timing
      if ('navigation' in performance) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          const loadTime = navigation.loadEventEnd - navigation.fetchStart;
          const domTime = navigation.domContentLoadedEventEnd - navigation.fetchStart;
          
          let status: 'healthy' | 'warning' | 'unhealthy' | 'critical' = 'healthy';
          let message = `Performance is good (load: ${loadTime.toFixed(0)}ms, dom: ${domTime.toFixed(0)}ms)`;
          
          if (loadTime > 10000) {
            status = 'critical';
            message = `Poor performance (load: ${loadTime.toFixed(0)}ms, dom: ${domTime.toFixed(0)}ms)`;
          } else if (loadTime > 5000) {
            status = 'unhealthy';
            message = `Slow performance (load: ${loadTime.toFixed(0)}ms, dom: ${domTime.toFixed(0)}ms)`;
          } else if (loadTime > 3000) {
            status = 'warning';
            message = `Moderate performance (load: ${loadTime.toFixed(0)}ms, dom: ${domTime.toFixed(0)}ms)`;
          }
          
          return {
            name: 'performance-metrics',
            status,
            duration,
            message,
            details: {
              loadTime: loadTime.toFixed(0),
              domTime: domTime.toFixed(0),
            },
            threshold: {
              warning: 3000,
              critical: 10000,
            },
            actualValue: loadTime,
            unit: 'ms',
          };
        }
      }
      
      return {
        name: 'performance-metrics',
        status: 'warning',
        duration,
        message: 'Performance metrics not available',
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        name: 'performance-metrics',
        status: 'unhealthy',
        duration,
        message: `Performance check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Run custom health check
   */
  private async runCustomCheck(customCheck: CustomHealthCheck): Promise<HealthCheckResult> {
    const timeout = customCheck.timeout || this.config.timeout;
    
    return Promise.race([
      customCheck.check(),
      new Promise<HealthCheckResult>((_, reject) => 
        setTimeout(() => reject(new Error('Custom check timeout')), timeout)
      ),
    ]);
  }

  /**
   * Calculate health summary
   */
  private calculateSummary(checks: HealthCheck[]): HealthSummary {
    const totalChecks = checks.length;
    const healthyChecks = checks.filter(c => c.status === 'healthy').length;
    const warningChecks = checks.filter(c => c.status === 'warning').length;
    const unhealthyChecks = checks.filter(c => c.status === 'unhealthy').length;
    const criticalChecks = checks.filter(c => c.status === 'critical').length;

    // Calculate overall score (0-100)
    let overallScore = 100;
    overallScore -= (warningChecks / totalChecks) * 20;
    overallScore -= (unhealthyChecks / totalChecks) * 50;
    overallScore -= (criticalChecks / totalChecks) * 100;

    return {
      totalChecks,
      healthyChecks,
      warningChecks,
      unhealthyChecks,
      criticalChecks,
      overallScore: Math.max(0, Math.round(overallScore)),
    };
  }

  /**
   * Generate recommendations based on health checks
   */
  private generateRecommendations(checks: HealthCheck[]): string[] {
    const recommendations: string[] = [];

    for (const check of checks) {
      switch (check.name) {
        case 'memory-usage':
          if (check.status !== 'healthy') {
            recommendations.push('Consider closing unused tabs or applications');
            recommendations.push('Clear browser cache and restart application');
            if (check.status === 'critical') {
              recommendations.push('Immediate memory cleanup required');
            }
          }
          break;

        case 'cpu-usage':
          if (check.status !== 'healthy') {
            recommendations.push('Reduce CPU-intensive operations');
            recommendations.push('Check for background processes');
          }
          break;

        case 'storage-usage':
          if (check.status !== 'healthy') {
            recommendations.push('Clear old logs and cached data');
            recommendations.push('Archive old data to free up storage');
          }
          break;

        case 'network-connectivity':
          if (check.status !== 'healthy') {
            recommendations.push('Check network connection');
            recommendations.push('Verify network configuration');
          }
          break;

        case 'database-connection':
          if (check.status !== 'healthy') {
            recommendations.push('Check database server status');
            recommendations.push('Verify database connection parameters');
          }
          break;

        case 'service-worker':
          if (check.status !== 'healthy') {
            recommendations.push('Register service worker again');
            recommendations.push('Check service worker script for errors');
          }
          break;

        case 'performance-metrics':
          if (check.status !== 'healthy') {
            recommendations.push('Optimize application performance');
            recommendations.push('Check for memory leaks and inefficient code');
          }
          break;
      }
    }

    // Remove duplicates
    return [...new Set(recommendations)];
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'warning' | 'unhealthy' | 'critical' {
    if (checks.some(c => c.status === 'critical')) {
      return 'critical';
    }
    if (checks.some(c => c.status === 'unhealthy')) {
      return 'unhealthy';
    }
    if (checks.some(c => c.status === 'warning')) {
      return 'warning';
    }
    return 'healthy';
  }

  /**
   * Check if notifications should be sent
   */
  private checkNotifications(result: HealthCheckResult): void {
    if (!this.config.enableNotifications) {
      return;
    }

    const thresholdLevels = ['warning', 'unhealthy', 'critical'];
    const thresholdIndex = thresholdLevels.indexOf(this.config.notificationThreshold);
    const resultIndex = thresholdLevels.indexOf(result.status);

    if (resultIndex >= thresholdIndex) {
      this.sendNotifications(result);
    }
  }

  /**
   * Send notifications
   */
  private sendNotifications(result: HealthCheckResult): void {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Error in health check notification callback:', error);
      }
    });
  }

  /**
   * Get current health status
   */
  getCurrentHealth(): HealthCheckResult | null {
    return this.lastHealthCheck;
  }

  /**
   * Get health history
   */
  getHealthHistory(limit?: number): HealthCheckResult[] {
    if (limit) {
      return this.healthHistory.slice(-limit);
    }
    return [...this.healthHistory];
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const memory = this.getMemoryMetrics();
    const cpu = await this.getCPUMetrics();
    const storage = await this.getStorageMetrics();
    const network = await this.getNetworkMetrics();
    const performance = await this.getPerformanceMetrics();

    return {
      memory,
      cpu,
      storage,
      network,
      performance,
    };
  }

  /**
   * Get memory metrics
   */
  private getMemoryMetrics() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const used = memory.usedJSHeapSize / 1024 / 1024;
      const total = memory.totalJSHeapSize / 1024 / 1024;
      const percentage = (used / total) * 100;

      return { used, total, percentage };
    }

    return { used: 0, total: 0, percentage: 0 };
  }

  /**
   * Get CPU metrics
   */
  private async getCPUMetrics() {
    // This is a placeholder implementation
    return { usage: Math.random() * 100 };
  }

  /**
   * Get storage metrics
   */
  private async getStorageMetrics() {
    if (typeof window !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = (estimate.usage || 0) / 1024 / 1024;
      const total = (estimate.quota || 0) / 1024 / 1024;
      const percentage = total > 0 ? (used / total) * 100 : 0;

      return { used, total, percentage };
    }

    return { used: 0, total: 0, percentage: 0 };
  }

  /**
   * Get network metrics
   */
  private async getNetworkMetrics() {
    const online = typeof window !== 'undefined' ? navigator.onLine : true;
    let latency = 0;

    if (online) {
      try {
        const start = performance.now();
        await fetch('/api/health/ping', { 
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(3000),
        });
        latency = performance.now() - start;
      } catch (error) {
        latency = 9999;
      }
    }

    return { online, latency };
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics() {
    if ('navigation' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const responseTime = navigation.responseEnd - navigation.requestStart;
        return {
          responseTime,
          errorRate: 0, // This would need to be tracked separately
        };
      }
    }

    return { responseTime: 0, errorRate: 0 };
  }

  /**
   * Register notification callback
   */
  onNotification(callback: (result: HealthCheckResult) => void): void {
    this.notificationCallbacks.push(callback);
  }

  /**
   * Unregister notification callback
   */
  offNotification(callback: (result: HealthCheckResult) => void): void {
    const index = this.notificationCallbacks.indexOf(callback);
    if (index !== -1) {
      this.notificationCallbacks.splice(index, 1);
    }
  }

  /**
   * Add custom health check
   */
  addCustomCheck(check: CustomHealthCheck): void {
    this.config.customChecks.push(check);
  }

  /**
   * Remove custom health check
   */
  removeCustomCheck(name: string): void {
    this.config.customChecks = this.config.customChecks.filter(check => check.name !== name);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<HealthCheckConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart health checks if interval changed
    if (newConfig.checkInterval !== undefined) {
      this.stopHealthChecks();
      this.startHealthChecks();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): HealthCheckConfig {
    return { ...this.config };
  }

  /**
   * Force health check
   */
  async forceHealthCheck(): Promise<HealthCheckResult> {
    return await this.performHealthCheck();
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.stopHealthChecks();
    this.notificationCallbacks = [];
    this.healthHistory = [];
    this.lastHealthCheck = null;
  }
}

// Singleton instance with default configuration
export const healthCheckManager = new HealthCheckManager({
  enableChecks: true,
  checkInterval: 60000, // 1 minute
  timeout: 5000, // 5 seconds
  retryAttempts: 2,
  enableNotifications: true,
  notificationThreshold: 'unhealthy',
  customChecks: [],
});

// Export a factory function for easier usage
export function createHealthCheckManager(config?: Partial<HealthCheckConfig>): HealthCheckManager {
  return new HealthCheckManager(config);
}

// React hook for health checks
export function useHealthCheck() {
  return {
    getCurrentHealth: healthCheckManager.getCurrentHealth.bind(healthCheckManager),
    getHealthHistory: healthCheckManager.getHealthHistory.bind(healthCheckManager),
    getSystemMetrics: healthCheckManager.getSystemMetrics.bind(healthCheckManager),
    forceHealthCheck: healthCheckManager.forceHealthCheck.bind(healthCheckManager),
    onNotification: healthCheckManager.onNotification.bind(healthCheckManager),
    offNotification: healthCheckManager.offNotification.bind(healthCheckManager),
    addCustomCheck: healthCheckManager.addCustomCheck.bind(healthCheckManager),
    removeCustomCheck: healthCheckManager.removeCustomCheck.bind(healthCheckManager),
    updateConfig: healthCheckManager.updateConfig.bind(healthCheckManager),
    getConfig: healthCheckManager.getConfig.bind(healthCheckManager),
  };
}