import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = "https://zqziynzbtoixcvuxyskx.supabase.co"
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpxeml5bnpidG9peGN2dXh5c2t4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA3NTg4NywiZXhwIjoyMDg1NjUxODg3fQ.rljKfeD0_KmneUSr9J6aR_2p0qPuRLnkgPvIE5UktK4"

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});

const workspace = process.cwd();
const eventsDir = path.join(workspace, "data", "realtime-events");
const reportsDir = path.join(workspace, "data", "reports");

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
};

const parseJsonLines = (raw) =>
  raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));

const backfillEvents = async () => {
  let files = [];
  try {
    files = await readdir(eventsDir);
  } catch {
    console.log("No data/realtime-events directory found, skipping events.");
    return;
  }

  for (const file of files) {
    if (!file.endsWith(".jsonl")) continue;
    const sessionId = path.basename(file, ".jsonl");
    const raw = await readFile(path.join(eventsDir, file), "utf8");
    const lines = parseJsonLines(raw);
    const rows = lines.map((line) => ({
      session_id: sessionId,
      user_id: null,
      direction: line.direction,
      event: line.event,
      ts: line.ts,
    }));

    for (const batch of chunk(rows, 500)) {
      const { error } = await supabase.from("realtime_events").insert(batch);
      if (error) {
        console.error(`Failed inserting events for ${sessionId}:`, error.message);
        break;
      }
    }

    console.log(`Backfilled events for ${sessionId} (${rows.length} rows)`);
  }
};

const backfillReports = async () => {
  let files = [];
  try {
    files = await readdir(reportsDir);
  } catch {
    console.log("No data/reports directory found, skipping reports.");
    return;
  }

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const raw = await readFile(path.join(reportsDir, file), "utf8");
    const payload = JSON.parse(raw);

    const studentName = payload.student
      ? `${payload.student.first_name ?? ""} ${payload.student.last_name ?? ""}`.trim()
      : "";

    const row = {
      session_id: payload.sessionId,
      user_id: payload.student?.id ?? null,
      student_name: studentName,
      student_email: payload.student?.email ?? "",
      assessment: payload.assessment ?? null,
      transcript: payload.transcript ?? null,
      report: payload.report ?? null,
      generated_at: payload.generatedAt ?? new Date().toISOString(),
    };

    const { error } = await supabase.from("reports").upsert(row);
    if (error) {
      console.error(`Failed inserting report ${payload.sessionId}:`, error.message);
    } else {
      console.log(`Backfilled report ${payload.sessionId}`);
    }
  }
};

await backfillEvents();
await backfillReports();
console.log("Backfill complete.");
