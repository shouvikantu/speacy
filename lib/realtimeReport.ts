import { createAdminClient } from "@/lib/supabase/admin";

type TranscriptLine = {
  role: "student" | "assistant";
  text: string;
  ts: number;
};

type StudentInfo = {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
} | null;

type PsychometricianEvidence = {
  goal: string;
  score: number;
  confidence: number;
  evidence: string[];
  notes: string;
};

type PsychometricianReport = {
  denoised_transcript: {
    claims: string[];
    code_traces: string[];
  };
  goal_alignment: PsychometricianEvidence[];
  overall: {
    mastery_level: "novice" | "developing" | "competent" | "proficient";
    summary: string;
    strengths: string[];
    gaps: string[];
    next_steps: string[];
  };
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

const fetchActiveExamConfig = async () => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exam_settings")
    .select("title, learning_goals, question_topics")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to load exam settings: ${error.message}`);
  }

  const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
  return row
    ? {
        title: row.title ?? "",
        learningGoals: Array.isArray(row.learning_goals) ? row.learning_goals : [],
        questionTopics: Array.isArray(row.question_topics) ? row.question_topics : [],
      }
    : null;
};

const safeParsePsychometrician = (text: string): PsychometricianReport | null => {
  if (!text) return null;
  try {
    return JSON.parse(text) as PsychometricianReport;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as PsychometricianReport;
    } catch {
      return null;
    }
  }
};

const defaultPsychometrician = (): PsychometricianReport => ({
  denoised_transcript: { claims: [], code_traces: [] },
  goal_alignment: [],
  overall: {
    mastery_level: "developing",
    summary: "Psychometrician analysis unavailable.",
    strengths: [],
    gaps: [],
    next_steps: [],
  },
});

const generatePsychometricianReport = async (
  apiKey: string,
  transcript: TranscriptLine[],
  learningGoals: string[],
  questionTopics: string[]
) => {
  const studentOnly = transcript
    .filter((line) => line.role === "student")
    .map((line) => line.text)
    .join("\n");

  const goals =
    learningGoals.length > 0
      ? learningGoals
      : [
          "Explain key concepts accurately.",
          "Apply concepts to examples or scenarios.",
          "Trace code and reason about outputs.",
          "Communicate reasoning clearly.",
        ];

  const topics =
    questionTopics.length > 0
      ? questionTopics
      : ["Core concepts", "Applications", "Code tracing", "Reasoning clarity"];

  const prompt = `You are the Psychometrician Agent, the head of grading. You are cold, analytical, and data-driven.\n\n` +
    `Task: Map the student's responses to the curriculum goals with high fidelity.\n\n` +
    `Evidence Mapping Pipeline:\n` +
    `1) Transcript de-noising: remove filler (\"hmm\", \"let me think\"), encouragement, and off-topic text. Extract only the student's claims and code-tracing logic.\n` +
    `2) Goal-by-goal alignment: for each goal, extract semantic evidence from the student's responses.\n` +
    `3) Scoring: score each goal 0-4 (0=missing, 1=emerging, 2=partial, 3=solid, 4=mastery) with confidence 0-1.\n\n` +
    `Learning goals:\n${goals.map((goal) => `- ${goal}`).join("\n")}\n\n` +
    `Question topics:\n${topics.map((topic) => `- ${topic}`).join("\n")}\n\n` +
    `Student transcript (raw):\n${studentOnly || "(no student transcript)"}\n\n` +
    `Output ONLY valid JSON with this exact shape:\n` +
    `{\n` +
    `  "denoised_transcript": {\n` +
    `    "claims": string[],\n` +
    `    "code_traces": string[]\n` +
    `  },\n` +
    `  "goal_alignment": [\n` +
    `    {\n` +
    `      "goal": string,\n` +
    `      "score": number,\n` +
    `      "confidence": number,\n` +
    `      "evidence": string[],\n` +
    `      "notes": string\n` +
    `    }\n` +
    `  ],\n` +
    `  "overall": {\n` +
    `    "mastery_level": "novice" | "developing" | "competent" | "proficient",\n` +
    `    "summary": string,\n` +
    `    "strengths": string[],\n` +
    `    "gaps": string[],\n` +
    `    "next_steps": string[]\n` +
    `  }\n` +
    `}\n\n` +
    `Rules:\n- Each goal must appear exactly once in goal_alignment.\n- Evidence must be short and tied to student statements.\n- If no evidence exists, leave evidence empty and score 0.\n- Keep the output concise.`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: prompt,
      temperature: 0.1,
      max_output_tokens: 700,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to generate psychometrician report: ${details}`);
  }

  const payload = await response.json();
  const outputText = extractOutputText(payload);
  return (
    safeParsePsychometrician(outputText) ??
    defaultPsychometrician()
  );
};

export async function generateReport(
  sessionId: string,
  student: StudentInfo
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const entries = await fetchEvents(sessionId);
  const transcript = extractTranscript(entries.filter((row) => row.direction === "server"));
  let examConfig: { title: string; learningGoals: string[]; questionTopics: string[] } | null =
    null;
  try {
    examConfig = await fetchActiveExamConfig();
  } catch {
    examConfig = null;
  }

  let psychometrician = defaultPsychometrician();
  try {
    psychometrician = await generatePsychometricianReport(
      apiKey,
      transcript,
      examConfig?.learningGoals ?? [],
      examConfig?.questionTopics ?? []
    );
  } catch {
    psychometrician = defaultPsychometrician();
  }

  return {
    sessionId,
    generatedAt: new Date().toISOString(),
    student,
    transcript,
    psychometrician,
  };
}
