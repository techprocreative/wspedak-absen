import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";

import { logger, logApiError, logApiRequest } from '@/lib/logger'
export const dynamic = 'force-dynamic'
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const authResult = await verifyJWT(request);
  if (!authResult.valid || !authResult.payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = authResult.payload.userId;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get user's break policy
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("break_policy_id, default_shift_id")
      .eq("id", userId)
      .single();

    if (userError) throw userError;

    // Get today's attendance
    const today = new Date().toISOString().split('T')[0];
    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance_records")
      .select("id, clock_in, clock_out")
      .eq("user_id", userId)
      .eq("date", today)
      .single();

    if (attendanceError || !attendance || !attendance.clock_in) {
      return NextResponse.json({
        allowed: false,
        reason: "You must clock in before taking a break",
        remainingMinutes: 0
      });
    }

    // Get break policy
    const { data: policy, error: policyError } = await supabase
      .from("break_policies")
      .select("*")
      .eq("id", user.break_policy_id)
      .single();

    if (policyError || !policy) {
      return NextResponse.json({
        allowed: false,
        reason: "No break policy assigned",
        remainingMinutes: 0
      });
    }

    // Get current break sessions
    const { data: breakSessions, error: sessionsError } = await supabase
      .from("break_sessions")
      .select("*")
      .eq("attendance_id", attendance.id)
      .eq("user_id", userId);

    if (sessionsError) throw sessionsError;

    const currentSessions = breakSessions || [];

    // Calculate total break taken
    const totalBreakTaken = currentSessions.reduce((sum, session) => {
      return sum + (session.duration_minutes || 0);
    }, 0);

    // Check if worked minimum hours
    const clockInTime = new Date(attendance.clock_in);
    const currentTime = new Date();
    const workedMinutes = (currentTime.getTime() - clockInTime.getTime()) / (1000 * 60);
    const workedHours = workedMinutes / 60;

    if (workedHours < policy.min_work_hours_required) {
      return NextResponse.json({
        allowed: false,
        reason: `Must work at least ${policy.min_work_hours_required} hours before taking break`,
        remainingMinutes: (policy.min_work_hours_required * 60) - workedMinutes,
        requiredHours: policy.min_work_hours_required,
        workedHours: Math.round(workedHours * 100) / 100
      });
    }

    // Check if quota exhausted
    if (totalBreakTaken >= policy.total_duration_minutes) {
      return NextResponse.json({
        allowed: false,
        reason: `Break time quota exhausted (${policy.total_duration_minutes} minutes)`,
        remainingMinutes: 0,
        usedMinutes: totalBreakTaken,
        totalMinutes: policy.total_duration_minutes
      });
    }

    // Check max splits
    if (policy.is_flexible) {
      if (currentSessions.length >= policy.max_splits) {
        return NextResponse.json({
          allowed: false,
          reason: `Maximum ${policy.max_splits} break sessions allowed`,
          remainingMinutes: policy.total_duration_minutes - totalBreakTaken,
          currentSessions: currentSessions.length,
          maxSessions: policy.max_splits
        });
      }
    } else {
      // Not flexible - only 1 session
      if (currentSessions.length > 0) {
        return NextResponse.json({
          allowed: false,
          reason: "Break already taken (non-flexible policy)",
          remainingMinutes: 0,
          policy: "single_break"
        });
      }
    }

    // Check time constraints
    if (policy.earliest_break_time) {
      const earliestTime = new Date();
      const [hours, minutes] = policy.earliest_break_time.split(':');
      earliestTime.setHours(parseInt(hours), parseInt(minutes), 0);

      if (currentTime < earliestTime) {
        return NextResponse.json({
          allowed: false,
          reason: `Break can only be taken after ${policy.earliest_break_time}`,
          remainingMinutes: policy.total_duration_minutes - totalBreakTaken,
          earliestTime: policy.earliest_break_time
        });
      }
    }

    if (policy.latest_break_time) {
      const latestTime = new Date();
      const [hours, minutes] = policy.latest_break_time.split(':');
      latestTime.setHours(parseInt(hours), parseInt(minutes), 0);

      if (currentTime > latestTime) {
        return NextResponse.json({
          allowed: false,
          reason: `Break must be taken before ${policy.latest_break_time}`,
          remainingMinutes: 0,
          latestTime: policy.latest_break_time
        });
      }
    }

    // All checks passed
    const remainingMinutes = policy.total_duration_minutes - totalBreakTaken;
    const suggestedDuration = policy.is_flexible
      ? Math.max(policy.min_break_duration, remainingMinutes)
      : policy.total_duration_minutes;

    return NextResponse.json({
      allowed: true,
      reason: "Break allowed",
      remainingMinutes,
      usedMinutes: totalBreakTaken,
      totalMinutes: policy.total_duration_minutes,
      suggestedDuration: Math.min(suggestedDuration, remainingMinutes),
      policy: {
        name: policy.name,
        isFlexible: policy.is_flexible,
        maxSplits: policy.max_splits,
        minDuration: policy.min_break_duration,
        currentSessions: currentSessions.length
      }
    });
  } catch (error: any) {
    logger.error('Error validating break', error as Error);
    return NextResponse.json(
      { error: error.message || "Failed to validate break" },
      { status: 500 }
    );
  }
}
