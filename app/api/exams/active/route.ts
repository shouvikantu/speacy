import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const mapExam = (row: any) =>
  row
    ? {
        id: row.id,
        title: row.title ?? "",
        learningGoals: Array.isArray(row.learning_goals) ? row.learning_goals : [],
        questionTopics: Array.isArray(row.question_topics) ? row.question_topics : [],
        hasRubric: Boolean(row.rubric),
        updatedAt: row.updated_at ?? "",
      }
    : null;

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exam_settings")
    .select("id, title, learning_goals, question_topics, rubric, updated_at")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const exam = Array.isArray(data) && data.length > 0 ? mapExam(data[0]) : null;
  return NextResponse.json({ ok: true, exam });
}
