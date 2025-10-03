import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";

export const dynamic = 'force-dynamic'
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const authResult = await verifyJWT(request);
  if (!authResult.valid || !authResult.payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = authResult.payload.userId;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all"; // all, incoming, outgoing, pending

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    let query = supabase
      .from("shift_swap_requests")
      .select(`
        *,
        requestor:users!shift_swap_requests_requestor_id_fkey(id, name, email, department),
        target:users!shift_swap_requests_target_id_fkey(id, name, email, department),
        requestor_shift:shifts!shift_swap_requests_requestor_shift_id_fkey(id, name, code, start_time, end_time),
        target_shift:shifts!shift_swap_requests_target_shift_id_fkey(id, name, code, start_time, end_time),
        manager:users!shift_swap_requests_manager_id_fkey(id, name, email),
        hr:users!shift_swap_requests_hr_id_fkey(id, name, email)
      `)
      .order("created_at", { ascending: false });

    if (type === "incoming") {
      query = query.eq("target_id", userId);
    } else if (type === "outgoing") {
      query = query.eq("requestor_id", userId);
    } else if (type === "pending") {
      query = query.or(`requestor_id.eq.${userId},target_id.eq.${userId}`)
        .in("status", ["pending_target", "pending_manager", "pending_hr"]);
    } else {
      // all - both sent and received
      query = query.or(`requestor_id.eq.${userId},target_id.eq.${userId}`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ swaps: data });
  } catch (error: any) {
    console.error("Error fetching shift swaps:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch shift swaps" },
      { status: 500 }
    );
  }
}

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
      requestor_date,
      requestor_shift_id,
      target_id,
      target_date,
      target_shift_id,
      swap_type,
      reason,
      is_emergency,
      compensation_type,
      compensation_amount,
    } = body;

    // Validation
    if (!requestor_date || !swap_type || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate swap code
    const swapCode = `SR-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Set expiration (24h for normal, 2h for emergency)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (is_emergency ? 2 : 24));

    // Get user's manager
    const { data: userData } = await supabase
      .from("users")
      .select("manager_id, department")
      .eq("id", userId)
      .single();

    const managerId = userData?.manager_id;

    // Check if cross-department
    const { data: targetUser } = await supabase
      .from("users")
      .select("department")
      .eq("id", target_id)
      .single();

    const isCrossDept = userData?.department !== targetUser?.department;

    // Insert swap request
    const { data: swapRequest, error: insertError } = await supabase
      .from("shift_swap_requests")
      .insert({
        swap_code: swapCode,
        requestor_id: userId,
        requestor_date,
        requestor_shift_id,
        target_id,
        target_date: target_date || requestor_date,
        target_shift_id,
        swap_type,
        reason,
        is_emergency,
        expires_at: expiresAt.toISOString(),
        manager_id: managerId,
        requires_hr_approval: isCrossDept,
        is_cross_department: isCrossDept,
        compensation_type,
        compensation_amount,
        status: "pending_target",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Log history
    await supabase.from("shift_swap_history").insert({
      swap_request_id: swapRequest.id,
      action: "requested",
      actor_id: userId,
      actor_role: "requestor",
      action_details: `Swap request created: ${swap_type}`,
      new_status: "pending_target",
    });

    // TODO: Send notification to target

    return NextResponse.json({
      success: true,
      swap: swapRequest,
      message: "Shift swap request created successfully",
    });
  } catch (error: any) {
    console.error("Error creating shift swap:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create shift swap" },
      { status: 500 }
    );
  }
}
