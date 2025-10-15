import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

import { logger, logApiError, logApiRequest } from '@/lib/logger'
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('daily_attendance_records')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    logger.error('Error fetching attendance record', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('daily_attendance_records')
      .update(body)
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    logger.error('Error updating attendance record', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('daily_attendance_records')
      .delete()
      .eq('id', params.id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting attendance record', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}