import { logger, logApiError, logApiRequest } from '@/lib/logger'

/**
 * Business Metrics Monitoring System
 * Provides comprehensive business metrics tracking for the attendance application
 * Optimized for DS223J hardware constraints
 */

export interface BusinessMetric {
  id: string;
  name: string;
  category: BusinessMetricCategory;
  type: BusinessMetricType;
  value: number;
  previousValue?: number;
  unit?: string;
  timestamp: Date;
  tags: Record<string, string>;
  metadata: Record<string, any>;
}

export type BusinessMetricCategory = 
  | 'attendance'
  | 'employee'
  | 'face_recognition'
  | 'sync'
  | 'performance'
  | 'user_activity'
  | 'system'
  | 'custom';

export type BusinessMetricType = 
  | 'counter'
  | 'gauge'
  | 'rate'
  | 'histogram'
  | 'timer';

export interface BusinessMetricDefinition {
  id: string;
  name: string;
  category: BusinessMetricCategory;
  type: BusinessMetricType;
  description: string;
  unit?: string;
  tags?: string[];
  enabled: boolean;
}

export interface BusinessMetricsOptions {
  enableCollection?: boolean;
  collectionInterval?: number; // ms
  retentionPeriod?: number; // ms
  maxMetrics?: number;
  enableAggregation?: boolean;
  aggregationInterval?: number; // ms
  enablePersistence?: boolean;
  persistenceKey?: string;
  enableRealTimeUpdates?: boolean;
}

export interface BusinessMetricsReport {
  id: string;
  name: string;
  description: string;
  category: BusinessMetricCategory;
  timeRange: {
    start: Date;
    end: Date;
  };
  metrics: BusinessMetric[];
  aggregates: Record<string, any>;
  insights: string[];
  generatedAt: Date;
}

export interface BusinessGoal {
  id: string;
  name: string;
  description: string;
  metricId: string;
  targetValue: number;
  currentValue: number;
  operator: 'greater_than' | 'less_than' | 'equals';
  achieved: boolean;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class BusinessMetricsCollector {
  private options: BusinessMetricsOptions;
  private metricDefinitions: Map<string, BusinessMetricDefinition> = new Map();
  private metrics: Map<string, BusinessMetric[]> = new Map();
  private goals: Map<string, BusinessGoal> = new Map();
  private collectionIntervalId: number | null = null;
  private aggregationIntervalId: number | null = null;
  private metricIdCounter = 0;
  private goalIdCounter = 0;
  private updateCallbacks: Array<(metric: BusinessMetric) => void> = [];

  constructor(options: BusinessMetricsOptions = {}) {
    this.options = {
      enableCollection: true,
      collectionInterval: 60000, // 1 minute
      retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxMetrics: 10000,
      enableAggregation: true,
      aggregationInterval: 300000, // 5 minutes
      enablePersistence: true,
      persistenceKey: 'business_metrics_data',
      enableRealTimeUpdates: true,
      ...options,
    };

    this.initializeDefaultMetrics();
    this.loadPersistedData();
    this.startCollection();
  }

  /**
   * Initialize default business metrics
   */
  private initializeDefaultMetrics(): void {
    // Attendance metrics
    this.defineMetric({
      id: 'attendance.total_records',
      name: 'Total Attendance Records',
      category: 'attendance',
      type: 'counter',
      description: 'Total number of attendance records in the system',
      unit: 'records',
      enabled: true,
    });

    this.defineMetric({
      id: 'attendance.today_checkins',
      name: 'Today Check-ins',
      category: 'attendance',
      type: 'counter',
      description: 'Number of check-ins today',
      unit: 'check-ins',
      enabled: true,
    });

    this.defineMetric({
      id: 'attendance.today_checkouts',
      name: 'Today Check-outs',
      category: 'attendance',
      type: 'counter',
      description: 'Number of check-outs today',
      unit: 'check-outs',
      enabled: true,
    });

    this.defineMetric({
      id: 'attendance.checkin_rate',
      name: 'Check-in Rate',
      category: 'attendance',
      type: 'rate',
      description: 'Rate of successful check-ins',
      unit: '%',
      enabled: true,
    });

    // Employee metrics
    this.defineMetric({
      id: 'employee.total',
      name: 'Total Employees',
      category: 'employee',
      type: 'gauge',
      description: 'Total number of employees in the system',
      unit: 'employees',
      enabled: true,
    });

    this.defineMetric({
      id: 'employee.active',
      name: 'Active Employees',
      category: 'employee',
      type: 'gauge',
      description: 'Number of active employees',
      unit: 'employees',
      enabled: true,
    });

    this.defineMetric({
      id: 'employee.present_today',
      name: 'Employees Present Today',
      category: 'employee',
      type: 'gauge',
      description: 'Number of employees present today',
      unit: 'employees',
      enabled: true,
    });

    // Face recognition metrics
    this.defineMetric({
      id: 'face_recognition.attempts',
      name: 'Face Recognition Attempts',
      category: 'face_recognition',
      type: 'counter',
      description: 'Total number of face recognition attempts',
      unit: 'attempts',
      enabled: true,
    });

    this.defineMetric({
      id: 'face_recognition.success_rate',
      name: 'Face Recognition Success Rate',
      category: 'face_recognition',
      type: 'rate',
      description: 'Success rate of face recognition',
      unit: '%',
      enabled: true,
    });

    this.defineMetric({
      id: 'face_recognition.avg_time',
      name: 'Average Face Recognition Time',
      category: 'face_recognition',
      type: 'timer',
      description: 'Average time for face recognition',
      unit: 'ms',
      enabled: true,
    });

    // Sync metrics
    this.defineMetric({
      id: 'sync.operations',
      name: 'Sync Operations',
      category: 'sync',
      type: 'counter',
      description: 'Total number of sync operations',
      unit: 'operations',
      enabled: true,
    });

    this.defineMetric({
      id: 'sync.success_rate',
      name: 'Sync Success Rate',
      category: 'sync',
      type: 'rate',
      description: 'Success rate of sync operations',
      unit: '%',
      enabled: true,
    });

    this.defineMetric({
      id: 'sync.avg_time',
      name: 'Average Sync Time',
      category: 'sync',
      type: 'timer',
      description: 'Average time for sync operations',
      unit: 'ms',
      enabled: true,
    });

    // Performance metrics
    this.defineMetric({
      id: 'performance.avg_response_time',
      name: 'Average Response Time',
      category: 'performance',
      type: 'timer',
      description: 'Average response time of the application',
      unit: 'ms',
      enabled: true,
    });

    this.defineMetric({
      id: 'performance.error_rate',
      name: 'Error Rate',
      category: 'performance',
      type: 'rate',
      description: 'Error rate of the application',
      unit: '%',
      enabled: true,
    });

    // User activity metrics
    this.defineMetric({
      id: 'user_activity.active_users',
      name: 'Active Users',
      category: 'user_activity',
      type: 'gauge',
      description: 'Number of active users',
      unit: 'users',
      enabled: true,
    });

    this.defineMetric({
      id: 'user_activity.sessions',
      name: 'User Sessions',
      category: 'user_activity',
      type: 'counter',
      description: 'Total number of user sessions',
      unit: 'sessions',
      enabled: true,
    });
  }

  /**
   * Generate a metric ID
   */
  private generateMetricId(): string {
    return `metric_${++this.metricIdCounter}_${Date.now()}`;
  }

  /**
   * Generate a goal ID
   */
  private generateGoalId(): string {
    return `goal_${++this.goalIdCounter}_${Date.now()}`;
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
        
        // Restore metric definitions
        if (data.metricDefinitions) {
          for (const definition of data.metricDefinitions) {
            this.metricDefinitions.set(definition.id, definition);
          }
        }
        
        // Restore metrics
        if (data.metrics) {
          for (const [metricId, metricList] of Object.entries(data.metrics)) {
            this.metrics.set(metricId, (metricList as any[]).map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })));
          }
        }
        
        // Restore goals
        if (data.goals) {
          for (const goal of data.goals) {
            goal.createdAt = new Date(goal.createdAt);
            goal.updatedAt = new Date(goal.updatedAt);
            if (goal.dueDate) {
              goal.dueDate = new Date(goal.dueDate);
            }
            this.goals.set(goal.id, goal);
          }
        }
      }
    } catch (error) {
      logger.error('Error loading persisted business metrics', error as Error);
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
        metricDefinitions: Array.from(this.metricDefinitions.values()),
        metrics: Object.fromEntries(this.metrics),
        goals: Array.from(this.goals.values()),
      };
      
      localStorage.setItem(this.options.persistenceKey!, JSON.stringify(data));
    } catch (error) {
      logger.error('Error persisting business metrics', error as Error);
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
   * Collect metrics
   */
  private collectMetrics(): void {
    // This is a placeholder implementation
    // In a real application, you would collect actual business metrics
    
    // Collect attendance metrics
    this.setMetric('attendance.total_records', Math.floor(Math.random() * 10000) + 5000);
    this.setMetric('attendance.today_checkins', Math.floor(Math.random() * 100) + 50);
    this.setMetric('attendance.today_checkouts', Math.floor(Math.random() * 100) + 50);
    this.setMetric('attendance.checkin_rate', Math.random() * 20 + 80); // 80-100%
    
    // Collect employee metrics
    this.setMetric('employee.total', Math.floor(Math.random() * 500) + 200);
    this.setMetric('employee.active', Math.floor(Math.random() * 450) + 180);
    this.setMetric('employee.present_today', Math.floor(Math.random() * 400) + 150);
    
    // Collect face recognition metrics
    this.setMetric('face_recognition.attempts', Math.floor(Math.random() * 100) + 50);
    this.setMetric('face_recognition.success_rate', Math.random() * 15 + 85); // 85-100%
    this.setMetric('face_recognition.avg_time', Math.random() * 500 + 200); // 200-700ms
    
    // Collect sync metrics
    this.setMetric('sync.operations', Math.floor(Math.random() * 50) + 10);
    this.setMetric('sync.success_rate', Math.random() * 10 + 90); // 90-100%
    this.setMetric('sync.avg_time', Math.random() * 2000 + 1000); // 1000-3000ms
    
    // Collect performance metrics
    this.setMetric('performance.avg_response_time', Math.random() * 300 + 100); // 100-400ms
    this.setMetric('performance.error_rate', Math.random() * 2); // 0-2%
    
    // Collect user activity metrics
    this.setMetric('user_activity.active_users', Math.floor(Math.random() * 50) + 10);
    this.setMetric('user_activity.sessions', Math.floor(Math.random() * 200) + 50);
  }

  /**
   * Aggregate metrics
   */
  private aggregateMetrics(): void {
    // This is a placeholder implementation
    // In a real application, you would perform actual metric aggregation
    logger.info('Aggregating business metrics...');
  }

  /**
   * Define a new business metric
   */
  defineMetric(definition: BusinessMetricDefinition): void {
    this.metricDefinitions.set(definition.id, definition);
    this.persistData();
  }

  /**
   * Get metric definition
   */
  getMetricDefinition(id: string): BusinessMetricDefinition | undefined {
    return this.metricDefinitions.get(id);
  }

  /**
   * Get all metric definitions
   */
  getMetricDefinitions(): BusinessMetricDefinition[] {
    return Array.from(this.metricDefinitions.values());
  }

  /**
   * Set a metric value
   */
  setMetric(
    id: string,
    value: number,
    tags?: Record<string, string>,
    metadata?: Record<string, any>
  ): void {
    const definition = this.metricDefinitions.get(id);
    if (!definition) {
      logger.warn('Business metric ${id} is not defined');
      return;
    }

    // Get previous value
    let previousValue: number | undefined;
    const metricList = this.metrics.get(id);
    if (metricList && metricList.length > 0) {
      previousValue = metricList[metricList.length - 1].value;
    }

    // Create metric
    const metric: BusinessMetric = {
      id: this.generateMetricId(),
      name: definition.name,
      category: definition.category,
      type: definition.type,
      value,
      previousValue,
      unit: definition.unit,
      timestamp: new Date(),
      tags: tags || {},
      metadata: metadata || {},
    };

    // Store metric
    if (!this.metrics.has(id)) {
      this.metrics.set(id, []);
    }

    const list = this.metrics.get(id)!;
    list.push(metric);

    // Maintain metric limit
    if (list.length > this.options.maxMetrics!) {
      list.shift();
    }

    // Update goals
    this.updateGoals(id, value);

    // Notify callbacks
    if (this.options.enableRealTimeUpdates) {
      this.notifyUpdateCallbacks(metric);
    }

    // Persist data
    this.persistData();
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(
    id: string,
    value: number = 1,
    tags?: Record<string, string>
  ): void {
    const definition = this.metricDefinitions.get(id);
    if (!definition || definition.type !== 'counter') {
      logger.warn('Business metric ${id} is not a counter');
      return;
    }

    // Get current value
    let currentValue = 0;
    const metricList = this.metrics.get(id);
    if (metricList && metricList.length > 0) {
      currentValue = metricList[metricList.length - 1].value;
    }

    // Set new value
    this.setMetric(id, currentValue + value, tags);
  }

  /**
   * Record a timer metric
   */
  recordTimer(
    id: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    const definition = this.metricDefinitions.get(id);
    if (!definition || definition.type !== 'timer') {
      logger.warn('Business metric ${id} is not a timer');
      return;
    }

    this.setMetric(id, value, tags);
  }

  /**
   * Start a timer
   */
  startTimer(id: string, tags?: Record<string, string>): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.recordTimer(id, duration, tags);
    };
  }

  /**
   * Get metrics
   */
  getMetrics(
    id?: string,
    options?: {
      startTime?: Date;
      endTime?: Date;
      tags?: Record<string, string>;
      limit?: number;
    }
  ): BusinessMetric[] {
    let metrics: BusinessMetric[] = [];

    if (id) {
      const metricList = this.metrics.get(id);
      if (metricList) {
        metrics = [...metricList];
      }
    } else {
      // Get all metrics
      for (const metricList of this.metrics.values()) {
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

    // Apply tag filter
    if (options?.tags) {
      metrics = metrics.filter(m => {
        for (const [key, value] of Object.entries(options.tags!)) {
          if (m.tags[key] !== value) {
            return false;
          }
        }
        return true;
      });
    }

    // Apply limit
    if (options?.limit) {
      metrics = metrics.slice(-options.limit);
    }

    // Sort by timestamp
    metrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return metrics;
  }

  /**
   * Get metrics by category
   */
  getMetricsByCategory(
    category: BusinessMetricCategory,
    options?: {
      startTime?: Date;
      endTime?: Date;
      limit?: number;
    }
  ): Record<string, BusinessMetric[]> {
    const result: Record<string, BusinessMetric[]> = {};

    for (const [id, definition] of this.metricDefinitions) {
      if (definition.category === category) {
        result[id] = this.getMetrics(id, options);
      }
    }

    return result;
  }

  /**
   * Create a business goal
   */
  createGoal(
    name: string,
    description: string,
    metricId: string,
    targetValue: number,
    operator: 'greater_than' | 'less_than' | 'equals' = 'greater_than',
    dueDate?: Date
  ): string {
    const goalId = this.generateGoalId();
    
    // Get current value
    let currentValue = 0;
    const metricList = this.metrics.get(metricId);
    if (metricList && metricList.length > 0) {
      currentValue = metricList[metricList.length - 1].value;
    }

    // Check if goal is achieved
    let achieved = false;
    switch (operator) {
      case 'greater_than':
        achieved = currentValue >= targetValue;
        break;
      case 'less_than':
        achieved = currentValue <= targetValue;
        break;
      case 'equals':
        achieved = currentValue === targetValue;
        break;
    }

    const goal: BusinessGoal = {
      id: goalId,
      name,
      description,
      metricId,
      targetValue,
      currentValue,
      operator,
      achieved,
      dueDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.goals.set(goalId, goal);
    this.persistData();

    return goalId;
  }

  /**
   * Get goals
   */
  getGoals(options?: {
    achieved?: boolean;
    category?: BusinessMetricCategory;
  }): BusinessGoal[] {
    let goals = Array.from(this.goals.values());

    // Apply filters
    if (options?.achieved !== undefined) {
      goals = goals.filter(g => g.achieved === options.achieved);
    }

    if (options?.category) {
      goals = goals.filter(g => {
        const definition = this.metricDefinitions.get(g.metricId);
        return definition && definition.category === options.category;
      });
    }

    // Sort by creation date (newest first)
    goals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return goals;
  }

  /**
   * Update goals based on metric value
   */
  private updateGoals(metricId: string, value: number): void {
    for (const goal of this.goals.values()) {
      if (goal.metricId === metricId) {
        goal.currentValue = value;
        goal.updatedAt = new Date();

        // Check if goal is achieved
        let achieved = false;
        switch (goal.operator) {
          case 'greater_than':
            achieved = value >= goal.targetValue;
            break;
          case 'less_than':
            achieved = value <= goal.targetValue;
            break;
          case 'equals':
            achieved = value === goal.targetValue;
            break;
        }

        // Update achievement status if changed
        if (goal.achieved !== achieved) {
          goal.achieved = achieved;
        }
      }
    }
  }

  /**
   * Generate a business metrics report
   */
  generateReport(
    name: string,
    description: string,
    category: BusinessMetricCategory,
    timeRange: {
      start: Date;
      end: Date;
    }
  ): BusinessMetricsReport {
    const reportId = `report_${Date.now()}`;
    
    // Get metrics for the category and time range
    const metrics: BusinessMetric[] = [];
    const categoryMetrics = this.getMetricsByCategory(category, {
      startTime: timeRange.start,
      endTime: timeRange.end,
    });

    for (const metricList of Object.values(categoryMetrics)) {
      metrics.push(...metricList);
    }

    // Calculate aggregates
    const aggregates: Record<string, any> = {};
    for (const [id, definition] of this.metricDefinitions) {
      if (definition.category === category) {
        const metricList = this.metrics.get(id);
        if (metricList && metricList.length > 0) {
          const values = metricList.map(m => m.value);
          aggregates[id] = {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((sum, val) => sum + val, 0) / values.length,
            latest: values[values.length - 1],
            count: values.length,
          };
        }
      }
    }

    // Generate insights
    const insights = this.generateInsights(category, metrics, aggregates);

    const report: BusinessMetricsReport = {
      id: reportId,
      name,
      description,
      category,
      timeRange,
      metrics,
      aggregates,
      insights,
      generatedAt: new Date(),
    };

    return report;
  }

  /**
   * Generate insights from metrics
   */
  private generateInsights(
    category: BusinessMetricCategory,
    metrics: BusinessMetric[],
    aggregates: Record<string, any>
  ): string[] {
    const insights: string[] = [];

    switch (category) {
      case 'attendance':
        const checkinRate = aggregates['attendance.checkin_rate'];
        if (checkinRate && checkinRate.avg < 90) {
          insights.push('Check-in rate is below 90%. Consider improving attendance tracking.');
        }

        const todayCheckins = aggregates['attendance.today_checkins'];
        const totalEmployees = aggregates['employee.total'];
        if (todayCheckins && totalEmployees && todayCheckins.latest / totalEmployees.latest < 0.8) {
          insights.push('Less than 80% of employees have checked in today.');
        }
        break;

      case 'face_recognition':
        const successRate = aggregates['face_recognition.success_rate'];
        if (successRate && successRate.avg < 95) {
          insights.push('Face recognition success rate is below 95%. Consider improving recognition accuracy.');
        }

        const avgTime = aggregates['face_recognition.avg_time'];
        if (avgTime && avgTime.avg > 500) {
          insights.push('Face recognition is taking longer than expected. Consider optimizing performance.');
        }
        break;

      case 'sync':
        const syncSuccessRate = aggregates['sync.success_rate'];
        if (syncSuccessRate && syncSuccessRate.avg < 95) {
          insights.push('Sync success rate is below 95%. Check network connectivity and sync configuration.');
        }
        break;

      case 'performance':
        const responseTime = aggregates['performance.avg_response_time'];
        if (responseTime && responseTime.avg > 300) {
          insights.push('Application response time is high. Consider optimizing performance.');
        }

        const errorRate = aggregates['performance.error_rate'];
        if (errorRate && errorRate.avg > 1) {
          insights.push('Error rate is above 1%. Check application logs for errors.');
        }
        break;
    }

    return insights;
  }

  /**
   * Notify update callbacks
   */
  private notifyUpdateCallbacks(metric: BusinessMetric): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(metric);
      } catch (error) {
        logger.error('Error in business metrics update callback', error as Error);
      }
    });
  }

  /**
   * Register update callback
   */
  onUpdate(callback: (metric: BusinessMetric) => void): void {
    this.updateCallbacks.push(callback);
  }

  /**
   * Unregister update callback
   */
  offUpdate(callback: (metric: BusinessMetric) => void): void {
    const index = this.updateCallbacks.indexOf(callback);
    if (index !== -1) {
      this.updateCallbacks.splice(index, 1);
    }
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<BusinessMetricsOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Restart intervals if they changed
    if (newOptions.collectionInterval !== undefined) {
      this.stopCollection();
      this.startCollection();
    }

    if (newOptions.aggregationInterval !== undefined && this.aggregationIntervalId !== null) {
      clearInterval(this.aggregationIntervalId);
      
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
  getOptions(): BusinessMetricsOptions {
    return { ...this.options };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.persistData();
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.stopCollection();
    this.persistData();
    this.updateCallbacks = [];
  }
}

// Singleton instance with default options
export const businessMetricsCollector = new BusinessMetricsCollector({
  enableCollection: true,
  collectionInterval: 60000,
  retentionPeriod: 30 * 24 * 60 * 60 * 1000,
  maxMetrics: 10000,
  enableAggregation: true,
  aggregationInterval: 300000,
  enablePersistence: true,
  persistenceKey: 'business_metrics_data',
  enableRealTimeUpdates: true,
});

// Export a factory function for easier usage
export function createBusinessMetricsCollector(options?: BusinessMetricsOptions): BusinessMetricsCollector {
  return new BusinessMetricsCollector(options);
}

// React hook for business metrics
export function useBusinessMetrics() {
  return {
    defineMetric: businessMetricsCollector.defineMetric.bind(businessMetricsCollector),
    getMetricDefinition: businessMetricsCollector.getMetricDefinition.bind(businessMetricsCollector),
    getMetricDefinitions: businessMetricsCollector.getMetricDefinitions.bind(businessMetricsCollector),
    setMetric: businessMetricsCollector.setMetric.bind(businessMetricsCollector),
    incrementCounter: businessMetricsCollector.incrementCounter.bind(businessMetricsCollector),
    recordTimer: businessMetricsCollector.recordTimer.bind(businessMetricsCollector),
    startTimer: businessMetricsCollector.startTimer.bind(businessMetricsCollector),
    getMetrics: businessMetricsCollector.getMetrics.bind(businessMetricsCollector),
    getMetricsByCategory: businessMetricsCollector.getMetricsByCategory.bind(businessMetricsCollector),
    createGoal: businessMetricsCollector.createGoal.bind(businessMetricsCollector),
    getGoals: businessMetricsCollector.getGoals.bind(businessMetricsCollector),
    generateReport: businessMetricsCollector.generateReport.bind(businessMetricsCollector),
    onUpdate: businessMetricsCollector.onUpdate.bind(businessMetricsCollector),
    offUpdate: businessMetricsCollector.offUpdate.bind(businessMetricsCollector),
    updateOptions: businessMetricsCollector.updateOptions.bind(businessMetricsCollector),
    getOptions: businessMetricsCollector.getOptions.bind(businessMetricsCollector),
    clearMetrics: businessMetricsCollector.clearMetrics.bind(businessMetricsCollector),
  };
}