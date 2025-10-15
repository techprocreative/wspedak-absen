import { logger, logApiError, logApiRequest } from '@/lib/logger'

/**
 * Security Monitoring and Event Logging System
 * Provides comprehensive security monitoring and event tracking
 * Optimized for DS223J hardware constraints
 */

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  userId?: string;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  tags: string[];
}

export type SecurityEventType = 
  | 'authentication_success'
  | 'authentication_failure'
  | 'authorization_failure'
  | 'privilege_escalation'
  | 'data_access'
  | 'data_modification'
  | 'data_deletion'
  | 'data_export'
  | 'suspicious_activity'
  | 'security_policy_violation'
  | 'malware_detected'
  | 'intrusion_attempt'
  | 'configuration_change'
  | 'system_access'
  | 'api_access'
  | 'session_management'
  | 'password_change'
  | 'account_locked'
  | 'account_unlocked'
  | 'custom';

export interface SecurityRule {
  id: string;
  name: string;
  enabled: boolean;
  description: string;
  eventType: SecurityEventType | SecurityEventType[];
  conditions: SecurityRuleCondition[];
  actions: SecurityRuleAction[];
  cooldown: number; // minutes
  lastTriggered?: Date;
}

export interface SecurityRuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between';
  value: any;
  caseSensitive?: boolean;
}

export interface SecurityRuleAction {
  type: 'alert' | 'block' | 'log' | 'notify' | 'custom';
  config: Record<string, any>;
}

export interface SecurityThreat {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  events: string[]; // Event IDs
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  resolvedAt?: Date;
  resolvedBy?: string;
  mitigation: string;
  metadata: Record<string, any>;
}

export interface SecurityMonitorOptions {
  enableMonitoring?: boolean;
  enableEventLogging?: boolean;
  enableThreatDetection?: boolean;
  maxEvents?: number;
  maxThreats?: number;
  enablePersistence?: boolean;
  persistenceKey?: string;
  enableRealTimeAlerts?: boolean;
  alertThreshold?: number;
  enableAnomalyDetection?: boolean;
  anomalyThreshold?: number;
  ignoredIPs?: string[];
  ignoredUsers?: string[];
}

export class SecurityMonitor {
  private options: SecurityMonitorOptions;
  private events: Map<string, SecurityEvent> = new Map();
  private threats: Map<string, SecurityThreat> = new Map();
  private rules: Map<string, SecurityRule> = new Map();
  private sessionId: string;
  private eventIdCounter = 0;
  private threatIdCounter = 0;
  private ruleIdCounter = 0;
  private alertCallbacks: Array<(event: SecurityEvent) => void> = [];
  private threatCallbacks: Array<(threat: SecurityThreat) => void> = [];
  private eventCounts: Map<string, number> = new Map();
  private eventCountsResetTime: Date;

  constructor(options: SecurityMonitorOptions = {}) {
    this.options = {
      enableMonitoring: true,
      enableEventLogging: true,
      enableThreatDetection: true,
      maxEvents: 1000,
      maxThreats: 100,
      enablePersistence: true,
      persistenceKey: 'security_monitor_data',
      enableRealTimeAlerts: true,
      alertThreshold: 5,
      enableAnomalyDetection: true,
      anomalyThreshold: 3,
      ignoredIPs: [],
      ignoredUsers: [],
      ...options,
    };

    this.sessionId = this.generateSessionId();
    this.eventCountsResetTime = new Date();
    this.eventCountsResetTime.setHours(this.eventCountsResetTime.getHours() + 1); // Reset every hour

    this.initializeDefaultRules();
    this.loadPersistedData();
  }

  /**
   * Initialize default security rules
   */
  private initializeDefaultRules(): void {
    // Rule for multiple authentication failures
    this.addRule({
      name: 'Multiple Authentication Failures',
      enabled: true,
      description: 'Detects multiple authentication failures from the same IP',
      eventType: 'authentication_failure',
      conditions: [
        {
          field: 'ipAddress',
          operator: 'equals',
          value: '', // Will be set dynamically
        },
      ],
      actions: [
        {
          type: 'alert',
          config: { severity: 'high' },
        },
      ],
      cooldown: 15,
    });

    // Rule for suspicious activity
    this.addRule({
      name: 'Suspicious Activity Detected',
      enabled: true,
      description: 'Detects suspicious activity patterns',
      eventType: 'suspicious_activity',
      conditions: [],
      actions: [
        {
          type: 'alert',
          config: { severity: 'medium' },
        },
      ],
      cooldown: 10,
    });

    // Rule for privilege escalation
    this.addRule({
      name: 'Privilege Escalation Attempt',
      enabled: true,
      description: 'Detects privilege escalation attempts',
      eventType: 'privilege_escalation',
      conditions: [],
      actions: [
        {
          type: 'alert',
          config: { severity: 'critical' },
        },
      ],
      cooldown: 5,
    });
  }

  /**
   * Generate a session ID
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Generate an event ID
   */
  private generateEventId(): string {
    return `event_${++this.eventIdCounter}_${Date.now()}`;
  }

  /**
   * Generate a threat ID
   */
  private generateThreatId(): string {
    return `threat_${++this.threatIdCounter}_${Date.now()}`;
  }

  /**
   * Generate a rule ID
   */
  private generateRuleId(): string {
    return `rule_${++this.ruleIdCounter}_${Date.now()}`;
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
        
        // Restore events
        if (data.events) {
          for (const event of data.events) {
            event.timestamp = new Date(event.timestamp);
            if (event.resolvedAt) {
              event.resolvedAt = new Date(event.resolvedAt);
            }
            this.events.set(event.id, event);
          }
        }
        
        // Restore threats
        if (data.threats) {
          for (const threat of data.threats) {
            threat.detectedAt = new Date(threat.detectedAt);
            if (threat.resolvedAt) {
              threat.resolvedAt = new Date(threat.resolvedAt);
            }
            this.threats.set(threat.id, threat);
          }
        }
        
        // Restore rules
        if (data.rules) {
          for (const rule of data.rules) {
            if (rule.lastTriggered) {
              rule.lastTriggered = new Date(rule.lastTriggered);
            }
            this.rules.set(rule.id, rule);
          }
        }
      }
    } catch (error) {
      logger.error('Error loading persisted security data', error as Error);
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
        events: Array.from(this.events.values()),
        threats: Array.from(this.threats.values()),
        rules: Array.from(this.rules.values()),
      };
      
      localStorage.setItem(this.options.persistenceKey!, JSON.stringify(data));
    } catch (error) {
      logger.error('Error persisting security data', error as Error);
    }
  }

  /**
   * Log a security event
   */
  logEvent(
    type: SecurityEventType,
    title: string,
    description: string,
    metadata: Record<string, any> = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): string {
    if (!this.options.enableEventLogging) {
      return '';
    }

    // Create security event
    const eventId = this.generateEventId();
    const now = new Date();
    
    const event: SecurityEvent = {
      id: eventId,
      timestamp: now,
      type,
      severity,
      title,
      description,
      source: metadata.source || 'application',
      userId: metadata.userId,
      sessionId: this.sessionId,
      ipAddress: metadata.ipAddress || this.getClientIP(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
      metadata,
      resolved: false,
      tags: this.extractEventTags(type, metadata),
    };

    // Store event
    this.events.set(eventId, event);

    // Maintain event limit
    if (this.events.size > this.options.maxEvents!) {
      const oldestId = this.events.keys().next().value;
      if (oldestId) {
        this.events.delete(oldestId);
      }
    }

    // Update event counts
    this.updateEventCounts(type);

    // Check security rules
    this.checkSecurityRules(event);

    // Check for anomalies
    if (this.options.enableAnomalyDetection) {
      this.checkForAnomalies(event);
    }

    // Send real-time alerts
    if (this.options.enableRealTimeAlerts) {
      this.sendRealTimeAlerts(event);
    }

    // Persist data
    this.persistData();

    return eventId;
  }

  /**
   * Get client IP address
   */
  private getClientIP(): string {
    // This is a placeholder implementation
    // In a real application, you would get the IP from the request headers
    return 'unknown';
  }

  /**
   * Update event counts
   */
  private updateEventCounts(type: SecurityEventType): void {
    const now = new Date();
    
    // Reset counts if it's time
    if (now > this.eventCountsResetTime) {
      this.eventCounts.clear();
      this.eventCountsResetTime = new Date();
      this.eventCountsResetTime.setHours(this.eventCountsResetTime.getHours() + 1);
    }
    
    // Increment count
    const count = this.eventCounts.get(type) || 0;
    this.eventCounts.set(type, count + 1);
  }

  /**
   * Check security rules
   */
  private checkSecurityRules(event: SecurityEvent): void {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      
      // Check cooldown
      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldown * 60 * 1000;
        if (Date.now() - rule.lastTriggered.getTime() < cooldownMs) {
          continue;
        }
      }
      
      // Check event type
      const eventTypes = Array.isArray(rule.eventType) ? rule.eventType : [rule.eventType];
      if (!eventTypes.includes(event.type)) {
        continue;
      }
      
      // Check conditions
      if (this.evaluateRuleConditions(event, rule.conditions)) {
        this.triggerRuleActions(rule, event);
        rule.lastTriggered = new Date();
      }
    }
  }

  /**
   * Evaluate rule conditions
   */
  private evaluateRuleConditions(event: SecurityEvent, conditions: SecurityRuleCondition[]): boolean {
    for (const condition of conditions) {
      if (!this.evaluateCondition(event, condition)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(event: SecurityEvent, condition: SecurityRuleCondition): boolean {
    let fieldValue: any;
    
    // Get field value
    switch (condition.field) {
      case 'ipAddress':
        fieldValue = event.ipAddress;
        break;
      case 'userId':
        fieldValue = event.userId;
        break;
      case 'userAgent':
        fieldValue = event.userAgent;
        break;
      case 'severity':
        fieldValue = event.severity;
        break;
      default:
        fieldValue = event.metadata[condition.field];
    }
    
    // Evaluate condition
    return this.compareValues(fieldValue, condition.value, condition.operator, condition.caseSensitive);
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
   * Trigger rule actions
   */
  private triggerRuleActions(rule: SecurityRule, event: SecurityEvent): void {
    for (const action of rule.actions) {
      switch (action.type) {
        case 'alert':
          this.createSecurityAlert(rule, event, action.config);
          break;
        case 'block':
          this.blockAction(rule, event, action.config);
          break;
        case 'log':
          logger.warn('Rule "${rule.name}" triggered:', event);
          break;
        case 'notify':
          this.sendNotification(rule, event, action.config);
          break;
        case 'custom':
          this.executeCustomAction(rule, event, action.config);
          break;
      }
    }
  }

  /**
   * Create a security alert
   */
  private createSecurityAlert(rule: SecurityRule, event: SecurityEvent, config: Record<string, any>): void {
    const severity = config.severity || event.severity;
    
    // Create a threat if severity is high or critical
    if (severity === 'high' || severity === 'critical') {
      this.createThreat(event, rule);
    }
    
    // Send alert
    this.sendAlert(event, severity);
  }

  /**
   * Create a security threat
   */
  private createThreat(event: SecurityEvent, rule?: SecurityRule): void {
    const threatId = this.generateThreatId();
    
    const threat: SecurityThreat = {
      id: threatId,
      type: event.type,
      severity: event.severity,
      description: `Security threat detected: ${event.title}`,
      detectedAt: event.timestamp,
      events: [event.id],
      status: 'active',
      mitigation: rule ? `Rule "${rule.name}" triggered` : 'Manual investigation required',
      metadata: {
        ruleId: rule?.id,
        ...event.metadata,
      },
    };
    
    this.threats.set(threatId, threat);
    
    // Maintain threat limit
    if (this.threats.size > this.options.maxThreats!) {
      const oldestId = this.threats.keys().next().value;
      if (oldestId) {
        this.threats.delete(oldestId);
      }
    }
    
    // Notify callbacks
    this.notifyThreatCallbacks(threat);
  }

  /**
   * Block action
   */
  private blockAction(rule: SecurityRule, event: SecurityEvent, config: Record<string, any>): void {
    // This is a placeholder implementation
    // In a real application, you would implement actual blocking logic
    logger.warn('Blocking action triggered by rule "${rule.name}":', event);
  }

  /**
   * Send notification
   */
  private sendNotification(rule: SecurityRule, event: SecurityEvent, config: Record<string, any>): void {
    // This is a placeholder implementation
    // In a real application, you would implement actual notification logic
    logger.warn('Notification sent for rule "${rule.name}":', event);
  }

  /**
   * Execute custom action
   */
  private executeCustomAction(rule: SecurityRule, event: SecurityEvent, config: Record<string, any>): void {
    // This is a placeholder implementation
    // In a real application, you would implement custom action logic
    logger.warn('Custom action executed for rule "${rule.name}":', event);
  }

  /**
   * Check for anomalies
   */
  private checkForAnomalies(event: SecurityEvent): void {
    // Check for unusual patterns
    const count = this.eventCounts.get(event.type) || 0;
    
    if (count > this.options.anomalyThreshold!) {
      this.createThreat(event, undefined);
    }
  }

  /**
   * Send real-time alerts
   */
  private sendRealTimeAlerts(event: SecurityEvent): void {
    // Send alert if severity is high or critical
    if (event.severity === 'high' || event.severity === 'critical') {
      this.sendAlert(event, event.severity);
    }
  }

  /**
   * Send alert
   */
  private sendAlert(event: SecurityEvent, severity: string): void {
    // Notify callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error('Error in security alert callback', error as Error);
      }
    });
  }

  /**
   * Notify threat callbacks
   */
  private notifyThreatCallbacks(threat: SecurityThreat): void {
    this.threatCallbacks.forEach(callback => {
      try {
        callback(threat);
      } catch (error) {
        logger.error('Error in security threat callback', error as Error);
      }
    });
  }

  /**
   * Extract event tags
   */
  private extractEventTags(type: SecurityEventType, metadata: Record<string, any>): string[] {
    const tags: string[] = [type];
    
    // Add source tag
    if (metadata.source) {
      tags.push(`source:${metadata.source}`);
    }
    
    // Add user tag
    if (metadata.userId) {
      tags.push(`user:${metadata.userId}`);
    }
    
    // Add IP tag
    if (metadata.ipAddress) {
      tags.push(`ip:${metadata.ipAddress}`);
    }
    
    return tags;
  }

  /**
   * Add a security rule
   */
  addRule(rule: Omit<SecurityRule, 'id'>): string {
    const ruleId = this.generateRuleId();
    
    const newRule: SecurityRule = {
      id: ruleId,
      ...rule,
    };
    
    this.rules.set(ruleId, newRule);
    this.persistData();
    
    return ruleId;
  }

  /**
   * Remove a security rule
   */
  removeRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      this.persistData();
    }
    return deleted;
  }

  /**
   * Update a security rule
   */
  updateRule(ruleId: string, updates: Partial<SecurityRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return false;
    }
    
    const updatedRule = { ...rule, ...updates };
    this.rules.set(ruleId, updatedRule);
    this.persistData();
    
    return true;
  }

  /**
   * Get security events
   */
  getEvents(filter?: {
    type?: SecurityEventType | SecurityEventType[];
    severity?: ('low' | 'medium' | 'high' | 'critical')[];
    userId?: string;
    resolved?: boolean;
    startTime?: Date;
    endTime?: Date;
    tags?: string[];
  }): SecurityEvent[] {
    let events = Array.from(this.events.values());
    
    // Apply filters
    if (filter?.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      events = events.filter(event => types.includes(event.type));
    }
    
    if (filter?.severity) {
      events = events.filter(event => filter.severity!.includes(event.severity));
    }
    
    if (filter?.userId) {
      events = events.filter(event => event.userId === filter.userId);
    }
    
    if (filter?.resolved !== undefined) {
      events = events.filter(event => event.resolved === filter.resolved);
    }
    
    if (filter?.startTime) {
      events = events.filter(event => event.timestamp >= filter.startTime!);
    }
    
    if (filter?.endTime) {
      events = events.filter(event => event.timestamp <= filter.endTime!);
    }
    
    if (filter?.tags && filter.tags.length > 0) {
      events = events.filter(event => 
        filter.tags!.some(tag => event.tags.includes(tag))
      );
    }
    
    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return events;
  }

  /**
   * Get security threats
   */
  getThreats(filter?: {
    type?: string;
    severity?: ('low' | 'medium' | 'high' | 'critical')[];
    status?: SecurityThreat['status'];
    startTime?: Date;
    endTime?: Date;
  }): SecurityThreat[] {
    let threats = Array.from(this.threats.values());
    
    // Apply filters
    if (filter?.type) {
      threats = threats.filter(threat => threat.type === filter.type);
    }
    
    if (filter?.severity) {
      threats = threats.filter(threat => filter.severity!.includes(threat.severity));
    }
    
    if (filter?.status) {
      threats = threats.filter(threat => threat.status === filter.status);
    }
    
    if (filter?.startTime) {
      threats = threats.filter(threat => threat.detectedAt >= filter.startTime!);
    }
    
    if (filter?.endTime) {
      threats = threats.filter(threat => threat.detectedAt <= filter.endTime!);
    }
    
    // Sort by detection time (newest first)
    threats.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
    
    return threats;
  }

  /**
   * Get security rules
   */
  getRules(): SecurityRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Resolve a security event
   */
  resolveEvent(eventId: string, resolvedBy?: string): boolean {
    const event = this.events.get(eventId);
    if (!event) {
      return false;
    }
    
    event.resolved = true;
    event.resolvedAt = new Date();
    event.resolvedBy = resolvedBy;
    
    this.persistData();
    
    return true;
  }

  /**
   * Resolve a security threat
   */
  resolveThreat(threatId: string, resolvedBy?: string, status: SecurityThreat['status'] = 'resolved'): boolean {
    const threat = this.threats.get(threatId);
    if (!threat) {
      return false;
    }
    
    threat.status = status;
    threat.resolvedAt = new Date();
    threat.resolvedBy = resolvedBy;
    
    this.persistData();
    
    return true;
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    totalEvents: number;
    totalThreats: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    threatsByType: Record<string, number>;
    threatsByStatus: Record<string, number>;
    activeThreats: number;
    resolvedEvents: number;
    topEventTypes: Array<{ type: string; count: number; }>;
  } {
    const stats = {
      totalEvents: this.events.size,
      totalThreats: this.threats.size,
      eventsByType: {} as Record<string, number>,
      eventsBySeverity: {} as Record<string, number>,
      threatsByType: {} as Record<string, number>,
      threatsByStatus: {} as Record<string, number>,
      activeThreats: 0,
      resolvedEvents: 0,
      topEventTypes: [] as Array<{ type: string; count: number; }>,
    };
    
    // Count events by type and severity
    for (const event of this.events.values()) {
      stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
      stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;
      
      if (event.resolved) {
        stats.resolvedEvents += 1;
      }
    }
    
    // Count threats by type and status
    for (const threat of this.threats.values()) {
      stats.threatsByType[threat.type] = (stats.threatsByType[threat.type] || 0) + 1;
      stats.threatsByStatus[threat.status] = (stats.threatsByStatus[threat.status] || 0) + 1;
      
      if (threat.status === 'active') {
        stats.activeThreats += 1;
      }
    }
    
    // Get top event types
    const eventTypesArray = Object.entries(stats.eventsByType);
    eventTypesArray.sort((a, b) => b[1] - a[1]);
    stats.topEventTypes = eventTypesArray.slice(0, 10).map(([type, count]) => ({ type, count }));
    
    return stats;
  }

  /**
   * Register alert callback
   */
  onAlert(callback: (event: SecurityEvent) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Unregister alert callback
   */
  offAlert(callback: (event: SecurityEvent) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index !== -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  /**
   * Register threat callback
   */
  onThreat(callback: (threat: SecurityThreat) => void): void {
    this.threatCallbacks.push(callback);
  }

  /**
   * Unregister threat callback
   */
  offThreat(callback: (threat: SecurityThreat) => void): void {
    const index = this.threatCallbacks.indexOf(callback);
    if (index !== -1) {
      this.threatCallbacks.splice(index, 1);
    }
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<SecurityMonitorOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current options
   */
  getOptions(): SecurityMonitorOptions {
    return { ...this.options };
  }

  /**
   * Clear all events and threats
   */
  clearData(): void {
    this.events.clear();
    this.threats.clear();
    this.eventCounts.clear();
    this.persistData();
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.persistData();
    this.alertCallbacks = [];
    this.threatCallbacks = [];
  }
}

// Singleton instance with default options
export const securityMonitor = new SecurityMonitor({
  enableMonitoring: true,
  enableEventLogging: true,
  enableThreatDetection: true,
  maxEvents: 1000,
  maxThreats: 100,
  enablePersistence: true,
  persistenceKey: 'security_monitor_data',
  enableRealTimeAlerts: true,
  alertThreshold: 5,
  enableAnomalyDetection: true,
  anomalyThreshold: 3,
  ignoredIPs: [],
  ignoredUsers: [],
});

// Export a factory function for easier usage
export function createSecurityMonitor(options?: SecurityMonitorOptions): SecurityMonitor {
  return new SecurityMonitor(options);
}

// React hook for security monitoring
export function useSecurityMonitor() {
  return {
    logEvent: securityMonitor.logEvent.bind(securityMonitor),
    getEvents: securityMonitor.getEvents.bind(securityMonitor),
    getThreats: securityMonitor.getThreats.bind(securityMonitor),
    getRules: securityMonitor.getRules.bind(securityMonitor),
    addRule: securityMonitor.addRule.bind(securityMonitor),
    removeRule: securityMonitor.removeRule.bind(securityMonitor),
    updateRule: securityMonitor.updateRule.bind(securityMonitor),
    resolveEvent: securityMonitor.resolveEvent.bind(securityMonitor),
    resolveThreat: securityMonitor.resolveThreat.bind(securityMonitor),
    getSecurityStats: securityMonitor.getSecurityStats.bind(securityMonitor),
    onAlert: securityMonitor.onAlert.bind(securityMonitor),
    offAlert: securityMonitor.offAlert.bind(securityMonitor),
    onThreat: securityMonitor.onThreat.bind(securityMonitor),
    offThreat: securityMonitor.offThreat.bind(securityMonitor),
    updateOptions: securityMonitor.updateOptions.bind(securityMonitor),
    getOptions: securityMonitor.getOptions.bind(securityMonitor),
    clearData: securityMonitor.clearData.bind(securityMonitor),
  };
}