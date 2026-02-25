"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

const subscribe = () => () => { };
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle() {
    const { setTheme, resolvedTheme } = useTheme();
    const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    if (!mounted) return <div className="w-9 h-9" />;

    const isDark = resolvedTheme === "dark";

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
        >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
    );
}
