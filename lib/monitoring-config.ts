/**
 * Monitoring Configuration
 * Centralized configuration for all monitoring components
 * Optimized for DS223J hardware constraints
 */

// Define types locally to avoid circular dependencies
export interface LoggerOptions {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  enableConsole: boolean;
  enablePersistence: boolean;
  enableRemote?: boolean;
  remoteEndpoint?: string;
  maxLogSize: number;
  enableCompression: boolean;
  enableRotation: boolean;
  rotationSize: number;
  retentionPeriod: number;
}

export interface HealthCheckManagerOptions {
  enableHealthChecks: boolean;
  checkInterval: number;
  enableDetailedChecks: boolean;
  enablePersistence: boolean;
  retentionPeriod: number;
  enableRealTimeUpdates: boolean;
  enableAlerts: boolean;
  alertThreshold: {
    warning: number;
    critical: number;
  };
}

export interface MetricsCollectorOptions {
  enableCollection: boolean;
  collectionInterval: number;
  maxMetrics: number;
  enableAggregation: boolean;
  aggregationInterval: number;
  enablePersistence: boolean;
  enableRealTimeUpdates: boolean;
  enableCompression: boolean;
}

export interface ErrorTrackerOptions {
  enableTracking: boolean;
  enableAlerting: boolean;
  maxErrorReports: number;
  maxErrorGroups: number;
  enableGrouping: boolean;
  enableAutoResolve: boolean;
  autoResolveThreshold: number;
  enableNotifications: boolean;
  notificationChannels: any[];
  alertRules: any[];
  ignoredErrors: string[];
  samplingRate: number;
}

export interface SecurityMonitorOptions {
  enableMonitoring: boolean;
  enableEventLogging: boolean;
  enableThreatDetection: boolean;
  maxEvents: number;
  maxThreats: number;
  enablePersistence: boolean;
  enableRealTimeAlerts: boolean;
  alertThreshold: number;
  enableAnomalyDetection: boolean;
  anomalyThreshold: number;
  ignoredIPs: string[];
  ignoredUsers: string[];
}

export interface SystemMonitorOptions {
  enableMonitoring: boolean;
  collectionInterval: number;
  retentionPeriod: number;
  enableAlerts: boolean;
  alertThresholds: {
    cpu: { warning: number; critical: number };
    memory: { warning: number; critical: number };
    storage: { warning: number; critical: number };
    temperature: { warning: number; critical: number };
    network: { errorRate: number };
  };
  enableAutoOptimization: boolean;
  maxMetricHistory: number;
  enablePersistence: boolean;
}

export interface BusinessMetricsOptions {
  enableCollection: boolean;
  collectionInterval: number;
  retentionPeriod: number;
  maxMetrics: number;
  enableAggregation: boolean;
  aggregationInterval: number;
  enablePersistence: boolean;
  enableRealTimeUpdates: boolean;
}

export interface LogAggregationOptions {
  enableAggregation: boolean;
  aggregationInterval: number;
  retentionPeriod: number;
  maxLogs: number;
  enableAnalysis: boolean;
  enablePersistence: boolean;
  enableRealTimeUpdates: boolean;
  enableCompression: boolean;
  compressionThreshold: number;
}

// Environment-specific configurations
export const getMonitoringConfig = (env: 'development' | 'production' | 'test' = 'development') => {
  const baseConfig = {
    // Common configuration for all environments
    enablePersistence: true,
    enableRealTimeUpdates: true,
    retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  switch (env) {
    case 'development':
      return {
        ...baseConfig,
        // Development-specific configuration
        logLevel: 'debug' as const,
        enableDetailedLogging: true,
        collectionInterval: 30000, // 30 seconds
        retentionPeriod: 24 * 60 * 60 * 1000, // 1 day
        maxItems: 1000,
        enableAlerts: false,
        enableAutoOptimization: false,
      };

    case 'production':
      return {
        ...baseConfig,
        // Production-specific configuration
        logLevel: 'info' as const,
        enableDetailedLogging: false,
        collectionInterval: 60000, // 1 minute
        retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
        maxItems: 10000,
        enableAlerts: true,
        enableAutoOptimization: true,
      };

    case 'test':
      return {
        ...baseConfig,
        // Test-specific configuration
        logLevel: 'error' as const,
        enableDetailedLogging: false,
        collectionInterval: 5000, // 5 seconds
        retentionPeriod: 60 * 60 * 1000, // 1 hour
        maxItems: 100,
        enableAlerts: false,
        enableAutoOptimization: false,
        enablePersistence: false,
      };

    default:
      return baseConfig;
  }
};

// Get environment-specific logger configuration
export const getLoggerConfig = (env: 'development' | 'production' | 'test' = 'development'): LoggerOptions => {
  const config = getMonitoringConfig(env);
  
  return {
    level: (config as any).logLevel || 'info',
    enableConsole: true,
    enablePersistence: config.enablePersistence,
    enableRemote: env === 'production',
    remoteEndpoint: env === 'production' ? '/api/logs' : undefined,
    maxLogSize: 1000,
    enableCompression: env === 'production',
    enableRotation: true,
    rotationSize: 10 * 1024 * 1024, // 10MB
    retentionPeriod: config.retentionPeriod,
  };
};

// Get environment-specific health check configuration
export const getHealthCheckConfig = (env: 'development' | 'production' | 'test' = 'development'): HealthCheckManagerOptions => {
  const config = getMonitoringConfig(env);
  
  return {
    enableHealthChecks: true,
    checkInterval: (config as any).collectionInterval || 60000,
    enableDetailedChecks: (config as any).enableDetailedLogging || false,
    enablePersistence: config.enablePersistence,
    retentionPeriod: config.retentionPeriod,
    enableRealTimeUpdates: config.enableRealTimeUpdates,
    enableAlerts: (config as any).enableAlerts || false,
    alertThreshold: {
      warning: 5,
      critical: 10,
    },
  };
};

// Get environment-specific metrics collector configuration
export const getMetricsCollectorConfig = (env: 'development' | 'production' | 'test' = 'development'): MetricsCollectorOptions => {
  const config = getMonitoringConfig(env);
  
  return {
    enableCollection: true,
    collectionInterval: (config as any).collectionInterval || 60000,
    maxMetrics: (config as any).maxItems || 1000,
    enableAggregation: true,
    aggregationInterval: ((config as any).collectionInterval || 60000) * 2,
    enablePersistence: config.enablePersistence,
    enableRealTimeUpdates: config.enableRealTimeUpdates,
    enableCompression: env === 'production',
  };
};

// Get environment-specific error tracker configuration
export const getErrorTrackerConfig = (env: 'development' | 'production' | 'test' = 'development'): ErrorTrackerOptions => {
  const config = getMonitoringConfig(env);
  
  return {
    enableTracking: true,
    enableAlerting: (config as any).enableAlerts || false,
    maxErrorReports: (config as any).maxItems || 1000,
    maxErrorGroups: Math.floor(((config as any).maxItems || 1000) / 10),
    enableGrouping: true,
    enableAutoResolve: (config as any).enableAutoOptimization || false,
    autoResolveThreshold: 7, // 7 days
    enableNotifications: (config as any).enableAlerts || false,
    notificationChannels: env === 'production' ? [
      {
        id: 'email',
        name: 'Email Notifications',
        type: 'email',
        enabled: true,
        config: {
          recipients: ['admin@example.com'],
        },
        filters: {
          severity: ['high', 'critical'],
        },
      },
    ] : [],
    alertRules: [
      {
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
      },
      {
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
      },
    ],
    ignoredErrors: env === 'development' ? [] : [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],
    samplingRate: 1.0,
  };
};

// Get environment-specific security monitor configuration
export const getSecurityMonitorConfig = (env: 'development' | 'production' | 'test' = 'development'): SecurityMonitorOptions => {
  const config = getMonitoringConfig(env);
  
  return {
    enableMonitoring: true,
    enableEventLogging: true,
    enableThreatDetection: true,
    maxEvents: (config as any).maxItems || 1000,
    maxThreats: Math.floor(((config as any).maxItems || 1000) / 10),
    enablePersistence: config.enablePersistence,
    enableRealTimeAlerts: (config as any).enableAlerts || false,
    alertThreshold: 5,
    enableAnomalyDetection: true,
    anomalyThreshold: 3,
    ignoredIPs: env === 'development' ? [] : [
      '127.0.0.1',
      '::1',
    ],
    ignoredUsers: env === 'development' ? [] : [
      'admin',
    ],
  };
};

// Get environment-specific system monitor configuration
export const getSystemMonitorConfig = (env: 'development' | 'production' | 'test' = 'development'): SystemMonitorOptions => {
  const config = getMonitoringConfig(env);
  
  return {
    enableMonitoring: true,
    collectionInterval: (config as any).collectionInterval || 60000,
    retentionPeriod: (config as any).retentionPeriod || 7 * 24 * 60 * 60 * 1000,
    enableAlerts: (config as any).enableAlerts || false,
    alertThresholds: {
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 80, critical: 95 },
      storage: { warning: 80, critical: 95 },
      temperature: { warning: 70, critical: 85 },
      network: { errorRate: 5 },
    },
    enableAutoOptimization: (config as any).enableAutoOptimization || false,
    maxMetricHistory: (config as any).maxItems || 1000,
    enablePersistence: config.enablePersistence,
  };
};

// Get environment-specific business metrics configuration
export const getBusinessMetricsConfig = (env: 'development' | 'production' | 'test' = 'development'): BusinessMetricsOptions => {
  const config = getMonitoringConfig(env);
  
  return {
    enableCollection: true,
    collectionInterval: (config as any).collectionInterval || 60000,
    retentionPeriod: (config as any).retentionPeriod || 7 * 24 * 60 * 60 * 1000,
    maxMetrics: (config as any).maxItems || 1000,
    enableAggregation: true,
    aggregationInterval: ((config as any).collectionInterval || 60000) * 2,
    enablePersistence: config.enablePersistence,
    enableRealTimeUpdates: config.enableRealTimeUpdates,
  };
};

// Get environment-specific log aggregation configuration
export const getLogAggregatorConfig = (env: 'development' | 'production' | 'test' = 'development'): LogAggregationOptions => {
  const config = getMonitoringConfig(env);
  
  return {
    enableAggregation: true,
    aggregationInterval: ((config as any).collectionInterval || 60000) * 2,
    retentionPeriod: (config as any).retentionPeriod || 7 * 24 * 60 * 60 * 1000,
    maxLogs: (config as any).maxItems || 1000,
    enableAnalysis: true,
    enablePersistence: config.enablePersistence,
    enableRealTimeUpdates: config.enableRealTimeUpdates,
    enableCompression: env === 'production',
    compressionThreshold: 1000,
  };
};

// Get all monitoring configurations
export const getAllMonitoringConfigs = (env: 'development' | 'production' | 'test' = 'development') => {
  return {
    logger: getLoggerConfig(env),
    healthCheck: getHealthCheckConfig(env),
    metricsCollector: getMetricsCollectorConfig(env),
    errorTracker: getErrorTrackerConfig(env),
    securityMonitor: getSecurityMonitorConfig(env),
    systemMonitor: getSystemMonitorConfig(env),
    businessMetrics: getBusinessMetricsConfig(env),
    logAggregator: getLogAggregatorConfig(env),
  };
};

// Initialize all monitoring components with environment-specific configuration
export const initializeMonitoring = (env: 'development' | 'production' | 'test' = 'development') => {
  const configs = getAllMonitoringConfigs(env);
  
  // Import monitoring components
  const { logger } = require('./logger');
  const { healthCheckManager } = require('./health-check-manager');
  const { metricsCollector } = require('./metrics-collector');
  const { errorTracker } = require('./error-tracker');
  const { securityMonitor } = require('./security-monitor');
  const { systemMonitor } = require('./system-monitor');
  const { businessMetricsCollector } = require('./business-metrics');
  const { logAggregator } = require('./log-aggregator');
  
  // Update configurations
  logger.updateOptions(configs.logger);
  healthCheckManager.updateOptions(configs.healthCheck);
  metricsCollector.updateOptions(configs.metricsCollector);
  errorTracker.updateOptions(configs.errorTracker);
  securityMonitor.updateOptions(configs.securityMonitor);
  systemMonitor.updateOptions(configs.systemMonitor);
  businessMetricsCollector.updateOptions(configs.businessMetrics);
  logAggregator.updateOptions(configs.logAggregator);
  
  return {
    logger,
    healthCheckManager,
    metricsCollector,
    errorTracker,
    securityMonitor,
    systemMonitor,
    businessMetricsCollector,
    logAggregator,
  };
};

// Export default configuration for current environment
export const defaultMonitoringConfig = getAllMonitoringConfigs(
  process.env.NODE_ENV as 'development' | 'production' | 'test' || 'development'
);