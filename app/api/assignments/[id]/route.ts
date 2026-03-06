import { NextResponse } from "next/server";
import { requireRole, isErrorResponse } from "@/lib/rbac";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireRole(["professor"]);
    if (isErrorResponse(auth)) return auth;

    const { user, supabase } = auth;
    const { id } = await params;
    const body = await req.json();

    // Use service role to bypass RLS on assignments
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify professor owns the assignment (via created_by)
    const { data: assignment } = await adminSupabase
        .from("assignments")
        .select("id, created_by, exam_status")
        .eq("id", id)
        .single();

    if (!assignment) {
        return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    if (assignment.created_by !== user.id) {
        return NextResponse.json({ error: "Forbidden: not your assignment" }, { status: 403 });
    }

    // Validate exam_status transitions
    if (body.exam_status) {
        const validTransitions: Record<string, string[]> = {
            draft: ["published"],
            published: ["active", "draft"],
            active: ["closed"],
            closed: ["active"],
        };

        const currentStatus = assignment.exam_status || "draft";
        if (!validTransitions[currentStatus]?.includes(body.exam_status)) {
            return NextResponse.json(
                { error: `Cannot transition from '${currentStatus}' to '${body.exam_status}'` },
                { status: 400 }
            );
        }
    }

    const updateFields: Record<string, unknown> = {};
    if (body.title) updateFields.title = body.title;
    if (body.topic) updateFields.topic = body.topic;
    if (body.description !== undefined) updateFields.description = body.description;
    if (body.context_markdown !== undefined) updateFields.context_markdown = body.context_markdown;
    if (body.learning_goals) updateFields.learning_goals = body.learning_goals;
    if (body.exam_status) updateFields.exam_status = body.exam_status;
    if (body.code_editor_enabled !== undefined) updateFields.code_editor_enabled = body.code_editor_enabled;
    if (body.code_editor_language !== undefined) updateFields.code_editor_language = body.code_editor_language;

    const { error } = await adminSupabase
        .from("assignments")
        .update(updateFields)
        .eq("id", id);

    if (error) {
        console.error("Error updating assignment:", error);
        return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireRole(["professor"]);
    if (isErrorResponse(auth)) return auth;

    const { user, supabase } = auth;
    const { id } = await params;

    // Verify professor owns the assignment's course (IDOR protection)
    const { data: assignment } = await supabase
        .from("assignments")
        .select("id, created_by")
        .eq("id", id)
        .eq("created_by", user.id)
        .single();

    if (!assignment) {
        return NextResponse.json({ error: "Assignment not found or not yours" }, { status: 404 });
    }

    // Use service role client to bypass RLS for cascading operations
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Unlink assessments from this assignment
    const { error: unlinkError } = await adminSupabase
        .from("assessments")
        .update({ assignment_id: null })
        .eq("assignment_id", id);

    if (unlinkError) {
        console.error("Error unlinking assessments:", unlinkError);
        return NextResponse.json({ error: "Failed to unlink assessments" }, { status: 500 });
    }

    // Delete the assignment
    const { error } = await adminSupabase
        .from("assignments")
        .delete()
        .eq("id", id)
        .eq("created_by", user.id);

    if (error) {
        console.error("Error deleting assignment:", error);
        return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
