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
    <div className="flex flex-col gap-6 p-2">
      {messages.map((msg, idx) => {
        const isUser = msg.role === "user";
        return (
          <div
            key={idx}
            className={clsx(
              "flex gap-4 w-full group",
              isUser ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Avatar */}
            <div className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border mt-1 shadow-sm",
              isUser
                ? "bg-secondary text-secondary-foreground border-border"
                : "bg-primary text-primary-foreground border-border"
            )}>
              {isUser ? <UserIcon size={14} strokeWidth={2.5} /> : <Bot size={16} />}
            </div>

            {/* Message Bubble */}
            <div
              className={clsx(
                "max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm transition-all duration-300",
                isUser
                  ? "bg-muted border border-border text-foreground rounded-tr-none hover:bg-muted/80"
                  : "bg-background border border-border text-foreground rounded-tl-none hover:bg-muted/50"
              )}
            >
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground prose-p:leading-relaxed prose-p:my-1">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
