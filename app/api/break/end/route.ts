import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";

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
    // Get active break session
    const today = new Date().toISOString().split('T')[0];
    const { data: attendance } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("user_id", userId)
      .eq("date", today)
      .single();

    if (!attendance) {
      return NextResponse.json({
        error: "No attendance record found"
      }, { status: 404 });
    }

    const { data: breakSession, error: breakError } = await supabase
      .from("break_sessions")
      .select("*, break_policy:break_policies(*)")
      .eq("attendance_id", attendance.id)
      .eq("status", "in_progress")
      .single();

    if (breakError || !breakSession) {
      return NextResponse.json({
        error: "No active break session found"
      }, { status: 404 });
    }

    // Calculate duration
    const breakStart = new Date(breakSession.break_start);
    const breakEnd = new Date();
    const durationMinutes = Math.round(
      (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60)
    );

    // Get break policy
    const policy = breakSession.break_policy;
    
    // Check if exceeded policy
    let exceeded = false;
    let exceededMinutes = 0;
    let isPaid = true;

    if (policy) {
      // Get all break sessions today
      const { data: allSessions } = await supabase
        .from("break_sessions")
        .select("duration_minutes")
        .eq("attendance_id", attendance.id)
        .neq("id", breakSession.id);

      const totalOtherBreaks = (allSessions || []).reduce(
        (sum, s) => sum + (s.duration_minutes || 0), 
        0
      );
      const totalBreakToday = totalOtherBreaks + durationMinutes;

      if (totalBreakToday > policy.total_duration_minutes) {
        exceeded = true;
        exceededMinutes = totalBreakToday - policy.total_duration_minutes;
      }

      // Calculate paid/unpaid
      if (policy.paid_duration_minutes) {
        // Has paid/unpaid split
        const paidMinutes = Math.min(durationMinutes, policy.paid_duration_minutes);
        isPaid = durationMinutes <= paidMinutes;
      } else {
        // All paid if within policy
        isPaid = !exceeded;
      }
    }

    // Update break session
    const { data: updatedSession, error: updateError } = await supabase
      .from("break_sessions")
      .update({
        break_end: breakEnd.toISOString(),
        duration_minutes: durationMinutes,
        status: "completed",
        exceeded_policy: exceeded,
        exceeded_minutes: exceededMinutes,
        is_paid: isPaid,
        updated_at: new Date().toISOString()
      })
      .eq("id", breakSession.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update attendance record total break time
    const { data: allBreaksToday } = await supabase
      .from("break_sessions")
      .select("duration_minutes")
      .eq("attendance_id", attendance.id);

    const totalBreakMinutes = (allBreaksToday || []).reduce(
      (sum, s) => sum + (s.duration_minutes || 0),
      0
    );

    await supabase
      .from("attendance_records")
      .update({
        total_break_minutes: totalBreakMinutes,
        updated_at: new Date().toISOString()
      })
      .eq("id", attendance.id);

    return NextResponse.json({
      success: true,
      breakSession: updatedSession,
      message: "Break ended successfully",
      summary: {
        duration: durationMinutes,
        isPaid,
        exceeded,
        exceededMinutes,
        totalBreakToday: totalBreakMinutes
      }
    });
  } catch (error: any) {
    console.error("Error ending break:", error);
    return NextResponse.json(
      { error: error.message || "Failed to end break" },
      { status: 500 }
    );
  }
}
