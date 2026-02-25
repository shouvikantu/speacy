import clsx from "clsx";
import { Terminal, Sparkles } from "lucide-react";

interface CodePanelProps {
    code: string;
    language: string;
    isEditable?: boolean;
    onChange?: (code: string) => void;
    className?: string;
}

export function CodePanel({
    code,
    language,
    isEditable = false,
    onChange,
    className,
}: CodePanelProps) {
    return (
        <div className={clsx("flex flex-col rounded-xl overflow-hidden bg-background border border-border shadow-sm", className)}>
            {/* Clean Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-mono font-medium text-muted-foreground">
                        <Terminal size={14} className="text-primary" />
                        <span>editor.exe</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground bg-muted px-2 py-1 rounded border border-border">
                        {language}
                    </span>
                    {isEditable && (
                        <span className="flex items-center gap-1 text-[10px] text-primary/80 font-bold tracking-wider animate-pulse">
                            <Sparkles size={10} />
                            EDIT MODE
                        </span>
                    )}
                </div>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed relative bg-background">
                {/* Line Numbers Background */}
                <div className="absolute left-0 top-0 bottom-0 w-10 bg-muted/30 border-r border-border pointer-events-none" />

                <div className="pl-8 relative z-10 h-full">
                    {isEditable ? (
                        <textarea
                            value={code}
                            onChange={(e) => onChange?.(e.target.value)}
                            className="w-full h-full min-h-[200px] resize-none bg-transparent p-0 text-foreground focus:outline-none placeholder-muted-foreground selection:bg-primary/20"
                            spellCheck={false}
                        />
                    ) : (
                        <pre className="whitespace-pre-wrap text-foreground font-medium">{code}</pre>
                    )}
                </div>
            </div>

            {/* Footer Status Bar */}
            <div className="px-4 py-2 bg-muted/30 border-t border-border flex justify-between items-center text-[10px] text-muted-foreground font-mono font-medium tracking-wider">
                <span>UTF-8</span>
                <span>{code.length} chars</span>
            </div>
        </div>
    );
}
