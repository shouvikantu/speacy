import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Users, BookOpen, Plus, TrendingUp, Zap, FileText, UserCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import ExamCreationForm from "./ExamCreationForm";
import DeleteAssignmentButton from "./DeleteAssignmentButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function ProfessorDashboard() {
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

    // Fetch Created Assignments
    const { data: assignments } = await supabase
        .from("assignments")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

    // Fetch Class Stats
    const { data: allAssessments } = await supabase
        .from("assessments")
        .select("total_score, status, topic, student_name")
        .order("created_at", { ascending: false });

    const totalStudents = new Set(allAssessments?.map((a) => a.student_name)).size || 0;
    const totalExamsTaken = allAssessments?.length || 0;
    const completedExams = allAssessments?.filter((a) => a.status === 'graded' || a.status === 'completed') || [];
    const avgScore = completedExams.length > 0
        ? Math.round(completedExams.reduce((acc, curr) => acc + (curr.total_score || 0), 0) / completedExams.length)
        : 0;

    // Build student list with aggregated stats
    const studentMap = new Map<string, { examCount: number; totalScore: number; gradedCount: number }>();
    allAssessments?.forEach((a) => {
        if (!a.student_name) return;
        const existing = studentMap.get(a.student_name) || { examCount: 0, totalScore: 0, gradedCount: 0 };
        existing.examCount++;
        if (a.status === 'graded' || a.status === 'completed') {
            existing.totalScore += a.total_score || 0;
            existing.gradedCount++;
        }
        studentMap.set(a.student_name, existing);
    });
    const students = Array.from(studentMap.entries()).map(([email, stats]) => ({
        email,
        examCount: stats.examCount,
        avgScore: stats.gradedCount > 0 ? Math.round(stats.totalScore / stats.gradedCount) : 0,
    }));

    return (
        <div className="flex min-h-screen flex-col p-6 bg-background text-foreground font-sans relative transition-colors duration-300">
            <main className="flex-1 w-full max-w-7xl mx-auto z-10 flex flex-col gap-10 mt-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-6 border-b border-border/50">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-foreground">
                            Professor Dashboard
                        </h1>
                        <p className="text-muted-foreground font-medium">
                            Manage your class, create exams, and track student performance.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-4 py-2 rounded-full bg-muted border border-border flex items-center gap-2 text-sm font-semibold text-muted-foreground shadow-sm">
                            <Users size={16} className="text-foreground" />
                            <span className="text-foreground">{totalStudents} Active Students</span>
                        </div>
                        <div className="bg-background border border-border/50 shadow-sm p-1 rounded-full flex items-center justify-center">
                            <ThemeToggle />
                        </div>
                        <LogoutButton className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 font-semibold rounded-full" />
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="premium-card p-6 flex flex-col relative overflow-hidden group">
                        <div className="flex items-center gap-4 mb-4 text-muted-foreground group-hover:text-primary transition-colors">
                            <TrendingUp size={24} />
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">Class Average</p>
                            </div>
                        </div>
                        <h3 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">{avgScore}%</h3>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden mt-auto">
                            <div className="bg-primary h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${avgScore}%` }} />
                        </div>
                    </div>

                    <div className="premium-card p-6 flex flex-col relative overflow-hidden group">
                        <div className="flex items-center gap-4 mb-4 text-muted-foreground group-hover:text-primary transition-colors">
                            <FileText size={24} />
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">Total Exams</p>
                            </div>
                        </div>
                        <h3 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">{totalExamsTaken}</h3>
                        <p className="text-sm font-medium text-muted-foreground mt-auto">
                            across {allAssessments?.length || 0} assignments
                        </p>
                    </div>

                    <div className="premium-card p-6 flex flex-col relative overflow-hidden group">
                        <div className="flex items-center gap-4 mb-4 text-muted-foreground group-hover:text-primary transition-colors">
                            <Zap size={24} />
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">Top Topic</p>
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight text-foreground truncate max-w-full block mb-2">
                            {allAssessments && allAssessments.length > 0 ? allAssessments[0].topic : 'N/A'}
                        </h3>
                        <p className="text-sm font-medium text-muted-foreground mt-auto">Most attempted subject</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Left: Assignments List */}
                    <div className="flex flex-col gap-10">
                        {/* Assignments Section */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between pb-2 border-b border-border/50">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground tracking-tight">
                                    <BookOpen size={20} className="text-primary" />
                                    Assignments
                                </h2>
                            </div>

                            <div className="premium-card overflow-hidden">
                                {assignments && assignments.length > 0 ? (
                                    <div className="divide-y divide-border/50">
                                        {assignments.map((assignment) => (
                                            <div key={assignment.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-muted/30 transition-colors gap-4 sm:gap-0">
                                                <div>
                                                    <h4 className="font-bold text-foreground text-lg tracking-tight mb-1">{assignment.title}</h4>
                                                    <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                                                        <span className="bg-muted px-2 py-0.5 rounded text-foreground">{assignment.topic}</span>
                                                        <span className="w-1 h-1 rounded-full bg-border" />
                                                        <span>{assignment.difficulty_level}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 sm:justify-end">
                                                    <div className="text-left sm:text-right">
                                                        <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Created</span>
                                                        <span className="text-sm font-medium text-foreground">{new Date(assignment.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <DeleteAssignmentButton assignmentId={assignment.id} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-muted-foreground font-medium flex flex-col items-center justify-center h-full">
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                            <BookOpen size={20} className="text-muted-foreground" />
                                        </div>
                                        <p>No assignments created yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Students Section */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between pb-2 border-b border-border/50">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground tracking-tight">
                                    <UserCircle size={20} className="text-primary" />
                                    Students
                                </h2>
                                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full shadow-sm">{students.length} Enrolled</span>
                            </div>

                            <div className="premium-card overflow-hidden">
                                {students.length > 0 ? (
                                    <div className="divide-y divide-border/50">
                                        {students.map((student) => (
                                            <Link
                                                key={student.email}
                                                href={`/dashboard/professor/students/${encodeURIComponent(student.email)}`}
                                                className="p-5 flex items-center justify-between hover:bg-muted/30 transition-colors group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-muted to-border flex items-center justify-center text-foreground font-bold text-lg shadow-sm border border-background">
                                                        {student.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-foreground tracking-tight mb-0.5 group-hover:text-primary transition-colors">{student.email}</h4>
                                                        <p className="text-[13px] font-medium text-muted-foreground">{student.examCount} exam{student.examCount !== 1 ? 's' : ''} total</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right hidden sm:block">
                                                        <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Avg Score</span>
                                                        <span className={`text-xl font-black ${student.avgScore >= 80 ? 'text-green-600 dark:text-green-400' :
                                                            student.avgScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                                                                student.avgScore > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                                                            }`}>
                                                            {student.avgScore > 0 ? `${student.avgScore}%` : '-'}
                                                        </span>
                                                    </div>
                                                    <ArrowRight size={20} className="text-muted-foreground group-hover:text-primary transition-colors mr-2 transform group-hover:translate-x-1" />
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-muted-foreground font-medium flex flex-col items-center justify-center h-full">
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                            <Users size={20} className="text-muted-foreground" />
                                        </div>
                                        <p>No students have taken exams yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Create Assignment Form */}
                    <div className="flex flex-col gap-4">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground tracking-tight pb-2 border-b border-border/50">
                            <Plus size={20} className="text-primary" />
                            Create New Exam
                        </h2>

                        <div className="premium-card p-8 border-indigo-500/10 shadow-indigo-500/5 lg:sticky lg:top-6">
                            <ExamCreationForm />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
