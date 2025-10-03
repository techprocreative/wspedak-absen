# Operations Guide

This comprehensive guide covers monitoring, alerting, incident response, maintenance procedures, and operational best practices for the Attendance System.

## Table of Contents

1. [Operations Overview](#operations-overview)
2. [Monitoring Setup](#monitoring-setup)
3. [Alert Management](#alert-management)
4. [Incident Response](#incident-response)
5. [Maintenance Procedures](#maintenance-procedures)
6. [Scaling Guidelines](#scaling-guidelines)
7. [Disaster Recovery](#disaster-recovery)
8. [Performance Tuning](#performance-tuning)
9. [Operational Best Practices](#operational-best-practices)

## Operations Overview

### Operational Responsibilities

1. **System Monitoring**: Ensure system health and performance
2. **Alert Management**: Respond to alerts and incidents
3. **Maintenance**: Perform regular maintenance tasks
4. **Backup and Recovery**: Maintain data integrity and availability
5. **Security**: Monitor and respond to security threats
6. **Capacity Planning**: Ensure system can handle load

### Key Metrics

#### System Metrics
- **CPU Usage**: Percentage of CPU utilization
- **Memory Usage**: Percentage of RAM utilization
- **Disk Usage**: Percentage of disk space utilization
- **Network Traffic**: Incoming and outgoing network traffic

#### Application Metrics
- **Response Time**: Average API response time
- **Request Rate**: Number of requests per second
- **Error Rate**: Percentage of failed requests
- **Active Users**: Number of concurrent users

#### Business Metrics
- **Check-in Rate**: Number of check-ins per hour
- **Sync Success Rate**: Percentage of successful sync operations
- **Face Recognition Success Rate**: Percentage of successful face recognition attempts

## Monitoring Setup

### Infrastructure Monitoring

#### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'attendance-system'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 5s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']
```

#### Grafana Dashboards

```json
{
  "dashboard": {
    "title": "Attendance System Overview",
    "panels": [
      {
        "title": "System Health",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=\"attendance-system\"}",
            "legendFormat": "Application"
          },
          {
            "expr": "up{job=\"postgres-exporter\"}",
            "legendFormat": "Database"
          },
          {
            "expr": "up{job=\"redis-exporter\"}",
            "legendFormat": "Cache"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "Requests/sec"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])",
            "legendFormat": "Error Rate"
          }
        ]
      }
    ]
  }
}
```

### Application Monitoring

#### Custom Metrics

```typescript
// lib/metrics.ts
import { register, Counter, Histogram, Gauge } from 'prom-client';

// Request counter
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Request duration histogram
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

// Active users gauge
export const activeUsers = new Gauge({
  name: 'active_users',
  help: 'Number of active users',
});

// Sync operations counter
export const syncOperationsTotal = new Counter({
  name: 'sync_operations_total',
  help: 'Total number of sync operations',
  labelNames: ['status'],
});

// Face recognition operations counter
export const faceRecognitionOperationsTotal = new Counter({
  name: 'face_recognition_operations_total',
  help: 'Total number of face recognition operations',
  labelNames: ['status'],
});

// Register all metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);
register.registerMetric(activeUsers);
register.registerMetric(syncOperationsTotal);
register.registerMetric(faceRecognitionOperationsTotal);
```

#### Metrics Middleware

```typescript
// lib/middleware/metrics.ts
import { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDuration } from '@/lib/metrics';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
    
    httpRequestDuration
      .labels(req.method, route)
      .observe(duration);
  });
  
  next();
};
```

### Log Monitoring

#### Structured Logging

```typescript
// lib/logging.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'attendance-system' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

#### Log Aggregation with ELK Stack

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    ports:
      - "5044:5044"
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  elasticsearch-data:
```

## Alert Management

### Alert Rules

#### Prometheus Alert Rules

```yaml
# alert_rules.yml
groups:
  - name: attendance-system
    rules:
      - alert: SystemDown
        expr: up{job="attendance-system"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Attendance system is down"
          description: "Attendance system has been down for more than 1 minute."

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} for the last 5 minutes."

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s for the last 5 minutes."

      - alert: DatabaseDown
        expr: up{job="postgres-exporter"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database is down"
          description: "PostgreSQL database has been down for more than 1 minute."

      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is {{ $value }}% on {{ $labels.instance }}."

      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is {{ $value }}% on {{ $labels.instance }}."

      - alert: DiskSpaceLow
        expr: (1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space detected"
          description: "Disk usage is {{ $value }}% on {{ $labels.instance }}."

      - alert: SyncFailures
        expr: rate(sync_operations_total{status="failed"}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High sync failure rate"
          description: "Sync failure rate is {{ $value }} per second for the last 5 minutes."
```

#### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@yourcompany.com'
  smtp_auth_username: 'alerts@yourcompany.com'
  smtp_auth_password: 'your-app-password'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://127.0.0.1:5001/'

  - name: 'critical-alerts'
    email_configs:
      - to: 'ops-team@yourcompany.com'
        subject: '[CRITICAL] Attendance System Alert'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
        title: 'Critical Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

  - name: 'warning-alerts'
    email_configs:
      - to: 'ops-team@yourcompany.com'
        subject: '[WARNING] Attendance System Alert'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
```

### Notification Channels

#### Slack Integration

```typescript
// lib/notifications/slack.ts
export const sendSlackAlert = async (alert: Alert) => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  const payload = {
    channel: '#alerts',
    username: 'Attendance System Bot',
    icon_emoji: ':warning:',
    attachments: [
      {
        color: alert.severity === 'critical' ? 'danger' : 'warning',
        title: alert.summary,
        text: alert.description,
        fields: [
          {
            title: 'Severity',
            value: alert.severity,
            short: true,
          },
          {
            title: 'Time',
            value: new Date().toISOString(),
            short: true,
          },
        ],
      },
    ],
  };
  
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
  }
};
```

#### Email Notifications

```typescript
// lib/notifications/email.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmailAlert = async (alert: Alert) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: process.env.ALERT_EMAIL_TO,
    subject: `[${alert.severity.toUpperCase()}] Attendance System Alert`,
    html: `
      <h2>${alert.summary}</h2>
      <p>${alert.description}</p>
      <ul>
        <li><strong>Severity:</strong> ${alert.severity}</li>
        <li><strong>Time:</strong> ${new Date().toISOString()}</li>
      </ul>
    `,
  };
  
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send email alert:', error);
  }
};
```

## Incident Response

### Incident Classification

#### Severity Levels

| Severity | Description | Response Time | Escalation |
|----------|-------------|---------------|------------|
| Critical | System down, major impact | 15 minutes | Immediate |
| High | Significant degradation | 1 hour | After 30 mins |
| Medium | Minor issues, limited impact | 4 hours | After 2 hours |
| Low | Cosmetic issues, no impact | 24 hours | After 12 hours |

#### Incident Types

1. **System Outage**: Complete or partial system unavailability
2. **Performance Degradation**: Slow response times, high latency
3. **Data Issues**: Data corruption, sync failures
4. **Security Incidents**: Unauthorized access, data breaches
5. **Infrastructure Issues**: Network, storage, or hardware problems

### Incident Response Process

#### 1. Detection

```typescript
// lib/monitoring/incident-detection.ts
export class IncidentDetector {
  private alertThresholds = {
    errorRate: 0.05, // 5%
    responseTime: 2000, // 2 seconds
    cpuUsage: 80, // 80%
    memoryUsage: 85, // 85%
  };

  async checkSystemHealth(): Promise<Incident[]> {
    const incidents: Incident[] = [];
    
    // Check error rate
    const errorRate = await this.getErrorRate();
    if (errorRate > this.alertThresholds.errorRate) {
      incidents.push({
        type: 'performance',
        severity: 'high',
        title: 'High Error Rate',
        description: `Error rate is ${(errorRate * 100).toFixed(2)}%`,
        timestamp: new Date(),
      });
    }
    
    // Check response time
    const responseTime = await this.getResponseTime();
    if (responseTime > this.alertThresholds.responseTime) {
      incidents.push({
        type: 'performance',
        severity: 'medium',
        title: 'High Response Time',
        description: `Response time is ${responseTime}ms`,
        timestamp: new Date(),
      });
    }
    
    // Check system resources
    const systemMetrics = await this.getSystemMetrics();
    if (systemMetrics.cpu > this.alertThresholds.cpuUsage) {
      incidents.push({
        type: 'infrastructure',
        severity: 'medium',
        title: 'High CPU Usage',
        description: `CPU usage is ${systemMetrics.cpu}%`,
        timestamp: new Date(),
      });
    }
    
    return incidents;
  }
}
```

#### 2. Triage

```typescript
// lib/monitoring/incident-triage.ts
export class IncidentTriage {
  async triageIncident(incident: Incident): Promise<TriageResult> {
    // Determine severity
    const severity = this.determineSeverity(incident);
    
    // Check for related incidents
    const relatedIncidents = await this.findRelatedIncidents(incident);
    
    // Determine impact
    const impact = await this.assessImpact(incident);
    
    // Create triage result
    return {
      incident,
      severity,
      relatedIncidents,
      impact,
      recommendedActions: this.getRecommendedActions(incident, severity),
    };
  }
  
  private determineSeverity(incident: Incident): string {
    // Logic to determine severity based on incident type and metrics
    if (incident.type === 'system' && incident.title.includes('down')) {
      return 'critical';
    } else if (incident.type === 'security') {
      return 'critical';
    } else if (incident.type === 'performance') {
      return 'high';
    } else {
      return 'medium';
    }
  }
}
```

#### 3. Response

```typescript
// lib/monitoring/incident-response.ts
export class IncidentResponse {
  async respondToIncident(incident: Incident): Promise<ResponseResult> {
    // Acknowledge incident
    await this.acknowledgeIncident(incident);
    
    // Notify stakeholders
    await this.notifyStakeholders(incident);
    
    // Begin investigation
    const investigation = await this.investigateIncident(incident);
    
    // Implement fix
    const fixResult = await this.implementFix(incident, investigation);
    
    // Verify resolution
    const verification = await this.verifyResolution(incident);
    
    return {
      incident,
      investigation,
      fixResult,
      verification,
    };
  }
  
  private async acknowledgeIncident(incident: Incident): Promise<void> {
    // Update incident status in tracking system
    // Send initial notification
  }
  
  private async notifyStakeholders(incident: Incident): Promise<void> {
    // Send notifications based on severity
    if (incident.severity === 'critical') {
      await this.sendCriticalNotification(incident);
    } else {
      await this.sendStandardNotification(incident);
    }
  }
}
```

#### 4. Resolution

```typescript
// lib/monitoring/incident-resolution.ts
export class IncidentResolution {
  async resolveIncident(incident: Incident, resolution: Resolution): Promise<void> {
    // Apply resolution
    await this.applyResolution(incident, resolution);
    
    // Verify fix
    const verification = await this.verifyFix(incident);
    
    if (verification.success) {
      // Update incident status
      await this.updateIncidentStatus(incident.id, 'resolved');
      
      // Send resolution notification
      await this.sendResolutionNotification(incident, resolution);
      
      // Create post-incident report
      await this.createPostIncidentReport(incident, resolution);
    } else {
      // Escalate if fix doesn't work
      await this.escalateIncident(incident, verification.issues);
    }
  }
}
```

### Post-Incident Review

#### Review Template

```markdown
# Post-Incident Review: [Incident Title]

## Incident Summary
- **Date**: [Date of incident]
- **Duration**: [Start time] - [End time]
- **Severity**: [Critical/High/Medium/Low]
- **Impact**: [Description of impact]

## Timeline
- [Time]: [Event description]
- [Time]: [Event description]
- [Time]: [Event description]

## Root Cause Analysis
- **Primary Cause**: [Description]
- **Contributing Factors**: [List]

## Resolution
- **Actions Taken**: [List]
- **Time to Resolution**: [Duration]

## Lessons Learned
- **What Went Well**: [List]
- **What Could Be Improved**: [List]

## Action Items
- [ ] [Action item 1] - [Owner] - [Due date]
- [ ] [Action item 2] - [Owner] - [Due date]
- [ ] [Action item 3] - [Owner] - [Due date]

## Prevention Measures
- [ ] [Prevention measure 1] - [Owner] - [Due date]
- [ ] [Prevention measure 2] - [Owner] - [Due date]
```

## Maintenance Procedures

### Regular Maintenance Tasks

#### Daily Tasks

```bash
#!/bin/bash
# scripts/daily-maintenance.sh

echo "Starting daily maintenance tasks..."

# Check system health
curl -f http://localhost:3000/api/health || echo "Health check failed"

# Check disk space
df -h | grep -E "/$" | awk '{print $5}' | sed 's/%//' | while read usage; do
  if [ $usage -gt 80 ]; then
    echo "Warning: Disk usage is ${usage}%"
  fi
done

# Check log sizes
find /var/log -name "*.log" -size +100M -exec echo "Large log file: {}" \;

# Rotate logs
logrotate /etc/logrotate.d/attendance-system

# Backup database
pg_dump attendance > /backups/daily/attendance_$(date +%Y%m%d).sql

echo "Daily maintenance tasks completed"
```

#### Weekly Tasks

```bash
#!/bin/bash
# scripts/weekly-maintenance.sh

echo "Starting weekly maintenance tasks..."

# Update system packages
apt update && apt upgrade -y

# Clean up old backups
find /backups -name "*.sql" -mtime +7 -delete

# Optimize database
psql -d attendance -c "VACUUM ANALYZE;"

# Check SSL certificate expiry
if openssl x509 -checkend 2592000 -noout -in /etc/ssl/certs/attendance-system.crt; then
  echo "SSL certificate is valid for at least 30 days"
else
  echo "Warning: SSL certificate expires in less than 30 days"
fi

# Restart services if needed
docker-compose restart

echo "Weekly maintenance tasks completed"
```

#### Monthly Tasks

```bash
#!/bin/bash
# scripts/monthly-maintenance.sh

echo "Starting monthly maintenance tasks..."

# Security updates
apt list --upgradable | grep -i security

# Review user accounts
psql -d attendance -c "SELECT id, email, last_login FROM users WHERE last_login < NOW() - INTERVAL '90 days';"

# Check for unused indexes
psql -d attendance -c "SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;"

# Performance analysis
psql -d attendance -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Update documentation
# (Manual process)

echo "Monthly maintenance tasks completed"
```

### Database Maintenance

#### Database Optimization

```sql
-- Database maintenance script

-- Analyze table statistics
ANALYZE attendance;
ANALYZE users;
ANALYZE face_recognition_data;

-- Rebuild indexes
REINDEX DATABASE attendance;

-- Update table statistics
VACUUM ANALYZE attendance;
VACUUM ANALYZE users;
VACUUM ANALYZE face_recognition_data;

-- Check for table bloat
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check for unused indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE idx_scan = 0
ORDER BY schemaname, tablename, indexname;
```

#### Database Backup Script

```bash
#!/bin/bash
# scripts/backup-database.sh

BACKUP_DIR="/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="attendance"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -h localhost -U postgres -d $DB_NAME | gzip > $BACKUP_DIR/attendance_$DATE.sql.gz

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/attendance_$DATE.sql.gz s3://your-backup-bucket/database/

# Clean up old backups (keep last 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Database backup completed: attendance_$DATE.sql.gz"
```

### Application Maintenance

#### Application Update Script

```bash
#!/bin/bash
# scripts/update-application.sh

echo "Starting application update..."

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Run tests
npm test

# Build application
npm run build

# Restart application
docker-compose down
docker-compose up -d

# Verify update
sleep 30
curl -f http://localhost:3000/api/health || echo "Health check failed after update"

echo "Application update completed"
```

#### Log Rotation Configuration

```bash
# /etc/logrotate.d/attendance-system
/var/log/attendance-system/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose restart attendance-app
    endscript
}
```

## Scaling Guidelines

### Horizontal Scaling

#### Load Balancer Configuration

```nginx
# nginx.conf
upstream attendance_system {
    server app1:3000;
    server app2:3000;
    server app3:3000;
}

server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://attendance_system;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Docker Swarm Scaling

```bash
# Scale application services
docker service scale attendance_system_app=3

# Update service with new configuration
docker service update \
  --image attendance-system:latest \
  --replicas 3 \
  attendance_system_app
```

#### Kubernetes Scaling

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: attendance-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: attendance-system
  template:
    metadata:
      labels:
        app: attendance-system
    spec:
      containers:
      - name: attendance-system
        image: attendance-system:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: attendance-system-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: attendance-system
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Vertical Scaling

#### Resource Optimization

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  attendance-app:
    build:
      context: .
      dockerfile: Dockerfile
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
    environment:
      - NODE_OPTIONS=--max-old-space-size=1536
```

#### Performance Tuning

```typescript
// lib/performance/optimization.ts
export class PerformanceOptimizer {
  // Optimize database queries
  optimizeQueries() {
    // Add appropriate indexes
    // Use query optimization
    // Implement connection pooling
  }
  
  // Optimize caching
  optimizeCaching() {
    // Implement Redis caching
    // Use CDN for static assets
    // Implement browser caching
  }
  
  // Optimize bundle size
  optimizeBundle() {
    // Code splitting
    // Tree shaking
    // Minification
  }
}
```

### Database Scaling

#### Read Replicas

```sql
-- Set up read replicas
-- This would be configured in your database provider

-- Connection string for read replicas
DATABASE_URL_READ=postgresql://user:password@replica-host:5432/attendance
```

#### Database Sharding

```typescript
// lib/db/sharding.ts
export class DatabaseSharding {
  private shards = {
    shard1: 'postgresql://user:pass@host1:5432/attendance',
    shard2: 'postgresql://user:pass@host2:5432/attendance',
    shard3: 'postgresql://user:pass@host3:5432/attendance',
  };
  
  getShard(userId: string): string {
    // Simple hash-based sharding
    const hash = this.hashString(userId);
    const shardIndex = hash % Object.keys(this.shards).length;
    return Object.values(this.shards)[shardIndex];
  }
  
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
```

## Disaster Recovery

### Backup Strategy

#### 3-2-1 Backup Rule

- **3 copies** of data
- **2 different media** types
- **1 off-site** backup

#### Backup Configuration

```bash
#!/bin/bash
# scripts/disaster-recovery-backup.sh

BACKUP_DIR="/backups/disaster-recovery"
DATE=$(date +%Y%m%d_%H%M%S)

# Create full backup
tar -czf $BACKUP_DIR/full_backup_$DATE.tar.gz \
  /opt/attendance-system \
  /var/lib/postgresql \
  /etc/ssl/certs

# Upload to cloud storage
aws s3 cp $BACKUP_DIR/full_backup_$DATE.tar.gz s3://your-disaster-recovery-bucket/

# Create backup metadata
cat > $BACKUP_DIR/backup_metadata_$DATE.json << EOF
{
  "date": "$DATE",
  "type": "full",
  "size": "$(stat -c%s $BACKUP_DIR/full_backup_$DATE.tar.gz)",
  "checksum": "$(sha256sum $BACKUP_DIR/full_backup_$DATE.tar.gz | awk '{print $1}')"
}
EOF

# Upload metadata
aws s3 cp $BACKUP_DIR/backup_metadata_$DATE.json s3://your-disaster-recovery-bucket/

echo "Disaster recovery backup completed: full_backup_$DATE.tar.gz"
```

### Recovery Procedures

#### System Recovery

```bash
#!/bin/bash
# scripts/disaster-recovery-restore.sh

BACKUP_FILE=$1
RESTORE_DIR="/tmp/attendance-restore"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

# Download backup from cloud storage
aws s3 cp s3://your-disaster-recovery-bucket/$BACKUP_FILE $RESTORE_DIR/

# Extract backup
tar -xzf $RESTORE_DIR/$BACKUP_FILE -C /

# Restore database
pg_restore -h localhost -U postgres -d attendance /tmp/attendance-restore/var/lib/postgresql/attendance.dump

# Restart services
docker-compose down
docker-compose up -d

# Verify recovery
sleep 30
curl -f http://localhost:3000/api/health || echo "Health check failed after restore"

echo "Disaster recovery restore completed"
```

#### Data Recovery

```typescript
// lib/recovery/data-recovery.ts
export class DataRecovery {
  async recoverAttendanceData(backupPath: string): Promise<void> {
    // Validate backup
    const isValid = await this.validateBackup(backupPath);
    if (!isValid) {
      throw new Error('Invalid backup file');
    }
    
    // Create recovery point
    await this.createRecoveryPoint();
    
    // Restore data
    await this.restoreData(backupPath);
    
    // Verify data integrity
    const isIntegrityValid = await this.verifyDataIntegrity();
    if (!isIntegrityValid) {
      throw new Error('Data integrity check failed');
    }
    
    // Update sync status
    await this.updateSyncStatus();
  }
  
  private async validateBackup(backupPath: string): Promise<boolean> {
    // Validate backup file format
    // Check checksum
    // Verify metadata
    return true;
  }
  
  private async createRecoveryPoint(): Promise<void> {
    // Create current state backup
    // Store recovery point metadata
  }
  
  private async restoreData(backupPath: string): Promise<void> {
    // Restore database tables
    // Restore file storage
    // Update indexes
  }
  
  private async verifyDataIntegrity(): Promise<boolean> {
    // Check record counts
    // Verify data relationships
    // Validate data formats
    return true;
  }
}
```

### Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO)

| System Component | RTO | RPO |
|------------------|-----|-----|
| Application | 4 hours | 1 hour |
| Database | 2 hours | 15 minutes |
| File Storage | 8 hours | 4 hours |
| Configuration | 1 hour | 15 minutes |

## Performance Tuning

### Application Performance

#### Code Optimization

```typescript
// lib/performance/code-optimization.ts
export class CodeOptimizer {
  // Optimize React components
  optimizeComponents() {
    // Use React.memo for expensive components
    // Implement virtual scrolling for large lists
    // Use useCallback and useMemo for expensive operations
  }
  
  // Optimize API calls
  optimizeApiCalls() {
    // Implement request batching
    // Use GraphQL for efficient data fetching
    // Implement response caching
  }
  
  // Optimize state management
  optimizeStateManagement() {
    // Use efficient state selectors
    // Implement state normalization
    // Minimize state updates
  }
}
```

#### Database Optimization

```sql
-- Database optimization queries

-- Identify slow queries
SELECT 
  query,
  mean_time,
  calls,
  total_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_attendance_user_date 
ON attendance(user_id, date);

-- Optimize table structure
ALTER TABLE attendance 
CLUSTER ON idx_attendance_user_date;

-- Update statistics
ANALYZE attendance;
```

### Infrastructure Performance

#### Server Optimization

```bash
#!/bin/bash
# scripts/server-optimization.sh

# Optimize kernel parameters
echo 'net.core.somaxconn = 65535' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_max_syn_backlog = 65535' >> /etc/sysctl.conf
echo 'vm.swappiness = 10' >> /etc/sysctl.conf

# Apply kernel parameters
sysctl -p

# Optimize file system
echo 'tmpfs /tmp tmpfs defaults,noatime,mode=1777 0 0' >> /etc/fstab
mount -o remount /tmp

# Optimize Docker
echo '{"storage-driver": "overlay2", "storage-opts": ["overlay2.override_kernel_check=true"]}' > /etc/docker/daemon.json
systemctl restart docker
```

#### Network Optimization

```bash
#!/bin/bash
# scripts/network-optimization.sh

# Optimize TCP settings
echo 'net.core.rmem_max = 16777216' >> /etc/sysctl.conf
echo 'net.core.wmem_max = 16777216' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_rmem = 4096 87380 16777216' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_wmem = 4096 65536 16777216' >> /etc/sysctl.conf

# Apply network settings
sysctl -p

# Configure firewall rules
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## Operational Best Practices

### Documentation

#### Runbook Template

```markdown
# Runbook: [Procedure Name]

## Purpose
[Brief description of what this runbook accomplishes]

## Prerequisites
[List of prerequisites for this procedure]

## Steps
1. [Step 1 description]
   - Command: `command to run`
   - Expected output: [description]
   - Verification: [how to verify step completed]

2. [Step 2 description]
   - Command: `command to run`
   - Expected output: [description]
   - Verification: [how to verify step completed]

## Troubleshooting
| Symptom | Possible Cause | Solution |
|---------|----------------|----------|
| [Symptom] | [Cause] | [Solution] |

## Rollback Procedure
[Steps to undo the procedure if something goes wrong]

## Related Documents
- [Link to related documents]
- [Link to API documentation]
- [Link to system architecture]
```

### Change Management

#### Change Request Process

1. **Submit Change Request**
   - Description of change
   - Reason for change
   - Risk assessment
   - Rollback plan

2. **Review and Approval**
   - Technical review
   - Business impact assessment
   - Security review

3. **Implementation**
   - Schedule change
   - Implement during maintenance window
   - Monitor for issues

4. **Verification**
   - Test functionality
   - Monitor performance
   - Verify success criteria

5. **Documentation**
   - Update runbooks
   - Document changes
   - Communicate to stakeholders

### Security Operations

#### Security Monitoring

```typescript
// lib/security/monitoring.ts
export class SecurityMonitor {
  async monitorSuspiciousActivity(): Promise<void> {
    // Monitor for failed login attempts
    const failedLogins = await this.getFailedLogins();
    if (failedLogins > 10) {
      await this.triggerSecurityAlert('High number of failed logins');
    }
    
    // Monitor for unusual API usage
    const unusualApiUsage = await this.detectUnusualApiUsage();
    if (unusualApiUsage) {
      await this.triggerSecurityAlert('Unusual API usage detected');
    }
    
    // Monitor for data access patterns
    const unusualDataAccess = await this.detectUnusualDataAccess();
    if (unusualDataAccess) {
      await this.triggerSecurityAlert('Unusual data access pattern');
    }
  }
  
  private async triggerSecurityAlert(message: string): Promise<void> {
    // Send security alert
    // Block suspicious IP addresses
    // Notify security team
  }
}
```

#### Incident Response for Security Incidents

1. **Detection**
   - Monitor security alerts
   - Review logs for suspicious activity
   - Analyze system anomalies

2. **Containment**
   - Isolate affected systems
   - Block malicious IP addresses
   - Disable compromised accounts

3. **Investigation**
   - Analyze attack vectors
   - Identify compromised data
   - Document findings

4. **Recovery**
   - Restore systems from clean backups
   - Patch vulnerabilities
   - Reset compromised credentials

5. **Lessons Learned**
   - Document incident
   - Improve security measures
   - Update monitoring rules

---

## Contact Information

### Operations Team

- **Primary Contact**: ops-team@yourcompany.com
- **On-Call Engineer**: +1-555-0123
- **Escalation Manager**: ops-manager@yourcompany.com

### Emergency Contacts

- **Critical Incident**: +1-555-0124
- **Security Incident**: security@yourcompany.com
- **Data Center Emergency**: +1-555-0125

### Useful Links

- [System Status](https://status.yourcompany.com)
- [Monitoring Dashboard](https://monitoring.yourcompany.com)
- [Documentation](https://docs.yourcompany.com)
- [Runbook Repository](https://github.com/yourcompany/runbooks)

---

Last updated: January 1, 2024