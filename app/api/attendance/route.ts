import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withValidation } from '@/lib/validation-middleware';
import { attendanceRecordSchema, attendanceQuerySchema } from '@/lib/validation-schemas';
import { createAuthRateLimit, addSecurityHeaders, BruteForceProtection, logSecurityEvent } from '@/lib/security-middleware';
import { verifyToken } from '@/lib/auth-middleware';

export const GET = withValidation(
  attendanceQuerySchema,
  async (request: NextRequest, context, validatedData) => {
    try {
      // Apply rate limiting
      const rateLimitResponse = await createAuthRateLimit()(request);
      if (rateLimitResponse) return rateLimitResponse;

      // Verify authentication
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const response = NextResponse.json(
          { success: false, error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
        return addSecurityHeaders(response);
      }

      const token = authHeader.substring(7);
      const tokenVerification = await verifyToken(token);
      
      if (!tokenVerification.valid) {
        const response = NextResponse.json(
          { success: false, error: 'Unauthorized', message: 'Invalid token' },
          { status: 401 }
        );
        return addSecurityHeaders(response);
      }

      // Build query with validated parameters
      let query = supabase
        .from('daily_attendance_records')
        .select('*');
      
      if (validatedData.userId) {
        query = query.eq('user_id', validatedData.userId);
      }
      
      if (validatedData.startDate) {
        query = query.gte('date', validatedData.startDate);
      }
      
      if (validatedData.endDate) {
        query = query.lte('date', validatedData.endDate);
      }

      if (validatedData.status) {
        query = query.eq('status', validatedData.status);
      }

      // Apply pagination
      const page = validatedData.page || 1;
      const limit = validatedData.limit || 20;
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      // Apply sorting
      const sortBy = validatedData.sortBy || 'date';
      const sortOrder = validatedData.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      
      const { data, error, count } = await query;
      
      if (error) {
        logSecurityEvent('attendance_fetch_error', { error: error.message, userId: tokenVerification.payload.id }, 'medium');
        const response = NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
        return addSecurityHeaders(response);
      }
      
      const response = NextResponse.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      });
      
      return addSecurityHeaders(response);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      logSecurityEvent('attendance_fetch_error', { error: error instanceof Error ? error.message : 'Unknown error' }, 'high');
      
      const response = NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
      return addSecurityHeaders(response);
    }
  },
  'query'
);

export const POST = withValidation(
  attendanceRecordSchema,
  async (request: NextRequest, context, validatedData) => {
    try {
      // Apply rate limiting
      const rateLimitResponse = await createAuthRateLimit()(request);
      if (rateLimitResponse) return rateLimitResponse;

      // Verify authentication
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const response = NextResponse.json(
          { success: false, error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
        return addSecurityHeaders(response);
      }

      const token = authHeader.substring(7);
      const tokenVerification = await verifyToken(token);
      
      if (!tokenVerification.valid) {
        const response = NextResponse.json(
          { success: false, error: 'Unauthorized', message: 'Invalid token' },
          { status: 401 }
        );
        return addSecurityHeaders(response);
      }

      // Ensure user can only create records for themselves (unless admin)
      const userRole = tokenVerification.payload.user_metadata?.role;
      if (userRole !== 'admin' && userRole !== 'hr' && validatedData.userId !== tokenVerification.payload.id) {
        const response = NextResponse.json(
          { success: false, error: 'Forbidden', message: 'You can only create attendance records for yourself' },
          { status: 403 }
        );
        return addSecurityHeaders(response);
      }

      // Insert attendance record
      const { data, error } = await supabase
        .from('daily_attendance_records')
        .insert(validatedData)
        .select()
        .single();
      
      if (error) {
        logSecurityEvent('attendance_create_error', {
          error: error.message,
          userId: tokenVerification.payload.id,
          recordData: validatedData
        }, 'medium');
        
        const response = NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
        return addSecurityHeaders(response);
      }

      logSecurityEvent('attendance_created', {
        recordId: data.id,
        userId: tokenVerification.payload.id
      }, 'low');
      
      const response = NextResponse.json({
        success: true,
        data
      }, { status: 201 });
      
      return addSecurityHeaders(response);
    } catch (error) {
      console.error('Error creating attendance record:', error);
      logSecurityEvent('attendance_create_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'high');
      
      const response = NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
      return addSecurityHeaders(response);
    }
  }
);