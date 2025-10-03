const logger = require('./logging');

// Error severity levels
const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Error types
const ErrorType = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATABASE: 'database',
  NETWORK: 'network',
  FACE_RECOGNITION: 'face_recognition',
  SYNC: 'sync',
  SYSTEM: 'system',
  UNKNOWN: 'unknown'
};

// Error reporting configuration
const errorReportingConfig = {
  enabled: process.env.ERROR_REPORTING_ENABLED === 'true',
  logToConsole: process.env.ERROR_LOG_TO_CONSOLE !== 'false',
  logToFile: process.env.ERROR_LOG_TO_FILE !== 'false',
  sendNotifications: process.env.ERROR_SEND_NOTIFICATIONS === 'true',
  notificationEmail: process.env.ERROR_NOTIFICATION_EMAIL || '',
  maxErrorReports: parseInt(process.env.ERROR_MAX_REPORTS) || 100,
  errorReportRetentionDays: parseInt(process.env.ERROR_REPORT_RETENTION_DAYS) || 30
};

// Error report storage (in-memory for now, could be replaced with database storage)
const errorReports = [];
const errorCounts = {};

// Create a new error report
const createErrorReport = (error, context = {}) => {
  const errorReport = {
    id: generateErrorId(),
    timestamp: new Date().toISOString(),
    type: determineErrorType(error),
    severity: determineErrorSeverity(error),
    message: error.message || 'Unknown error',
    stack: error.stack || '',
    context: {
      ...context,
      userAgent: context.userAgent || 'unknown',
      ipAddress: context.ipAddress || 'unknown',
      userId: context.userId || 'anonymous',
      route: context.route || 'unknown',
      method: context.method || 'unknown'
    },
    resolved: false,
    resolvedAt: null,
    resolvedBy: null
  };
  
  // Store error report
  errorReports.unshift(errorReport);
  
  // Limit the number of stored error reports
  if (errorReports.length > errorReportingConfig.maxErrorReports) {
    errorReports.splice(errorReportingConfig.maxErrorReports);
  }
  
  // Update error counts
  const errorKey = `${errorReport.type}:${errorReport.severity}`;
  errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1;
  
  // Log the error
  logError(errorReport);
  
  // Send notification if enabled
  if (errorReportingConfig.sendNotifications && errorReport.severity === ErrorSeverity.CRITICAL) {
    sendErrorNotification(errorReport);
  }
  
  return errorReport;
};

// Generate a unique error ID
const generateErrorId = () => {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Determine error type based on error properties
const determineErrorType = (error) => {
  if (error.name === 'ValidationError') return ErrorType.VALIDATION;
  if (error.name === 'AuthenticationError') return ErrorType.AUTHENTICATION;
  if (error.name === 'AuthorizationError') return ErrorType.AUTHORIZATION;
  if (error.name === 'DatabaseError') return ErrorType.DATABASE;
  if (error.name === 'NetworkError') return ErrorType.NETWORK;
  if (error.name === 'FaceRecognitionError') return ErrorType.FACE_RECOGNITION;
  if (error.name === 'SyncError') return ErrorType.SYNC;
  if (error.code && error.code.startsWith('SYS')) return ErrorType.SYSTEM;
  return ErrorType.UNKNOWN;
};

// Determine error severity based on error properties
const determineErrorSeverity = (error) => {
  if (error.critical) return ErrorSeverity.CRITICAL;
  if (error.severity) return error.severity;
  
  // Default severity based on error type
  switch (determineErrorType(error)) {
    case ErrorType.AUTHENTICATION:
    case ErrorType.AUTHORIZATION:
      return ErrorSeverity.HIGH;
    case ErrorType.DATABASE:
    case ErrorType.FACE_RECOGNITION:
    case ErrorType.SYNC:
      return ErrorSeverity.MEDIUM;
    case ErrorType.VALIDATION:
    case ErrorType.NETWORK:
      return ErrorSeverity.LOW;
    default:
      return ErrorSeverity.MEDIUM;
  }
};

// Log error to appropriate outputs
const logError = (errorReport) => {
  const logMessage = `Error [${errorReport.id}] ${errorReport.type}:${errorReport.severity} - ${errorReport.message}`;
  
  if (errorReportingConfig.logToConsole) {
    console.error(logMessage, errorReport);
  }
  
  if (errorReportingConfig.logToFile) {
    logger.error(logMessage, {
      errorId: errorReport.id,
      type: errorReport.type,
      severity: errorReport.severity,
      context: errorReport.context
    });
  }
};

// Send error notification (placeholder implementation)
const sendErrorNotification = (errorReport) => {
  // This is a placeholder - implement actual notification sending
  // Could send email, Slack notification, etc.
  logger.warn(`Critical error notification would be sent: ${errorReport.id}`);
  
  // Example email notification (would require nodemailer or similar)
  if (errorReportingConfig.notificationEmail) {
    logger.info(`Error notification email would be sent to ${errorReportingConfig.notificationEmail}`);
  }
};

// Get error reports
const getErrorReports = (filters = {}) => {
  let filteredReports = [...errorReports];
  
  if (filters.type) {
    filteredReports = filteredReports.filter(report => report.type === filters.type);
  }
  
  if (filters.severity) {
    filteredReports = filteredReports.filter(report => report.severity === filters.severity);
  }
  
  if (filters.resolved !== undefined) {
    filteredReports = filteredReports.filter(report => report.resolved === filters.resolved);
  }
  
  if (filters.userId) {
    filteredReports = filteredReports.filter(report => report.context.userId === filters.userId);
  }
  
  return filteredReports;
};

// Get error report by ID
const getErrorReport = (errorId) => {
  return errorReports.find(report => report.id === errorId);
};

// Resolve error report
const resolveErrorReport = (errorId, resolvedBy) => {
  const errorReport = getErrorReport(errorId);
  if (errorReport) {
    errorReport.resolved = true;
    errorReport.resolvedAt = new Date().toISOString();
    errorReport.resolvedBy = resolvedBy;
    logger.info(`Error report ${errorId} resolved by ${resolvedBy}`);
    return true;
  }
  return false;
};

// Get error statistics
const getErrorStats = () => {
  const stats = {
    total: errorReports.length,
    resolved: errorReports.filter(report => report.resolved).length,
    unresolved: errorReports.filter(report => !report.resolved).length,
    byType: {},
    bySeverity: {},
    recent: errorReports.filter(report => {
      const reportDate = new Date(report.timestamp);
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      return reportDate > oneDayAgo;
    }).length
  };
  
  // Count by type
  errorReports.forEach(report => {
    stats.byType[report.type] = (stats.byType[report.type] || 0) + 1;
  });
  
  // Count by severity
  errorReports.forEach(report => {
    stats.bySeverity[report.severity] = (stats.bySeverity[report.severity] || 0) + 1;
  });
  
  return stats;
};

// Clean up old error reports
const cleanupOldErrorReports = () => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - errorReportingConfig.errorReportRetentionDays);
  
  const initialCount = errorReports.length;
  
  for (let i = errorReports.length - 1; i >= 0; i--) {
    const reportDate = new Date(errorReports[i].timestamp);
    if (reportDate < cutoffDate) {
      errorReports.splice(i, 1);
    }
  }
  
  const removedCount = initialCount - errorReports.length;
  if (removedCount > 0) {
    logger.info(`Cleaned up ${removedCount} old error reports`);
  }
  
  return removedCount;
};

// Express error handling middleware
const errorHandlingMiddleware = (err, req, res, next) => {
  // Create error report
  const errorReport = createErrorReport(err, {
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip,
    userId: req.user ? req.user.id : 'anonymous',
    route: req.originalUrl,
    method: req.method
  });
  
  // Determine HTTP status code
  let statusCode = 500;
  switch (errorReport.type) {
    case ErrorType.VALIDATION:
      statusCode = 400;
      break;
    case ErrorType.AUTHENTICATION:
      statusCode = 401;
      break;
    case ErrorType.AUTHORIZATION:
      statusCode = 403;
      break;
    case ErrorType.NETWORK:
      statusCode = 503;
      break;
    default:
      statusCode = 500;
  }
  
  // Send error response
  res.status(statusCode).json({
    error: {
      id: errorReport.id,
      message: errorReport.message,
      type: errorReport.type,
      severity: errorReport.severity
    }
  });
};

// Async error wrapper for Express routes
const asyncErrorWrapper = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  ErrorSeverity,
  ErrorType,
  createErrorReport,
  getErrorReports,
  getErrorReport,
  resolveErrorReport,
  getErrorStats,
  cleanupOldErrorReports,
  errorHandlingMiddleware,
  asyncErrorWrapper,
  errorReportingConfig
};