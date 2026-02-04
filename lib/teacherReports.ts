import { createAdminClient } from "@/lib/supabase/admin";

type ReportSummary = {
  sessionId: string;
  studentName: string;
  studentEmail: string;
  generatedAt: string;
  mastery_level: string;
  confidence: number;
};

const sanitizeSessionId = (input: string) =>
  input.replace(/[^a-zA-Z0-9_-]/g, "");

const mean = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;

export async function listReportSummaries(): Promise<ReportSummary[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reports")
    .select("session_id, student_name, student_email, generated_at, psychometrician")
    .order("generated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    sessionId: row.session_id,
    studentName: row.student_name ?? "",
    studentEmail: row.student_email ?? "",
    generatedAt: row.generated_at ?? "",
    mastery_level: row.psychometrician?.overall?.mastery_level ?? "",
    confidence: mean(
      (row.psychometrician?.goal_alignment ?? []).map(
        (item: any) => Number(item?.confidence ?? 0) || 0
      )
    ),
  }));
}

export async function readReport(sessionId: string) {
  const safeId = sanitizeSessionId(sessionId);
  if (!safeId) {
    throw new Error("Invalid sessionId");
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reports")
    .select("*")
    .eq("session_id", safeId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    sessionId: data.session_id,
    generatedAt: data.generated_at,
    student: {
      first_name: data.student_name?.split(" ")[0] ?? "",
      last_name: data.student_name?.split(" ").slice(1).join(" ") ?? "",
      email: data.student_email ?? "",
    },
    transcript: data.transcript,
    psychometrician: data.psychometrician,
  };
}
