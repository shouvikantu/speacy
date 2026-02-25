import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { CheckCircle, AlertCircle, TrendingUp, ArrowRight, RotateCcw, Home, Sparkles } from "lucide-react";
import clsx from "clsx";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: assessment } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", id)
        .single();

    if (!assessment) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background text-foreground transition-colors duration-300">
                <div className="text-center animate-fade-in-up">
                    <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-muted-foreground to-border mb-4">404</h1>
                    <p className="text-lg font-medium text-muted-foreground mb-8">Assessment not found</p>
                    <Link href="/dashboard" className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:-translate-y-0.5 transition-transform shadow-md shadow-primary/20">
                        Return Home
                    </Link>
                </div>
            </div>
        );
    }

    let feedbackData = null;
    try {
        feedbackData = JSON.parse(assessment.feedback);
    } catch (e) {
        console.error("Error parsing feedback JSON", e);
    }

    const score = assessment.total_score || 0;
    let gradeColor = "text-muted-foreground";
    let gradeText = "Pending";
    let ringColor = "text-muted border-muted";
    let gradeBg = "bg-muted";

    if (score >= 90) {
        gradeColor = "text-emerald-500";
        gradeText = "Excellent";
        ringColor = "text-emerald-500";
        gradeBg = "bg-emerald-500/10";
    }
    else if (score >= 80) {
        gradeColor = "text-blue-500";
        gradeText = "Great Job";
        ringColor = "text-blue-500";
        gradeBg = "bg-blue-500/10";
    }
    else if (score >= 70) {
        gradeColor = "text-yellow-500";
        gradeText = "Good";
        ringColor = "text-yellow-500";
        gradeBg = "bg-yellow-500/10";
    }
    else {
        gradeColor = "text-red-500";
        gradeText = "Needs Practice";
        ringColor = "text-red-500";
        gradeBg = "bg-red-500/10";
    }

    return (
        <div className="flex min-h-screen flex-col items-center bg-background text-foreground relative transition-colors duration-300 font-sans p-6 overflow-x-hidden">

            {/* Subtle Abstract Background */}
            <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />

            {/* Minimalist Top Nav for returning home */}
            <div className="w-full max-w-4xl flex justify-between items-center z-20 py-6 mb-4 border-b border-border/50">
                <ThemeToggle />
                <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group">
                    <Home size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                    Dashboard
                </Link>
            </div>

            <main className="w-full max-w-4xl relative z-10 flex flex-col gap-12 pb-20">
                {/* Header Section */}
                <div className="text-center space-y-4 animate-fade-in-up">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-widest uppercase mb-2">
                        <Sparkles size={14} />
                        Assessment Complete
                    </div>
                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground">
                        {assessment.topic}
                    </h1>
                </div>

                {/* Score Section */}
                <div className="flex justify-center my-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <div className="relative w-72 h-72 flex items-center justify-center p-4">
                        {/* Soft background circle */}
                        <div className="absolute inset-0 rounded-full bg-muted/50 border border-border shadow-inner" />

                        {/* Circular Progress (CSS only) */}
                        <svg className="w-full h-full transform -rotate-90 relative z-10 drop-shadow-md">
                            <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-border" />
                            <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent"
                                className={clsx(ringColor, "transition-all duration-1000 ease-out")}
                                strokeDasharray={2 * Math.PI * 120}
                                strokeDashoffset={2 * Math.PI * 120 * (1 - score / 100)}
                                strokeLinecap="round"
                            />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                            <span className={clsx("text-7xl font-extrabold tracking-tighter drop-shadow-sm", gradeColor)}>{score}</span>
                            <div className={clsx("mt-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border shadow-sm", gradeColor, gradeBg, `border-${gradeColor.split('-')[1]}-500/20`)}>
                                {gradeText}
                            </div>
                        </div>
                    </div>
                </div>

                {feedbackData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>

                        {/* General Feedback */}
                        <div className="md:col-span-2 premium-card p-8 md:p-10 group relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-indigo-400 opacity-80" />
                            <h3 className="text-2xl font-extrabold mb-6 flex items-center gap-3 text-foreground tracking-tight">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <TrendingUp size={20} />
                                </div>
                                AI Evaluation
                            </h3>
                            <p className="text-muted-foreground leading-relaxed text-lg font-medium">
                                {feedbackData.feedback || "No general feedback available."}
                            </p>
                        </div>

                        {/* Strengths */}
                        <div className="premium-card p-8 flex flex-col h-full border-t-4 border-t-emerald-500">
                            <h4 className="flex items-center text-emerald-600 dark:text-emerald-500 font-extrabold mb-6 gap-3 tracking-tight text-xl">
                                <div className="p-2 rounded-lg bg-emerald-500/10">
                                    <CheckCircle size={24} />
                                </div>
                                Strengths
                            </h4>
                            <ul className="space-y-5 flex-1">
                                {feedbackData.strengths?.map((item: string, i: number) => (
                                    <li key={i} className="flex gap-4 text-foreground text-[15px] leading-relaxed font-medium items-start">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Weaknesses */}
                        <div className="premium-card p-8 flex flex-col h-full border-t-4 border-t-red-500">
                            <h4 className="flex items-center text-red-600 dark:text-red-500 font-extrabold mb-6 gap-3 tracking-tight text-xl">
                                <div className="p-2 rounded-lg bg-red-500/10">
                                    <AlertCircle size={24} />
                                </div>
                                Areas to Improve
                            </h4>
                            <ul className="space-y-5 flex-1">
                                {feedbackData.weaknesses?.map((item: string, i: number) => (
                                    <li key={i} className="flex gap-4 text-foreground text-[15px] leading-relaxed font-medium items-start">
                                        <div className="w-2 h-2 rounded-full bg-red-500 mt-2 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Nuances */}
                        {feedbackData.nuances && feedbackData.nuances.length > 0 && (
                            <div className="md:col-span-2 premium-card p-8">
                                <h4 className="flex items-center text-primary font-extrabold mb-8 gap-3 tracking-tight text-xl">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <Sparkles size={24} />
                                    </div>
                                    Nuances & Details
                                </h4>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {feedbackData.nuances.map((item: string, i: number) => (
                                        <li key={i} className="flex gap-4 text-muted-foreground text-[15px] leading-relaxed bg-muted/50 border border-border/50 p-5 rounded-xl font-medium shadow-sm hover:shadow-md transition-shadow">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0 shadow-[0_0_8px_rgba(79,70,229,0.6)]" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Detailed Metrics */}
                        {(feedbackData.fluency_score !== undefined || feedbackData.pacing_score !== undefined) && (
                            <div className="md:col-span-2 premium-card p-8 border-t-4 border-t-blue-500">
                                <h3 className="text-2xl font-extrabold mb-8 flex items-center gap-3 text-foreground tracking-tight">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                        <TrendingUp size={24} />
                                    </div>
                                    Detailed Analysis
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Fluency Score */}
                                    {feedbackData.fluency_score !== undefined && (
                                        <div className="bg-background rounded-2xl p-6 border border-border shadow-sm flex flex-col">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.2em]">Fluency</span>
                                                <span className={`text-2xl font-black tracking-tight ${feedbackData.fluency_score >= 80 ? 'text-emerald-500' : 'text-foreground'}`}>
                                                    {feedbackData.fluency_score}<span className="text-sm text-muted-foreground">/100</span>
                                                </span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-6">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${feedbackData.fluency_score >= 80 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`}
                                                    style={{ width: `${feedbackData.fluency_score}%` }}
                                                />
                                            </div>
                                            <p className="text-xs font-semibold text-muted-foreground mt-auto leading-relaxed uppercase tracking-wider">
                                                Based on flow, lack of filler words, & structure.
                                            </p>
                                        </div>
                                    )}

                                    {/* Pacing Score */}
                                    {feedbackData.pacing_score !== undefined && (
                                        <div className="bg-background rounded-2xl p-6 border border-border shadow-sm flex flex-col">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.2em]">Pacing</span>
                                                <span className={`text-2xl font-black tracking-tight ${feedbackData.pacing_score >= 80 ? 'text-emerald-500' : 'text-foreground'}`}>
                                                    {feedbackData.pacing_score}<span className="text-sm text-muted-foreground">/100</span>
                                                </span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-6">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${feedbackData.pacing_score >= 80 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`}
                                                    style={{ width: `${feedbackData.pacing_score}%` }}
                                                />
                                            </div>
                                            <p className="text-xs font-semibold text-muted-foreground mt-auto leading-relaxed uppercase tracking-wider">
                                                Based on response latency & rhythm.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col md:flex-row gap-4 justify-center mt-8 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                    <Link
                        href="/dashboard"
                        className="px-8 py-4 rounded-xl border border-border bg-background hover:bg-muted font-bold text-foreground transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md active:-translate-y-0.5"
                    >
                        <Home size={20} className="text-muted-foreground" />
                        <span>Return to Dashboard</span>
                    </Link>
                    <Link
                        href="/assessment"
                        className="px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 text-white font-bold transition-all shadow-md shadow-primary/20 hover:shadow-lg flex items-center justify-center gap-3 active:-translate-y-0.5"
                    >
                        <RotateCcw size={20} />
                        <span>Try Another Topic</span>
                        <ArrowRight size={20} className="opacity-70" />
                    </Link>
                </div>
            </main>
        </div>
    );
}
