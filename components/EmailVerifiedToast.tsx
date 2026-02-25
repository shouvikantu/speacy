"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle, X } from "lucide-react";

export function EmailVerifiedToast() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const isVerified = searchParams.get("verified") === "true";
    const [show, setShow] = useState(isVerified);

    useEffect(() => {
        if (isVerified) {
            // Clean up the URL by removing the ?verified=true parameter
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete("verified");

            const newUrl = window.location.pathname + (newParams.toString() ? `?${newParams.toString()}` : "");

            // Wait a brief moment before removing param so React doesn't unmount this component immediately
            setTimeout(() => {
                router.replace(newUrl, { scroll: false });
            }, 100);

            // Auto-dismiss the toast after 5 seconds
            const timer = setTimeout(() => setShow(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [isVerified, router, searchParams]);

    if (!show) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-emerald-500/90 backdrop-blur-md text-white px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-400/20">
                <CheckCircle size={22} className="text-white drop-shadow-sm" />
                <span className="font-semibold tracking-wide text-[15px] drop-shadow-sm">Email confirmed successfully!</span>
                <button
                    onClick={() => setShow(false)}
                    className="ml-3 p-1 hover:bg-white/20 rounded-full transition-colors focus:outline-none"
                    aria-label="Close message"
                >
                    <X size={16} strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
}
