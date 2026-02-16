'use client';

import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HelpCircle } from 'lucide-react';
import { ACCOUNTING_GLOSSARY } from '@/lib/accounting/glossary';
import { Button } from '@/components/ui/button';

interface EducationalTooltipProps {
  term: string;
}

/**
 * Tooltip educativo de 2 niveles:
 * - Nivel 1: Hover muestra definición breve
 * - Nivel 2: Click abre modal con explicación completa + ejemplo
 */
export function EducationalTooltip({ term }: EducationalTooltipProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const glossaryEntry = ACCOUNTING_GLOSSARY[term];

  if (!glossaryEntry) {
    return null;
  }

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDetailsOpen(true);
              }}
              className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label={`Más información sobre ${glossaryEntry.term}`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">{glossaryEntry.definition}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click para ver más detalles
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Modal de detalles (Nivel 2) */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{glossaryEntry.term}</DialogTitle>
            <DialogDescription className="sr-only">
              Explicación detallada del término {glossaryEntry.term}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <h4 className="text-sm font-semibold mb-2">¿Qué es?</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {glossaryEntry.definition}
              </p>
            </div>

            {glossaryEntry.example && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Ejemplo</h4>
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {glossaryEntry.example}
                  </p>
                </div>
              </div>
            )}

            {glossaryEntry.relatedTerms && glossaryEntry.relatedTerms.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Términos relacionados</h4>
                <div className="flex flex-wrap gap-2">
                  {glossaryEntry.relatedTerms.map((relatedId) => {
                    const related = ACCOUNTING_GLOSSARY[relatedId];
                    if (!related) return null;
                    return (
                      <Button
                        key={relatedId}
                        variant="outline"
                        size="sm"
                        className="text-xs h-auto py-1"
                        onClick={() => {
                          // Close current dialog, wait for animation, then open new one
                          setDetailsOpen(false);
                          setTimeout(() => {
                            // This would need a state management solution to work properly
                            // For now, we'll just close the dialog
                          }, 150);
                        }}
                      >
                        {related.term}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
