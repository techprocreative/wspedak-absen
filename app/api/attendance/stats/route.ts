import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

import { logger, logApiError, logApiRequest } from '@/lib/logger'
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const department = searchParams.get('department');
    
    if (!userId && !department) {
      return NextResponse.json({ error: 'Either userId or department is required' }, { status: 400 });
    }
    
    // Build the base query
    let query = supabase
      .from('daily_attendance_records')
      .select('*');
    
    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    if (startDate) {
      query = query.gte('date', startDate);
    }
    
    if (endDate) {
      query = query.lte('date', endDate);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Calculate statistics
    const stats = {
      total_days: data?.length || 0,
      present_days: 0,
      absent_days: 0,
      late_days: 0,
      early_leave_days: 0,
      total_work_hours: 0,
      overtime_hours: 0,
      average_work_hours: 0,
    };
    
    if (data && data.length > 0) {
      for (const record of data) {
        if (record.status === 'present') {
          stats.present_days++;
        } else if (record.status === 'absent') {
          stats.absent_days++;
        } else if (record.status === 'late') {
          stats.late_days++;
        } else if (record.status === 'early_leave') {
          stats.early_leave_days++;
        }
        
        // Calculate work hours if both clock in and clock out are present
        if (record.clock_in && record.clock_out) {
          const clockInTime = new Date(record.clock_in);
          const clockOutTime = new Date(record.clock_out);
          const workHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
          stats.total_work_hours += workHours;
          
          // Calculate overtime (after 17:00)
          const clockOutHour = clockOutTime.getHours();
          const clockOutMinute = clockOutTime.getMinutes();
          if (clockOutHour > 17 || (clockOutHour === 17 && clockOutMinute > 0)) {
            const overtimeStart = new Date(clockOutTime);
            overtimeStart.setHours(17, 0, 0, 0);
            const overtimeHours = (clockOutTime.getTime() - overtimeStart.getTime()) / (1000 * 60 * 60);
            stats.overtime_hours += overtimeHours;
          }
        }
      }
      
      // Calculate average work hours
      if (stats.present_days > 0) {
        stats.average_work_hours = stats.total_work_hours / stats.present_days;
      }
    }
    
    return NextResponse.json({ data: stats });
  } catch (error) {
    logger.error('Error calculating attendance statistics', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}