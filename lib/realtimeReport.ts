import { createAdminClient } from "@/lib/supabase/admin";

type TranscriptLine = {
  role: "student" | "assistant";
  text: string;
  ts: number;
};

type AssessmentSummary = {
  mastery_level: "novice" | "developing" | "competent" | "proficient";
  evidence: string[];
  misconceptions: string[];
  recommended_next_steps: string[];
  confidence: number;
};

type StudentInfo = {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
} | null;

type ReportOutput = {
  summary: string;
  strengths: string[];
  gaps: string[];
  recommended_next_steps: string[];
  mastery_level: AssessmentSummary["mastery_level"];
  confidence: number;
};

type RealtimeEventRow = {
  ts: number;
  direction: "client" | "server";
  event: any;
};

const extractTranscript = (entries: RealtimeEventRow[]): TranscriptLine[] => {
  const transcript: TranscriptLine[] = [];

  for (const entry of entries) {
    const event = entry.event ?? {};
    const ts = typeof entry.ts === "number" ? entry.ts : Date.now();

    if (
      event.type === "conversation.item.input_audio_transcription.completed" &&
      typeof event.transcript === "string"
    ) {
      transcript.push({ role: "student", text: event.transcript, ts });
      continue;
    }

    if (
      event.type === "response.output_audio_transcript.done" &&
      typeof event.transcript === "string"
    ) {
      transcript.push({ role: "assistant", text: event.transcript, ts });
      continue;
    }

    if (event.type === "response.output_text.done" && typeof event.text === "string") {
      transcript.push({ role: "assistant", text: event.text, ts });
      continue;
    }

    if (
      event.type === "response.content_part.done" &&
      event.part?.type === "audio" &&
      typeof event.part.transcript === "string"
    ) {
      transcript.push({ role: "assistant", text: event.part.transcript, ts });
      continue;
    }

    if (
      event.type === "response.content_part.done" &&
      event.part?.type === "text" &&
      typeof event.part.text === "string"
    ) {
      transcript.push({ role: "assistant", text: event.part.text, ts });
      continue;
    }
  }

  transcript.sort((a, b) => a.ts - b.ts);

  return transcript.filter((line, index, list) => {
    const prev = list[index - 1];
    if (!prev) return true;
    return !(prev.role === line.role && prev.text === line.text);
  });
};

const extractOutputText = (payload: any): string => {
  if (typeof payload?.output_text === "string") return payload.output_text;
  if (!Array.isArray(payload?.output)) return "";
  for (const item of payload.output) {
    if (!item?.content || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }
  return "";
};

const safeParseJson = (text: string): ReportOutput | null => {
  if (!text) return null;
  try {
    return JSON.parse(text) as ReportOutput;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as ReportOutput;
    } catch {
      return null;
    }
  }
};

const fetchEvents = async (sessionId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("realtime_events")
    .select("ts, direction, event")
    .eq("session_id", sessionId)
    .order("ts", { ascending: true });

  if (error) {
    throw new Error(`Failed to load events: ${error.message}`);
  }

  return (data ?? []) as RealtimeEventRow[];
};

export async function generateReport(
  sessionId: string,
  assessment: AssessmentSummary | null,
  student: StudentInfo
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const entries = await fetchEvents(sessionId);
  const transcript = extractTranscript(entries.filter((row) => row.direction === "server"));

  const prompt = `You are an assessment analyst. Based on the transcript of a Socratic tutoring session about Python lists and tuples, create a concise report.

Return ONLY valid JSON with the following shape:
{
  "summary": string,
  "strengths": string[],
  "gaps": string[],
  "recommended_next_steps": string[],
  "mastery_level": "novice" | "developing" | "competent" | "proficient",
  "confidence": number (0 to 1)
}

Transcript:
${transcript
    .map((line) => `${line.role === "student" ? "Student" : "Professor"}: ${line.text}`)
    .join("\n")}

Assessment signals (from the tutor's internal checklist):
${assessment ? JSON.stringify(assessment, null, 2) : "(none)"}
`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: prompt,
      temperature: 0.2,
      max_output_tokens: 500,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to generate report: ${details}`);
  }

  const payload = await response.json();
  const outputText = extractOutputText(payload);
  const report =
    safeParseJson(outputText) ??
    ({
      summary: outputText || "Report generation returned no text.",
      strengths: [],
      gaps: [],
      recommended_next_steps: [],
      mastery_level: assessment?.mastery_level ?? "developing",
      confidence: assessment?.confidence ?? 0.5,
    } satisfies ReportOutput);

  return {
    sessionId,
    generatedAt: new Date().toISOString(),
    student,
    assessment,
    transcript,
    report,
  };
}
