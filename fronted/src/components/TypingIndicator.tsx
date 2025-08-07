"use client";

interface TypingIndicatorProps {
  name?: string;
}

export default function TypingIndicator({ name }: TypingIndicatorProps) {
  return (
    <div className="flex items-center space-x-2 p-2 text-muted-foreground text-sm">
      {name && <span>{name} está escribiendo</span>}
      <span className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
      <span className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
      <span className="h-2 w-2 rounded-full bg-current animate-bounce" />
    </div>
  );
}