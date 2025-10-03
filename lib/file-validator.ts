/**
 * File Validation Utilities
 * Validates uploaded files for security and compliance
 */

export interface FileValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  fileInfo?: {
    name: string
    size: number
    type: string
    extension: string
  }
}

export interface FileValidationConfig {
  maxSize?: number // in bytes
  allowedExtensions?: string[]
  allowedMimeTypes?: string[]
  requireExtension?: boolean
}

export class FileValidator {
  private config: FileValidationConfig

  constructor(config: FileValidationConfig = {}) {
    this.config = {
      maxSize: 10 * 1024 * 1024, // 10MB default
      allowedExtensions: ['csv', 'xlsx', 'xls', 'json'],
      allowedMimeTypes: [
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/json'
      ],
      requireExtension: true,
      ...config
    }
  }

  /**
   * Validate a file
   */
  validate(file: File): FileValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Get file info
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    const fileInfo = {
      name: file.name,
      size: file.size,
      type: file.type,
      extension
    }

    // Check if file name is provided
    if (!file.name || file.name.trim() === '') {
      errors.push('File name is required')
    }

    // Check extension
    if (this.config.requireExtension && !extension) {
      errors.push('File must have an extension')
    }

    if (extension && this.config.allowedExtensions) {
      if (!this.config.allowedExtensions.includes(extension)) {
        errors.push(
          `File extension '${extension}' not allowed. Allowed: ${this.config.allowedExtensions.join(', ')}`
        )
      }
    }

    // Check MIME type
    if (this.config.allowedMimeTypes && file.type) {
      if (!this.config.allowedMimeTypes.includes(file.type)) {
        warnings.push(
          `File MIME type '${file.type}' may not be supported. Allowed: ${this.config.allowedMimeTypes.join(', ')}`
        )
      }
    }

    // Check file size
    if (this.config.maxSize && file.size > this.config.maxSize) {
      errors.push(
        `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum: ${(this.config.maxSize / 1024 / 1024).toFixed(2)}MB`
      )
    }

    // Check if file is empty
    if (file.size === 0) {
      errors.push('File is empty')
    }

    // Check file name for suspicious patterns
    const suspiciousPatterns = [
      /\.\./,  // Directory traversal
      /[<>:"|?*]/,  // Invalid characters
      /^\./, // Hidden files
      /\0/ // Null bytes
    ]

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(file.name)) {
        errors.push('File name contains suspicious characters')
        break
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      fileInfo
    }
  }

  /**
   * Sanitize filename for safe storage
   */
  sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '-') // Replace special chars with dash
      .replace(/\.+/g, '.') // Remove consecutive dots
      .replace(/-+/g, '-') // Remove consecutive dashes
      .toLowerCase()
      .substring(0, 255) // Max filename length
  }
}

// Pre-configured validators
export const uploadFileValidator = new FileValidator({
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedExtensions: ['csv', 'xlsx', 'xls', 'json'],
  allowedMimeTypes: [
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/json'
  ]
})

export const backupFileValidator = new FileValidator({
  maxSize: 100 * 1024 * 1024, // 100MB
  allowedExtensions: ['zip', 'json'],
  allowedMimeTypes: [
    'application/zip',
    'application/x-zip-compressed',
    'application/json'
  ]
})

export const imageFileValidator = new FileValidator({
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
})
