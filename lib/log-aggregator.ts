/**
 * Log Aggregation and Analysis Tool
 * Provides comprehensive log aggregation, analysis, and visualization
 * Optimized for DS223J hardware constraints
 */

// Define log types locally to avoid circular dependencies
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  component?: string;
  action?: string;
  context?: Record<string, any>;
  tags?: string[];
}

export interface LogAggregationOptions {
  enableAggregation?: boolean;
  aggregationInterval?: number; // ms
  retentionPeriod?: number; // ms
  maxLogs?: number;
  enableAnalysis?: boolean;
  enablePersistence?: boolean;
  persistenceKey?: string;
  enableRealTimeUpdates?: boolean;
  enableCompression?: boolean;
  compressionThreshold?: number;
}

export interface LogAggregation {
  id: string;
  timestamp: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  totalLogs: number;
  logsByLevel: Record<LogLevel, number>;
  logsByComponent: Record<string, number>;
  logsByAction: Record<string, number>;
  topErrors: Array<{
    message: string;
    count: number;
    level: LogLevel;
  }>;
  topWarnings: Array<{
    message: string;
    count: number;
  }>;
  performanceMetrics: {
    avgResponseTime: number;
    errorRate: number;
    warningRate: number;
  };
  systemMetrics: {
    memoryUsage: number;
    cpuUsage: number;
  };
  insights: string[];
}

export interface LogAnalysis {
  id: string;
  name: string;
  description: string;
  type: AnalysisType;
  timestamp: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  filters: LogFilter[];
  results: AnalysisResult;
  recommendations: string[];
}

export type AnalysisType = 
  | 'error_trends'
  | 'performance_analysis'
  | 'security_analysis'
  | 'usage_patterns'
  | 'custom';

export interface LogFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between';
  value: any;
  caseSensitive?: boolean;
}

export interface AnalysisResult {
  summary: string;
  data: Record<string, any>;
  charts: ChartData[];
  tables: TableData[];
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title: string;
  data: any[];
  xAxis?: {
    label: string;
    field: string;
  };
  yAxis?: {
    label: string;
    field: string;
  };
}

export interface TableData {
  title: string;
  columns: Array<{
    key: string;
    label: string;
    sortable?: boolean;
  }>;
  rows: any[];
}

export class LogAggregator {
  private options: LogAggregationOptions;
  private aggregations: LogAggregation[] = [];
  private analyses: LogAnalysis[] = [];
  private aggregationIntervalId: number | null = null;
  private aggregationIdCounter = 0;
  private analysisIdCounter = 0;
  private updateCallbacks: Array<(aggregation: LogAggregation) => void> = [];

  constructor(options: LogAggregationOptions = {}) {
    this.options = {
      enableAggregation: true,
      aggregationInterval: 300000, // 5 minutes
      retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxLogs: 10000,
      enableAnalysis: true,
      enablePersistence: true,
      persistenceKey: 'log_aggregator_data',
      enableRealTimeUpdates: true,
      enableCompression: false,
      compressionThreshold: 1000,
      ...options,
    };

    this.loadPersistedData();
    this.startAggregation();
  }

  /**
   * Generate an aggregation ID
   */
  private generateAggregationId(): string {
    return `agg_${++this.aggregationIdCounter}_${Date.now()}`;
  }

  /**
   * Generate an analysis ID
   */
  private generateAnalysisId(): string {
    return `analysis_${++this.analysisIdCounter}_${Date.now()}`;
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
        
        // Restore aggregations
        if (data.aggregations) {
          this.aggregations = data.aggregations.map((a: any) => ({
            ...a,
            timestamp: new Date(a.timestamp),
            timeRange: {
              start: new Date(a.timeRange.start),
              end: new Date(a.timeRange.end),
            },
          }));
        }
        
        // Restore analyses
        if (data.analyses) {
          this.analyses = data.analyses.map((a: any) => ({
            ...a,
            timestamp: new Date(a.timestamp),
            timeRange: {
              start: new Date(a.timeRange.start),
              end: new Date(a.timeRange.end),
            },
          }));
        }
      }
    } catch (error) {
      console.error('Error loading persisted log aggregation data:', error);
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
        aggregations: this.aggregations,
        analyses: this.analyses,
      };
      
      localStorage.setItem(this.options.persistenceKey!, JSON.stringify(data));
    } catch (error) {
      console.error('Error persisting log aggregation data:', error);
    }
  }

  /**
   * Start log aggregation
   */
  private startAggregation(): void {
    if (!this.options.enableAggregation) {
      return;
    }

    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    this.aggregationIntervalId = window.setInterval(() => {
      this.performAggregation();
    }, this.options.aggregationInterval);

    // Perform initial aggregation
    this.performAggregation();
  }

  /**
   * Stop log aggregation
   */
  private stopAggregation(): void {
    if (this.aggregationIntervalId !== null) {
      clearInterval(this.aggregationIntervalId);
      this.aggregationIntervalId = null;
    }
  }

  /**
   * Perform log aggregation
   */
  private async performAggregation(): Promise<void> {
    // This is a placeholder implementation
    // In a real application, you would query actual logs from the logger
    const now = new Date();
    const timeWindow = this.options.aggregationInterval! * 2; // Use 2x the interval as time window
    const startTime = new Date(now.getTime() - timeWindow);

    // Simulate log data
    const logs = this.generateMockLogs(startTime, now);
    
    // Create aggregation
    const aggregation: LogAggregation = {
      id: this.generateAggregationId(),
      timestamp: now,
      timeRange: {
        start: startTime,
        end: now,
      },
      totalLogs: logs.length,
      logsByLevel: this.aggregateLogsByLevel(logs),
      logsByComponent: this.aggregateLogsByComponent(logs),
      logsByAction: this.aggregateLogsByAction(logs),
      topErrors: this.getTopErrors(logs),
      topWarnings: this.getTopWarnings(logs),
      performanceMetrics: this.calculatePerformanceMetrics(logs),
      systemMetrics: this.getSystemMetrics(),
      insights: this.generateInsights(logs),
    };

    // Add to aggregations
    this.aggregations.push(aggregation);

    // Maintain retention period
    const retentionTime = now.getTime() - this.options.retentionPeriod!;
    this.aggregations = this.aggregations.filter(a => a.timestamp.getTime() > retentionTime);

    // Notify callbacks
    if (this.options.enableRealTimeUpdates) {
      this.notifyUpdateCallbacks(aggregation);
    }

    // Persist data
    this.persistData();
  }

  /**
   * Generate mock logs for demonstration
   */
  private generateMockLogs(startTime: Date, endTime: Date): LogEntry[] {
    const logs: LogEntry[] = [];
    const logCount = Math.floor(Math.random() * 100) + 50;
    
    for (let i = 0; i < logCount; i++) {
      const timestamp = new Date(
        startTime.getTime() + Math.random() * (endTime.getTime() - startTime.getTime())
      );
      
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
      const level = levels[Math.floor(Math.random() * levels.length)];
      
      const components = ['auth', 'attendance', 'sync', 'api', 'ui'];
      const component = components[Math.floor(Math.random() * components.length)];
      
      const actions = ['login', 'logout', 'checkin', 'checkout', 'sync', 'upload', 'download'];
      const action = actions[Math.floor(Math.random() * actions.length)];
      
      logs.push({
        id: `log_${i}_${timestamp.getTime()}`,
        timestamp,
        level,
        message: `Sample ${level} message from ${component} during ${action}`,
        component,
        action,
        context: {
          userId: `user_${Math.floor(Math.random() * 100)}`,
          sessionId: `session_${Math.floor(Math.random() * 50)}`,
        },
        tags: [level, component, action],
      });
    }
    
    return logs;
  }

  /**
   * Aggregate logs by level
   */
  private aggregateLogsByLevel(logs: LogEntry[]): Record<LogLevel, number> {
    const result: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    };
    
    for (const log of logs) {
      result[log.level]++;
    }
    
    return result;
  }

  /**
   * Aggregate logs by component
   */
  private aggregateLogsByComponent(logs: LogEntry[]): Record<string, number> {
    const result: Record<string, number> = {};
    
    for (const log of logs) {
      if (log.component) {
        result[log.component] = (result[log.component] || 0) + 1;
      }
    }
    
    return result;
  }

  /**
   * Aggregate logs by action
   */
  private aggregateLogsByAction(logs: LogEntry[]): Record<string, number> {
    const result: Record<string, number> = {};
    
    for (const log of logs) {
      if (log.action) {
        result[log.action] = (result[log.action] || 0) + 1;
      }
    }
    
    return result;
  }

  /**
   * Get top errors
   */
  private getTopErrors(logs: LogEntry[]): Array<{ message: string; count: number; level: LogLevel }> {
    const errorMessages: Record<string, { count: number; level: LogLevel }> = {};
    
    for (const log of logs) {
      if (log.level === 'error' || log.level === 'fatal') {
        const key = log.message;
        if (!errorMessages[key]) {
          errorMessages[key] = { count: 0, level: log.level };
        }
        errorMessages[key].count++;
      }
    }
    
    // Sort by count and take top 10
    const sortedErrors = Object.entries(errorMessages)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([message, data]) => ({ message, count: data.count, level: data.level }));
    
    return sortedErrors;
  }

  /**
   * Get top warnings
   */
  private getTopWarnings(logs: LogEntry[]): Array<{ message: string; count: number }> {
    const warningMessages: Record<string, number> = {};
    
    for (const log of logs) {
      if (log.level === 'warn') {
        const key = log.message;
        warningMessages[key] = (warningMessages[key] || 0) + 1;
      }
    }
    
    // Sort by count and take top 10
    const sortedWarnings = Object.entries(warningMessages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }));
    
    return sortedWarnings;
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(logs: LogEntry[]): {
    avgResponseTime: number;
    errorRate: number;
    warningRate: number;
  } {
    const totalLogs = logs.length;
    const errorLogs = logs.filter(log => log.level === 'error' || log.level === 'fatal').length;
    const warningLogs = logs.filter(log => log.level === 'warn').length;
    
    // Simulate response time calculation
    const avgResponseTime = Math.random() * 300 + 100; // 100-400ms
    
    return {
      avgResponseTime,
      errorRate: totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0,
      warningRate: totalLogs > 0 ? (warningLogs / totalLogs) * 100 : 0,
    };
  }

  /**
   * Get system metrics
   */
  private getSystemMetrics(): {
    memoryUsage: number;
    cpuUsage: number;
  } {
    // Simulate system metrics
    return {
      memoryUsage: Math.random() * 80 + 10, // 10-90%
      cpuUsage: Math.random() * 70 + 10, // 10-80%
    };
  }

  /**
   * Generate insights from logs
   */
  private generateInsights(logs: LogEntry[]): string[] {
    const insights: string[] = [];
    const totalLogs = logs.length;
    const errorLogs = logs.filter(log => log.level === 'error' || log.level === 'fatal');
    const warningLogs = logs.filter(log => log.level === 'warn');
    
    // Error rate insight
    const errorRate = totalLogs > 0 ? (errorLogs.length / totalLogs) * 100 : 0;
    if (errorRate > 5) {
      insights.push(`High error rate detected: ${errorRate.toFixed(1)}%. Consider investigating the cause.`);
    }
    
    // Warning rate insight
    const warningRate = totalLogs > 0 ? (warningLogs.length / totalLogs) * 100 : 0;
    if (warningRate > 10) {
      insights.push(`High warning rate detected: ${warningRate.toFixed(1)}%. Review warnings for potential issues.`);
    }
    
    // Component insight
    const componentCounts = this.aggregateLogsByComponent(logs);
    const topComponent = Object.entries(componentCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topComponent) {
      insights.push(`Most active component: ${topComponent[0]} with ${topComponent[1]} logs.`);
    }
    
    // Time-based insight
    const hourlyCounts: Record<number, number> = {};
    for (const log of logs) {
      const hour = log.timestamp.getHours();
      hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
    }
    
    const peakHour = Object.entries(hourlyCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (peakHour) {
      insights.push(`Peak activity hour: ${peakHour[0]}:00 with ${peakHour[1]} logs.`);
    }
    
    return insights;
  }

  /**
   * Get aggregations
   */
  getAggregations(options?: {
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): LogAggregation[] {
    let aggregations = [...this.aggregations];
    
    // Apply time range filter
    if (options?.startTime) {
      aggregations = aggregations.filter(a => a.timestamp >= options.startTime!);
    }
    
    if (options?.endTime) {
      aggregations = aggregations.filter(a => a.timestamp <= options.endTime!);
    }
    
    // Apply limit
    if (options?.limit) {
      aggregations = aggregations.slice(-options.limit);
    }
    
    // Sort by timestamp (newest first)
    aggregations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return aggregations;
  }

  /**
   * Get latest aggregation
   */
  getLatestAggregation(): LogAggregation | null {
    return this.aggregations.length > 0 
      ? this.aggregations[this.aggregations.length - 1]
      : null;
  }

  /**
   * Perform log analysis
   */
  async performAnalysis(
    name: string,
    description: string,
    type: AnalysisType,
    timeRange: {
      start: Date;
      end: Date;
    },
    filters: LogFilter[] = []
  ): Promise<string> {
    // This is a placeholder implementation
    // In a real application, you would perform actual analysis based on the type
    
    // Generate mock logs for the time range
    const logs = this.generateMockLogs(timeRange.start, timeRange.end);
    
    // Apply filters
    let filteredLogs = logs;
    for (const filter of filters) {
      filteredLogs = filteredLogs.filter(log => this.matchesFilter(log, filter));
    }
    
    // Generate analysis results based on type
    let results: AnalysisResult;
    let recommendations: string[] = [];
    
    switch (type) {
      case 'error_trends':
        results = this.analyzeErrorTrends(filteredLogs);
        recommendations = [
          'Monitor error rates closely',
          'Investigate recurring error patterns',
          'Implement preventive measures for common errors',
        ];
        break;
        
      case 'performance_analysis':
        results = this.analyzePerformance(filteredLogs);
        recommendations = [
          'Optimize slow operations',
          'Monitor resource usage',
          'Consider caching for frequently accessed data',
        ];
        break;
        
      case 'security_analysis':
        results = this.analyzeSecurity(filteredLogs);
        recommendations = [
          'Review authentication logs for suspicious activity',
          'Monitor access patterns',
          'Implement additional security measures if needed',
        ];
        break;
        
      case 'usage_patterns':
        results = this.analyzeUsagePatterns(filteredLogs);
        recommendations = [
          'Optimize user experience based on usage patterns',
          'Consider load balancing during peak hours',
          'Implement personalized features based on user behavior',
        ];
        break;
        
      default:
        results = this.analyzeCustom(filteredLogs);
        recommendations = [
          'Review analysis results',
          'Take appropriate actions based on findings',
        ];
    }
    
    // Create analysis
    const analysis: LogAnalysis = {
      id: this.generateAnalysisId(),
      name,
      description,
      type,
      timestamp: new Date(),
      timeRange,
      filters,
      results,
      recommendations,
    };
    
    // Add to analyses
    this.analyses.push(analysis);
    
    // Persist data
    this.persistData();
    
    return analysis.id;
  }

  /**
   * Check if a log matches a filter
   */
  private matchesFilter(log: LogEntry, filter: LogFilter): boolean {
    let fieldValue: any;
    
    // Get field value
    switch (filter.field) {
      case 'level':
        fieldValue = log.level;
        break;
      case 'component':
        fieldValue = log.component;
        break;
      case 'action':
        fieldValue = log.action;
        break;
      case 'message':
        fieldValue = log.message;
        break;
      default:
        fieldValue = log.context?.[filter.field];
    }
    
    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }
    
    // Evaluate filter
    return this.compareValues(fieldValue, filter.value, filter.operator, filter.caseSensitive);
  }

  /**
   * Compare values based on operator
   */
  private compareValues(actual: any, expected: any, operator: string, caseSensitive: boolean = true): boolean {
    if (actual === undefined || actual === null) {
      return false;
    }
    
    let actualStr = String(actual);
    let expectedStr = String(expected);
    
    if (!caseSensitive && typeof actual === 'string' && typeof expected === 'string') {
      actualStr = actualStr.toLowerCase();
      expectedStr = expectedStr.toLowerCase();
    }
    
    switch (operator) {
      case 'equals':
        return actualStr === expectedStr;
      case 'not_equals':
        return actualStr !== expectedStr;
      case 'contains':
        return actualStr.includes(expectedStr);
      case 'not_contains':
        return !actualStr.includes(expectedStr);
      case 'greater_than':
        return Number(actual) > Number(expected);
      case 'less_than':
        return Number(actual) < Number(expected);
      case 'between':
        const [min, max] = expectedStr.split(',').map(v => v.trim());
        return Number(actual) >= Number(min) && Number(actual) <= Number(max);
      default:
        return false;
    }
  }

  /**
   * Analyze error trends
   */
  private analyzeErrorTrends(logs: LogEntry[]): AnalysisResult {
    const errorLogs = logs.filter(log => log.level === 'error' || log.level === 'fatal');
    
    // Group errors by hour
    const hourlyErrors: Record<number, number> = {};
    for (const log of errorLogs) {
      const hour = log.timestamp.getHours();
      hourlyErrors[hour] = (hourlyErrors[hour] || 0) + 1;
    }
    
    // Create chart data
    const chartData: ChartData = {
      type: 'line',
      title: 'Error Trends by Hour',
      data: Object.entries(hourlyErrors).map(([hour, count]) => ({ hour: parseInt(hour), count })),
      xAxis: {
        label: 'Hour',
        field: 'hour',
      },
      yAxis: {
        label: 'Error Count',
        field: 'count',
      },
    };
    
    // Create table data
    const topErrors = this.getTopErrors(errorLogs);
    const tableData: TableData = {
      title: 'Top Errors',
      columns: [
        { key: 'message', label: 'Message', sortable: true },
        { key: 'count', label: 'Count', sortable: true },
        { key: 'level', label: 'Level', sortable: true },
      ],
      rows: topErrors,
    };
    
    return {
      summary: `Found ${errorLogs.length} errors in the selected time range.`,
      data: {
        totalErrors: errorLogs.length,
        errorRate: logs.length > 0 ? (errorLogs.length / logs.length) * 100 : 0,
      },
      charts: [chartData],
      tables: [tableData],
    };
  }

  /**
   * Analyze performance
   */
  private analyzePerformance(logs: LogEntry[]): AnalysisResult {
    // Simulate performance analysis
    const responseTimes = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      avgTime: Math.random() * 300 + 100, // 100-400ms
    }));
    
    // Create chart data
    const chartData: ChartData = {
      type: 'area',
      title: 'Average Response Time by Hour',
      data: responseTimes,
      xAxis: {
        label: 'Hour',
        field: 'hour',
      },
      yAxis: {
        label: 'Response Time (ms)',
        field: 'avgTime',
      },
    };
    
    return {
      summary: 'Performance analysis completed.',
      data: {
        avgResponseTime: responseTimes.reduce((sum, item) => sum + item.avgTime, 0) / responseTimes.length,
      },
      charts: [chartData],
      tables: [],
    };
  }

  /**
   * Analyze security
   */
  private analyzeSecurity(logs: LogEntry[]): AnalysisResult {
    const authLogs = logs.filter(log => log.component === 'auth');
    const failedLogins = authLogs.filter(log => log.message.includes('failed'));
    
    // Create chart data
    const chartData: ChartData = {
      type: 'bar',
      title: 'Authentication Events',
      data: [
        { type: 'Successful Logins', count: authLogs.length - failedLogins.length },
        { type: 'Failed Logins', count: failedLogins.length },
      ],
      xAxis: {
        label: 'Event Type',
        field: 'type',
      },
      yAxis: {
        label: 'Count',
        field: 'count',
      },
    };
    
    return {
      summary: `Found ${failedLogins.length} failed login attempts out of ${authLogs.length} total authentication events.`,
      data: {
        totalAuthEvents: authLogs.length,
        failedLogins: failedLogins.length,
        failureRate: authLogs.length > 0 ? (failedLogins.length / authLogs.length) * 100 : 0,
      },
      charts: [chartData],
      tables: [],
    };
  }

  /**
   * Analyze usage patterns
   */
  private analyzeUsagePatterns(logs: LogEntry[]): AnalysisResult {
    const componentCounts = this.aggregateLogsByComponent(logs);
    
    // Create chart data
    const chartData: ChartData = {
      type: 'pie',
      title: 'Usage by Component',
      data: Object.entries(componentCounts).map(([component, count]) => ({ component, count })),
    };
    
    return {
      summary: 'Usage patterns analysis completed.',
      data: componentCounts,
      charts: [chartData],
      tables: [],
    };
  }

  /**
   * Analyze custom
   */
  private analyzeCustom(logs: LogEntry[]): AnalysisResult {
    return {
      summary: `Analyzed ${logs.length} logs with custom filters.`,
      data: {
        totalLogs: logs.length,
      },
      charts: [],
      tables: [],
    };
  }

  /**
   * Get analyses
   */
  getAnalyses(options?: {
    type?: AnalysisType;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): LogAnalysis[] {
    let analyses = [...this.analyses];
    
    // Apply type filter
    if (options?.type) {
      analyses = analyses.filter(a => a.type === options.type);
    }
    
    // Apply time range filter
    if (options?.startTime) {
      analyses = analyses.filter(a => a.timestamp >= options.startTime!);
    }
    
    if (options?.endTime) {
      analyses = analyses.filter(a => a.timestamp <= options.endTime!);
    }
    
    // Apply limit
    if (options?.limit) {
      analyses = analyses.slice(-options.limit);
    }
    
    // Sort by timestamp (newest first)
    analyses.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return analyses;
  }

  /**
   * Get analysis by ID
   */
  getAnalysis(id: string): LogAnalysis | undefined {
    return this.analyses.find(a => a.id === id);
  }

  /**
   * Delete analysis
   */
  deleteAnalysis(id: string): boolean {
    const index = this.analyses.findIndex(a => a.id === id);
    if (index === -1) {
      return false;
    }
    
    this.analyses.splice(index, 1);
    this.persistData();
    
    return true;
  }

  /**
   * Notify update callbacks
   */
  private notifyUpdateCallbacks(aggregation: LogAggregation): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(aggregation);
      } catch (error) {
        console.error('Error in log aggregation update callback:', error);
      }
    });
  }

  /**
   * Register update callback
   */
  onUpdate(callback: (aggregation: LogAggregation) => void): void {
    this.updateCallbacks.push(callback);
  }

  /**
   * Unregister update callback
   */
  offUpdate(callback: (aggregation: LogAggregation) => void): void {
    const index = this.updateCallbacks.indexOf(callback);
    if (index !== -1) {
      this.updateCallbacks.splice(index, 1);
    }
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<LogAggregationOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Restart aggregation if interval changed
    if (newOptions.aggregationInterval !== undefined) {
      this.stopAggregation();
      this.startAggregation();
    }
  }

  /**
   * Get current options
   */
  getOptions(): LogAggregationOptions {
    return { ...this.options };
  }

  /**
   * Clear all data
   */
  clearData(): void {
    this.aggregations = [];
    this.analyses = [];
    this.persistData();
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.stopAggregation();
    this.persistData();
    this.updateCallbacks = [];
  }
}

// Singleton instance with default options
export const logAggregator = new LogAggregator({
  enableAggregation: true,
  aggregationInterval: 300000,
  retentionPeriod: 7 * 24 * 60 * 60 * 1000,
  maxLogs: 10000,
  enableAnalysis: true,
  enablePersistence: true,
  persistenceKey: 'log_aggregator_data',
  enableRealTimeUpdates: true,
  enableCompression: false,
  compressionThreshold: 1000,
});

// Export a factory function for easier usage
export function createLogAggregator(options?: LogAggregationOptions): LogAggregator {
  return new LogAggregator(options);
}

// React hook for log aggregation
export function useLogAggregator() {
  return {
    getAggregations: logAggregator.getAggregations.bind(logAggregator),
    getLatestAggregation: logAggregator.getLatestAggregation.bind(logAggregator),
    performAnalysis: logAggregator.performAnalysis.bind(logAggregator),
    getAnalyses: logAggregator.getAnalyses.bind(logAggregator),
    getAnalysis: logAggregator.getAnalysis.bind(logAggregator),
    deleteAnalysis: logAggregator.deleteAnalysis.bind(logAggregator),
    onUpdate: logAggregator.onUpdate.bind(logAggregator),
    offUpdate: logAggregator.offUpdate.bind(logAggregator),
    updateOptions: logAggregator.updateOptions.bind(logAggregator),
    getOptions: logAggregator.getOptions.bind(logAggregator),
    clearData: logAggregator.clearData.bind(logAggregator),
  };
}