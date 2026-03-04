import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";

export type UserRole = "student" | "professor" | "superuser";

interface AuthResult {
    user: { id: string; email?: string };
    supabase: SupabaseClient;
    role: UserRole;
}

/**
 * Validates the session and returns user info + role.
 * Returns a NextResponse error if auth fails, otherwise the AuthResult.
 */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const role: UserRole = profile?.role || "student";

    return { user, supabase, role };
}

/**
 * Validates auth + checks role is in the allowed list.
 */
export async function requireRole(
    allowedRoles: UserRole[]
): Promise<AuthResult | NextResponse> {
    const result = await requireAuth();
    if (result instanceof NextResponse) return result;

    // Superusers always pass role checks
    if (result.role === "superuser") return result;

    if (!allowedRoles.includes(result.role)) {
        return NextResponse.json(
            { error: `Forbidden: requires ${allowedRoles.join(" or ")} role` },
            { status: 403 }
        );
    }

    return result;
}

/**
 * Verifies the user has access to a specific course.
 * - Professors must own the course
 * - Students must have an approved enrollment
 * - Superusers always pass
 */
export async function requireCourseAccess(
    courseId: string,
    auth: AuthResult
): Promise<true | NextResponse> {
    const { user, supabase, role } = auth;

    if (role === "superuser") return true;

    if (role === "professor") {
        const { data: course } = await supabase
            .from("courses")
            .select("id")
            .eq("id", courseId)
            .eq("faculty_id", user.id)
            .single();

        if (!course) {
            return NextResponse.json(
                { error: "Forbidden: you do not own this course" },
                { status: 403 }
            );
        }
        return true;
    }

    // Student
    const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("user_id", user.id)
        .eq("status", "approved")
        .single();

    if (!enrollment) {
        return NextResponse.json(
            { error: "Forbidden: not enrolled in this course" },
            { status: 403 }
        );
    }
    return true;
}

/**
 * Verifies a student is enrolled (approved) in the course that contains
 * the given assignment. Used to guard exam access.
 */
export async function requireEnrollment(
    assignmentId: string,
    auth: AuthResult
): Promise<{ courseId: string } | NextResponse> {
    const { user, supabase, role } = auth;

    if (role === "superuser") {
        const { data: assignment } = await supabase
            .from("assignments")
            .select("course_id")
            .eq("id", assignmentId)
            .single();
        return { courseId: assignment?.course_id || "" };
    }

    if (role === "professor") {
        // Professors don't take exams, but can access for grading
        const { data: assignment } = await supabase
            .from("assignments")
            .select("course_id, courses!inner(faculty_id)")
            .eq("id", assignmentId)
            .single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const courseData = assignment?.courses as any;
        const facultyId = Array.isArray(courseData) ? courseData[0]?.faculty_id : courseData?.faculty_id;
        if (!assignment || facultyId !== user.id) {
            return NextResponse.json(
                { error: "Forbidden: assignment not in your course" },
                { status: 403 }
            );
        }
        return { courseId: assignment.course_id };
    }

    // Student: must be enrolled in the assignment's course
    const { data: assignment } = await supabase
        .from("assignments")
        .select("course_id, exam_status")
        .eq("id", assignmentId)
        .single();

    if (!assignment || !assignment.course_id) {
        return NextResponse.json(
            { error: "Assignment not found" },
            { status: 404 }
        );
    }

    if (assignment.exam_status !== "active") {
        return NextResponse.json(
            { error: "This exam is not currently active" },
            { status: 403 }
        );
    }

    const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", assignment.course_id)
        .eq("user_id", user.id)
        .eq("status", "approved")
        .single();

    if (!enrollment) {
        return NextResponse.json(
            { error: "Forbidden: you are not enrolled in this course" },
            { status: 403 }
        );
    }

    return { courseId: assignment.course_id };
}

/**
 * Helper to check if a result is an error response.
 */
export function isErrorResponse(
    result: AuthResult | NextResponse | true | { courseId: string }
): result is NextResponse {
    return result instanceof NextResponse;
}
