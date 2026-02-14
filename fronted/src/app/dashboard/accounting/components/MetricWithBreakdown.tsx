'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MetricWithBreakdownProps {
  value: ReactNode;
  breakdown: Record<string, string>;
}

/**
 * Wrapper para mostrar métricas con desglose colapsable
 */
export function MetricWithBreakdown({ value, breakdown }: MetricWithBreakdownProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {value}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Ver desglose"
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-1 text-xs text-muted-foreground animate-in slide-in-from-top-1 duration-200">
          {Object.entries(breakdown).map(([key, val]) => (
            <div key={key} className="flex justify-between items-center">
              <span className="opacity-75">{key}:</span>
              <span className="font-medium">{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
