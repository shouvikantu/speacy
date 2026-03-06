"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, ChevronDown, ChevronUp, X, Loader2 } from "lucide-react";

interface StudentEntry {
    email: string;
    enrollmentId: string;
}

interface CourseStudentListProps {
    students: StudentEntry[];
    courseId: string;
}

export default function CourseStudentList({ students, courseId }: CourseStudentListProps) {
    const [expanded, setExpanded] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const router = useRouter();

    const handleRemove = async (enrollmentId: string) => {
        if (!confirm("Remove this student from the course? They can re-join using the course code.")) return;

        setRemovingId(enrollmentId);
        try {
            const res = await fetch(`/api/courses/${courseId}/enrollments`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enrollmentId }),
            });

            if (res.ok) {
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to remove student");
            }
        } catch {
            alert("Error removing student");
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <div className="mt-3">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group"
            >
                <Users size={13} className="text-primary/70 group-hover:text-primary transition-colors" />
                <span>
                    {students.length} Student{students.length !== 1 ? "s" : ""} Enrolled
                </span>
                {expanded ? (
                    <ChevronUp size={13} className="ml-0.5" />
                ) : (
                    <ChevronDown size={13} className="ml-0.5" />
                )}
            </button>

            {expanded && (
                <div className="mt-2.5 ml-0.5 space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                    {students.length > 0 ? (
                        students.map((student) => (
                            <div
                                key={student.email}
                                className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg hover:bg-muted/40 transition-colors group/student"
                            >
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary text-[10px] font-bold border border-primary/10 shrink-0">
                                    {student.email.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-medium text-foreground truncate flex-1">
                                    {student.email}
                                </span>
                                <button
                                    onClick={() => handleRemove(student.enrollmentId)}
                                    disabled={removingId === student.enrollmentId}
                                    className="opacity-0 group-hover/student:opacity-100 p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50 shrink-0"
                                    title="Remove student"
                                >
                                    {removingId === student.enrollmentId ? (
                                        <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                        <X size={12} />
                                    )}
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-muted-foreground/70 italic pl-1">
                            No students enrolled yet.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
