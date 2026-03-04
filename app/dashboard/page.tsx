import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Mic, Award, ArrowRight, ShieldCheck, BookOpen, MessageCircle, Volume2, Clock } from "lucide-react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import JoinCourseForm from "@/components/JoinCourseForm";

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
    if (profile?.role === 'superuser') {
        return redirect("/dashboard/admin");
    }

    // Fetch enrolled courses
    const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id, status, course_id, courses(id, name, description)")
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false });

    const approvedCourseIds = enrollments
        ?.filter((e) => e.status === "approved")
        .map((e) => e.course_id) || [];

    // Fetch available assignments from enrolled courses
    let availableAssignments: Array<Record<string, unknown>> = [];
    if (approvedCourseIds.length > 0) {
        const { data } = await supabase
            .from("assignments")
            .select("*, courses(name)")
            .in("course_id", approvedCourseIds)
            .in("exam_status", ["published", "active"])
            .order("created_at", { ascending: false });
        availableAssignments = data || [];
    }

    const activeExams = availableAssignments.filter((a) => a.exam_status === "active");
    const upcomingExams = availableAssignments.filter((a) => a.exam_status === "published");
    const pendingEnrollments = enrollments?.filter((e) => e.status === "pending") || [];

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
                        <div className="bg-background border border-border/50 shadow-sm p-1 rounded-full flex items-center justify-center">
                            <ThemeToggle />
                        </div>
                        <LogoutButton className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 font-semibold rounded-full" />
                    </div>
                </div>

                {/* Main Content Split */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Left Column: Courses & Assignments */}
                    <div className="lg:col-span-2 flex flex-col gap-8">
                        {/* Pending Enrollments */}
                        {pendingEnrollments.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <h2 className="text-lg font-bold flex items-center gap-2 text-foreground tracking-tight">
                                    <Clock size={18} className="text-amber-500" />
                                    Pending Enrollments
                                </h2>
                                <div className="premium-card overflow-hidden divide-y divide-border/50">
                                    {pendingEnrollments.map((enrollment) => {
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const courseData = enrollment.courses as any;
                                        const courseName = Array.isArray(courseData) ? courseData[0]?.name : courseData?.name;
                                        return (
                                            <div key={enrollment.id} className="p-4 flex items-center justify-between">
                                                <span className="font-medium text-foreground">{courseName || "Unknown Course"}</span>
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                    Awaiting Approval
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Active Exams */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between pb-2 border-b border-border/50">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground tracking-tight">
                                    <Award size={20} className="text-primary" />
                                    Active Assessments
                                </h2>
                            </div>
                            <div className="premium-card overflow-hidden">
                                {activeExams.length > 0 ? (
                                    <div className="divide-y divide-border/50">
                                        {activeExams.map((assignment) => {
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            const courseData = assignment.courses as any;
                                            const courseName = Array.isArray(courseData) ? courseData[0]?.name : courseData?.name;
                                            return (
                                                <div key={assignment.id as string} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-muted/30 transition-colors group gap-4 sm:gap-0">
                                                    <div className="pr-6">
                                                        <h4 className="font-bold text-foreground text-lg tracking-tight mb-1 group-hover:text-primary transition-colors">
                                                            {assignment.title as string}
                                                        </h4>
                                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                                                            <span className="bg-muted px-2 py-0.5 rounded text-foreground">{assignment.topic as string}</span>
                                                            {courseName && (
                                                                <span className="text-[11px] text-muted-foreground">in {courseName}</span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{assignment.description as string}</p>
                                                    </div>
                                                    <Link
                                                        href={`/assessment?assignmentId=${assignment.id}`}
                                                        className="px-5 py-2.5 rounded-full shadow-sm bg-primary text-white font-semibold hover:bg-indigo-600 transition-colors flex items-center justify-center sm:justify-start gap-2 whitespace-nowrap active:scale-95"
                                                    >
                                                        Take Assessment <ArrowRight size={16} />
                                                    </Link>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-muted-foreground">
                                        <p className="font-medium text-foreground">No active assessments right now.</p>
                                        <p className="text-sm mt-2">Check back when your professor activates an exam.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upcoming / Published Exams */}
                        {upcomingExams.length > 0 && (
                            <div className="flex flex-col gap-4">
                                <h2 className="text-lg font-bold flex items-center gap-2 text-foreground tracking-tight pb-2 border-b border-border/50">
                                    <BookOpen size={18} className="text-muted-foreground" />
                                    Upcoming Assessments
                                </h2>
                                <div className="premium-card overflow-hidden divide-y divide-border/50">
                                    {upcomingExams.map((assignment) => {
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const courseData = assignment.courses as any;
                                        const courseName = Array.isArray(courseData) ? courseData[0]?.name : courseData?.name;
                                        return (
                                            <div key={assignment.id as string} className="p-5 flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-bold text-foreground tracking-tight">{assignment.title as string}</h4>
                                                    <p className="text-[13px] text-muted-foreground font-medium">
                                                        {assignment.topic as string} {courseName && `· ${courseName}`}
                                                    </p>
                                                </div>
                                                <span className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                    Coming Soon
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Join Course + Best Practices */}
                    <div className="flex flex-col gap-6">
                        {/* Join Course Card */}
                        <div className="flex flex-col gap-4">
                            <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight text-foreground pb-2 border-b border-border/50">
                                <BookOpen size={20} className="text-primary" />
                                Join a Course
                            </h2>
                            <div className="premium-card p-6">
                                <JoinCourseForm />
                            </div>
                        </div>

                        {/* Best Practices */}
                        <div className="flex flex-col gap-4">
                            <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight text-foreground pb-2 border-b border-border/50">
                                <BookOpen size={20} className="text-primary" />
                                Best Practices
                            </h2>

                            <div className="premium-card p-6 flex flex-col gap-5">
                                <div className="flex gap-4 items-start">
                                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                                        <MessageCircle size={18} />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-foreground tracking-tight text-sm mb-1">Explain Your Reasoning</h5>
                                        <p className="text-[13px] text-muted-foreground leading-relaxed font-medium">
                                            Don&apos;t just give the answer — walk through your thought process. Explain the &quot;why&quot; behind your decisions.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 items-start">
                                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                                        <Volume2 size={18} />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-foreground tracking-tight text-sm mb-1">Speak Clearly</h5>
                                        <p className="text-[13px] text-muted-foreground leading-relaxed font-medium">
                                            Use technical terminology where appropriate. Take your time and speak at a natural pace — there&apos;s no rush.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 items-start">
                                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                                        <Mic size={18} />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-foreground tracking-tight text-sm mb-1">Stay Engaged</h5>
                                        <p className="text-[13px] text-muted-foreground leading-relaxed font-medium">
                                            The AI examiner may ask follow-up questions. Treat it like a real conversation — ask for clarification if needed.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recording & Privacy Notice */}
                        <div className="p-5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 shadow-sm relative overflow-hidden">
                            <h4 className="font-bold tracking-tight text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2 text-sm">
                                <ShieldCheck size={16} /> Recording Notice
                            </h4>
                            <p className="text-[13px] text-muted-foreground leading-relaxed font-medium">
                                Your voice will be recorded during the assessment for evaluation purposes. All recordings are anonymized and may be used for research to improve the platform. By taking the assessment, you consent to this process.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
