"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RealtimeEvent = {
  type?: string;
  transcript?: string;
  delta?: string;
  text?: string;
  name?: string;
  arguments?: string;
  item?: {
    type?: string;
    name?: string;
    arguments?: string;
    role?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  };
  response?: {
    output?: Array<{
      type?: string;
      name?: string;
      arguments?: string;
    }>;
  };
  part?: {
    type?: string;
    transcript?: string;
    text?: string;
  };
  [key: string]: unknown;
};

type EventDirection = "client" | "server";

type SessionState = "idle" | "connecting" | "active" | "stopped" | "error";

type ExamSummary = {
  id: string;
  title: string;
  learningGoals: string[];
  questionTopics: string[];
  hasRubric: boolean;
  updatedAt: string;
};

const getTextDelta = (event: RealtimeEvent) => {
  if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
    return event.delta;
  }
  if (event.type === "response.output_text.done" && typeof event.text === "string") {
    return event.text;
  }
  if (event.type === "response.output_audio_transcript.delta" && typeof event.delta === "string") {
    return event.delta;
  }
  if (
    event.type === "response.output_audio_transcript.done" &&
    typeof event.transcript === "string"
  ) {
    return event.transcript;
  }
  if (
    event.type === "response.content_part.done" &&
    event.part?.type === "audio" &&
    typeof event.part.transcript === "string"
  ) {
    return event.part.transcript;
  }
  if (
    event.type === "response.content_part.done" &&
    event.part?.type === "text" &&
    typeof event.part.text === "string"
  ) {
    return event.part.text;
  }
  return null;
};

const extractCodeBlock = (text: string) => {
  const match = text.match(/```(?:python)?\n([\s\S]*?)```/);
  if (!match) return null;
  return match[1].trim();
};

const DEFAULT_CODE_SNIPPET =
  "# Awaiting the next snippet...\n\ndef summarize(items):\n    return len(items), items[0]";

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState<SessionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [connectionState, setConnectionState] = useState("new");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [assistantText, setAssistantText] = useState("");
  const [assistantLines, setAssistantLines] = useState<string[]>([]);
  const [codeSnippet, setCodeSnippet] = useState<string>(DEFAULT_CODE_SNIPPET);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [reportStatus, setReportStatus] = useState<
    "idle" | "generating" | "ready" | "error"
  >("idle");
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [exam, setExam] = useState<ExamSummary | null>(null);
  const [examLoading, setExamLoading] = useState(true);
  const [examError, setExamError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const reportTriggeredRef = useRef(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const initialId = crypto.randomUUID();
    sessionIdRef.current = initialId;
    setSessionId(initialId);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          setAuthenticated(false);
          setAuthChecked(true);
          router.push(`/auth/login?redirectedFrom=/`);
          return;
        }
        setAuthenticated(true);
        setAuthChecked(true);
      } catch {
        setAuthenticated(false);
        setAuthChecked(true);
        router.push(`/auth/login?redirectedFrom=/`);
      }
    };

    void checkAuth();
  }, [router]);

  const logEvent = async (direction: EventDirection, event: RealtimeEvent) => {
    const activeSessionId = sessionIdRef.current;
    if (!activeSessionId) return;
    setEventCount((count) => count + 1);

    try {
      await fetch("/api/realtime/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId,
          direction,
          event,
          ts: Date.now(),
        }),
      });
    } catch {
      // Logging should never block the session.
    }
  };

  const sendClientEvent = (event: RealtimeEvent) => {
    const channel = dcRef.current;
    if (!channel || channel.readyState !== "open") return false;
    channel.send(JSON.stringify(event));
    void logEvent("client", event);
    return true;
  };

  const loadExam = async () => {
    setExamLoading(true);
    setExamError(null);
    try {
      const res = await fetch("/api/exams/active");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load exam");
      }
      setExam((data?.exam as ExamSummary | null) ?? null);
    } catch (err) {
      setExam(null);
      setExamError(err instanceof Error ? err.message : "Failed to load exam");
    } finally {
      setExamLoading(false);
    }
  };

  useEffect(() => {
    if (!authenticated) return;
    void loadExam();
  }, [authenticated]);

  const sendCodeUpdate = () => {
    if (!codeSnippet) return;
    const message = `Updated code snippet:\n\n\`\`\`python\n${codeSnippet}\n\`\`\`\n\nAsk the student to trace the code line by line and explain the output.`;
    const created = sendClientEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: message }],
      },
    });
    if (created) {
      sendClientEvent({ type: "response.create" });
    }
  };

  const triggerReport = async () => {
    const activeSessionId = sessionIdRef.current;
    if (!activeSessionId || reportTriggeredRef.current) return;
    reportTriggeredRef.current = true;
    setReportStatus("generating");

    try {
      await fetch("/api/realtime/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSessionId }),
      });
      setReportStatus("ready");
    } catch {
      setReportStatus("error");
    } finally {
      stopSession("stopped");
    }
  };

  const detectSessionComplete = (event: RealtimeEvent) => {
    if (event.type === "response.function_call_arguments.done") {
      return event.name === "session_complete";
    }

    if (event.type === "response.output_item.done") {
      return event.item?.type === "function_call" && event.item.name === "session_complete";
    }

    if (event.type === "response.done") {
      return Boolean(
        event.response?.output?.find(
          (item) => item.type === "function_call" && item.name === "session_complete"
        )
      );
    }

    return false;
  };

  const handleServerEvent = (event: RealtimeEvent) => {
    const textDelta = getTextDelta(event);
    if (textDelta) {
      setAssistantText((prev) => {
        if (
          event.type === "response.output_text.done" ||
          event.type === "response.output_audio_transcript.done" ||
          event.type === "response.content_part.done"
        ) {
          return textDelta;
        }
        return `${prev}${textDelta}`;
      });
    }

    if (event.type === "response.created") {
      setAssistantText("");
      setAiSpeaking(true);
    }

    if (event.type === "response.output_audio.delta") {
      setAiSpeaking(true);
    }

    if (event.type === "response.output_audio.done" || event.type === "response.done") {
      setAiSpeaking(false);
    }

    if (
      (event.type === "response.output_text.done" ||
        event.type === "response.output_audio_transcript.done" ||
        event.type === "response.content_part.done") &&
      textDelta
    ) {
      setAssistantLines((prev) => {
        const last = prev[prev.length - 1];
        if (last === textDelta) return prev;
        return [...prev, textDelta];
      });

      const extracted = extractCodeBlock(textDelta);
      if (extracted) {
        setCodeSnippet(extracted);
      }
    }

    if (detectSessionComplete(event)) {
      void triggerReport();
    }
  };

  const startSession = async () => {
    if (status === "connecting" || status === "active") return;
    const mode = exam ? "exam" : "practice";
    const newSessionId = crypto.randomUUID();
    sessionIdRef.current = newSessionId;
    setSessionId(newSessionId);
    setStatus("connecting");
    setError(null);
    setEventCount(0);
    setAssistantText("");
    setAssistantLines([]);
    setCodeSnippet(DEFAULT_CODE_SNIPPET);
    setAiSpeaking(false);
    setReportStatus("idle");
    reportTriggeredRef.current = false;

    try {
      const tokenResponse = await fetch("/api/realtime/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, examId: exam?.id ?? null }),
      });
      if (!tokenResponse.ok) {
        throw new Error("Failed to mint client secret.");
      }
      const tokenPayload = await tokenResponse.json();
      const clientSecret = tokenPayload?.value;
      if (!clientSecret) {
        throw new Error("Missing client secret in response.");
      }

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (audioRef.current && stream) {
          audioRef.current.srcObject = stream;
        }
      };

      const channel = pc.createDataChannel("oai-events");
      dcRef.current = channel;

      channel.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as RealtimeEvent;
          handleServerEvent(payload);
          void logEvent("server", payload);
        } catch {
          // Ignore malformed events.
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      micStreamRef.current = stream;
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      if (!sdpResponse.ok) {
        throw new Error("Failed to negotiate WebRTC session.");
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setStatus("active");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      stopSession("error");
    }
  };

  const stopSession = (nextStatus: SessionState = "stopped") => {
    dcRef.current?.close();
    dcRef.current = null;

    pcRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;

    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;

    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }

    setAiSpeaking(false);
    setStatus(nextStatus);
  };

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/auth/login");
    } catch {
      router.push("/auth/login");
    }
  };

  const sessionMode = exam ? "exam" : "practice";
  const assistantPlaceholder =
    status === "active"
      ? "Listening for your response..."
      : sessionMode === "exam"
        ? "Start the exam to begin."
        : "Start a practice exam to begin.";
  const lastLine = assistantLines[assistantLines.length - 1];
  const assistantScript =
    assistantText && assistantText !== lastLine
      ? [...assistantLines, assistantText]
      : assistantLines;

  useEffect(() => {
    const container = transcriptRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [assistantScript.length]);

  if (!authChecked) {
    return (
      <main className="app">
        <section className="card">Checking your session...</section>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="app">
        <section className="card">Redirecting to login...</section>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">Speacy</div>
        <div className="pill-row">
          <span className={`pill pill-${status}`}>{status}</span>
          <span className="pill">{connectionState}</span>
          <span className="pill mono">events {eventCount}</span>
          <span className="pill mono">report {reportStatus}</span>
          <button className="btn ghost" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-left">
          <div className="hero-copy">
            <p className="eyebrow">Realtime formative professor</p>
            <h1>Adaptive CS tutor that thinks out loud.</h1>
            <p className="lead">
              Socratic questioning with live voice. Hints, reframes, and new questions when
              students get stuck.
            </p>

            <div className="card exam-card">
              <div className="panel-header">
                <div>
                  <div className="panel-title">
                    {exam ? "Faculty exam ready" : "Practice exam"}
                  </div>
                  <div className="panel-subtitle">
                    {exam
                      ? "This exam uses the learning goals and topics set by your instructor."
                      : "No faculty exam is set. Practice with the default assessment."}
                  </div>
                </div>
                <button className="btn ghost" onClick={loadExam} disabled={examLoading}>
                  Refresh
                </button>
              </div>

              {examLoading ? (
                <p className="muted">Loading exam settings...</p>
              ) : exam ? (
                <div className="exam-details">
                  <div className="pill-row">
                    <span className="pill">exam</span>
                    {exam.updatedAt ? (
                      <span className="pill mono">
                        updated {new Date(exam.updatedAt).toLocaleDateString()}
                      </span>
                    ) : null}
                  </div>
                  <h3>{exam.title || "Untitled exam"}</h3>
                  <div className="exam-columns">
                    <div>
                      <h4>Learning goals</h4>
                      <ul>
                        {exam.learningGoals.length ? (
                          exam.learningGoals.map((goal, index) => (
                            <li key={`goal-${index}`}>{goal}</li>
                          ))
                        ) : (
                          <li>No learning goals listed yet.</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4>Question topics</h4>
                      <ul>
                        {exam.questionTopics.length ? (
                          exam.questionTopics.map((topic, index) => (
                            <li key={`topic-${index}`}>{topic}</li>
                          ))
                        ) : (
                          <li>No topics listed yet.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                  <p className="muted">
                    {exam.hasRubric
                      ? "Rubric provided by faculty."
                      : "Rubric will be generated automatically before you start."}
                  </p>
                </div>
              ) : (
                <p className="muted">
                  No active faculty exam yet. You can start a practice exam instead.
                </p>
              )}

              {examError ? <div className="error">{examError}</div> : null}
            </div>

            <div className="controls">
              <button
                className="btn primary"
                onClick={startSession}
                disabled={
                  !sessionId || examLoading || status === "connecting" || status === "active"
                }
              >
                {sessionMode === "exam" ? "Start exam" : "Start practice exam"}
              </button>
              <button
                className="btn ghost"
                onClick={() => stopSession("stopped")}
                disabled={status !== "active" && status !== "connecting"}
              >
                Stop
              </button>
              <span className="pill mono">session {sessionId ?? "-"}</span>
            </div>

            {error ? <div className="error">{error}</div> : null}
          </div>

          <div className="panels">
            <div className="card transcript-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">Professor transcript</div>
                  <div className="panel-subtitle">Live prompts and follow-ups</div>
                </div>
                <span className={`pill ${aiSpeaking ? "pill-active" : "pill-idle"}`}>
                  {aiSpeaking ? "speaking" : "listening"}
                </span>
              </div>
              {assistantScript.length === 0 ? (
                <div className="ai-message muted">{assistantPlaceholder}</div>
              ) : (
                <div className="ai-script" ref={transcriptRef}>
                  {assistantScript.map((line, index) => (
                    <div
                      key={`${line}-${index}`}
                      className={`ai-message ${index === assistantScript.length - 1 ? "" : "muted"}`}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card code-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">Code under discussion</div>
                  <div className="panel-subtitle">AI-provided snippet to explain</div>
                </div>
                <div className="panel-actions">
                  <span className="pill mono">python</span>
                  <button className="btn ghost" onClick={sendCodeUpdate}>
                    Send update
                  </button>
                </div>
              </div>
              <textarea
                className="code-editor"
                spellCheck={false}
                value={codeSnippet}
                onChange={(event) => setCodeSnippet(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className={`portrait ${aiSpeaking ? "portrait-speaking" : ""}`}>
            <img src="/cordova.png" alt="Professor Cordova" />
          </div>
        </div>
      </section>

      <audio ref={audioRef} autoPlay />
    </main>
  );
}
