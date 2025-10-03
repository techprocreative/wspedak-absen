import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('attendance_policies')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // If no policy exists, return a default one
    if (!data) {
      const defaultPolicy = {
        id: 'default',
        work_start_time: '08:00',
        work_end_time: '17:00',
        late_threshold_minutes: 15,
        early_leave_threshold_minutes: 15,
        overtime_enabled: true,
        weekend_work_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      return NextResponse.json({ data: defaultPolicy });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching attendance policy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if a policy already exists
    const { data: existingPolicy, error: fetchError } = await supabase
      .from('attendance_policies')
      .select('*')
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    let result;
    
    if (existingPolicy) {
      // Update existing policy
      const { data, error } = await supabase
        .from('attendance_policies')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', existingPolicy.id)
        .select()
        .single();
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      result = data;
    } else {
      // Create new policy
      const { data, error } = await supabase
        .from('attendance_policies')
        .insert({
          ...body,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      result = data;
    }
    
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error updating attendance policy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}