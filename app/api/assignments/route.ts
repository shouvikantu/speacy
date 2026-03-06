import { NextResponse } from "next/server";
import { requireRole, isErrorResponse } from "@/lib/rbac";

export async function POST(req: Request) {
    const auth = await requireRole(["professor"]);
    if (isErrorResponse(auth)) return auth;

    const { user, supabase } = auth;
    const { title, topic, description, questions, learning_goals, context_markdown, course_id, exam_status, code_editor_enabled, code_editor_language } = await req.json();

    // Verify professor owns the course
    if (course_id) {
        const { data: course } = await supabase
            .from("courses")
            .select("id")
            .eq("id", course_id)
            .eq("faculty_id", user.id)
            .single();

        if (!course) {
            return NextResponse.json({ error: "Forbidden: you do not own this course" }, { status: 403 });
        }
    }

    try {
        const { data, error } = await supabase
            .from("assignments")
            .insert({
                created_by: user.id,
                title,
                topic,
                description,
                questions,
                learning_goals,
                context_markdown,
                course_id: course_id || null,
                exam_status: exam_status || "published",
                code_editor_enabled: code_editor_enabled !== undefined ? code_editor_enabled : true,
                code_editor_language: code_editor_language || "python",
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating assignment:", error);
            return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
        }

        return NextResponse.json({ assignmentId: data.id });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET() {
    const auth = await requireRole(["student", "professor"]);
    if (isErrorResponse(auth)) return auth;

    const { user, supabase, role } = auth;

    try {
        let query;

        if (role === "superuser") {
            // Superusers see all assignments
            query = supabase
                .from("assignments")
                .select("*, courses(name, join_code)")
                .order("created_at", { ascending: false });
        } else if (role === "professor") {
            // Professors see only assignments from their courses
            query = supabase
                .from("assignments")
                .select("*, courses!inner(name, join_code)")
                .eq("courses.faculty_id", user.id)
                .order("created_at", { ascending: false });
        } else {
            // Students see only published/active assignments from enrolled courses
            const { data: enrollments } = await supabase
                .from("enrollments")
                .select("course_id")
                .eq("user_id", user.id)
                .eq("status", "approved");

            const courseIds = enrollments?.map((e) => e.course_id) || [];

            if (courseIds.length === 0) {
                return NextResponse.json({ assignments: [] });
            }

            query = supabase
                .from("assignments")
                .select("*, courses(name)")
                .in("course_id", courseIds)
                .in("exam_status", ["published", "active"])
                .order("created_at", { ascending: false });
        }

        const { data: assignments, error } = await query;

        if (error) {
            console.error("Error fetching assignments:", error);
            return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
        }

        return NextResponse.json({ assignments });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
