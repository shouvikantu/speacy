import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type LogRequest = {
  sessionId?: string;
  direction?: "client" | "server";
  event?: unknown;
  ts?: number;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as LogRequest;

  if (!payload.sessionId || !payload.direction || !payload.event) {
    return NextResponse.json(
      { error: "Missing sessionId, direction, or event" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { error } = await admin.from("realtime_events").insert({
    session_id: payload.sessionId,
    user_id: user?.id ?? null,
    direction: payload.direction,
    event: payload.event,
    ts: payload.ts ?? Date.now(),
  });

  if (error) {
    return NextResponse.json(
      { error: `Failed to log event: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
