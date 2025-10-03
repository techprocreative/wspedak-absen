/**
 * Alert Management System
 * Provides comprehensive alert creation, management, and notification capabilities
 * Optimized for production environments
 */

import { systemMonitor } from '@/lib/monitoring/system-monitor';
import { predictiveAnalytics } from '@/lib/analytics/predictive-analytics';

// Alert interfaces
export interface Alert {
  id: string;
  type: 'system' | 'performance' | 'security' | 'business' | 'prediction' | 'anomaly';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  description?: string;
  source: string;
  category: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  assignedTo?: string;
  tags: string[];
  metadata: any;
  actions: AlertAction[];
  escalationLevel: number;
  escalationRules: EscalationRule[];
  notifications: Notification[];
  relatedAlerts: string[];
  status: 'active' | 'acknowledged' | 'escalated' | 'resolved' | 'closed';
}

export interface AlertAction {
  id: string;
  name: string;
  description: string;
  type: 'link' | 'button' | 'api' | 'script';
  url?: string;
  method?: string;
  payload?: any;
  icon?: string;
  executed: boolean;
  executedBy?: string;
  executedAt?: Date;
  result?: any;
}

export interface EscalationRule {
  id: string;
  level: number;
  condition: string;
  timeframe: number; // minutes
  assignTo?: string;
  notifyChannels: string[];
  actions: string[];
  active: boolean;
}

export interface Notification {
  id: string;
  channel: 'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'teams';
  recipient: string;
  message: string;
  sent: boolean;
  sentAt?: Date;
  delivered: boolean;
  deliveredAt?: Date;
  read: boolean;
  readAt?: Date;
  error?: string;
  retryCount: number;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  escalation: EscalationRule[];
  cooldown: number; // minutes
  lastTriggered?: Date;
  triggerCount: number;
  category: string;
  severity: Alert['severity'];
}

export interface AlertCondition {
  metric: string;
  operator: '>' | '<' | '=' | '>=' | '<=' | '!=' | 'contains' | 'not_contains';
  value: any;
  timeframe?: number; // minutes
  aggregation?: 'avg' | 'sum' | 'count' | 'min' | 'max';
}

export interface AlertTemplate {
  id: string;
  name: string;
  type: Alert['type'];
  severity: Alert['severity'];
  title: string;
  message: string;
  description?: string;
  actions: Omit<AlertAction, 'id' | 'executed' | 'executedBy' | 'executedAt' | 'result'>[];
  tags: string[];
  metadata: any;
}

export interface AlertStatistics {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  bySource: Record<string, number>;
  averageResolutionTime: number;
  escalationRate: number;
  notificationSuccessRate: number;
}

export interface AlertFilter {
  type?: Alert['type'];
  severity?: Alert['severity'];
  status?: Alert['status'];
  source?: string;
  category?: string;
  tags?: string[];
  assignedTo?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

class AlertManager {
  private alerts: Alert[] = [];
  private rules: AlertRule[] = [];
  private templates: AlertTemplate[] = [];
  private notificationChannels: Map<string, any> = new Map();
  private isProcessing: boolean = false;

  constructor() {
    this.initializeDefaultTemplates();
    this.initializeDefaultRules();
    this.startAlertProcessing();
  }

  // Initialize default alert templates
  private initializeDefaultTemplates(): void {
    const templates: Omit<AlertTemplate, 'id'>[] = [
      {
        name: 'High CPU Usage',
        type: 'system',
        severity: 'high',
        title: 'High CPU Usage Detected',
        message: 'CPU usage has exceeded the threshold of 90%',
        description: 'System performance may be impacted due to high CPU usage',
        actions: [
          {
            name: 'View System Metrics',
            description: 'Open system monitoring dashboard',
            type: 'link',
            url: '/admin/monitoring',
            icon: 'monitor'
          },
          {
            name: 'Restart Services',
            description: 'Restart affected services',
            type: 'api',
            method: 'POST',
            payload: { action: 'restart_services' },
            icon: 'refresh'
          }
        ],
        tags: ['system', 'performance', 'cpu'],
        metadata: { metric: 'cpu', threshold: 90 }
      },
      {
        name: 'Employee Turnover Risk',
        type: 'prediction',
        severity: 'medium',
        title: 'Employee Turnover Risk Detected',
        message: 'AI model has identified employees with high turnover risk',
        description: 'Proactive intervention is recommended to retain at-risk employees',
        actions: [
          {
            name: 'View Risk Report',
            description: 'Open detailed turnover risk report',
            type: 'link',
            url: '/admin/analytics-advanced',
            icon: 'analytics'
          },
          {
            name: 'Schedule Meetings',
            description: 'Schedule one-on-one meetings with at-risk employees',
            type: 'button',
            icon: 'calendar'
          }
        ],
        tags: ['prediction', 'hr', 'turnover'],
        metadata: { model: 'turnover_risk', threshold: 0.5 }
      },
      {
        name: 'Unusual Attendance Pattern',
        type: 'anomaly',
        severity: 'medium',
        title: 'Unusual Attendance Pattern Detected',
        message: 'Anomaly detection has identified unusual attendance patterns',
        description: 'Investigation is recommended to identify potential issues',
        actions: [
          {
            name: 'View Anomaly Report',
            description: 'Open detailed anomaly report',
            type: 'link',
            url: '/admin/analytics-advanced',
            icon: 'analytics'
          },
          {
            name: 'Investigate',
            description: 'Start investigation process',
            type: 'button',
            icon: 'search'
          }
        ],
        tags: ['anomaly', 'attendance', 'pattern'],
        metadata: { model: 'anomaly_detector', threshold: 2 }
      },
      {
        name: 'Security Incident',
        type: 'security',
        severity: 'critical',
        title: 'Security Incident Detected',
        message: 'Security monitoring has detected a potential security incident',
        description: 'Immediate investigation and response is required',
        actions: [
          {
            name: 'View Security Dashboard',
            description: 'Open security monitoring dashboard',
            type: 'link',
            url: '/admin/security',
            icon: 'shield'
          },
          {
            name: 'Lock Down Systems',
            description: 'Initiate security lockdown procedures',
            type: 'api',
            method: 'POST',
            payload: { action: 'security_lockdown' },
            icon: 'lock'
          }
        ],
        tags: ['security', 'incident', 'critical'],
        metadata: { priority: 'critical' }
      }
    ];

    templates.forEach(template => {
      this.templates.push({
        ...template,
        id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
    });
  }

  // Initialize default alert rules
  private initializeDefaultRules(): void {
    const rules: Omit<AlertRule, 'id'>[] = [
      {
        name: 'High CPU Usage Alert',
        description: 'Alert when CPU usage exceeds 90%',
        enabled: true,
        conditions: [
          {
            metric: 'cpu.usage',
            operator: '>',
            value: 90,
            timeframe: 5,
            aggregation: 'avg'
          }
        ],
        actions: [
          {
            id: 'view_metrics',
            name: 'View System Metrics',
            description: 'Open system monitoring dashboard',
            type: 'link',
            url: '/admin/monitoring',
            icon: 'monitor',
            executed: false
          }
        ],
        escalation: [
          {
            id: 'escalation_1',
            level: 1,
            condition: 'not_acknowledged',
            timeframe: 15,
            assignTo: 'system_admin',
            notifyChannels: ['email', 'slack'],
            actions: ['send_notification'],
            active: true
          }
        ],
        cooldown: 30,
        triggerCount: 0,
        category: 'system',
        severity: 'high'
      },
      {
        name: 'Employee Turnover Risk Alert',
        description: 'Alert when employee turnover risk exceeds 50%',
        enabled: true,
        conditions: [
          {
            metric: 'turnover.risk',
            operator: '>',
            value: 0.5,
            timeframe: 60,
            aggregation: 'max'
          }
        ],
        actions: [
          {
            id: 'view_risk_report',
            name: 'View Risk Report',
            description: 'Open detailed turnover risk report',
            type: 'link',
            url: '/admin/analytics-advanced',
            icon: 'analytics',
            executed: false
          }
        ],
        escalation: [
          {
            id: 'escalation_1',
            level: 1,
            condition: 'not_acknowledged',
            timeframe: 60,
            assignTo: 'hr_manager',
            notifyChannels: ['email'],
            actions: ['send_notification'],
            active: true
          }
        ],
        cooldown: 1440, // 24 hours
        triggerCount: 0,
        category: 'hr',
        severity: 'medium'
      }
    ];

    rules.forEach(rule => {
      this.rules.push({
        ...rule,
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
    });
  }

  // Start alert processing
  private startAlertProcessing(): void {
    // Process alerts every minute
    setInterval(() => {
      this.processAlerts();
    }, 60 * 1000);

    // Check rules every 5 minutes
    setInterval(() => {
      this.checkRules();
    }, 5 * 60 * 1000);
  }

  // Process alerts (escalation, notifications, etc.)
  private async processAlerts(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      const activeAlerts = this.alerts.filter(a => a.status === 'active');

      for (const alert of activeAlerts) {
        // Check escalation rules
        await this.checkEscalation(alert);

        // Process notifications
        await this.processNotifications(alert);
      }
    } catch (error) {
      console.error('Error processing alerts:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Check escalation rules for an alert
  private async checkEscalation(alert: Alert): Promise<void> {
    const now = new Date();
    const timeSinceCreation = (now.getTime() - alert.timestamp.getTime()) / (1000 * 60); // minutes

    for (const rule of alert.escalationRules) {
      if (!rule.active) continue;

      // Check if escalation condition is met
      if (timeSinceCreation >= rule.timeframe && alert.escalationLevel < rule.level) {
        // Escalate alert
        alert.escalationLevel = rule.level;
        alert.status = 'escalated';

        // Assign to specified user/role
        if (rule.assignTo) {
          alert.assignedTo = rule.assignTo;
        }

        // Send escalation notifications
        for (const channel of rule.notifyChannels) {
          await this.sendNotification(alert, channel, rule.assignTo);
        }

        // Execute escalation actions
        for (const actionId of rule.actions) {
          await this.executeEscalationAction(alert.id, actionId);
        }

        console.log(`Alert ${alert.id} escalated to level ${rule.level}`);
      }
    }
  }

  // Process notifications for an alert
  private async processNotifications(alert: Alert): Promise<void> {
    for (const notification of alert.notifications) {
      if (!notification.sent && notification.retryCount < 3) {
        try {
          await this.sendNotificationMessage(notification);
          notification.sent = true;
          notification.sentAt = new Date();
        } catch (error) {
          notification.retryCount++;
          notification.error = error instanceof Error ? error.message : String(error);
          console.error(`Failed to send notification ${notification.id}:`, error);
        }
      }
    }
  }

  // Send notification message
  private async sendNotificationMessage(notification: Notification): Promise<void> {
    const channel = this.notificationChannels.get(notification.channel);
    if (!channel) {
      throw new Error(`Notification channel ${notification.channel} not configured`);
    }

    // Mock implementation - in real system, this would integrate with actual notification services
    console.log(`Sending ${notification.channel} notification to ${notification.recipient}: ${notification.message}`);
    
    // Simulate sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mark as delivered
    notification.delivered = true;
    notification.deliveredAt = new Date();
  }

  // Send notification
  private async sendNotification(alert: Alert, channel: string, recipient?: string): Promise<void> {
    const notification: Notification = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      channel: channel as any,
      recipient: recipient || 'admin',
      message: this.formatNotificationMessage(alert, channel),
      sent: false,
      delivered: false,
      read: false,
      retryCount: 0
    };

    alert.notifications.push(notification);
  }

  // Format notification message based on channel
  private formatNotificationMessage(alert: Alert, channel: string): string {
    switch (channel) {
      case 'email':
        return `
          <h2>${alert.title}</h2>
          <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
          <p><strong>Source:</strong> ${alert.source}</p>
          <p><strong>Time:</strong> ${alert.timestamp.toLocaleString()}</p>
          <p>${alert.message}</p>
          ${alert.description ? `<p>${alert.description}</p>` : ''}
          <p><a href="/admin/alerts/${alert.id}">View Alert Details</a></p>
        `;
      case 'sms':
        return `[${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`;
      case 'slack':
        return `*${alert.title}*\n${alert.message}\nSeverity: ${alert.severity.toUpperCase()}\nSource: ${alert.source}`;
      default:
        return `${alert.title}: ${alert.message}`;
    }
  }

  // Check alert rules
  private async checkRules(): Promise<void> {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.lastTriggered) {
        const timeSinceLastTrigger = (Date.now() - rule.lastTriggered.getTime()) / (1000 * 60);
        if (timeSinceLastTrigger < rule.cooldown) continue;
      }

      // Check conditions
      const conditionsMet = await this.evaluateRuleConditions(rule);
      if (conditionsMet) {
        await this.triggerRule(rule);
      }
    }
  }

  // Evaluate rule conditions
  private async evaluateRuleConditions(rule: AlertRule): Promise<boolean> {
    for (const condition of rule.conditions) {
      const conditionMet = await this.evaluateCondition(condition);
      if (!conditionMet) return false;
    }
    return true;
  }

  // Evaluate individual condition
  private async evaluateCondition(condition: AlertCondition): Promise<boolean> {
    // Get metric value based on condition
    let value: any;

    switch (condition.metric) {
      case 'cpu.usage':
        const systemMetrics = systemMonitor.getCurrentMetrics();
        value = systemMetrics?.cpu.usage || 0;
        break;
      case 'turnover.risk':
        const turnoverRisks = predictiveAnalytics.predictTurnoverRisk();
        value = turnoverRisks.length > 0 ? Math.max(...turnoverRisks.map(r => r.riskScore)) : 0;
        break;
      default:
        value = 0;
    }

    // Apply aggregation if specified
    if (condition.aggregation && condition.timeframe) {
      // In real implementation, this would aggregate historical data
      // For now, just use the current value
    }

    // Evaluate condition
    switch (condition.operator) {
      case '>':
        return value > condition.value;
      case '<':
        return value < condition.value;
      case '>=':
        return value >= condition.value;
      case '<=':
        return value <= condition.value;
      case '=':
        return value === condition.value;
      case '!=':
        return value !== condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'not_contains':
        return !String(value).includes(String(condition.value));
      default:
        return false;
    }
  }

  // Trigger rule
  private async triggerRule(rule: AlertRule): Promise<void> {
    // Find matching template
    const template = this.templates.find(t => 
      t.type === rule.category && t.severity === rule.severity
    );

    if (!template) {
      console.warn(`No template found for rule ${rule.id}`);
      return;
    }

    // Create alert from template
    const alert = this.createAlertFromTemplate(template, {
      source: 'rule_engine',
      category: rule.category,
      metadata: { ruleId: rule.id }
    });

    // Add rule-specific actions
    rule.actions.forEach(action => {
      alert.actions.push({ ...action });
    });

    // Add rule escalation rules
    rule.escalation.forEach(escalation => {
      alert.escalationRules.push({ ...escalation });
    });

    // Update rule trigger info
    rule.lastTriggered = new Date();
    rule.triggerCount++;

    console.log(`Rule ${rule.name} triggered, created alert ${alert.id}`);
  }

  // Create alert from template
  createAlertFromTemplate(template: AlertTemplate, overrides: Partial<Alert> = {}): Alert {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: template.type,
      severity: template.severity,
      title: template.title,
      message: template.message,
      description: template.description,
      source: overrides.source || 'system',
      category: overrides.category || template.type,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      tags: [...template.tags],
      metadata: { ...template.metadata, ...overrides.metadata },
      actions: template.actions.map(action => ({
        ...action,
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        executed: false
      })),
      escalationLevel: 0,
      escalationRules: [],
      notifications: [],
      relatedAlerts: [],
      status: 'active',
      ...overrides
    };

    this.alerts.push(alert);
    return alert;
  }

  // Create custom alert
  createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'acknowledged' | 'resolved' | 'actions' | 'escalationLevel' | 'escalationRules' | 'notifications' | 'relatedAlerts' | 'status'>): Alert {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      actions: [],
      escalationLevel: 0,
      escalationRules: [],
      notifications: [],
      relatedAlerts: [],
      status: 'active',
      ...alertData
    };

    this.alerts.push(alert);
    return alert;
  }

  // Get alerts
  getAlerts(filter?: AlertFilter): Alert[] {
    let filteredAlerts = [...this.alerts];

    if (filter) {
      if (filter.type) {
        filteredAlerts = filteredAlerts.filter(a => a.type === filter.type);
      }
      if (filter.severity) {
        filteredAlerts = filteredAlerts.filter(a => a.severity === filter.severity);
      }
      if (filter.status) {
        filteredAlerts = filteredAlerts.filter(a => a.status === filter.status);
      }
      if (filter.source) {
        filteredAlerts = filteredAlerts.filter(a => a.source === filter.source);
      }
      if (filter.category) {
        filteredAlerts = filteredAlerts.filter(a => a.category === filter.category);
      }
      if (filter.tags && filter.tags.length > 0) {
        filteredAlerts = filteredAlerts.filter(a => 
          filter.tags!.some(tag => a.tags.includes(tag))
        );
      }
      if (filter.assignedTo) {
        filteredAlerts = filteredAlerts.filter(a => a.assignedTo === filter.assignedTo);
      }
      if (filter.dateRange) {
        filteredAlerts = filteredAlerts.filter(a => 
          a.timestamp >= filter.dateRange!.start && a.timestamp <= filter.dateRange!.end
        );
      }
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        filteredAlerts = filteredAlerts.filter(a => 
          a.title.toLowerCase().includes(searchLower) ||
          a.message.toLowerCase().includes(searchLower) ||
          a.description?.toLowerCase().includes(searchLower)
        );
      }
    }

    // Sort by timestamp (newest first)
    filteredAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return filteredAlerts;
  }

  // Get alert by ID
  getAlert(id: string): Alert | null {
    return this.alerts.find(a => a.id === id) || null;
  }

  // Acknowledge alert
  acknowledgeAlert(id: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === id);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date();
      alert.status = 'acknowledged';
      return true;
    }
    return false;
  }

  // Resolve alert
  resolveAlert(id: string, resolvedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === id);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedBy = resolvedBy;
      alert.resolvedAt = new Date();
      alert.status = 'resolved';
      return true;
    }
    return false;
  }

  // Assign alert
  assignAlert(id: string, assignedTo: string): boolean {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.assignedTo = assignedTo;
      return true;
    }
    return false;
  }

  // Execute escalation action
  private async executeEscalationAction(alertId: string, actionName: string): Promise<any> {
    // Mock implementation for escalation actions
    console.log(`Executing escalation action '${actionName}' for alert ${alertId}`);
    
    switch (actionName) {
      case 'send_notification':
        // Notification is already sent in the checkEscalation method
        return { success: true, message: 'Notification sent' };
      default:
        return { success: true, message: `Action '${actionName}' executed` };
    }
  }

  // Execute alert action
  async executeAction(alertId: string, actionId: string): Promise<any> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return null;

    const action = alert.actions.find(a => a.id === actionId);
    if (!action || action.executed) return null;

    try {
      let result: any;

      switch (action.type) {
        case 'link':
          result = { url: action.url };
          break;
        case 'api':
          // Mock API call
          result = { success: true, message: 'API call executed' };
          break;
        case 'script':
          // Mock script execution
          result = { success: true, message: 'Script executed' };
          break;
        default:
          result = { success: true, message: 'Action executed' };
      }

      // Update action
      action.executed = true;
      action.executedAt = new Date();
      action.result = result;

      return result;
    } catch (error) {
      action.result = { success: false, error: error instanceof Error ? error.message : String(error) };
      throw error;
    }
  }

  // Get alert statistics
  getAlertStatistics(): AlertStatistics {
    const total = this.alerts.length;
    const active = this.alerts.filter(a => a.status === 'active').length;
    const acknowledged = this.alerts.filter(a => a.acknowledged).length;
    const resolved = this.alerts.filter(a => a.resolved).length;

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    this.alerts.forEach(alert => {
      byType[alert.type] = (byType[alert.type] || 0) + 1;
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
      bySource[alert.source] = (bySource[alert.source] || 0) + 1;
    });

    // Calculate average resolution time
    const resolvedAlerts = this.alerts.filter(a => a.resolved && a.resolvedAt);
    const averageResolutionTime = resolvedAlerts.length > 0
      ? resolvedAlerts.reduce((sum, alert) => {
          const resolutionTime = alert.resolvedAt!.getTime() - alert.timestamp.getTime();
          return sum + resolutionTime;
        }, 0) / resolvedAlerts.length / (1000 * 60) // minutes
      : 0;

    // Calculate escalation rate
    const escalatedAlerts = this.alerts.filter(a => a.escalationLevel > 0);
    const escalationRate = total > 0 ? (escalatedAlerts.length / total) * 100 : 0;

    // Calculate notification success rate
    const allNotifications = this.alerts.flatMap(a => a.notifications);
    const successfulNotifications = allNotifications.filter(n => n.delivered);
    const notificationSuccessRate = allNotifications.length > 0
      ? (successfulNotifications.length / allNotifications.length) * 100
      : 0;

    return {
      total,
      active,
      acknowledged,
      resolved,
      byType,
      bySeverity,
      bySource,
      averageResolutionTime,
      escalationRate,
      notificationSuccessRate
    };
  }

  // Get alert rules
  getRules(): AlertRule[] {
    return [...this.rules];
  }

  // Create alert rule
  createRule(ruleData: Omit<AlertRule, 'id' | 'triggerCount'>): AlertRule {
    const rule: AlertRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      triggerCount: 0,
      ...ruleData
    };

    this.rules.push(rule);
    return rule;
  }

  // Update alert rule
  updateRule(id: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      Object.assign(rule, updates);
      return true;
    }
    return false;
  }

  // Delete alert rule
  deleteRule(id: string): boolean {
    const index = this.rules.findIndex(r => r.id === id);
    if (index !== -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  // Get alert templates
  getTemplates(): AlertTemplate[] {
    return [...this.templates];
  }

  // Create alert template
  createTemplate(templateData: Omit<AlertTemplate, 'id'>): AlertTemplate {
    const template: AlertTemplate = {
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...templateData
    };

    this.templates.push(template);
    return template;
  }

  // Update alert template
  updateTemplate(id: string, updates: Partial<AlertTemplate>): boolean {
    const template = this.templates.find(t => t.id === id);
    if (template) {
      Object.assign(template, updates);
      return true;
    }
    return false;
  }

  // Delete alert template
  deleteTemplate(id: string): boolean {
    const index = this.templates.findIndex(t => t.id === id);
    if (index !== -1) {
      this.templates.splice(index, 1);
      return true;
    }
    return false;
  }

  // Configure notification channel
  configureNotificationChannel(channel: string, config: any): void {
    this.notificationChannels.set(channel, config);
  }

  // Clear old alerts
  cleanup(olderThanDays: number = 30): void {
    const cutoffTime = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoffTime || a.status === 'active');
  }
}

// Singleton instance
export const alertManager = new AlertManager();

// Export types and functions
export type { AlertManager };
export { AlertManager as AlertManagerClass };