"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";

export default function JoinCourseForm() {
    const router = useRouter();
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;

        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch("/api/courses/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: code.trim() }),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({
                    type: "success",
                    text: data.message || `Successfully joined ${data.courseName}!`,
                });
                setCode("");
                router.refresh();
            } else {
                setMessage({ type: "error", text: data.error || "Failed to join course" });
            }
        } catch {
            setMessage({ type: "error", text: "An error occurred. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    Course Code
                </label>
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm font-mono text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all focus:shadow-sm tracking-wider"
                    placeholder="XX-YYYY-ZZ"
                    maxLength={12}
                    required
                />
            </div>

            {message && (
                <div
                    className={`p-3 rounded-xl text-sm font-medium border ${message.type === "success"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                        }`}
                >
                    {message.text}
                </div>
            )}

            <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-md shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none"
            >
                {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                ) : (
                    <>
                        Join Course <ArrowRight size={16} />
                    </>
                )}
            </button>
        </form>
    );
}
