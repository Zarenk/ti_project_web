"use client";

export default function TypingIndicator() {
  return (
    <div className="flex items-center space-x-1 p-2 text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
      <span className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
      <span className="h-2 w-2 rounded-full bg-current animate-bounce" />
    </div>
  );
}