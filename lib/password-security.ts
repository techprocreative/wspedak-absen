import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { secureStorage } from './secure-storage'

// Password security configuration
const PASSWORD_HISTORY_KEY = 'password_history'
const ACCOUNT_LOCKOUT_KEY = 'account_lockout'
const PASSWORD_POLICY_KEY = 'password_policy'
const DEFAULT_SALT_ROUNDS = 12

// Password policy interface
export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  maxAge: number // days
  historyCount: number // number of previous passwords to check
  preventCommonPasswords: boolean
  preventUserInfo: boolean
}

// Password history interface
export interface PasswordHistory {
  userId: string
  hashedPasswords: string[]
  timestamps: string[]
}

// Account lockout interface
export interface AccountLockout {
  userId: string
  failedAttempts: number
  lockoutUntil?: string
  lastFailedAttempt?: string
  isLocked: boolean
}

// Password validation result
export interface PasswordValidationResult {
  isValid: boolean
  strength: 'weak' | 'fair' | 'good' | 'strong'
  errors: string[]
  warnings: string[]
  score: number // 0-100
}

// Password change result
export interface PasswordChangeResult {
  success: boolean
  requiresPasswordChange: boolean
  daysUntilExpiration?: number
  error?: string
}

// Common passwords list (simplified version)
const COMMON_PASSWORDS = [
  'password', '123456', '123456789', '12345678', '12345', '1234567',
  '1234567890', '1234', 'qwerty', 'abc123', 'password123', 'admin',
  'letmein', 'welcome', 'monkey', '1234567890', 'password1'
]

// Default password policy
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90, // 90 days
  historyCount: 5, // Remember last 5 passwords
  preventCommonPasswords: true,
  preventUserInfo: true,
}

// Password security manager class
export class PasswordSecurityManager {
  private static instance: PasswordSecurityManager
  private passwordPolicy: PasswordPolicy
  private maxFailedAttempts: number
  private lockoutDuration: number // minutes

  private constructor() {
    this.passwordPolicy = this.loadPasswordPolicy()
    this.maxFailedAttempts = 5
    this.lockoutDuration = 15 // 15 minutes
  }

  public static getInstance(): PasswordSecurityManager {
    if (!PasswordSecurityManager.instance) {
      PasswordSecurityManager.instance = new PasswordSecurityManager()
    }
    return PasswordSecurityManager.instance
  }

  // Load password policy from storage or use default
  private loadPasswordPolicy(): PasswordPolicy {
    try {
      const storedPolicy = secureStorage.getItem<PasswordPolicy>(PASSWORD_POLICY_KEY)
      return storedPolicy || DEFAULT_PASSWORD_POLICY
    } catch (error) {
      console.error('Error loading password policy:', error)
      return DEFAULT_PASSWORD_POLICY
    }
  }

  // Save password policy to storage
  private savePasswordPolicy(policy: PasswordPolicy): void {
    try {
      secureStorage.setItem(PASSWORD_POLICY_KEY, policy)
      this.passwordPolicy = policy
    } catch (error) {
      console.error('Error saving password policy:', error)
      throw new Error('Failed to save password policy')
    }
  }

  // Get current password policy
  getPasswordPolicy(): PasswordPolicy {
    return { ...this.passwordPolicy }
  }

  // Update password policy
  updatePasswordPolicy(policy: Partial<PasswordPolicy>): void {
    this.savePasswordPolicy({ ...this.passwordPolicy, ...policy })
  }

  // Hash password with bcrypt
  async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = DEFAULT_SALT_ROUNDS
      return await bcrypt.hash(password, saltRounds)
    } catch (error) {
      console.error('Error hashing password:', error)
      throw new Error('Failed to hash password')
    }
  }

  // Verify password against hash
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash)
    } catch (error) {
      console.error('Error verifying password:', error)
      return false
    }
  }

  // Validate password strength and policy compliance
  validatePassword(password: string, userInfo?: { email?: string; name?: string; username?: string }): PasswordValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    let score = 0

    // Check minimum length
    if (password.length < this.passwordPolicy.minLength) {
      errors.push(`Password must be at least ${this.passwordPolicy.minLength} characters long`)
    } else {
      score += 20
    }

    // Check for uppercase letters
    if (this.passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    } else if (/[A-Z]/.test(password)) {
      score += 15
    }

    // Check for lowercase letters
    if (this.passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    } else if (/[a-z]/.test(password)) {
      score += 15
    }

    // Check for numbers
    if (this.passwordPolicy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    } else if (/\d/.test(password)) {
      score += 15
    }

    // Check for special characters
    if (this.passwordPolicy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character')
    } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 15
    }

    // Check for common passwords
    if (this.passwordPolicy.preventCommonPasswords) {
      const normalizedPassword = password.toLowerCase()
      if (COMMON_PASSWORDS.includes(normalizedPassword)) {
        errors.push('Password is too common and easily guessable')
        score -= 30
      }
    }

    // Check for user information in password
    if (this.passwordPolicy.preventUserInfo && userInfo) {
      const userInfoStrings = [
        userInfo.email?.toLowerCase().split('@')[0],
        userInfo.name?.toLowerCase(),
        userInfo.username?.toLowerCase(),
      ].filter(Boolean)

      for (const info of userInfoStrings) {
        if (info && password.toLowerCase().includes(info)) {
          errors.push('Password should not contain your personal information')
          score -= 20
          break
        }
      }
    }

    // Additional strength checks
    if (password.length >= 12) score += 10
    if (password.length >= 16) score += 10
    if (!/(.)\1{2,}/.test(password)) score += 5 // No repeated characters
    if (/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/.test(password)) score += 5 // Valid characters only

    // Calculate strength
    let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak'
    if (score >= 80) strength = 'strong'
    else if (score >= 60) strength = 'good'
    else if (score >= 40) strength = 'fair'

    // Add warnings
    if (score < 60 && errors.length === 0) {
      warnings.push('Password meets minimum requirements but could be stronger')
    }

    if (password.length < 12) {
      warnings.push('Consider using a longer password for better security')
    }

    return {
      isValid: errors.length === 0,
      strength,
      errors,
      warnings,
      score: Math.max(0, Math.min(100, score)),
    }
  }

  // Add password to history
  addPasswordToHistory(userId: string, hashedPassword: string): void {
    try {
      const history = this.getPasswordHistory(userId)
      
      // Add new password
      history.hashedPasswords.unshift(hashedPassword)
      history.timestamps.unshift(new Date().toISOString())
      
      // Keep only the required number of passwords
      if (history.hashedPasswords.length > this.passwordPolicy.historyCount) {
        history.hashedPasswords = history.hashedPasswords.slice(0, this.passwordPolicy.historyCount)
        history.timestamps = history.timestamps.slice(0, this.passwordPolicy.historyCount)
      }
      
      // Save updated history
      this.savePasswordHistory(userId, history)
    } catch (error) {
      console.error('Error adding password to history:', error)
    }
  }

  // Get password history for user
  private getPasswordHistory(userId: string): PasswordHistory {
    try {
      const allHistory = secureStorage.getItem<PasswordHistory[]>(PASSWORD_HISTORY_KEY) || []
      return allHistory.find(h => h.userId === userId) || {
        userId,
        hashedPasswords: [],
        timestamps: [],
      }
    } catch (error) {
      console.error('Error retrieving password history:', error)
      return { userId, hashedPasswords: [], timestamps: [] }
    }
  }

  // Save password history for user
  private savePasswordHistory(userId: string, history: PasswordHistory): void {
    try {
      const allHistory = secureStorage.getItem<PasswordHistory[]>(PASSWORD_HISTORY_KEY) || []
      const existingIndex = allHistory.findIndex(h => h.userId === userId)
      
      if (existingIndex !== -1) {
        allHistory[existingIndex] = history
      } else {
        allHistory.push(history)
      }
      
      secureStorage.setItem(PASSWORD_HISTORY_KEY, allHistory)
    } catch (error) {
      console.error('Error saving password history:', error)
    }
  }

  // Check if password is in user's history
  async isPasswordInHistory(userId: string, newPassword: string): Promise<boolean> {
    try {
      const history = this.getPasswordHistory(userId)
      
      for (const oldHashedPassword of history.hashedPasswords) {
        if (await this.verifyPassword(newPassword, oldHashedPassword)) {
          return true
        }
      }
      
      return false
    } catch (error) {
      console.error('Error checking password history:', error)
      return false
    }
  }

  // Record failed login attempt
  recordFailedAttempt(userId: string): void {
    try {
      const lockouts = this.getAllAccountLockouts()
      let lockout = lockouts.find(l => l.userId === userId)
      
      if (!lockout) {
        lockout = {
          userId,
          failedAttempts: 0,
          isLocked: false,
        }
        lockouts.push(lockout)
      }
      
      lockout.failedAttempts++
      lockout.lastFailedAttempt = new Date().toISOString()
      
      // Check if account should be locked
      if (lockout.failedAttempts >= this.maxFailedAttempts) {
        lockout.isLocked = true
        lockout.lockoutUntil = new Date(Date.now() + this.lockoutDuration * 60 * 1000).toISOString()
      }
      
      secureStorage.setItem(ACCOUNT_LOCKOUT_KEY, lockouts)
    } catch (error) {
      console.error('Error recording failed attempt:', error)
    }
  }

  // Clear failed attempts on successful login
  clearFailedAttempts(userId: string): void {
    try {
      const lockouts = this.getAllAccountLockouts()
      const lockout = lockouts.find(l => l.userId === userId)
      
      if (lockout) {
        lockout.failedAttempts = 0
        lockout.isLocked = false
        lockout.lockoutUntil = undefined
        lockout.lastFailedAttempt = undefined
        
        secureStorage.setItem(ACCOUNT_LOCKOUT_KEY, lockouts)
      }
    } catch (error) {
      console.error('Error clearing failed attempts:', error)
    }
  }

  // Get all account lockouts
  private getAllAccountLockouts(): AccountLockout[] {
    try {
      return secureStorage.getItem<AccountLockout[]>(ACCOUNT_LOCKOUT_KEY) || []
    } catch (error) {
      console.error('Error retrieving account lockouts:', error)
      return []
    }
  }

  // Check if account is locked
  isAccountLocked(userId: string): { isLocked: boolean; lockoutUntil?: string; remainingTime?: number } {
    try {
      const lockouts = this.getAllAccountLockouts()
      const lockout = lockouts.find(l => l.userId === userId)
      
      if (!lockout || !lockout.isLocked) {
        return { isLocked: false }
      }
      
      // Check if lockout has expired
      if (lockout.lockoutUntil) {
        const lockoutTime = new Date(lockout.lockoutUntil).getTime()
        const now = Date.now()
        
        if (now > lockoutTime) {
          // Lockout expired, clear it
          this.clearFailedAttempts(userId)
          return { isLocked: false }
        }
        
        const remainingTime = Math.ceil((lockoutTime - now) / (1000 * 60)) // minutes
        return { 
          isLocked: true, 
          lockoutUntil: lockout.lockoutUntil, 
          remainingTime 
        }
      }
      
      return { isLocked: true }
    } catch (error) {
      console.error('Error checking account lockout:', error)
      return { isLocked: false }
    }
  }

  // Change password with all security checks
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentHashedPassword?: string,
    userInfo?: { email?: string; name?: string; username?: string }
  ): Promise<PasswordChangeResult> {
    try {
      // Validate new password
      const validation = this.validatePassword(newPassword, userInfo)
      if (!validation.isValid) {
        return {
          success: false,
          requiresPasswordChange: false,
          error: `Password validation failed: ${validation.errors.join(', ')}`,
        }
      }

      // Check if current password is provided and valid
      if (currentHashedPassword && currentPassword) {
        const isCurrentPasswordValid = await this.verifyPassword(currentPassword, currentHashedPassword)
        if (!isCurrentPasswordValid) {
          return {
            success: false,
            requiresPasswordChange: false,
            error: 'Current password is incorrect',
          }
        }
      }

      // Check password history
      const isInHistory = await this.isPasswordInHistory(userId, newPassword)
      if (isInHistory) {
        return {
          success: false,
          requiresPasswordChange: false,
          error: `Password cannot be reused. Last ${this.passwordPolicy.historyCount} passwords are remembered.`,
        }
      }

      // Hash new password
      const newHashedPassword = await this.hashPassword(newPassword)

      // Add to history
      this.addPasswordToHistory(userId, newHashedPassword)

      // Clear failed attempts
      this.clearFailedAttempts(userId)

      // Calculate days until expiration
      const daysUntilExpiration = this.passwordPolicy.maxAge

      return {
        success: true,
        requiresPasswordChange: false,
        daysUntilExpiration,
      }
    } catch (error) {
      console.error('Error changing password:', error)
      return {
        success: false,
        requiresPasswordChange: false,
        error: 'Failed to change password',
      }
    }
  }

  // Check if password requires change
  checkPasswordExpiry(userId: string, passwordCreatedAt?: string): PasswordChangeResult {
    try {
      if (!passwordCreatedAt) {
        return {
          success: true,
          requiresPasswordChange: false,
        }
      }

      const createdDate = new Date(passwordCreatedAt)
      const now = new Date()
      const daysSinceCreation = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
      const daysUntilExpiration = this.passwordPolicy.maxAge - daysSinceCreation

      if (daysUntilExpiration <= 0) {
        return {
          success: true,
          requiresPasswordChange: true,
          daysUntilExpiration: 0,
        }
      }

      // Require change if password is expiring soon (7 days)
      if (daysUntilExpiration <= 7) {
        return {
          success: true,
          requiresPasswordChange: true,
          daysUntilExpiration,
        }
      }

      return {
        success: true,
        requiresPasswordChange: false,
        daysUntilExpiration,
      }
    } catch (error) {
      console.error('Error checking password expiry:', error)
      return {
        success: true,
        requiresPasswordChange: false,
      }
    }
  }

  // Generate secure random password
  generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    const allChars = uppercase + lowercase + numbers + special

    let password = ''
    
    // Ensure at least one character from each required set
    if (this.passwordPolicy.requireUppercase) {
      password += uppercase.charAt(Math.floor(Math.random() * uppercase.length))
    }
    if (this.passwordPolicy.requireLowercase) {
      password += lowercase.charAt(Math.floor(Math.random() * lowercase.length))
    }
    if (this.passwordPolicy.requireNumbers) {
      password += numbers.charAt(Math.floor(Math.random() * numbers.length))
    }
    if (this.passwordPolicy.requireSpecialChars) {
      password += special.charAt(Math.floor(Math.random() * special.length))
    }

    // Fill remaining length
    for (let i = password.length; i < length; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length))
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  // Get password strength indicator
  getPasswordStrengthIndicator(password: string): { strength: string; color: string; percentage: number } {
    const validation = this.validatePassword(password)
    
    let strength = 'Weak'
    let color = 'red'
    let percentage = validation.score

    if (validation.strength === 'strong') {
      strength = 'Strong'
      color = 'green'
    } else if (validation.strength === 'good') {
      strength = 'Good'
      color = 'blue'
    } else if (validation.strength === 'fair') {
      strength = 'Fair'
      color = 'yellow'
    }

    return { strength, color, percentage }
  }

  // Set max failed attempts
  setMaxFailedAttempts(max: number): void {
    this.maxFailedAttempts = max
  }

  // Set lockout duration
  setLockoutDuration(minutes: number): void {
    this.lockoutDuration = minutes
  }

  // Get max failed attempts
  getMaxFailedAttempts(): number {
    return this.maxFailedAttempts
  }

  // Get lockout duration
  getLockoutDuration(): number {
    return this.lockoutDuration
  }
}

// Export singleton instance
export const passwordSecurityManager = PasswordSecurityManager.getInstance()

// Export convenience functions
export const validatePassword = (password: string, userInfo?: { email?: string; name?: string; username?: string }) =>
  passwordSecurityManager.validatePassword(password, userInfo)

export const changePassword = (
  userId: string,
  currentPassword: string,
  newPassword: string,
  currentHashedPassword?: string,
  userInfo?: { email?: string; name?: string; username?: string }
) => passwordSecurityManager.changePassword(userId, currentPassword, newPassword, currentHashedPassword, userInfo)

export const isAccountLocked = (userId: string) =>
  passwordSecurityManager.isAccountLocked(userId)

export const recordFailedAttempt = (userId: string) =>
  passwordSecurityManager.recordFailedAttempt(userId)

export const clearFailedAttempts = (userId: string) =>
  passwordSecurityManager.clearFailedAttempts(userId)

export const checkPasswordExpiry = (userId: string, passwordCreatedAt?: string) =>
  passwordSecurityManager.checkPasswordExpiry(userId, passwordCreatedAt)

export const generateSecurePassword = (length?: number) =>
  passwordSecurityManager.generateSecurePassword(length)

export const getPasswordStrengthIndicator = (password: string) =>
  passwordSecurityManager.getPasswordStrengthIndicator(password)