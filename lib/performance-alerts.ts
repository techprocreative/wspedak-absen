/**
 * Performance Alerts System
 * Provides alerting for performance issues
 * Optimized for DS223J hardware constraints
 */

export interface PerformanceAlertOptions {
  // Alert options
  enableAlerts?: boolean;
  alertInterval?: number; // ms
  maxAlerts?: number; // Maximum number of alerts to keep
  
  // Notification options
  enableNotifications?: boolean;
  enableSoundAlerts?: boolean;
  enableVisualAlerts?: boolean;
  
  // Threshold options
  memoryThreshold?: number; // MB
  cpuThreshold?: number; // %
  responseTimeThreshold?: number; // ms
  errorRateThreshold?: number; // %
  
  // Reporting options
  enableReporting?: boolean;
  reportEndpoint?: string;
}

export interface PerformanceAlert {
  id: string;
  type: 'memory' | 'cpu' | 'responseTime' | 'errorRate' | 'custom';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  value: number;
  threshold: number;
  unit: string;
  acknowledged: boolean;
  resolved: boolean;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export interface PerformanceAlertRule {
  id: string;
  name: string;
  type: 'memory' | 'cpu' | 'responseTime' | 'errorRate' | 'custom';
  condition: 'greaterThan' | 'lessThan' | 'equals' | 'notEquals';
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  message: string;
  cooldown: number; // ms
  lastTriggered?: Date;
}

export interface PerformanceAlertNotification {
  alert: PerformanceAlert;
  method: 'notification' | 'sound' | 'visual' | 'webhook';
  sent: boolean;
  sentAt?: Date;
  error?: string;
}

export class PerformanceAlerts {
  private options: PerformanceAlertOptions;
  private alerts: PerformanceAlert[] = [];
  private rules: PerformanceAlertRule[] = [];
  private notifications: PerformanceAlertNotification[] = [];
  private alertIntervalId: number | null = null;
  private alertIdCounter = 0;
  private ruleIdCounter = 0;
  private notificationCallbacks: Array<(alert: PerformanceAlert) => void> = [];

  constructor(options: PerformanceAlertOptions = {}) {
    this.options = {
      enableAlerts: true,
      alertInterval: 10000, // 10 seconds
      maxAlerts: 1000,
      enableNotifications: true,
      enableSoundAlerts: false,
      enableVisualAlerts: true,
      memoryThreshold: 400, // 400 MB
      cpuThreshold: 80, // 80%
      responseTimeThreshold: 3000, // 3 seconds
      errorRateThreshold: 5, // 5%
      enableReporting: true,
      ...options,
    };
    
    // Initialize default rules
    this.initializeDefaultRules();
  }

  /**
   * Initialize the performance alerts system
   */
  initialize(): void {
    if (!this.options.enableAlerts) {
      return;
    }

    // Start alert interval
    this.startAlertInterval();
    
    console.log('Performance alerts system initialized');
  }

  /**
   * Cleanup the performance alerts system
   */
  cleanup(): void {
    // Stop alert interval
    this.stopAlertInterval();
    
    console.log('Performance alerts system cleaned up');
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    // Memory usage rule
    this.addRule({
      name: 'High Memory Usage',
      type: 'memory',
      condition: 'greaterThan',
      threshold: this.options.memoryThreshold!,
      severity: 'warning',
      enabled: true,
      message: 'Memory usage is high: {{value}} MB (threshold: {{threshold}} MB)',
      cooldown: 60000, // 1 minute
    });
    
    // Critical memory usage rule
    this.addRule({
      name: 'Critical Memory Usage',
      type: 'memory',
      condition: 'greaterThan',
      threshold: this.options.memoryThreshold! * 1.25, // 125% of threshold
      severity: 'critical',
      enabled: true,
      message: 'Memory usage is critical: {{value}} MB (threshold: {{threshold}} MB)',
      cooldown: 30000, // 30 seconds
    });
    
    // Response time rule
    this.addRule({
      name: 'High Response Time',
      type: 'responseTime',
      condition: 'greaterThan',
      threshold: this.options.responseTimeThreshold!,
      severity: 'warning',
      enabled: true,
      message: 'Response time is high: {{value}} ms (threshold: {{threshold}} ms)',
      cooldown: 60000, // 1 minute
    });
    
    // Critical response time rule
    this.addRule({
      name: 'Critical Response Time',
      type: 'responseTime',
      condition: 'greaterThan',
      threshold: this.options.responseTimeThreshold! * 2, // 2x threshold
      severity: 'critical',
      enabled: true,
      message: 'Response time is critical: {{value}} ms (threshold: {{threshold}} ms)',
      cooldown: 30000, // 30 seconds
    });
  }

  /**
   * Start alert interval
   */
  private startAlertInterval(): void {
    this.alertIntervalId = window.setInterval(() => {
      this.checkAlerts();
    }, this.options.alertInterval);
  }

  /**
   * Stop alert interval
   */
  private stopAlertInterval(): void {
    if (this.alertIntervalId !== null) {
      clearInterval(this.alertIntervalId);
      this.alertIntervalId = null;
    }
  }

  /**
   * Check for alerts
   */
  private checkAlerts(): void {
    // Check memory usage
    this.checkMemoryUsage();
    
    // Check response time
    this.checkResponseTime();
    
    // Check error rate
    this.checkErrorRate();
    
    // Check custom metrics
    this.checkCustomMetrics();
    
    // Check if we have too many alerts
    if (this.alerts.length > this.options.maxAlerts!) {
      // Remove oldest alerts
      const toRemove = this.alerts.length - this.options.maxAlerts!;
      this.alerts.splice(0, toRemove);
    }
  }

  /**
   * Check memory usage
   */
  private checkMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMemory = memory.usedJSHeapSize / 1024 / 1024; // MB
      
      // Check rules
      this.checkRules('memory', usedMemory, 'MB');
    }
  }

  /**
   * Check response time
   */
  private checkResponseTime(): void {
    // Get navigation timing
    if ('navigation' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const responseTime = navigation.responseEnd - navigation.requestStart;
        
        // Check rules
        this.checkRules('responseTime', responseTime, 'ms');
      }
    }
  }

  /**
   * Check error rate
   */
  private checkErrorRate(): void {
    // This is a placeholder implementation
    // In a real application, you would track errors and calculate the error rate
    
    // For now, just add a placeholder check
    const errorRate = Math.random() * 10; // Random error rate between 0 and 10%
    
    // Check rules
    this.checkRules('errorRate', errorRate, '%');
  }

  /**
   * Check custom metrics
   */
  private checkCustomMetrics(): void {
    // This is a placeholder implementation
    // In a real application, you would check custom metrics
    
    // For now, just add a placeholder check
    const customMetric = Math.random() * 100; // Random value between 0 and 100
    
    // Check rules
    this.checkRules('custom', customMetric, 'units');
  }

  /**
   * Check rules for a specific metric type
   */
  private checkRules(type: PerformanceAlert['type'], value: number, unit: string): void {
    const now = new Date();
    
    for (const rule of this.rules) {
      if (!rule.enabled || rule.type !== type) {
        continue;
      }
      
      // Check cooldown
      if (rule.lastTriggered && (now.getTime() - rule.lastTriggered.getTime()) < rule.cooldown) {
        continue;
      }
      
      // Check condition
      let triggered = false;
      
      switch (rule.condition) {
        case 'greaterThan':
          triggered = value > rule.threshold;
          break;
        case 'lessThan':
          triggered = value < rule.threshold;
          break;
        case 'equals':
          triggered = value === rule.threshold;
          break;
        case 'notEquals':
          triggered = value !== rule.threshold;
          break;
      }
      
      if (triggered) {
        // Create alert
        const alert = this.createAlert(rule, value, unit);
        
        // Add alert
        this.alerts.push(alert);
        
        // Update rule last triggered
        rule.lastTriggered = now;
        
        // Send notifications
        this.sendNotifications(alert);
        
        // Notify callbacks
        this.notifyCallbacks(alert);
      }
    }
  }

  /**
   * Create an alert
   */
  private createAlert(rule: PerformanceAlertRule, value: number, unit: string): PerformanceAlert {
    const id = this.generateAlertId();
    
    // Replace placeholders in message
    const message = rule.message
      .replace('{{value}}', value.toFixed(2))
      .replace('{{threshold}}', rule.threshold.toFixed(2))
      .replace('{{unit}}', unit);
    
    return {
      id,
      type: rule.type,
      severity: rule.severity,
      title: rule.name,
      message,
      timestamp: new Date(),
      value,
      threshold: rule.threshold,
      unit,
      acknowledged: false,
      resolved: false,
    };
  }

  /**
   * Generate an alert ID
   */
  private generateAlertId(): string {
    return `alert_${++this.alertIdCounter}_${Date.now()}`;
  }

  /**
   * Send notifications for an alert
   */
  private sendNotifications(alert: PerformanceAlert): void {
    // Send notification
    if (this.options.enableNotifications) {
      this.sendNotification(alert, 'notification');
    }
    
    // Send sound alert
    if (this.options.enableSoundAlerts) {
      this.sendNotification(alert, 'sound');
    }
    
    // Send visual alert
    if (this.options.enableVisualAlerts) {
      this.sendNotification(alert, 'visual');
    }
    
    // Send webhook
    if (this.options.enableReporting && this.options.reportEndpoint) {
      this.sendNotification(alert, 'webhook');
    }
  }

  /**
   * Send a notification
   */
  private sendNotification(alert: PerformanceAlert, method: PerformanceAlertNotification['method']): void {
    const notification: PerformanceAlertNotification = {
      alert,
      method,
      sent: false,
    };
    
    try {
      switch (method) {
        case 'notification':
          this.sendBrowserNotification(alert);
          break;
        case 'sound':
          this.playSoundAlert(alert);
          break;
        case 'visual':
          this.showVisualAlert(alert);
          break;
        case 'webhook':
          this.sendWebhook(alert);
          break;
      }
      
      notification.sent = true;
      notification.sentAt = new Date();
    } catch (error) {
      notification.error = error instanceof Error ? error.message : String(error);
      console.error(`Error sending ${method} notification:`, error);
    }
    
    this.notifications.push(notification);
  }

  /**
   * Send browser notification
   */
  private sendBrowserNotification(alert: PerformanceAlert): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(alert.title, {
        body: alert.message,
        icon: '/favicon.ico',
        tag: alert.id,
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      // Request permission
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(alert.title, {
            body: alert.message,
            icon: '/favicon.ico',
            tag: alert.id,
          });
        }
      });
    }
  }

  /**
   * Play sound alert
   */
  private playSoundAlert(alert: PerformanceAlert): void {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create oscillator
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set frequency based on severity
    switch (alert.severity) {
      case 'critical':
        oscillator.frequency.value = 1000; // High pitch
        break;
      case 'error':
        oscillator.frequency.value = 800; // Medium-high pitch
        break;
      case 'warning':
        oscillator.frequency.value = 600; // Medium pitch
        break;
      case 'info':
        oscillator.frequency.value = 400; // Low pitch
        break;
    }
    
    // Set volume
    gainNode.gain.value = 0.1; // Low volume
    
    // Play sound
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2); // Short sound
  }

  /**
   * Show visual alert
   */
  private showVisualAlert(alert: PerformanceAlert): void {
    // Create visual alert element
    const alertElement = document.createElement('div');
    alertElement.className = `performance-alert performance-alert-${alert.severity}`;
    alertElement.innerHTML = `
      <div class="performance-alert-content">
        <h4>${alert.title}</h4>
        <p>${alert.message}</p>
      </div>
      <button class="performance-alert-close">&times;</button>
    `;
    
    // Add styles
    alertElement.style.position = 'fixed';
    alertElement.style.top = '20px';
    alertElement.style.right = '20px';
    alertElement.style.zIndex = '9999';
    alertElement.style.padding = '10px';
    alertElement.style.borderRadius = '5px';
    alertElement.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    alertElement.style.maxWidth = '300px';
    
    // Set background color based on severity
    switch (alert.severity) {
      case 'critical':
        alertElement.style.backgroundColor = '#f8d7da';
        alertElement.style.color = '#721c24';
        alertElement.style.border = '1px solid #f5c6cb';
        break;
      case 'error':
        alertElement.style.backgroundColor = '#f8d7da';
        alertElement.style.color = '#721c24';
        alertElement.style.border = '1px solid #f5c6cb';
        break;
      case 'warning':
        alertElement.style.backgroundColor = '#fff3cd';
        alertElement.style.color = '#856404';
        alertElement.style.border = '1px solid #ffeaa7';
        break;
      case 'info':
        alertElement.style.backgroundColor = '#d1ecf1';
        alertElement.style.color = '#0c5460';
        alertElement.style.border = '1px solid #bee5eb';
        break;
    }
    
    // Add close button functionality
    const closeButton = alertElement.querySelector('.performance-alert-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        document.body.removeChild(alertElement);
      });
    }
    
    // Add to DOM
    document.body.appendChild(alertElement);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (document.body.contains(alertElement)) {
        document.body.removeChild(alertElement);
      }
    }, 10000);
  }

  /**
   * Send webhook
   */
  private sendWebhook(alert: PerformanceAlert): void {
    if (!this.options.reportEndpoint) {
      return;
    }
    
    // Use sendBeacon if available for reliable delivery
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon(
        this.options.reportEndpoint,
        JSON.stringify({ type: 'alert', data: alert })
      );
    } else {
      // Fallback to fetch
      fetch(this.options.reportEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'alert', data: alert }),
      }).catch(error => {
        console.error('Failed to send alert webhook:', error);
      });
    }
  }

  /**
   * Notify callbacks
   */
  private notifyCallbacks(alert: PerformanceAlert): void {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });
  }

  /**
   * Add a rule
   */
  addRule(rule: Omit<PerformanceAlertRule, 'id'>): void {
    const newRule: PerformanceAlertRule = {
      id: this.generateRuleId(),
      ...rule,
    };
    
    this.rules.push(newRule);
  }

  /**
   * Remove a rule
   */
  removeRule(id: string): void {
    this.rules = this.rules.filter(rule => rule.id !== id);
  }

  /**
   * Update a rule
   */
  updateRule(id: string, updates: Partial<PerformanceAlertRule>): void {
    const ruleIndex = this.rules.findIndex(rule => rule.id === id);
    
    if (ruleIndex !== -1) {
      this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
    }
  }

  /**
   * Get rules
   */
  getRules(): PerformanceAlertRule[] {
    return [...this.rules];
  }

  /**
   * Generate a rule ID
   */
  private generateRuleId(): string {
    return `rule_${++this.ruleIdCounter}_${Date.now()}`;
  }

  /**
   * Get alerts
   */
  getAlerts(filter?: {
    type?: PerformanceAlert['type'];
    severity?: PerformanceAlert['severity'];
    acknowledged?: boolean;
    resolved?: boolean;
    startTime?: Date;
    endTime?: Date;
  }): PerformanceAlert[] {
    let alerts = [...this.alerts];
    
    // Apply filters
    if (filter?.type) {
      alerts = alerts.filter(alert => alert.type === filter.type);
    }
    
    if (filter?.severity) {
      alerts = alerts.filter(alert => alert.severity === filter.severity);
    }
    
    if (filter?.acknowledged !== undefined) {
      alerts = alerts.filter(alert => alert.acknowledged === filter.acknowledged);
    }
    
    if (filter?.resolved !== undefined) {
      alerts = alerts.filter(alert => alert.resolved === filter.resolved);
    }
    
    if (filter?.startTime) {
      alerts = alerts.filter(alert => alert.timestamp >= filter.startTime!);
    }
    
    if (filter?.endTime) {
      alerts = alerts.filter(alert => alert.timestamp <= filter.endTime!);
    }
    
    return alerts;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(id: string, acknowledgedBy?: string): void {
    const alertIndex = this.alerts.findIndex(alert => alert.id === id);
    
    if (alertIndex !== -1) {
      this.alerts[alertIndex].acknowledged = true;
      this.alerts[alertIndex].acknowledgedAt = new Date();
      this.alerts[alertIndex].acknowledgedBy = acknowledgedBy;
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(id: string): void {
    const alertIndex = this.alerts.findIndex(alert => alert.id === id);
    
    if (alertIndex !== -1) {
      this.alerts[alertIndex].resolved = true;
      this.alerts[alertIndex].resolvedAt = new Date();
    }
  }

  /**
   * Get notifications
   */
  getNotifications(filter?: {
    method?: PerformanceAlertNotification['method'];
    sent?: boolean;
    startTime?: Date;
    endTime?: Date;
  }): PerformanceAlertNotification[] {
    let notifications = [...this.notifications];
    
    // Apply filters
    if (filter?.method) {
      notifications = notifications.filter(notification => notification.method === filter.method);
    }
    
    if (filter?.sent !== undefined) {
      notifications = notifications.filter(notification => notification.sent === filter.sent);
    }
    
    if (filter?.startTime) {
      notifications = notifications.filter(notification => 
        notification.sentAt && notification.sentAt >= filter.startTime!
      );
    }
    
    if (filter?.endTime) {
      notifications = notifications.filter(notification => 
        notification.sentAt && notification.sentAt <= filter.endTime!
      );
    }
    
    return notifications;
  }

  /**
   * Register a notification callback
   */
  onNotification(callback: (alert: PerformanceAlert) => void): void {
    this.notificationCallbacks.push(callback);
  }

  /**
   * Unregister a notification callback
   */
  offNotification(callback: (alert: PerformanceAlert) => void): void {
    const index = this.notificationCallbacks.indexOf(callback);
    if (index !== -1) {
      this.notificationCallbacks.splice(index, 1);
    }
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<PerformanceAlertOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Restart alert interval if it changed
    if (this.alertIntervalId !== null && newOptions.alertInterval) {
      this.stopAlertInterval();
      this.startAlertInterval();
    }
  }

  /**
   * Get current options
   */
  getOptions(): PerformanceAlertOptions {
    return { ...this.options };
  }
}

// Singleton instance with default options
export const performanceAlerts = new PerformanceAlerts({
  enableAlerts: true,
  alertInterval: 10000,
  maxAlerts: 1000,
  enableNotifications: true,
  enableSoundAlerts: false,
  enableVisualAlerts: true,
  memoryThreshold: 400,
  cpuThreshold: 80,
  responseTimeThreshold: 3000,
  errorRateThreshold: 5,
  enableReporting: true,
});

// Export a factory function for easier usage
export function createPerformanceAlerts(options?: PerformanceAlertOptions): PerformanceAlerts {
  return new PerformanceAlerts(options);
}

// React hook for performance alerts
export function usePerformanceAlerts() {
  return {
    getAlerts: performanceAlerts.getAlerts.bind(performanceAlerts),
    acknowledgeAlert: performanceAlerts.acknowledgeAlert.bind(performanceAlerts),
    resolveAlert: performanceAlerts.resolveAlert.bind(performanceAlerts),
    getRules: performanceAlerts.getRules.bind(performanceAlerts),
    addRule: performanceAlerts.addRule.bind(performanceAlerts),
    removeRule: performanceAlerts.removeRule.bind(performanceAlerts),
    updateRule: performanceAlerts.updateRule.bind(performanceAlerts),
    getNotifications: performanceAlerts.getNotifications.bind(performanceAlerts),
    onNotification: performanceAlerts.onNotification.bind(performanceAlerts),
    offNotification: performanceAlerts.offNotification.bind(performanceAlerts),
  };
}