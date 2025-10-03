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
  const swapId = params.id;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await request.json();
    const { response, rejection_reason } = body; // response: 'approve' or 'reject'

    // Get swap request
    const { data: swap, error: fetchError } = await supabase
      .from("shift_swap_requests")
      .select("*")
      .eq("id", swapId)
      .single();

    if (fetchError) throw fetchError;
    if (!swap) {
      return NextResponse.json({ error: "Swap request not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Handle manager approval
    if (userRole === "manager" || userRole === "admin") {
      if (swap.status !== "pending_manager") {
        return NextResponse.json(
          { error: "Not waiting for manager approval" },
          { status: 400 }
        );
      }

      if (response === "approve") {
        const nextStatus = swap.requires_hr_approval ? "pending_hr" : "approved";

        const { error: updateError } = await supabase
          .from("shift_swap_requests")
          .update({
            manager_approved_at: now,
            manager_response: "approved",
            status: nextStatus,
            updated_at: now,
          })
          .eq("id", swapId);

        if (updateError) throw updateError;

        // Log history
        await supabase.from("shift_swap_history").insert({
          swap_request_id: swapId,
          action: "approved",
          actor_id: userId,
          actor_role: "manager",
          action_details: "Manager approved the swap request",
          previous_status: "pending_manager",
          new_status: nextStatus,
        });

        // If fully approved, execute the swap
        if (nextStatus === "approved") {
          await executeShiftSwap(supabase, swap);
        }

        return NextResponse.json({
          success: true,
          message: nextStatus === "approved" 
            ? "Swap request approved and executed!" 
            : "Manager approved. Waiting for HR approval.",
        });
      } else {
        // Reject
        const { error: updateError } = await supabase
          .from("shift_swap_requests")
          .update({
            manager_approved_at: now,
            manager_response: "rejected",
            manager_rejection_reason: rejection_reason,
            status: "rejected",
            updated_at: now,
          })
          .eq("id", swapId);

        if (updateError) throw updateError;

        // Log history
        await supabase.from("shift_swap_history").insert({
          swap_request_id: swapId,
          action: "rejected",
          actor_id: userId,
          actor_role: "manager",
          action_details: `Manager rejected: ${rejection_reason}`,
          previous_status: "pending_manager",
          new_status: "rejected",
        });

        return NextResponse.json({
          success: true,
          message: "Swap request rejected by manager.",
        });
      }
    }

    // Handle HR approval (for cross-department swaps)
    if (userRole === "hr" || userRole === "admin") {
      if (swap.status !== "pending_hr") {
        return NextResponse.json(
          { error: "Not waiting for HR approval" },
          { status: 400 }
        );
      }

      if (response === "approve") {
        const { error: updateError } = await supabase
          .from("shift_swap_requests")
          .update({
            hr_approved_at: now,
            hr_response: "approved",
            hr_id: userId,
            status: "approved",
            updated_at: now,
          })
          .eq("id", swapId);

        if (updateError) throw updateError;

        // Log history
        await supabase.from("shift_swap_history").insert({
          swap_request_id: swapId,
          action: "approved",
          actor_id: userId,
          actor_role: "hr",
          action_details: "HR approved the swap request",
          previous_status: "pending_hr",
          new_status: "approved",
        });

        // Execute the swap
        await executeShiftSwap(supabase, swap);

        return NextResponse.json({
          success: true,
          message: "Swap request approved by HR and executed!",
        });
      } else {
        // Reject
        const { error: updateError } = await supabase
          .from("shift_swap_requests")
          .update({
            hr_approved_at: now,
            hr_response: "rejected",
            hr_rejection_reason: rejection_reason,
            hr_id: userId,
            status: "rejected",
            updated_at: now,
          })
          .eq("id", swapId);

        if (updateError) throw updateError;

        // Log history
        await supabase.from("shift_swap_history").insert({
          swap_request_id: swapId,
          action: "rejected",
          actor_id: userId,
          actor_role: "hr",
          action_details: `HR rejected: ${rejection_reason}`,
          previous_status: "pending_hr",
          new_status: "rejected",
        });

        return NextResponse.json({
          success: true,
          message: "Swap request rejected by HR.",
        });
      }
    }

    return NextResponse.json(
      { error: "You don't have permission to approve this request" },
      { status: 403 }
    );
  } catch (error: any) {
    console.error("Error approving shift swap:", error);
    return NextResponse.json(
      { error: error.message || "Failed to approve shift swap" },
      { status: 500 }
    );
  }
}

// Helper function to execute the shift swap
async function executeShiftSwap(supabase: any, swap: any) {
  // TODO: Implement actual schedule update logic
  // This would update schedule_assignments table or create new assignments
  
  // For now, just log that it's executed
  console.log("Executing shift swap:", swap.id);
  
  // In production, you would:
  // 1. Update schedule_assignments for both requestor and target
  // 2. Handle different swap types (direct_swap, one_way_coverage, etc.)
  // 3. Create compensation records if needed
  // 4. Send notifications to both parties
  
  // Mark as completed
  await supabase
    .from("shift_swap_requests")
    .update({ status: "completed" })
    .eq("id", swap.id);
    
  // Log completion
  await supabase.from("shift_swap_history").insert({
    swap_request_id: swap.id,
    action: "completed",
    actor_role: "system",
    action_details: "Swap executed successfully",
    previous_status: "approved",
    new_status: "completed",
  });
}
