import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import crypto from 'crypto'
import { secureStorage } from './secure-storage'

// MFA configuration
const MFA_SECRET_KEY = process.env.MFA_SECRET_KEY || 'default-mfa-secret-change-in-production'
const MFA_STORAGE_KEY = 'mfa_secrets'
const MFA_BACKUP_CODES_KEY = 'mfa_backup_codes'
const MFA_DEVICES_KEY = 'mfa_trusted_devices'

// MFA secret interface
export interface MFASecret {
  userId: string
  secret: string
  issuer: string
  label: string
  createdAt: string
  isActive: boolean
}

// Backup codes interface
export interface BackupCodes {
  userId: string
  codes: string[]
  createdAt: string
  usedCodes: string[]
  isActive: boolean
}

// Trusted device interface
export interface TrustedDevice {
  deviceId: string
  userId: string
  deviceName: string
  userAgent: string
  ip: string
  createdAt: string
  lastUsedAt: string
  expiresAt: string
  isActive: boolean
}

// MFA verification result
export interface MFAVerificationResult {
  success: boolean
  requiresBackupCode: boolean
  trustedDevice: boolean
  remainingAttempts: number
  error?: string
}

// MFA enrollment result
export interface MFAEnrollmentResult {
  success: boolean
  secret?: string
  qrCode?: string
  backupCodes?: string[]
  error?: string
}

// Generate a new MFA secret for a user
export function generateMFASecret(userId: string, email: string, issuer: string = 'Attendance System'): MFASecret {
  const secret = authenticator.generateSecret()
  
  return {
    userId,
    secret,
    issuer,
    label: email,
    createdAt: new Date().toISOString(),
    isActive: false, // Not active until verified
  }
}

// Generate QR code for MFA setup
export async function generateMFAQRCode(secret: string, email: string, issuer: string = 'Attendance System'): Promise<string> {
  try {
    const otpauthUrl = authenticator.keyuri(email, issuer, secret)
    const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl)
    return qrCodeDataURL
  } catch (error) {
    console.error('Error generating MFA QR code:', error)
    throw new Error('Failed to generate QR code')
  }
}

// Verify TOTP token
export function verifyTOTPToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret })
  } catch (error) {
    console.error('Error verifying TOTP token:', error)
    return false
  }
}

// Generate backup codes
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase())
  }
  return codes
}

// Store MFA secret securely
export function storeMFASecret(mfaSecret: MFASecret): void {
  try {
    const existingSecrets = getMFASecrets()
    const userSecrets = existingSecrets.filter(s => s.userId !== mfaSecret.userId)
    userSecrets.push(mfaSecret)
    
    secureStorage.setItem(MFA_STORAGE_KEY, userSecrets)
  } catch (error) {
    console.error('Error storing MFA secret:', error)
    throw new Error('Failed to store MFA secret')
  }
}

// Get all MFA secrets
export function getMFASecrets(): MFASecret[] {
  try {
    return secureStorage.getItem<MFASecret[]>(MFA_STORAGE_KEY) || []
  } catch (error) {
    console.error('Error retrieving MFA secrets:', error)
    return []
  }
}

// Get MFA secret for a user
export function getMFASecretForUser(userId: string): MFASecret | null {
  try {
    const secrets = getMFASecrets()
    return secrets.find(s => s.userId === userId && s.isActive) || null
  } catch (error) {
    console.error('Error retrieving MFA secret for user:', error)
    return null
  }
}

// Activate MFA for a user after successful verification
export function activateMFAForUser(userId: string): boolean {
  try {
    const secrets = getMFASecrets()
    const userSecret = secrets.find(s => s.userId === userId)
    
    if (!userSecret) {
      return false
    }
    
    userSecret.isActive = true
    secureStorage.setItem(MFA_STORAGE_KEY, secrets)
    return true
  } catch (error) {
    console.error('Error activating MFA for user:', error)
    return false
  }
}

// Deactivate MFA for a user
export function deactivateMFAForUser(userId: string): boolean {
  try {
    const secrets = getMFASecrets()
    const userSecret = secrets.find(s => s.userId === userId)
    
    if (!userSecret) {
      return false
    }
    
    userSecret.isActive = false
    secureStorage.setItem(MFA_STORAGE_KEY, secrets)
    
    // Also remove trusted devices and backup codes
    removeTrustedDevicesForUser(userId)
    removeBackupCodesForUser(userId)
    
    return true
  } catch (error) {
    console.error('Error deactivating MFA for user:', error)
    return false
  }
}

// Store backup codes for a user
export function storeBackupCodes(userId: string, codes: string[]): void {
  try {
    const backupCodesData: BackupCodes = {
      userId,
      codes,
      createdAt: new Date().toISOString(),
      usedCodes: [],
      isActive: true,
    }
    
    const existingBackupCodes = getBackupCodes()
    const userBackupCodes = existingBackupCodes.filter(b => b.userId !== userId)
    userBackupCodes.push(backupCodesData)
    
    secureStorage.setItem(MFA_BACKUP_CODES_KEY, userBackupCodes)
  } catch (error) {
    console.error('Error storing backup codes:', error)
    throw new Error('Failed to store backup codes')
  }
}

// Get backup codes for a user
export function getBackupCodesForUser(userId: string): BackupCodes | null {
  try {
    const backupCodes = getBackupCodes()
    return backupCodes.find(b => b.userId === userId && b.isActive) || null
  } catch (error) {
    console.error('Error retrieving backup codes for user:', error)
    return null
  }
}

// Get all backup codes
export function getBackupCodes(): BackupCodes[] {
  try {
    return secureStorage.getItem<BackupCodes[]>(MFA_BACKUP_CODES_KEY) || []
  } catch (error) {
    console.error('Error retrieving backup codes:', error)
    return []
  }
}

// Verify backup code
export function verifyBackupCode(userId: string, code: string): boolean {
  try {
    const backupCodesData = getBackupCodesForUser(userId)
    if (!backupCodesData) {
      return false
    }
    
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const isValidCode = backupCodesData.codes.includes(normalizedCode) && 
                       !backupCodesData.usedCodes.includes(normalizedCode)
    
    if (isValidCode) {
      backupCodesData.usedCodes.push(normalizedCode)
      secureStorage.setItem(MFA_BACKUP_CODES_KEY, getBackupCodes())
      return true
    }
    
    return false
  } catch (error) {
    console.error('Error verifying backup code:', error)
    return false
  }
}

// Remove backup codes for a user
export function removeBackupCodesForUser(userId: string): void {
  try {
    const backupCodes = getBackupCodes()
    const userBackupCodes = backupCodes.find(b => b.userId === userId)
    
    if (userBackupCodes) {
      userBackupCodes.isActive = false
      secureStorage.setItem(MFA_BACKUP_CODES_KEY, backupCodes)
    }
  } catch (error) {
    console.error('Error removing backup codes for user:', error)
  }
}

// Generate trusted device ID
export function generateTrustedDeviceId(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Store trusted device
export function storeTrustedDevice(device: TrustedDevice): void {
  try {
    const existingDevices = getTrustedDevices()
    const userDevices = existingDevices.filter(d => d.userId !== device.userId)
    userDevices.push(device)
    
    secureStorage.setItem(MFA_DEVICES_KEY, userDevices)
  } catch (error) {
    console.error('Error storing trusted device:', error)
    throw new Error('Failed to store trusted device')
  }
}

// Get trusted devices for a user
export function getTrustedDevicesForUser(userId: string): TrustedDevice[] {
  try {
    const devices = getTrustedDevices()
    const now = new Date()
    
    return devices
      .filter(d => d.userId === userId && d.isActive)
      .filter(d => new Date(d.expiresAt) > now) // Remove expired devices
  } catch (error) {
    console.error('Error retrieving trusted devices for user:', error)
    return []
  }
}

// Get all trusted devices
export function getTrustedDevices(): TrustedDevice[] {
  try {
    return secureStorage.getItem<TrustedDevice[]>(MFA_DEVICES_KEY) || []
  } catch (error) {
    console.error('Error retrieving trusted devices:', error)
    return []
  }
}

// Check if device is trusted
export function isDeviceTrusted(userId: string, userAgent: string, ip: string): TrustedDevice | null {
  try {
    const devices = getTrustedDevicesForUser(userId)
    const now = new Date()
    
    return devices.find(d => 
      d.userAgent === userAgent && 
      d.ip === ip && 
      new Date(d.expiresAt) > now
    ) || null
  } catch (error) {
    console.error('Error checking trusted device:', error)
    return null
  }
}

// Add trusted device (after successful MFA verification)
export function addTrustedDevice(userId: string, deviceName: string, userAgent: string, ip: string, daysValid: number = 30): TrustedDevice {
  const device: TrustedDevice = {
    deviceId: generateTrustedDeviceId(),
    userId,
    deviceName,
    userAgent,
    ip,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  }
  
  storeTrustedDevice(device)
  return device
}

// Remove trusted device
export function removeTrustedDevice(deviceId: string): boolean {
  try {
    const devices = getTrustedDevices()
    const device = devices.find(d => d.deviceId === deviceId)
    
    if (device) {
      device.isActive = false
      secureStorage.setItem(MFA_DEVICES_KEY, devices)
      return true
    }
    
    return false
  } catch (error) {
    console.error('Error removing trusted device:', error)
    return false
  }
}

// Remove all trusted devices for a user
export function removeTrustedDevicesForUser(userId: string): void {
  try {
    const devices = getTrustedDevices()
    devices.forEach(device => {
      if (device.userId === userId) {
        device.isActive = false
      }
    })
    
    secureStorage.setItem(MFA_DEVICES_KEY, devices)
  } catch (error) {
    console.error('Error removing trusted devices for user:', error)
  }
}

// Comprehensive MFA verification
export function verifyMFA(
  userId: string, 
  token: string, 
  userAgent?: string, 
  ip?: string,
  maxAttempts: number = 3
): MFAVerificationResult {
  try {
    const mfaSecret = getMFASecretForUser(userId)
    if (!mfaSecret) {
      return {
        success: false,
        requiresBackupCode: false,
        trustedDevice: false,
        remainingAttempts: maxAttempts,
        error: 'MFA not enabled for this user',
      }
    }
    
    // Check if device is trusted
    if (userAgent && ip) {
      const trustedDevice = isDeviceTrusted(userId, userAgent, ip)
      if (trustedDevice) {
        // Update last used time
        trustedDevice.lastUsedAt = new Date().toISOString()
        secureStorage.setItem(MFA_DEVICES_KEY, getTrustedDevices())
        
        return {
          success: true,
          requiresBackupCode: false,
          trustedDevice: true,
          remainingAttempts: maxAttempts,
        }
      }
    }
    
    // Try TOTP verification first
    if (verifyTOTPToken(token, mfaSecret.secret)) {
      return {
        success: true,
        requiresBackupCode: false,
        trustedDevice: false,
        remainingAttempts: maxAttempts,
      }
    }
    
    // If TOTP fails, try backup code
    if (verifyBackupCode(userId, token)) {
      return {
        success: true,
        requiresBackupCode: true,
        trustedDevice: false,
        remainingAttempts: maxAttempts,
      }
    }
    
    return {
      success: false,
      requiresBackupCode: true,
      trustedDevice: false,
      remainingAttempts: maxAttempts - 1,
      error: 'Invalid verification code',
    }
  } catch (error) {
    console.error('Error during MFA verification:', error)
    return {
      success: false,
      requiresBackupCode: false,
      trustedDevice: false,
      remainingAttempts: maxAttempts,
      error: 'MFA verification failed',
    }
  }
}

// Enroll user in MFA
export async function enrollMFA(userId: string, email: string, issuer?: string): Promise<MFAEnrollmentResult> {
  try {
    // Check if user already has MFA enabled
    const existingSecret = getMFASecretForUser(userId)
    if (existingSecret) {
      return {
        success: false,
        error: 'MFA is already enabled for this user',
      }
    }
    
    // Generate new secret
    const mfaSecret = generateMFASecret(userId, email, issuer)
    
    // Generate QR code
    const qrCode = await generateMFAQRCode(mfaSecret.secret, email, issuer)
    
    // Generate backup codes
    const backupCodes = generateBackupCodes(10)
    
    // Store the secret (but don't activate it yet)
    storeMFASecret(mfaSecret)
    
    // Store backup codes
    storeBackupCodes(userId, backupCodes)
    
    return {
      success: true,
      secret: mfaSecret.secret,
      qrCode,
      backupCodes,
    }
  } catch (error) {
    console.error('Error enrolling MFA:', error)
    return {
      success: false,
      error: 'Failed to enroll MFA',
    }
  }
}

// Check if MFA is enabled for user
export function isMFAEnabledForUser(userId: string): boolean {
  const mfaSecret = getMFASecretForUser(userId)
  return mfaSecret !== null
}

// Get MFA status for user
export function getMFAStatus(userId: string) {
  const mfaSecret = getMFASecretForUser(userId)
  const backupCodes = getBackupCodesForUser(userId)
  const trustedDevices = getTrustedDevicesForUser(userId)
  
  return {
    enabled: !!mfaSecret,
    enrolledAt: mfaSecret?.createdAt,
    backupCodesAvailable: backupCodes ? backupCodes.codes.length - backupCodes.usedCodes.length : 0,
    trustedDevicesCount: trustedDevices.length,
  }
}