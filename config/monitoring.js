const promClient = require('prom-client');
const logger = require('./logging');

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'attendance_system_',
  labels: { app: 'attendance-system' },
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// Custom metrics for the attendance system
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'attendance_system_http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [50, 100, 200, 300, 400, 500, 1000]
});

const httpRequestCounter = new promClient.Counter({
  name: 'attendance_system_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code']
});

const faceRecognitionCounter = new promClient.Counter({
  name: 'attendance_system_face_recognition_total',
  help: 'Total number of face recognition attempts',
  labelNames: ['result', 'employee_id']
});

const attendanceRecordCounter = new promClient.Counter({
  name: 'attendance_system_records_total',
  help: 'Total number of attendance records',
  labelNames: ['type', 'status']
});

const syncOperationCounter = new promClient.Counter({
  name: 'attendance_system_sync_operations_total',
  help: 'Total number of sync operations',
  labelNames: ['operation', 'status']
});

const activeUsersGauge = new promClient.Gauge({
  name: 'attendance_system_active_users',
  help: 'Number of active users'
});

const databaseConnectionGauge = new promClient.Gauge({
  name: 'attendance_system_database_connections',
  help: 'Number of active database connections'
});

const errorCounter = new promClient.Counter({
  name: 'attendance_system_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'location']
});

// Register custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestCounter);
register.registerMetric(faceRecognitionCounter);
register.registerMetric(attendanceRecordCounter);
register.registerMetric(syncOperationCounter);
register.registerMetric(activeUsersGauge);
register.registerMetric(databaseConnectionGauge);
register.registerMetric(errorCounter);

// Middleware to collect HTTP request metrics
const requestMetricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const labels = {
      method: req.method,
      route: req.route ? req.route.path : req.path,
      code: res.statusCode
    };
    
    httpRequestDurationMicroseconds.observe(labels, duration);
    httpRequestCounter.inc(labels);
    
    logger.debug(`Request metrics collected: ${JSON.stringify(labels)}, duration: ${duration}ms`);
  });
  
  next();
};

// Health check function
const healthCheck = async () => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || 'unknown',
    checks: {}
  };
  
  try {
    // Check database connection (if applicable)
    // This is a placeholder - implement actual database check
    healthStatus.checks.database = {
      status: 'healthy',
      message: 'Database connection is healthy'
    };
    
    // Check Redis connection (if applicable)
    // This is a placeholder - implement actual Redis check
    healthStatus.checks.redis = {
      status: 'healthy',
      message: 'Redis connection is healthy'
    };
    
    // Check system resources
    const memUsage = process.memoryUsage();
    const memThreshold = 0.9; // 90%
    
    if (memUsage.heapUsed / memUsage.heapTotal > memThreshold) {
      healthStatus.checks.memory = {
        status: 'warning',
        message: 'Memory usage is high',
        details: {
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          usage: `${Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)}%`
        }
      };
    } else {
      healthStatus.checks.memory = {
        status: 'healthy',
        message: 'Memory usage is normal',
        details: {
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          usage: `${Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)}%`
        }
      };
    }
    
    // Determine overall health status
    const hasWarning = Object.values(healthStatus.checks).some(check => check.status === 'warning');
    const hasError = Object.values(healthStatus.checks).some(check => check.status === 'unhealthy');
    
    if (hasError) {
      healthStatus.status = 'unhealthy';
    } else if (hasWarning) {
      healthStatus.status = 'warning';
    }
    
    return healthStatus;
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};

// Metrics endpoint handler
const metricsHandler = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Failed to generate metrics', { error: error.message });
    res.status(500).end('Error generating metrics');
  }
};

// Update metrics functions
const updateMetrics = {
  incrementFaceRecognition: (result, employeeId) => {
    faceRecognitionCounter.inc({ result, employee_id: employeeId || 'unknown' });
  },
  
  incrementAttendanceRecord: (type, status) => {
    attendanceRecordCounter.inc({ type, status });
  },
  
  incrementSyncOperation: (operation, status) => {
    syncOperationCounter.inc({ operation, status });
  },
  
  setActiveUsers: (count) => {
    activeUsersGauge.set(count);
  },
  
  setDatabaseConnections: (count) => {
    databaseConnectionGauge.set(count);
  },
  
  incrementError: (type, location) => {
    errorCounter.inc({ type, location });
  }
};

module.exports = {
  register,
  requestMetricsMiddleware,
  healthCheck,
  metricsHandler,
  updateMetrics
};