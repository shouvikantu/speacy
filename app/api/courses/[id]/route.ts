import { NextResponse } from "next/server";
import { requireAuth, requireCourseAccess, isErrorResponse } from "@/lib/rbac";

export async function PATCH(
    req: Request,
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

    const body = await req.json();
    const updateFields: Record<string, unknown> = {};

    if (body.name !== undefined) updateFields.name = body.name.trim();
    if (body.description !== undefined) updateFields.description = body.description.trim();
    if (body.joining_enabled !== undefined) updateFields.joining_enabled = body.joining_enabled;

    if (Object.keys(updateFields).length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { error } = await supabase
        .from("courses")
        .update(updateFields)
        .eq("id", id);

    if (error) {
        console.error("Error updating course:", error);
        return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

export async function DELETE(
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

    // Check for active enrollments
    const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", id)
        .eq("status", "approved")
        .limit(1);

    if (enrollments && enrollments.length > 0) {
        return NextResponse.json(
            { error: "Cannot delete a course with active enrollments. Remove students first." },
            { status: 400 }
        );
    }

    const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting course:", error);
        return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
