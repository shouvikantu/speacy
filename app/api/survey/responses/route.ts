import { NextRequest, NextResponse } from "next/server";
import { requireRole, isErrorResponse } from "@/lib/rbac";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
    const auth = await requireRole(["professor"]);
    if (isErrorResponse(auth)) return auth;

    const assessmentId = req.nextUrl.searchParams.get("assessment_id");

    if (!assessmentId) {
        return NextResponse.json(
            { error: "assessment_id is required" },
            { status: 400 }
        );
    }

    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await adminSupabase
        .from("survey_responses")
        .select("*")
        .eq("assessment_id", assessmentId)
        .maybeSingle();

    if (error) {
        console.error("Error fetching survey response:", error);
        return NextResponse.json(
            { error: "Failed to fetch survey response" },
            { status: 500 }
        );
    }

    return NextResponse.json({ data });
}
