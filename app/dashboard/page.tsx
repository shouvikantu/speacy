import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Mic, Code, TrendingUp, History, Award, Calendar, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    // Check role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role === 'professor') {
        return redirect("/dashboard/professor");
    }

    // Fetch assessments for this user
    const { data: assessments } = await supabase
        .from("assessments")
        .select("*")
        .eq("student_name", user.email)
        .order("created_at", { ascending: false });

    // Fetch available assignments
    const { data: availableAssignments } = await supabase
        .from("assignments")
        .select("*")
        .order("created_at", { ascending: false });

    // Calculate Stats
    const totalAssessments = assessments?.length || 0;
    const completedAssessments = assessments?.filter(a => a.status === 'graded' || a.status === 'completed') || [];
    const averageScore = completedAssessments.length > 0
        ? Math.round(completedAssessments.reduce((acc, curr) => acc + (curr.total_score || 0), 0) / completedAssessments.length)
        : 0;

    // Get latest topic or default
    const latestTopic = assessments && assessments.length > 0 ? assessments[0].topic : "None yet";

    return (
        <div className="flex min-h-screen flex-col p-6 bg-background text-foreground relative font-sans transition-colors duration-300">
            <main className="flex-1 w-full max-w-6xl mx-auto z-10 flex flex-col gap-10 mt-4">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-6 border-b border-border/50">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-foreground">
                            Dashboard
                        </h1>
                        <p className="text-muted-foreground font-medium">
                            Welcome back, <span className="text-foreground">{user.email}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-4 py-2 rounded-full bg-muted border border-border flex items-center gap-2 text-sm font-semibold text-muted-foreground shadow-sm">
                            <Zap size={14} className="text-foreground" />
                            <span className="text-foreground">Level 1</span>
                        </div>
                        <div className="bg-background border border-border/50 shadow-sm p-1 rounded-full flex items-center justify-center">
                            <ThemeToggle />
                        </div>
                        <LogoutButton className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 font-semibold rounded-full" />
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="premium-card p-6 flex flex-col relative overflow-hidden group">
                        <div className="text-muted-foreground mb-4 group-hover:text-primary transition-colors">
                            <TrendingUp size={24} />
                        </div>
                        <div className="mt-auto relative z-10">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Avg Score</p>
                            <h3 className="text-4xl font-extrabold text-foreground tracking-tight">{averageScore}%</h3>
                            <div className="mt-3 text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
                                <span>Based on {completedAssessments.length} exams</span>
                            </div>
                        </div>
                    </div>

                    <div className="premium-card p-6 flex flex-col relative overflow-hidden group">
                        <div className="text-muted-foreground mb-4 group-hover:text-primary transition-colors">
                            <History size={24} />
                        </div>
                        <div className="mt-auto relative z-10">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Exams</p>
                            <h3 className="text-4xl font-extrabold text-foreground tracking-tight">{totalAssessments}</h3>
                            <div className="mt-3 text-sm text-muted-foreground flex items-center gap-1.5 font-medium truncate">
                                <span>Latest: {latestTopic}</span>
                            </div>
                        </div>
                    </div>

                    <Link href="/assessment" className="premium-card bg-gradient-to-br from-primary to-indigo-600 text-white p-6 shadow-md shadow-primary/20 group hover:-translate-y-1 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between items-start border-none">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                            <Mic size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold tracking-tight">Start New Exam</h3>
                            <p className="text-sm font-medium text-white/80 mt-1">Test your knowledge now</p>
                        </div>
                    </Link>
                </div>

                {/* Main Content Split */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Left Column: Recent History & Assignments */}
                    <div className="lg:col-span-2 flex flex-col gap-10">

                        {/* Available Assignments */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between pb-2 border-b border-border/50">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground tracking-tight">
                                    <Award size={20} className="text-primary" />
                                    Available Assignments
                                </h2>
                            </div>
                            <div className="premium-card overflow-hidden">
                                {availableAssignments && availableAssignments.length > 0 ? (
                                    <div className="divide-y divide-border/50">
                                        {availableAssignments.map((assignment) => (
                                            <div key={assignment.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-muted/30 transition-colors group gap-4 sm:gap-0">
                                                <div className="pr-6">
                                                    <h4 className="font-bold text-foreground text-lg tracking-tight mb-1 group-hover:text-primary transition-colors">{assignment.title}</h4>
                                                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                                                        <span className="bg-muted px-2 py-0.5 rounded text-foreground">{assignment.topic}</span>
                                                        <span className="w-1 h-1 rounded-full bg-border" />
                                                        <span>{assignment.difficulty_level}</span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{assignment.description}</p>
                                                </div>
                                                <Link
                                                    href={`/assessment?assignmentId=${assignment.id}`}
                                                    className="px-5 py-2.5 rounded-full shadow-sm bg-primary text-white font-semibold hover:bg-indigo-600 transition-colors flex items-center justify-center sm:justify-start gap-2 whitespace-nowrap active:scale-95"
                                                >
                                                    Start <ArrowRight size={16} />
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-muted-foreground">
                                        <p className="font-medium text-foreground">No assignments available at the moment.</p>
                                        <p className="text-sm mt-2">Check back later or start a random practice exam.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent History */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between pb-2 border-b border-border/50">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground tracking-tight">
                                    <History size={20} className="text-primary" />
                                    Recent History
                                </h2>
                            </div>

                            <div className="premium-card overflow-hidden">
                                {assessments && assessments.length > 0 ? (
                                    <div className="divide-y divide-border/50">
                                        {assessments.map((assessment) => (
                                            <Link
                                                href={`/results/${assessment.id}`}
                                                key={assessment.id}
                                                className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors group"
                                            >
                                                <div className="flex items-center gap-5">
                                                    <div className={`col-span-1 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border relative overflow-hidden
                                                        ${assessment.status === 'graded'
                                                            ? (assessment.total_score >= 80 ? 'bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400' : 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400')
                                                            : 'bg-muted text-foreground border-border'
                                                        }`}
                                                    >
                                                        {assessment.total_score || '-'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-foreground tracking-tight mb-1 group-hover:text-primary transition-colors">
                                                            {assessment.topic}
                                                        </h4>
                                                        <div className="flex items-center gap-3 text-[13px] font-medium text-muted-foreground">
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar size={14} />
                                                                <span>{new Date(assessment.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                            <span className="w-1 h-1 rounded-full bg-border" />
                                                            <span className="capitalize px-1.5 py-0.5 rounded bg-muted text-[11px] font-bold tracking-wider">{assessment.status}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <ArrowRight size={20} className="text-muted-foreground group-hover:text-primary transition-colors mr-2" />
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-muted-foreground">
                                        <p className="font-medium">No assessments yet. Start one above!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Suggested Actions */}
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-4">
                            <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight text-foreground pb-2 border-b border-border/50">
                                <Award size={20} className="text-primary" />
                                Achievements
                            </h2>

                            <div className="premium-card p-5 flex flex-col gap-4">
                                <div className="flex items-center gap-4 p-3 rounded-xl bg-background border border-border shadow-sm">
                                    <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center text-background font-bold text-sm shadow-md">
                                        1st
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="font-bold text-foreground tracking-tight">First Steps</h5>
                                        <p className="text-[13px] text-muted-foreground font-medium mt-0.5">Complete your first exam</p>
                                    </div>
                                    {completedAssessments.length > 0 ? (
                                        <span className="font-bold text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Done</span>
                                    ) : (
                                        <span className="text-muted-foreground font-medium text-xs bg-muted px-2 py-1 rounded-full">Locked</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 p-3 rounded-xl bg-background border border-border shadow-sm opacity-60 grayscale filter">
                                    <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
                                        <Code size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="font-bold text-foreground tracking-tight">Code Master</h5>
                                        <p className="text-[13px] text-muted-foreground font-medium mt-0.5">Score 90% on SQL</p>
                                    </div>
                                    <span className="text-muted-foreground font-medium text-xs bg-muted px-2 py-1 rounded-full">Locked</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-2 p-6 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 shadow-sm relative overflow-hidden group">
                            {/* Decorative glow */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl group-hover:bg-indigo-500/30 transition-colors pointer-events-none" />
                            <h4 className="font-bold tracking-tight text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2 relative z-10">
                                <TrendingUp size={16} /> Pro Tip
                            </h4>
                            <p className="text-[13px] text-muted-foreground leading-relaxed font-medium relative z-10">
                                Speaking clearly and using technical terminology increases your score significantly. Try to elaborate on the &quot;Why&quot; and not just the &quot;How&quot;.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
