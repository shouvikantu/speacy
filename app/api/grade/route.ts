import { NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/rbac";
import OpenAI from "openai";
import { buildGraderPrompt } from "@/lib/prompts";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { user, supabase, role } = auth;
    const { assessmentId, messages, sessionMetrics, recordingUrl } = await req.json();

    // IDOR protection: verify the assessment belongs to this student
    // or the requesting user is a professor who owns the course
    const { data: assessment } = await supabase
        .from("assessments")
        .select("id, student_name, assignment_id")
        .eq("id", assessmentId)
        .single();

    if (!assessment) {
        return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    if (role === "student" && assessment.student_name !== user.email) {
        return NextResponse.json({ error: "Forbidden: not your assessment" }, { status: 403 });
    }

    if (role === "professor" && assessment.assignment_id) {
        // Verify the assignment belongs to a course owned by this professor
        const { data: assignment } = await supabase
            .from("assignments")
            .select("course_id, courses!inner(faculty_id)")
            .eq("id", assessment.assignment_id)
            .single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const courseData = assignment?.courses as any;
        const facultyId = Array.isArray(courseData) ? courseData[0]?.faculty_id : courseData?.faculty_id;

        if (!assignment || facultyId !== user.id) {
            return NextResponse.json({ error: "Forbidden: not your course" }, { status: 403 });
        }
    }

    try {
        if (!messages || messages.length === 0) {
            return NextResponse.json({ error: "No messages found" }, { status: 400 });
        }

        // Save messages to DB
        const messagesToInsert = messages.map((msg: { role: string; content: string; metadata?: Record<string, unknown> }) => ({
            assessment_id: assessmentId,
            role: msg.role,
            content: msg.content,
            metadata: msg.metadata,
        }));

        const { error: msgError } = await supabase.from("messages").insert(messagesToInsert);

        if (msgError) {
            console.error("Error saving messages:", msgError);
        }

        // Save session metrics
        if (sessionMetrics) {
            const { error: metricsError } = await supabase
                .from("assessments")
                .update({
                    session_metrics: sessionMetrics,
                    status: "grading",
                })
                .eq("id", assessmentId);

            if (metricsError) {
                console.error("Error saving session metrics:", metricsError);
            }
        }

        // Call OpenAI to grade
        const graderInput = {
            messages,
            ...(sessionMetrics ? { sessionMetrics } : {}),
        };

        const completion = await openai.chat.completions.create({
            model: "gpt-5",
            messages: [
                {
                    role: "system",
                    content: buildGraderPrompt(),
                },
                {
                    role: "user",
                    content: JSON.stringify(graderInput),
                },
            ],
            response_format: { type: "json_object" },
        });

        const gradeData = JSON.parse(completion.choices[0].message.content || "{}");

        // Update Assessment in DB
        const updatePayload: Record<string, unknown> = {
            total_score: gradeData.score,
            feedback: JSON.stringify(gradeData),
            status: "graded",
        };

        if (recordingUrl) {
            updatePayload.recording_url = recordingUrl;
        }

        const { error } = await supabase
            .from("assessments")
            .update(updatePayload)
            .eq("id", assessmentId);

        if (error) {
            console.error("Error updating assessment:", error);
            return NextResponse.json({ error: "Failed to save grade: " + error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, grade: gradeData });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
