import CryptoJS from 'crypto-js'

// Encryption configuration
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-encryption-key-change-in-production'
const ALGORITHM = 'AES'

// Encrypted data interface
interface EncryptedData {
  data: string
  iv: string
  salt: string
}

// Secure storage utility class
export class SecureStorage {
  private static instance: SecureStorage
  private encryptionKey: string

  private constructor() {
    this.encryptionKey = ENCRYPTION_KEY
  }

  public static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage()
    }
    return SecureStorage.instance
  }

  // Generate a random salt
  private generateSalt(): string {
    return CryptoJS.lib.WordArray.random(128/8).toString()
  }

  // Derive key from password and salt
  private deriveKey(password: string, salt: string): string {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000
    }).toString()
  }

  // Encrypt data
  encrypt(data: any, customKey?: string): string {
    try {
      const salt = this.generateSalt()
      const key = this.deriveKey(customKey || this.encryptionKey, salt)
      const iv = CryptoJS.lib.WordArray.random(128/8)
      
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      })
      
      const encryptedData: EncryptedData = {
        data: encrypted.toString(),
        iv: iv.toString(),
        salt: salt
      }
      
      return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify(encryptedData)))
    } catch (error) {
      console.error('Encryption error:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  // Decrypt data
  decrypt<T = any>(encryptedData: string, customKey?: string): T | null {
    try {
      const decodedData = CryptoJS.enc.Base64.parse(encryptedData).toString(CryptoJS.enc.Utf8)
      const { data, iv, salt }: EncryptedData = JSON.parse(decodedData)
      
      const key = this.deriveKey(customKey || this.encryptionKey, salt)
      const ivParsed = CryptoJS.enc.Hex.parse(iv)
      
      const decrypted = CryptoJS.AES.decrypt(data, key, {
        iv: ivParsed,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      })
      
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8)
      return JSON.parse(decryptedString)
    } catch (error) {
      console.error('Decryption error:', error)
      return null
    }
  }

  // Securely store data in localStorage
  setItem(key: string, data: any, customKey?: string): void {
    if (typeof window === 'undefined') return
    
    try {
      const encrypted = this.encrypt(data, customKey)
      localStorage.setItem(key, encrypted)
    } catch (error) {
      console.error('Secure storage set error:', error)
      throw new Error('Failed to store data securely')
    }
  }

  // Securely retrieve data from localStorage
  getItem<T = any>(key: string, customKey?: string): T | null {
    if (typeof window === 'undefined') return null
    
    try {
      const encryptedData = localStorage.getItem(key)
      if (!encryptedData) return null
      
      return this.decrypt<T>(encryptedData, customKey)
    } catch (error) {
      console.error('Secure storage get error:', error)
      return null
    }
  }

  // Remove item from localStorage
  removeItem(key: string): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
  }

  // Clear all secure storage
  clear(): void {
    if (typeof window === 'undefined') return
    localStorage.clear()
  }

  // Check if key exists
  hasKey(key: string): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(key) !== null
  }

  // Get all keys (only returns encrypted key names)
  getAllKeys(): string[] {
    if (typeof window === 'undefined') return []
    return Object.keys(localStorage)
  }

  // Store sensitive session data with auto-expiry
  setSessionData(key: string, data: any, ttlMinutes: number = 30, customKey?: string): void {
    const sessionData = {
      data,
      expiresAt: Date.now() + (ttlMinutes * 60 * 1000)
    }
    this.setItem(key, sessionData, customKey)
  }

  // Get session data with expiry check
  getSessionData<T = any>(key: string, customKey?: string): T | null {
    const sessionData = this.getItem<{ data: T; expiresAt: number }>(key, customKey)
    
    if (!sessionData) return null
    
    if (Date.now() > sessionData.expiresAt) {
      this.removeItem(key)
      return null
    }
    
    return sessionData.data
  }

  // Generate secure random token
  generateSecureToken(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length).toString()
  }

  // Hash data for integrity verification
  hashData(data: any): string {
    return CryptoJS.SHA256(JSON.stringify(data)).toString()
  }

  // Verify data integrity
  verifyDataIntegrity(data: any, expectedHash: string): boolean {
    const actualHash = this.hashData(data)
    return actualHash === expectedHash
  }
}

// Export singleton instance
export const secureStorage = SecureStorage.getInstance()

// Export convenience functions
export const setSecureItem = (key: string, data: any, customKey?: string) => 
  secureStorage.setItem(key, data, customKey)

export const getSecureItem = <T = any>(key: string, customKey?: string) => 
  secureStorage.getItem<T>(key, customKey)

export const removeSecureItem = (key: string) => 
  secureStorage.removeItem(key)

export const clearSecureStorage = () => 
  secureStorage.clear()

export const setSecureSessionData = (key: string, data: any, ttlMinutes?: number, customKey?: string) => 
  secureStorage.setSessionData(key, data, ttlMinutes, customKey)

export const getSecureSessionData = <T = any>(key: string, customKey?: string) => 
  secureStorage.getSessionData<T>(key, customKey)