import { NextResponse } from "next/server";
import { requireAuth, requireEnrollment, isErrorResponse } from "@/lib/rbac";

export async function POST(req: Request) {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { user, supabase, role } = auth;

    if (role !== "student") {
        return NextResponse.json({ error: "Only students can take assessments" }, { status: 403 });
    }

    const { topic, assignmentId } = await req.json();

    // If assignment-linked, verify enrollment and active status
    if (assignmentId) {
        const enrollmentCheck = await requireEnrollment(assignmentId, auth);
        if (isErrorResponse(enrollmentCheck)) return enrollmentCheck;
    }

    try {
        const { data, error } = await supabase
            .from("assessments")
            .insert({
                topic,
                student_name: user.email,
                status: "pending",
                assignment_id: assignmentId || null,
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating assessment:", error);
            return NextResponse.json({ error: "Failed to create assessment" }, { status: 500 });
        }

        return NextResponse.json({ assessmentId: data.id });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
