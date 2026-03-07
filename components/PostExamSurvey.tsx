"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, ChevronRight, ChevronLeft } from "lucide-react";

interface LikertQuestion {
    key: string;
    text: string;
}

const SECTIONS = [
    {
        id: "usability",
        title: "Usability",
        description: "Rate your agreement with each statement.",
        likert: [
            { key: "u1", text: "The login process (Google sign-in and access code) was straightforward." },
            { key: "u2", text: "The exam interface was easy to navigate and understand." },
            { key: "u3", text: "Setting up microphone access was easy." },
            { key: "u4", text: "The exam prompt and instructions were clear." },
            { key: "u5", text: "I did not experience any significant technical issues during the exam." },
            { key: "u6", text: "The system accurately captured what I was saying." },
        ] as LikertQuestion[],
        openEnded: [
            { key: "u_open1", label: "Did you encounter any technical problems? If so, please describe them.", placeholder: "Describe any issues you experienced..." },
            { key: "u_open2", label: "What would you change about the interface or setup process?", placeholder: "Your suggestions..." },
        ],
    },
    {
        id: "experience",
        title: "Exam Experience",
        description: "Rate your agreement with each statement.",
        likert: [
            { key: "e1", text: "The questions asked by the AI examiner were relevant to the course material." },
            { key: "e2", text: "The AI examiner's follow-up questions helped me clarify or expand on my answers." },
            { key: "e3", text: "I felt the exam gave me a fair opportunity to demonstrate my knowledge." },
            { key: "e4", text: "The pacing of the exam felt appropriate (not too fast, not too slow)." },
            { key: "e5", text: "The difficulty of the exam matched what I expected based on the course." },
            { key: "e6", text: "I felt I could express my understanding more effectively verbally than in a written exam." },
        ] as LikertQuestion[],
        openEnded: [
            { key: "e_open1", label: "Was there anything about the exam experience that surprised you (positively or negatively)?", placeholder: "Share your thoughts..." },
            { key: "e_open2", label: "Did the AI examiner ever misunderstand you or ask something confusing? Please describe.", placeholder: "Describe any miscommunications..." },
        ],
    },
    {
        id: "comfort",
        title: "Comfort Interacting with an AI Examiner",
        description: "Rate your agreement with each statement.",
        likert: [
            { key: "c1", text: "I felt comfortable speaking to an AI rather than a human examiner." },
            { key: "c2", text: "I felt less anxious during this oral exam compared to how I would feel with a human examiner." },
            { key: "c3", text: "The AI examiner felt conversational and natural to interact with." },
            { key: "c4", text: "I felt the AI was \"listening\" to what I was saying and responding appropriately." },
            { key: "c5", text: "I felt comfortable taking the exam at my own pace and on my own time." },
            { key: "c6", text: "I would be open to taking AI-administered oral exams in future courses." },
            { key: "c7", text: "I would prefer an AI-administered oral exam over a traditional written exam." },
        ] as LikertQuestion[],
        openEnded: [
            { key: "c_open1", label: "How did talking to an AI examiner compare to what you expected? What felt different from talking to a human?", placeholder: "Share your comparison..." },
            { key: "c_open2", label: "Was there anything that made you uncomfortable during the exam? If so, what?", placeholder: "Be honest — this helps us improve..." },
        ],
    },
    {
        id: "overall",
        title: "Overall",
        description: "Final thoughts on your experience.",
        likert: [
            { key: "o1", text: "Overall, I had a positive experience with the oral exam." },
            { key: "o2", text: "I would recommend this oral exam experience to a classmate." },
        ] as LikertQuestion[],
        openEnded: [
            { key: "o_open1", label: "What did you like most about the oral exam experience?", placeholder: "Best parts..." },
            { key: "o_open2", label: "What did you like least about the oral exam experience?", placeholder: "Least favorite parts..." },
            { key: "o_open3", label: "Is there anything else you'd like to share about this experience?", placeholder: "Any additional thoughts, suggestions, or feedback..." },
        ],
    },
];

const LIKERT_LABELS = [
    { value: 1, label: "Strongly Disagree" },
    { value: 2, label: "Disagree" },
    { value: 3, label: "Neutral" },
    { value: 4, label: "Agree" },
    { value: 5, label: "Strongly Agree" },
];

interface PostExamSurveyProps {
    assessmentId: string | null;
}

export default function PostExamSurvey({ assessmentId }: PostExamSurveyProps) {
    const router = useRouter();
    const [currentSection, setCurrentSection] = useState(0);
    const [responses, setResponses] = useState<Record<string, string | number>>({});
    const [consent, setConsent] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const section = SECTIONS[currentSection];
    const isLastSection = currentSection === SECTIONS.length - 1;
    const showConsent = isLastSection;

    const setLikert = (key: string, value: number) => {
        setResponses(prev => ({ ...prev, [key]: value }));
    };

    const setOpenEnded = (key: string, value: string) => {
        setResponses(prev => ({ ...prev, [key]: value }));
    };

    const isSectionComplete = () => {
        return section.likert.every(q => responses[q.key] !== undefined);
    };

    const handleSubmit = async () => {
        if (!consent) return;
        setSubmitting(true);

        try {
            await fetch("/api/survey", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assessmentId,
                    responses,
                    consent,
                }),
            });
        } catch (e) {
            console.error("Error submitting survey:", e);
        }

        setSubmitted(true);
        setTimeout(() => {
            router.push("/dashboard");
        }, 3000);
    };

    if (submitted) {
        return (
            <div className="flex min-h-screen bg-background items-center justify-center font-sans transition-colors duration-300 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10" />
                <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                    <div className="relative mb-8">
                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20">
                            <CheckCircle size={48} className="text-white fill-white/10" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-extrabold text-foreground tracking-tight mb-4">Thank You!</h1>
                    <p className="text-lg font-medium text-muted-foreground mb-10 leading-relaxed">
                        Your survey has been submitted and your exam is being graded. Redirecting you to the dashboard...
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
        <div className="flex min-h-screen bg-background font-sans transition-colors duration-300 relative overflow-hidden">
            {/* Background */}
            <div className="absolute top-0 inset-x-0 h-[400px] bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none -z-10" />

            <div className="w-full max-w-3xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-6">
                        COPILOT Research Lab
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-3">
                        Oral Exam Post-Survey
                    </h1>
                    <p className="text-muted-foreground font-medium">
                        Spring 2026 · Midterm Extra Credit
                    </p>
                </div>

                {/* Info callout */}
                <div className="p-5 rounded-xl bg-primary/5 border border-primary/15 mb-10">
                    <p className="text-sm text-foreground leading-relaxed">
                        Thank you for completing the oral exam! This short survey collects feedback on your experience. Your responses are <strong>anonymous</strong> and will be used to improve the oral exam process. Completing this survey is <strong>required</strong> to receive your extra credit.
                    </p>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 mb-8">
                    {SECTIONS.map((s, i) => (
                        <button
                            key={s.id}
                            onClick={() => i <= currentSection && setCurrentSection(i)}
                            className={`flex-1 h-2 rounded-full transition-all duration-300 ${i < currentSection
                                    ? "bg-primary"
                                    : i === currentSection
                                        ? "bg-primary/60"
                                        : "bg-muted"
                                }`}
                        />
                    ))}
                </div>

                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    Section {currentSection + 1} of {SECTIONS.length}
                </div>

                {/* Section Title */}
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground mb-1">
                    {section.title}
                </h2>
                <p className="text-sm text-muted-foreground mb-8 font-medium">
                    {section.description} <span className="text-muted-foreground/60">1 = Strongly Disagree, 5 = Strongly Agree</span>
                </p>

                {/* Likert Questions */}
                <div className="space-y-4 mb-10">
                    {section.likert.map((q, qIdx) => (
                        <div
                            key={q.key}
                            className="p-5 rounded-xl bg-background border border-border/60 shadow-sm hover:border-border transition-colors"
                        >
                            <p className="text-sm font-medium text-foreground mb-4 leading-relaxed">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-muted text-xs font-bold text-muted-foreground mr-2.5">
                                    {qIdx + 1}
                                </span>
                                {q.text}
                            </p>
                            <div className="flex items-center justify-between gap-2">
                                {LIKERT_LABELS.map(({ value, label }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setLikert(q.key, value)}
                                        className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border transition-all text-center ${responses[q.key] === value
                                                ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-105"
                                                : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted hover:border-border"
                                            }`}
                                    >
                                        <span className="text-lg font-bold">{value}</span>
                                        <span className="text-[9px] font-semibold uppercase tracking-wider leading-tight hidden sm:block">
                                            {label.split(" ").map((word, i) => (
                                                <span key={i}>{word}<br /></span>
                                            ))}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Open-ended Questions */}
                <div className="space-y-6 mb-10">
                    {section.openEnded.map((q) => (
                        <div key={q.key}>
                            <label className="block text-sm font-medium text-foreground mb-2 leading-relaxed">
                                {q.label}
                            </label>
                            <textarea
                                value={(responses[q.key] as string) || ""}
                                onChange={(e) => setOpenEnded(q.key, e.target.value)}
                                className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all h-24 resize-y leading-relaxed"
                                placeholder={q.placeholder}
                            />
                        </div>
                    ))}
                </div>

                {/* Research Consent — only on last section */}
                {showConsent && (
                    <div className="p-6 rounded-xl bg-muted/30 border border-border mb-10">
                        <h3 className="text-lg font-bold text-foreground mb-3">Research Data Consent</h3>
                        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                            Your survey responses and oral exam transcript may be used in <strong className="text-foreground">anonymized, aggregate form</strong> for research conducted by the COPILOT Research Lab. Your participation in the research component is voluntary.
                        </p>
                        <div className="space-y-3">
                            <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${consent === "yes" ? "bg-primary/5 border-primary/30" : "border-border/50 hover:bg-muted/50"
                                }`}>
                                <input
                                    type="radio"
                                    name="consent"
                                    value="yes"
                                    checked={consent === "yes"}
                                    onChange={() => setConsent("yes")}
                                    className="mt-0.5 accent-primary"
                                />
                                <span className="text-sm font-semibold text-foreground">
                                    I consent to my anonymized data being used for research analysis.
                                </span>
                            </label>
                            <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${consent === "no" ? "bg-primary/5 border-primary/30" : "border-border/50 hover:bg-muted/50"
                                }`}>
                                <input
                                    type="radio"
                                    name="consent"
                                    value="no"
                                    checked={consent === "no"}
                                    onChange={() => setConsent("no")}
                                    className="mt-0.5 accent-primary"
                                />
                                <div>
                                    <span className="text-sm font-semibold text-foreground">
                                        I do <strong>not</strong> consent to my data being used for research analysis.
                                    </span>
                                    <span className="block text-xs text-muted-foreground mt-1">
                                        Your extra credit will still be awarded.
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between gap-4 pb-12">
                    <button
                        type="button"
                        onClick={() => setCurrentSection(prev => Math.max(0, prev - 1))}
                        disabled={currentSection === 0}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold transition-all border border-border disabled:opacity-30 disabled:pointer-events-none"
                    >
                        <ChevronLeft size={18} /> Back
                    </button>

                    {isLastSection ? (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!isSectionComplete() || !consent || submitting}
                            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 text-white font-bold transition-all shadow-md shadow-primary/20 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {submitting ? (
                                <><Loader2 size={18} className="animate-spin" /> Submitting...</>
                            ) : (
                                "Submit Survey"
                            )}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setCurrentSection(prev => Math.min(SECTIONS.length - 1, prev + 1))}
                            disabled={!isSectionComplete()}
                            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 text-white font-bold transition-all shadow-md shadow-primary/20 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                        >
                            Next Section <ChevronRight size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
