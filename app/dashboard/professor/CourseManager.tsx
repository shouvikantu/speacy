"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function CourseManager() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ name: "", description: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setLoading(true);
        try {
            const res = await fetch("/api/courses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                const data = await res.json();
                alert(`Course created! Join code: ${data.course.join_code}`);
                setFormData({ name: "", description: "" });
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to create course");
            }
        } catch {
            alert("Error creating course");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    Course Name
                </label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all focus:shadow-sm"
                    placeholder="e.g. Data Structures Fall 2026"
                    required
                />
            </div>
            <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    Description
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all focus:shadow-sm h-20 resize-y"
                    placeholder="Brief course description..."
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-md shadow-primary/20 disabled:opacity-70"
            >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Create Course"}
            </button>
        </form>
    );
}
