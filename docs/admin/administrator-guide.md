# Administrator Guide

This comprehensive guide is designed for system administrators responsible for installing, configuring, and maintaining the Attendance System.

## Table of Contents

1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Initial Configuration](#initial-configuration)
5. [User Management](#user-management)
6. [System Configuration](#system-configuration)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Backup and Recovery](#backup-and-recovery)
9. [Security Management](#security-management)
10. [Troubleshooting](#troubleshooting)
11. [Performance Optimization](#performance-optimization)

## System Overview

### Architecture

The Attendance System consists of several components:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Service       │  │   Service       │  │   Service       │  │
│  │   Worker        │  │   Worker        │  │   Worker        │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   API Layer     │  │   Auth Layer    │  │   Sync Layer    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Supabase      │  │   Local DB      │  │   File Storage  │  │
│  │   (Cloud)       │  │   (Optional)    │  │   (Backup)      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Frontend**: Next.js application with PWA capabilities
2. **Backend**: API endpoints for data management
3. **Database**: Supabase (primary) with optional local database
4. **Storage**: File storage for backups and exports
5. **Authentication**: JWT-based authentication system
6. **Face Recognition**: Client-side facial recognition processing

## Prerequisites

### Hardware Requirements

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
- **Node.js**: 18.x or later
- **Docker**: 20.x or later
- **Docker Compose**: 2.x or later
- **Git**: 2.x or later

#### Optional Software
- **PostgreSQL**: 14.x or later (for local database)
- **Redis**: 6.x or later (for caching)
- **Nginx**: 1.20 or later (for reverse proxy)

### Network Requirements

#### Ports
- **3000**: Application HTTP
- **443**: Application HTTPS (if using SSL)
- **5432**: PostgreSQL (if using local database)
- **6379**: Redis (if using caching)
- **80**: Nginx (if using reverse proxy)

#### Firewalls
- Ensure required ports are open
- Configure SSL/TLS for production
- Set up reverse proxy if needed

### External Services

#### Required
- **Supabase Account**: For cloud database and authentication
- **Domain Name**: For production deployment
- **SSL Certificate**: For HTTPS (recommended)

#### Optional
- **Email Service**: For notifications (SMTP)
- **Monitoring Service**: For application monitoring
- **Backup Service**: For automated backups

## Installation

### Option 1: Docker Installation (Recommended)

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

Edit `.env` file with your settings:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application Configuration
NEXT_PUBLIC_APP_NAME=Attendance System
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=production

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# Database (if using local)
DATABASE_URL=postgresql://username:password@localhost:5432/attendance

# Redis (if using)
REDIS_URL=redis://localhost:6379
```

#### 3. Deploy with Docker Compose

```bash
# Build and start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

#### 4. Verify Installation

```bash
# Check health endpoint
curl http://localhost:3000/api/health

# Check application
open http://localhost:3000
```

### Option 2: Manual Installation

#### 1. Install Dependencies

```bash
# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install application dependencies
npm install
```

#### 2. Build Application

```bash
# Build for production
npm run build

# Start application
npm start
```

#### 3. Set up Process Manager

```bash
# Install PM2
npm install -g pm2

# Start application with PM2
pm2 start npm --name "attendance-system" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

### Option 3: Synology DS223J Installation

#### 1. Prepare Synology

1. Install Docker from Package Center
2. Enable SSH access
3. Create shared folder for application data
4. Configure network settings

#### 2. Deploy Application

```bash
# Use the deployment script
./scripts/deploy/deploy-to-synology.sh

# Or manually copy files
scp -r . admin@synology-ip:/volume1/docker/attendance-system/
```

#### 3. Configure Docker on Synology

1. Open Docker application
2. Import the docker-compose.yml file
3. Configure environment variables
4. Start the container

## Initial Configuration

### 1. Access Admin Panel

1. Open the application in your browser
2. Log in with the default admin account
3. Navigate to the admin panel

### 2. Configure System Settings

#### Basic Settings

```bash
# Application Settings
- Company Name
- Time Zone
- Working Hours
- Holiday Calendar
- Attendance Policies
```

#### Email Configuration

```bash
# SMTP Settings
- SMTP Host
- SMTP Port
- SMTP Username
- SMTP Password
- From Email Address
```

#### Security Settings

```bash
# Security Configuration
- Password Policy
- Session Timeout
- Two-Factor Authentication
- IP Whitelist (if needed)
```

### 3. Set up Database

#### Supabase Configuration

1. Create a new Supabase project
2. Configure database schema
3. Set up authentication providers
4. Configure Row Level Security (RLS)

#### Local Database (Optional)

```bash
# Create PostgreSQL database
createdb attendance

# Run migrations
npm run migrate

# Seed initial data
npm run seed
```

### 4. Configure Face Recognition

```bash
# Face Recognition Settings
- Confidence Threshold
- Maximum Attempts
- Data Retention Period
- Encryption Settings
```

## User Management

### Creating Users

#### Manual User Creation

1. Navigate to Admin → Users
2. Click "Add User"
3. Fill in user details:
   - Email
   - Name
   - Role
   - Department
   - Working Hours
4. Set initial password
5. Send welcome email

#### Bulk User Import

1. Prepare CSV file with user data
2. Navigate to Admin → Users → Import
3. Upload CSV file
4. Map fields
5. Review and confirm

#### CSV Format

```csv
email,name,role,department,working_hours
john.doe@company.com,John Doe,user,Engineering,9:00-17:00
jane.smith@company.com,Jane Smith,admin,HR,9:00-17:00
```

### User Roles and Permissions

#### Role Types

| Role | Permissions | Description |
|------|-------------|-------------|
| Super Admin | All permissions | Full system access |
| Admin | User management, reports | Administrative access |
| Manager | Team reports, approvals | Limited admin access |
| User | Personal attendance | Basic user access |

#### Permission Matrix

| Permission | Super Admin | Admin | Manager | User |
|------------|-------------|-------|---------|------|
| View All Attendance | ✓ | ✓ | Team only | Own only |
| Edit All Attendance | ✓ | ✓ | Team only | Own only |
| User Management | ✓ | ✓ | ✗ | ✗ |
| System Settings | ✓ | ✗ | ✗ | ✗ |
| Reports | ✓ | ✓ | Team only | Own only |
| Face Recognition Admin | ✓ | ✓ | ✗ | ✗ |

### Managing User Accounts

#### Activating/Deactivating Users

1. Navigate to Admin → Users
2. Find the user
3. Click "Active/Inactive" toggle
4. Confirm action

#### Resetting Passwords

1. Navigate to Admin → Users
2. Find the user
3. Click "Reset Password"
4. Choose method:
   - Send reset email
   - Set temporary password

#### Managing Face Data

1. Navigate to Admin → Users → Face Recognition
2. View user's enrolled faces
3. Delete or manage face data
4. View recognition statistics

## System Configuration

### Attendance Policies

#### Working Hours Configuration

```bash
# Standard Working Hours
- Start Time: 09:00
- End Time: 17:00
- Break Duration: 60 minutes
- Grace Period: 15 minutes

# Overtime Settings
- Overtime Start: After 8 hours
- Overtime Rate: 1.5x
- Weekend Rate: 2.0x
```

#### Attendance Rules

```bash
# Check-in Rules
- Early Check-in: Allowed (30 minutes before)
- Late Check-in: Marked as late after grace period
- Missed Check-in: Requires admin approval

# Check-out Rules
- Early Check-out: Requires approval
- Late Check-out: Automatically recorded
- Missed Check-out: Auto-checkout at standard time
```

### Notification Settings

#### Email Notifications

```bash
# User Notifications
- Daily attendance summary
- Late arrival alerts
- Overtime warnings
- Password changes

# Admin Notifications
- New user registrations
- System errors
- Storage warnings
- Security alerts
```

#### Browser Notifications

```bash
# Enable browser notifications for:
- Check-in reminders
- Check-out reminders
- Sync status changes
- System maintenance
```

### Data Retention Policies

```bash
# Data Retention Settings
- Attendance Records: 7 years
- Face Recognition Data: 2 years
- System Logs: 90 days
- Backup Files: 30 days
- Audit Trail: 5 years
```

## Monitoring and Maintenance

### System Health Monitoring

#### Health Check Endpoints

```bash
# Basic Health Check
GET /api/health

# Detailed Health Check
GET /api/health/detailed

# System Metrics
GET /api/metrics
```

#### Monitoring Metrics

```bash
# Key Metrics to Monitor
- CPU Usage
- Memory Usage
- Disk Space
- Network Traffic
- Response Times
- Error Rates
- User Activity
- Sync Status
```

### Log Management

#### Log Types

```bash
# Application Logs
- Error logs
- Access logs
- Performance logs
- Security logs

# System Logs
- Docker logs
- Database logs
- Web server logs
- System logs
```

#### Log Rotation

```bash
# Configure log rotation
- Daily rotation
- Keep 30 days of logs
- Compress old logs
- Monitor log size
```

### Performance Monitoring

#### Key Performance Indicators

```bash
# Response Times
- Page Load Time: < 3 seconds
- API Response Time: < 500ms
- Database Query Time: < 100ms

# User Experience
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s
```

#### Performance Optimization

```bash
# Database Optimization
- Regular query analysis
- Index optimization
- Connection pooling
- Query caching

# Application Optimization
- Code splitting
- Lazy loading
- Asset optimization
- Caching strategies
```

## Backup and Recovery

### Backup Strategy

#### Automated Backups

```bash
# Daily Backups
- Database backup
- File system backup
- Configuration backup
- Log backup

# Weekly Backups
- Full system backup
- Off-site backup
- Disaster recovery backup
```

#### Backup Configuration

```bash
# Backup Schedule
- Daily: 2:00 AM
- Weekly: Sunday 1:00 AM
- Monthly: First Sunday 12:00 AM

# Backup Retention
- Daily backups: 30 days
- Weekly backups: 12 weeks
- Monthly backups: 12 months
```

### Recovery Procedures

#### Database Recovery

```bash
# Restore from Backup
1. Stop application
2. Restore database
3. Verify data integrity
4. Restart application
5. Test functionality
```

#### System Recovery

```bash
# Complete System Restore
1. Prepare new environment
2. Restore application files
3. Restore configuration
4. Restore database
5. Test all features
6. Update DNS if needed
```

#### Disaster Recovery

```bash
# Disaster Recovery Plan
1. Assess damage
2. Activate backup site
3. Restore critical services
4. Notify users
5. Monitor performance
6. Plan improvements
```

### Testing Backups

#### Regular Testing

```bash
# Monthly Backup Testing
- Test restore process
- Verify data integrity
- Document recovery time
- Update procedures
```

#### Recovery Time Objectives

```bash
# RTO/RPO Targets
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 24 hours
- Critical Systems: 1 hour RTO, 1 hour RPO
```

## Security Management

### Security Configuration

#### Authentication Security

```bash
# Password Policy
- Minimum length: 8 characters
- Require uppercase, lowercase, numbers, symbols
- Password history: 5 passwords
- Expiration: 90 days

# Session Management
- Session timeout: 30 minutes
- Maximum concurrent sessions: 3
- Secure session cookies
- HTTPS only
```

#### Data Encryption

```bash
# Encryption Standards
- Data in transit: TLS 1.3
- Data at rest: AES-256
- Face data: Encrypted with user key
- Database: Encrypted connections
```

#### Access Control

```bash
# Network Security
- Firewall configuration
- IP whitelisting
- VPN access for admin
- DDoS protection

# Application Security
- Input validation
- SQL injection protection
- XSS protection
- CSRF protection
```

### Security Monitoring

#### Security Events

```bash
# Monitor for:
- Failed login attempts
- Unauthorized access attempts
- Data export attempts
- Configuration changes
- Privilege escalations
```

#### Security Alerts

```bash
# Alert Configuration
- Immediate: Security breaches
- Daily: Failed login summary
- Weekly: Security report
- Monthly: Security audit
```

### Security Audits

#### Regular Audits

```bash
# Monthly Security Tasks
- Review user access
- Check for vulnerabilities
- Update security patches
- Review security logs
- Test backup recovery
```

#### Compliance Checks

```bash
# Compliance Requirements
- GDPR compliance
- Data protection laws
- Industry standards
- Company policies
```

## Troubleshooting

### Common Issues

#### Application Issues

| Problem | Symptoms | Solution |
|---------|----------|----------|
| Application won't start | Error on startup, blank page | Check logs, verify configuration |
| Slow performance | Slow page loads, timeouts | Check resources, optimize queries |
| Database connection failed | Database errors | Check connection, verify credentials |
| Face recognition not working | Recognition failures | Check camera, re-enroll faces |

#### User Issues

| Problem | Symptoms | Solution |
|---------|----------|----------|
| Can't log in | Invalid credentials | Reset password, check account status |
| Sync not working | Changes not saving | Check connection, manual sync |
| Notifications not received | No emails/pushes | Check settings, verify configuration |

### Diagnostic Tools

#### System Diagnostics

```bash
# Health Check
curl http://localhost:3000/api/health

# System Metrics
curl http://localhost:3000/api/metrics

# Database Status
curl http://localhost:3000/api/health/database
```

#### Log Analysis

```bash
# Application Logs
docker-compose logs attendance-app

# Database Logs
docker-compose logs postgres

# System Logs
tail -f /var/log/syslog
```

### Performance Issues

#### Identifying Bottlenecks

```bash
# Database Performance
- Slow query analysis
- Connection pool monitoring
- Index usage review

# Application Performance
- Response time analysis
- Memory usage monitoring
- CPU usage tracking
```

#### Optimization Strategies

```bash
# Database Optimization
- Add missing indexes
- Optimize queries
- Increase connection pool
- Enable query caching

# Application Optimization
- Enable caching
- Optimize assets
- Implement CDN
- Scale resources
```

## Performance Optimization

### Database Optimization

#### Query Optimization

```sql
-- Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM attendance WHERE date = '2024-01-01';

-- Add indexes
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_user ON attendance(user_id);
```

#### Connection Management

```bash
# Connection Pool Configuration
- Minimum connections: 5
- Maximum connections: 20
- Connection timeout: 30 seconds
- Idle timeout: 10 minutes
```

### Application Optimization

#### Caching Strategies

```bash
# Browser Caching
- Static assets: 1 year
- API responses: 5 minutes
- User data: 1 hour

# Server Caching
- Database queries: 10 minutes
- Computed results: 1 hour
- Session data: 30 minutes
```

#### Resource Optimization

```bash
# Asset Optimization
- Minify CSS/JS
- Compress images
- Enable Gzip compression
- Use CDN for static assets

# Code Optimization
- Implement lazy loading
- Use code splitting
- Optimize bundle size
- Remove unused dependencies
```

### Scaling Strategies

#### Horizontal Scaling

```bash
# Load Balancing
- Multiple application instances
- Load balancer configuration
- Session persistence
- Health checks

# Database Scaling
- Read replicas
- Database sharding
- Connection pooling
- Query optimization
```

#### Vertical Scaling

```bash
# Resource Allocation
- Increase CPU cores
- Add more RAM
- Faster storage
- Better network

# Performance Monitoring
- Resource usage tracking
- Performance metrics
- Bottleneck identification
- Capacity planning
```

---

## Maintenance Schedule

### Daily Tasks

- Check system health
- Review error logs
- Monitor performance
- Verify backups

### Weekly Tasks

- Update security patches
- Review user access
- Clean up old logs
- Performance analysis

### Monthly Tasks

- Security audit
- Backup testing
- Performance optimization
- User training

### Quarterly Tasks

- Disaster recovery test
- Security assessment
- Capacity planning
- System updates

---

## Contact Information

### Technical Support

- **Primary Support**: support@yourcompany.com
- **Emergency Support**: +1-555-0123
- **Documentation**: https://docs.yourcompany.com

### System Requirements

- **Minimum Hardware**: 2 cores, 4GB RAM, 20GB storage
- **Recommended Hardware**: 4 cores, 8GB RAM, 50GB storage
- **Network**: 100 Mbps minimum, 1 Gbps recommended

### Useful Links

- [System Status](https://status.yourcompany.com)
- [API Documentation](../api/api-documentation.md)
- [User Guide](../user/user-guide.md)
- [Security Guidelines](../security/security-overview.md)

---

Last updated: January 1, 2024