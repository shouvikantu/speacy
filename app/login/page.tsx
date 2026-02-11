"use client";

import { useState } from "react";
import { login, signup } from "./actions";
import { Zap } from "lucide-react";

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);

    return (
        <div className="flex h-screen items-center justify-center relative overflow-hidden bg-black font-sans">
            {/* Dynamic Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background z-0" />
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-20 z-0 pointer-events-none" />

            <div className="w-full max-w-md rounded-2xl glass-panel p-1 shadow-2xl relative z-10 backdrop-blur-xl border border-white/10 flex flex-col">

                {/* Toggle Tabs */}
                <div className="grid grid-cols-2 p-1 gap-1 bg-black/40 rounded-t-2xl">
                    <button
                        onClick={() => setIsLogin(true)}
                        className={`py-3 text-sm font-bold rounded-xl transition-all ${isLogin ? "bg-white/10 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                        Log In
                    </button>
                    <button
                        onClick={() => setIsLogin(false)}
                        className={`py-3 text-sm font-bold rounded-xl transition-all ${!isLogin ? "bg-white/10 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                        Sign Up
                    </button>
                </div>

                <form className="p-8 flex flex-col gap-6">
                    <div className="text-center mb-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-600 mx-auto flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
                            <Zap size={24} className="text-white fill-white" />
                        </div>
                        <h2 className="text-2xl font-black text-white">
                            {isLogin ? "Welcome Back" : "Create Account"}
                        </h2>
                        <p className="text-sm text-zinc-400 mt-1">
                            {isLogin ? "Enter your credentials to access your account" : "Start your journey with Speacy today"}
                        </p>
                    </div>

                    <div className="space-y-4">
                        {!isLogin && (
                            <div>
                                <label htmlFor="full_name" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">
                                    Full Name
                                </label>
                                <input
                                    id="full_name"
                                    name="full_name"
                                    type="text"
                                    required={!isLogin}
                                    className="w-full rounded-xl bg-zinc-900/50 border border-white/10 px-4 py-3 text-white placeholder-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                                    placeholder="John Doe"
                                />
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="w-full rounded-xl bg-zinc-900/50 border border-white/10 px-4 py-3 text-white placeholder-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                                placeholder="student@university.edu"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="w-full rounded-xl bg-zinc-900/50 border border-white/10 px-4 py-3 text-white placeholder-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="mt-2">
                        <button
                            formAction={isLogin ? login : signup}
                            className="w-full rounded-xl bg-gradient-to-r from-primary to-blue-600 px-4 py-3.5 text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/25 active:scale-[0.98]"
                        >
                            {isLogin ? "Log In" : "Create Account"}
                        </button>
                    </div>

                    {!isLogin && (
                        <p className="text-center text-xs text-zinc-500 px-4">
                            By signing up, you agree to confirm your email address before accessing the dashboard.
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}
