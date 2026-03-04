import { NextResponse } from "next/server";
import { requireRole, isErrorResponse } from "@/lib/rbac";
import { logAuditEvent, AuditActions } from "@/lib/audit";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET() {
    const auth = await requireRole(["superuser"]);
    if (isErrorResponse(auth)) return auth;

    const { user } = auth;

    // Use service role to bypass RLS and see ALL data
    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // Total users by role
        const { data: profiles } = await adminSupabase
            .from("profiles")
            .select("role");

        const roleCounts = { student: 0, professor: 0, superuser: 0 };
        profiles?.forEach((p) => {
            if (p.role in roleCounts) roleCounts[p.role as keyof typeof roleCounts]++;
        });

        // Total courses
        const { count: totalCourses } = await adminSupabase
            .from("courses")
            .select("id", { count: "exact", head: true });

        // Total enrollments by status
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("status");

        const enrollmentCounts = { pending: 0, approved: 0, rejected: 0 };
        enrollments?.forEach((e) => {
            if (e.status in enrollmentCounts) enrollmentCounts[e.status as keyof typeof enrollmentCounts]++;
        });

        // Total assessments by status
        const { data: assessments } = await adminSupabase
            .from("assessments")
            .select("status");

        const assessmentCounts: Record<string, number> = {};
        assessments?.forEach((a) => {
            assessmentCounts[a.status] = (assessmentCounts[a.status] || 0) + 1;
        });

        // Total assignments by exam_status
        const { data: assignments } = await adminSupabase
            .from("assignments")
            .select("exam_status");

        const examStatusCounts: Record<string, number> = {};
        assignments?.forEach((a) => {
            const s = a.exam_status || "unknown";
            examStatusCounts[s] = (examStatusCounts[s] || 0) + 1;
        });

        // Log the audit event
        await logAuditEvent(adminSupabase, user.id, AuditActions.VIEW_USER_LIST, "system", undefined, {
            action: "viewed_global_stats",
        });

        return NextResponse.json({
            stats: {
                users: roleCounts,
                totalUsers: profiles?.length || 0,
                totalCourses: totalCourses || 0,
                enrollments: enrollmentCounts,
                assessments: assessmentCounts,
                examStatuses: examStatusCounts,
            },
        });
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
