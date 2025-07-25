'use client'

import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

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
  return (
    <div className="flex-1 flex-col border rounded-md p-2">                       
      <Label className="text-sm font-medium mb-2">Datos Adicionales del Comprobante</Label>
      <Label className="text-sm font-medium py-2">Observacion(es)</Label>
      <Input
        {...register("entry_description", { maxLength: 100 })}
        maxLength={100}
        placeholder="Ingrese una observación (máx. 100 caracteres)"
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
    </div>
  )
}