import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Mic, Award, ArrowRight, ShieldCheck, BookOpen, MessageCircle, Volume2 } from "lucide-react";
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

    // Fetch available assignments
    const { data: availableAssignments } = await supabase
        .from("assignments")
        .select("*")
        .order("created_at", { ascending: false });

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
                    {/* Left Column: Available Assignments */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <div className="flex items-center justify-between pb-2 border-b border-border/50">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground tracking-tight">
                                <Award size={20} className="text-primary" />
                                Available Assessments
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
                                                Take Assessment <ArrowRight size={16} />
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center text-muted-foreground">
                                    <p className="font-medium text-foreground">No assessments available at the moment.</p>
                                    <p className="text-sm mt-2">Check back later for new assignments from your professor.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Best Practices */}
                    <div className="flex flex-col gap-6">
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
