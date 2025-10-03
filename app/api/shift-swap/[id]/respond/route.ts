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
  const swapId = params.id;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await request.json();
    const { response, rejection_reason } = body; // response: 'accept' or 'reject'

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

    // Verify user is the target
    if (swap.target_id !== userId) {
      return NextResponse.json(
        { error: "Only the target can respond to this request" },
        { status: 403 }
      );
    }

    // Check if still pending
    if (swap.status !== "pending_target") {
      return NextResponse.json(
        { error: "This swap request is no longer pending" },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date(swap.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This swap request has expired" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (response === "accept") {
      // Accept - move to pending_manager
      const { error: updateError } = await supabase
        .from("shift_swap_requests")
        .update({
          target_approved_at: now,
          target_response: "accepted",
          status: "pending_manager",
          updated_at: now,
        })
        .eq("id", swapId);

      if (updateError) throw updateError;

      // Log history
      await supabase.from("shift_swap_history").insert({
        swap_request_id: swapId,
        action: "accepted",
        actor_id: userId,
        actor_role: "target",
        action_details: "Target accepted the swap request",
        previous_status: "pending_target",
        new_status: "pending_manager",
      });

      // TODO: Notify manager

      return NextResponse.json({
        success: true,
        message: "Swap request accepted. Waiting for manager approval.",
      });
    } else if (response === "reject") {
      // Reject
      const { error: updateError } = await supabase
        .from("shift_swap_requests")
        .update({
          target_approved_at: now,
          target_response: "rejected",
          target_rejection_reason: rejection_reason,
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
        actor_role: "target",
        action_details: `Target rejected: ${rejection_reason}`,
        previous_status: "pending_target",
        new_status: "rejected",
      });

      // TODO: Notify requestor

      return NextResponse.json({
        success: true,
        message: "Swap request rejected.",
      });
    } else {
      return NextResponse.json(
        { error: "Invalid response. Must be 'accept' or 'reject'" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error responding to shift swap:", error);
    return NextResponse.json(
      { error: error.message || "Failed to respond to shift swap" },
      { status: 500 }
    );
  }
}
