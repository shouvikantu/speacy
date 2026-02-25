import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { id } = await params;

    // Check Authentication
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check Role
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "professor") {
        return NextResponse.json({ error: "Forbidden: Professors only" }, { status: 403 });
    }

    // Use service role client to bypass RLS for delete
    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Unlink assessments from this assignment (preserve grades, just remove the reference)
    const { error: unlinkError } = await adminSupabase
        .from("assessments")
        .update({ assignment_id: null })
        .eq("assignment_id", id);

    if (unlinkError) {
        console.error("Error unlinking assessments:", unlinkError);
        return NextResponse.json({ error: "Failed to unlink assessments" }, { status: 500 });
    }

    // Now delete the assignment itself
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
