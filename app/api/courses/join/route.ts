import { NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/rbac";
import { validateJoinCode } from "@/lib/courses";

export async function POST(req: Request) {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { user, supabase, role } = auth;

    if (role !== "student") {
        return NextResponse.json({ error: "Only students can join courses" }, { status: 403 });
    }

    const { code } = await req.json();

    if (!code || code.trim().length === 0) {
        return NextResponse.json({ error: "Course code is required" }, { status: 400 });
    }

    // Validate the join code
    const result = await validateJoinCode(supabase, code);
    if (!result.valid || !result.course) {
        return NextResponse.json({ error: result.error || "Invalid code" }, { status: 400 });
    }

    // Check if already enrolled
    const { data: existing } = await supabase
        .from("enrollments")
        .select("id, status")
        .eq("course_id", result.course.id)
        .eq("user_id", user.id)
        .single();

    if (existing) {
        if (existing.status === "approved") {
            return NextResponse.json({ error: "You are already enrolled in this course" }, { status: 400 });
        }
        if (existing.status === "pending") {
            return NextResponse.json({ error: "Your enrollment is pending approval" }, { status: 400 });
        }
        if (existing.status === "rejected") {
            // Allow re-request after rejection
            const { error } = await supabase
                .from("enrollments")
                .update({ status: "pending", enrolled_at: new Date().toISOString() })
                .eq("id", existing.id);

            if (error) {
                return NextResponse.json({ error: "Failed to re-request enrollment" }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                message: "Enrollment re-requested. Waiting for faculty approval.",
                courseName: result.course.name,
            });
        }
    }

    // Create pending enrollment
    const { error } = await supabase.from("enrollments").insert({
        course_id: result.course.id,
        user_id: user.id,
        status: "pending",
    });

    if (error) {
        console.error("Error creating enrollment:", error);
        return NextResponse.json({ error: "Failed to request enrollment" }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        message: "Enrollment requested. Waiting for faculty approval.",
        courseName: result.course.name,
    });
}
