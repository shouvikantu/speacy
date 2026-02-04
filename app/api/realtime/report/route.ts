import { NextResponse } from "next/server";
import { generateReport } from "@/lib/realtimeReport";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ReportRequest = {
  sessionId?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as ReportRequest;

  if (!payload.sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const student = user
      ? {
          id: user.id,
          email: user.email,
          first_name: (user.user_metadata as { first_name?: string })?.first_name ?? "",
          last_name: (user.user_metadata as { last_name?: string })?.last_name ?? "",
        }
      : null;

    const report = await generateReport(payload.sessionId, student);
    const admin = createAdminClient();
    const studentName = student
      ? `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim()
      : "";

    const { error: insertError } = await admin.from("reports").upsert({
      session_id: report.sessionId,
      user_id: student?.id ?? null,
      student_name: studentName,
      student_email: student?.email ?? "",
      transcript: report.transcript,
      psychometrician: report.psychometrician,
      generated_at: report.generatedAt,
    });
    if (insertError) {
      throw new Error(`Failed to save report: ${insertError.message}`);
    }

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
