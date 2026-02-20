"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ExamCreationForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        topic: "",
        difficulty_level: "Intermediate",
        description: "",
        questions: [{ prompt: "" }],
        learning_goals: [""]
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleQuestionChange = (index: number, value: string) => {
        const newQuestions = [...formData.questions];
        newQuestions[index].prompt = value;
        setFormData({ ...formData, questions: newQuestions });
    };

    const addQuestion = () => {
        setFormData({ ...formData, questions: [...formData.questions, { prompt: "" }] });
    };

    const handleGoalChange = (index: number, value: string) => {
        const newGoals = [...formData.learning_goals];
        newGoals[index] = value;
        setFormData({ ...formData, learning_goals: newGoals });
    };

    const addGoal = () => {
        setFormData({ ...formData, learning_goals: [...formData.learning_goals, ""] });
    };

    const removeGoal = (index: number) => {
        if (formData.learning_goals.length > 1) {
            const newGoals = [...formData.learning_goals];
            newGoals.splice(index, 1);
            setFormData({ ...formData, learning_goals: newGoals });
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/assignments", {
                method: "POST",
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert("Exam created successfully!");
                setFormData({
                    title: "",
                    topic: "",
                    difficulty_level: "Intermediate",
                    description: "",
                    questions: [{ prompt: "" }],
                    learning_goals: [""]
                });
                router.refresh(); // Refresh to see new assignment in list
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

            <div className="grid grid-cols-2 gap-5">
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
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Difficulty</label>
                    <select
                        name="difficulty_level"
                        value={formData.difficulty_level}
                        onChange={handleChange}
                        className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all focus:shadow-sm appearance-none"
                    >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                    </select>
                </div>
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

            <div className="space-y-4">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Learning Goals</label>
                <div className="space-y-3">
                    {formData.learning_goals.map((goal, idx) => (
                        <div key={idx} className="flex gap-2 items-center group">
                            <input
                                type="text"
                                value={goal}
                                onChange={(e) => handleGoalChange(idx, e.target.value)}
                                className="flex-1 bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm group-hover:border-border"
                                placeholder={`Learning objective ${idx + 1}`}
                            />
                            {formData.learning_goals.length > 1 && (
                                <button type="button" onClick={() => removeGoal(idx)} className="text-muted-foreground hover:text-destructive p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                <button type="button" onClick={addGoal} className="text-xs font-bold text-primary hover:text-indigo-600 transition-colors flex items-center gap-1.5 mt-2 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/10">
                    <Plus size={14} /> Add Goal
                </button>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-md shadow-primary/20 hover:shadow-lg disabled:opacity-70 disabled:pointer-events-none"
            >
                {loading ? <Loader2 className="animate-spin" /> : "Publish Assessment"}
            </button>
        </form>
    );
}
