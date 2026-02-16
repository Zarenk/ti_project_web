import { memo } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, User, Check, Plus } from "lucide-react"
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
  isReadOnly,
}: QuoteContextBarProps) {
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
              <Popover open={clientOpen} onOpenChange={onClientOpenChange}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full cursor-pointer justify-between"
                    role="combobox"
                    aria-expanded={clientOpen}
                    disabled={isReadOnly}
                  >
                    <span className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      {clientName || "Sin cliente"}
                    </span>
                    <span className="text-xs text-slate-400">Buscar</span>
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
    </>
  )
})
