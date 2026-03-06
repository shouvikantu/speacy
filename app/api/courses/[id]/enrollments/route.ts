import { NextResponse } from "next/server";
import { requireAuth, requireCourseAccess, isErrorResponse } from "@/lib/rbac";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { supabase, role } = auth;
    const { id } = await params;

    if (role !== "professor" && role !== "superuser") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const access = await requireCourseAccess(id, auth);
    if (isErrorResponse(access)) return access;

    const { data: enrollments, error } = await supabase
        .from("enrollments")
        .select("id, status, enrolled_at, user_id, profiles!enrollments_user_id_fkey(id, email, role)")
        .eq("course_id", id)
        .order("enrolled_at", { ascending: false });

    if (error) {
        console.error("Error fetching enrollments:", error);
        return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 });
    }

    return NextResponse.json({ enrollments });
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { role } = auth;
    const { id } = await params;

    if (role !== "professor" && role !== "superuser") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const access = await requireCourseAccess(id, auth);
    if (isErrorResponse(access)) return access;

    const { enrollmentId, status } = await req.json();

    if (!enrollmentId || !["approved", "rejected"].includes(status)) {
        return NextResponse.json(
            { error: "enrollmentId and status (approved/rejected) are required" },
            { status: 400 }
        );
    }

    // Use service role client to bypass RLS — the professor's user_id doesn't
    // match the enrollment's user_id, so the RLS policy would block the update.
    // Authorization is already verified above via requireCourseAccess.
    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the enrollment belongs to this course
    const { data: enrollment } = await adminSupabase
        .from("enrollments")
        .select("id")
        .eq("id", enrollmentId)
        .eq("course_id", id)
        .single();

    if (!enrollment) {
        return NextResponse.json({ error: "Enrollment not found in this course" }, { status: 404 });
    }

    const { error } = await adminSupabase
        .from("enrollments")
        .update({ status })
        .eq("id", enrollmentId);

    if (error) {
        console.error("Error updating enrollment:", error);
        return NextResponse.json({ error: "Failed to update enrollment" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { role } = auth;
    const { id } = await params;

    if (role !== "professor" && role !== "superuser") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const access = await requireCourseAccess(id, auth);
    if (isErrorResponse(access)) return access;

    const { enrollmentId } = await req.json();

    if (!enrollmentId) {
        return NextResponse.json(
            { error: "enrollmentId is required" },
            { status: 400 }
        );
    }

    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the enrollment belongs to this course
    const { data: enrollment } = await adminSupabase
        .from("enrollments")
        .select("id")
        .eq("id", enrollmentId)
        .eq("course_id", id)
        .single();

    if (!enrollment) {
        return NextResponse.json({ error: "Enrollment not found in this course" }, { status: 404 });
    }

    // Soft-delete: set status to rejected so student can re-join if needed
    const { error } = await adminSupabase
        .from("enrollments")
        .update({ status: "rejected" })
        .eq("id", enrollmentId);

    if (error) {
        console.error("Error removing enrollment:", error);
        return NextResponse.json({ error: "Failed to remove student" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
