/**
 * File Validator (Stub)
 * Stub implementation for backward compatibility
 */

export interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  errors?: string[];
}

export const validateFile = (
  file: File,
  options?: FileValidationOptions
): FileValidationResult => {
  const maxSize = options?.maxSize || 5 * 1024 * 1024; // 5MB default
  const allowedTypes = options?.allowedTypes || ['text/csv', 'application/json'];

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${maxSize / 1024 / 1024}MB limit`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  return { valid: true };
};

export const uploadFileValidator = {
  validate: validateFile,
  validateFile,
};

export default uploadFileValidator;
