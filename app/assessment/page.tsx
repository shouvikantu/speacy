"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Transcript } from "@/components/Transcript";
import { CodePanel } from "@/components/CodePanel";
import { MOCK_TRANSCRIPT, MOCK_CODE_SQL, MOCK_CODE_PYTHON } from "@/lib/data";
import { Mic, Square, ArrowLeft, Zap, CheckCircle, Sparkles, Send } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { buildExaminerPrompt } from "@/lib/prompts";

import dynamic from 'next/dynamic';
import { ThemeToggle } from "@/components/ThemeToggle";


function AssessmentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const assignmentIdParam = searchParams.get('assignmentId');


    const [activeCode, setActiveCode] = useState<string>(MOCK_CODE_SQL);
    const [activeLanguage, setActiveLanguage] = useState<string>("sql");
    const [assessmentId, setAssessmentId] = useState<string | null>(null);
    const [sessionStatus, setSessionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
    const [assignmentData, setAssignmentData] = useState<any>(null);
    const [showThankYou, setShowThankYou] = useState(false);

    const [messages, setMessages] = useState<any[]>(MOCK_TRANSCRIPT);
    const messagesRef = useRef(messages);
    const assessmentIdRef = useRef<string | null>(null);
    const sessionStartTimeRef = useRef<number>(0);

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
                const { data, error } = await supabase
                    .from('assignments')
                    .select('*')
                    .eq('id', assignmentIdParam)
                    .single();

                if (data) {
                    setAssignmentData(data);
                }
            }
        };
        fetchAssignment();
    }, [assignmentIdParam]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dcRef = useRef<RTCDataChannel | null>(null);
    const lastAiEndTimeRef = useRef<number>(Date.now());

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
            sessionStartTimeRef.current = Date.now();

            const topic = assignmentData?.topic || "Lists and Tuples";

            const assessmentRes = await fetch("/api/assessment", {
                method: "POST",
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
                questions: assignmentData?.questions?.map((q: any) => q.prompt),
                learningGoals: assignmentData?.learning_goals,
            });

            const tokenResponse = await fetch("/api/session", {
                method: "POST",
                body: JSON.stringify({ instructions })
            });
            const data = await tokenResponse.json();
            const EPHEMERAL_KEY = data.client_secret.value;

            const pc = new RTCPeerConnection();
            pcRef.current = pc;

            const audioEl = document.createElement("audio");
            audioEl.autoplay = true;
            audioRef.current = audioEl;

            pc.ontrack = (e) => {
                audioEl.srcObject = e.streams[0];
            };

            const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
            pc.addTrack(ms.getTracks()[0]);

            const dc = pc.createDataChannel("oai-events");
            dcRef.current = dc;

            dc.addEventListener("message", (e) => {
                try {
                    const event = JSON.parse(e.data);

                    if (event.type === 'response.output_item.done') {
                        const item = event.item;
                        if (item.type === 'function_call' && item.name === 'end_assessment') {
                            // Give the AI ample time to finish its final spoken sentence before disconnecting
                            setTimeout(() => {
                                endSession();
                            }, 7000);
                        } else if (item.type === 'function_call' && item.name === 'transferAgents') {
                            const args = JSON.parse(item.arguments || "{}");
                            const dest = args.destination_agent;
                            console.log("Transferring Agents:", dest);

                            setMessages(prev => [...prev, {
                                role: 'assistant',
                                content: `\n\n🔧 *Routing to ${dest === 'tutor_agent' ? 'Tutor' : 'Examiner'}...*\n`
                            }]);

                            let newInstructions = buildExaminerPrompt({
                                topic: assignmentData?.topic || "Lists and Tuples",
                                description: assignmentData?.description,
                                questions: assignmentData?.questions?.map((q: any) => q.prompt),
                                learningGoals: assignmentData?.learning_goals,
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
                        setMessages(prev => {
                            const lastMsg = prev[prev.length - 1];
                            const now = Date.now();
                            if (lastMsg && lastMsg.role === 'assistant') {
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

        const assistantMessages = currentMessages?.filter((m: any) => m.role === 'assistant') || [];
        const userMessages = currentMessages?.filter((m: any) => m.role === 'user') || [];

        const assistantWordCount = assistantMessages.reduce((sum: number, m: any) => sum + (m.content?.split(/\s+/).length || 0), 0);
        const userWordCount = userMessages.reduce((sum: number, m: any) => sum + (m.content?.split(/\s+/).length || 0), 0);

        const avgLatency = userMessages.length > 0
            ? userMessages.reduce((sum: number, m: any) => sum + (m.metadata?.latency || 0), 0) / userMessages.length
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

        if (currentAssessmentId) {
            if (currentMessages && currentMessages.length > 0) {
                try {
                    await fetch("/api/grade", {
                        method: "POST",
                        body: JSON.stringify({
                            assessmentId: currentAssessmentId,
                            messages: currentMessages,
                            sessionMetrics
                        })
                    });
                } catch (e) {
                    console.error("Error submitting grade:", e);
                }
            }
        }

        setTimeout(() => {
            router.push('/dashboard');
        }, 3000);
    };


    const toggleSession = () => {
        if (sessionStatus === "connected" || sessionStatus === "connecting") {
            endSession();
        } else {
            startSession();
        }
    };



    const toggleCode = () => {
        if (activeLanguage === "sql") {
            setActiveCode(MOCK_CODE_PYTHON);
            setActiveLanguage("python");
        } else {
            setActiveCode(MOCK_CODE_SQL);
            setActiveLanguage("sql");
        }
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
        return (
            <div className="flex min-h-screen bg-background items-center justify-center font-sans transition-colors duration-300 relative overflow-hidden">
                {/* Subtle Background Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10" />

                <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg animate-fade-in-up">
                    <div className="relative mb-8">
                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20">
                            <CheckCircle size={48} className="text-white fill-white/10" />
                        </div>
                    </div>

                    <h1 className="text-4xl font-extrabold text-foreground tracking-tight mb-4">
                        Assessment Complete
                    </h1>
                    <p className="text-lg font-medium text-muted-foreground mb-10 leading-relaxed">
                        Your exam has been successfully recorded. The AI is now analyzing your performance and generating a detailed feedback report.
                    </p>

                    <div className="flex items-center gap-3 px-6 py-4 rounded-xl bg-muted border border-border shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-sm font-semibold text-foreground tracking-wide">Redirecting to Dashboard...</span>
                    </div>
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
                    <button
                        onClick={toggleCode}
                        className="px-5 py-2 text-xs font-bold uppercase tracking-wider border border-border/50 rounded-full hover:bg-muted text-muted-foreground transition-all hover:text-foreground shadow-sm bg-background/50 backdrop-blur-sm"
                    >
                        {activeLanguage === 'sql' ? 'Python' : 'SQL'}
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

                {/* Right Panel: Code Visualization */}
                <div className="hidden md:flex flex-1 md:w-1/2 flex-col h-full overflow-hidden premium-card p-0 border-0 bg-transparent">
                    <div className="flex-1 rounded-2xl overflow-hidden shadow-sm h-full border border-border">
                        <CodePanel
                            code={activeCode}
                            language={activeLanguage}
                            isEditable={true}
                            onChange={(newCode) => setActiveCode(newCode)}
                            className="h-full border-0 rounded-2xl"
                        />
                    </div>
                </div>

                {/* Mobile Code View */}
                <div className="md:hidden h-80 flex flex-col shrink-0 premium-card p-0 border-0 bg-transparent mb-6">
                    <div className="flex-1 rounded-2xl overflow-hidden shadow-sm h-full border border-border">
                        <CodePanel
                            code={activeCode}
                            language={activeLanguage}
                            isEditable={true}
                            onChange={(newCode) => setActiveCode(newCode)}
                            className="h-full border-0 rounded-2xl"
                        />
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
