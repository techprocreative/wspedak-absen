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
    const {
      attendance_id,
      exception_type,
      reason,
      supporting_document,
      request_adjustment = true
    } = body;

    // Validation
    if (!attendance_id || !exception_type || !reason) {
      return NextResponse.json({
        error: "Missing required fields: attendance_id, exception_type, reason"
      }, { status: 400 });
    }

    // Get attendance record
    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance_records")
      .select("*, shift:shifts(*)")
      .eq("id", attendance_id)
      .single();

    if (attendanceError || !attendance) {
      return NextResponse.json({
        error: "Attendance record not found"
      }, { status: 404 });
    }

    // Verify attendance belongs to user
    if (attendance.user_id !== userId) {
      return NextResponse.json({
        error: "Unauthorized to request exception for this attendance"
      }, { status: 403 });
    }

    // Calculate time adjustment based on exception type
    let timeAdjustmentMinutes = 0;
    let affectSalary = true;
    let salaryDeduction = 0;
    let affectPerformance = true;
    let performancePenalty = 1;

    if (exception_type.startsWith('late_')) {
      timeAdjustmentMinutes = attendance.late_minutes || 0;
      
      // If requesting adjustment, no salary impact
      if (request_adjustment) {
        affectSalary = false;
        salaryDeduction = 0;
        affectPerformance = false;
        performancePenalty = 0;
      } else {
        // Calculate salary deduction (example: Rp 125,000/hour)
        const hourlyRate = 125000;
        salaryDeduction = (timeAdjustmentMinutes / 60) * hourlyRate;
      }
    } else if (exception_type.startsWith('early_')) {
      timeAdjustmentMinutes = attendance.early_leave_minutes || 0;
      
      if (request_adjustment) {
        affectSalary = false;
        salaryDeduction = 0;
        affectPerformance = false;
        performancePenalty = 0;
      } else {
        const hourlyRate = 125000;
        salaryDeduction = (timeAdjustmentMinutes / 60) * hourlyRate;
      }
    }

    // Check for auto-approve conditions
    let approvalStatus = 'pending';
    
    // Auto-approve medical with document
    if (exception_type === 'early_medical' && supporting_document) {
      approvalStatus = 'auto_approved';
    }

    // Auto-approve if mass late event (>30% employees late today)
    if (exception_type === 'late_weather') {
      const today = attendance.date;
      const { data: allAttendance, error: allError } = await supabase
        .from("attendance_records")
        .select("is_late")
        .eq("date", today);

      if (allAttendance) {
        const lateCount = allAttendance.filter(a => a.is_late).length;
        const latePercentage = lateCount / allAttendance.length;
        
        if (latePercentage > 0.3) {
          approvalStatus = 'auto_approved';
        }
      }
    }

    // Create exception request
    const { data: exception, error: insertError } = await supabase
      .from("attendance_exceptions")
      .insert({
        attendance_id,
        user_id: userId,
        exception_type,
        requested_by: userId,
        reason,
        supporting_document,
        approval_status: approvalStatus,
        time_adjustment_minutes: timeAdjustmentMinutes,
        work_hours_adjusted: request_adjustment ? 
          (attendance.actual_work_hours || 0) + (timeAdjustmentMinutes / 60) : 
          null,
        affect_salary: affectSalary,
        salary_deduction_amount: salaryDeduction,
        affect_performance: affectPerformance,
        performance_penalty_points: performancePenalty,
        metadata: {
          request_adjustment,
          requested_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // If auto-approved, apply immediately
    if (approvalStatus === 'auto_approved') {
      await applyException(supabase, exception);
    }

    return NextResponse.json({
      success: true,
      exception,
      message: approvalStatus === 'auto_approved' 
        ? "Exception auto-approved and applied"
        : "Exception request submitted for approval",
      impact: {
        timeAdjustment: timeAdjustmentMinutes,
        affectSalary,
        salaryDeduction,
        affectPerformance,
        performancePenalty
      }
    });
  } catch (error: any) {
    logger.error('Error requesting exception', error as Error);
    return NextResponse.json(
      { error: error.message || "Failed to request exception" },
      { status: 500 }
    );
  }
}

// Helper function to apply approved exception
async function applyException(supabase: any, exception: any) {
  if (!exception.work_hours_adjusted) return;

  // Create work hour adjustment log
  const { data: attendance } = await supabase
    .from("attendance_records")
    .select("actual_work_hours")
    .eq("id", exception.attendance_id)
    .single();

  if (attendance) {
    await supabase
      .from("work_hour_adjustments")
      .insert({
        attendance_id: exception.attendance_id,
        user_id: exception.user_id,
        adjustment_type: exception.exception_type,
        original_hours: attendance.actual_work_hours,
        adjusted_hours: exception.work_hours_adjusted,
        difference_hours: exception.time_adjustment_minutes / 60,
        reason: exception.reason,
        approved_by: exception.approver_id,
        exception_id: exception.id
      });

    // Update attendance record
    await supabase
      .from("attendance_records")
      .update({
        adjusted_work_hours: exception.work_hours_adjusted,
        work_hour_adjustment_reason: exception.reason,
        updated_at: new Date().toISOString()
      })
      .eq("id", exception.attendance_id);
  }
}
