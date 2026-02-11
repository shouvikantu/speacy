import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function ErrorPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-black text-zinc-100 font-sans relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-red-600/10 blur-[100px] animate-float" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] z-0" />
            </div>

            <div className="w-full max-w-md p-8 rounded-2xl glass-panel border border-red-500/20 shadow-2xl relative z-10 backdrop-blur-xl flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 mb-2">
                    <AlertCircle size={32} />
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                    <p className="text-zinc-400">
                        We encountered an error processing your request. Please try again later.
                    </p>
                </div>

                <Link
                    href="/login"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white font-bold hover:bg-white/10 transition-colors"
                >
                    Back to Login
                </Link>
            </div>
        </div>
    );
}
