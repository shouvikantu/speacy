"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DeleteAssignmentButton({ assignmentId }: { assignmentId: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [confirming, setConfirming] = useState(false);

    const handleDelete = async () => {
        if (!confirming) {
            setConfirming(true);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/assignments/${assignmentId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                router.refresh();
            } else {
                alert("Failed to delete assignment.");
            }
        } catch {
            alert("Error deleting assignment.");
        } finally {
            setLoading(false);
            setConfirming(false);
        }
    };

    if (loading) {
        return (
            <div className="p-2">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5">
            {confirming && (
                <button
                    onClick={() => setConfirming(false)}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
                >
                    Cancel
                </button>
            )}
            <button
                onClick={handleDelete}
                title={confirming ? "Click again to confirm" : "Delete assignment"}
                className={`p-2 rounded-lg transition-all ${confirming
                        ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
                        : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    }`}
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
}
