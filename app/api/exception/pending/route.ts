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
  const userRole = authResult.payload.role;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const type = searchParams.get("type");

    let query = supabase
      .from("attendance_exceptions")
      .select(`
        *,
        user:users!attendance_exceptions_user_id_fkey(id, name, email, department),
        attendance:attendance_records!attendance_exceptions_attendance_id_fkey(
          id,
          date,
          clock_in,
          clock_out,
          is_late,
          late_minutes,
          is_early_leave,
          early_leave_minutes
        ),
        approver:users!attendance_exceptions_approver_id_fkey(id, name, email)
      `)
      .order("created_at", { ascending: false });

    // Filter by role
    if (userRole === 'employee') {
      // Employees see only their own
      query = query.eq("user_id", userId);
    } else if (userRole === 'manager') {
      // Managers see their team's exceptions
      // TODO: Add team filtering logic
    }
    // HR and Admin see all

    // Filter by status
    if (status) {
      query = query.eq("approval_status", status);
    }

    // Filter by type
    if (type) {
      query = query.eq("exception_type", type);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate summary stats
    const summary = {
      pending: 0,
      approved: 0,
      rejected: 0,
      auto_approved: 0,
      total: data?.length || 0
    };

    data?.forEach(exception => {
      summary[exception.approval_status as keyof typeof summary] = 
        (summary[exception.approval_status as keyof typeof summary] || 0) + 1;
    });

    return NextResponse.json({
      exceptions: data,
      summary
    });
  } catch (error: any) {
    console.error("Error fetching exceptions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch exceptions" },
      { status: 500 }
    );
  }
}
