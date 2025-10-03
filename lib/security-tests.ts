import { hashPassword, verifyPassword } from './auth'
import { secureStorage } from './secure-storage'
import { sessionManager } from './session-manager'
import { BruteForceProtection, RateLimiter } from './security-middleware'
import { securityUtils } from './security-config'
import { loginSchema, attendanceRecordSchema } from './validation-schemas'

// Security test suite
export class SecurityTests {
  // Test password hashing
  static async testPasswordHashing(): Promise<{ passed: boolean; details: string }> {
    try {
      const testPassword = 'TestPassword123!'
      
      // Test hashing
      const hashedPassword = await hashPassword(testPassword)
      if (!hashedPassword || hashedPassword.length < 50) {
        return { passed: false, details: 'Password hash is too short or invalid' }
      }
      
      // Test verification
      const isValid = await verifyPassword(testPassword, hashedPassword)
      if (!isValid) {
        return { passed: false, details: 'Password verification failed' }
      }
      
      // Test with wrong password
      const isInvalid = await verifyPassword('WrongPassword', hashedPassword)
      if (isInvalid) {
        return { passed: false, details: 'Password verification should fail for wrong password' }
      }
      
      return { passed: true, details: 'Password hashing and verification working correctly' }
    } catch (error) {
      return { passed: false, details: `Password hashing error: ${error}` }
    }
  }

  // Test secure storage
  static testSecureStorage(): { passed: boolean; details: string } {
    try {
      const testData = { sensitive: 'data', token: 'abc123' }
      const testKey = 'test_secure_storage'
      
      // Test encryption and storage
      secureStorage.setItem(testKey, testData)
      
      // Test retrieval and decryption
      const retrievedData = secureStorage.getItem(testKey)
      if (!retrievedData) {
        return { passed: false, details: 'Failed to retrieve encrypted data' }
      }
      
      if (retrievedData.sensitive !== testData.sensitive || retrievedData.token !== testData.token) {
        return { passed: false, details: 'Retrieved data does not match original data' }
      }
      
      // Test session data with expiry
      secureStorage.setSessionData('test_session', testData, 1/60) // 1 minute
      const sessionData = secureStorage.getSessionData('test_session')
      if (!sessionData || sessionData.sensitive !== testData.sensitive) {
        return { passed: false, details: 'Session data storage/retrieval failed' }
      }
      
      // Cleanup
      secureStorage.removeItem(testKey)
      secureStorage.removeItem('test_session')
      
      return { passed: true, details: 'Secure storage encryption/decryption working correctly' }
    } catch (error) {
      return { passed: false, details: `Secure storage error: ${error}` }
    }
  }

  // Test session management
  static testSessionManagement(): { passed: boolean; details: string } {
    try {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: { role: 'employee', name: 'Test User' }
      }
      
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer'
      }
      
      // Test session creation
      sessionManager.createSession(mockUser as any, mockSession as any)
      
      // Test session retrieval
      const currentSession = sessionManager.getCurrentSession()
      if (!currentSession) {
        return { passed: false, details: 'Failed to create or retrieve session' }
      }
      
      if (currentSession.user.id !== mockUser.id || currentSession.user.email !== mockUser.email) {
        return { passed: false, details: 'Session user data does not match' }
      }
      
      // Test session validity
      const isValid = sessionManager.isSessionValid()
      if (!isValid) {
        return { passed: false, details: 'Session should be valid but is reported as invalid' }
      }
      
      // Test session stats
      const stats = sessionManager.getSessionStats()
      if (!stats || !stats.isValid) {
        return { passed: false, details: 'Session stats are invalid' }
      }
      
      // Test session destruction
      sessionManager.destroySession()
      const destroyedSession = sessionManager.getCurrentSession()
      if (destroyedSession) {
        return { passed: false, details: 'Failed to destroy session' }
      }
      
      return { passed: true, details: 'Session management working correctly' }
    } catch (error) {
      return { passed: false, details: `Session management error: ${error}` }
    }
  }

  // Test brute force protection
  static async testBruteForceProtection(): Promise<{ passed: boolean; details: string }> {
    try {
      const testIdentifier = 'test@example.com'
      
      // Reset any existing attempts
      BruteForceProtection.cleanup()
      
      // Test failed login tracking
      let isLocked = await BruteForceProtection.trackFailedLogin(testIdentifier)
      if (isLocked) {
        return { passed: false, details: 'Account should not be locked after first failed attempt' }
      }
      
      // Track more failed attempts
      for (let i = 1; i < 5; i++) {
        isLocked = await BruteForceProtection.trackFailedLogin(testIdentifier)
      }
      
      // Check if account is locked after max attempts
      if (!isLocked) {
        return { passed: false, details: 'Account should be locked after max failed attempts' }
      }
      
      // Test successful login resets attempts
      await BruteForceProtection.trackSuccessfulLogin(testIdentifier)
      isLocked = BruteForceProtection.isAccountLocked(testIdentifier)
      if (isLocked) {
        return { passed: false, details: 'Account should be unlocked after successful login' }
      }
      
      // Cleanup
      BruteForceProtection.cleanup()
      
      return { passed: true, details: 'Brute force protection working correctly' }
    } catch (error) {
      return { passed: false, details: `Brute force protection error: ${error}` }
    }
  }

  // Test rate limiting
  static testRateLimiting(): { passed: boolean; details: string } {
    try {
      const testIdentifier = 'test-rate-limit'
      const windowMs = 1000 // 1 second
      const maxRequests = 3
      
      // Reset rate limiter
      RateLimiter.cleanup()
      
      // Test rate limiting
      let result = RateLimiter.isRateLimited(testIdentifier, windowMs, maxRequests)
      if (result.limited || result.remaining !== maxRequests - 1) {
        return { passed: false, details: 'Rate limiting should not trigger on first request' }
      }
      
      // Make more requests
      result = RateLimiter.isRateLimited(testIdentifier, windowMs, maxRequests)
      if (result.limited || result.remaining !== maxRequests - 2) {
        return { passed: false, details: 'Rate limiting should not trigger on second request' }
      }
      
      result = RateLimiter.isRateLimited(testIdentifier, windowMs, maxRequests)
      if (result.limited || result.remaining !== maxRequests - 3) {
        return { passed: false, details: 'Rate limiting should not trigger on third request' }
      }
      
      // This should trigger rate limiting
      result = RateLimiter.isRateLimited(testIdentifier, windowMs, maxRequests)
      if (!result.limited) {
        return { passed: false, details: 'Rate limiting should trigger after max requests' }
      }
      
      // Cleanup
      RateLimiter.cleanup()
      
      return { passed: true, details: 'Rate limiting working correctly' }
    } catch (error) {
      return { passed: false, details: `Rate limiting error: ${error}` }
    }
  }

  // Test input validation
  static testInputValidation(): { passed: boolean; details: string } {
    try {
      // Test login schema validation
      const validLogin = { email: 'test@example.com', password: 'TestPassword123!' }
      const validResult = loginSchema.safeParse(validLogin)
      if (!validResult.success) {
        return { passed: false, details: 'Valid login data should pass validation' }
      }
      
      const invalidLogin = { email: 'invalid-email', password: '123' }
      const invalidResult = loginSchema.safeParse(invalidLogin)
      if (invalidResult.success) {
        return { passed: false, details: 'Invalid login data should fail validation' }
      }
      
      // Test attendance record schema validation
      const validRecord = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        date: '2023-01-01',
        checkIn: '2023-01-01T08:00:00Z',
        checkOut: '2023-01-01T17:00:00Z'
      }
      const validRecordResult = attendanceRecordSchema.safeParse(validRecord)
      if (!validRecordResult.success) {
        return { passed: false, details: 'Valid attendance record should pass validation' }
      }
      
      const invalidRecord = {
        userId: 'invalid-uuid',
        date: 'invalid-date',
        checkIn: '2023-01-01T17:00:00Z',
        checkOut: '2023-01-01T08:00:00Z' // Invalid time sequence
      }
      const invalidRecordResult = attendanceRecordSchema.safeParse(invalidRecord)
      if (invalidRecordResult.success) {
        return { passed: false, details: 'Invalid attendance record should fail validation' }
      }
      
      return { passed: true, details: 'Input validation working correctly' }
    } catch (error) {
      return { passed: false, details: `Input validation error: ${error}` }
    }
  }

  // Test security utilities
  static testSecurityUtils(): { passed: boolean; details: string } {
    try {
      // Test password strength validation
      const weakPassword = '123'
      const weakResult = securityUtils.validatePasswordStrength(weakPassword)
      if (weakResult.isValid) {
        return { passed: false, details: 'Weak password should fail validation' }
      }
      
      const strongPassword = 'StrongPassword123!'
      const strongResult = securityUtils.validatePasswordStrength(strongPassword)
      if (!strongResult.isValid) {
        return { passed: false, details: 'Strong password should pass validation' }
      }
      
      // Test secure random generation
      const random1 = securityUtils.generateSecureRandom(32)
      const random2 = securityUtils.generateSecureRandom(32)
      if (random1 === random2 || random1.length !== 32) {
        return { passed: false, details: 'Secure random generation is not working correctly' }
      }
      
      // Test URL sanitization
      const maliciousUrl = 'javascript:alert("xss")'
      const sanitizedUrl = securityUtils.sanitizeUrl(maliciousUrl)
      if (sanitizedUrl !== '#') {
        return { passed: false, details: 'Malicious URL should be sanitized' }
      }
      
      // Test private IP detection
      const privateIP = '192.168.1.1'
      const isPrivate = securityUtils.isPrivateIP(privateIP)
      if (!isPrivate) {
        return { passed: false, details: 'Private IP detection should work' }
      }
      
      const publicIP = '8.8.8.8'
      const isNotPrivate = securityUtils.isPrivateIP(publicIP)
      if (isNotPrivate) {
        return { passed: false, details: 'Public IP should not be detected as private' }
      }
      
      return { passed: true, details: 'Security utilities working correctly' }
    } catch (error) {
      return { passed: false, details: `Security utilities error: ${error}` }
    }
  }

  // Run all security tests
  static async runAllTests(): Promise<{
    passed: boolean
    results: Array<{ test: string; passed: boolean; details: string }>
  }> {
    const tests = [
      { name: 'Password Hashing', test: () => this.testPasswordHashing() },
      { name: 'Secure Storage', test: () => this.testSecureStorage() },
      { name: 'Session Management', test: () => this.testSessionManagement() },
      { name: 'Brute Force Protection', test: () => this.testBruteForceProtection() },
      { name: 'Rate Limiting', test: () => this.testRateLimiting() },
      { name: 'Input Validation', test: () => this.testInputValidation() },
      { name: 'Security Utilities', test: () => this.testSecurityUtils() }
    ]
    
    const results = []
    let allPassed = true
    
    for (const { name, test } of tests) {
      try {
        const result = await test()
        results.push({ test: name, ...result })
        if (!result.passed) {
          allPassed = false
        }
      } catch (error) {
        results.push({
          test: name,
          passed: false,
          details: `Test error: ${error}`
        })
        allPassed = false
      }
    }
    
    return { passed: allPassed, results }
  }
}

// Export convenience function
export const runSecurityTests = () => SecurityTests.runAllTests()