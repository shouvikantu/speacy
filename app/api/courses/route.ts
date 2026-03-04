import { NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/rbac";
import { generateUniqueJoinCode } from "@/lib/courses";

export async function POST(req: Request) {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { user, supabase, role } = auth;

    if (role !== "professor" && role !== "superuser") {
        return NextResponse.json({ error: "Only professors can create courses" }, { status: 403 });
    }

    const { name, description } = await req.json();

    if (!name || name.trim().length === 0) {
        return NextResponse.json({ error: "Course name is required" }, { status: 400 });
    }

    try {
        const joinCode = await generateUniqueJoinCode(supabase);

        const { data, error } = await supabase
            .from("courses")
            .insert({
                name: name.trim(),
                description: description?.trim() || "",
                faculty_id: user.id,
                join_code: joinCode,
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating course:", error);
            return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
        }

        return NextResponse.json({ course: data });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET() {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { user, supabase, role } = auth;

    try {
        let courses;

        if (role === "superuser") {
            const { data, error } = await supabase
                .from("courses")
                .select("*, profiles!courses_faculty_id_fkey(email)")
                .order("created_at", { ascending: false });
            if (error) throw error;
            courses = data;
        } else if (role === "professor") {
            const { data, error } = await supabase
                .from("courses")
                .select("*")
                .eq("faculty_id", user.id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            courses = data;
        } else {
            // Students: return courses they're enrolled in (any status)
            const { data, error } = await supabase
                .from("enrollments")
                .select("status, courses(*)")
                .eq("user_id", user.id)
                .order("enrolled_at", { ascending: false });
            if (error) throw error;
            courses = data?.map((e) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const courseObj = (e.courses as unknown as Record<string, unknown>) || {};
                return {
                    ...courseObj,
                    enrollment_status: e.status,
                };
            });
        }

        return NextResponse.json({ courses });
    } catch (error) {
        console.error("Error fetching courses:", error);
        return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
    }
}
