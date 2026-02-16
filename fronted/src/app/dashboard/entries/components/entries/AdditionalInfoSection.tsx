'use client'

import { useState, useRef, useLayoutEffect } from 'react'
import { CalendarIcon, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface AdditionalInfoSectionProps {
  register: any
  watch: (name: string) => any
  selectedDate: Date | null
  setSelectedDate: (date: Date | null) => void
  createdAt: Date | null
  setCreatedAt: (date: Date | null) => void
  openCalendar: boolean
  setOpenCalendar: (open: boolean) => void
  setValue: any
}

export function AdditionalInfoSection({
  register,
  watch,
  selectedDate,
  setSelectedDate,
  createdAt,
  setCreatedAt,
  openCalendar,
  setOpenCalendar,
  setValue,
}: AdditionalInfoSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const calendarTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [calendarTriggerWidth, setCalendarTriggerWidth] = useState<number | undefined>(undefined)

  useLayoutEffect(() => {
    const updateWidth = () => {
      setCalendarTriggerWidth(calendarTriggerRef.current?.offsetWidth)
    }

    if (typeof window !== 'undefined') {
      updateWidth()
      window.addEventListener('resize', updateWidth)
      return () => window.removeEventListener('resize', updateWidth)
    }

    return undefined
  }, [])

  const renderStatusChip = (filled: boolean, optional = false) => (
    <span
      className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        filled
          ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
          : optional
            ? 'border-slate-200/70 bg-slate-50 text-slate-600 dark:border-slate-800/60 dark:bg-slate-900/60 dark:text-slate-300'
            : 'border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'
      }`}
    >
      {filled ? 'Listo' : optional ? 'Opcional' : 'Requerido'}
    </span>
  )

  const hasValue = (name: string) => {
    const value = watch(name)
    return Boolean(value && String(value).trim().length > 0)
  }

  return (
    <div className="flex-1 flex-col rounded-md border p-2">
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-sm font-medium">Datos Adicionales del Comprobante</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed((prev) => !prev)}
              aria-label={`${isCollapsed ? 'Expandir' : 'Contraer'} panel de datos adicionales`}
              aria-expanded={!isCollapsed}
              className="cursor-pointer transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronDown
                className={cn('h-4 w-4 transition-transform', isCollapsed ? '-rotate-90' : 'rotate-0')}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isCollapsed ? 'Mostrar panel' : 'Ocultar panel'}</TooltipContent>
        </Tooltip>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
          <div className="flex min-w-0 flex-col">
            <Label className="text-sm font-medium py-2">
              Observacion(es)
              {renderStatusChip(hasValue('entry_description'), true)}
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  {...register('entry_description', { maxLength: 200 })}
                  maxLength={200}
                  placeholder="Ingrese una observacion (max. 200 caracteres)"
                  className="w-full transition-colors hover:border-border hover:bg-accent hover:text-foreground"
                />
              </TooltipTrigger>
              <TooltipContent>Describe detalles adicionales del ingreso.</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex min-w-0 flex-col">
            <Label className="text-sm font-medium py-2">
              Fecha de Compra
              {renderStatusChip(hasValue('entry_date'), true)}
            </Label>
            <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full cursor-pointer justify-start text-left font-normal transition-colors hover:border-border hover:bg-accent hover:text-foreground',
                    !selectedDate && 'text-muted-foreground'
                  )}
                  ref={calendarTriggerRef}
                  title="Selecciona la fecha de compra."
                >
                  <CalendarIcon />
                  {selectedDate
                    ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: es })
                    : 'Selecciona una fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" style={{ width: calendarTriggerWidth }}>
                <Calendar
                  mode="single"
                  selected={selectedDate || undefined}
                  onSelect={(date) => {
                    if (!date || (selectedDate && date.toDateString() === selectedDate.toDateString())) {
                      setOpenCalendar(false)
                      return
                    }
                    setSelectedDate(date || null)
                    setCreatedAt(date || null)
                    setValue('entry_date', date || new Date())
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

          <div className="flex min-w-0 flex-col">
            <Label className="text-sm font-medium py-2">
              Metodo de Pago
              {renderStatusChip(hasValue('payment_method'), true)}
            </Label>
            <Select defaultValue="CASH" onValueChange={(value) => setValue('payment_method', value)}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SelectTrigger className="w-full cursor-pointer transition-colors hover:border-border hover:bg-accent hover:text-foreground">
                    <SelectValue placeholder="Seleccione un metodo" />
                  </SelectTrigger>
                </TooltipTrigger>
                <TooltipContent>Define si el pago es contado o credito.</TooltipContent>
              </Tooltip>
              <SelectContent>
                <SelectItem value="CASH">Al contado</SelectItem>
                <SelectItem value="CREDIT">Credito</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" {...register('payment_method')} />
          </div>
        </div>
      )}
    </div>
  )
}
