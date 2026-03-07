"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import {
  BookOpen,
  MessageCircle,
  BarChart3,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Mic,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: [0.25, 0.4, 0, 1] as const },
  }),
};

const steps = [
  {
    num: "01",
    icon: BookOpen,
    title: "Join Your Course",
    desc: "Your professor shares a course code. Enter it on your dashboard — that's it, you're in.",
    accent: "from-violet-500 to-indigo-500",
  },
  {
    num: "02",
    icon: MessageCircle,
    title: "Have a Conversation",
    desc: "An AI tutor asks you questions out loud, just like a real office-hours chat. Speak naturally — no typing required.",
    accent: "from-indigo-500 to-blue-500",
  },
  {
    num: "03",
    icon: BarChart3,
    title: "Get Instant Feedback",
    desc: "See exactly where you're strong and where to focus next, with detailed scores and actionable suggestions.",
    accent: "from-blue-500 to-cyan-500",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col font-sans bg-background text-foreground transition-colors duration-300 relative overflow-hidden">
      {/* ── Ambient Background ── */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="landing-blob blob-1" />
        <div className="landing-blob blob-2" />
        <div className="landing-blob blob-3" />
      </div>

      {/* ── Header ── */}
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between sticky top-0 z-50 bg-background/70 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Mic size={15} />
          </div>
          <span className="text-lg font-extrabold tracking-tight">speacy</span>
        </div>
        <nav className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold hover:scale-105 active:scale-95 transition-all shadow-sm"
          >
            Sign In
          </Link>
        </nav>
      </header>

      <main className="flex-1 w-full flex flex-col items-center">
        {/* ── Hero ── */}
        <section className="w-full max-w-3xl mx-auto px-6 pt-20 pb-16 md:pt-32 md:pb-24 flex flex-col items-center text-center gap-6 relative z-10">
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide"
          >
            <GraduationCap size={14} />
            <span>AI4Ed Research Lab</span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1]"
          >
            Your AI-Powered{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500">
              Oral Exam
            </span>{" "}
            Companion
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto"
          >
            Practice speaking through your ideas with an AI that listens, asks
            follow-up questions, and helps you actually understand the material
            — not just memorize it.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-4"
          >
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-base shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              Get Started
              <ArrowRight
                size={18}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </motion.div>
        </section>

        {/* ── How It Works ── */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14 md:mb-20"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold tracking-wide mb-4">
              <Sparkles size={14} className="text-indigo-500" />
              How it works
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Three steps. Zero stress.
            </h2>
            <p className="text-muted-foreground text-base max-w-lg mx-auto">
              No complicated setup. Your professor handles the course — you just
              show up, speak, and learn.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                className="group relative rounded-2xl border border-border bg-background/80 backdrop-blur-sm p-7 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300"
              >
                {/* Step Number */}
                <span className="text-[11px] font-bold tracking-widest text-muted-foreground/50 uppercase mb-5 block">
                  Step {step.num}
                </span>

                {/* Icon */}
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${step.accent} flex items-center justify-center text-white mb-5 shadow-md group-hover:scale-110 transition-transform duration-300`}
                >
                  <step.icon size={20} />
                </div>

                <h3 className="text-lg font-bold tracking-tight mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── University Trust ── */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-5xl mx-auto px-6 pb-16 md:pb-24"
        >
          <div className="rounded-2xl border border-border bg-muted/30 backdrop-blur-sm px-8 py-10 md:py-12 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center">
              <GraduationCap
                size={24}
                className="text-indigo-500"
              />
            </div>
            <h3 className="text-xl font-bold tracking-tight">
              Built for Willamette University
            </h3>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Speacy is a research project exploring how AI-driven oral exams
              can help students develop deeper understanding. Sign in with your
              university Google account to get started.
            </p>
            <Link
              href="/login"
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-4"
            >
              Sign in with Google <ArrowRight size={14} />
            </Link>
          </div>
        </motion.section>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-border py-8 text-center text-muted-foreground text-xs bg-background/80 backdrop-blur-sm">
        <p>&copy; {new Date().getFullYear()} Speacy &middot; Willamette University</p>
      </footer>
    </div>
  );
}
