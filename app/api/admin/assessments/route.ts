import { NextResponse } from "next/server";
import { requireRole, isErrorResponse } from "@/lib/rbac";

export async function GET(req: Request) {
    const auth = await requireRole(["superuser"]);
    if (isErrorResponse(auth)) return auth;

    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const studentEmail = url.searchParams.get("student") || null;
    const offset = (page - 1) * limit;

    try {
        let query = adminSupabase
            .from("assessments")
            .select("id, topic, total_score, status, student_name, created_at, assignment_id, assignments(title, course_id, courses(name))", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (studentEmail) {
            query = query.eq("student_name", studentEmail);
        }

        const { data: assessments, error, count } = await query;

        if (error) {
            console.error("Error fetching assessments:", error);
            return NextResponse.json({ error: "Failed to fetch assessments" }, { status: 500 });
        }

        return NextResponse.json({
            assessments,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
