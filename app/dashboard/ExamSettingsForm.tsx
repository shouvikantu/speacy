"use client";

import { useEffect, useState } from "react";

type ExamSettings = {
  id: string;
  title: string;
  learningGoals: string[];
  questionTopics: string[];
  rubric: string;
  rubricAuto: boolean;
  isActive: boolean;
  updatedAt: string;
};

const joinLines = (items: string[]) => (items?.length ? items.join("\n") : "");
const SAMPLE_EXAM = {
  title: "Data Structures Midterm",
  learningGoals: [
    "Explain how stacks and queues differ with real-world examples.",
    "Analyze time complexity for common operations.",
    "Choose the right structure for a given scenario.",
  ],
  questionTopics: [
    "Stack vs queue operations",
    "Big-O for insert/search/delete",
    "Trade-offs between arrays and linked lists",
  ],
  rubric:
    "- Concept accuracy: Defines core structures and operations correctly.\n" +
    "- Reasoning: Justifies choices with clear trade-offs.\n" +
    "- Application: Applies concepts to concrete examples.\n" +
    "- Communication: Answers are concise and well-structured.",
};

export default function ExamSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [learningGoals, setLearningGoals] = useState("");
  const [questionTopics, setQuestionTopics] = useState("");
  const [rubric, setRubric] = useState("");
  const [rubricAuto, setRubricAuto] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");

  const loadExam = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/exams");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load exam settings");
      }
      const exam = data?.exam as ExamSettings | null;

      if (exam) {
        setTitle(exam.title ?? "");
        setLearningGoals(joinLines(exam.learningGoals ?? []));
        setQuestionTopics(joinLines(exam.questionTopics ?? []));
        setRubric(exam.rubric ?? "");
        setRubricAuto(Boolean(exam.rubricAuto));
        setIsActive(Boolean(exam.isActive));
        setUpdatedAt(exam.updatedAt ?? "");
      } else {
        setTitle("");
        setLearningGoals("");
        setQuestionTopics("");
        setRubric("");
        setRubricAuto(false);
        setIsActive(false);
        setUpdatedAt("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load exam settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadExam();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          learningGoals,
          questionTopics,
          rubric,
          rubricAuto,
          isActive,
        }),
      });

      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload?.error || "Failed to save exam settings");
      }

      const payload = await res.json();
      const exam = payload?.exam as ExamSettings | null;
      if (exam) {
        setTitle(exam.title ?? "");
        setLearningGoals(joinLines(exam.learningGoals ?? []));
        setQuestionTopics(joinLines(exam.questionTopics ?? []));
        setRubric(exam.rubric ?? "");
        setRubricAuto(Boolean(exam.rubricAuto));
        setIsActive(Boolean(exam.isActive));
        setUpdatedAt(exam.updatedAt ?? "");
      }
      setNotice("Saved exam settings.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save exam settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSample = () => {
    setTitle(SAMPLE_EXAM.title);
    setLearningGoals(joinLines(SAMPLE_EXAM.learningGoals));
    setQuestionTopics(joinLines(SAMPLE_EXAM.questionTopics));
    setRubric(SAMPLE_EXAM.rubric);
    setRubricAuto(false);
    setNotice("Sample exam loaded. Edit anything, then save.");
  };

  return (
    <div className="card">
      <div className="panel-header">
        <div>
          <div className="panel-title">Exam configuration</div>
          <div className="panel-subtitle">
            Upload learning goals, question topics, and an optional rubric.
          </div>
        </div>
        <div className="panel-actions">
          <button className="btn ghost" onClick={handleSample} disabled={loading || saving}>
            Create sample exam
          </button>
          <button className="btn ghost" onClick={loadExam} disabled={loading || saving}>
            Refresh
          </button>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-row">
          <label className="field-label" htmlFor="exam-title">
            Exam title
          </label>
          <input
            id="exam-title"
            className="input"
            type="text"
            placeholder="Intro to data structures"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="form-row">
          <label className="field-label" htmlFor="learning-goals">
            Learning goals (one per line)
          </label>
          <textarea
            id="learning-goals"
            className="textarea"
            placeholder="Explain how stacks work\nCompare arrays vs linked lists"
            value={learningGoals}
            onChange={(event) => setLearningGoals(event.target.value)}
          />
        </div>

        <div className="form-row">
          <label className="field-label" htmlFor="question-topics">
            Question topics (one per line)
          </label>
          <textarea
            id="question-topics"
            className="textarea"
            placeholder="Push/pop operations\nTime complexity tradeoffs"
            value={questionTopics}
            onChange={(event) => setQuestionTopics(event.target.value)}
          />
        </div>

        <div className="form-row">
          <label className="field-label" htmlFor="rubric">
            Rubric (optional)
          </label>
          <textarea
            id="rubric"
            className="textarea"
            placeholder="Criteria and scoring guidance for the assessment"
            value={rubric}
            onChange={(event) => {
              setRubric(event.target.value);
              if (rubricAuto) setRubricAuto(false);
            }}
          />
          <div className="helper">
            {rubric
              ? rubricAuto
                ? "Rubric was auto-generated. Editing marks it as instructor-provided."
                : "Rubric is instructor-provided."
              : "If left blank, a rubric will be generated automatically before the exam starts."}
          </div>
        </div>

        <div className="form-row checkbox-row">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <span>Make this the active exam for students</span>
          </label>
          {updatedAt ? (
            <span className="muted">Last updated: {new Date(updatedAt).toLocaleString()}</span>
          ) : null}
        </div>
      </div>

      <div className="controls">
        <button className="btn primary" onClick={handleSave} disabled={saving || loading}>
          {saving ? "Saving..." : "Save exam"}
        </button>
        {notice ? <span className="notice-inline">{notice}</span> : null}
        {error ? <span className="error-inline">{error}</span> : null}
      </div>
    </div>
  );
}
