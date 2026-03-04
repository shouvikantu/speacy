"use client";

import { useState } from "react";
import { Loader2, Eye, Edit3 } from "lucide-react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Course {
    id: string;
    name: string;
}

export default function ExamCreationForm({ courses }: { courses: Course[] }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        topic: "",
        description: "",
        context_markdown: "",
        questions: [{ prompt: "" }],
        learning_goals: "",
        course_id: courses.length > 0 ? courses[0].id : "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent, asDraft = false) => {
        e.preventDefault();
        if (!formData.course_id) {
            alert("Please select a course first. Create a course if you haven't already.");
            return;
        }
        setLoading(true);

        try {
            const parsedGoals = formData.learning_goals
                .split('\n')
                .map(goal => goal.trim())
                .filter(goal => goal.length > 0);

            const payload = {
                ...formData,
                learning_goals: parsedGoals,
                exam_status: asDraft ? "draft" : "published",
            };

            const res = await fetch("/api/assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert(asDraft ? "Exam saved as draft!" : "Exam published successfully!");
                setFormData({
                    title: "",
                    topic: "",
                    description: "",
                    context_markdown: "",
                    questions: [{ prompt: "" }],
                    learning_goals: "",
                    course_id: courses.length > 0 ? courses[0].id : "",
                });
                router.refresh();
            } else {
                alert("Failed to create exam");
            }
        } catch (error) {
            console.error(error);
            alert("Error creating exam");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
            {/* Course Selector */}
            <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Course</label>
                {courses.length > 0 ? (
                    <select
                        name="course_id"
                        value={formData.course_id}
                        onChange={handleChange}
                        className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all focus:shadow-sm"
                        required
                    >
                        {courses.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                ) : (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-3 border border-border/50">
                        No courses yet. Create a course first using the form above.
                    </p>
                )}
            </div>

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

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
                    disabled={loading || !formData.course_id}
                    className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 border border-border disabled:opacity-50"
                >
                    Save as Draft
                </button>
                <button
                    type="submit"
                    disabled={loading || !formData.course_id}
                    className="flex-1 bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-md shadow-primary/20 hover:shadow-lg disabled:opacity-70 disabled:pointer-events-none"
                >
                    {loading ? <Loader2 className="animate-spin" /> : "Publish Assessment"}
                </button>
            </div>
        </form>
    );
}
