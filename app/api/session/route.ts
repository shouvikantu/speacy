import { NextResponse } from "next/server";
import { buildExaminerPrompt } from "@/lib/prompts";

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const { instructions } = body;

        const systemInstructions = instructions || buildExaminerPrompt({ topic: "General Knowledge" });

        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-realtime-2025-08-28",
                voice: "ash",
                instructions: systemInstructions,
                turn_detection: {
                    type: "server_vad",
                    threshold: 0.9,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 1000,
                    create_response: true
                },
                tools: [
                    {
                        type: "function",
                        name: "end_assessment",
                        description: "Ends the oral exam assessment after completing all curriculum nodes.",
                    },
                    {
                        type: "function",
                        name: "transferAgents",
                        description: "Triggers a transfer of the user to a more specialized Tutor agent when the student struggles heavily or asks for help. Let the user know you are transferring them to a tutor before calling this.",
                        parameters: {
                            type: "object",
                            properties: {
                                destination_agent: {
                                    type: "string",
                                    enum: ["tutor_agent", "examiner_agent"],
                                    description: "The agent to transfer to. Use 'tutor_agent' when the student needs help. Use 'examiner_agent' to return to the exam after helping."
                                }
                            },
                        },
                    },
                ],
                tool_choice: "auto",
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenAI Session Error:", errorText);
            return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error creating session:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
