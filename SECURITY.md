# Security Implementation Guide

This document outlines the security measures implemented in the attendance system to protect against common vulnerabilities and ensure data privacy.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Password Security](#password-security)
3. [Session Management](#session-management)
4. [Data Encryption](#data-encryption)
5. [Input Validation](#input-validation)
6. [Rate Limiting](#rate-limiting)
7. [Brute Force Protection](#brute-force-protection)
8. [CSRF Protection](#csrf-protection)
9. [Security Headers](#security-headers)
10. [Logging & Monitoring](#logging--monitoring)
11. [Environment Configuration](#environment-configuration)
12. [Security Testing](#security-testing)

## Authentication & Authorization

### JWT Token Verification
- All API endpoints require valid JWT tokens for access
- Tokens are verified using the `verifyToken` function in `lib/auth-middleware.ts`
- Token expiration is checked on each request
- User roles are validated for role-based access control

### Role-Based Access Control (RBAC)
- Users are assigned roles: employee, admin, hr, manager
- Access to resources is restricted based on user roles
- Role validation is performed in middleware before request processing

## Password Security

### Bcrypt Hashing
- Passwords are hashed using bcrypt with 12 salt rounds
- Implemented in `lib/auth.ts` with `hashPassword` and `verifyPassword` functions
- Backward compatibility maintained for existing simple hashes
- Password strength validation enforces complex passwords

### Password Policy
- Minimum 8 characters
- Requires uppercase, lowercase, numbers, and special characters
- Password history prevents reuse of recent passwords
- 90-day password expiration recommended

## Session Management

### Secure Session Storage
- Sessions are stored using encrypted localStorage via `lib/secure-storage.ts`
- AES-256-CBC encryption with PBKDF2 key derivation
- Session data includes user info, tokens, and metadata
- Automatic session expiry after 1 hour of inactivity

### Device Fingerprinting
- Device fingerprints are generated for session validation
- Canvas-based fingerprinting for unique device identification
- Sessions are invalidated if device fingerprint changes

### Concurrent Session Limits
- Maximum 3 concurrent sessions per user
- Session cleanup removes expired sessions
- Session activity tracking extends session lifetime

## Data Encryption

### Client-Side Encryption
- Sensitive data is encrypted before storing in localStorage
- Implemented in `lib/secure-storage.ts`
- Uses AES-256-CBC with random IV and salt
- Encryption keys are derived using PBKDF2 with 100,000 iterations

### Environment Variables
- Encryption keys are stored in environment variables
- `NEXT_PUBLIC_ENCRYPTION_KEY` must be 32 characters minimum
- JWT and session secrets must be at least 32 characters

## Input Validation

### Zod Schemas
- All API inputs are validated using Zod schemas in `lib/validation-schemas.ts`
- Comprehensive validation for authentication, attendance, and user data
- Type-safe validation with detailed error messages

### Input Sanitization
- User inputs are sanitized to prevent XSS attacks
- HTML tags and special characters are removed
- URL validation prevents malicious redirects
- File upload restrictions enforce allowed file types

## Rate Limiting

### API Rate Limiting
- General API: 100 requests per 15-minute window
- Authentication endpoints: 5 requests per 15-minute window
- Sensitive operations: 3 requests per hour
- Implemented in `lib/security-middleware.ts`

### Client Identification
- Rate limiting uses IP address and user agent fingerprint
- Headers included in responses: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Rate limit errors return HTTP 429 with `Retry-After` header

## Brute Force Protection

### Failed Login Tracking
- Failed login attempts are tracked per email/username
- Account locked after 5 failed attempts
- Lockout duration: 15 minutes (progressive for repeated attempts)
- Implemented in `lib/security-middleware.ts`

### Account Lockout
- Locked accounts receive HTTP 423 response
- Lockout information included in error response
- Successful login resets failed attempt counter
- Admin notifications for account lockouts

## CSRF Protection

### CSRF Tokens
- CSRF tokens are generated for state-changing requests
- Tokens expire after 1 hour
- Tokens are validated in middleware for POST, PUT, DELETE, PATCH
- Implemented in `lib/security-middleware.ts`

### Exempt Paths
- Webhook endpoints and public APIs are exempt from CSRF protection
- Configurable exempt paths in security configuration

## Security Headers

### HTTP Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Content Security Policy (CSP)
- Restricts resource loading to same origin
- Allows inline scripts and styles for compatibility
- Prevents data exfiltration through malicious resources

### HSTS (HTTPS Only)
- HTTP Strict Transport Security in production
- `max-age=31536000; includeSubDomains`
- Prevents downgrade attacks

## Logging & Monitoring

### Security Event Logging
- All security events are logged with severity levels
- Failed authentication attempts are tracked
- Account lockouts and rate limiting events are logged
- Session creation and destruction events are logged

### Audit Trail
- User actions are logged for audit purposes
- API requests are logged with user context
- Security violations trigger high-severity alerts
- Log retention: 90 days (configurable)

## Environment Configuration

### Security Environment Variables
```bash
# Security Configuration
JWT_SECRET=your-very-secure-jwt-secret-key-minimum-32-characters
SESSION_SECRET=your-very-secure-session-secret-key-minimum-32-characters
NEXT_PUBLIC_ENCRYPTION_KEY=your-32-character-encryption-key-here

# Security Settings
SECURITY_BCRYPT_ROUNDS=12
SESSION_TIMEOUT_MINUTES=60
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=100

# Feature Flags
ENABLE_CSRF_PROTECTION=true
ENABLE_RATE_LIMITING=true
ENABLE_BRUTE_FORCE_PROTECTION=true
ENABLE_SESSION_MANAGEMENT=true
ENABLE_SECURITY_HEADERS=true
```

### Production Configuration
- All secrets must be changed from defaults
- HTTPS must be enabled in production
- Secure cookies must be enabled
- Database connections must use SSL

## Security Testing

### Automated Security Tests
- Comprehensive test suite in `lib/security-tests.ts`
- Tests for password hashing, encryption, and session management
- Validation of rate limiting and brute force protection
- Input validation and sanitization tests

### Running Security Tests
```typescript
import { runSecurityTests } from '@/lib/security-tests'

const results = await runSecurityTests()
console.log('Security test results:', results)
```

### Security Checklist
- [ ] All passwords are hashed with bcrypt
- [ ] Sensitive data is encrypted at rest
- [ ] JWT tokens are properly validated
- [ ] Rate limiting is configured
- [ ] Brute force protection is enabled
- [ ] CSRF protection is active
- [ ] Security headers are set
- [ ] Input validation is implemented
- [ ] Security logging is enabled
- [ ] Environment variables are configured

## Best Practices

### Development
- Use different environment variables for development and production
- Enable debug logging in development only
- Test security features thoroughly
- Keep dependencies updated

### Deployment
- Use HTTPS in production
- Configure proper CORS policies
- Set secure cookie flags
- Enable security monitoring
- Regular security audits

### Incident Response
- Monitor security logs regularly
- Have an incident response plan
- Review security events monthly
- Update security measures as needed

## Security Updates

This security implementation is regularly updated to address new vulnerabilities. Please check for updates and review the changelog for security-related changes.

For security concerns or vulnerabilities, please report them through the appropriate channels and do not disclose them publicly.