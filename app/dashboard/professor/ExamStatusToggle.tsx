"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const statusConfig: Record<string, { label: string; color: string; next: string | null; nextLabel: string }> = {
    draft: {
        label: "Draft",
        color: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
        next: "published",
        nextLabel: "Publish",
    },
    published: {
        label: "Published",
        color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        next: "active",
        nextLabel: "Activate",
    },
    active: {
        label: "Active",
        color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        next: "closed",
        nextLabel: "Close",
    },
    closed: {
        label: "Closed",
        color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        next: "active",
        nextLabel: "Reopen",
    },
};

export default function ExamStatusToggle({
    assignmentId,
    currentStatus,
}: {
    assignmentId: string;
    currentStatus: string;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const config = statusConfig[currentStatus] || statusConfig.draft;

    const handleTransition = async () => {
        if (!config.next) return;
        setLoading(true);

        try {
            const res = await fetch(`/api/assignments/${assignmentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ exam_status: config.next }),
            });

            if (res.ok) {
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to update status");
            }
        } catch {
            alert("Error updating status");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.color}`}>
                {config.label}
            </span>
            {config.next && (
                <button
                    onClick={handleTransition}
                    disabled={loading}
                    className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                    {loading ? "..." : config.next === "active" ? "→ Activate" : config.next === "closed" ? "→ Close" : config.next === "published" ? "→ Publish" : `→ ${config.nextLabel}`}
                </button>
            )}
        </div>
    );
}
