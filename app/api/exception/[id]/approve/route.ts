import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";

export const dynamic = 'force-dynamic'
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyJWT(request);
  if (!authResult.valid || !authResult.payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = authResult.payload.userId;
  const userRole = authResult.payload.role;
  const exceptionId = params.id;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await request.json();
    const { 
      action = 'approve',
      notes,
      adjustments 
    } = body;

    // Check if user has permission (HR or Admin)
    if (userRole !== 'hr' && userRole !== 'admin') {
      return NextResponse.json({
        error: "Only HR or Admin can approve exceptions"
      }, { status: 403 });
    }

    // Get exception
    const { data: exception, error: fetchError } = await supabase
      .from("attendance_exceptions")
      .select("*")
      .eq("id", exceptionId)
      .single();

    if (fetchError || !exception) {
      return NextResponse.json({
        error: "Exception not found"
      }, { status: 404 });
    }

    if (exception.approval_status !== 'pending') {
      return NextResponse.json({
        error: "Exception already processed"
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      // Apply any custom adjustments
      const updateData: any = {
        approval_status: 'approved',
        approver_id: userId,
        approved_at: now,
        hr_notes: notes,
        hr_reviewed_at: now,
        hr_reviewer_id: userId,
        updated_at: now
      };

      if (adjustments) {
        if (adjustments.timeAdjustmentMinutes !== undefined) {
          updateData.time_adjustment_minutes = adjustments.timeAdjustmentMinutes;
        }
        if (adjustments.affectSalary !== undefined) {
          updateData.affect_salary = adjustments.affectSalary;
        }
        if (adjustments.salaryDeduction !== undefined) {
          updateData.salary_deduction_amount = adjustments.salaryDeduction;
        }
        if (adjustments.affectPerformance !== undefined) {
          updateData.affect_performance = adjustments.affectPerformance;
        }
        if (adjustments.performancePenalty !== undefined) {
          updateData.performance_penalty_points = adjustments.performancePenalty;
        }
      }

      // Update exception
      const { data: updated, error: updateError } = await supabase
        .from("attendance_exceptions")
        .update(updateData)
        .eq("id", exceptionId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Apply exception to attendance
      await applyException(supabase, updated);

      return NextResponse.json({
        success: true,
        exception: updated,
        message: "Exception approved and applied successfully"
      });
    } else if (action === 'reject') {
      // Reject exception
      const { data: updated, error: updateError } = await supabase
        .from("attendance_exceptions")
        .update({
          approval_status: 'rejected',
          approver_id: userId,
          approved_at: now,
          rejection_reason: notes || 'Rejected by HR',
          hr_notes: notes,
          hr_reviewed_at: now,
          hr_reviewer_id: userId,
          updated_at: now
        })
        .eq("id", exceptionId)
        .select()
        .single();

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        exception: updated,
        message: "Exception rejected"
      });
    } else {
      return NextResponse.json({
        error: "Invalid action. Must be 'approve' or 'reject'"
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error processing exception:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process exception" },
      { status: 500 }
    );
  }
}

// Helper function to apply approved exception
async function applyException(supabase: any, exception: any) {
  // Get attendance record
  const { data: attendance } = await supabase
    .from("attendance_records")
    .select("actual_work_hours")
    .eq("id", exception.attendance_id)
    .single();

  if (!attendance) return;

  // Calculate adjusted hours
  const adjustedHours = (attendance.actual_work_hours || 0) + 
    (exception.time_adjustment_minutes / 60);

  // Create work hour adjustment log
  await supabase
    .from("work_hour_adjustments")
    .insert({
      attendance_id: exception.attendance_id,
      user_id: exception.user_id,
      adjustment_type: exception.exception_type,
      original_hours: attendance.actual_work_hours,
      adjusted_hours: adjustedHours,
      difference_hours: exception.time_adjustment_minutes / 60,
      reason: exception.reason,
      approved_by: exception.approver_id,
      exception_id: exception.id
    });

  // Update attendance record
  const updateData: any = {
    adjusted_work_hours: adjustedHours,
    work_hour_adjustment_reason: exception.reason,
    updated_at: new Date().toISOString()
  };

  if (exception.exception_type.startsWith('late_')) {
    updateData.late_approved_by = exception.approver_id;
    updateData.late_approved_at = exception.approved_at;
  }

  await supabase
    .from("attendance_records")
    .update(updateData)
    .eq("id", exception.attendance_id);
}
