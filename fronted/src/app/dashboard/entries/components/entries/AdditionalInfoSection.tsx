'use client'

import { useState } from 'react'
import { CalendarIcon, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

interface AdditionalInfoSectionProps {
  register: any;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  createdAt: Date | null;
  setCreatedAt: (date: Date | null) => void;
  openCalendar: boolean;
  setOpenCalendar: (open: boolean) => void;
  setValue: any;
}

export function AdditionalInfoSection({
  register,
  selectedDate,
  setSelectedDate,
  createdAt,
  setCreatedAt,
  openCalendar,
  setOpenCalendar,
  setValue
}: AdditionalInfoSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="flex-1 flex-col border rounded-md p-2">
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-sm font-medium">Datos Adicionales del Comprobante</Label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed((prev) => !prev)}
          aria-label={`${isCollapsed ? 'Expandir' : 'Contraer'} panel de datos adicionales`}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? 'Mostrar panel' : 'Ocultar panel'}
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              isCollapsed ? '-rotate-90' : 'rotate-0'
            )}
          />
      </Button>
      </div>
      {!isCollapsed && (
        <>
          <Label className="text-sm font-medium py-2">Observacion(es)</Label>
          <Input
            {...register("entry_description", { maxLength: 100 })}
            maxLength={100}
            placeholder="Ingrese una observación (máx. 100 caracteres)"
            title="Describe detalles adicionales sobre el ingreso para futuras consultas"
          />
          <Label className="text-sm font-medium py-2">Fecha de Compra</Label>
          <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[260px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
                title="Selecciona la fecha de compra registrada en el comprobante"
              >
                <CalendarIcon />
                {selectedDate
                  ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: es })
                  : "Selecciona una fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0">
              <Calendar
                mode="single"
                selected={selectedDate || undefined}
                onSelect={(date) => {
                  if (!date || (selectedDate && date.toDateString() === selectedDate.toDateString())) {
                    setOpenCalendar(false); // Solo cierra el calendario, no borra nada
                    return;
                  }
                  setSelectedDate(date || null)
                  setCreatedAt(date || null)
                  setValue("entry_date", date || new Date())
                  setOpenCalendar(false)
                }}
                locale={es}
                disabled={(date) => {
                  const today = new Date()
                  return date > today
                }}
              />
            </PopoverContent>
          </Popover>

      <Label className="text-sm font-medium py-2">Método de Pago</Label>
          <Select
            defaultValue="CASH"
            onValueChange={(value) => setValue('payment_method', value)}
          >
            <SelectTrigger title="Elige cómo se pagará este ingreso (contado o crédito)">
              <SelectValue placeholder="Seleccione un método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH" title="El pago se realiza en el momento del ingreso">Al contado</SelectItem>
              <SelectItem value="CREDIT" title="El pago se realizará a futuro según acuerdo">Crédito</SelectItem>
            </SelectContent>
          </Select>
          <input type="hidden" {...register('payment_method')} />
        </>
      )}
    </div>
  )
}