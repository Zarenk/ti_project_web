/**
 * PATRÓN: Filtros Colapsables en Mobile
 *
 * Cuándo usar: Todas las páginas de listado con múltiples filtros.
 * Los filtros saturan la pantalla en viewports pequeños y deben colapsarse.
 *
 * Estructura (3 zonas):
 * 1. Mobile: Compact bar (sm:hidden) — Búsqueda + botón "Filtros" con badge
 * 2. Mobile: Collapsible panel (sm:hidden) — Panel con transición max-h + opacity
 * 3. Desktop: Full grid (hidden sm:grid) — Layout completo sin cambios
 *
 * Páginas que ya lo implementan:
 * - fronted/src/app/dashboard/sales/page.tsx
 * - fronted/src/app/dashboard/entries/data-table.tsx
 *
 * Imports: SlidersHorizontal, ChevronDown, X de lucide-react
 */

// ── Estado necesario ──
const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

const activeFilterCount = (() => {
  let count = 0;
  if (searchQuery.trim()) count++;
  if (dateRange) count++;
  if (selectedFilter !== "ALL") count++;
  // ... etc
  return count;
})();

// ── Mobile: compact search + filter toggle ──
<div className="flex gap-2 sm:hidden w-full min-w-0">
  <Input
    placeholder="Buscar..."
    className="h-9 text-sm flex-1 min-w-0"
  />
  <Button
    variant={mobileFiltersOpen ? "secondary" : "outline"}
    size="sm"
    className="h-9 gap-1.5 cursor-pointer flex-shrink-0 relative"
    onClick={() => setMobileFiltersOpen((prev) => !prev)}
  >
    <SlidersHorizontal className="h-3.5 w-3.5" />
    <span className="text-xs">Filtros</span>
    {activeFilterCount > 0 && (
      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
        {activeFilterCount}
      </span>
    )}
    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${
      mobileFiltersOpen ? "rotate-180" : ""
    }`} />
  </Button>
</div>

// ── Mobile: collapsible filter panel ──
<div className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${
  mobileFiltersOpen
    ? "max-h-[500px] opacity-100"
    : "max-h-0 opacity-0"
}`}>
  <div className="space-y-2 pt-1 pb-0.5">
    {/* All filter controls stacked vertically */}
    {isFiltered && (
      <Button variant="ghost" size="sm" onClick={() => {
        handleResetFilters();
        setMobileFiltersOpen(false);
      }} className="h-8 w-full text-xs text-muted-foreground cursor-pointer">
        <X className="h-3 w-3 mr-1" /> Limpiar filtros
      </Button>
    )}
  </div>
</div>

// ── Desktop: full filter grid (unchanged) ──
<div className="hidden sm:grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {/* Existing desktop layout exactly as before */}
</div>
