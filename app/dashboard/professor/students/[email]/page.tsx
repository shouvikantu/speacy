import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, TrendingUp, FileText, Users } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import ReevaluateButton from "@/components/ReevaluateButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function StudentDetailPage({ params }: { params: Promise<{ email: string }> }) {
    const { email: encodedEmail } = await params;
    const studentEmail = decodeURIComponent(encodedEmail);

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    // Role check
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'professor') {
        return redirect("/dashboard");
    }

    // Fetch all assessments for this student
    const { data: assessments } = await supabase
        .from("assessments")
        .select("*")
        .eq("student_name", studentEmail)
        .order("created_at", { ascending: false });

    const totalExams = assessments?.length || 0;
    const gradedExams = assessments?.filter(a => a.status === 'graded' || a.status === 'completed') || [];
    const avgScore = gradedExams.length > 0
        ? Math.round(gradedExams.reduce((acc, curr) => acc + (curr.total_score || 0), 0) / gradedExams.length)
        : 0;

    return (
        <div className="flex min-h-screen flex-col p-6 bg-background text-foreground font-sans relative transition-colors duration-300">
            <main className="flex-1 w-full max-w-6xl mx-auto z-10 flex flex-col gap-10 mt-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-6 border-b border-border/50">
                    <div>
                        <Link
                            href="/dashboard/professor"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors mb-4 group"
                        >
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Back to Dashboard
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-foreground">
                            Student Profile
                        </h1>
                        <p className="text-muted-foreground font-medium flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-muted to-border flex items-center justify-center text-foreground font-bold text-[10px] shadow-sm border border-background">
                                {studentEmail.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-foreground tracking-tight">{studentEmail}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-background border border-border/50 shadow-sm p-1 rounded-full flex items-center justify-center">
                            <ThemeToggle />
                        </div>
                        <LogoutButton className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 font-semibold rounded-full shadow-sm" />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="premium-card p-6 flex flex-col relative overflow-hidden group">
                        <div className="flex items-center gap-4 mb-4 text-muted-foreground group-hover:text-primary transition-colors">
                            <FileText size={24} />
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">Total Exams</p>
                            </div>
                        </div>
                        <h3 className="text-4xl font-extrabold tracking-tight text-foreground">{totalExams}</h3>
                    </div>

                    <div className="premium-card p-6 flex flex-col relative overflow-hidden group">
                        <div className="flex items-center gap-4 mb-4 text-muted-foreground group-hover:text-primary transition-colors">
                            <Calendar size={24} />
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">Graded</p>
                            </div>
                        </div>
                        <h3 className="text-4xl font-extrabold tracking-tight text-foreground">{gradedExams.length}</h3>
                    </div>

                    <div className="premium-card p-6 flex flex-col relative overflow-hidden group">
                        <div className="flex items-center gap-4 mb-4 text-muted-foreground group-hover:text-primary transition-colors">
                            <TrendingUp size={24} />
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">Average Score</p>
                            </div>
                        </div>
                        <h3 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">{avgScore}%</h3>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden mt-auto">
                            <div className="bg-primary h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${avgScore}%` }} />
                        </div>
                    </div>
                </div>

                {/* Exams Table */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground tracking-tight">
                            <FileText size={20} className="text-primary" />
                            Exam History
                        </h2>
                    </div>

                    <div className="premium-card overflow-hidden">
                        {assessments && assessments.length > 0 ? (
                            <div className="w-full overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead>
                                        <tr className="border-b border-border/50 text-[10px] uppercase tracking-widest text-muted-foreground bg-muted/30">
                                            <th className="px-6 py-4 font-bold">Topic</th>
                                            <th className="px-6 py-4 font-bold text-center">Score</th>
                                            <th className="px-6 py-4 font-bold text-center">Status</th>
                                            <th className="px-6 py-4 font-bold">Date</th>
                                            <th className="px-6 py-4 font-bold text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {assessments.map((assessment) => (
                                            <tr key={assessment.id} className="hover:bg-muted/30 transition-colors group">
                                                {/* Topic */}
                                                <td className="px-6 py-5">
                                                    <Link
                                                        href={`/results/${assessment.id}`}
                                                        className="font-bold text-foreground text-base tracking-tight group-hover:text-primary transition-colors"
                                                    >
                                                        {assessment.topic}
                                                    </Link>
                                                </td>

                                                {/* Score */}
                                                <td className="px-6 py-5">
                                                    <div className="flex justify-center">
                                                        <span className={`
                                                            inline-flex items-center justify-center w-12 h-10 rounded-xl font-bold text-lg border shadow-sm
                                                            ${assessment.status === 'graded'
                                                                ? (assessment.total_score >= 80
                                                                    ? 'bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400'
                                                                    : assessment.total_score >= 60
                                                                        ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400'
                                                                        : 'bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400')
                                                                : 'bg-muted text-muted-foreground border-border'
                                                            }
                                                        `}>
                                                            {assessment.total_score ?? '-'}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td className="px-6 py-5">
                                                    <div className="flex justify-center">
                                                        <span className={`
                                                            px-2.5 py-1 rounded-full text-xs font-bold capitalize tracking-wide shadow-sm
                                                            ${assessment.status === 'graded'
                                                                ? 'bg-green-500/10 text-green-700 border border-green-500/20 dark:text-green-400'
                                                                : assessment.status === 'completed'
                                                                    ? 'bg-blue-500/10 text-blue-700 border border-blue-500/20 dark:text-blue-400'
                                                                    : 'bg-muted text-muted-foreground border-border border'
                                                            }
                                                        `}>
                                                            {assessment.status}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Date */}
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                                        <Calendar size={14} className="text-primary/70" />
                                                        {new Date(assessment.created_at).toLocaleDateString()}
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-6 py-5">
                                                    <div className="flex justify-center">
                                                        <ReevaluateButton assessmentId={assessment.id} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <FileText size={20} className="text-muted-foreground" />
                                </div>
                                <p className="font-medium">This student has no assessments yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
