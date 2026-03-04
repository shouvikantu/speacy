"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Users, BookOpen, Shield, Activity, Eye,
    ChevronDown, ChevronUp, RefreshCw, FileText, Clock,
    GraduationCap, TrendingUp, Search, ExternalLink
} from "lucide-react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Stats {
    users: { student: number; professor: number; superuser: number };
    totalUsers: number;
    totalCourses: number;
    enrollments: { pending: number; approved: number; rejected: number };
    assessments: Record<string, number>;
    examStatuses: Record<string, number>;
}

interface UserRecord {
    id: string;
    email: string;
    role: string;
    created_at: string;
}

interface Assessment {
    id: string;
    topic: string;
    total_score: number | null;
    status: string;
    student_name: string;
    created_at: string;
    assignment_id: string | null;
    assignments?: {
        title: string;
        course_id: string | null;
        courses?: { name: string } | null;
    } | null;
}

interface AuditLog {
    id: string;
    action: string;
    target_type: string;
    target_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    profiles?: { email: string };
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSection, setExpandedSection] = useState<string>("users");
    const [updatingRole, setUpdatingRole] = useState<string | null>(null);
    const [studentFilter, setStudentFilter] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, usersRes, assessmentsRes, logsRes] = await Promise.all([
                fetch("/api/admin/stats"),
                fetch("/api/admin/users"),
                fetch("/api/admin/assessments?limit=100"),
                fetch("/api/admin/audit-logs?limit=30"),
            ]);

            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data.stats);
            }
            if (usersRes.ok) {
                const data = await usersRes.json();
                setUsers(data.users || []);
            } else {
                console.error("Users API failed:", usersRes.status, await usersRes.text());
            }
            if (assessmentsRes.ok) {
                const data = await assessmentsRes.json();
                setAssessments(data.assessments || []);
            }
            if (logsRes.ok) {
                const data = await logsRes.json();
                setAuditLogs(data.logs || []);
            }
        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRoleChange = async (userId: string, newRole: string) => {
        if (!confirm(`Are you sure you want to change this user's role to "${newRole}"?`)) return;
        setUpdatingRole(userId);
        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, role: newRole }),
            });

            if (res.ok) {
                setUsers((prev) =>
                    prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
                );
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to update role");
            }
        } catch {
            alert("Error updating role");
        } finally {
            setUpdatingRole(null);
        }
    };

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? "" : section);
    };

    const roleColors: Record<string, string> = {
        student: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        professor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        superuser: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    };

    const statusColors: Record<string, string> = {
        graded: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        grading: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    };

    const scoreColor = (score: number | null) => {
        if (score === null) return "text-muted-foreground";
        if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
        if (score >= 60) return "text-amber-600 dark:text-amber-400";
        return "text-red-600 dark:text-red-400";
    };

    // Filtered users
    const filteredUsers = users.filter((u) => {
        const matchesRole = roleFilter === "all" || u.role === roleFilter;
        const matchesSearch = (u.email || "").toLowerCase().includes(studentFilter.toLowerCase());
        return matchesRole && matchesSearch;
    });

    // Build student performance summary
    const studentPerformance = new Map<string, { assessmentCount: number; totalScore: number; gradedCount: number; latestDate: string }>();
    assessments.forEach((a) => {
        if (!a.student_name) return;
        const existing = studentPerformance.get(a.student_name) || { assessmentCount: 0, totalScore: 0, gradedCount: 0, latestDate: a.created_at };
        existing.assessmentCount++;
        if ((a.status === "graded" || a.status === "completed") && a.total_score !== null) {
            existing.totalScore += a.total_score;
            existing.gradedCount++;
        }
        if (a.created_at > existing.latestDate) existing.latestDate = a.created_at;
        studentPerformance.set(a.student_name, existing);
    });

    const studentSummaries = Array.from(studentPerformance.entries())
        .map(([email, data]) => ({
            email,
            assessmentCount: data.assessmentCount,
            avgScore: data.gradedCount > 0 ? Math.round(data.totalScore / data.gradedCount) : null,
            gradedCount: data.gradedCount,
            latestDate: data.latestDate,
        }))
        .sort((a, b) => b.assessmentCount - a.assessmentCount);

    if (loading && !stats) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="flex items-center gap-3 text-muted-foreground">
                    <RefreshCw className="animate-spin" size={20} />
                    <span className="font-medium">Loading admin dashboard...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col p-6 bg-background text-foreground font-sans transition-colors duration-300">
            <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col gap-8 mt-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-6 border-b border-border/50">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <Shield size={22} className="text-amber-500" />
                            </div>
                            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                                Admin Console
                            </h1>
                        </div>
                        <p className="text-muted-foreground font-medium">
                            System overview, user management, student grades, and audit trail.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard/professor"
                            className="px-4 py-2 rounded-full bg-muted border border-border flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <BookOpen size={14} />
                            Professor View
                        </Link>
                        <button
                            onClick={fetchData}
                            className="px-4 py-2 rounded-full bg-muted border border-border flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                            Refresh
                        </button>
                        <div className="bg-background border border-border/50 shadow-sm p-1 rounded-full">
                            <ThemeToggle />
                        </div>
                        <LogoutButton className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 font-semibold rounded-full" />
                    </div>
                </div>

                {/* KPI Grid */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="premium-card p-5 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Users size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Total Users</span>
                            </div>
                            <span className="text-3xl font-extrabold tracking-tight">{stats.totalUsers}</span>
                            <div className="flex gap-1.5 mt-1 flex-wrap">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">{stats.users.student} stu</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">{stats.users.professor} fac</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">{stats.users.superuser} admin</span>
                            </div>
                        </div>

                        <div className="premium-card p-5 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <BookOpen size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Courses</span>
                            </div>
                            <span className="text-3xl font-extrabold tracking-tight">{stats.totalCourses}</span>
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{stats.enrollments.pending} pending enrollments</span>
                        </div>

                        <div className="premium-card p-5 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <GraduationCap size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Assessments</span>
                            </div>
                            <span className="text-3xl font-extrabold tracking-tight">
                                {Object.values(stats.assessments).reduce((a, b) => a + b, 0)}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                {stats.assessments.graded || 0} graded
                            </span>
                        </div>

                        <div className="premium-card p-5 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Activity size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Active Exams</span>
                            </div>
                            <span className="text-3xl font-extrabold tracking-tight">{stats.examStatuses.active || 0}</span>
                            <span className="text-[10px] font-bold text-muted-foreground">
                                {stats.examStatuses.draft || 0} draft · {stats.examStatuses.published || 0} pub
                            </span>
                        </div>

                        <div className="premium-card p-5 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <TrendingUp size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Students</span>
                            </div>
                            <span className="text-3xl font-extrabold tracking-tight">{studentSummaries.length}</span>
                            <span className="text-[10px] font-bold text-muted-foreground">
                                have taken exams
                            </span>
                        </div>
                    </div>
                )}

                {/* User Management */}
                <div className="premium-card overflow-hidden">
                    <button
                        onClick={() => toggleSection("users")}
                        className="w-full p-6 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                        <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight">
                            <Users size={20} className="text-primary" />
                            User Management
                            <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {users.length}
                            </span>
                        </h2>
                        {expandedSection === "users" ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    {expandedSection === "users" && (
                        <div className="border-t border-border/50">
                            {/* Filters */}
                            <div className="p-4 bg-muted/20 border-b border-border/50 flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search by email..."
                                        value={studentFilter}
                                        onChange={(e) => setStudentFilter(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    {["all", "student", "professor", "superuser"].map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => setRoleFilter(r)}
                                            className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${roleFilter === r
                                                ? "bg-primary text-white"
                                                : "bg-background border border-border text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            {r === "all" ? "All" : r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
                                        <tr className="border-b border-border/50">
                                            <th className="text-left p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Email</th>
                                            <th className="text-left p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Current Role</th>
                                            <th className="text-left p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Joined</th>
                                            <th className="text-right p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Change Role</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {filteredUsers.map((u) => (
                                            <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-muted to-border flex items-center justify-center text-foreground font-bold text-sm border border-background">
                                                            {u.email.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium">{u.email}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${roleColors[u.role] || ""}`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-muted-foreground text-xs">
                                                    {new Date(u.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <select
                                                        value={u.role}
                                                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                        disabled={updatingRole === u.id}
                                                        className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 cursor-pointer"
                                                    >
                                                        <option value="student">Student</option>
                                                        <option value="professor">Professor</option>
                                                        <option value="superuser">Superuser</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredUsers.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-12 text-center text-muted-foreground">No users match your filters.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Student Performance */}
                <div className="premium-card overflow-hidden">
                    <button
                        onClick={() => toggleSection("students")}
                        className="w-full p-6 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                        <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight">
                            <GraduationCap size={20} className="text-primary" />
                            Student Performance
                            <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {studentSummaries.length} students
                            </span>
                        </h2>
                        {expandedSection === "students" ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    {expandedSection === "students" && (
                        <div className="border-t border-border/50 overflow-x-auto max-h-[500px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
                                    <tr className="border-b border-border/50">
                                        <th className="text-left p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Student</th>
                                        <th className="text-center p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Exams Taken</th>
                                        <th className="text-center p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Graded</th>
                                        <th className="text-center p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Avg Score</th>
                                        <th className="text-right p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Last Active</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {studentSummaries.map((s) => (
                                        <tr key={s.email} className="hover:bg-muted/20 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm border border-blue-500/20">
                                                        {s.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium">{s.email}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center font-bold">{s.assessmentCount}</td>
                                            <td className="p-4 text-center text-muted-foreground">{s.gradedCount}</td>
                                            <td className="p-4 text-center">
                                                <span className={`font-extrabold text-lg ${scoreColor(s.avgScore)}`}>
                                                    {s.avgScore !== null ? `${s.avgScore}%` : "—"}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right text-xs text-muted-foreground">
                                                {new Date(s.latestDate).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {studentSummaries.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-muted-foreground">No student assessments recorded yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* All Assessments */}
                <div className="premium-card overflow-hidden">
                    <button
                        onClick={() => toggleSection("assessments")}
                        className="w-full p-6 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                        <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight">
                            <FileText size={20} className="text-primary" />
                            All Assessments
                            <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {assessments.length}
                            </span>
                        </h2>
                        {expandedSection === "assessments" ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    {expandedSection === "assessments" && (
                        <div className="border-t border-border/50 overflow-x-auto max-h-[600px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
                                    <tr className="border-b border-border/50">
                                        <th className="text-left p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Student</th>
                                        <th className="text-left p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Topic</th>
                                        <th className="text-left p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Assignment</th>
                                        <th className="text-left p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Course</th>
                                        <th className="text-center p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Score</th>
                                        <th className="text-center p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Status</th>
                                        <th className="text-right p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Date</th>
                                        <th className="text-right p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {assessments.map((a) => {
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const assignmentData = a.assignments as any;
                                        const assignmentTitle = assignmentData?.title || "—";
                                        const courseName = assignmentData?.courses?.name || "—";

                                        return (
                                            <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="p-4 font-medium">{a.student_name || "—"}</td>
                                                <td className="p-4 text-muted-foreground">{a.topic}</td>
                                                <td className="p-4 text-muted-foreground text-xs">{assignmentTitle}</td>
                                                <td className="p-4 text-muted-foreground text-xs">{courseName}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`font-extrabold ${scoreColor(a.total_score)}`}>
                                                        {a.total_score !== null ? `${a.total_score}%` : "—"}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColors[a.status] || "bg-muted text-muted-foreground border-border"}`}>
                                                        {a.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right text-xs text-muted-foreground">
                                                    {new Date(a.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    {(a.status === "graded" || a.status === "completed") && (
                                                        <Link
                                                            href={`/results/${a.id}`}
                                                            className="text-primary hover:text-primary/80 transition-colors"
                                                            title="View results"
                                                        >
                                                            <ExternalLink size={14} />
                                                        </Link>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {assessments.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-12 text-center text-muted-foreground">No assessments recorded yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Audit Trail */}
                <div className="premium-card overflow-hidden">
                    <button
                        onClick={() => toggleSection("audit")}
                        className="w-full p-6 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                        <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight">
                            <Eye size={20} className="text-primary" />
                            Audit Trail
                        </h2>
                        {expandedSection === "audit" ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    {expandedSection === "audit" && (
                        <div className="border-t border-border/50 divide-y divide-border/50 max-h-[500px] overflow-y-auto">
                            {auditLogs.length > 0 ? auditLogs.map((log) => (
                                <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-muted/20 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <Clock size={14} className="text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-sm">{log.profiles?.email || "System"}</span>
                                            <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                {log.action}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Target: {log.target_type}{log.target_id ? ` → ${log.target_id.substring(0, 8)}...` : ""}
                                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                <span className="ml-2 text-foreground/60">
                                                    {JSON.stringify(log.metadata)}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap font-medium">
                                        {new Date(log.created_at).toLocaleString()}
                                    </span>
                                </div>
                            )) : (
                                <div className="p-12 text-center text-muted-foreground font-medium">
                                    No audit events recorded yet.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
