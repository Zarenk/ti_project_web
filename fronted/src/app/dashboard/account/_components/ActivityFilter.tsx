"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DateRange } from "react-day-picker"
import { CalendarDatePicker } from "@/components/calendar-date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ActivityFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  movement: string
  onMovementChange: (value: string) => void
  date: DateRange | undefined
  onDateChange: (value: DateRange | undefined) => void
  onExport: () => void
  onReset: () => void
}

export default function ActivityFilters({
  search,
  onSearchChange,
  movement,
  onMovementChange,
  date,
  onDateChange,
  onExport,
  onReset,
}: ActivityFiltersProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end">
      <Input
        placeholder="Buscar por descripción..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="md:w-64"
      />
      <Select value={movement} onValueChange={onMovementChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Movimiento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODOS">Todos</SelectItem>
          <SelectItem value="INGRESO">Ingreso</SelectItem>
          <SelectItem value="EGRESO">Egreso</SelectItem>
        </SelectContent>
      </Select>
      <CalendarDatePicker
        className="h-9 w-[240px]"
        variant="outline"
        date={date || { from: undefined, to: undefined }}
        onDateSelect={onDateChange}
      />
      <Button onClick={onExport} className="bg-cyan-600 text-white hover:bg-cyan-700">
        Exportar CSV
      </Button>
      <Button variant="ghost" onClick={onReset}>
        Limpiar
      </Button>
    </div>
  )
}