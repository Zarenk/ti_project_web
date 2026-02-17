"use client"

import { useState } from "react"
import { CalendarIcon, Check, ChevronsUpDown, UserPlus } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

type Option = { id: number; name: string }
type ClientOption = { id: number; name: string; type: string; typeNumber: string }

type SaleContextBarProps = {
  stores: Option[]
  clients: ClientOption[]
  storeId: number | null
  /** undefined = not selected yet, null = "Publico General", number = specific client */
  clientId: number | null | undefined
  saleDate: Date
  onStoreChange: (id: number) => void
  onClientChange: (id: number | null) => void
  onDateChange: (date: Date) => void
  loading?: boolean
}

/* ─── Reusable combobox field ─── */
function ComboboxField({
  label,
  placeholder,
  searchPlaceholder,
  emptyText,
  options,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  searchPlaceholder: string
  emptyText: string
  options: Option[]
  value: number | null
  onChange: (id: number) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.id === value)

  return (
    <div className="min-w-0 flex-1 basis-[140px] space-y-1">
      <Label className="text-xs">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full cursor-pointer justify-between text-sm"
          >
            <span className="truncate">
              {selected?.name || placeholder}
            </span>
            <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0"
          style={{ width: "var(--radix-popover-trigger-width)" }}
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    className="cursor-pointer"
                    onSelect={() => {
                      onChange(option.id)
                      setOpen(false)
                    }}
                  >
                    {option.name}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value === option.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/* ─── Client combobox with "Publico General" default ─── */
function ClientComboboxField({
  clients,
  clientId,
  onClientChange,
}: {
  clients: ClientOption[]
  clientId: number | null | undefined
  onClientChange: (id: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const notSelected = clientId === undefined
  const selected = clientId != null
    ? clients.find((c) => c.id === clientId)
    : null
  const displayName = notSelected
    ? "Seleccionar cliente..."
    : selected?.name ?? "Publico General"

  return (
    <div className="min-w-0 flex-1 basis-[140px] space-y-1">
      <Label className="text-xs">Cliente</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full cursor-pointer justify-between text-sm",
              notSelected && "text-muted-foreground",
            )}
          >
            <span className="truncate">{displayName}</span>
            <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0"
          style={{ width: "var(--radix-popover-trigger-width)" }}
        >
          <Command>
            <CommandInput placeholder="Buscar cliente..." />
            <CommandList>
              <CommandEmpty>No se encontraron clientes</CommandEmpty>
              <CommandGroup>
                {/* Publico General option (always first) */}
                <CommandItem
                  value="__publico_general__"
                  className="cursor-pointer font-medium"
                  onSelect={() => {
                    onClientChange(null)
                    setOpen(false)
                  }}
                >
                  <UserPlus className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  Publico General
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      clientId === null ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Clientes registrados">
                {clients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={`${client.name} ${client.typeNumber}`}
                    className="cursor-pointer"
                    onSelect={() => {
                      onClientChange(client.id)
                      setOpen(false)
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{client.name}</span>
                      {client.typeNumber && (
                        <span className="text-[10px] text-muted-foreground">
                          {client.type}: {client.typeNumber}
                        </span>
                      )}
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        clientId === client.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function SaleContextBar({
  stores,
  clients,
  storeId,
  clientId,
  saleDate,
  onStoreChange,
  onClientChange,
  onDateChange,
  loading,
}: SaleContextBarProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)

  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-3",
        loading && "pointer-events-none opacity-60",
      )}
    >
      <ComboboxField
        label="Tienda"
        placeholder="Seleccionar tienda..."
        searchPlaceholder="Buscar tienda..."
        emptyText="No se encontraron tiendas"
        options={stores}
        value={storeId}
        onChange={onStoreChange}
      />

      <ClientComboboxField
        clients={clients}
        clientId={clientId}
        onClientChange={onClientChange}
      />

      <div className="w-full min-w-0 sm:w-[160px] space-y-1">
        <Label className="text-xs">Fecha</Label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full cursor-pointer justify-start text-left text-sm font-normal"
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {format(saleDate, "dd MMM yyyy", { locale: es })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={saleDate}
              onSelect={(date) => {
                if (date) {
                  onDateChange(date)
                  setCalendarOpen(false)
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
