"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Transcript } from "@/components/Transcript";
import { CodePanel } from "@/components/CodePanel";
import { MOCK_TRANSCRIPT } from "@/lib/data";
import { Mic, Square, ArrowLeft, CheckCircle, Sparkles, Send, AlertTriangle, Info, Clock } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { buildExaminerPrompt } from "@/lib/prompts";
import { ThemeToggle } from "@/components/ThemeToggle";
import PostExamSurvey from "@/components/PostExamSurvey";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AssignmentData {
    id: string;
    topic: string;
    description?: string;
    context_markdown?: string;
    questions?: { prompt: string }[];
    learning_goals?: string[];
    code_editor_enabled?: boolean;
    code_editor_language?: string;
}

interface TranscriptMessage {
    role: 'user' | 'assistant';
    content: string;
    metadata?: {
        startTime?: number;
        endTime?: number;
        latency?: number;
    };
}


function AssessmentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const assignmentIdParam = searchParams.get('assignmentId');


    const [activeCode, setActiveCode] = useState<string>("");
    const [activeLanguage, setActiveLanguage] = useState<string>("python");
    const [assessmentId, setAssessmentId] = useState<string | null>(null);
    const [sessionStatus, setSessionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
    const [assignmentData, setAssignmentData] = useState<AssignmentData | null>(null);
    const [rightPanelTab, setRightPanelTab] = useState<"context" | "code">("context");
    const [showThankYou, setShowThankYou] = useState(false);
    const [acceptedInstructions, setAcceptedInstructions] = useState(false);

    const [messages, setMessages] = useState<TranscriptMessage[]>(MOCK_TRANSCRIPT);
    const messagesRef = useRef(messages);
    const assessmentIdRef = useRef<string | null>(null);
    const sessionStartTimeRef = useRef<number>(0);
    const endingRef = useRef(false);
    const endSessionScheduledRef = useRef(false);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const currentResponseIdRef = useRef<string | null>(null);

    useEffect(() => {
        assessmentIdRef.current = assessmentId;
    }, [assessmentId]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        const fetchAssignment = async () => {
            if (assignmentIdParam) {
                const supabase = createClient();
                const { data } = await supabase
                    .from('assignments')
                    .select('*')
                    .eq('id', assignmentIdParam)
                    .single();

                if (data) {
                    setAssignmentData(data);
                    // Set code editor language from assignment data
                    const lang = data.code_editor_language || "python";
                    setActiveLanguage(lang);
                    setActiveCode("");
                    if (!data.context_markdown) {
                        setRightPanelTab(data.code_editor_enabled !== false ? "code" : "context");
                    }
                }
            }
        };
        fetchAssignment();
    }, [assignmentIdParam]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dcRef = useRef<RTCDataChannel | null>(null);
    const lastAiEndTimeRef = useRef<number>(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<BlobPart[]>([]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        return () => {
            if (pcRef.current) pcRef.current.close();
            if (dcRef.current) dcRef.current.close();
        }
    }, []);

    const startSession = async () => {
        try {
            setSessionStatus("connecting");
            setMessages([]);
            // eslint-disable-next-line react-hooks/purity
            const now = Date.now();
            sessionStartTimeRef.current = now;
            lastAiEndTimeRef.current = now;

            const topic = assignmentData?.topic || "Lists and Tuples";

            const assessmentRes = await fetch("/api/assessment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic,
                    assignmentId: assignmentIdParam
                })
            });
            const assessmentResData = await assessmentRes.json();
            if (assessmentResData.assessmentId) {
                setAssessmentId(assessmentResData.assessmentId);
            } else {
                console.error("Failed to create assessment:", assessmentResData.error);
                alert("Failed to start assessment. Please try again.");
                setSessionStatus("disconnected");
                return;
            }

            const instructions = buildExaminerPrompt({
                topic,
                description: assignmentData?.description,
                questions: assignmentData?.questions?.map((q) => q.prompt),
                learningGoals: assignmentData?.learning_goals,
                contextMarkdown: assignmentData?.context_markdown,
            });

            const tokenResponse = await fetch("/api/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ instructions })
            });
            const data = await tokenResponse.json();
            const EPHEMERAL_KEY = data.client_secret.value;

            // Setup audio mixer for recording both sides
            const audioCtx = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const destinationNode = audioCtx.createMediaStreamDestination();

            const pc = new RTCPeerConnection();
            pcRef.current = pc;

            const audioEl = document.createElement("audio");
            audioEl.autoplay = true;
            audioRef.current = audioEl;

            pc.ontrack = (e) => {
                audioEl.srcObject = e.streams[0];
                // Connect remote AI stream to the mixer
                const remoteSource = audioCtx.createMediaStreamSource(e.streams[0]);
                remoteSource.connect(destinationNode);

                // Create an AnalyserNode to monitor the AI's audio level.
                // This lets us detect when the AI has truly stopped speaking.
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 256;
                remoteSource.connect(analyser);
                analyserRef.current = analyser;
            };

            const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
            pc.addTrack(ms.getTracks()[0]);

            // Connect local mic stream to the mixer
            const localSource = audioCtx.createMediaStreamSource(ms);
            localSource.connect(destinationNode);

            // Initialize MediaRecorder to capture the mixed streams
            const mediaRecorder = new MediaRecorder(destinationNode.stream);
            mediaRecorderRef.current = mediaRecorder;
            recordedChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    recordedChunksRef.current.push(e.data);
                }
            };

            // Note: start the recorder 
            mediaRecorder.start();

            const dc = pc.createDataChannel("oai-events");
            dcRef.current = dc;

            dc.addEventListener("message", (e) => {
                try {
                    const event = JSON.parse(e.data);

                    if (event.type === 'response.output_item.done') {
                        const item = event.item;
                        if (item.type === 'function_call' && item.name === 'end_assessment') {
                            // The AI has decided the exam is over. Set flags.
                            endingRef.current = true;

                            // Start monitoring actual audio output level.
                            // Only end the session once we confirm the AI has
                            // truly stopped producing audible sound.
                            if (!endSessionScheduledRef.current) {
                                endSessionScheduledRef.current = true;

                                const analyser = analyserRef.current;
                                if (analyser) {
                                    const dataArray = new Uint8Array(analyser.frequencyBinCount);
                                    let silentSince: number | null = null;

                                    const silenceCheck = setInterval(() => {
                                        analyser.getByteTimeDomainData(dataArray);

                                        // Calculate RMS volume (0-1 scale)
                                        let sumSquares = 0;
                                        for (let i = 0; i < dataArray.length; i++) {
                                            const normalized = (dataArray[i] - 128) / 128;
                                            sumSquares += normalized * normalized;
                                        }
                                        const rms = Math.sqrt(sumSquares / dataArray.length);

                                        // Threshold: rms < 0.01 is effectively silence
                                        if (rms < 0.01) {
                                            if (!silentSince) silentSince = Date.now();
                                            // 3 seconds of sustained silence = AI finished speaking
                                            if (Date.now() - silentSince >= 3000) {
                                                clearInterval(silenceCheck);
                                                endSession();
                                            }
                                        } else {
                                            // Audio still playing, reset silence timer
                                            silentSince = null;
                                        }
                                    }, 300);

                                    // Safety cap: end after 45s no matter what
                                    setTimeout(() => {
                                        clearInterval(silenceCheck);
                                        if (endingRef.current) endSession();
                                    }, 45000);
                                } else {
                                    // Fallback if no analyser available
                                    setTimeout(() => endSession(), 10000);
                                }
                            }
                        } else if (item.type === 'function_call' && item.name === 'transferAgents') {
                            const args = JSON.parse(item.arguments || "{}");
                            const dest = args.destination_agent;

                            setMessages(prev => [...prev, {
                                role: 'assistant',
                                content: `\n\n🔧 *Routing to ${dest === 'tutor_agent' ? 'Tutor' : 'Examiner'}...*\n`
                            }]);

                            const newInstructions = buildExaminerPrompt({
                                topic: assignmentData?.topic || "Lists and Tuples",
                                description: assignmentData?.description,
                                questions: assignmentData?.questions?.map((q) => q.prompt),
                                learningGoals: assignmentData?.learning_goals,
                                contextMarkdown: assignmentData?.context_markdown,
                            });

                            // Hot-swap the system instructions for the new persona via WebRTC
                            dc.send(JSON.stringify({
                                type: "session.update",
                                session: { instructions: newInstructions }
                            }));

                            // Immediately trigger the new persona to speak
                            dc.send(JSON.stringify({
                                type: "response.create",
                                response: {
                                    instructions: "Acknowledge the transfer concisely and continue the conversation.",
                                    modalities: ["text", "audio"]
                                }
                            }));
                        }
                        if (item.type === 'message') {
                            lastAiEndTimeRef.current = Date.now();
                        }
                    }

                    if (event.type === 'response.audio_transcript.delta') {
                        const responseId = event.response_id || null;
                        const isNewResponse = responseId !== currentResponseIdRef.current;
                        if (isNewResponse) {
                            currentResponseIdRef.current = responseId;
                        }

                        setMessages(prev => {
                            const lastMsg = prev[prev.length - 1];
                            const now = Date.now();
                            // Only append to the last message if it's the SAME response
                            if (lastMsg && lastMsg.role === 'assistant' && !isNewResponse) {
                                return [
                                    ...prev.slice(0, -1),
                                    {
                                        ...lastMsg,
                                        content: lastMsg.content + event.delta,
                                        metadata: {
                                            ...lastMsg.metadata,
                                            endTime: now
                                        }
                                    }
                                ];
                            } else {
                                // New response = new chat bubble
                                return [...prev, {
                                    role: 'assistant',
                                    content: event.delta,
                                    metadata: {
                                        startTime: now,
                                        endTime: now
                                    }
                                }];
                            }
                        });
                    }

                    if (event.type === 'conversation.item.input_audio_transcription.completed') {
                        const now = Date.now();
                        const latency = now - lastAiEndTimeRef.current;

                        setMessages(prev => [
                            ...prev,
                            {
                                role: 'user',
                                content: event.transcript,
                                metadata: {
                                    startTime: now,
                                    endTime: now,
                                    latency: latency > 0 ? latency : 0
                                }
                            }
                        ]);
                    }



                } catch (err) {
                    console.error("Error parsing event", err);
                }
            });

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const baseUrl = "https://api.openai.com/v1/realtime";
            const model = "gpt-4o-realtime-preview";

            const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
                method: "POST",
                body: offer.sdp,
                headers: {
                    Authorization: `Bearer ${EPHEMERAL_KEY}`,
                    "Content-Type": "application/sdp",
                },
            });

            const answerSdp = await sdpResponse.text();
            const answer = { type: "answer" as RTCSdpType, sdp: answerSdp };
            await pc.setRemoteDescription(answer);

            setSessionStatus("connected");

            const triggerGreeting = () => {
                setTimeout(() => {
                    dc.send(JSON.stringify({ type: "response.create", response: { modalities: ["text", "audio"] } }));
                }, 2000);
            };

            if (dc.readyState === "open") {
                triggerGreeting();
            } else {
                dc.onopen = () => {
                    triggerGreeting();
                };
            }

        } catch (err) {
            console.error("Failed to start session:", err);
            setSessionStatus("disconnected");
        }
    };

    const endSession = async () => {
        pcRef.current?.close();
        pcRef.current = null;
        setSessionStatus("disconnected");
        setShowThankYou(true);

        const currentAssessmentId = assessmentIdRef.current;
        const currentMessages = messagesRef.current;

        const sessionEndTime = Date.now();
        const sessionDurationMs = sessionStartTimeRef.current > 0
            ? sessionEndTime - sessionStartTimeRef.current
            : 0;

        const assistantMessages = currentMessages?.filter((m) => m.role === 'assistant') || [];
        const userMessages = currentMessages?.filter((m) => m.role === 'user') || [];

        const assistantWordCount = assistantMessages.reduce((sum, m) => sum + (m.content?.split(/\s+/).length || 0), 0);
        const userWordCount = userMessages.reduce((sum, m) => sum + (m.content?.split(/\s+/).length || 0), 0);

        const avgLatency = userMessages.length > 0
            ? userMessages.reduce((sum, m) => sum + (m.metadata?.latency || 0), 0) / userMessages.length
            : 0;

        const sessionMetrics = {
            mode: 'openai',
            sessionStartTime: sessionStartTimeRef.current,
            sessionEndTime,
            sessionDurationMs,
            questionCount: assistantMessages.length,
            responseCount: userMessages.length,
            assistantWordCount,
            userWordCount,
            talkRatio: assistantWordCount > 0 ? (userWordCount / assistantWordCount).toFixed(2) : '0',
            avgResponseLatencyMs: Math.round(avgLatency),
        };

        let recordingUrl: string | null = null;

        // Finalize recording and upload to Supabase before grading request
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            const uploadPromise = new Promise<{ publicUrl: string | null } | null>((resolve) => {
                const recorder = mediaRecorderRef.current!;
                recorder.onstop = async () => {
                    const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
                    const supabaseClient = createClient();

                    const fileName = `${currentAssessmentId}-${Date.now()}.webm`;
                    const { data, error } = await supabaseClient.storage
                        .from('exam_recordings')
                        .upload(fileName, blob, {
                            contentType: 'audio/webm'
                        });

                    if (error) {
                        console.error("Error uploading recording:", error);
                        resolve(null);
                    } else if (data) {
                        const { data: publicUrlData } = supabaseClient.storage
                            .from('exam_recordings')
                            .getPublicUrl(data.path);
                        resolve({ publicUrl: publicUrlData.publicUrl });
                    } else {
                        resolve(null);
                    }
                };
            });

            mediaRecorderRef.current.stop();

            try {
                const result = await uploadPromise;
                if (result && result.publicUrl) {
                    recordingUrl = result.publicUrl;
                }
            } catch (err) {
                console.error("Failed to wait for recording upload", err);
            }
        }

        // Fire grading in the background — don't await, let student do the survey
        if (currentAssessmentId) {
            if (currentMessages && currentMessages.length > 0) {
                fetch("/api/grade", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        assessmentId: currentAssessmentId,
                        messages: currentMessages,
                        sessionMetrics,
                        recordingUrl
                    })
                }).catch(e => console.error("Error submitting grade:", e));
            }
        }
    };


    const toggleSession = () => {
        if (sessionStatus === "connected" || sessionStatus === "connecting") {
            endSession();
        } else {
            startSession();
        }
    };



    const toggleCode = () => {
        // Cycle through languages if code editor is enabled
        const languages = ["python", "sql", "javascript", "java", "cpp"];
        const currentIdx = languages.indexOf(activeLanguage);
        const nextIdx = (currentIdx + 1) % languages.length;
        setActiveLanguage(languages[nextIdx]);
        setActiveCode("");
    };

    const sendCodeToAI = () => {
        if (sessionStatus !== "connected" || !dcRef.current) return;

        const codeContext = `Here is the current code I have written in my editor:\n\`\`\`${activeLanguage}\n${activeCode}\n\`\`\``;

        // Add a message item to the conversation context
        dcRef.current.send(JSON.stringify({
            type: "conversation.item.create",
            item: {
                type: "message",
                role: "user",
                content: [
                    {
                        type: "input_text",
                        text: codeContext
                    }
                ]
            }
        }));

        // Trigger the AI to respond to this context
        dcRef.current.send(JSON.stringify({
            type: "response.create",
            response: { modalities: ["text", "audio"] }
        }));

        // Add to our local transcript view
        setMessages(prev => [
            ...prev,
            {
                role: 'user',
                content: `*Sent code snippet to AI for review.*`,
                metadata: {
                    startTime: Date.now(),
                    endTime: Date.now(),
                    latency: 0
                }
            }
        ]);
    };

    if (showThankYou) {
        return <PostExamSurvey assessmentId={assessmentId} />;
    }

    if (!acceptedInstructions) {
        return (
            <div className="flex min-h-screen bg-background font-sans transition-colors duration-300 relative overflow-hidden">
                {/* Background */}
                <div className="absolute top-0 inset-x-0 h-[400px] bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none -z-10" />
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />

                <div className="w-full max-w-2xl mx-auto px-6 py-12 flex flex-col">
                    {/* Testing Mode Banner */}
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-8">
                        <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                        <p className="text-sm font-medium text-foreground">
                            This system is currently in <strong>testing mode</strong>. Please be patient as we continue to work on and improve the platform. Thank you for helping us test!
                        </p>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20 mx-auto mb-6">
                            <Mic size={28} className="text-white" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-3">
                            {assignmentData?.topic || "Oral Exam"}
                        </h1>
                        <p className="text-muted-foreground font-medium">Please read the following instructions carefully before starting.</p>
                    </div>

                    {/* Instructions */}
                    <div className="space-y-4 mb-10">
                        <div className="flex gap-4 p-5 rounded-xl bg-primary/5 border border-primary/10">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <Sparkles size={20} className="text-primary" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground text-sm mb-1">Starting the Exam</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Click the <strong>Start Exam</strong> button and wait for the AI examiner to begin speaking. It may take a few seconds to connect — please be patient.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4 p-5 rounded-xl bg-background border border-border/60">
                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                <Square size={18} className="text-foreground" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground text-sm mb-1">Stopping the Exam Early</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Clicking the <strong>Stop</strong> button will immediately end the exam and begin grading. Only use this if you need to end early.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4 p-5 rounded-xl bg-background border border-border/60">
                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                <Clock size={18} className="text-foreground" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground text-sm mb-1">Automatic Completion</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    When the exam is finished, the AI will <strong>automatically complete the session</strong> and take you to the next stage. You do not need to click stop. This may take a few seconds — please be patient and wait for it to transition.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4 p-5 rounded-xl bg-background border border-border/60">
                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                <Info size={18} className="text-foreground" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground text-sm mb-1">Tips</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Speak clearly and at a natural pace. The AI will ask follow-up questions based on your responses. A transcript of the conversation will appear on the left side of the screen in real time.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Accept Button */}
                    <button
                        onClick={() => setAcceptedInstructions(true)}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 text-white font-bold text-base transition-all shadow-md shadow-primary/20 hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        I Understand — Continue to Exam
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans transition-colors duration-300 relative">

            {/* Dramatic minimal background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/10 rounded-full blur-[120px] pointer-events-none z-0" />

            {/* Minimal Header */}
            <header className="h-[72px] px-6 lg:px-12 flex items-center justify-between shrink-0 z-30 relative">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/dashboard')} className="p-2.5 rounded-full bg-background/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 backdrop-blur-sm transition-all shadow-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight text-foreground">{assignmentData?.topic || "Assessment"}</h1>
                        {sessionStatus === 'connected' ? (
                            <p className="text-[10px] text-primary uppercase tracking-widest font-bold flex items-center gap-1.5 mt-0.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                Live Session Active
                            </p>
                        ) : (
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">
                                Voice Exam
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-background/50 backdrop-blur-sm border border-border/50 shadow-sm p-1 rounded-full flex items-center justify-center">
                        <ThemeToggle />
                    </div>
                    {assignmentData?.code_editor_enabled !== false && (
                        <>
                            <button
                                onClick={toggleCode}
                                className="px-5 py-2 text-xs font-bold uppercase tracking-wider border border-border/50 rounded-full hover:bg-muted text-muted-foreground transition-all hover:text-foreground shadow-sm bg-background/50 backdrop-blur-sm"
                            >
                                {activeLanguage.toUpperCase()}
                            </button>
                            <button
                                onClick={sendCodeToAI}
                                disabled={sessionStatus !== "connected"}
                                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border rounded-full transition-all shadow-sm backdrop-blur-sm ${sessionStatus === "connected"
                                    ? "bg-primary text-primary-foreground border-primary/20 hover:bg-primary/90"
                                    : "bg-muted text-muted-foreground border-border/50 opacity-50 cursor-not-allowed"
                                    }`}
                            >
                                <Send size={14} /> Send Code
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Main Content Area - Split View */}
            <main className="flex-1 flex flex-col md:flex-row p-4 lg:p-6 gap-6 relative z-10 w-full h-full pb-24">

                {/* Left Panel: Conversation */}
                <div className="flex-1 md:w-1/2 flex flex-col relative h-full premium-card overflow-hidden">
                    <div className="flex-1 overflow-y-auto scroll-smooth p-6 w-full h-full">
                        <Transcript messages={messages} />
                        <div ref={messagesEndRef} className="h-10" />
                    </div>
                </div>

                {/* Right Panel: Context & Code Visualization */}
                <div className="hidden md:flex flex-1 md:w-1/2 flex-col h-full overflow-hidden premium-card p-0 border-0 bg-transparent relative">
                    {assignmentData?.context_markdown && assignmentData?.code_editor_enabled !== false && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-background/80 backdrop-blur-md border border-border/50 rounded-full p-1 flex items-center shadow-sm">
                            <button
                                onClick={() => setRightPanelTab('context')}
                                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full transition-all ${rightPanelTab === 'context' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Context
                            </button>
                            <button
                                onClick={() => setRightPanelTab('code')}
                                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full transition-all ${rightPanelTab === 'code' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Code Editor
                            </button>
                        </div>
                    )}
                    <div className="flex-1 rounded-2xl overflow-hidden shadow-sm h-full border border-border bg-background relative flex flex-col">
                        {rightPanelTab === 'context' && assignmentData?.context_markdown ? (
                            <div className="flex-1 overflow-y-auto w-full h-full p-6 pt-16 mt-4">
                                <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-headings:-tracking-tight prose-a:text-primary mx-auto">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {assignmentData.context_markdown}
                                    </ReactMarkdown>
                                </article>
                            </div>
                        ) : assignmentData?.code_editor_enabled !== false ? (
                            <div className="flex-1 w-full h-full relative">
                                <CodePanel
                                    code={activeCode}
                                    language={activeLanguage}
                                    isEditable={true}
                                    onChange={(newCode) => setActiveCode(newCode)}
                                    className="h-full w-full border-0 absolute inset-0"
                                />
                            </div>
                        ) : assignmentData?.context_markdown ? (
                            <div className="flex-1 overflow-y-auto w-full h-full p-6">
                                <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-headings:-tracking-tight prose-a:text-primary mx-auto">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {assignmentData.context_markdown}
                                    </ReactMarkdown>
                                </article>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm font-medium">
                                No context or code editor for this exam.
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Tab View */}
                <div className="md:hidden h-[400px] flex flex-col shrink-0 premium-card p-0 border-0 bg-transparent mb-6 relative">
                    {assignmentData?.context_markdown && assignmentData?.code_editor_enabled !== false && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-background/80 backdrop-blur-md border border-border/50 rounded-full p-1 flex items-center shadow-sm">
                            <button
                                onClick={() => setRightPanelTab('context')}
                                className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all ${rightPanelTab === 'context' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Context
                            </button>
                            <button
                                onClick={() => setRightPanelTab('code')}
                                className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all ${rightPanelTab === 'code' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Code
                            </button>
                        </div>
                    )}
                    <div className="flex-1 rounded-2xl overflow-hidden shadow-sm h-full border border-border bg-background relative flex flex-col">
                        {rightPanelTab === 'context' && assignmentData?.context_markdown ? (
                            <div className="flex-1 overflow-y-auto w-full h-full p-4 pt-16">
                                <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {assignmentData.context_markdown}
                                    </ReactMarkdown>
                                </article>
                            </div>
                        ) : assignmentData?.code_editor_enabled !== false ? (
                            <div className="flex-1 w-full h-full relative">
                                <CodePanel
                                    code={activeCode}
                                    language={activeLanguage}
                                    isEditable={true}
                                    onChange={(newCode) => setActiveCode(newCode)}
                                    className="h-full w-full border-0 absolute inset-0"
                                />
                            </div>
                        ) : assignmentData?.context_markdown ? (
                            <div className="flex-1 overflow-y-auto w-full h-full p-4">
                                <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {assignmentData.context_markdown}
                                    </ReactMarkdown>
                                </article>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm font-medium">
                                No context or code editor for this exam.
                            </div>
                        )}
                    </div>
                </div>

                {/* Floating Voice Control Bar - Prominent */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-40">
                    <div className="flex items-center gap-4 p-3 pr-8 pl-3 rounded-full bg-background/80 backdrop-blur-xl border border-border/50 shadow-2xl transition-all duration-300 hover:shadow-primary/10 hover:-translate-y-1">
                        <button
                            onClick={toggleSession}
                            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${sessionStatus === 'connected'
                                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-destructive/20 scale-105'
                                : sessionStatus === 'connecting'
                                    ? 'bg-muted text-muted-foreground cursor-wait scale-95'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30 hover:scale-105'
                                }`}
                        >
                            {sessionStatus === 'connected' && (
                                <span className="absolute inset-0 rounded-full border-2 border-destructive animate-ping opacity-20" />
                            )}
                            {sessionStatus === 'connected' ? <Square size={24} fill="currentColor" /> : <Mic size={28} />}
                        </button>

                        <div className="flex flex-col min-w-[120px]">
                            <span className={`text-lg font-extrabold tracking-tight ${sessionStatus === 'connected' ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {sessionStatus === 'connected' ? 'Listening...' : sessionStatus === 'connecting' ? 'Connecting...' : 'Tap to Start'}
                            </span>
                            {sessionStatus === 'connected' ? (
                                <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5 opacity-80">
                                    <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                                    Recording Active
                                </span>
                            ) : (
                                <span className="text-[11px] text-muted-foreground/60 font-semibold uppercase tracking-wider">
                                    Voice AI Interface
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function AssessmentPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-background text-foreground font-sans">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center animate-pulse">
                        <Sparkles size={24} className="text-muted-foreground opacity-50" />
                    </div>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Loading Environment...</p>
                </div>
            </div>
        }>
            <AssessmentContent />
        </Suspense>
    );
}
