import { NextRequest, NextResponse } from "next/server";
import { requireRole, isErrorResponse } from "@/lib/rbac";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
    const auth = await requireRole(["superuser"]);
    if (isErrorResponse(auth)) return auth;

    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "200");

    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: rawSurveys, error } = await adminSupabase
        .from("survey_responses")
        .select("id, user_id, assessment_id, consent, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Error fetching surveys:", error);
        return NextResponse.json(
            { error: "Failed to fetch survey responses" },
            { status: 500 }
        );
    }

    // Batch-fetch emails for all user_ids
    const userIds = [...new Set((rawSurveys || []).map(s => s.user_id))];
    const { data: profiles } = userIds.length > 0
        ? await adminSupabase
            .from("profiles")
            .select("id, email")
            .in("id", userIds)
        : { data: [] };

    const emailMap = new Map((profiles || []).map(p => [p.id, p.email]));

    const surveys = (rawSurveys || []).map(s => ({
        ...s,
        student_email: emailMap.get(s.user_id) || "Unknown",
    }));

    return NextResponse.json({ surveys });
}
