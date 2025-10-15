/**
 * Input validation utilities
 * Provides common validation functions and sanitization
 */

import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const uuidSchema = z.string().uuid('Invalid UUID format');
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number');

// Employee validation schemas
export const createEmployeeSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: phoneSchema.optional(),
  role: z.enum(['admin', 'hr', 'manager', 'employee']),
  department: z.string().optional(),
  position: z.string().optional(),
});

export const updateEmployeeSchema = z.object({
  id: uuidSchema,
  email: emailSchema.optional(),
  name: z.string().min(2).max(100).optional(),
  phone: phoneSchema.optional(),
  role: z.enum(['admin', 'hr', 'manager', 'employee']).optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  is_active: z.boolean().optional(),
});

// Attendance validation schemas
export const createAttendanceSchema = z.object({
  user_id: uuidSchema,
  type: z.enum(['check_in', 'check_out']),
  method: z.enum(['face_recognition', 'manual', 'qr_code']).optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
  notes: z.string().max(500).optional(),
});

// Login validation schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Report generation schema
export const generateReportSchema = z.object({
  start_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  end_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  user_ids: z.array(uuidSchema).optional(),
  department: z.string().optional(),
  format: z.enum(['pdf', 'excel', 'csv', 'json']).default('pdf'),
});

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim()
    .slice(0, 10000); // Limit length
}

/**
 * Sanitize HTML by removing potentially dangerous tags and attributes
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '') // Remove event handlers
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .trim();
}

/**
 * Validate and sanitize email
 */
export function validateEmail(email: string): { valid: boolean; email?: string; error?: string } {
  try {
    const sanitized = sanitizeString(email);
    const validated = emailSchema.parse(sanitized);
    return { valid: true, email: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message };
    }
    return { valid: false, error: 'Invalid email format' };
  }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  try {
    passwordSchema.parse(password);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message };
    }
    return { valid: false, error: 'Invalid password' };
  }
}

/**
 * Generic validation function
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { valid: boolean; data?: T; errors?: string[] } {
  try {
    const validated = schema.parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, errors: error.errors.map(e => e.message) };
    }
    return { valid: false, errors: ['Validation failed'] };
  }
}

/**
 * Validate UUID
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate date range
 */
export function isValidDateRange(startDate: Date, endDate: Date): boolean {
  return startDate <= endDate;
}

/**
 * Sanitize object by removing undefined and null values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined && obj[key] !== null) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page?: number, limit?: number): { page: number; limit: number } {
  const validPage = Math.max(1, page || 1);
  const validLimit = Math.min(Math.max(1, limit || 10), 100); // Max 100 items per page
  return { page: validPage, limit: validLimit };
}
