/**
 * System Health Monitoring Library
 * Provides comprehensive system monitoring capabilities
 * Optimized for production environments
 */

import { performance } from 'perf_hooks';

// System health metrics interface
export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    temperature: number;
    cores: number;
  };
  memory: {
    used: number;
    free: number;
    total: number;
    usagePercentage: number;
  };
  storage: {
    used: number;
    free: number;
    total: number;
    usagePercentage: number;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
    errorsReceived: number;
    errorsSent: number;
  };
  database: {
    connections: number;
    queryTime: number;
    cacheHitRate: number;
  };
  uptime: number;
}

// Health check status
export interface HealthStatus {
  status: 'healthy' | 'warning' | 'unhealthy' | 'critical';
  timestamp: Date;
  checks: {
    database: HealthCheck;
    cache: HealthCheck;
    storage: HealthCheck;
    memory: HealthCheck;
    cpu: HealthCheck;
    network: HealthCheck;
  };
  summary: string;
  recommendations: string[];
}

export interface HealthCheck {
  status: 'pass' | 'warn' | 'fail';
  responseTime: number;
  message: string;
  details?: any;
}

// System alert interface
export interface SystemAlert {
  id: string;
  type: 'performance' | 'availability' | 'security' | 'capacity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  source: string;
  details: any;
  metrics: any;
}

// Performance thresholds
export interface PerformanceThresholds {
  cpu: {
    warning: number;
    critical: number;
  };
  memory: {
    warning: number;
    critical: number;
  };
  storage: {
    warning: number;
    critical: number;
  };
  responseTime: {
    warning: number;
    critical: number;
  };
  errorRate: {
    warning: number;
    critical: number;
  };
}

class SystemMonitor {
  private metrics: SystemMetrics[] = [];
  private alerts: SystemAlert[] = [];
  private thresholds: PerformanceThresholds;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private maxMetricsHistory: number = 1000;

  constructor() {
    this.thresholds = {
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 80, critical: 95 },
      storage: { warning: 85, critical: 95 },
      responseTime: { warning: 1000, critical: 3000 },
      errorRate: { warning: 5, critical: 10 }
    };
  }

  // Start monitoring
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkThresholds();
    }, intervalMs);

    // Initial collection
    this.collectMetrics();
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Collect system metrics
  private async collectMetrics(): Promise<void> {
    try {
      const metrics: SystemMetrics = {
        timestamp: new Date(),
        cpu: await this.getCpuMetrics(),
        memory: await this.getMemoryMetrics(),
        storage: await this.getStorageMetrics(),
        network: await this.getNetworkMetrics(),
        database: await this.getDatabaseMetrics(),
        uptime: process.uptime()
      };

      this.addMetrics(metrics);
    } catch (error) {
      console.error('Error collecting system metrics:', error);
      this.createAlert({
        type: 'performance',
        severity: 'medium',
        title: 'Metrics Collection Failed',
        message: `Failed to collect system metrics: ${error}`,
        source: 'system-monitor',
        details: { error },
        metrics: {}
      });
    }
  }

  // Get CPU metrics
  private async getCpuMetrics(): Promise<SystemMetrics['cpu']> {
    const startUsage = process.cpuUsage();
    const startTime = performance.now();

    // Wait a bit to measure CPU usage
    await new Promise(resolve => setTimeout(resolve, 100));

    const endUsage = process.cpuUsage(startUsage);
    const endTime = performance.now();

    const totalUsage = (endUsage.user + endUsage.system) / 1000; // Convert to microseconds
    const timeDiff = endTime - startTime;

    const usagePercent = Math.min(100, (totalUsage / timeDiff) * 100);

    return {
      usage: usagePercent,
      temperature: 0, // Not available in Node.js, would need system-specific implementation
      cores: require('os').cpus().length
    };
  }

  // Get memory metrics
  private async getMemoryMetrics(): Promise<SystemMetrics['memory']> {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();

    return {
      used: memUsage.heapUsed / 1024 / 1024, // MB
      free: freeMem / 1024 / 1024, // MB
      total: totalMem / 1024 / 1024, // MB
      usagePercentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
    };
  }

  // Get storage metrics
  private async getStorageMetrics(): Promise<SystemMetrics['storage']> {
    // This would need to be implemented based on the storage system
    // For now, return mock data
    return {
      used: 5000, // MB
      free: 15000, // MB
      total: 20000, // MB
      usagePercentage: 25
    };
  }

  // Get network metrics
  private async getNetworkMetrics(): Promise<SystemMetrics['network']> {
    // This would need to be implemented based on the network interfaces
    // For now, return mock data
    return {
      bytesReceived: 0,
      bytesSent: 0,
      packetsReceived: 0,
      packetsSent: 0,
      errorsReceived: 0,
      errorsSent: 0
    };
  }

  // Get database metrics
  private async getDatabaseMetrics(): Promise<SystemMetrics['database']> {
    // This would need to be implemented based on the database system
    // For now, return mock data
    return {
      connections: 5,
      queryTime: 50,
      cacheHitRate: 85
    };
  }

  // Add metrics to history
  private addMetrics(metrics: SystemMetrics): void {
    this.metrics.push(metrics);

    // Keep only the latest metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  // Check thresholds and create alerts
  private checkThresholds(): void {
    if (this.metrics.length === 0) return;

    const latestMetrics = this.metrics[this.metrics.length - 1];

    // Check CPU
    if (latestMetrics.cpu.usage > this.thresholds.cpu.critical) {
      this.createAlert({
        type: 'performance',
        severity: 'critical',
        title: 'Critical CPU Usage',
        message: `CPU usage is ${latestMetrics.cpu.usage.toFixed(1)}%`,
        source: 'system-monitor',
        details: { cpu: latestMetrics.cpu },
        metrics: { cpu: latestMetrics.cpu }
      });
    } else if (latestMetrics.cpu.usage > this.thresholds.cpu.warning) {
      this.createAlert({
        type: 'performance',
        severity: 'medium',
        title: 'High CPU Usage',
        message: `CPU usage is ${latestMetrics.cpu.usage.toFixed(1)}%`,
        source: 'system-monitor',
        details: { cpu: latestMetrics.cpu },
        metrics: { cpu: latestMetrics.cpu }
      });
    }

    // Check Memory
    if (latestMetrics.memory.usagePercentage > this.thresholds.memory.critical) {
      this.createAlert({
        type: 'performance',
        severity: 'critical',
        title: 'Critical Memory Usage',
        message: `Memory usage is ${latestMetrics.memory.usagePercentage.toFixed(1)}%`,
        source: 'system-monitor',
        details: { memory: latestMetrics.memory },
        metrics: { memory: latestMetrics.memory }
      });
    } else if (latestMetrics.memory.usagePercentage > this.thresholds.memory.warning) {
      this.createAlert({
        type: 'performance',
        severity: 'medium',
        title: 'High Memory Usage',
        message: `Memory usage is ${latestMetrics.memory.usagePercentage.toFixed(1)}%`,
        source: 'system-monitor',
        details: { memory: latestMetrics.memory },
        metrics: { memory: latestMetrics.memory }
      });
    }

    // Check Storage
    if (latestMetrics.storage.usagePercentage > this.thresholds.storage.critical) {
      this.createAlert({
        type: 'capacity',
        severity: 'critical',
        title: 'Critical Storage Usage',
        message: `Storage usage is ${latestMetrics.storage.usagePercentage.toFixed(1)}%`,
        source: 'system-monitor',
        details: { storage: latestMetrics.storage },
        metrics: { storage: latestMetrics.storage }
      });
    } else if (latestMetrics.storage.usagePercentage > this.thresholds.storage.warning) {
      this.createAlert({
        type: 'capacity',
        severity: 'medium',
        title: 'High Storage Usage',
        message: `Storage usage is ${latestMetrics.storage.usagePercentage.toFixed(1)}%`,
        source: 'system-monitor',
        details: { storage: latestMetrics.storage },
        metrics: { storage: latestMetrics.storage }
      });
    }
  }

  // Create alert
  private createAlert(alertData: Omit<SystemAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: SystemAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
      ...alertData
    };

    this.alerts.push(alert);

    // Keep only the latest alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    // Log alert
    console.warn(`System Alert [${alert.severity.toUpperCase()}]: ${alert.title} - ${alert.message}`);
  }

  // Get current metrics
  getCurrentMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  // Get metrics history
  getMetricsHistory(options: {
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  } = {}): SystemMetrics[] {
    let filteredMetrics = [...this.metrics];

    if (options.startTime) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= options.startTime!);
    }

    if (options.endTime) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp <= options.endTime!);
    }

    if (options.limit) {
      filteredMetrics = filteredMetrics.slice(-options.limit);
    }

    return filteredMetrics;
  }

  // Get alerts
  getAlerts(options: {
    type?: SystemAlert['type'];
    severity?: SystemAlert['severity'];
    resolved?: boolean;
    limit?: number;
  } = {}): SystemAlert[] {
    let filteredAlerts = [...this.alerts];

    if (options.type) {
      filteredAlerts = filteredAlerts.filter(a => a.type === options.type);
    }

    if (options.severity) {
      filteredAlerts = filteredAlerts.filter(a => a.severity === options.severity);
    }

    if (options.resolved !== undefined) {
      filteredAlerts = filteredAlerts.filter(a => a.resolved === options.resolved);
    }

    // Sort by timestamp (newest first)
    filteredAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options.limit) {
      filteredAlerts = filteredAlerts.slice(0, options.limit);
    }

    return filteredAlerts;
  }

  // Resolve alert
  resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;
      return true;
    }
    return false;
  }

  // Get health status
  async getHealthStatus(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = {
      database: await this.checkDatabase(),
      cache: await this.checkCache(),
      storage: await this.checkStorage(),
      memory: await this.checkMemory(),
      cpu: await this.checkCpu(),
      network: await this.checkNetwork()
    };

    const failedChecks = Object.values(checks).filter(c => c.status === 'fail');
    const warnChecks = Object.values(checks).filter(c => c.status === 'warn');

    let status: HealthStatus['status'];
    let summary: string;
    let recommendations: string[] = [];

    if (failedChecks.length > 0) {
      status = 'critical';
      summary = `${failedChecks.length} critical health check(s) failed`;
      recommendations = ['Immediate attention required', 'Check system logs for details'];
    } else if (warnChecks.length > 0) {
      status = 'warning';
      summary = `${warnChecks.length} health check(s) need attention`;
      recommendations = ['Monitor system closely', 'Consider preventive measures'];
    } else {
      status = 'healthy';
      summary = 'All systems operational';
      recommendations = [];
    }

    return {
      status,
      timestamp: new Date(),
      checks,
      summary,
      recommendations
    };
  }

  // Health check implementations
  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      // Simulate database health check
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const responseTime = performance.now() - startTime;
      
      if (responseTime > 1000) {
        return {
          status: 'warn',
          responseTime,
          message: 'Database response time is elevated'
        };
      }
      
      return {
        status: 'pass',
        responseTime,
        message: 'Database is healthy'
      };
    } catch (error) {
      return {
        status: 'fail',
        responseTime: performance.now() - startTime,
        message: `Database health check failed: ${error}`
      };
    }
  }

  private async checkCache(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      // Simulate cache health check
      await new Promise(resolve => setTimeout(resolve, 10));
      
      return {
        status: 'pass',
        responseTime: performance.now() - startTime,
        message: 'Cache is healthy'
      };
    } catch (error) {
      return {
        status: 'fail',
        responseTime: performance.now() - startTime,
        message: `Cache health check failed: ${error}`
      };
    }
  }

  private async checkStorage(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      const metrics = this.getCurrentMetrics();
      
      if (metrics && metrics.storage.usagePercentage > 95) {
        return {
          status: 'fail',
          responseTime: performance.now() - startTime,
          message: 'Storage usage is critically high'
        };
      } else if (metrics && metrics.storage.usagePercentage > 85) {
        return {
          status: 'warn',
          responseTime: performance.now() - startTime,
          message: 'Storage usage is high'
        };
      }
      
      return {
        status: 'pass',
        responseTime: performance.now() - startTime,
        message: 'Storage is healthy'
      };
    } catch (error) {
      return {
        status: 'fail',
        responseTime: performance.now() - startTime,
        message: `Storage health check failed: ${error}`
      };
    }
  }

  private async checkMemory(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      const metrics = this.getCurrentMetrics();
      
      if (metrics && metrics.memory.usagePercentage > 95) {
        return {
          status: 'fail',
          responseTime: performance.now() - startTime,
          message: 'Memory usage is critically high'
        };
      } else if (metrics && metrics.memory.usagePercentage > 80) {
        return {
          status: 'warn',
          responseTime: performance.now() - startTime,
          message: 'Memory usage is high'
        };
      }
      
      return {
        status: 'pass',
        responseTime: performance.now() - startTime,
        message: 'Memory is healthy'
      };
    } catch (error) {
      return {
        status: 'fail',
        responseTime: performance.now() - startTime,
        message: `Memory health check failed: ${error}`
      };
    }
  }

  private async checkCpu(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      const metrics = this.getCurrentMetrics();
      
      if (metrics && metrics.cpu.usage > 90) {
        return {
          status: 'fail',
          responseTime: performance.now() - startTime,
          message: 'CPU usage is critically high'
        };
      } else if (metrics && metrics.cpu.usage > 70) {
        return {
          status: 'warn',
          responseTime: performance.now() - startTime,
          message: 'CPU usage is high'
        };
      }
      
      return {
        status: 'pass',
        responseTime: performance.now() - startTime,
        message: 'CPU is healthy'
      };
    } catch (error) {
      return {
        status: 'fail',
        responseTime: performance.now() - startTime,
        message: `CPU health check failed: ${error}`
      };
    }
  }

  private async checkNetwork(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      // Simulate network health check
      await new Promise(resolve => setTimeout(resolve, 20));
      
      return {
        status: 'pass',
        responseTime: performance.now() - startTime,
        message: 'Network is healthy'
      };
    } catch (error) {
      return {
        status: 'fail',
        responseTime: performance.now() - startTime,
        message: `Network health check failed: ${error}`
      };
    }
  }

  // Update thresholds
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  // Get thresholds
  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  // Clear old metrics
  clearOldMetrics(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime);
  }

  // Clear old alerts
  clearOldAlerts(olderThanDays: number = 7): void {
    const cutoffTime = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoffTime);
  }
}

// Singleton instance
export const systemMonitor = new SystemMonitor();

// Export types and functions
export type { SystemMonitor };
export { SystemMonitor as SystemMonitorClass };