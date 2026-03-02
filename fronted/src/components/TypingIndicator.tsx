"use client";

interface TypingIndicatorProps {
  name?: string;
}

export default function TypingIndicator({ name }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 mt-3 ml-9">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-muted dark:bg-slate-800 px-4 py-2.5 shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s] [animation-duration:0.6s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s] [animation-duration:0.6s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-duration:0.6s]" />
      </div>
      {name && (
        <span className="text-[10px] text-muted-foreground">
          {name} escribiendo...
        </span>
      )}
    </div>
  );
}
