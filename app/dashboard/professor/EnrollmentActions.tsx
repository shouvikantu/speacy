"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle } from "lucide-react";

export default function EnrollmentActions({
    enrollmentId,
    courseId,
}: {
    enrollmentId: string;
    courseId: string;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleAction = async (status: "approved" | "rejected") => {
        setLoading(true);
        try {
            const res = await fetch(`/api/courses/${courseId}/enrollments`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enrollmentId, status }),
            });

            if (res.ok) {
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to update enrollment");
            }
        } catch {
            alert("Error updating enrollment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={() => handleAction("approved")}
                disabled={loading}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
                <CheckCircle size={14} />
                Approve
            </button>
            <button
                onClick={() => handleAction("rejected")}
                disabled={loading}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
                <XCircle size={14} />
                Reject
            </button>
        </div>
    );
}
