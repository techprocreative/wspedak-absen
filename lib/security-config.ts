// Security configuration for the attendance system
export const SECURITY_CONFIG = {
  // Password policy
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90, // days
    preventReuse: 5, // number of previous passwords to prevent reuse
    saltRounds: 12 // bcrypt salt rounds
  },

  // Session management
  session: {
    timeout: 60 * 60 * 1000, // 1 hour in milliseconds
    activityTimeout: 15 * 60 * 1000, // 15 minutes of inactivity
    maxConcurrentSessions: 3,
    secureCookie: true,
    httpOnlyCookie: true,
    sameSiteCookie: 'strict' as const
  },

  // Rate limiting
  rateLimiting: {
    // General API rate limiting
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100
    },
    // Authentication endpoints
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5
    },
    // Sensitive operations
    sensitive: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3
    }
  },

  // Brute force protection
  bruteForce: {
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    resetDuration: 60 * 60 * 1000, // 1 hour
    progressiveLockout: true, // Increase lockout duration for repeated attempts
    notifyAdmin: true
  },

  // CSRF protection
  csrf: {
    tokenExpiry: 60 * 60 * 1000, // 1 hour
    requireToken: ['POST', 'PUT', 'DELETE', 'PATCH'],
    exemptPaths: ['/api/webhook', '/api/public']
  },

  // Security headers
  headers: {
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    otherHeaders: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self)'  // Allow for face recognition
    }
  },

  // Encryption settings
  encryption: {
    algorithm: 'AES-256-CBC',
    keyDerivation: {
      algorithm: 'PBKDF2',
      iterations: 100000,
      keyLength: 32,
      hashFunction: 'sha256'
    }
  },

  // Logging and monitoring
  logging: {
    level: 'info', // debug, info, warn, error
    logSecurityEvents: true,
    logFailedAuth: true,
    logRateLimit: true,
    logSessionEvents: true,
    retentionDays: 90
  },

  // Data validation
  validation: {
    strictMode: true,
    sanitizeInput: true,
    maxUploadSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'],
    maxRequestSize: 50 * 1024 * 1024 // 50MB
  },

  // API security
  api: {
    requireAuth: true,
    corsEnabled: true,
    corsOrigins: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] 
      : ['http://localhost:3000', 'http://localhost:3001'],
    versionHeader: true,
    requestIdHeader: true
  },

  // Database security
  database: {
    connectionTimeout: 30000, // 30 seconds
    queryTimeout: 10000, // 10 seconds
    maxConnections: 100,
    sslEnabled: process.env.NODE_ENV === 'production',
    encryptionAtRest: true
  }
}

// Environment-specific overrides
export const getSecurityConfig = () => {
  const config = { ...SECURITY_CONFIG }

  if (process.env.NODE_ENV === 'development') {
    // Relax some security settings for development
    config.headers.hsts.includeSubDomains = false
    config.headers.hsts.preload = false
    config.rateLimiting.api.maxRequests = 1000
    config.rateLimiting.auth.maxRequests = 50
    config.logging.level = 'debug'
  }

  if (process.env.NODE_ENV === 'test') {
    // Minimal security for testing
    config.session.timeout = 5 * 60 * 1000 // 5 minutes
    config.bruteForce.maxLoginAttempts = 10
    config.rateLimiting.api.maxRequests = 10000
    config.logging.level = 'error'
  }

  return config
}

// Security utilities
export const securityUtils = {
  // Check if current environment is secure
  isSecureEnvironment: (): boolean => {
    return process.env.NODE_ENV === 'production' && 
           process.env.HTTPS === 'true'
  },

  // Generate secure random string
  generateSecureRandom: (length: number = 32): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    
    if (typeof window !== 'undefined' && window.crypto) {
      const array = new Uint8Array(length)
      window.crypto.getRandomValues(array)
      for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length]
      }
    } else {
      // Fallback for server-side
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
    }
    
    return result
  },

  // Validate password strength
  validatePasswordStrength: (password: string): { 
    isValid: boolean
    errors: string[] 
  } => {
    const config = getSecurityConfig().password
    const errors: string[] = []

    if (password.length < config.minLength) {
      errors.push(`Password must be at least ${config.minLength} characters long`)
    }

    if (password.length > config.maxLength) {
      errors.push(`Password must be no more than ${config.maxLength} characters long`)
    }

    if (config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (config.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    if (config.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  // Check if IP address is from private network
  isPrivateIP: (ip: string): boolean => {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^localhost$/,
      /^::1$/,
      /^fc00:/,
      /^fe80:/
    ]

    return privateRanges.some(range => range.test(ip))
  },

  // Sanitize URL to prevent XSS
  sanitizeUrl: (url: string): string => {
    try {
      const parsed = new URL(url)
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return '#'
      }
      return parsed.toString()
    } catch {
      return '#'
    }
  },

  // Generate fingerprint for device identification
  generateFingerprint: (): string => {
    if (typeof window === 'undefined') return 'server'

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'no-canvas'

    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('Device fingerprint', 2, 2)
    
    const fingerprint = canvas.toDataURL().slice(-50)
    return btoa(fingerprint).slice(0, 32)
  }
}

export default getSecurityConfig