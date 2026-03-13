/**
 * PATRÓN: Consulta SUNAT — Búsqueda DNI/RUC
 *
 * Cuándo usar: Toda sección de cliente que necesite buscar por DNI/RUC en SUNAT.
 * Usa un botón icono junto al selector de cliente que abre un Dialog.
 * NO usar inputs inline separados.
 *
 * Flujo: Botón Search → Dialog → consulta API → auto-crea cliente en BD →
 *        llena campos del formulario → cierra dialog
 *
 * Páginas que ya lo implementan:
 * - fronted/src/app/dashboard/sales/new/sales-form.tsx (referencia original)
 * - fronted/src/app/dashboard/quotes/components/quote-context-bar.tsx
 *
 * API reutilizable: lookupSunatDocument() en fronted/src/app/dashboard/sales/sales.api.tsx
 * Soporta DNI (8 dígitos) y RUC (11 dígitos)
 */

// ── Botón icono junto al selector de cliente ──
<div className="flex items-center gap-1.5">
  <ClientPopover ... className="flex-1 min-w-0" />
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="outline" size="icon"
          className="h-8 w-8 cursor-pointer flex-shrink-0 text-muted-foreground"
          disabled={isReadOnly || loading}
          onClick={() => setSunatDialogOpen(true)}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">Consulta SUNAT</TooltipContent>
    </Tooltip>
  </TooltipProvider>
</div>

// ── Dialog de búsqueda SUNAT ──
<Dialog open={sunatDialogOpen} onOpenChange={...}>
  <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] overflow-hidden">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
        Consulta SUNAT
      </DialogTitle>
      <DialogDescription>
        Ingresa un DNI (8 dígitos) o RUC (11 dígitos)...
      </DialogDescription>
    </DialogHeader>
    <div className="flex gap-2">
      <Input value={...} placeholder="Ej: 20519857538" className="font-mono" autoFocus ... />
      <Button onClick={handleSearch} disabled={loading} className="cursor-pointer flex-shrink-0">
        {loading ? <Loader2 ... /> : <Search ... />}
      </Button>
    </div>
  </DialogContent>
</Dialog>
