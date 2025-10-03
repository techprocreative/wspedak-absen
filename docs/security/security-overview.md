# Security Overview

This comprehensive security guide covers the threat model, security architecture, best practices, and compliance considerations for the Attendance System.

## Table of Contents

1. [Security Overview](#security-overview)
2. [Threat Model](#threat-model)
3. [Security Architecture](#security-architecture)
4. [Data Protection](#data-protection)
5. [Authentication & Authorization](#authentication--authorization)
6. [Network Security](#network-security)
7. [Application Security](#application-security)
8. [Infrastructure Security](#infrastructure-security)
9. [Compliance & Regulations](#compliance--regulations)
10. [Security Best Practices](#security-best-practices)
11. [Incident Response](#incident-response)
12. [Security Auditing](#security-auditing)

## Security Overview

### Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Users and services have minimum required permissions
3. **Secure by Default**: Security settings are secure out of the box
4. **Zero Trust**: No implicit trust, verify everything
5. **Data Protection**: Protect data at rest, in transit, and in use

### Security Objectives

- **Confidentiality**: Protect sensitive data from unauthorized access
- **Integrity**: Ensure data accuracy and prevent unauthorized modifications
- **Availability**: Maintain system availability and prevent disruptions
- **Accountability**: Track and audit all system activities
- **Privacy**: Protect personal information in accordance with regulations

## Threat Model

### Threat Categories

#### 1. External Threats

| Threat | Description | Impact | Likelihood |
|--------|-------------|--------|------------|
| **Phishing Attacks** | Deceptive emails to steal credentials | High | Medium |
| **DDoS Attacks** | Overwhelm system with traffic | Medium | High |
| **SQL Injection** | Inject malicious SQL queries | High | Low |
| **Cross-Site Scripting (XSS)** | Inject malicious scripts | Medium | Medium |
| **Man-in-the-Middle** | Intercept communications | High | Low |

#### 2. Internal Threats

| Threat | Description | Impact | Likelihood |
|--------|-------------|--------|------------|
| **Insider Threat** | Malicious actions by authorized users | High | Low |
| **Accidental Data Exposure** | Unintentional data disclosure | Medium | Medium |
| **Privilege Escalation** | Gain higher access levels | High | Low |
| **Data Theft** | Steal sensitive information | High | Low |

#### 3. System Threats

| Threat | Description | Impact | Likelihood |
|--------|-------------|--------|------------|
| **Zero-Day Exploits** | Unknown vulnerabilities | High | Low |
| **Misconfiguration** | Incorrect security settings | Medium | Medium |
| **Software Vulnerabilities** | Bugs in software components | Medium | Medium |
| **Hardware Failures** | Physical component failures | Medium | Low |

### Attack Surface Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│                      Attack Surface                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Web Interface │  │   API Endpoints │  │   Mobile App    │  │
│  │   (HTTPS)       │  │   (HTTPS)       │  │   (HTTPS)       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Database      │  │   File Storage  │  │   Third-party   │  │
│  │   (Encrypted)   │  │   (Encrypted)   │  │   Services      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Admin Panel   │  │   Backup System │  │   Monitoring    │  │
│  │   (Restricted)  │  │   (Encrypted)   │  │   (Secured)     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Threat Mitigation Strategies

#### 1. External Threat Mitigation

- **Web Application Firewall (WAF)**: Block malicious requests
- **Rate Limiting**: Prevent abuse and DDoS attacks
- **Input Validation**: Prevent injection attacks
- **Content Security Policy (CSP)**: Prevent XSS attacks
- **HTTPS Only**: Encrypt all communications

#### 2. Internal Threat Mitigation

- **Access Control**: Implement role-based access control
- **Audit Logging**: Track all user activities
- **Principle of Least Privilege**: Minimize permissions
- **Background Checks**: Verify employee trustworthiness
- **Security Training**: Educate users about security risks

#### 3. System Threat Mitigation

- **Regular Updates**: Keep software up to date
- **Vulnerability Scanning**: Identify and patch vulnerabilities
- **Configuration Management**: Ensure secure configurations
- **Redundancy**: Implement failover mechanisms
- **Security Testing**: Regular penetration testing

## Security Architecture

### Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      Security Layers                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Application   │  │   Data          │  │   Infrastructure│  │
│  │   Security      │  │   Security      │  │   Security      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Network       │  │   Physical      │  │   Operational   │  │
│  │   Security      │  │   Security      │  │   Security      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Application Security

#### Authentication Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User          │───▶│   Login Page    │───▶│   Auth Service  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Credentials   │    │   Encrypted     │    │   Token         │
│   (Input)       │    │   Transmission │    │   (JWT)         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

#### Authorization Model

```typescript
// lib/auth/authorization.ts
export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface Role {
  name: string;
  permissions: Permission[];
}

export const ROLES: Record<string, Role> = {
  admin: {
    name: 'Administrator',
    permissions: [
      { resource: '*', action: '*' },
    ],
  },
  manager: {
    name: 'Manager',
    permissions: [
      { resource: 'attendance', action: 'read' },
      { resource: 'attendance', action: 'update', conditions: { team: 'own' } },
      { resource: 'users', action: 'read', conditions: { team: 'own' } },
    ],
  },
  user: {
    name: 'User',
    permissions: [
      { resource: 'attendance', action: 'read', conditions: { user: 'own' } },
      { resource: 'attendance', action: 'create', conditions: { user: 'own' } },
      { resource: 'profile', action: 'read', conditions: { user: 'own' } },
      { resource: 'profile', action: 'update', conditions: { user: 'own' } },
    ],
  },
};
```

### Data Security

#### Encryption at Rest

```typescript
// lib/security/encryption.ts
import crypto from 'crypto';

export class DataEncryption {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;

  constructor(private readonly encryptionKey: string) {}

  encrypt(data: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
    cipher.setAAD(Buffer.from('attendance-system', 'utf8'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
    decipher.setAAD(Buffer.from('attendance-system', 'utf8'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

#### Encryption in Transit

```typescript
// lib/security/transport-security.ts
export const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.supabase.co;",
};
```

### Network Security

#### Firewall Configuration

```bash
# UFW Firewall Rules
# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (restricted)
ufw allow from 192.168.1.0/24 to any port 22 proto tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow application (restricted)
ufw allow from 192.168.1.0/24 to any port 3000 proto tcp

# Enable firewall
ufw enable
```

#### VPN Configuration

```bash
# WireGuard Configuration
[Interface]
PrivateKey = <private-key>
Address = 10.0.0.1/24
ListenPort = 51820

[Peer]
PublicKey = <public-key>
AllowedIPs = 10.0.0.2/32
```

## Data Protection

### Data Classification

| Classification | Description | Handling Requirements |
|----------------|-------------|-----------------------|
| **Public** | Information freely available | No special handling |
| **Internal** | Company internal use only | Access control required |
| **Confidential** | Sensitive business information | Encryption and strict access control |
| **Restricted** | Personal or regulated data | Maximum protection and audit logging |

### Personal Data Protection

#### GDPR Compliance

```typescript
// lib/privacy/gdpr.ts
export class GDPRCompliance {
  // Right to be forgotten
  async deleteUserData(userId: string): Promise<void> {
    // Delete user account
    await this.deleteUserAccount(userId);
    
    // Delete personal data
    await this.deletePersonalData(userId);
    
    // Delete audit logs (after retention period)
    await this.deleteAuditLogs(userId);
    
    // Confirm deletion
    await this.confirmDeletion(userId);
  }
  
  // Right to data portability
  async exportUserData(userId: string): Promise<UserDataExport> {
    const userData = await this.collectUserData(userId);
    return this.formatUserDataExport(userData);
  }
  
  // Right to access
  async getUserData(userId: string): Promise<UserData> {
    return this.collectUserData(userId);
  }
  
  // Right to rectification
  async updateUserData(userId: string, updates: Partial<UserData>): Promise<void> {
    await this.validateUserData(updates);
    await this.applyUserDataUpdates(userId, updates);
    await this.logDataChanges(userId, updates);
  }
}
```

#### Data Retention Policy

```typescript
// lib/privacy/data-retention.ts
export class DataRetentionPolicy {
  private readonly retentionPeriods = {
    attendance: { days: 2555, reason: 'Legal requirement' }, // 7 years
    personal: { days: 1825, reason: 'Statutory requirement' }, // 5 years
    audit: { days: 1095, reason: 'Compliance requirement' }, // 3 years
    face: { days: 730, reason: 'Privacy requirement' }, // 2 years
  };

  async cleanupExpiredData(): Promise<void> {
    for (const [dataType, policy] of Object.entries(this.retentionPeriods)) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.days);
      
      await this.deleteExpiredData(dataType, cutoffDate);
      await this.logDataCleanup(dataType, cutoffDate);
    }
  }
  
  private async deleteExpiredData(dataType: string, cutoffDate: Date): Promise<void> {
    switch (dataType) {
      case 'attendance':
        await this.deleteExpiredAttendance(cutoffDate);
        break;
      case 'personal':
        await this.deleteExpiredPersonalData(cutoffDate);
        break;
      case 'audit':
        await this.deleteExpiredAuditLogs(cutoffDate);
        break;
      case 'face':
        await this.deleteExpiredFaceData(cutoffDate);
        break;
    }
  }
}
```

### Face Recognition Data Security

#### Biometric Data Protection

```typescript
// lib/security/biometric-security.ts
export class BiometricSecurity {
  // Encrypt face templates
  async encryptFaceTemplate(faceTemplate: Buffer): Promise<string> {
    const encryptionKey = await this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher('aes-256-gcm', encryptionKey);
    cipher.setAAD(Buffer.from('face-template', 'utf8'));
    
    let encrypted = cipher.update(faceTemplate);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const tag = cipher.getAuthTag();
    
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }
  
  // Decrypt face templates
  async decryptFaceTemplate(encryptedTemplate: string): Promise<Buffer> {
    const encryptionKey = await this.getEncryptionKey();
    const data = Buffer.from(encryptedTemplate, 'base64');
    
    const iv = data.slice(0, 16);
    const tag = data.slice(16, 32);
    const encrypted = data.slice(32);
    
    const decipher = crypto.createDecipher('aes-256-gcm', encryptionKey);
    decipher.setAAD(Buffer.from('face-template', 'utf8'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
  }
  
  // Secure face template storage
  async storeFaceTemplate(userId: string, faceTemplate: Buffer): Promise<void> {
    const encryptedTemplate = await this.encryptFaceTemplate(faceTemplate);
    
    // Store in secure database
    await this.secureDatabase.store({
      userId,
      template: encryptedTemplate,
      createdAt: new Date(),
      lastUsed: new Date(),
    });
    
    // Log access
    await this.logBiometricAccess(userId, 'store');
  }
}
```

## Authentication & Authorization

### Multi-Factor Authentication

```typescript
// lib/auth/mfa.ts
export class MFAService {
  // Generate TOTP secret
  generateTOTPSecret(user: User): string {
    const secret = speakeasy.generateSecret({
      name: `Attendance System (${user.email})`,
      issuer: 'Attendance System',
    });
    
    return secret.base32;
  }
  
  // Generate QR code for TOTP setup
  generateTOTPQRCode(secret: string, user: User): string {
    const otpauthUrl = speakeasy.otpauthURL({
      secret,
      label: `Attendance System (${user.email})`,
      issuer: 'Attendance System',
    });
    
    return QRCode.toDataURL(otpauthUrl);
  }
  
  // Verify TOTP token
  verifyTOTPToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });
  }
  
  // Send SMS verification
  async sendSMSVerification(phoneNumber: string, code: string): Promise<void> {
    await this.smsService.send({
      to: phoneNumber,
      message: `Your verification code is: ${code}`,
    });
  }
  
  // Verify SMS code
  verifySMSCode(storedCode: string, providedCode: string): boolean {
    return storedCode === providedCode && !this.isCodeExpired(storedCode);
  }
}
```

### Session Management

```typescript
// lib/auth/session-management.ts
export class SessionManager {
  // Create secure session
  async createSession(user: User, deviceInfo: DeviceInfo): Promise<Session> {
    const sessionId = crypto.randomUUID();
    const sessionToken = this.generateSecureToken();
    
    const session: Session = {
      id: sessionId,
      userId: user.id,
      token: sessionToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      deviceInfo,
      isActive: true,
    };
    
    await this.storeSession(session);
    await this.logSessionEvent('created', session);
    
    return session;
  }
  
  // Validate session
  async validateSession(token: string): Promise<Session | null> {
    const session = await this.getSessionByToken(token);
    
    if (!session) {
      return null;
    }
    
    if (session.expiresAt < new Date()) {
      await this.invalidateSession(session.id);
      return null;
    }
    
    if (!session.isActive) {
      return null;
    }
    
    // Update last activity
    await this.updateSessionActivity(session.id);
    
    return session;
  }
  
  // Invalidate session
  async invalidateSession(sessionId: string): Promise<void> {
    await this.updateSession(sessionId, { isActive: false });
    await this.logSessionEvent('invalidated', { sessionId });
  }
  
  // Invalidate all user sessions
  async invalidateAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    
    for (const session of sessions) {
      await this.invalidateSession(session.id);
    }
  }
}
```

### Access Control

```typescript
// lib/auth/access-control.ts
export class AccessControl {
  // Check permission
  async hasPermission(
    user: User,
    resource: string,
    action: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    const userRole = await this.getUserRole(user.id);
    const permissions = this.getRolePermissions(userRole);
    
    for (const permission of permissions) {
      if (this.matchesResource(permission.resource, resource) &&
          this.matchesAction(permission.action, action)) {
        if (permission.conditions) {
          return await this.evaluateConditions(permission.conditions, user, context);
        }
        return true;
      }
    }
    
    return false;
  }
  
  // Evaluate permission conditions
  private async evaluateConditions(
    conditions: Record<string, any>,
    user: User,
    context?: Record<string, any>
  ): Promise<boolean> {
    for (const [key, value] of Object.entries(conditions)) {
      switch (key) {
        case 'user':
          if (context?.userId !== user.id) {
            return false;
          }
          break;
        case 'team':
          if (context?.teamId !== user.teamId) {
            return false;
          }
          break;
        case 'department':
          if (context?.departmentId !== user.departmentId) {
            return false;
          }
          break;
        case 'time':
          const now = new Date();
          const startTime = new Date(value.start);
          const endTime = new Date(value.end);
          if (now < startTime || now > endTime) {
            return false;
          }
          break;
      }
    }
    
    return true;
  }
}
```

## Network Security

### SSL/TLS Configuration

```typescript
// lib/security/ssl-config.ts
export const sslConfig = {
  // SSL/TLS protocols
  protocols: ['TLSv1.2', 'TLSv1.3'],
  
  // Cipher suites
  ciphers: [
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
  ],
  
  // HSTS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  
  // Certificate configuration
  certificate: {
    key: '/etc/ssl/private/attendance-system.key',
    cert: '/etc/ssl/certs/attendance-system.crt',
    ca: '/etc/ssl/certs/attendance-system-ca.crt',
  },
};
```

### Network Segmentation

```yaml
# docker-compose.network.yml
version: '3.8'

networks:
  # Frontend network
  frontend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
  
  # Backend network
  backend:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.21.0.0/16
  
  # Database network
  database:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.22.0.0/16

services:
  # Frontend application
  app:
    build: .
    networks:
      - frontend
      - backend
    ports:
      - "3000:3000"
  
  # API service
  api:
    build: ./api
    networks:
      - backend
      - database
  
  # Database
  postgres:
    image: postgres:14
    networks:
      - database
    environment:
      - POSTGRES_DB=attendance
      - POSTGRES_USER=attendance
      - POSTGRES_PASSWORD=${DB_PASSWORD}
  
  # Reverse proxy
  nginx:
    image: nginx:alpine
    networks:
      - frontend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
```

### DDoS Protection

```typescript
// lib/security/ddos-protection.ts
export class DDoSProtection {
  private readonly rateLimits = {
    default: { requests: 100, window: 60000 }, // 100 requests per minute
    auth: { requests: 10, window: 60000 }, // 10 requests per minute
    api: { requests: 200, window: 60000 }, // 200 requests per minute
  };
  
  private readonly requestCounts = new Map<string, { count: number; resetTime: number }>();
  
  // Check rate limit
  checkRateLimit(clientId: string, endpoint: string): boolean {
    const limit = this.getRateLimit(endpoint);
    const now = Date.now();
    const client = this.requestCounts.get(clientId);
    
    if (!client || now > client.resetTime) {
      this.requestCounts.set(clientId, {
        count: 1,
        resetTime: now + limit.window,
      });
      return true;
    }
    
    if (client.count >= limit.requests) {
      return false;
    }
    
    client.count++;
    return true;
  }
  
  // Get rate limit for endpoint
  private getRateLimit(endpoint: string): { requests: number; window: number } {
    if (endpoint.startsWith('/auth')) {
      return this.rateLimits.auth;
    } else if (endpoint.startsWith('/api')) {
      return this.rateLimits.api;
    } else {
      return this.rateLimits.default;
    }
  }
  
  // Block suspicious IP
  async blockSuspiciousIP(ip: string, reason: string): Promise<void> {
    await this.firewall.blockIP(ip);
    await this.logSecurityEvent('ip_blocked', { ip, reason });
    await this.notifySecurityTeam({ ip, reason });
  }
}
```

## Application Security

### Input Validation

```typescript
// lib/security/input-validation.ts
import { z } from 'zod';

// Schemas for validation
export const attendanceSchema = z.object({
  userId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/).optional(),
  status: z.enum(['present', 'absent', 'late']),
  location: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'manager', 'user']),
  department: z.string().max(100).optional(),
});

// Validation middleware
export const validateInput = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors,
        },
      });
    }
  };
};
```

### SQL Injection Prevention

```typescript
// lib/security/sql-injection-prevention.ts
export class SQLInjectionPrevention {
  // Use parameterized queries
  async getAttendanceByUser(userId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    const query = `
      SELECT * FROM attendance 
      WHERE user_id = $1 
      AND date BETWEEN $2 AND $3
      ORDER BY date DESC
    `;
    
    return await this.db.query(query, [userId, startDate, endDate]);
  }
  
  // Use query builder for complex queries
  async searchAttendance(filters: AttendanceFilters): Promise<AttendanceRecord[]> {
    let query = this.db('attendance').select('*');
    
    if (filters.userId) {
      query = query.where('user_id', filters.userId);
    }
    
    if (filters.startDate) {
      query = query.where('date', '>=', filters.startDate);
    }
    
    if (filters.endDate) {
      query = query.where('date', '<=', filters.endDate);
    }
    
    if (filters.status) {
      query = query.where('status', filters.status);
    }
    
    return await query;
  }
}
```

### XSS Prevention

```typescript
// lib/security/xss-prevention.ts
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create DOMPurify instance
const window = new JSDOM('').window;
const purify = DOMPurify(window);

export class XSSPrevention {
  // Sanitize HTML content
  sanitizeHTML(html: string): string {
    return purify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: [],
    });
  }
  
  // Escape user input for display
  escapeInput(input: string): string {
    return input
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#039;');
  }
  
  // Content Security Policy
  getCSPHeader(): string {
    return "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.supabase.co;";
  }
}
```

### CSRF Protection

```typescript
// lib/security/csrf-protection.ts
import crypto from 'crypto';

export class CSRFProtection {
  // Generate CSRF token
  generateToken(sessionId: string): string {
    const timestamp = Date.now();
    const data = `${sessionId}:${timestamp}`;
    const signature = crypto.createHmac('sha256', process.env.CSRF_SECRET!)
      .update(data)
      .digest('hex');
    
    return Buffer.from(`${data}:${signature}`).toString('base64');
  }
  
  // Validate CSRF token
  validateToken(token: string, sessionId: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const [tokenSessionId, timestamp, signature] = decoded.split(':');
      
      // Check session ID
      if (tokenSessionId !== sessionId) {
        return false;
      }
      
      // Check timestamp (token expires after 1 hour)
      const tokenTime = parseInt(timestamp);
      if (Date.now() - tokenTime > 3600000) {
        return false;
      }
      
      // Check signature
      const data = `${tokenSessionId}:${timestamp}`;
      const expectedSignature = crypto.createHmac('sha256', process.env.CSRF_SECRET!)
        .update(data)
        .digest('hex');
      
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch (error) {
      return false;
    }
  }
}
```

## Infrastructure Security

### Container Security

```dockerfile
# Dockerfile
# Use minimal base image
FROM node:18-alpine AS base

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY --chown=nextjs:nodejs . .

# Build application
RUN npm run build

# Production stage
FROM base AS production

# Copy built application
COPY --from=base --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=base --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["node", "server.js"]
```

### Security Scanning

```bash
#!/bin/bash
# scripts/security-scan.sh

echo "Starting security scan..."

# Scan container images for vulnerabilities
echo "Scanning container images..."
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image attendance-system:latest

# Scan dependencies for vulnerabilities
echo "Scanning dependencies..."
npm audit --audit-level=moderate

# Run static code analysis
echo "Running static code analysis..."
npm run lint

# Run security tests
echo "Running security tests..."
npm run test:security

echo "Security scan completed"
```

### Secret Management

```typescript
// lib/security/secret-management.ts
export class SecretManager {
  // Encrypt secrets
  encryptSecret(secret: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher('aes-256-gcm', key);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
  }
  
  // Decrypt secrets
  decryptSecret(encryptedSecret: string): string {
    const key = this.getEncryptionKey();
    const parts = encryptedSecret.split(':');
    
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher('aes-256-gcm', key);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  // Get encryption key from secure storage
  private getEncryptionKey(): string {
    // In production, this would retrieve from a secure key management system
    return process.env.ENCRYPTION_KEY!;
  }
}
```

## Compliance & Regulations

### GDPR Compliance

```typescript
// lib/compliance/gdpr.ts
export class GDPRCompliance {
  // Data protection impact assessment
  async conductDPIA(): Promise<DPIAResult> {
    const assessment = await this.assessDataProcessing();
    const risks = await this.identifyPrivacyRisks();
    const mitigation = await this.identifyMitigationMeasures();
    
    return {
      assessment,
      risks,
      mitigation,
      recommendation: this.getRecommendation(risks, mitigation),
    };
  }
  
  // Record of processing activities
  async createROPA(): Promise<ROPA> {
    return {
      controller: this.getControllerDetails(),
      purposes: this.getDataPurposes(),
      categories: this.getDataCategories(),
      recipients: this.getDataRecipients(),
      retention: this.getRetentionPolicy(),
      security: this.getSecurityMeasures(),
    };
  }
  
  // Data breach notification
  async notifyDataBreach(breach: DataBreach): Promise<void> {
    // Assess breach severity
    const severity = await this.assessBreachSeverity(breach);
    
    // Notify supervisory authority (if required)
    if (severity.requiresNotification) {
      await this.notifySupervisoryAuthority(breach);
    }
    
    // Notify data subjects (if required)
    if (severity.requiresSubjectNotification) {
      await this.notifyDataSubjects(breach);
    }
    
    // Document breach
    await this.documentBreach(breach);
  }
}
```

### SOC 2 Compliance

```typescript
// lib/compliance/soc2.ts
export class SOC2Compliance {
  // Security controls
  async implementSecurityControls(): Promise<void> {
    // Access control
    await this.implementAccessControl();
    
    // Incident response
    await this.implementIncidentResponse();
    
    // Vulnerability management
    await this.implementVulnerabilityManagement();
    
    // Data encryption
    await this.implementDataEncryption();
  }
  
  // Availability controls
  async implementAvailabilityControls(): Promise<void> {
    // Monitoring
    await this.implementMonitoring();
    
    // Backup and recovery
    await this.implementBackupAndRecovery();
    
    // Disaster recovery
    await this.implementDisasterRecovery();
  }
  
  // Processing integrity controls
  async implementProcessingIntegrityControls(): Promise<void> {
    // Data validation
    await this.implementDataValidation();
    
    // Change management
    await this.implementChangeManagement();
    
    // Audit logging
    await this.implementAuditLogging();
  }
  
  // Confidentiality controls
  async implementConfidentialityControls(): Promise<void> {
    // Data classification
    await this.implementDataClassification();
    
    // Network security
    await this.implementNetworkSecurity();
    
    // Physical security
    await this.implementPhysicalSecurity();
  }
  
  // Privacy controls
  async implementPrivacyControls(): Promise<void> {
    // Privacy policy
    await this.implementPrivacyPolicy();
    
    // Consent management
    await this.implementConsentManagement();
    
    // Data subject rights
    await this.implementDataSubjectRights();
  }
}
```

## Security Best Practices

### Development Security

#### Secure Coding Guidelines

1. **Input Validation**: Validate all user inputs
2. **Output Encoding**: Encode all outputs
3. **Error Handling**: Don't expose sensitive information in errors
4. **Authentication**: Use strong authentication mechanisms
5. **Authorization**: Implement proper access controls
6. **Cryptography**: Use standard cryptographic algorithms
7. **Logging**: Log security events
8. **Testing**: Include security testing in development

#### Security Code Review Checklist

```markdown
## Security Code Review Checklist

### Authentication
- [ ] Strong password policies implemented
- [ ] Multi-factor authentication implemented
- [ ] Secure session management
- [ ] Proper logout functionality

### Authorization
- [ ] Role-based access control implemented
- [ ] Least privilege principle followed
- [ ] Proper permission checks
- [ ] Secure API endpoints

### Data Protection
- [ ] Sensitive data encrypted at rest
- [ ] Sensitive data encrypted in transit
- [ ] Proper data retention policies
- [ ] Secure data disposal

### Input Validation
- [ ] All user inputs validated
- [ ] SQL injection prevention implemented
- [ ] XSS prevention implemented
- [ ] CSRF protection implemented

### Error Handling
- [ ] No sensitive information in error messages
- [ ] Proper error logging
- [ ] Secure error pages
- [ ] Custom error handling

### Logging
- [ ] Security events logged
- [ ] Log integrity protected
- [ ] Log monitoring implemented
- [ ] Log retention policies
```

### Operational Security

#### Security Monitoring

```typescript
// lib/security/monitoring.ts
export class SecurityMonitor {
  // Monitor for suspicious activities
  async monitorSuspiciousActivities(): Promise<void> {
    // Monitor failed login attempts
    await this.monitorFailedLogins();
    
    // Monitor unusual API usage
    await this.monitorUnusualAPIUsage();
    
    // Monitor data access patterns
    await this.monitorDataAccessPatterns();
    
    // Monitor system changes
    await this.monitorSystemChanges();
  }
  
  // Detect anomalies
  async detectAnomalies(): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    // Detect login anomalies
    const loginAnomalies = await this.detectLoginAnomalies();
    anomalies.push(...loginAnomalies);
    
    // Detect API anomalies
    const apiAnomalies = await this.detectAPIAnomalies();
    anomalies.push(...apiAnomalies);
    
    // Detect data anomalies
    const dataAnomalies = await this.detectDataAnomalies();
    anomalies.push(...dataAnomalies);
    
    return anomalies;
  }
  
  // Alert on security events
  async alertOnSecurityEvent(event: SecurityEvent): Promise<void> {
    // Determine alert severity
    const severity = this.determineSeverity(event);
    
    // Send alert
    await this.sendAlert(event, severity);
    
    // Log event
    await this.logSecurityEvent(event);
    
    // Take automatic action (if needed)
    await this.takeAutomaticAction(event, severity);
  }
}
```

#### Security Incident Response

```typescript
// lib/security/incident-response.ts
export class SecurityIncidentResponse {
  // Respond to security incident
  async respondToIncident(incident: SecurityIncident): Promise<void> {
    // Contain incident
    await this.containIncident(incident);
    
    // Investigate incident
    const investigation = await this.investigateIncident(incident);
    
    // Eradicate threat
    await this.eradicateThreat(incident, investigation);
    
    // Recover from incident
    await this.recoverFromIncident(incident);
    
    // Document incident
    await this.documentIncident(incident, investigation);
    
    // Learn from incident
    await this.learnFromIncident(incident);
  }
  
  // Contain incident
  private async containIncident(incident: SecurityIncident): Promise<void> {
    switch (incident.type) {
      case 'data_breach':
        await this.containDataBreach(incident);
        break;
      case 'malware':
        await this.containMalware(incident);
        break;
      case 'unauthorized_access':
        await this.containUnauthorizedAccess(incident);
        break;
      case 'ddos':
        await this.containDDoS(incident);
        break;
    }
  }
}
```

## Incident Response

### Incident Response Plan

#### 1. Preparation

```typescript
// lib/security/incident-response-preparation.ts
export class IncidentResponsePreparation {
  // Develop incident response plan
  async developIncidentResponsePlan(): Promise<IncidentResponsePlan> {
    return {
      team: this.defineIncidentResponseTeam(),
      procedures: this.defineIncidentResponseProcedures(),
      tools: this.defineIncidentResponseTools(),
      communications: this.defineCommunicationPlan(),
    };
  }
  
  // Conduct training and awareness
  async conductTraining(): Promise<void> {
    // Security awareness training
    await this.conductSecurityAwarenessTraining();
    
    // Incident response training
    await this.conductIncidentResponseTraining();
    
    // Tabletop exercises
    await this.conductTabletopExercises();
  }
  
  // Establish incident response capabilities
  async establishCapabilities(): Promise<void> {
    // Detection capabilities
    await this.establishDetectionCapabilities();
    
    // Analysis capabilities
    await this.establishAnalysisCapabilities();
    
    // Containment capabilities
    await this.establishContainmentCapabilities();
    
    // Recovery capabilities
    await this.establishRecoveryCapabilities();
  }
}
```

#### 2. Detection and Analysis

```typescript
// lib/security/incident-detection.ts
export class IncidentDetection {
  // Detect security incidents
  async detectIncidents(): Promise<SecurityIncident[]> {
    const incidents: SecurityIncident[] = [];
    
    // Analyze logs
    const logIncidents = await this.analyzeLogs();
    incidents.push(...logIncidents);
    
    // Monitor alerts
    const alertIncidents = await this.monitorAlerts();
    incidents.push(...alertIncidents);
    
    // Analyze network traffic
    const networkIncidents = await this.analyzeNetworkTraffic();
    incidents.push(...networkIncidents);
    
    // Analyze system behavior
    const systemIncidents = await this.analyzeSystemBehavior();
    incidents.push(...systemIncidents);
    
    return incidents;
  }
  
  // Analyze incident
  async analyzeIncident(incident: SecurityIncident): Promise<IncidentAnalysis> {
    // Determine scope
    const scope = await this.determineScope(incident);
    
    // Determine impact
    const impact = await this.determineImpact(incident);
    
    // Determine cause
    const cause = await this.determineCause(incident);
    
    // Determine severity
    const severity = await this.determineSeverity(incident, scope, impact);
    
    return {
      incident,
      scope,
      impact,
      cause,
      severity,
    };
  }
}
```

#### 3. Containment, Eradication, and Recovery

```typescript
// lib/security/incident-containment.ts
export class IncidentContainment {
  // Contain incident
  async containIncident(incident: SecurityIncident): Promise<void> {
    // Isolate affected systems
    await this.isolateAffectedSystems(incident);
    
    // Block malicious traffic
    await this.blockMaliciousTraffic(incident);
    
    // Disable compromised accounts
    await this.disableCompromisedAccounts(incident);
    
    // Preserve evidence
    await this.preserveEvidence(incident);
  }
  
  // Eradicate threat
  async eradicateThreat(incident: SecurityIncident): Promise<void> {
    // Remove malware
    await this.removeMalware(incident);
    
    // Patch vulnerabilities
    await this.patchVulnerabilities(incident);
    
    // Update configurations
    await this.updateConfigurations(incident);
    
    // Improve security controls
    await this.improveSecurityControls(incident);
  }
  
  // Recover from incident
  async recoverFromIncident(incident: SecurityIncident): Promise<void> {
    // Restore systems
    await this.restoreSystems(incident);
    
    // Restore data
    await this.restoreData(incident);
    
    // Validate recovery
    await this.validateRecovery(incident);
    
    // Monitor for recurrence
    await this.monitorForRecurrence(incident);
  }
}
```

## Security Auditing

### Security Audit Checklist

```markdown
## Security Audit Checklist

### Authentication and Authorization
- [ ] Password policies reviewed
- [ ] Multi-factor authentication implemented
- [ ] Account lockout mechanisms in place
- [ ] Role-based access control implemented
- [ ] Privilege review conducted

### Data Protection
- [ ] Data classification implemented
- [ ] Encryption at rest verified
- [ ] Encryption in transit verified
- [ ] Data retention policies reviewed
- [ ] Data disposal procedures verified

### Network Security
- [ ] Firewall rules reviewed
- [ ] Network segmentation verified
- [ ] VPN configurations reviewed
- [ ] Wireless security reviewed
- [ ] DDoS protection verified

### Application Security
- [ ] Input validation verified
- [ ] Output encoding verified
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection verified

### Infrastructure Security
- [ ] Server hardening verified
- [ ] Container security reviewed
- [ ] Cloud security configurations reviewed
- [ ] Backup and recovery tested
- [ ] Patch management verified

### Compliance
- [ ] GDPR compliance verified
- [ ] SOC 2 compliance verified
- [ ] Industry regulations compliance verified
- [ ] Privacy policies reviewed
- [ ] Data processing agreements reviewed
```

### Security Audit Report

```typescript
// lib/security/audit-report.ts
export class SecurityAuditReport {
  // Generate audit report
  async generateAuditReport(audit: SecurityAudit): Promise<AuditReport> {
    return {
      executiveSummary: await this.generateExecutiveSummary(audit),
      findings: await this.generateFindings(audit),
      recommendations: await this.generateRecommendations(audit),
      actionPlan: await this.generateActionPlan(audit),
      appendix: await this.generateAppendix(audit),
    };
  }
  
  // Generate executive summary
  private async generateExecutiveSummary(audit: SecurityAudit): Promise<ExecutiveSummary> {
    return {
      overallSecurityPosture: this.assessOverallSecurityPosture(audit),
      keyFindings: this.identifyKeyFindings(audit),
      criticalRecommendations: this.identifyCriticalRecommendations(audit),
      riskAssessment: this.assessRisk(audit),
    };
  }
  
  // Generate findings
  private async generateFindings(audit: SecurityAudit): Promise<Finding[]> {
    const findings: Finding[] = [];
    
    for (const area of audit.areas) {
      const areaFindings = await this.analyzeArea(area);
      findings.push(...areaFindings);
    }
    
    return findings.sort((a, b) => b.severity - a.severity);
  }
  
  // Generate recommendations
  private async generateRecommendations(audit: SecurityAudit): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    
    for (const finding of audit.findings) {
      const recommendation = await this.createRecommendation(finding);
      recommendations.push(recommendation);
    }
    
    return recommendations;
  }
}
```

---

## Contact Information

### Security Team

- **Chief Information Security Officer (CISO)**: ciso@yourcompany.com
- **Security Team**: security@yourcompany.com
- **Incident Response**: incident@yourcompany.com
- **Security Hotline**: +1-555-0126

### Report Security Issues

- **Vulnerability Disclosure**: security@yourcompany.com
- **Security Concerns**: concerns@yourcompany.com
- **Data Protection Officer**: dpo@yourcompany.com

### Useful Links

- [Security Policy](https://yourcompany.com/security-policy)
- [Vulnerability Disclosure Policy](https://yourcompany.com/vdp)
- [Security Documentation](https://docs.yourcompany.com/security)
- [Security Training](https://training.yourcompany.com/security)

---

Last updated: January 1, 2024