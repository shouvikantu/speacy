import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function ErrorPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground font-sans relative overflow-hidden transition-colors duration-300">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-red-600/10 blur-[100px]" />
            </div>

            <div className="w-full max-w-md p-8 rounded-2xl premium-card border-red-500/20 relative z-10 flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 mb-2">
                    <AlertCircle size={32} />
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
                    <p className="text-muted-foreground">
                        We encountered an error processing your request. Please try again later.
                    </p>
                </div>

                <Link
                    href="/login"
                    className="w-full rounded-xl bg-muted border border-border px-4 py-3 text-foreground font-bold hover:bg-muted/80 transition-colors"
                >
                    Back to Login
                </Link>
            </div>
        </div>
    );
}
