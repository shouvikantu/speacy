"use client";

import { useState, Suspense } from "react";
import { signInWithGoogle } from "./actions";
import { Zap, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// A small component to safely use useSearchParams inside Suspense
function AuthCard() {
    const searchParams = useSearchParams();
    const errorParam = searchParams.get("error");
    const error = errorParam === "unauthorized_email"
        ? "Only willamette.edu email addresses are allowed."
        : null;

    const [pending, setPending] = useState(false);

    return (
        <div className="w-full max-w-[420px] px-6 relative z-10 animate-fade-in-up">
            <div className="premium-card relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-indigo-400 opacity-80" />
                <div className="p-8 md:p-10 flex flex-col gap-8">
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 mx-auto flex items-center justify-center mb-6 shadow-md shadow-primary/20">
                            <Zap size={24} className="text-white fill-white" />
                        </div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-foreground mb-2">
                            Welcome
                        </h1>
                        <p className="text-sm text-muted-foreground font-medium">
                            Sign in to access your dashboard.
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium animate-fade-in-up">
                            <AlertCircle size={16} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    <form
                        className="flex flex-col gap-5"
                        action={async () => {
                            setPending(true);
                            await signInWithGoogle();
                            // We don't necessarily setPending(false) here because it redirects away
                        }}
                    >
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={pending}
                                className="w-full py-3 rounded-xl bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50 font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:pointer-events-none dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                    <path d="M1 1h22v22H1z" fill="none" />
                                </svg>
                                {pending ? "Connecting..." : "Continue with Google"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center font-sans bg-background relative overflow-hidden transition-colors duration-300">
            {/* Subtle Background Mesh */}
            <div className="absolute top-0 inset-x-0 h-full bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none z-0" />
            <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none z-0 opacity-50 dark:opacity-20" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none z-0 opacity-50 dark:opacity-20" />

            {/* Top Navigation */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
                <Link href="/" className="text-xl font-extrabold tracking-tight text-foreground hover:opacity-80 transition-opacity">
                    speacy
                </Link>
                <div className="bg-background/80 backdrop-blur-sm rounded-full border border-border/50 shadow-sm p-1">
                    <ThemeToggle />
                </div>
            </div>

            <Suspense fallback={<div className="w-full max-w-[420px] px-6 relative z-10" />}>
                <AuthCard />
            </Suspense>
        </div>
    );
}
