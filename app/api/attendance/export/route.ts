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
    const format = searchParams.get('format') || 'json'; // json, csv, excel
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    // Build the query
    let query = supabase
      .from('daily_attendance_records')
      .select('*');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    if (startDate) {
      query = query.gte('date', startDate);
    }
    
    if (endDate) {
      query = query.lte('date', endDate);
    }
    
    const { data, error } = await query.order('date', { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No attendance records found' }, { status: 404 });
    }
    
    // Format the response based on the requested format
    switch (format) {
      case 'csv':
        return generateCSVResponse(data);
      case 'excel':
        // In a real implementation, you would use a library like exceljs
        // For now, we'll return a JSON response with a note
        return NextResponse.json({ 
          data,
          message: 'Excel export would be implemented here using a library like exceljs'
        });
      case 'json':
      default:
        return NextResponse.json({ data });
    }
  } catch (error) {
    logger.error('Error exporting attendance data', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateCSVResponse(data: any[]) {
  // Define CSV headers
  const headers = [
    'Date',
    'Clock In',
    'Clock Out',
    'Status',
    'Location',
    'Absence Reason',
  ];
  
  // Convert data to CSV format
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(record => [
      record.date || '',
      record.clock_in ? new Date(record.clock_in).toLocaleString() : '',
      record.clock_out ? new Date(record.clock_out).toLocaleString() : '',
      record.status || '',
      record.clock_in_location ? 
        `${record.clock_in_location.latitude}, ${record.clock_in_location.longitude}` : '',
      record.absence_reason || '',
    ].join(',')) // Data rows
  ];
  
  const csvContent = csvRows.join('\n');
  
  // Create response with CSV content
  const response = new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="attendance_records.csv"',
    },
  });
  
  return response;
}