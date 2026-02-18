"use client"

import { useState } from "react"
import { ChevronsUpDown, Check, CalendarIcon, Plus, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

type Option = { id: number; name: string }

type ContextBarProps = {
  providers: Option[]
  stores: Option[]
  providerId: number | null
  storeId: number | null
  entryDate: Date
  onProviderChange: (id: number) => void
  onStoreChange: (id: number) => void
  onDateChange: (date: Date) => void
  onCreateProvider?: (data: { name: string; document: string; documentNumber: string }) => Promise<Option>
  onCreateStore?: (data: { name: string; ruc: string }) => Promise<Option>
  loading?: boolean
}

function ComboboxField({
  label,
  placeholder,
  searchPlaceholder,
  emptyText,
  options,
  value,
  onChange,
  createLabel,
  onCreateClick,
}: {
  label: string
  placeholder: string
  searchPlaceholder: string
  emptyText: string
  options: Option[]
  value: number | null
  onChange: (id: number) => void
  createLabel?: string
  onCreateClick?: () => void
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.id === value)

  return (
    <div className="flex-1 min-w-[180px] space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
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
              {createLabel && onCreateClick && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      className="cursor-pointer text-muted-foreground"
                      onSelect={() => {
                        setOpen(false)
                        onCreateClick()
                      }}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      {createLabel}
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function CreateProviderDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: { name: string; document: string; documentNumber: string }) => Promise<Option>
}) {
  const [name, setName] = useState("")
  const [document, setDocument] = useState("RUC")
  const [documentNumber, setDocumentNumber] = useState("")
  const [saving, setSaving] = useState(false)

  const docMaxLength = document === "DNI" ? 8 : document === "RUC" ? 11 : 20
  const docPlaceholder = document === "DNI" ? "12345678" : document === "RUC" ? "20123456789" : "Numero..."

  const isValid =
    name.trim().length >= 3 &&
    documentNumber.trim().length >= (document === "DNI" ? 8 : document === "RUC" ? 11 : 1)

  async function handleSubmit() {
    if (!isValid) return
    setSaving(true)
    try {
      await onCreate({ name: name.trim(), document, documentNumber: documentNumber.trim() })
      onOpenChange(false)
      setName("")
      setDocument("RUC")
      setDocumentNumber("")
    } catch {
      toast.error("Error al crear proveedor")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Nuevo proveedor</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre</Label>
            <Input
              placeholder="Nombre del proveedor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>
          <div className="flex gap-2">
            <div className="w-[120px] space-y-1.5">
              <Label className="text-xs">Documento</Label>
              <Select value={document} onValueChange={setDocument}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RUC" className="cursor-pointer">RUC</SelectItem>
                  <SelectItem value="DNI" className="cursor-pointer">DNI</SelectItem>
                  <SelectItem value="Otro Documento" className="cursor-pointer">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Numero</Label>
              <Input
                placeholder={docPlaceholder}
                value={documentNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "")
                  if (val.length <= docMaxLength) setDocumentNumber(val)
                }}
                maxLength={docMaxLength}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            className="cursor-pointer"
            onClick={handleSubmit}
            disabled={!isValid || saving}
          >
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateStoreDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: { name: string; ruc: string }) => Promise<Option>
}) {
  const [name, setName] = useState("")
  const [ruc, setRuc] = useState("")
  const [saving, setSaving] = useState(false)

  const isValid = name.trim().length >= 3 && ruc.trim().length === 11

  async function handleSubmit() {
    if (!isValid) return
    setSaving(true)
    try {
      await onCreate({ name: name.trim(), ruc: ruc.trim() })
      onOpenChange(false)
      setName("")
      setRuc("")
    } catch {
      toast.error("Error al crear almacen")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Nuevo almacen</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre</Label>
            <Input
              placeholder="Nombre del almacen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">RUC</Label>
            <Input
              placeholder="20123456789"
              value={ruc}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "")
                if (val.length <= 11) setRuc(val)
              }}
              maxLength={11}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            className="cursor-pointer"
            onClick={handleSubmit}
            disabled={!isValid || saving}
          >
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ContextBar({
  providers,
  stores,
  providerId,
  storeId,
  entryDate,
  onProviderChange,
  onStoreChange,
  onDateChange,
  onCreateProvider,
  onCreateStore,
  loading,
}: ContextBarProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [providerDialogOpen, setProviderDialogOpen] = useState(false)
  const [storeDialogOpen, setStoreDialogOpen] = useState(false)

  return (
    <>
      <div
        className={cn(
          "flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-3",
          loading && "pointer-events-none opacity-60",
        )}
      >
        <ComboboxField
          label="Proveedor"
          placeholder="Seleccionar proveedor..."
          searchPlaceholder="Buscar proveedor..."
          emptyText="Sin proveedores."
          options={providers}
          value={providerId}
          onChange={onProviderChange}
          createLabel={onCreateProvider ? "Nuevo proveedor" : undefined}
          onCreateClick={onCreateProvider ? () => setProviderDialogOpen(true) : undefined}
        />

        <ComboboxField
          label="Almacen"
          placeholder="Seleccionar almacen..."
          searchPlaceholder="Buscar almacen..."
          emptyText="Sin almacenes."
          options={stores}
          value={storeId}
          onChange={onStoreChange}
          createLabel={onCreateStore ? "Nuevo almacen" : undefined}
          onCreateClick={onCreateStore ? () => setStoreDialogOpen(true) : undefined}
        />

        <div className="w-full sm:w-[170px] space-y-1.5">
          <Label className="text-xs font-medium">Fecha</Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full cursor-pointer justify-start text-sm font-normal"
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {format(entryDate, "dd MMM yyyy", { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={entryDate}
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

      {onCreateProvider && (
        <CreateProviderDialog
          open={providerDialogOpen}
          onOpenChange={setProviderDialogOpen}
          onCreate={onCreateProvider}
        />
      )}

      {onCreateStore && (
        <CreateStoreDialog
          open={storeDialogOpen}
          onOpenChange={setStoreDialogOpen}
          onCreate={onCreateStore}
        />
      )}
    </>
  )
}
