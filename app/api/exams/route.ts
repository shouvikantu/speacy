import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ExamPayload = {
  title?: string;
  learningGoals?: string[] | string | null;
  questionTopics?: string[] | string | null;
  rubric?: string | null;
  rubricAuto?: boolean;
  isActive?: boolean;
};

const normalizeList = (value: ExamPayload["learningGoals"]): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => `${item}`.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*\s]+/, "").trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeText = (value: ExamPayload["rubric"]): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const mapExam = (row: any) =>
  row
    ? {
        id: row.id,
        ownerId: row.owner_id,
        title: row.title ?? "",
        learningGoals: Array.isArray(row.learning_goals) ? row.learning_goals : [],
        questionTopics: Array.isArray(row.question_topics) ? row.question_topics : [],
        rubric: row.rubric ?? "",
        rubricAuto: Boolean(row.rubric_auto),
        isActive: Boolean(row.is_active),
        updatedAt: row.updated_at ?? "",
      }
    : null;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exam_settings")
    .select("*")
    .eq("owner_id", user.id)
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const exam = Array.isArray(data) && data.length > 0 ? mapExam(data[0]) : null;
  return NextResponse.json({ ok: true, exam });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as ExamPayload;
  const learningGoals = normalizeList(payload.learningGoals);
  const questionTopics = normalizeList(payload.questionTopics);
  const rubricText = normalizeText(payload.rubric);
  const rubricAuto = typeof payload.rubricAuto === "boolean" ? payload.rubricAuto : false;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exam_settings")
    .upsert(
      {
        owner_id: user.id,
        title: typeof payload.title === "string" ? payload.title.trim() : null,
        learning_goals: learningGoals,
        question_topics: questionTopics,
        rubric: rubricText,
        rubric_auto: rubricText ? rubricAuto : false,
        is_active: Boolean(payload.isActive),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, exam: mapExam(data) });
}
