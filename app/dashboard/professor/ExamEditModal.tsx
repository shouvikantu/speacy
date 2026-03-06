"use client";

import { useState } from "react";
import { Loader2, X, Eye, Edit3, Code2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Assignment {
    id: string;
    title: string;
    topic: string;
    description?: string;
    context_markdown?: string;
    learning_goals?: string[];
    code_editor_enabled?: boolean;
    code_editor_language?: string;
}

export default function ExamEditModal({
    assignment,
    onClose,
}: {
    assignment: Assignment;
    onClose: () => void;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [formData, setFormData] = useState({
        title: assignment.title,
        topic: assignment.topic,
        description: assignment.description || "",
        context_markdown: assignment.context_markdown || "",
        learning_goals: (assignment.learning_goals || []).join("\n"),
        code_editor_enabled: assignment.code_editor_enabled !== false,
        code_editor_language: assignment.code_editor_language || "python",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const parsedGoals = formData.learning_goals
                .split('\n')
                .map(goal => goal.trim())
                .filter(goal => goal.length > 0);

            const payload = {
                ...formData,
                learning_goals: parsedGoals,
            };

            const res = await fetch(`/api/assignments/${assignment.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                alert("Exam updated successfully!");
                router.refresh();
                onClose();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to update exam");
            }
        } catch (error) {
            console.error(error);
            alert("Error updating exam");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background border border-border rounded-2xl shadow-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-extrabold tracking-tight text-foreground">Edit Exam</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Exam Title</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all focus:shadow-sm"
                            placeholder="e.g. Midterm Simulation"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Topic</label>
                        <input
                            type="text"
                            name="topic"
                            value={formData.topic}
                            onChange={handleChange}
                            className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all focus:shadow-sm"
                            placeholder="e.g. Dynamic Programming"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all focus:shadow-sm h-28 resize-y leading-relaxed"
                            placeholder="Brief description for students..."
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                Exam Context / Information
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-[9px] normal-case">Markdown supported</span>
                            </label>
                            <div className="flex bg-muted p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setPreviewMode(false)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${!previewMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    <Edit3 size={12} /> Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewMode(true)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${previewMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    <Eye size={12} /> Preview
                                </button>
                            </div>
                        </div>

                        {previewMode ? (
                            <div className="w-full bg-background border border-border/50 rounded-xl px-4 py-4 min-h-[8rem] max-h-64 overflow-y-auto">
                                {formData.context_markdown ? (
                                    <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-headings:-tracking-tight prose-a:text-primary">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {formData.context_markdown}
                                        </ReactMarkdown>
                                    </article>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground/50 italic">
                                        Nothing to preview yet.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <textarea
                                name="context_markdown"
                                value={formData.context_markdown}
                                onChange={handleChange}
                                className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all focus:shadow-sm h-32 resize-y leading-relaxed font-mono text-[13px]"
                                placeholder="Provide reference material, tables, or background information here..."
                            />
                        )}
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center justify-between">
                            <span>Learning Goals</span>
                            <span className="text-muted-foreground/50 text-[9px] normal-case font-normal hidden sm:inline">Enter one goal per line</span>
                        </label>
                        <textarea
                            name="learning_goals"
                            value={formData.learning_goals}
                            onChange={handleChange}
                            className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all focus:shadow-sm h-32 resize-y leading-relaxed"
                            placeholder={"1. Understand recursion\n2. Apply dynamic programming\n3. Analyze time complexity"}
                        />
                    </div>

                    {/* Code Editor Toggle */}
                    <div className="flex flex-col gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                <Code2 size={14} className="text-primary" />
                                Code Editor
                            </label>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, code_editor_enabled: !formData.code_editor_enabled })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${formData.code_editor_enabled ? 'bg-primary' : 'bg-muted-foreground/30'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${formData.code_editor_enabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            {formData.code_editor_enabled
                                ? "Students will see a code editor during the exam."
                                : "Code editor will be hidden during the exam."}
                        </p>
                        {formData.code_editor_enabled && (
                            <div>
                                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Language</label>
                                <select
                                    name="code_editor_language"
                                    value={formData.code_editor_language}
                                    onChange={handleChange}
                                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                >
                                    <option value="python">Python</option>
                                    <option value="sql">SQL</option>
                                    <option value="javascript">JavaScript</option>
                                    <option value="java">Java</option>
                                    <option value="cpp">C++</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 border border-border"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-md shadow-primary/20 hover:shadow-lg disabled:opacity-70 disabled:pointer-events-none"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
