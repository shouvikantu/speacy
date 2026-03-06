"use client";

import { useState } from "react";
import { Edit3 } from "lucide-react";
import ExamEditModal from "./ExamEditModal";
import ExamStatusToggle from "./ExamStatusToggle";
import DeleteAssignmentButton from "./DeleteAssignmentButton";

interface Assignment {
    id: string;
    title: string;
    topic: string;
    description?: string;
    context_markdown?: string;
    learning_goals?: string[];
    exam_status?: string;
    created_at: string;
    code_editor_enabled?: boolean;
    code_editor_language?: string;
}

export default function AssignmentRow({ assignment }: { assignment: Assignment }) {
    const [editing, setEditing] = useState(false);

    return (
        <>
            <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-muted/30 transition-colors gap-4 sm:gap-0">
                <div>
                    <h4 className="font-bold text-foreground text-lg tracking-tight mb-1">{assignment.title}</h4>
                    <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground mb-2">
                        <span className="bg-muted px-2 py-0.5 rounded text-foreground">{assignment.topic}</span>
                    </div>
                    <ExamStatusToggle
                        assignmentId={assignment.id}
                        currentStatus={assignment.exam_status || "published"}
                    />
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                    <div className="text-left sm:text-right">
                        <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Created</span>
                        <span className="text-sm font-medium text-foreground">{new Date(assignment.created_at).toLocaleDateString()}</span>
                    </div>
                    <button
                        onClick={() => setEditing(true)}
                        className="p-2.5 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all border border-border/50"
                        title="Edit exam"
                    >
                        <Edit3 size={16} />
                    </button>
                    <DeleteAssignmentButton assignmentId={assignment.id} />
                </div>
            </div>

            {editing && (
                <ExamEditModal
                    assignment={assignment}
                    onClose={() => setEditing(false)}
                />
            )}
        </>
    );
}
