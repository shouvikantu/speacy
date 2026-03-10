"use client";

import { useState, useEffect } from "react";
import { X, Loader2, MessageSquareText, ClipboardList } from "lucide-react";

// Mirror the survey structure from PostExamSurvey for label mapping
const QUESTION_MAP: Record<string, string> = {
    // Usability
    u1: "The login process (Google sign-in and access code) was straightforward.",
    u2: "The exam interface was easy to navigate and understand.",
    u3: "Setting up microphone access was easy.",
    u4: "The exam prompt and instructions were clear.",
    u5: "I did not experience any significant technical issues during the exam.",
    u6: "The system accurately captured what I was saying.",
    u_open1: "Did you encounter any technical problems? If so, please describe them.",
    u_open2: "What would you change about the interface or setup process?",
    // Experience
    e1: "The questions asked by the AI examiner were relevant to the course material.",
    e2: "The AI examiner's follow-up questions helped me clarify or expand on my answers.",
    e3: "I felt the exam gave me a fair opportunity to demonstrate my knowledge.",
    e4: "The pacing of the exam felt appropriate (not too fast, not too slow).",
    e5: "The difficulty of the exam matched what I expected based on the course.",
    e6: "I felt I could express my understanding more effectively verbally than in a written exam.",
    e_open1: "Was there anything about the exam experience that surprised you?",
    e_open2: "Did the AI examiner ever misunderstand you or ask something confusing?",
    // Comfort
    c1: "I felt comfortable speaking to an AI rather than a human examiner.",
    c2: "I felt less anxious during this oral exam compared to a human examiner.",
    c3: "The AI examiner felt conversational and natural to interact with.",
    c4: "I felt the AI was \"listening\" to what I was saying and responding appropriately.",
    c5: "I felt comfortable taking the exam at my own pace and on my own time.",
    c6: "I would be open to taking AI-administered oral exams in future courses.",
    c7: "I would prefer an AI-administered oral exam over a traditional written exam.",
    c_open1: "How did talking to an AI examiner compare to what you expected?",
    c_open2: "Was there anything that made you uncomfortable during the exam?",
    // Overall
    o1: "Overall, I had a positive experience with the oral exam.",
    o2: "I would recommend this oral exam experience to a classmate.",
    o_open1: "What did you like most about the oral exam experience?",
    o_open2: "What did you like least about the oral exam experience?",
    o_open3: "Is there anything else you'd like to share about this experience?",
};

const LIKERT_LABELS: Record<number, string> = {
    1: "Strongly Disagree",
    2: "Disagree",
    3: "Neutral",
    4: "Agree",
    5: "Strongly Agree",
};

const SECTION_ORDER = [
    { id: "u", title: "Usability", keys: ["u1", "u2", "u3", "u4", "u5", "u6"], openKeys: ["u_open1", "u_open2"] },
    { id: "e", title: "Exam Experience", keys: ["e1", "e2", "e3", "e4", "e5", "e6"], openKeys: ["e_open1", "e_open2"] },
    { id: "c", title: "Comfort with AI", keys: ["c1", "c2", "c3", "c4", "c5", "c6", "c7"], openKeys: ["c_open1", "c_open2"] },
    { id: "o", title: "Overall", keys: ["o1", "o2"], openKeys: ["o_open1", "o_open2", "o_open3"] },
];

interface SurveyResponseModalProps {
    assessmentId: string;
    onClose: () => void;
}

export default function SurveyResponseModal({ assessmentId, onClose }: SurveyResponseModalProps) {
    const [data, setData] = useState<Record<string, string | number> | null>(null);
    const [consent, setConsent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch on mount
    useEffect(() => {
        fetch(`/api/survey/responses?assessment_id=${assessmentId}`)
            .then(res => res.json())
            .then(result => {
                if (result.data) {
                    setData(result.data.responses);
                    setConsent(result.data.consent);
                } else {
                    setError("No survey response found.");
                }
            })
            .catch(() => setError("Failed to load survey response."))
            .finally(() => setLoading(false));
    }, [assessmentId]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-background border border-border rounded-2xl shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <ClipboardList size={18} className="text-primary" />
                        </div>
                        <h2 className="text-lg font-bold tracking-tight text-foreground">Survey Response</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    {loading && (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={24} className="animate-spin text-primary" />
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-16 text-muted-foreground font-medium">
                            {error}
                        </div>
                    )}

                    {data && (
                        <div className="space-y-8">
                            {SECTION_ORDER.map((section) => (
                                <div key={section.id}>
                                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">
                                        {section.title}
                                    </h3>

                                    {/* Likert responses */}
                                    <div className="space-y-3 mb-4">
                                        {section.keys.map((key) => {
                                            const value = data[key] as number;
                                            return (
                                                <div key={key} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                                                    <div className="shrink-0 mt-0.5">
                                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm border shadow-sm ${value >= 4
                                                            ? "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400"
                                                            : value === 3
                                                                ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400"
                                                                : value >= 1
                                                                    ? "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400"
                                                                    : "bg-muted text-muted-foreground border-border"
                                                            }`}>
                                                            {value ?? "—"}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-foreground leading-relaxed">{QUESTION_MAP[key] || key}</p>
                                                        {value && (
                                                            <p className="text-xs text-muted-foreground mt-0.5">{LIKERT_LABELS[value]}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Open-ended responses */}
                                    {section.openKeys.map((key) => {
                                        const value = data[key] as string;
                                        if (!value) return null;
                                        return (
                                            <div key={key} className="mb-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                                                <div className="flex items-start gap-2 mb-1.5">
                                                    <MessageSquareText size={14} className="text-primary mt-0.5 shrink-0" />
                                                    <p className="text-xs font-semibold text-muted-foreground">{QUESTION_MAP[key] || key}</p>
                                                </div>
                                                <p className="text-sm text-foreground leading-relaxed pl-[22px]">{value}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}

                            {/* Consent */}
                            <div className="pt-4 border-t border-border">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Research Consent</p>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${consent === "yes"
                                    ? "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400"
                                    : "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400"
                                    }`}>
                                    {consent === "yes" ? "Consented" : "Did not consent"}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
