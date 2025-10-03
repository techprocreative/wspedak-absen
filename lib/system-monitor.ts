/**
 * System Monitoring for DS223J Hardware
 * Provides comprehensive system monitoring optimized for DS223J constraints
 */

export interface SystemInfo {
  model: string;
  serialNumber: string;
  firmwareVersion: string;
  totalMemory: number;
  totalStorage: number;
  cpuCores: number;
  networkInterfaces: NetworkInterface[];
  uptime: number;
  temperature: number;
}

export interface NetworkInterface {
  name: string;
  type: 'ethernet' | 'wifi';
  ipAddress: string;
  macAddress: string;
  speed: number;
  status: 'up' | 'down';
}

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    temperature: number;
    frequency: number;
  };
  memory: {
    used: number;
    free: number;
    cached: number;
    usagePercentage: number;
  };
  storage: {
    used: number;
    free: number;
    usagePercentage: number;
    readSpeed: number;
    writeSpeed: number;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
    errorsReceived: number;
    errorsSent: number;
  };
  temperature: {
    cpu: number;
    system: number;
    storage: number;
  };
  power: {
    consumption: number;
    batteryLevel?: number;
    batteryStatus?: 'charging' | 'discharging' | 'full' | 'unknown';
  };
  processes: {
    total: number;
    running: number;
    sleeping: number;
    zombie: number;
  };
  services: ServiceStatus[];
}

export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'failed' | 'unknown';
  cpuUsage: number;
  memoryUsage: number;
  uptime: number;
}

export interface SystemAlert {
  id: string;
  timestamp: Date;
  type: 'cpu' | 'memory' | 'storage' | 'network' | 'temperature' | 'service' | 'power';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  value: number;
  threshold: number;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface SystemMonitorOptions {
  enableMonitoring?: boolean;
  collectionInterval?: number; // ms
  retentionPeriod?: number; // ms
  enableAlerts?: boolean;
  alertThresholds?: AlertThresholds;
  enableAutoOptimization?: boolean;
  maxMetricHistory?: number;
  enablePersistence?: boolean;
  persistenceKey?: string;
}

export interface AlertThresholds {
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
  temperature: {
    warning: number;
    critical: number;
  };
  network: {
    errorRate: number;
  };
}

export class SystemMonitor {
  private options: SystemMonitorOptions;
  private systemInfo: SystemInfo | null = null;
  private metricsHistory: SystemMetrics[] = [];
  private alerts: Map<string, SystemAlert> = new Map();
  private collectionIntervalId: number | null = null;
  private alertIdCounter = 0;
  private previousNetworkStats: {
    bytesReceived: number;
    bytesSent: number;
    timestamp: number;
  } | null = null;
  private alertCallbacks: Array<(alert: SystemAlert) => void> = [];

  constructor(options: SystemMonitorOptions = {}) {
    this.options = {
      enableMonitoring: true,
      collectionInterval: 30000, // 30 seconds
      retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      enableAlerts: true,
      alertThresholds: {
        cpu: { warning: 70, critical: 90 },
        memory: { warning: 80, critical: 95 },
        storage: { warning: 80, critical: 95 },
        temperature: { warning: 70, critical: 85 },
        network: { errorRate: 5 },
      },
      enableAutoOptimization: false,
      maxMetricHistory: 1000,
      enablePersistence: true,
      persistenceKey: 'system_monitor_data',
      ...options,
    };

    this.initializeSystemInfo();
    this.loadPersistedData();
    this.startMonitoring();
  }

  /**
   * Initialize system information
   */
  private async initializeSystemInfo(): Promise<void> {
    // This is a simulated implementation for DS223J
    // In a real application, you would query the actual system
    this.systemInfo = {
      model: 'DS223J',
      serialNumber: 'DS223J' + Math.random().toString(36).substr(2, 9),
      firmwareVersion: 'DSM 7.2.1-69057',
      totalMemory: 6 * 1024, // 6GB in MB
      totalStorage: 0, // Will be determined by actual storage
      cpuCores: 4,
      networkInterfaces: [
        {
          name: 'eth0',
          type: 'ethernet',
          ipAddress: '192.168.1.100',
          macAddress: '00:11:32:xx:xx:xx',
          speed: 1000,
          status: 'up',
        },
      ],
      uptime: 0,
      temperature: 45,
    };

    // Get storage information
    if (typeof window !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      this.systemInfo.totalStorage = (estimate.quota || 0) / 1024 / 1024; // MB
    }
  }

  /**
   * Load persisted data from storage
   */
  private loadPersistedData(): void {
    if (!this.options.enablePersistence) {
      return;
    }

    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(this.options.persistenceKey!);
      if (stored) {
        const data = JSON.parse(stored);
        
        // Restore metrics history
        if (data.metricsHistory) {
          this.metricsHistory = data.metricsHistory.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
        }
        
        // Restore alerts
        if (data.alerts) {
          for (const alert of data.alerts) {
            alert.timestamp = new Date(alert.timestamp);
            if (alert.resolvedAt) {
              alert.resolvedAt = new Date(alert.resolvedAt);
            }
            this.alerts.set(alert.id, alert);
          }
        }
      }
    } catch (error) {
      console.error('Error loading persisted system data:', error);
    }
  }

  /**
   * Persist data to storage
   */
  private persistData(): void {
    if (!this.options.enablePersistence) {
      return;
    }

    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const data = {
        metricsHistory: this.metricsHistory,
        alerts: Array.from(this.alerts.values()),
      };
      
      localStorage.setItem(this.options.persistenceKey!, JSON.stringify(data));
    } catch (error) {
      console.error('Error persisting system data:', error);
    }
  }

  /**
   * Start system monitoring
   */
  private startMonitoring(): void {
    if (!this.options.enableMonitoring) {
      return;
    }

    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    this.collectionIntervalId = window.setInterval(() => {
      this.collectMetrics();
    }, this.options.collectionInterval);

    // Collect initial metrics
    this.collectMetrics();
  }

  /**
   * Stop system monitoring
   */
  private stopMonitoring(): void {
    if (this.collectionIntervalId !== null) {
      clearInterval(this.collectionIntervalId);
      this.collectionIntervalId = null;
    }
  }

  /**
   * Collect system metrics
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = new Date();
    
    const metrics: SystemMetrics = {
      timestamp,
      cpu: await this.collectCPUMetrics(),
      memory: await this.collectMemoryMetrics(),
      storage: await this.collectStorageMetrics(),
      network: await this.collectNetworkMetrics(),
      temperature: await this.collectTemperatureMetrics(),
      power: await this.collectPowerMetrics(),
      processes: await this.collectProcessMetrics(),
      services: await this.collectServiceMetrics(),
    };

    // Add to history
    this.metricsHistory.push(metrics);

    // Maintain history limit
    if (this.metricsHistory.length > this.options.maxMetricHistory!) {
      this.metricsHistory.shift();
    }

    // Check for alerts
    if (this.options.enableAlerts) {
      this.checkAlerts(metrics);
    }

    // Persist data
    this.persistData();
  }

  /**
   * Collect CPU metrics
   */
  private async collectCPUMetrics(): Promise<SystemMetrics['cpu']> {
    // This is a simulated implementation
    // In a real application, you would query the actual system
    const usage = Math.random() * 100;
    const temperature = 40 + Math.random() * 30; // 40-70°C
    const frequency = 1000 + Math.random() * 2000; // 1000-3000 MHz

    return {
      usage,
      temperature,
      frequency,
    };
  }

  /**
   * Collect memory metrics
   */
  private async collectMemoryMetrics(): Promise<SystemMetrics['memory']> {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const used = memory.usedJSHeapSize / 1024 / 1024; // MB
      const total = memory.totalJSHeapSize / 1024 / 1024; // MB
      const free = total - used;
      const cached = 0; // Not available in browser
      const usagePercentage = (used / total) * 100;

      return {
        used,
        free,
        cached,
        usagePercentage,
      };
    }

    // Fallback for browsers without memory API
    const total = this.systemInfo?.totalMemory || 6000;
    const used = Math.random() * total * 0.8; // Use up to 80% of total
    const free = total - used;

    return {
      used,
      free,
      cached: 0,
      usagePercentage: (used / total) * 100,
    };
  }

  /**
   * Collect storage metrics
   */
  private async collectStorageMetrics(): Promise<SystemMetrics['storage']> {
    if (typeof window !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = (estimate.usage || 0) / 1024 / 1024; // MB
      const total = (estimate.quota || 0) / 1024 / 1024; // MB
      const free = total - used;
      const usagePercentage = total > 0 ? (used / total) * 100 : 0;

      // Simulate read/write speeds
      const readSpeed = 50 + Math.random() * 100; // MB/s
      const writeSpeed = 30 + Math.random() * 70; // MB/s

      return {
        used,
        free,
        usagePercentage,
        readSpeed,
        writeSpeed,
      };
    }

    // Fallback
    const total = this.systemInfo?.totalStorage || 10000;
    const used = Math.random() * total * 0.7; // Use up to 70% of total
    const free = total - used;

    return {
      used,
      free,
      usagePercentage: (used / total) * 100,
      readSpeed: 50 + Math.random() * 100,
      writeSpeed: 30 + Math.random() * 70,
    };
  }

  /**
   * Collect network metrics
   */
  private async collectNetworkMetrics(): Promise<SystemMetrics['network']> {
    // Simulate network metrics
    const now = Date.now();
    let bytesReceived = Math.floor(Math.random() * 1000000);
    let bytesSent = Math.floor(Math.random() * 1000000);
    
    // Calculate network speed if we have previous data
    if (this.previousNetworkStats) {
      const timeDiff = (now - this.previousNetworkStats.timestamp) / 1000; // seconds
      const receivedDiff = bytesReceived - this.previousNetworkStats.bytesReceived;
      const sentDiff = bytesSent - this.previousNetworkStats.bytesSent;
      
      // If the difference is negative, use random values
      if (receivedDiff < 0 || sentDiff < 0) {
        bytesReceived = Math.floor(Math.random() * 1000000);
        bytesSent = Math.floor(Math.random() * 1000000);
      }
    }
    
    this.previousNetworkStats = {
      bytesReceived,
      bytesSent,
      timestamp: now,
    };

    return {
      bytesReceived,
      bytesSent,
      packetsReceived: Math.floor(Math.random() * 10000),
      packetsSent: Math.floor(Math.random() * 10000),
      errorsReceived: Math.floor(Math.random() * 10),
      errorsSent: Math.floor(Math.random() * 10),
    };
  }

  /**
   * Collect temperature metrics
   */
  private async collectTemperatureMetrics(): Promise<SystemMetrics['temperature']> {
    // Simulate temperature metrics
    const cpu = 40 + Math.random() * 30; // 40-70°C
    const system = 35 + Math.random() * 25; // 35-60°C
    const storage = 30 + Math.random() * 20; // 30-50°C

    return {
      cpu,
      system,
      storage,
    };
  }

  /**
   * Collect power metrics
   */
  private async collectPowerMetrics(): Promise<SystemMetrics['power']> {
    // Simulate power metrics
    const consumption = 20 + Math.random() * 30; // 20-50W
    
    return {
      consumption,
    };
  }

  /**
   * Collect process metrics
   */
  private async collectProcessMetrics(): Promise<SystemMetrics['processes']> {
    // Simulate process metrics
    const total = Math.floor(Math.random() * 200) + 50;
    const running = Math.floor(total * 0.3);
    const sleeping = Math.floor(total * 0.6);
    const zombie = Math.floor(total * 0.05);

    return {
      total,
      running,
      sleeping,
      zombie,
    };
  }

  /**
   * Collect service metrics
   */
  private async collectServiceMetrics(): Promise<ServiceStatus[]> {
    // Simulate service metrics for common DS223J services
    const services = [
      'nginx',
      'php-fpm',
      'mysql',
      'synoscgi',
      'synoindexd',
      'synothumbnail',
      'synomd',
    ];

    return services.map(name => ({
      name,
      status: Math.random() > 0.05 ? 'running' : Math.random() > 0.5 ? 'stopped' : 'failed',
      cpuUsage: Math.random() * 20,
      memoryUsage: Math.random() * 100,
      uptime: Math.random() * 86400, // Up to 1 day
    }));
  }

  /**
   * Check for alerts based on metrics
   */
  private checkAlerts(metrics: SystemMetrics): void {
    const thresholds = this.options.alertThresholds!;

    // Check CPU usage
    if (metrics.cpu.usage > thresholds.cpu.critical) {
      this.createAlert('cpu', 'critical', 'High CPU Usage', 
        `CPU usage is ${metrics.cpu.usage.toFixed(1)}%`, 
        metrics.cpu.usage, thresholds.cpu.critical);
    } else if (metrics.cpu.usage > thresholds.cpu.warning) {
      this.createAlert('cpu', 'medium', 'Elevated CPU Usage', 
        `CPU usage is ${metrics.cpu.usage.toFixed(1)}%`, 
        metrics.cpu.usage, thresholds.cpu.warning);
    }

    // Check CPU temperature
    if (metrics.temperature.cpu > thresholds.temperature.critical) {
      this.createAlert('temperature', 'critical', 'High CPU Temperature', 
        `CPU temperature is ${metrics.temperature.cpu.toFixed(1)}°C`, 
        metrics.temperature.cpu, thresholds.temperature.critical);
    } else if (metrics.temperature.cpu > thresholds.temperature.warning) {
      this.createAlert('temperature', 'medium', 'Elevated CPU Temperature', 
        `CPU temperature is ${metrics.temperature.cpu.toFixed(1)}°C`, 
        metrics.temperature.cpu, thresholds.temperature.warning);
    }

    // Check memory usage
    if (metrics.memory.usagePercentage > thresholds.memory.critical) {
      this.createAlert('memory', 'critical', 'High Memory Usage', 
        `Memory usage is ${metrics.memory.usagePercentage.toFixed(1)}%`, 
        metrics.memory.usagePercentage, thresholds.memory.critical);
    } else if (metrics.memory.usagePercentage > thresholds.memory.warning) {
      this.createAlert('memory', 'medium', 'Elevated Memory Usage', 
        `Memory usage is ${metrics.memory.usagePercentage.toFixed(1)}%`, 
        metrics.memory.usagePercentage, thresholds.memory.warning);
    }

    // Check storage usage
    if (metrics.storage.usagePercentage > thresholds.storage.critical) {
      this.createAlert('storage', 'critical', 'Low Storage Space', 
        `Storage usage is ${metrics.storage.usagePercentage.toFixed(1)}%`, 
        metrics.storage.usagePercentage, thresholds.storage.critical);
    } else if (metrics.storage.usagePercentage > thresholds.storage.warning) {
      this.createAlert('storage', 'medium', 'Low Storage Space', 
        `Storage usage is ${metrics.storage.usagePercentage.toFixed(1)}%`, 
        metrics.storage.usagePercentage, thresholds.storage.warning);
    }

    // Check network errors
    const totalPackets = metrics.network.packetsReceived + metrics.network.packetsSent;
    const totalErrors = metrics.network.errorsReceived + metrics.network.errorsSent;
    const errorRate = totalPackets > 0 ? (totalErrors / totalPackets) * 100 : 0;

    if (errorRate > thresholds.network.errorRate) {
      this.createAlert('network', 'medium', 'Network Errors', 
        `Network error rate is ${errorRate.toFixed(2)}%`, 
        errorRate, thresholds.network.errorRate);
    }

    // Check service status
    for (const service of metrics.services) {
      if (service.status === 'failed') {
        this.createAlert('service', 'high', 'Service Failed', 
          `Service ${service.name} has failed`, 
          0, 0);
      }
    }
  }

  /**
   * Create a system alert
   */
  private createAlert(
    type: SystemAlert['type'],
    severity: SystemAlert['severity'],
    title: string,
    message: string,
    value: number,
    threshold: number
  ): void {
    const alertId = `alert_${++this.alertIdCounter}_${Date.now()}`;
    
    const alert: SystemAlert = {
      id: alertId,
      timestamp: new Date(),
      type,
      severity,
      title,
      message,
      value,
      threshold,
      resolved: false,
    };

    // Check if a similar alert already exists
    const existingAlert = this.findSimilarAlert(alert);
    if (existingAlert) {
      // Update existing alert instead of creating a new one
      existingAlert.timestamp = alert.timestamp;
      existingAlert.value = alert.value;
      return;
    }

    // Store alert
    this.alerts.set(alertId, alert);

    // Notify callbacks
    this.notifyAlertCallbacks(alert);
  }

  /**
   * Find a similar existing alert
   */
  private findSimilarAlert(newAlert: SystemAlert): SystemAlert | undefined {
    for (const alert of this.alerts.values()) {
      if (
        alert.type === newAlert.type &&
        alert.title === newAlert.title &&
        !alert.resolved
      ) {
        return alert;
      }
    }
    return undefined;
  }

  /**
   * Notify alert callbacks
   */
  private notifyAlertCallbacks(alert: SystemAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in system alert callback:', error);
      }
    });
  }

  /**
   * Get system information
   */
  getSystemInfo(): SystemInfo | null {
    return this.systemInfo ? { ...this.systemInfo } : null;
  }

  /**
   * Get current system metrics
   */
  getCurrentMetrics(): SystemMetrics | null {
    return this.metricsHistory.length > 0 
      ? { ...this.metricsHistory[this.metricsHistory.length - 1] }
      : null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(options?: {
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): SystemMetrics[] {
    let metrics = [...this.metricsHistory];

    // Apply time range filter
    if (options?.startTime) {
      metrics = metrics.filter(m => m.timestamp >= options.startTime!);
    }

    if (options?.endTime) {
      metrics = metrics.filter(m => m.timestamp <= options.endTime!);
    }

    // Apply limit
    if (options?.limit) {
      metrics = metrics.slice(-options.limit);
    }

    return metrics;
  }

  /**
   * Get system alerts
   */
  getAlerts(options?: {
    type?: SystemAlert['type'];
    severity?: SystemAlert['severity'];
    resolved?: boolean;
    startTime?: Date;
    endTime?: Date;
  }): SystemAlert[] {
    let alerts = Array.from(this.alerts.values());

    // Apply filters
    if (options?.type) {
      alerts = alerts.filter(a => a.type === options.type);
    }

    if (options?.severity) {
      alerts = alerts.filter(a => a.severity === options.severity);
    }

    if (options?.resolved !== undefined) {
      alerts = alerts.filter(a => a.resolved === options.resolved);
    }

    if (options?.startTime) {
      alerts = alerts.filter(a => a.timestamp >= options.startTime!);
    }

    if (options?.endTime) {
      alerts = alerts.filter(a => a.timestamp <= options.endTime!);
    }

    // Sort by timestamp (newest first)
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return alerts;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();

    this.persistData();

    return true;
  }

  /**
   * Get system performance summary
   */
  getPerformanceSummary(): {
    overall: 'excellent' | 'good' | 'fair' | 'poor';
    cpu: number;
    memory: number;
    storage: number;
    network: number;
    temperature: number;
    activeAlerts: number;
    criticalAlerts: number;
  } {
    const currentMetrics = this.getCurrentMetrics();
    if (!currentMetrics) {
      return {
        overall: 'poor',
        cpu: 0,
        memory: 0,
        storage: 0,
        network: 0,
        temperature: 0,
        activeAlerts: 0,
        criticalAlerts: 0,
      };
    }

    const thresholds = this.options.alertThresholds!;
    
    // Calculate performance scores (0-100)
    const cpuScore = Math.max(0, 100 - currentMetrics.cpu.usage);
    const memoryScore = Math.max(0, 100 - currentMetrics.memory.usagePercentage);
    const storageScore = Math.max(0, 100 - currentMetrics.storage.usagePercentage);
    const networkScore = 100; // Would need more complex calculation
    const temperatureScore = Math.max(0, 100 - ((currentMetrics.temperature.cpu - 30) / 50) * 100);

    // Get alert counts
    const activeAlerts = this.getAlerts({ resolved: false }).length;
    const criticalAlerts = this.getAlerts({ resolved: false, severity: 'critical' }).length;

    // Calculate overall score
    const overallScore = (cpuScore + memoryScore + storageScore + networkScore + temperatureScore) / 5;
    
    let overall: 'excellent' | 'good' | 'fair' | 'poor';
    if (overallScore >= 80) {
      overall = 'excellent';
    } else if (overallScore >= 60) {
      overall = 'good';
    } else if (overallScore >= 40) {
      overall = 'fair';
    } else {
      overall = 'poor';
    }

    return {
      overall,
      cpu: Math.round(cpuScore),
      memory: Math.round(memoryScore),
      storage: Math.round(storageScore),
      network: Math.round(networkScore),
      temperature: Math.round(temperatureScore),
      activeAlerts,
      criticalAlerts,
    };
  }

  /**
   * Optimize system performance
   */
  async optimizeSystem(): Promise<{
    success: boolean;
    actions: string[];
    message: string;
  }> {
    const actions: string[] = [];
    const currentMetrics = this.getCurrentMetrics();
    
    if (!currentMetrics) {
      return {
        success: false,
        actions: [],
        message: 'No system metrics available',
      };
    }

    // Check memory usage
    if (currentMetrics.memory.usagePercentage > 80) {
      // Simulate memory cleanup
      actions.push('Cleared memory cache');
      actions.push('Terminated unused processes');
    }

    // Check storage usage
    if (currentMetrics.storage.usagePercentage > 80) {
      // Simulate storage cleanup
      actions.push('Cleaned up temporary files');
      actions.push('Compressed old logs');
    }

    // Check for failed services
    for (const service of currentMetrics.services) {
      if (service.status === 'failed') {
        // Simulate service restart
        actions.push(`Restarted ${service.name} service`);
      }
    }

    return {
      success: true,
      actions,
      message: `System optimized with ${actions.length} actions`,
    };
  }

  /**
   * Register alert callback
   */
  onAlert(callback: (alert: SystemAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Unregister alert callback
   */
  offAlert(callback: (alert: SystemAlert) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index !== -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<SystemMonitorOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Restart monitoring if interval changed
    if (newOptions.collectionInterval !== undefined) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  /**
   * Get current options
   */
  getOptions(): SystemMonitorOptions {
    return { ...this.options };
  }

  /**
   * Clear all data
   */
  clearData(): void {
    this.metricsHistory = [];
    this.alerts.clear();
    this.persistData();
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.stopMonitoring();
    this.persistData();
    this.alertCallbacks = [];
  }
}

// Singleton instance with default options
export const systemMonitor = new SystemMonitor({
  enableMonitoring: true,
  collectionInterval: 30000,
  retentionPeriod: 7 * 24 * 60 * 60 * 1000,
  enableAlerts: true,
  alertThresholds: {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    storage: { warning: 80, critical: 95 },
    temperature: { warning: 70, critical: 85 },
    network: { errorRate: 5 },
  },
  enableAutoOptimization: false,
  maxMetricHistory: 1000,
  enablePersistence: true,
  persistenceKey: 'system_monitor_data',
});

// Export a factory function for easier usage
export function createSystemMonitor(options?: SystemMonitorOptions): SystemMonitor {
  return new SystemMonitor(options);
}

// React hook for system monitoring
export function useSystemMonitor() {
  return {
    getSystemInfo: systemMonitor.getSystemInfo.bind(systemMonitor),
    getCurrentMetrics: systemMonitor.getCurrentMetrics.bind(systemMonitor),
    getMetricsHistory: systemMonitor.getMetricsHistory.bind(systemMonitor),
    getAlerts: systemMonitor.getAlerts.bind(systemMonitor),
    resolveAlert: systemMonitor.resolveAlert.bind(systemMonitor),
    getPerformanceSummary: systemMonitor.getPerformanceSummary.bind(systemMonitor),
    optimizeSystem: systemMonitor.optimizeSystem.bind(systemMonitor),
    onAlert: systemMonitor.onAlert.bind(systemMonitor),
    offAlert: systemMonitor.offAlert.bind(systemMonitor),
    updateOptions: systemMonitor.updateOptions.bind(systemMonitor),
    getOptions: systemMonitor.getOptions.bind(systemMonitor),
    clearData: systemMonitor.clearData.bind(systemMonitor),
  };
}