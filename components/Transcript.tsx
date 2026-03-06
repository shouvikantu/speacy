import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import { Bot, User as UserIcon } from "lucide-react";

interface Message {
  role: string;
  content: string;
}

interface TranscriptProps {
  messages: Message[];
}

export function Transcript({ messages }: TranscriptProps) {
  return (
    <div className="flex flex-col gap-5 p-2">
      {messages.map((msg, idx) => {
        const isUser = msg.role === "user";
        const prevMsg = idx > 0 ? messages[idx - 1] : null;
        const isSameRole = prevMsg?.role === msg.role;

        return (
          <div
            key={idx}
            className={clsx(
              "flex gap-3 w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
              isUser ? "flex-row-reverse" : "flex-row",
              // Tighter spacing when same role speaks consecutively
              isSameRole && "mt-[-8px]"
            )}
          >
            {/* Avatar — hide for consecutive same-role messages */}
            <div className={clsx("w-8 shrink-0", isSameRole && "invisible")}>
              <div className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center border shadow-sm",
                isUser
                  ? "bg-secondary text-secondary-foreground border-border"
                  : "bg-primary text-primary-foreground border-primary/30"
              )}>
                {isUser ? <UserIcon size={14} strokeWidth={2.5} /> : <Bot size={16} />}
              </div>
            </div>

            {/* Bubble + Label */}
            <div className={clsx("flex flex-col max-w-[80%]", isUser ? "items-end" : "items-start")}>
              {/* Role label — only on first message of a group */}
              {!isSameRole && (
                <span className={clsx(
                  "text-[10px] font-bold uppercase tracking-widest mb-1 px-1",
                  isUser ? "text-muted-foreground" : "text-primary/70"
                )}>
                  {isUser ? "You" : "Examiner"}
                </span>
              )}

              {/* Message Bubble */}
              <div
                className={clsx(
                  "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm transition-colors",
                  isUser
                    ? "bg-muted/80 border border-border/60 text-foreground rounded-tr-md"
                    : "bg-primary/5 border border-primary/10 text-foreground rounded-tl-md",
                  isSameRole && isUser && "rounded-tr-2xl",
                  isSameRole && !isUser && "rounded-tl-2xl"
                )}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground prose-p:leading-relaxed prose-p:my-0.5 [&>p]:m-0">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
