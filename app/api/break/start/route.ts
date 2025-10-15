import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";

import { logger, logApiError, logApiRequest } from '@/lib/logger'
export const dynamic = 'force-dynamic'
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const authResult = await verifyJWT(request);
  if (!authResult.valid || !authResult.payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = authResult.payload.userId;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await request.json();
    const { break_type = 'meal', location } = body;

    // Get today's attendance
    const today = new Date().toISOString().split('T')[0];
    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance_records")
      .select("id, clock_in, user_id")
      .eq("user_id", userId)
      .eq("date", today)
      .single();

    if (attendanceError || !attendance || !attendance.clock_in) {
      return NextResponse.json({
        error: "You must clock in before taking a break"
      }, { status: 400 });
    }

    // Check if already on break
    const { data: activeBreak, error: activeError } = await supabase
      .from("break_sessions")
      .select("id")
      .eq("attendance_id", attendance.id)
      .eq("status", "in_progress")
      .single();

    if (activeBreak) {
      return NextResponse.json({
        error: "You are already on a break. End current break first."
      }, { status: 400 });
    }

    // Get user's break policy
    const { data: user } = await supabase
      .from("users")
      .select("break_policy_id")
      .eq("id", userId)
      .single();

    // Validate break is allowed (call validation logic)
    const validationResponse = await fetch(
      `${request.url.replace('/start', '/validate')}`,
      {
        headers: {
          'Authorization': request.headers.get('Authorization') || ''
        }
      }
    );
    const validation = await validationResponse.json();

    if (!validation.allowed) {
      return NextResponse.json({
        error: validation.reason,
        details: validation
      }, { status: 400 });
    }

    // Create break session
    const now = new Date().toISOString();
    const { data: breakSession, error: insertError } = await supabase
      .from("break_sessions")
      .insert({
        attendance_id: attendance.id,
        user_id: userId,
        break_type,
        break_start: now,
        break_policy_id: user?.break_policy_id,
        is_paid: true, // Will be calculated on end
        location,
        status: "in_progress"
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      breakSession,
      message: "Break started successfully",
      remainingMinutes: validation.remainingMinutes
    });
  } catch (error: any) {
    logger.error('Error starting break', error as Error);
    return NextResponse.json(
      { error: error.message || "Failed to start break" },
      { status: 500 }
    );
  }
}
