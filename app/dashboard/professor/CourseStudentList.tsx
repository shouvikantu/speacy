"use client";

import { useState } from "react";
import { Users, ChevronDown, ChevronUp } from "lucide-react";

interface CourseStudentListProps {
    students: { email: string }[];
}

export default function CourseStudentList({ students }: CourseStudentListProps) {
    const [expanded, setExpanded] = useState(false);

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
                                className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                            >
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary text-[10px] font-bold border border-primary/10 shrink-0">
                                    {student.email.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-medium text-foreground truncate">
                                    {student.email}
                                </span>
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
