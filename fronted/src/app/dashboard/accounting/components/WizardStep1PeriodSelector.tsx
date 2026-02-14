'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';

interface WizardStep1PeriodSelectorProps {
  selectedPeriod?: string;
  onPeriodChange: (period: string) => void;
}

export function WizardStep1PeriodSelector({
  selectedPeriod,
  onPeriodChange,
}: WizardStep1PeriodSelectorProps) {
  // Generar opciones de período (últimos 12 meses)
  const generatePeriodOptions = () => {
    const options: Array<{ value: string; label: string }> = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const value = `${year}-${month}`;

      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];

      const label = `${monthNames[date.getMonth()]} ${year}`;
      options.push({ value, label });
    }

    return options;
  };

  const periodOptions = generatePeriodOptions();

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Paso 1: Selecciona el período</h3>
        <p className="text-sm text-muted-foreground">
          Elige el mes del que quieres exportar tus libros contables
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="period">Período a exportar</Label>
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger id="period" className="w-full">
            <SelectValue placeholder="Selecciona un mes..." />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg bg-muted p-4 space-y-2">
        <p className="text-sm font-medium">💡 ¿Qué período debo exportar?</p>
        <p className="text-sm text-muted-foreground">
          Debes exportar el mes que acabas de cerrar. Por ejemplo, si estamos en marzo,
          exporta febrero. SUNAT requiere que presentes tus libros electrónicos antes
          del día 18 del mes siguiente.
        </p>
      </div>
    </div>
  );
}
