"use client";

import { useActionState, useState } from "react";
import { login, signup } from "./actions";
import { Zap, Mail, KeyRound, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [loginState, loginAction, loginPending] = useActionState(login, { error: null });
    const [signupState, signupAction, signupPending] = useActionState(signup, { error: null });

    const error = isLogin ? loginState.error : signupState.error;
    const pending = isLogin ? loginPending : signupPending;

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

            <div className="w-full max-w-[420px] px-6 relative z-10 animate-fade-in-up">
                {/* The Premium Auth Card */}
                <div className="premium-card relative overflow-hidden group">

                    {/* Decorative Top Line */}
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-indigo-400 opacity-80" />

                    <div className="p-8 md:p-10 flex flex-col gap-8">

                        <div className="text-center">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 mx-auto flex items-center justify-center mb-6 shadow-md shadow-primary/20">
                                <Zap size={24} className="text-white fill-white" />
                            </div>
                            <h1 className="text-2xl font-extrabold tracking-tight text-foreground mb-2">
                                {isLogin ? "Welcome Back" : "Create an Account"}
                            </h1>
                            <p className="text-sm text-muted-foreground font-medium">
                                {isLogin ? "Enter your details to access your dashboard." : "Start your journey with Speacy today."}
                            </p>
                        </div>

                        {/* Segmented Control for Login/Signup */}
                        <div className="bg-muted p-1 rounded-lg flex relative">
                            <button
                                onClick={() => setIsLogin(true)}
                                className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all z-10 ${isLogin
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                Log In
                            </button>
                            <button
                                onClick={() => setIsLogin(false)}
                                className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all z-10 ${!isLogin
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                Sign Up
                            </button>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium animate-fade-in-up">
                                <AlertCircle size={16} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        <form className="flex flex-col gap-5" action={isLogin ? loginAction : signupAction}>
                            <div className="space-y-4">
                                {!isLogin && (
                                    <div className="space-y-1.5">
                                        <label htmlFor="full_name" className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                                            Full Name
                                        </label>
                                        <input
                                            id="full_name"
                                            name="full_name"
                                            type="text"
                                            required={!isLogin}
                                            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium shadow-sm"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label htmlFor="email" className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Mail size={16} className="text-muted-foreground" />
                                        </div>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium shadow-sm"
                                            placeholder="you@willamette.edu"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="password" className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <KeyRound size={16} className="text-muted-foreground" />
                                        </div>
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium shadow-sm"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={pending}
                                    className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
                                >
                                    {pending ? "Please wait..." : isLogin ? "Log In" : "Create Account"}
                                </button>
                            </div>

                            {!isLogin && (
                                <p className="text-center text-[11px] text-muted-foreground mt-2 font-medium leading-relaxed px-4">
                                    By signing up, you agree to confirm your email before accessing the platform.
                                </p>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
