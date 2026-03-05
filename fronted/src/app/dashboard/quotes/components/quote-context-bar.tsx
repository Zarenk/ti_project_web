import { memo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, ChevronDown, User, Check, Plus, Search, Loader2 } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { QuoteContextBarProps } from "../types/quote-types"

export const QuoteContextBar = memo(function QuoteContextBar({
  storeId,
  stores,
  clients,
  clientName,
  contactName,
  whatsAppPhone,
  clientDocType,
  clientDocNumber,
  clientOpen,
  onStoreChange,
  onClientSelect,
  onClientOpenChange,
  onClientNameChange,
  onContactNameChange,
  onWhatsAppPhoneChange,
  onClientDocTypeChange,
  onClientDocNumberChange,
  onNewClientClick,
  onSunatLookup,
  sunatLookupLoading,
  isReadOnly,
}: QuoteContextBarProps) {
  const [sunatDialogOpen, setSunatDialogOpen] = useState(false)
  const [sunatInput, setSunatInput] = useState("")

  const handleSunatSearch = async () => {
    const value = sunatInput.trim()
    if (!value) return
    await onSunatLookup(value)
    setSunatInput("")
    setSunatDialogOpen(false)
  }

  return (
    <>
      {/* Store Selector */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Select
          value={String(storeId ?? "all")}
          onValueChange={(value) => onStoreChange(value === "all" ? null : Number(value))}
          disabled={isReadOnly}
        >
          <SelectTrigger className="h-6 w-auto gap-1.5 border-none bg-transparent px-1 py-0 text-xs font-medium shadow-none focus:ring-0">
            <span className="text-slate-500 dark:text-slate-400">Tienda:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" className="min-w-[140px]">
            <SelectItem value="all">Todos</SelectItem>
            {stores.map((store) => (
              <SelectItem key={store.id} value={String(store.id)}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Client Section */}
      <Collapsible>
        <Card className="border border-slate-200/70 bg-white/90 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-slate-900 dark:text-slate-100">
                  Cliente
                </CardTitle>
                <ChevronDown className="h-4 w-4 text-slate-400 transition-transform [[data-state=open]>&]:rotate-180" />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-2 pt-0">
              <div className="flex items-center gap-1.5">
                <Popover open={clientOpen} onOpenChange={onClientOpenChange}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-0 cursor-pointer justify-between"
                      role="combobox"
                      aria-expanded={clientOpen}
                      disabled={isReadOnly}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <User className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{clientName || "Sin cliente"}</span>
                      </span>
                      <span className="text-xs text-slate-400 flex-shrink-0">Buscar</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar cliente..." />
                      <CommandList>
                        <CommandEmpty>No hay clientes.</CommandEmpty>
                        <CommandGroup heading="Clientes registrados">
                          {clients.map((client) => (
                            <CommandItem
                              key={client.id}
                              value={client.name}
                              onSelect={() => onClientSelect(client)}
                            >
                              <span className="flex-1">{client.name}</span>
                              {clientName === client.name && (
                                <Check className="h-4 w-4" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandGroup heading="Sin cliente">
                          <CommandItem
                            value="sin-cliente"
                            onSelect={() => {
                              onClientNameChange("")
                              onContactNameChange("")
                              onWhatsAppPhoneChange("")
                              onClientDocTypeChange("")
                              onClientDocNumberChange("")
                              onClientOpenChange(false)
                            }}
                          >
                            Usar sin cliente
                          </CommandItem>
                        </CommandGroup>
                        <CommandGroup heading="Acciones">
                          <CommandItem
                            value="agregar-nuevo-cliente"
                            onSelect={() => {
                              onNewClientClick()
                              onClientOpenChange(false)
                            }}
                            className="text-cyan-600 dark:text-cyan-400"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Agregar nuevo cliente
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 cursor-pointer flex-shrink-0 text-muted-foreground"
                        disabled={isReadOnly || sunatLookupLoading}
                        onClick={() => setSunatDialogOpen(true)}
                      >
                        {sunatLookupLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Search className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Consulta SUNAT
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <Input
                value={contactName}
                onChange={(e) => onContactNameChange(e.target.value)}
                placeholder="Contacto"
                className="h-8 text-sm"
                disabled={isReadOnly}
              />

              <Input
                value={whatsAppPhone}
                onChange={(e) => onWhatsAppPhoneChange(e.target.value)}
                placeholder="WhatsApp para envío"
                className="h-8 text-sm"
                disabled={isReadOnly}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* SUNAT Lookup Dialog */}
      <Dialog
        open={sunatDialogOpen}
        onOpenChange={(open) => {
          setSunatDialogOpen(open)
          if (!open) {
            setSunatInput("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
              Consulta SUNAT
            </DialogTitle>
            <DialogDescription>
              Ingresa un DNI (8 dígitos) o RUC (11 dígitos) para buscar y registrar el cliente automáticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 w-full min-w-0">
            <div className="flex gap-2">
              <Input
                value={sunatInput}
                onChange={(e) => setSunatInput(e.target.value)}
                placeholder="Ej: 20519857538"
                className="font-mono"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void handleSunatSearch()
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => void handleSunatSearch()}
                disabled={sunatLookupLoading || !sunatInput.trim()}
                className="cursor-pointer flex-shrink-0"
              >
                {sunatLookupLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            {!sunatInput.trim() && (
              <div className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border border-dashed text-center">
                <Search className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Ingresa un documento y presiona buscar.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})
