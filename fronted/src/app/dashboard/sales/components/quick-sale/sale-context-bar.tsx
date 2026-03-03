"use client"

import { useEffect, useRef, useState } from "react"
import { Building2, CalendarIcon, Check, ChevronsUpDown, Loader2, MapPin, Search, UserPlus, X } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

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
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { lookupSunatDocument, type LookupResponse } from "../../sales.api"
import { createClient } from "../../../clients/clients.api"

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
  onClientCreated?: (client: ClientOption) => void
  onDocumentTypeDetected?: (type: "RUC" | "DNI") => void
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
    <div className="w-full sm:w-auto min-w-0 sm:flex-1 sm:basis-[140px] space-y-1">
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

/* ─── Client combobox with "Publico General" default + inline SUNAT lookup ─── */
function ClientComboboxField({
  clients,
  clientId,
  onClientChange,
  onClientCreated,
  onDocumentTypeDetected,
}: {
  clients: ClientOption[]
  clientId: number | null | undefined
  onClientChange: (id: number | null) => void
  onClientCreated?: (client: ClientOption) => void
  onDocumentTypeDetected?: (type: "RUC" | "DNI") => void
}) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [sunatResult, setSunatResult] = useState<LookupResponse | null>(null)
  const [sunatLoading, setSunatLoading] = useState(false)
  const [sunatError, setSunatError] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Dialog-specific states (separate from inline auto-detect)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogSearchValue, setDialogSearchValue] = useState("")
  const [dialogResults, setDialogResults] = useState<LookupResponse[]>([])
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogRegistering, setDialogRegistering] = useState(false)

  const notSelected = clientId === undefined
  const selected = clientId != null
    ? clients.find((c) => c.id === clientId)
    : null
  const displayName = notSelected
    ? "Seleccionar cliente..."
    : selected?.name ?? "Publico General"

  // Auto-detect DNI (8 digits) or RUC (11 digits) and lookup SUNAT
  useEffect(() => {
    const trimmed = searchValue.trim()
    const isDocument = /^\d{8}$|^\d{11}$/.test(trimmed)

    if (!isDocument) {
      setSunatResult(null)
      setSunatError(null)
      return
    }

    // Skip if client already exists locally
    const existsLocally = clients.some((c) => c.typeNumber === trimmed)
    if (existsLocally) {
      setSunatResult(null)
      setSunatError(null)
      return
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setSunatLoading(true)
      setSunatError(null)
      setSunatResult(null)
      try {
        const result = await lookupSunatDocument(trimmed)
        if (!controller.signal.aborted) {
          setSunatResult(result)
        }
      } catch {
        if (!controller.signal.aborted) {
          setSunatResult(null)
          setSunatError("No encontrado en SUNAT")
        }
      } finally {
        if (!controller.signal.aborted) {
          setSunatLoading(false)
        }
      }
    }, 400)

    return () => {
      clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [searchValue, clients])

  // Reset search state when popover closes
  useEffect(() => {
    if (!open) {
      setSearchValue("")
      setSunatResult(null)
      setSunatError(null)
      setSunatLoading(false)
    }
  }, [open])

  const handleSelectSunatResult = async (result: LookupResponse) => {
    if (isRegistering) return
    setIsRegistering(true)

    try {
      const created = await createClient({
        name: result.name,
        type: result.type,
        typeNumber: result.identifier,
      })

      if (created?.id) {
        onClientCreated?.({
          id: created.id,
          name: created.name,
          type: created.type,
          typeNumber: created.typeNumber,
        })
        onClientChange(created.id)
        onDocumentTypeDetected?.(result.type as "RUC" | "DNI")
        toast.success(`Cliente ${created.name} registrado y seleccionado`)
      }
    } catch (error: any) {
      const isConflict = error?.response?.status === 409
      if (isConflict) {
        // Client already exists in backend — find and select
        const existing = clients.find((c) => c.typeNumber === result.identifier)
        if (existing) {
          onClientChange(existing.id)
          onDocumentTypeDetected?.(result.type as "RUC" | "DNI")
          toast.success("Cliente encontrado y seleccionado")
        } else {
          toast.error("El cliente ya existe pero no se encontró en la lista local")
        }
      } else {
        toast.error("No se pudo registrar el cliente")
      }
    } finally {
      setIsRegistering(false)
      setSunatResult(null)
      setSearchValue("")
      setOpen(false)
    }
  }

  // ─── Dialog handlers ───

  const resetDialog = () => {
    setDialogSearchValue("")
    setDialogResults([])
    setDialogError(null)
    setDialogLoading(false)
    setDialogRegistering(false)
  }

  const handleDialogSearch = async () => {
    const documentValue = dialogSearchValue.trim()
    if (!/^\d{8}$|^\d{11}$/.test(documentValue)) {
      setDialogError("Ingresa un DNI (8 dígitos) o RUC (11 dígitos) para buscar.")
      setDialogResults([])
      return
    }

    setDialogLoading(true)
    setDialogError(null)
    try {
      const result = await lookupSunatDocument(documentValue)
      setDialogResults([result])
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo consultar el documento."
      const isNotFound =
        message.toLowerCase().includes("no se encontraron") ||
        message.toLowerCase().includes("not found")

      if (isNotFound) {
        const isRuc = documentValue.length === 11
        setDialogResults([
          {
            identifier: documentValue,
            name: "(No registrado en la base de datos)",
            address: null,
            status: null,
            type: isRuc ? "RUC" : "DNI",
            raw: {},
          },
        ])
        setDialogError(
          "El documento no fue encontrado en SUNAT. Puedes registrar el cliente manualmente.",
        )
      } else {
        setDialogError(message)
        setDialogResults([])
      }
    } finally {
      setDialogLoading(false)
    }
  }

  const handleDialogSelectResult = async (result: LookupResponse) => {
    if (dialogRegistering) return

    const isPlaceholder = !result.name || result.name.startsWith("(")
    if (isPlaceholder) {
      toast.info("Documento no encontrado en SUNAT. Registra el cliente manualmente.")
      return
    }

    setDialogRegistering(true)

    // Check if client already exists locally
    const existingLocal = clients.find((c) => c.typeNumber === result.identifier)
    if (existingLocal) {
      onClientChange(existingLocal.id)
      onDocumentTypeDetected?.(result.type as "RUC" | "DNI")
      toast.success("Cliente encontrado y seleccionado")
      setDialogOpen(false)
      resetDialog()
      setDialogRegistering(false)
      return
    }

    // Auto-register client
    try {
      const created = await createClient({
        name: result.name,
        type: result.type,
        typeNumber: result.identifier,
      })

      if (created?.id) {
        onClientCreated?.({
          id: created.id,
          name: created.name,
          type: created.type,
          typeNumber: created.typeNumber,
        })
        onClientChange(created.id)
        onDocumentTypeDetected?.(result.type as "RUC" | "DNI")
        toast.success(`Cliente ${created.name} registrado y seleccionado`)
      }
    } catch (error: any) {
      const isConflict = error?.response?.status === 409
      if (isConflict) {
        const existing = clients.find((c) => c.typeNumber === result.identifier)
        if (existing) {
          onClientChange(existing.id)
          onDocumentTypeDetected?.(result.type as "RUC" | "DNI")
          toast.success("Cliente encontrado y seleccionado")
        } else {
          toast.error("El cliente ya existe pero no se encontró en la lista local")
        }
      } else {
        toast.error("No se pudo registrar el cliente")
      }
    } finally {
      setDialogRegistering(false)
      setDialogOpen(false)
      resetDialog()
    }
  }

  return (
    <div className="w-full sm:w-auto min-w-0 sm:flex-1 sm:basis-[140px] space-y-1">
      <Label className="text-xs">Cliente</Label>
      <div className="flex gap-1.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "flex-1 min-w-0 cursor-pointer justify-between text-sm",
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
            <Command shouldFilter={!sunatLoading && !sunatResult}>
              <CommandInput
                placeholder="Buscar cliente o DNI/RUC..."
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty>
                  {sunatLoading
                    ? "Consultando SUNAT..."
                    : sunatError
                      ? sunatError
                      : "No se encontraron clientes"}
                </CommandEmpty>

                {/* Publico General */}
                <CommandGroup>
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

                {/* Registered clients */}
                <CommandGroup heading="Clientes registrados">
                  {clients.map((client) => (
                    <CommandItem
                      key={client.id}
                      value={`${client.name} ${client.typeNumber}`}
                      className="cursor-pointer"
                      onSelect={() => {
                        onClientChange(client.id)
                        onDocumentTypeDetected?.(
                          client.type?.toUpperCase() === "RUC" ? "RUC" : "DNI",
                        )
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

                {/* SUNAT loading */}
                {sunatLoading && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Consultando SUNAT...">
                      <CommandItem disabled className="justify-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="text-sm text-muted-foreground">Buscando...</span>
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}

                {/* SUNAT result */}
                {sunatResult && !sunatLoading && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Resultado SUNAT">
                      <CommandItem
                        value={`__sunat__${sunatResult.identifier}`}
                        className="cursor-pointer"
                        disabled={isRegistering}
                        onSelect={() => handleSelectSunatResult(sunatResult)}
                      >
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Search className="h-3 w-3 shrink-0 text-primary" />
                            <span className="text-sm font-medium truncate">
                              {sunatResult.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground pl-[18px]">
                            {sunatResult.type}: {sunatResult.identifier}
                            {sunatResult.status ? ` · ${sunatResult.status}` : ""}
                          </span>
                        </div>
                        {isRegistering ? (
                          <Loader2 className="ml-auto h-4 w-4 animate-spin shrink-0" />
                        ) : (
                          <span className="ml-auto text-[9px] uppercase font-semibold text-primary shrink-0">
                            Registrar
                          </span>
                        )}
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}

                {/* SUNAT error */}
                {sunatError && !sunatLoading && !sunatResult && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="SUNAT">
                      <CommandItem disabled>
                        <span className="text-xs text-muted-foreground italic">
                          {sunatError}
                        </span>
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* SUNAT search button */}
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 flex-shrink-0 cursor-pointer"
                onClick={() => setDialogOpen(true)}
              >
                <Building2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Consulta SUNAT</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Consulta SUNAT Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetDialog()
        }}
      >
        <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
              Consulta SUNAT
            </DialogTitle>
            <DialogDescription>
              Ingresa un DNI (8 dígitos) o RUC (11 dígitos). Doble clic en el resultado para aplicar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 w-full min-w-0">
            {/* Search input + button */}
            <div className="flex gap-2">
              <Input
                value={dialogSearchValue}
                onChange={(e) => setDialogSearchValue(e.target.value)}
                placeholder="Ej: 20519857538"
                className="font-mono"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void handleDialogSearch()
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleDialogSearch}
                disabled={dialogLoading}
                className="cursor-pointer flex-shrink-0"
              >
                {dialogLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Error display */}
            {dialogError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 w-full min-w-0 overflow-hidden">
                <X className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive break-words">{dialogError}</p>
              </div>
            )}

            {/* "Registrando cliente..." overlay */}
            {dialogRegistering && dialogResults.length > 0 && (
              <div className="flex items-center justify-center gap-2 p-4 rounded-lg border bg-muted/30">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">Registrando cliente...</span>
              </div>
            )}

            {/* Results area */}
            <div className="max-h-72 overflow-y-auto w-full min-w-0">
              {dialogResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border border-dashed text-center">
                  <Search className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Ingresa un documento y presiona buscar.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dialogResults.map((result) => {
                    const isPlaceholder = !result.name || result.name.startsWith("(")
                    return (
                      <div
                        key={result.identifier}
                        className={cn(
                          "p-3 rounded-lg border w-full min-w-0 overflow-hidden",
                          "transition-all duration-200 ease-out",
                          isPlaceholder
                            ? "opacity-60 cursor-not-allowed"
                            : "cursor-pointer hover:bg-primary/5 hover:border-primary/30 hover:shadow-sm active:scale-[0.98]",
                          "animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
                          dialogRegistering && "pointer-events-none opacity-50",
                        )}
                        onDoubleClick={() => handleDialogSelectResult(result)}
                      >
                        <div className="flex items-start justify-between gap-2 w-full min-w-0">
                          <div className="flex flex-col gap-1 w-full min-w-0 overflow-hidden">
                            <p className="text-sm font-semibold break-words leading-snug">
                              {result.name}
                            </p>
                            <p className="text-xs font-mono text-muted-foreground">
                              {result.type === "RUC" ? "RUC" : "DNI"}: {result.identifier}
                            </p>
                          </div>
                          {result.status && (
                            <span
                              className={cn(
                                "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 tracking-wide",
                                result.status === "ACTIVO"
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : "bg-red-500/15 text-red-600 dark:text-red-400",
                              )}
                            >
                              {result.status}
                            </span>
                          )}
                        </div>
                        {result.address && result.address !== "—" && (
                          <div className="flex items-start gap-1.5 mt-2 pt-2 border-t w-full min-w-0 overflow-hidden">
                            <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground break-words leading-relaxed">
                              {result.address}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
  onClientCreated,
  onDocumentTypeDetected,
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
        onClientCreated={onClientCreated}
        onDocumentTypeDetected={onDocumentTypeDetected}
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
                  // Combinar fecha seleccionada con la hora actual
                  const now = new Date();
                  date.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
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
