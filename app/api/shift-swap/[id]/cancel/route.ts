import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";

import { logger, logApiError, logApiRequest } from '@/lib/logger'
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
  const swapId = params.id;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await request.json();
    const { reason } = body;

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

    // Verify user is the requestor
    if (swap.requestor_id !== userId) {
      return NextResponse.json(
        { error: "Only the requestor can cancel this request" },
        { status: 403 }
      );
    }

    // Check if already approved/completed
    if (swap.status === "completed") {
      return NextResponse.json(
        { error: "Cannot cancel a completed swap" },
        { status: 400 }
      );
    }

    // Check if swap date is within 24 hours
    const swapDate = new Date(swap.requestor_date);
    const now = new Date();
    const hoursDiff = (swapDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 24) {
      return NextResponse.json(
        { error: "Cannot cancel within 24 hours of the swap date" },
        { status: 400 }
      );
    }

    const cancelledAt = new Date().toISOString();

    // Cancel the swap
    const { error: updateError } = await supabase
      .from("shift_swap_requests")
      .update({
        status: "cancelled",
        cancelled_at: cancelledAt,
        cancellation_reason: reason,
        updated_at: cancelledAt,
      })
      .eq("id", swapId);

    if (updateError) throw updateError;

    // Log history
    await supabase.from("shift_swap_history").insert({
      swap_request_id: swapId,
      action: "cancelled",
      actor_id: userId,
      actor_role: "requestor",
      action_details: `Request cancelled: ${reason}`,
      previous_status: swap.status,
      new_status: "cancelled",
    });

    // TODO: Notify affected parties

    return NextResponse.json({
      success: true,
      message: "Swap request cancelled successfully",
    });
  } catch (error: any) {
    logger.error('Error cancelling shift swap', error as Error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel shift swap" },
      { status: 500 }
    );
  }
}
