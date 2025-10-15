import { logger, logApiError, logApiRequest } from '@/lib/logger'

/**
 * Error Tracking and Alerting System
 * Provides comprehensive error tracking, grouping, and alerting
 * Optimized for DS223J hardware constraints
 */

export interface ErrorReport {
  id: string;
  timestamp: Date;
  message: string;
  stack?: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: ErrorContext;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
  occurrences: number;
  firstSeen: Date;
  lastSeen: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  assignee?: string;
  tags: string[];
  metadata: Record<string, any>;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
  buildVersion?: string;
  customData?: Record<string, any>;
}

export interface ErrorGroup {
  id: string;
  signature: string;
  title: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  totalOccurrences: number;
  uniqueUsers: number;
  firstSeen: Date;
  lastSeen: Date;
  affectedVersions: string[];
  affectedComponents: string[];
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  assignee?: string;
  tags: string[];
  metadata: Record<string, any>;
}

export interface ErrorAlert {
  id: string;
  groupId: string;
  type: 'new_error' | 'regression' | 'spike' | 'critical_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  metadata: Record<string, any>;
}

export interface ErrorTrackerOptions {
  enableTracking?: boolean;
  enableAlerting?: boolean;
  maxErrorReports?: number;
  maxErrorGroups?: number;
  enableGrouping?: boolean;
  enableAutoResolve?: boolean;
  autoResolveThreshold?: number; // days
  enableNotifications?: boolean;
  notificationChannels?: NotificationChannel[];
  alertRules?: AlertRule[];
  ignoredErrors?: string[];
  samplingRate?: number;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'webhook' | 'slack' | 'console';
  enabled: boolean;
  config: Record<string, any>;
  filters: {
    severity?: ('low' | 'medium' | 'high' | 'critical')[];
    types?: string[];
    components?: string[];
  };
}

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: 'error_count' | 'error_rate' | 'new_error' | 'regression';
  threshold: number;
  timeWindow: number; // minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
  filters: {
    types?: string[];
    components?: string[];
    severities?: ('low' | 'medium' | 'high' | 'critical')[];
  };
  channels: string[]; // Channel IDs
  cooldown: number; // minutes
  lastTriggered?: Date;
}

export class ErrorTracker {
  private options: ErrorTrackerOptions;
  private errorReports: Map<string, ErrorReport> = new Map();
  private errorGroups: Map<string, ErrorGroup> = new Map();
  private alerts: Map<string, ErrorAlert> = new Map();
  private sessionId: string;
  private errorIdCounter = 0;
  private groupIdCounter = 0;
  private alertIdCounter = 0;
  private notificationCallbacks: Array<(alert: ErrorAlert) => void> = [];

  constructor(options: ErrorTrackerOptions = {}) {
    this.options = {
      enableTracking: true,
      enableAlerting: true,
      maxErrorReports: 1000,
      maxErrorGroups: 100,
      enableGrouping: true,
      enableAutoResolve: false,
      autoResolveThreshold: 7, // 7 days
      enableNotifications: false,
      notificationChannels: [],
      alertRules: [],
      ignoredErrors: [],
      samplingRate: 1.0,
      ...options,
    };

    this.sessionId = this.generateSessionId();
    this.initializeDefaultAlertRules();
    this.loadPersistedErrors();
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    // Add default alert rule for critical errors
    this.options.alertRules!.push({
      id: 'critical-errors',
      name: 'Critical Errors',
      enabled: true,
      condition: 'new_error',
      threshold: 1,
      timeWindow: 1,
      severity: 'critical',
      filters: {
        severities: ['critical'],
      },
      channels: [],
      cooldown: 5,
      lastTriggered: undefined,
    });

    // Add default alert rule for error spikes
    this.options.alertRules!.push({
      id: 'error-spike',
      name: 'Error Spike',
      enabled: true,
      condition: 'error_count',
      threshold: 10,
      timeWindow: 5,
      severity: 'high',
      filters: {},
      channels: [],
      cooldown: 15,
      lastTriggered: undefined,
    });
  }

  /**
   * Generate a session ID
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Generate an error ID
   */
  private generateErrorId(): string {
    return `error_${++this.errorIdCounter}_${Date.now()}`;
  }

  /**
   * Generate a group ID
   */
  private generateGroupId(): string {
    return `group_${++this.groupIdCounter}_${Date.now()}`;
  }

  /**
   * Generate an alert ID
   */
  private generateAlertId(): string {
    return `alert_${++this.alertIdCounter}_${Date.now()}`;
  }

  /**
   * Load persisted errors from storage
   */
  private loadPersistedErrors(): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem('error_tracker_data');
      if (stored) {
        const data = JSON.parse(stored);
        
        // Restore error reports
        if (data.errorReports) {
          for (const report of data.errorReports) {
            report.timestamp = new Date(report.timestamp);
            report.firstSeen = new Date(report.firstSeen);
            report.lastSeen = new Date(report.lastSeen);
            if (report.resolvedAt) {
              report.resolvedAt = new Date(report.resolvedAt);
            }
            this.errorReports.set(report.id, report);
          }
        }
        
        // Restore error groups
        if (data.errorGroups) {
          for (const group of data.errorGroups) {
            group.firstSeen = new Date(group.firstSeen);
            group.lastSeen = new Date(group.lastSeen);
            if (group.resolvedAt) {
              group.resolvedAt = new Date(group.resolvedAt);
            }
            this.errorGroups.set(group.id, group);
          }
        }
        
        // Restore alerts
        if (data.alerts) {
          for (const alert of data.alerts) {
            alert.timestamp = new Date(alert.timestamp);
            if (alert.acknowledgedAt) {
              alert.acknowledgedAt = new Date(alert.acknowledgedAt);
            }
            this.alerts.set(alert.id, alert);
          }
        }
      }
    } catch (error) {
      logger.error('Error loading persisted errors', error as Error);
    }
  }

  /**
   * Persist errors to storage
   */
  private persistErrors(): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const data = {
        errorReports: Array.from(this.errorReports.values()),
        errorGroups: Array.from(this.errorGroups.values()),
        alerts: Array.from(this.alerts.values()),
      };
      
      localStorage.setItem('error_tracker_data', JSON.stringify(data));
    } catch (error) {
      logger.error('Error persisting errors', error as Error);
    }
  }

  /**
   * Track an error
   */
  trackError(
    error: Error | string,
    context: ErrorContext = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): string {
    if (!this.options.enableTracking) {
      return '';
    }

    // Check sampling rate
    if (Math.random() > this.options.samplingRate!) {
      return '';
    }

    // Parse error
    let message: string;
    let stack: string | undefined;
    let type: string;

    if (typeof error === 'string') {
      message = error;
      type = 'Error';
    } else {
      message = error.message;
      stack = error.stack;
      type = error.name || 'Error';
    }

    // Check if error should be ignored
    if (this.options.ignoredErrors!.some(pattern => 
      message.includes(pattern) || type.includes(pattern)
    )) {
      return '';
    }

    // Create error report
    const errorId = this.generateErrorId();
    const now = new Date();
    
    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: now,
      message,
      stack,
      type,
      severity,
      context,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      userId: context.customData?.userId,
      sessionId: this.sessionId,
      occurrences: 1,
      firstSeen: now,
      lastSeen: now,
      resolved: false,
      tags: this.extractTags(error, context),
      metadata: {
        buildVersion: context.buildVersion || process.env.npm_package_version || 'unknown',
        ...context.customData,
      },
    };

    // Check if error should be grouped
    if (this.options.enableGrouping) {
      const signature = this.generateErrorSignature(errorReport);
      let group = this.findErrorGroup(signature);
      
      if (!group) {
        // Create new group
        group = this.createErrorGroup(errorReport, signature);
      } else {
        // Update existing group
        this.updateErrorGroup(group, errorReport);
      }
      
      // Link error to group
      errorReport.metadata.groupId = group.id;
    }

    // Store error report
    this.errorReports.set(errorId, errorReport);

    // Maintain error report limit
    if (this.errorReports.size > this.options.maxErrorReports!) {
      const oldestId = this.errorReports.keys().next().value;
      if (oldestId) {
        this.errorReports.delete(oldestId);
      }
    }

    // Check alert rules
    if (this.options.enableAlerting) {
      this.checkAlertRules(errorReport);
    }

    // Persist errors
    this.persistErrors();

    return errorId;
  }

  /**
   * Generate error signature for grouping
   */
  private generateErrorSignature(error: ErrorReport): string {
    // Create a signature based on error type, message, and stack trace
    let signature = `${error.type}:${error.message}`;
    
    if (error.stack) {
      // Extract the first few lines of the stack trace
      const stackLines = error.stack.split('\n').slice(0, 3);
      signature += ':' + stackLines.join(':');
    }
    
    // Include component and action if available
    if (error.context.component) {
      signature += `:${error.context.component}`;
    }
    
    if (error.context.action) {
      signature += `:${error.context.action}`;
    }
    
    // Create a hash of the signature
    return this.hashString(signature);
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Find error group by signature
   */
  private findErrorGroup(signature: string): ErrorGroup | undefined {
    for (const group of this.errorGroups.values()) {
      if (group.signature === signature && !group.resolved) {
        return group;
      }
    }
    return undefined;
  }

  /**
   * Create a new error group
   */
  private createErrorGroup(error: ErrorReport, signature: string): ErrorGroup {
    const groupId = this.generateGroupId();
    
    const group: ErrorGroup = {
      id: groupId,
      signature,
      title: this.generateGroupTitle(error),
      type: error.type,
      severity: error.severity,
      totalOccurrences: 1,
      uniqueUsers: error.userId ? 1 : 0,
      firstSeen: error.timestamp,
      lastSeen: error.timestamp,
      affectedVersions: [error.metadata.buildVersion],
      affectedComponents: error.context.component ? [error.context.component] : [],
      resolved: false,
      tags: error.tags,
      metadata: {
        ...error.metadata,
      },
    };
    
    this.errorGroups.set(groupId, group);
    
    // Maintain group limit
    if (this.errorGroups.size > this.options.maxErrorGroups!) {
      const oldestId = this.errorGroups.keys().next().value;
      if (oldestId) {
        this.errorGroups.delete(oldestId);
      }
    }
    
    return group;
  }

  /**
   * Generate a group title
   */
  private generateGroupTitle(error: ErrorReport): string {
    let title = `${error.type}: ${error.message}`;
    
    // Truncate if too long
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }
    
    return title;
  }

  /**
   * Update an existing error group
   */
  private updateErrorGroup(group: ErrorGroup, error: ErrorReport): void {
    group.totalOccurrences += 1;
    group.lastSeen = error.timestamp;
    
    // Update severity if this error is more severe
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    if (severityLevels[error.severity] > severityLevels[group.severity]) {
      group.severity = error.severity;
    }
    
    // Update unique users
    if (error.userId && !group.metadata.uniqueUserIds) {
      group.metadata.uniqueUserIds = new Set();
    }
    
    if (error.userId && !group.metadata.uniqueUserIds.has(error.userId)) {
      group.metadata.uniqueUserIds.add(error.userId);
      group.uniqueUsers += 1;
    }
    
    // Update affected versions
    if (!group.affectedVersions.includes(error.metadata.buildVersion)) {
      group.affectedVersions.push(error.metadata.buildVersion);
    }
    
    // Update affected components
    if (error.context.component && !group.affectedComponents.includes(error.context.component)) {
      group.affectedComponents.push(error.context.component);
    }
  }

  /**
   * Extract tags from error
   */
  private extractTags(error: Error | string, context: ErrorContext): string[] {
    const tags: string[] = [];
    
    // Add component tag
    if (context.component) {
      tags.push(`component:${context.component}`);
    }
    
    // Add action tag
    if (context.action) {
      tags.push(`action:${context.action}`);
    }
    
    // Add route tag
    if (context.route) {
      tags.push(`route:${context.route}`);
    }
    
    // Add status code tag
    if (context.statusCode) {
      tags.push(`status:${context.statusCode}`);
    }
    
    // Add build version tag
    if (context.buildVersion) {
      tags.push(`version:${context.buildVersion}`);
    }
    
    return tags;
  }

  /**
   * Check alert rules
   */
  private checkAlertRules(error: ErrorReport): void {
    for (const rule of this.options.alertRules!) {
      if (!rule.enabled) continue;
      
      // Check cooldown
      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldown * 60 * 1000;
        if (Date.now() - rule.lastTriggered.getTime() < cooldownMs) {
          continue;
        }
      }
      
      // Check filters
      if (!this.matchesAlertFilters(error, rule.filters)) {
        continue;
      }
      
      // Check condition
      if (this.evaluateAlertCondition(error, rule)) {
        this.triggerAlert(rule, error);
        rule.lastTriggered = new Date();
      }
    }
  }

  /**
   * Check if error matches alert filters
   */
  private matchesAlertFilters(error: ErrorReport, filters: any): boolean {
    // Check severity filter
    if (filters.severities && !filters.severities.includes(error.severity)) {
      return false;
    }
    
    // Check type filter
    if (filters.types && !filters.types.includes(error.type)) {
      return false;
    }
    
    // Check component filter
    if (filters.components && error.context.component && 
        !filters.components.includes(error.context.component)) {
      return false;
    }
    
    return true;
  }

  /**
   * Evaluate alert condition
   */
  private evaluateAlertCondition(error: ErrorReport, rule: AlertRule): boolean {
    switch (rule.condition) {
      case 'new_error':
        return true; // Always trigger for new errors
        
      case 'error_count':
        // Count errors in time window
        const timeWindowMs = rule.timeWindow * 60 * 1000;
        const timeWindowStart = new Date(Date.now() - timeWindowMs);
        
        let count = 0;
        for (const report of this.errorReports.values()) {
          if (report.timestamp >= timeWindowStart) {
            count += 1;
          }
        }
        
        return count >= rule.threshold;
        
      case 'error_rate':
        // Calculate error rate in time window
        const rateTimeWindowMs = rule.timeWindow * 60 * 1000;
        const rateTimeWindowStart = new Date(Date.now() - rateTimeWindowMs);
        
        let errorCount = 0;
        let totalRequests = 0; // This would need to be tracked separately
        
        for (const report of this.errorReports.values()) {
          if (report.timestamp >= rateTimeWindowStart) {
            errorCount += 1;
          }
        }
        
        // For now, use a simple threshold based on error count
        return errorCount >= rule.threshold;
        
      case 'regression':
        // Check if this error was previously resolved
        const groupId = error.metadata.groupId;
        if (groupId) {
          const group = this.errorGroups.get(groupId);
          return group ? group.resolved : false;
        }
        return false;
        
      default:
        return false;
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(rule: AlertRule, error: ErrorReport): void {
    const alertId = this.generateAlertId();
    
    const alert: ErrorAlert = {
      id: alertId,
      groupId: error.metadata.groupId || '',
      type: this.getAlertType(rule.condition),
      severity: rule.severity,
      message: this.generateAlertMessage(rule, error),
      timestamp: new Date(),
      acknowledged: false,
      metadata: {
        ruleId: rule.id,
        ruleName: rule.name,
        errorId: error.id,
        ...error.metadata,
      },
    };
    
    this.alerts.set(alertId, alert);
    
    // Send notifications
    if (this.options.enableNotifications) {
      this.sendNotifications(alert, rule.channels);
    }
    
    // Notify callbacks
    this.notifyCallbacks(alert);
  }

  /**
   * Get alert type from condition
   */
  private getAlertType(condition: string): ErrorAlert['type'] {
    switch (condition) {
      case 'new_error':
        return 'new_error';
      case 'regression':
        return 'regression';
      case 'error_count':
      case 'error_rate':
        return 'spike';
      default:
        return 'new_error';
    }
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule, error: ErrorReport): string {
    switch (rule.condition) {
      case 'new_error':
        return `New ${error.severity} error: ${error.type}: ${error.message}`;
      case 'regression':
        return `Error regression: ${error.type}: ${error.message}`;
      case 'error_count':
        return `Error spike: ${rule.threshold} errors in ${rule.timeWindow} minutes`;
      case 'error_rate':
        return `High error rate: ${rule.threshold} errors in ${rule.timeWindow} minutes`;
      default:
        return `Alert: ${rule.name}`;
    }
  }

  /**
   * Send notifications
   */
  private sendNotifications(alert: ErrorAlert, channelIds: string[]): void {
    for (const channelId of channelIds) {
      const channel = this.options.notificationChannels!.find(c => c.id === channelId);
      if (!channel || !channel.enabled) continue;
      
      // Check if alert matches channel filters
      if (!this.matchesChannelFilters(alert, channel.filters)) {
        continue;
      }
      
      // Send notification based on channel type
      switch (channel.type) {
        case 'console':
          logger.error('[ALERT] ${alert.message}', alert as Error);
          break;
        case 'webhook':
          this.sendWebhookNotification(alert, channel.config);
          break;
        case 'email':
          // This would require an email service implementation
          logger.info('Email notification would be sent: ${alert.message}');
          break;
        case 'slack':
          // This would require a Slack webhook implementation
          logger.info('Slack notification would be sent: ${alert.message}');
          break;
      }
    }
  }

  /**
   * Check if alert matches channel filters
   */
  private matchesChannelFilters(alert: ErrorAlert, filters: any): boolean {
    // Get the error report for this alert
    const errorId = alert.metadata.errorId;
    const error = errorId ? this.errorReports.get(errorId) : undefined;
    
    if (!error) return true;
    
    // Check severity filter
    if (filters.severity && !filters.severity.includes(alert.severity)) {
      return false;
    }
    
    // Check type filter
    if (filters.types && !filters.types.includes(error.type)) {
      return false;
    }
    
    // Check component filter
    if (filters.components && error.context.component && 
        !filters.components.includes(error.context.component)) {
      return false;
    }
    
    return true;
  }

  /**
   * Send webhook notification
   */
  private sendWebhookNotification(alert: ErrorAlert, config: Record<string, any>): void {
    const url = config.url;
    if (!url) return;
    
    const payload = {
      alert,
      timestamp: new Date().toISOString(),
    };
    
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: JSON.stringify(payload),
    }).catch(error => {
      logger.error('Error sending webhook notification', error as Error);
    });
  }

  /**
   * Notify callbacks
   */
  private notifyCallbacks(alert: ErrorAlert): void {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        logger.error('Error in alert notification callback', error as Error);
      }
    });
  }

  /**
   * Get error reports
   */
  getErrorReports(filter?: {
    severity?: ('low' | 'medium' | 'high' | 'critical')[];
    type?: string;
    resolved?: boolean;
    userId?: string;
    groupId?: string;
    startTime?: Date;
    endTime?: Date;
    tags?: string[];
  }): ErrorReport[] {
    let reports = Array.from(this.errorReports.values());
    
    // Apply filters
    if (filter?.severity) {
      reports = reports.filter(report => filter.severity!.includes(report.severity));
    }
    
    if (filter?.type) {
      reports = reports.filter(report => report.type === filter.type);
    }
    
    if (filter?.resolved !== undefined) {
      reports = reports.filter(report => report.resolved === filter.resolved);
    }
    
    if (filter?.userId) {
      reports = reports.filter(report => report.userId === filter.userId);
    }
    
    if (filter?.groupId) {
      reports = reports.filter(report => report.metadata.groupId === filter.groupId);
    }
    
    if (filter?.startTime) {
      reports = reports.filter(report => report.timestamp >= filter.startTime!);
    }
    
    if (filter?.endTime) {
      reports = reports.filter(report => report.timestamp <= filter.endTime!);
    }
    
    if (filter?.tags && filter.tags.length > 0) {
      reports = reports.filter(report => 
        filter.tags!.some(tag => report.tags.includes(tag))
      );
    }
    
    // Sort by timestamp (newest first)
    reports.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return reports;
  }

  /**
   * Get error groups
   */
  getErrorGroups(filter?: {
    severity?: ('low' | 'medium' | 'high' | 'critical')[];
    type?: string;
    resolved?: boolean;
    assignee?: string;
    startTime?: Date;
    endTime?: Date;
    tags?: string[];
  }): ErrorGroup[] {
    let groups = Array.from(this.errorGroups.values());
    
    // Apply filters
    if (filter?.severity) {
      groups = groups.filter(group => filter.severity!.includes(group.severity));
    }
    
    if (filter?.type) {
      groups = groups.filter(group => group.type === filter.type);
    }
    
    if (filter?.resolved !== undefined) {
      groups = groups.filter(group => group.resolved === filter.resolved);
    }
    
    if (filter?.assignee) {
      groups = groups.filter(group => group.assignee === filter.assignee);
    }
    
    if (filter?.startTime) {
      groups = groups.filter(group => group.firstSeen >= filter.startTime!);
    }
    
    if (filter?.endTime) {
      groups = groups.filter(group => group.lastSeen <= filter.endTime!);
    }
    
    if (filter?.tags && filter.tags.length > 0) {
      groups = groups.filter(group => 
        filter.tags!.some(tag => group.tags.includes(tag))
      );
    }
    
    // Sort by last seen (newest first)
    groups.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
    
    return groups;
  }

  /**
   * Get alerts
   */
  getAlerts(filter?: {
    type?: ErrorAlert['type'];
    severity?: ('low' | 'medium' | 'high' | 'critical')[];
    acknowledged?: boolean;
    startTime?: Date;
    endTime?: Date;
  }): ErrorAlert[] {
    let alerts = Array.from(this.alerts.values());
    
    // Apply filters
    if (filter?.type) {
      alerts = alerts.filter(alert => alert.type === filter.type);
    }
    
    if (filter?.severity) {
      alerts = alerts.filter(alert => filter.severity!.includes(alert.severity));
    }
    
    if (filter?.acknowledged !== undefined) {
      alerts = alerts.filter(alert => alert.acknowledged === filter.acknowledged);
    }
    
    if (filter?.startTime) {
      alerts = alerts.filter(alert => alert.timestamp >= filter.startTime!);
    }
    
    if (filter?.endTime) {
      alerts = alerts.filter(alert => alert.timestamp <= filter.endTime!);
    }
    
    // Sort by timestamp (newest first)
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return alerts;
  }

  /**
   * Resolve an error group
   */
  resolveErrorGroup(groupId: string, resolvedBy?: string): boolean {
    const group = this.errorGroups.get(groupId);
    if (!group) return false;
    
    group.resolved = true;
    group.resolvedAt = new Date();
    group.resolvedBy = resolvedBy;
    
    // Resolve all errors in this group
    for (const report of this.errorReports.values()) {
      if (report.metadata.groupId === groupId) {
        report.resolved = true;
        report.resolvedAt = group.resolvedAt;
        report.resolvedBy = resolvedBy;
      }
    }
    
    // Persist changes
    this.persistErrors();
    
    return true;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;
    
    // Persist changes
    this.persistErrors();
    
    return true;
  }

  /**
   * Assign an error group
   */
  assignErrorGroup(groupId: string, assignee: string): boolean {
    const group = this.errorGroups.get(groupId);
    if (!group) return false;
    
    group.assignee = assignee;
    
    // Persist changes
    this.persistErrors();
    
    return true;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    totalGroups: number;
    totalAlerts: number;
    errorsBySeverity: Record<string, number>;
    errorsByType: Record<string, number>;
    errorsByComponent: Record<string, number>;
    resolvedGroups: number;
    unacknowledgedAlerts: number;
    topErrors: Array<{ groupId: string; title: string; count: number; }>;
  } {
    const stats = {
      totalErrors: this.errorReports.size,
      totalGroups: this.errorGroups.size,
      totalAlerts: this.alerts.size,
      errorsBySeverity: {} as Record<string, number>,
      errorsByType: {} as Record<string, number>,
      errorsByComponent: {} as Record<string, number>,
      resolvedGroups: 0,
      unacknowledgedAlerts: 0,
      topErrors: [] as Array<{ groupId: string; title: string; count: number; }>,
    };
    
    // Count errors by severity
    for (const report of this.errorReports.values()) {
      stats.errorsBySeverity[report.severity] = (stats.errorsBySeverity[report.severity] || 0) + 1;
      stats.errorsByType[report.type] = (stats.errorsByType[report.type] || 0) + 1;
      
      if (report.context.component) {
        stats.errorsByComponent[report.context.component] = 
          (stats.errorsByComponent[report.context.component] || 0) + 1;
      }
    }
    
    // Count resolved groups
    for (const group of this.errorGroups.values()) {
      if (group.resolved) {
        stats.resolvedGroups += 1;
      }
    }
    
    // Count unacknowledged alerts
    for (const alert of this.alerts.values()) {
      if (!alert.acknowledged) {
        stats.unacknowledgedAlerts += 1;
      }
    }
    
    // Get top errors
    const groupsArray = Array.from(this.errorGroups.values());
    groupsArray.sort((a, b) => b.totalOccurrences - a.totalOccurrences);
    stats.topErrors = groupsArray.slice(0, 10).map(group => ({
      groupId: group.id,
      title: group.title,
      count: group.totalOccurrences,
    }));
    
    return stats;
  }

  /**
   * Register notification callback
   */
  onNotification(callback: (alert: ErrorAlert) => void): void {
    this.notificationCallbacks.push(callback);
  }

  /**
   * Unregister notification callback
   */
  offNotification(callback: (alert: ErrorAlert) => void): void {
    const index = this.notificationCallbacks.indexOf(callback);
    if (index !== -1) {
      this.notificationCallbacks.splice(index, 1);
    }
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<ErrorTrackerOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current options
   */
  getOptions(): ErrorTrackerOptions {
    return { ...this.options };
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errorReports.clear();
    this.errorGroups.clear();
    this.alerts.clear();
    this.persistErrors();
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.persistErrors();
    this.notificationCallbacks = [];
  }
}

// Singleton instance with default options
export const errorTracker = new ErrorTracker({
  enableTracking: true,
  enableAlerting: true,
  maxErrorReports: 1000,
  maxErrorGroups: 100,
  enableGrouping: true,
  enableAutoResolve: false,
  autoResolveThreshold: 7,
  enableNotifications: false,
  notificationChannels: [],
  alertRules: [],
  ignoredErrors: [],
  samplingRate: 1.0,
});

// Export a factory function for easier usage
export function createErrorTracker(options?: ErrorTrackerOptions): ErrorTracker {
  return new ErrorTracker(options);
}

// React hook for error tracking
export function useErrorTracker() {
  return {
    trackError: errorTracker.trackError.bind(errorTracker),
    getErrorReports: errorTracker.getErrorReports.bind(errorTracker),
    getErrorGroups: errorTracker.getErrorGroups.bind(errorTracker),
    getAlerts: errorTracker.getAlerts.bind(errorTracker),
    resolveErrorGroup: errorTracker.resolveErrorGroup.bind(errorTracker),
    acknowledgeAlert: errorTracker.acknowledgeAlert.bind(errorTracker),
    assignErrorGroup: errorTracker.assignErrorGroup.bind(errorTracker),
    getErrorStats: errorTracker.getErrorStats.bind(errorTracker),
    onNotification: errorTracker.onNotification.bind(errorTracker),
    offNotification: errorTracker.offNotification.bind(errorTracker),
    updateOptions: errorTracker.updateOptions.bind(errorTracker),
    getOptions: errorTracker.getOptions.bind(errorTracker),
    clearErrors: errorTracker.clearErrors.bind(errorTracker),
  };
}