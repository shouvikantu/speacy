import Link from "next/link";
import { Mic, BrainCircuit, Activity, ArrowRight, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col font-sans bg-background text-foreground transition-colors duration-300 relative overflow-hidden">

      {/* Subtle Background Mesh / Glow */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none -z-10" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center text-white shadow-md shadow-primary/20">
            <Mic size={16} />
          </div>
          <span className="text-xl font-extrabold tracking-tight">speacy</span>
        </div>
        <nav className="flex items-center gap-4">
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

        {/* Abstract / Hero Section */}
        <section className="w-full max-w-4xl mx-auto px-6 py-24 md:py-32 flex flex-col items-center text-center gap-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-muted-foreground text-xs font-semibold tracking-wide backdrop-blur-sm animate-fade-in-up">
            <Sparkles size={14} className="text-primary" />
            <span>Introducing Process-Based Evaluation</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] text-foreground">
            Formative Assessment, <br className="hidden md:block" />
            Powered by <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">Voice AI.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto font-medium">
            Speacy is an experimental platform leveraging generative AI to conduct Socratic oral exams. Evaluate a student&apos;s <strong className="text-foreground">reasoning process</strong>, rather than just rote recall.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 w-full sm:w-auto">
            <Link
              href="/login"
              className="px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-base transition-all hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group w-full sm:w-auto"
            >
              Try the Platform <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#architecture"
              className="px-8 py-3.5 rounded-full border border-border bg-background hover:bg-muted font-semibold text-base transition-all w-full sm:w-auto flex justify-center text-foreground shadow-sm"
            >
              Discover the Architecture
            </a>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section id="architecture" className="w-full max-w-6xl mx-auto px-6 py-20 md:py-32">

          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4">Beyond the Final Answer</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-medium">Traditional exams measure the product. We map the fundamental understanding through dynamic, AI-driven cross-examination.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Card 1 */}
            <div className="premium-card p-8 group">
              <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center text-foreground mb-6 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Mic size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight text-foreground">Realtime Voice Interface</h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                Seamlessly leverage OpenAI&apos;s Realtime API for rapid, conversational oral assessments.
              </p>
            </div>

            {/* Card 2 */}
            <div className="premium-card p-8 group relative overflow-hidden">
              {/* Decorative Gradient Line inside card */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center text-foreground mb-6 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Activity size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight text-foreground">Observable Signals</h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                We ground evaluations in observable telemetry: response latency, transcript filler words, sentence rhythm, and scaffolding density.
              </p>
            </div>

            {/* Card 3 */}
            <div className="premium-card p-8 group">
              <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center text-foreground mb-6 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <BrainCircuit size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight text-foreground">Socratic Grading</h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                An independent agent evaluates the full transcript post-exam, calculating granular fluency metrics and providing detailed, actionable feedback.
              </p>
            </div>

          </div>
        </section>

      </main>

      <footer className="w-full border-t border-border py-8 text-center text-muted-foreground text-sm bg-background">
        <p className="font-medium">&copy; {new Date().getFullYear()} Speacy Research Project. All rights reserved.</p>
      </footer>
    </div>
  );
}
