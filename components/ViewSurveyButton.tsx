"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import SurveyResponseModal from "./SurveyResponseModal";

interface ViewSurveyButtonProps {
    assessmentId: string;
    hasSurvey: boolean;
}

export default function ViewSurveyButton({ assessmentId, hasSurvey }: ViewSurveyButtonProps) {
    const [open, setOpen] = useState(false);

    if (!hasSurvey) {
        return (
            <span className="text-xs text-muted-foreground font-medium">—</span>
        );
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
            >
                <ClipboardList size={13} />
                View
            </button>
            {open && (
                <SurveyResponseModal
                    assessmentId={assessmentId}
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    );
}
