import { logger, logApiError, logApiRequest } from '@/lib/logger'

/**
 * Metrics Collection System
 * Provides comprehensive metrics collection for the application
 * Optimized for DS223J hardware constraints
 */

export interface MetricDefinition {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  description: string;
  labels?: string[];
  unit?: string;
  buckets?: number[]; // For histograms
}

export interface MetricValue {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
  unit?: string;
}

export interface MetricSnapshot {
  timestamp: Date;
  metrics: MetricValue[];
  metadata: {
    sessionId: string;
    uptime: number;
    version: string;
  };
}

export interface MetricsCollectorOptions {
  enableCollection?: boolean;
  collectionInterval?: number; // ms
  maxSnapshots?: number;
  enableAggregation?: boolean;
  aggregationInterval?: number; // ms
  enablePersistence?: boolean;
  persistenceKey?: string;
  enableCompression?: boolean;
  compressionThreshold?: number;
}

export interface AggregatedMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  labels?: Record<string, string>;
  unit?: string;
  timestamp: Date;
}

export class MetricsCollector {
  private options: MetricsCollectorOptions;
  private metricDefinitions: Map<string, MetricDefinition> = new Map();
  private metrics: Map<string, MetricValue[]> = new Map();
  private snapshots: MetricSnapshot[] = [];
  private aggregatedMetrics: Map<string, AggregatedMetric[]> = new Map();
  private collectionIntervalId: number | null = null;
  private aggregationIntervalId: number | null = null;
  private sessionId: string;
  private startTime: Date;

  constructor(options: MetricsCollectorOptions = {}) {
    this.options = {
      enableCollection: true,
      collectionInterval: 30000, // 30 seconds
      maxSnapshots: 100,
      enableAggregation: true,
      aggregationInterval: 300000, // 5 minutes
      enablePersistence: true,
      persistenceKey: 'app_metrics',
      enableCompression: false,
      compressionThreshold: 1000,
      ...options,
    };

    this.sessionId = this.generateSessionId();
    this.startTime = new Date();

    this.initializeDefaultMetrics();
    this.loadPersistedMetrics();
    this.startCollection();
  }

  /**
   * Initialize default metrics
   */
  private initializeDefaultMetrics(): void {
    // System metrics
    this.defineMetric({
      name: 'system.memory.usage',
      type: 'gauge',
      description: 'Memory usage in MB',
      unit: 'MB',
    });

    this.defineMetric({
      name: 'system.cpu.usage',
      type: 'gauge',
      description: 'CPU usage percentage',
      unit: '%',
    });

    this.defineMetric({
      name: 'system.storage.usage',
      type: 'gauge',
      description: 'Storage usage percentage',
      unit: '%',
    });

    // Application metrics
    this.defineMetric({
      name: 'app.requests.total',
      type: 'counter',
      description: 'Total number of requests',
      labels: ['method', 'route', 'status'],
    });

    this.defineMetric({
      name: 'app.request.duration',
      type: 'histogram',
      description: 'Request duration in milliseconds',
      unit: 'ms',
      buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
      labels: ['method', 'route'],
    });

    this.defineMetric({
      name: 'app.errors.total',
      type: 'counter',
      description: 'Total number of errors',
      labels: ['type', 'component'],
    });

    // Business metrics
    this.defineMetric({
      name: 'business.attendance.records',
      type: 'counter',
      description: 'Total number of attendance records',
      labels: ['type', 'status'],
    });

    this.defineMetric({
      name: 'business.face.recognition.attempts',
      type: 'counter',
      description: 'Total number of face recognition attempts',
      labels: ['result', 'employee_id'],
    });

    this.defineMetric({
      name: 'business.sync.operations',
      type: 'counter',
      description: 'Total number of sync operations',
      labels: ['operation', 'status'],
    });

    this.defineMetric({
      name: 'business.users.active',
      type: 'gauge',
      description: 'Number of active users',
      unit: 'count',
    });
  }

  /**
   * Generate a session ID
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Load persisted metrics from storage
   */
  private loadPersistedMetrics(): void {
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
        this.snapshots = data.snapshots || [];
        this.aggregatedMetrics = new Map(Object.entries(data.aggregatedMetrics || {}));
      }
    } catch (error) {
      logger.error('Error loading persisted metrics', error as Error);
    }
  }

  /**
   * Persist metrics to storage
   */
  private persistMetrics(): void {
    if (!this.options.enablePersistence) {
      return;
    }

    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const data = {
        snapshots: this.snapshots,
        aggregatedMetrics: Object.fromEntries(this.aggregatedMetrics),
      };

      localStorage.setItem(this.options.persistenceKey!, JSON.stringify(data));
    } catch (error) {
      logger.error('Error persisting metrics', error as Error);
    }
  }

  /**
   * Start metrics collection
   */
  private startCollection(): void {
    if (!this.options.enableCollection) {
      return;
    }

    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    // Start collection interval
    this.collectionIntervalId = window.setInterval(() => {
      this.collectMetrics();
    }, this.options.collectionInterval);

    // Start aggregation interval
    if (this.options.enableAggregation) {
      this.aggregationIntervalId = window.setInterval(() => {
        this.aggregateMetrics();
      }, this.options.aggregationInterval);
    }

    // Collect initial metrics
    this.collectMetrics();
  }

  /**
   * Stop metrics collection
   */
  private stopCollection(): void {
    if (this.collectionIntervalId !== null) {
      clearInterval(this.collectionIntervalId);
      this.collectionIntervalId = null;
    }

    if (this.aggregationIntervalId !== null) {
      clearInterval(this.aggregationIntervalId);
      this.aggregationIntervalId = null;
    }
  }

  /**
   * Collect current metrics
   */
  private collectMetrics(): void {
    const timestamp = new Date();
    const metrics: MetricValue[] = [];

    // Collect system metrics
    metrics.push(...this.collectSystemMetrics(timestamp));

    // Collect application metrics
    metrics.push(...this.collectApplicationMetrics(timestamp));

    // Create snapshot
    const snapshot: MetricSnapshot = {
      timestamp,
      metrics,
      metadata: {
        sessionId: this.sessionId,
        uptime: Date.now() - this.startTime.getTime(),
        version: process.env.npm_package_version || 'unknown',
      },
    };

    // Add to snapshots
    this.snapshots.push(snapshot);

    // Maintain snapshot limit
    if (this.snapshots.length > this.options.maxSnapshots!) {
      this.snapshots.shift();
    }

    // Persist metrics
    this.persistMetrics();
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(timestamp: Date): MetricValue[] {
    const metrics: MetricValue[] = [];

    // Memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMemory = memory.usedJSHeapSize / 1024 / 1024; // MB

      metrics.push({
        name: 'system.memory.usage',
        type: 'gauge',
        value: usedMemory,
        timestamp,
        unit: 'MB',
      });
    }

    // CPU usage (simulated)
    const cpuUsage = Math.random() * 100;
    metrics.push({
      name: 'system.cpu.usage',
      type: 'gauge',
      value: cpuUsage,
      timestamp,
      unit: '%',
    });

    // Storage usage
    if (typeof window !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        const used = (estimate.usage || 0) / 1024 / 1024; // MB
        const quota = (estimate.quota || 0) / 1024 / 1024; // MB
        const percentage = quota > 0 ? (used / quota) * 100 : 0;

        this.setMetric('system.storage.usage', percentage, {
          timestamp: new Date(),
          unit: '%',
        });
      }).catch(error => {
        logger.error('Error getting storage estimate', error as Error);
      });
    }

    return metrics;
  }

  /**
   * Collect application metrics
   */
  private collectApplicationMetrics(timestamp: Date): MetricValue[] {
    const metrics: MetricValue[] = [];

    // Get metrics from internal storage
    for (const [name, values] of this.metrics) {
      if (values.length > 0) {
        // Get the latest value for gauges
        const latestValue = values[values.length - 1];
        if (latestValue.type === 'gauge') {
          metrics.push({ ...latestValue, timestamp });
        }
      }
    }

    return metrics;
  }

  /**
   * Aggregate metrics
   */
  private aggregateMetrics(): void {
    const now = new Date();
    const aggregationWindow = this.options.aggregationInterval!;

    for (const [name, values] of this.metrics) {
      if (values.length === 0) continue;

      // Filter values within aggregation window
      const windowStart = new Date(now.getTime() - aggregationWindow);
      const recentValues = values.filter(v => v.timestamp >= windowStart);

      if (recentValues.length === 0) continue;

      // Calculate aggregation
      const numericValues = recentValues.map(v => v.value);
      const sum = numericValues.reduce((acc, val) => acc + val, 0);
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const avg = sum / numericValues.length;

      // Get labels from the first value
      const labels = recentValues[0].labels;
      const unit = recentValues[0].unit;

      // Create aggregated metric
      const aggregated: AggregatedMetric = {
        name,
        type: recentValues[0].type,
        count: recentValues.length,
        sum,
        min,
        max,
        avg,
        labels,
        unit,
        timestamp: now,
      };

      // Store aggregated metric
      if (!this.aggregatedMetrics.has(name)) {
        this.aggregatedMetrics.set(name, []);
      }

      const aggregatedList = this.aggregatedMetrics.get(name)!;
      aggregatedList.push(aggregated);

      // Maintain aggregation limit
      if (aggregatedList.length > 100) {
        aggregatedList.shift();
      }
    }

    // Persist aggregated metrics
    this.persistMetrics();
  }

  /**
   * Define a new metric
   */
  defineMetric(definition: MetricDefinition): void {
    this.metricDefinitions.set(definition.name, definition);
  }

  /**
   * Get metric definition
   */
  getMetricDefinition(name: string): MetricDefinition | undefined {
    return this.metricDefinitions.get(name);
  }

  /**
   * Get all metric definitions
   */
  getMetricDefinitions(): MetricDefinition[] {
    return Array.from(this.metricDefinitions.values());
  }

  /**
   * Set a metric value
   */
  setMetric(
    name: string,
    value: number,
    options?: {
      labels?: Record<string, string>;
      timestamp?: Date;
      unit?: string;
    }
  ): void {
    const definition = this.metricDefinitions.get(name);
    if (!definition) {
      logger.warn('Metric ${name} is not defined');
      return;
    }

    const timestamp = options?.timestamp || new Date();
    const labels = options?.labels;
    const unit = options?.unit || definition.unit;

    const metricValue: MetricValue = {
      name,
      type: definition.type,
      value,
      labels,
      timestamp,
      unit,
    };

    // Store metric value
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(metricValue);

    // Maintain metric history limit
    if (values.length > 1000) {
      values.shift();
    }

    // For counters, we need to handle incrementing
    if (definition.type === 'counter') {
      // Find the previous value for this label combination
      const previousValue = values
        .slice(0, -1) // Exclude the value we just added
        .reverse()
        .find(v => this.labelMatch(v.labels, labels));

      if (previousValue) {
        // Update the value to be the difference
        metricValue.value = value - previousValue.value;
      }
    }
  }

  /**
   * Check if two label objects match
   */
  private labelMatch(labels1?: Record<string, string>, labels2?: Record<string, string>): boolean {
    if (!labels1 && !labels2) return true;
    if (!labels1 || !labels2) return false;

    const keys1 = Object.keys(labels1);
    const keys2 = Object.keys(labels2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
      if (labels1[key] !== labels2[key]) return false;
    }

    return true;
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(
    name: string,
    value: number = 1,
    labels?: Record<string, string>
  ): void {
    const definition = this.metricDefinitions.get(name);
    if (!definition || definition.type !== 'counter') {
      logger.warn('Metric ${name} is not a counter');
      return;
    }

    // Get current value
    let currentValue = 0;
    const values = this.metrics.get(name);
    if (values && values.length > 0) {
      const latestValue = values
        .reverse()
        .find(v => this.labelMatch(v.labels, labels));
      if (latestValue) {
        currentValue = latestValue.value;
      }
    }

    // Set new value
    this.setMetric(name, currentValue + value, { labels });
  }

  /**
   * Set a gauge metric
   */
  setGauge(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    const definition = this.metricDefinitions.get(name);
    if (!definition || definition.type !== 'gauge') {
      logger.warn('Metric ${name} is not a gauge');
      return;
    }

    this.setMetric(name, value, { labels });
  }

  /**
   * Record a histogram/timer metric
   */
  recordHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    const definition = this.metricDefinitions.get(name);
    if (!definition || (definition.type !== 'histogram' && definition.type !== 'timer')) {
      logger.warn('Metric ${name} is not a histogram or timer');
      return;
    }

    this.setMetric(name, value, { labels });
  }

  /**
   * Start a timer
   */
  startTimer(name: string, labels?: Record<string, string>): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.recordHistogram(name, duration, labels);
    };
  }

  /**
   * Get metric values
   */
  getMetricValues(
    name: string,
    options?: {
      startTime?: Date;
      endTime?: Date;
      labels?: Record<string, string>;
    }
  ): MetricValue[] {
    const values = this.metrics.get(name) || [];
    let filteredValues = [...values];

    // Apply time range filter
    if (options?.startTime) {
      filteredValues = filteredValues.filter(v => v.timestamp >= options.startTime!);
    }

    if (options?.endTime) {
      filteredValues = filteredValues.filter(v => v.timestamp <= options.endTime!);
    }

    // Apply label filter
    if (options?.labels) {
      filteredValues = filteredValues.filter(v => this.labelMatch(v.labels, options.labels));
    }

    return filteredValues;
  }

  /**
   * Get metric snapshots
   */
  getSnapshots(options?: {
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): MetricSnapshot[] {
    let snapshots = [...this.snapshots];

    // Apply time range filter
    if (options?.startTime) {
      snapshots = snapshots.filter(s => s.timestamp >= options.startTime!);
    }

    if (options?.endTime) {
      snapshots = snapshots.filter(s => s.timestamp <= options.endTime!);
    }

    // Apply limit
    if (options?.limit) {
      snapshots = snapshots.slice(-options.limit);
    }

    return snapshots;
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(
    name?: string,
    options?: {
      startTime?: Date;
      endTime?: Date;
      limit?: number;
    }
  ): AggregatedMetric[] {
    let metrics: AggregatedMetric[] = [];

    if (name) {
      const metricList = this.aggregatedMetrics.get(name);
      if (metricList) {
        metrics = [...metricList];
      }
    } else {
      // Get all aggregated metrics
      for (const metricList of this.aggregatedMetrics.values()) {
        metrics.push(...metricList);
      }
    }

    // Apply time range filter
    if (options?.startTime) {
      metrics = metrics.filter(m => m.timestamp >= options.startTime!);
    }

    if (options?.endTime) {
      metrics = metrics.filter(m => m.timestamp <= options.endTime!);
    }

    // Sort by timestamp
    metrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Apply limit
    if (options?.limit) {
      metrics = metrics.slice(-options.limit);
    }

    return metrics;
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusFormat(): string {
    let output = '';

    // Export metric definitions
    for (const definition of this.metricDefinitions.values()) {
      output += `# HELP ${definition.name} ${definition.description}\n`;
      output += `# TYPE ${definition.name} ${definition.type}\n`;
    }

    // Export metric values
    for (const [name, values] of this.metrics) {
      if (values.length === 0) continue;

      // Get the latest value for gauges
      const latestValue = values[values.length - 1];
      if (latestValue.type === 'gauge') {
        let line = name;
        if (latestValue.labels) {
          const labelPairs = Object.entries(latestValue.labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
          line += `{${labelPairs}}`;
        }
        line += ` ${latestValue.value}`;
        if (latestValue.timestamp) {
          line += ` ${latestValue.timestamp.getTime()}`;
        }
        output += `${line}\n`;
      }
    }

    return output;
  }

  /**
   * Export metrics in JSON format
   */
  exportJSONFormat(): string {
    const data = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      metrics: {} as Record<string, any>,
      snapshots: this.snapshots,
      aggregatedMetrics: Object.fromEntries(this.aggregatedMetrics),
    };

    // Collect current metric values
    for (const [name, values] of this.metrics) {
      if (values.length === 0) continue;

      // Get the latest value
      const latestValue = values[values.length - 1];
      data.metrics[name] = latestValue;
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.snapshots = [];
    this.aggregatedMetrics.clear();
    this.persistMetrics();
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<MetricsCollectorOptions>): void {
    this.options = { ...this.options, ...newOptions };

    // Restart intervals if they changed
    if (newOptions.collectionInterval !== undefined) {
      this.stopCollection();
      this.startCollection();
    }

    if (newOptions.aggregationInterval !== undefined) {
      if (this.aggregationIntervalId !== null) {
        clearInterval(this.aggregationIntervalId);
      }

      if (this.options.enableAggregation && typeof window !== 'undefined') {
        this.aggregationIntervalId = window.setInterval(() => {
          this.aggregateMetrics();
        }, this.options.aggregationInterval);
      }
    }
  }

  /**
   * Get current options
   */
  getOptions(): MetricsCollectorOptions {
    return { ...this.options };
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.stopCollection();
    this.persistMetrics();
    this.clearMetrics();
  }
}

// Singleton instance with default options
export const metricsCollector = new MetricsCollector({
  enableCollection: true,
  collectionInterval: 30000,
  maxSnapshots: 100,
  enableAggregation: true,
  aggregationInterval: 300000,
  enablePersistence: true,
  persistenceKey: 'app_metrics',
  enableCompression: false,
  compressionThreshold: 1000,
});

// Export a factory function for easier usage
export function createMetricsCollector(options?: MetricsCollectorOptions): MetricsCollector {
  return new MetricsCollector(options);
}

// React hook for metrics collection
export function useMetricsCollector() {
  return {
    defineMetric: metricsCollector.defineMetric.bind(metricsCollector),
    getMetricDefinition: metricsCollector.getMetricDefinition.bind(metricsCollector),
    getMetricDefinitions: metricsCollector.getMetricDefinitions.bind(metricsCollector),
    setMetric: metricsCollector.setMetric.bind(metricsCollector),
    incrementCounter: metricsCollector.incrementCounter.bind(metricsCollector),
    setGauge: metricsCollector.setGauge.bind(metricsCollector),
    recordHistogram: metricsCollector.recordHistogram.bind(metricsCollector),
    startTimer: metricsCollector.startTimer.bind(metricsCollector),
    getMetricValues: metricsCollector.getMetricValues.bind(metricsCollector),
    getSnapshots: metricsCollector.getSnapshots.bind(metricsCollector),
    getAggregatedMetrics: metricsCollector.getAggregatedMetrics.bind(metricsCollector),
    exportPrometheusFormat: metricsCollector.exportPrometheusFormat.bind(metricsCollector),
    exportJSONFormat: metricsCollector.exportJSONFormat.bind(metricsCollector),
    clearMetrics: metricsCollector.clearMetrics.bind(metricsCollector),
    updateOptions: metricsCollector.updateOptions.bind(metricsCollector),
    getOptions: metricsCollector.getOptions.bind(metricsCollector),
  };
}