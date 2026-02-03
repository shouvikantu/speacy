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

export async function listReportSummaries(): Promise<ReportSummary[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reports")
    .select("session_id, student_name, student_email, generated_at, report")
    .order("generated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    sessionId: row.session_id,
    studentName: row.student_name ?? "",
    studentEmail: row.student_email ?? "",
    generatedAt: row.generated_at ?? "",
    mastery_level: row.report?.mastery_level ?? "",
    confidence: row.report?.confidence ?? 0,
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
    assessment: data.assessment,
    transcript: data.transcript,
    report: data.report,
  };
}
