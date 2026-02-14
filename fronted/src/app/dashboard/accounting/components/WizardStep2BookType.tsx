'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BookOpen, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardStep2BookTypeProps {
  selectedFormat?: '5.1' | '6.1';
  onFormatChange: (format: '5.1' | '6.1') => void;
}

export function WizardStep2BookType({
  selectedFormat,
  onFormatChange,
}: WizardStep2BookTypeProps) {
  const formats = [
    {
      value: '5.1' as const,
      icon: FileText,
      title: 'Libro Diario (5.1)',
      description: 'Registro cronológico de todas tus operaciones del mes',
      details: 'Incluye fecha, cuenta contable, debe, haber y descripción de cada movimiento',
      recommended: true,
    },
    {
      value: '6.1' as const,
      icon: BookOpen,
      title: 'Libro Mayor (6.1)',
      description: 'Resumen de movimientos agrupados por cuenta contable',
      details: 'Muestra el acumulado de cada cuenta: efectivo, ventas, compras, etc.',
      recommended: false,
    },
  ];

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
          <BookOpen className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Paso 2: Elige el tipo de libro</h3>
        <p className="text-sm text-muted-foreground">
          Selecciona el formato que necesitas presentar a SUNAT
        </p>
      </div>

      <RadioGroup
        value={selectedFormat}
        onValueChange={(value) => onFormatChange(value as '5.1' | '6.1')}
        className="space-y-3"
      >
        {formats.map((format) => {
          const Icon = format.icon;
          const isSelected = selectedFormat === format.value;

          return (
            <div key={format.value} className="relative">
              <RadioGroupItem
                value={format.value}
                id={format.value}
                className="peer sr-only"
              />
              <Label
                htmlFor={format.value}
                className={cn(
                  'flex cursor-pointer rounded-lg border-2 p-4 transition-all',
                  'hover:bg-accent hover:border-primary/50',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-muted'
                )}
              >
                <div className="flex gap-4 w-full">
                  <div className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {format.title}
                      </span>
                      {format.recommended && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Recomendado
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {format.description}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {format.details}
                    </p>
                  </div>
                </div>
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      <div className="rounded-lg bg-muted p-4 space-y-2">
        <p className="text-sm font-medium">💡 ¿Cuál debo elegir?</p>
        <p className="text-sm text-muted-foreground">
          Para la mayoría de empresas, el <strong>Libro Diario (5.1)</strong> es suficiente.
          Solo necesitas el Libro Mayor si SUNAT te lo solicita específicamente o si tu
          contador te lo indica.
        </p>
      </div>
    </div>
  );
}
