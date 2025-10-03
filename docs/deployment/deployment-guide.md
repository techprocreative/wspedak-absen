# Deployment Guide

This comprehensive guide covers deployment options for the Attendance System, with special focus on Synology DS223J and Docker deployments.

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Prerequisites](#prerequisites)
3. [Docker Deployment](#docker-deployment)
4. [Synology DS223J Deployment](#synology-ds223j-deployment)
5. [Cloud Deployment](#cloud-deployment)
6. [Environment Configuration](#environment-configuration)
7. [SSL/TLS Setup](#ssltls-setup)
8. [Backup Procedures](#backup-procedures)
9. [Monitoring Setup](#monitoring-setup)
10. [Troubleshooting Deployment](#troubleshooting-deployment)

## Deployment Overview

### Deployment Options

1. **Docker Deployment**: Containerized deployment for any environment
2. **Synology DS223J**: Optimized deployment for Synology NAS devices
3. **Cloud Deployment**: Deployment to cloud platforms (AWS, GCP, Azure)
4. **Traditional Deployment**: Direct server deployment

### Architecture Considerations

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Application   │  │   Application   │  │   Application   │  │
│  │   Instance 1    │  │   Instance 2    │  │   Instance 3    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Database      │  │   Cache         │  │   File Storage  │  │
│  │   (Supabase)    │  │   (Redis)       │  │   (Local)       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Monitoring    │  │   Logging       │  │   Backup        │  │
│  │   System        │  │   System        │  │   System        │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### System Requirements

#### Minimum Requirements
- **CPU**: 2 cores (2.0 GHz)
- **RAM**: 4GB
- **Storage**: 20GB available space
- **Network**: 100 Mbps

#### Recommended Requirements
- **CPU**: 4 cores (2.5 GHz)
- **RAM**: 8GB
- **Storage**: 50GB available space
- **Network**: 1 Gbps

#### Synology DS223J Specific
- **CPU**: Realtek RTD1296 Quad-core 1.4 GHz
- **RAM**: 2GB DDR4
- **Storage**: 2 x 3.5" SATA HDD/SSD bays
- **Network**: Gigabit Ethernet

### Software Requirements

#### Required Software
- **Docker**: 20.x or later
- **Docker Compose**: 2.x or later
- **Git**: 2.x or later
- **Node.js**: 18.x or later (for manual deployment)

#### External Services
- **Supabase Account**: For cloud database and authentication
- **Domain Name**: For production deployment
- **SSL Certificate**: For HTTPS

### Network Requirements

#### Required Ports
- **80**: HTTP (redirect to HTTPS)
- **443**: HTTPS
- **3000**: Application (internal)
- **5432**: PostgreSQL (if using local database)
- **6379**: Redis (if using caching)

#### Firewall Configuration
```bash
# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow SSH (for management)
sudo ufw allow 22

# Enable firewall
sudo ufw enable
```

## Docker Deployment

### Option 1: Docker Compose (Recommended)

#### 1. Prepare Environment

```bash
# Clone the repository
git clone https://github.com/your-username/attendance-system.git
cd attendance-system

# Copy environment files
cp .env.example .env
cp .env.production .env.production
```

#### 2. Configure Environment

Edit `.env` file:

```bash
# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=Attendance System
NEXT_PUBLIC_APP_VERSION=1.0.0

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# Database (if using local)
DATABASE_URL=postgresql://username:password@postgres:5432/attendance

# Redis (if using)
REDIS_URL=redis://redis:6379

# Email Configuration
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
```

#### 3. Configure Docker Compose

Edit `docker-compose.yml`:

```yaml
version: '3.8'

services:
  attendance-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: attendance-system
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - attendance-data:/app/data
      - attendance-logs:/app/logs
    depends_on:
      - postgres
      - redis
    networks:
      - attendance-network

  postgres:
    image: postgres:14-alpine
    container_name: attendance-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - attendance-network

  redis:
    image: redis:7-alpine
    container_name: attendance-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    networks:
      - attendance-network

  nginx:
    image: nginx:alpine
    container_name: attendance-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - attendance-app
    networks:
      - attendance-network

volumes:
  attendance-data:
  attendance-logs:
  postgres-data:
  redis-data:

networks:
  attendance-network:
    driver: bridge
```

#### 4. Deploy Application

```bash
# Build and start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f attendance-app
```

#### 5. Verify Deployment

```bash
# Check health endpoint
curl http://localhost:3000/api/health

# Check application
curl http://localhost/api/health
```

### Option 2: Docker Swarm

#### 1. Initialize Swarm

```bash
# Initialize swarm
docker swarm init

# Or join existing swarm
docker swarm join --token <token> <manager-ip>:2377
```

#### 2. Deploy Stack

```bash
# Deploy stack
docker stack deploy -c docker-compose.yml attendance

# Check services
docker service ls

# Check logs
docker service logs attendance_attendance-app
```

### Option 3: Kubernetes

#### 1. Create Kubernetes Manifests

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: attendance-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: attendance-app
  template:
    metadata:
      labels:
        app: attendance-app
    spec:
      containers:
      - name: attendance-app
        image: attendance-system:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: NEXT_PUBLIC_SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: attendance-secrets
              key: supabase-url
```

#### 2. Deploy to Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/

# Check deployment
kubectl get pods

# Check services
kubectl get services
```

## Synology DS223J Deployment

### Hardware Considerations

The Synology DS223J has specific hardware constraints:
- **CPU**: Realtek RTD1296 Quad-core 1.4 GHz
- **RAM**: 2GB DDR4
- **Storage**: 2 x 3.5" SATA HDD/SSD bays
- **Network**: Gigabit Ethernet

### Preparation

#### 1. Synology Setup

1. **Install DSM 7.0 or later**
2. **Enable SSH access**:
   - Control Panel → Terminal & SNMP → Enable SSH service
3. **Install Docker**:
   - Package Center → Docker → Install
4. **Create shared folder**:
   - Control Panel → Shared Folder → Create
   - Name: `docker`
   - Permissions: Read/Write for admin

#### 2. Network Configuration

1. **Set static IP** (recommended):
   - Control Panel → Network → Network Interface
   - Configure IPv4 → Use manual configuration
2. **Configure port forwarding** (if needed):
   - Router settings → Port forwarding
   - Forward ports 80 and 443 to Synology IP

### Deployment Methods

#### Option 1: Automated Deployment Script

```bash
# Use the provided deployment script
./scripts/deploy/deploy-to-synology.sh

# Script will:
# - Connect to Synology via SSH
# - Create necessary directories
# - Copy application files
# - Configure Docker
# - Start the application
```

#### Option 2: Manual Deployment

##### 1. Prepare Files

```bash
# Create deployment directory on Synology
ssh admin@synology-ip "mkdir -p /volume1/docker/attendance-system"

# Copy files to Synology
scp -r . admin@synology-ip:/volume1/docker/attendance-system/
```

##### 2. Configure Environment

```bash
# SSH into Synology
ssh admin@synology-ip

# Navigate to application directory
cd /volume1/docker/attendance-system

# Copy environment file
cp .env.synology .env

# Edit environment file
nano .env
```

##### 3. Deploy with Docker Compose

```bash
# Build and start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

#### Option 3: Synology Docker GUI

##### 1. Prepare Image

```bash
# Build image locally
docker build -t attendance-system:latest .

# Save image
docker save attendance-system:latest > attendance-system.tar

# Transfer to Synology
scp attendance-system.tar admin@synology-ip:/volume1/docker/
```

##### 2. Load Image in Synology

1. **Open Docker application**
2. **Image → Add → Add from file**
3. **Select attendance-system.tar**
4. **Wait for import to complete**

##### 3. Create Container

1. **Container → Create**
2. **Select attendance-system image**
3. **Configure settings**:
   - Container name: `attendance-system`
   - Port mapping: `3000:3000`
   - Volume mapping: `/volume1/docker/attendance-system/data:/app/data`
   - Environment variables: Copy from .env file
4. **Start container**

### Synology-Specific Configuration

#### Resource Limits

```yaml
# docker-compose.synology.yml
version: '3.8'

services:
  attendance-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: attendance-system
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - attendance-data:/app/data
      - attendance-logs:/app/logs
    # Resource constraints for DS223J
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    # Health check
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  attendance-data:
    driver: local
  attendance-logs:
    driver: local
```

#### Performance Optimization

```bash
# Optimize for low memory
echo 'NODE_OPTIONS="--max-old-space-size=256"' >> .env

# Enable swap file (if needed)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Verification

```bash
# Check application health
curl http://localhost:3000/api/health

# Check from external network
curl http://your-synology-ip:3000/api/health

# Check Docker logs
docker logs attendance-system
```

## Cloud Deployment

### AWS Deployment

#### Option 1: ECS (Elastic Container Service)

##### 1. Create ECR Repository

```bash
# Create repository
aws ecr create-repository --repository-name attendance-system

# Login to ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-west-2.amazonaws.com

# Build and push image
docker build -t attendance-system .
docker tag attendance-system:latest <account-id>.dkr.ecr.us-west-2.amazonaws.com/attendance-system:latest
docker push <account-id>.dkr.ecr.us-west-2.amazonaws.com/attendance-system:latest
```

##### 2. Create ECS Task Definition

```json
{
  "family": "attendance-system",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "attendance-system",
      "image": "<account-id>.dkr.ecr.us-west-2.amazonaws.com/attendance-system:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/attendance-system",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

##### 3. Create ECS Service

```bash
# Create service
aws ecs create-service \
  --cluster attendance-cluster \
  --service-name attendance-service \
  --task-definition attendance-system \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
```

#### Option 2: Elastic Beanstalk

##### 1. Create Application

```bash
# Install EB CLI
pip install awsebcli

# Initialize application
eb init attendance-system

# Create environment
eb create production
```

##### 2. Deploy Application

```bash
# Deploy
eb deploy

# Check status
eb status
```

### Google Cloud Platform Deployment

#### Option 1: Cloud Run

##### 1. Build and Deploy

```bash
# Build image
gcloud builds submit --tag gcr.io/PROJECT-ID/attendance-system

# Deploy to Cloud Run
gcloud run deploy attendance-system \
  --image gcr.io/PROJECT-ID/attendance-system \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Option 2: GKE (Google Kubernetes Engine)

##### 1. Create Cluster

```bash
# Create cluster
gcloud container clusters create attendance-cluster \
  --zone us-central1-a \
  --num-nodes 2
```

##### 2. Deploy Application

```bash
# Apply manifests
kubectl apply -f k8s/

# Check deployment
kubectl get pods
```

### Azure Deployment

#### Option 1: Container Instances

##### 1. Create Container Group

```bash
# Create resource group
az group create --name attendance-rg --location eastus

# Deploy container
az container create \
  --resource-group attendance-rg \
  --name attendance-system \
  --image attendance-system:latest \
  --cpu 1 \
  --memory 2 \
  --ports 3000
```

#### Option 2: Azure Kubernetes Service (AKS)

##### 1. Create Cluster

```bash
# Create cluster
az aks create --resource-group attendance-rg --name attendance-cluster --node-count 2
```

##### 2. Deploy Application

```bash
# Get credentials
az aks get-credentials --resource-group attendance-rg --name attendance-cluster

# Deploy
kubectl apply -f k8s/
```

## Environment Configuration

### Production Environment Variables

```bash
# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=Attendance System
NEXT_PUBLIC_APP_VERSION=1.0.0
PORT=3000

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
SESSION_SECRET=your-session-secret

# Database (if using local)
DATABASE_URL=postgresql://username:password@localhost:5432/attendance
POSTGRES_DB=attendance
POSTGRES_USER=attendance
POSTGRES_PASSWORD=your-password

# Redis (if using)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourcompany.com

# File Storage
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf

# Logging
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# Monitoring
SENTRY_DSN=your-sentry-dsn
ENABLE_METRICS=true
METRICS_PORT=9090

# Performance
NODE_OPTIONS=--max-old-space-size=1024
ENABLE_COMPRESSION=true
ENABLE_CACHING=true
```

### Environment-Specific Files

#### Development (.env.development)

```bash
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_HOT_RELOAD=true
```

#### Staging (.env.staging)

```bash
NODE_ENV=staging
LOG_LEVEL=info
ENABLE_METRICS=true
```

#### Production (.env.production)

```bash
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_METRICS=true
ENABLE_COMPRESSION=true
```

## SSL/TLS Setup

### Option 1: Let's Encrypt (Recommended)

#### 1. Install Certbot

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx
```

#### 2. Generate Certificate

```bash
# Generate certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test renewal
sudo certbot renew --dry-run
```

#### 3. Configure Nginx

```nginx
# /etc/nginx/sites-available/attendance-system
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: Cloudflare

#### 1. Configure Cloudflare

1. **Sign up for Cloudflare account**
2. **Add your domain**
3. **Update nameservers**
4. **Configure SSL/TLS**:
   - SSL/TLS → Overview → Full (Strict)
   - Edge Certificates → Always Use HTTPS

#### 2. Configure Origin Server

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option 3: Self-Signed Certificate (Development)

#### 1. Generate Certificate

```bash
# Generate private key
openssl genrsa -out private.key 2048

# Generate certificate
openssl req -new -x509 -key private.key -out certificate.crt -days 365
```

#### 2. Configure Nginx

```nginx
server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:3000;
    }
}
```

## Backup Procedures

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

# Configuration
BACKUP_DIR="/backups"
APP_DIR="/opt/attendance-system"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="attendance_backup_$DATE"

# Create backup directory
mkdir -p $BACKUP_DIR/$BACKUP_NAME

# Backup application files
tar -czf $BACKUP_DIR/$BACKUP_NAME/app.tar.gz -C $APP_DIR .

# Backup database (if using local)
docker exec attendance-db pg_dump -U attendance attendance > $BACKUP_DIR/$BACKUP_NAME/database.sql

# Backup Docker volumes
docker run --rm -v attendance-data:/data -v $BACKUP_DIR/$BACKUP_NAME:/backup alpine tar czf /backup/data.tar.gz -C /data .

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/$BACKUP_NAME s3://your-backup-bucket/

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -type d -name "attendance_backup_*" -mtime +30 -exec rm -rf {} \;

echo "Backup completed: $BACKUP_NAME"
```

### Backup Schedule

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /opt/attendance-system/scripts/backup.sh

# Weekly full backup on Sunday at 1 AM
0 1 * * 0 /opt/attendance-system/scripts/full-backup.sh
```

### Restore Procedure

```bash
#!/bin/bash
# restore.sh

BACKUP_NAME=$1
BACKUP_DIR="/backups"
APP_DIR="/opt/attendance-system"

if [ -z "$BACKUP_NAME" ]; then
    echo "Usage: $0 <backup_name>"
    exit 1
fi

# Stop application
docker-compose down

# Restore application files
tar -xzf $BACKUP_DIR/$BACKUP_NAME/app.tar.gz -C $APP_DIR

# Restore database (if using local)
docker exec -i attendance-db psql -U attendance attendance < $BACKUP_DIR/$BACKUP_NAME/database.sql

# Restore Docker volumes
docker run --rm -v attendance-data:/data -v $BACKUP_DIR/$BACKUP_NAME:/backup alpine tar xzf /backup/data.tar.gz -C /data

# Start application
docker-compose up -d

echo "Restore completed: $BACKUP_NAME"
```

## Monitoring Setup

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'attendance-system'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: '/api/metrics'
    scrape_interval: 5s
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Attendance System",
    "panels": [
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ]
      }
    ]
  }
}
```

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

HEALTH_URL="http://localhost:3000/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "Health check passed"
    exit 0
else
    echo "Health check failed with status $RESPONSE"
    # Send alert
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"Attendance System health check failed"}' \
        $SLACK_WEBHOOK_URL
    exit 1
fi
```

## Troubleshooting Deployment

### Common Issues

#### Docker Issues

| Problem | Symptoms | Solution |
|---------|----------|----------|
| Container won't start | Exit code 1, error logs | Check logs, verify environment variables |
| Port conflicts | Port already in use | Change port mapping, stop conflicting services |
| Out of memory | OOM errors | Increase memory limits, optimize application |
| Network issues | Can't connect to database | Check network configuration, verify connectivity |

#### Synology Issues

| Problem | Symptoms | Solution |
|---------|----------|----------|
| Low performance | Slow response times | Optimize for low memory, reduce resource usage |
| Storage full | Can't write files | Clean up old files, expand storage |
| Docker won't start | Service unavailable | Restart Docker service, check disk space |
| Network issues | Can't access from external | Check port forwarding, firewall settings |

#### Cloud Issues

| Problem | Symptoms | Solution |
|---------|----------|----------|
| High costs | Unexpected billing | Monitor resource usage, optimize configuration |
| Deployment failures | Rollback errors | Check logs, verify configuration |
| Performance issues | Slow response times | Scale resources, optimize queries |
| Security issues | Unauthorized access | Review security groups, update credentials |

### Diagnostic Commands

#### Docker Diagnostics

```bash
# Check container status
docker ps -a

# View container logs
docker logs attendance-system

# Check resource usage
docker stats

# Inspect container
docker inspect attendance-system
```

#### System Diagnostics

```bash
# Check system resources
top
htop
df -h
free -h

# Check network connectivity
ping google.com
netstat -tlnp

# Check disk usage
du -sh /var/lib/docker/
```

#### Application Diagnostics

```bash
# Check application health
curl http://localhost:3000/api/health

# Check database connection
curl http://localhost:3000/api/health/database

# Check metrics
curl http://localhost:3000/api/metrics
```

### Performance Tuning

#### Database Optimization

```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Analyze table statistics
ANALYZE attendance;

-- Rebuild indexes
REINDEX DATABASE attendance;
```

#### Application Optimization

```bash
# Enable compression
echo 'ENABLE_COMPRESSION=true' >> .env

# Optimize Node.js memory
echo 'NODE_OPTIONS="--max-old-space-size=1024"' >> .env

# Enable caching
echo 'ENABLE_CACHING=true' >> .env
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Review system requirements
- [ ] Prepare environment variables
- [ ] Test in staging environment
- [ ] Backup current system
- [ ] Prepare rollback plan

### Deployment

- [ ] Deploy application
- [ ] Run health checks
- [ ] Verify functionality
- [ ] Monitor performance
- [ ] Test backup/restore

### Post-Deployment

- [ ] Monitor system health
- [ ] Review logs for errors
- [ ] Update documentation
- [ ] Notify stakeholders
- [ ] Schedule maintenance

---

## Contact Information

### Technical Support

- **Primary Support**: support@yourcompany.com
- **Emergency Support**: +1-555-0123
- **Documentation**: https://docs.yourcompany.com

### Useful Links

- [System Requirements](../admin/administrator-guide.md#prerequisites)
- [API Documentation](../api/api-documentation.md)
- [User Guide](../user/user-guide.md)
- [Security Guidelines](../security/security-overview.md)

---

Last updated: January 1, 2024