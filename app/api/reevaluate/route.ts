import { NextResponse } from "next/server";
import { requireRole, isErrorResponse } from "@/lib/rbac";
import OpenAI from "openai";
import { buildGraderPrompt } from "@/lib/prompts";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    const auth = await requireRole(["professor"]);
    if (isErrorResponse(auth)) return auth;

    const { user, supabase } = auth;
    const { assessmentId } = await req.json();

    if (!assessmentId) {
        return NextResponse.json({ error: "assessmentId is required" }, { status: 400 });
    }

    // IDOR: Verify the assessment belongs to a course owned by this professor
    const { data: assessment } = await supabase
        .from("assessments")
        .select("id, assignment_id")
        .eq("id", assessmentId)
        .single();

    if (!assessment) {
        return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    if (assessment.assignment_id) {
        const { data: assignment } = await supabase
            .from("assignments")
            .select("course_id, courses!inner(faculty_id)")
            .eq("id", assessment.assignment_id)
            .single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const courseData = assignment?.courses as any;
        const facultyId = Array.isArray(courseData) ? courseData[0]?.faculty_id : courseData?.faculty_id;

        if (!assignment || facultyId !== user.id) {
            return NextResponse.json(
                { error: "Forbidden: this assessment is not in your course" },
                { status: 403 }
            );
        }
    }

    try {
        // Fetch existing messages
        const { data: messages, error: msgError } = await supabase
            .from("messages")
            .select("role, content, metadata")
            .eq("assessment_id", assessmentId)
            .order("created_at", { ascending: true });

        if (msgError) {
            console.error("Error fetching messages:", msgError);
            return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
        }

        if (!messages || messages.length === 0) {
            return NextResponse.json({ error: "No messages found for this assessment" }, { status: 404 });
        }

        // Call OpenAI to re-grade
        const completion = await openai.chat.completions.create({
            model: "gpt-5",
            messages: [
                {
                    role: "system",
                    content: buildGraderPrompt(),
                },
                {
                    role: "user",
                    content: JSON.stringify(messages),
                },
            ],
            response_format: { type: "json_object" },
        });

        const gradeData = JSON.parse(completion.choices[0].message.content || "{}");

        // Update assessment with new grade
        const { error } = await supabase
            .from("assessments")
            .update({
                total_score: gradeData.score,
                feedback: JSON.stringify(gradeData),
                status: "graded",
            })
            .eq("id", assessmentId);

        if (error) {
            console.error("Error updating assessment:", error);
            return NextResponse.json({ error: "Failed to save grade: " + error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, grade: gradeData });
    } catch (error) {
        console.error("Reevaluation error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
