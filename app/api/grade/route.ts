import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { buildGraderPrompt } from "@/lib/prompts";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assessmentId, messages, sessionMetrics, recordingUrl } = await req.json();

    try {
        if (!messages || messages.length === 0) {
            return NextResponse.json({ error: "No messages found" }, { status: 400 });
        }

        // Save messages to DB
        const messagesToInsert = messages.map((msg: { role: string; content: string; metadata?: Record<string, unknown> }) => ({
            assessment_id: assessmentId,
            role: msg.role,
            content: msg.content,
            metadata: msg.metadata // Save timestamps, latency
        }));

        const { error: msgError } = await supabase.from("messages").insert(messagesToInsert);

        if (msgError) {
            console.error("Error saving messages:", msgError);
        }

        // Save session metrics to assessment record BEFORE grading
        if (sessionMetrics) {
            const { error: metricsError } = await supabase
                .from("assessments")
                .update({
                    session_metrics: sessionMetrics,
                    status: 'grading'
                })
                .eq("id", assessmentId);

            if (metricsError) {
                console.error("Error saving session metrics:", metricsError);
            }
        }

        // Call OpenAI to grade — include session metrics for richer context
        const graderInput = {
            messages,
            ...(sessionMetrics ? { sessionMetrics } : {})
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
                    content: JSON.stringify(graderInput)
                }
            ],
            response_format: { type: "json_object" }
        });

        const gradeData = JSON.parse(completion.choices[0].message.content || "{}");

        // Update Assessment in DB with grade and recording URL
        const updatePayload: any = {
            total_score: gradeData.score,
            feedback: JSON.stringify(gradeData),
            status: 'graded'
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
