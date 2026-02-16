import { memo, useMemo } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { QuoteProductCatalogProps } from "../types/quote-types"
import {
  isQuantityEditable,
  normalizeFilterText,
  TAB_LABELS,
} from "../types/quote-types"

export const QuoteProductCatalog = memo(function QuoteProductCatalog({
  tab,
  catalog,
  selection,
  pcCategoryFilter,
  pcProductFilter,
  hardwareCategoryFilter,
  hardwareProductFilter,
  deferredPcFilter,
  deferredHwFilter,
  limitByStock,
  onTabChange,
  onPcCategoryFilterChange,
  onPcProductFilterChange,
  onHardwareCategoryFilterChange,
  onHardwareProductFilterChange,
  onProductToggle,
  isReadOnly,
}: QuoteProductCatalogProps) {
  // Calculate category options
  const pcCategoryOptions = useMemo(() => {
    const categorySet = new Set<string>()
    ;(catalog?.pc ?? []).forEach((section) => {
      section.options.forEach((option) => {
        if (option.categoryName?.trim()) {
          categorySet.add(option.categoryName.trim())
        }
      })
    })
    return Array.from(categorySet).sort((a, b) => a.localeCompare(b, "es"))
  }, [catalog])

  const hardwareCategoryOptions = useMemo(() => {
    const categorySet = new Set<string>()
    ;(catalog?.hardware ?? []).forEach((section) => {
      const skipSection = section.id === "services" || section.id === "warranties"
      if (skipSection) return
      section.options.forEach((option) => {
        const optionCategory = normalizeFilterText(option.categoryName)
        if (optionCategory) {
          categorySet.add(option.categoryName!.trim())
          return
        }
        if (section.title?.trim()) {
          categorySet.add(section.title.trim())
        }
      })
    })
    return Array.from(categorySet).sort((a, b) => a.localeCompare(b, "es"))
  }, [catalog])

  if (!catalog) {
    return (
      <Card className={cn(
        "border border-slate-200/70 bg-white/90 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/70",
        isReadOnly ? "pointer-events-none opacity-80" : "",
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-900 dark:text-slate-100">
            Configuración de la cotización
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-500">Cargando catálogo...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      "border border-slate-200/70 bg-white/90 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/70",
      isReadOnly ? "pointer-events-none opacity-80" : "",
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-900 dark:text-slate-100">
          Configuración de la cotización
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(value) => onTabChange(value as any)}>
          <TabsList className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {Object.entries(TAB_LABELS).map(([key, label]) => (
              <TabsTrigger
                key={key}
                value={key}
                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(catalog).map(([key, sections]) => {
            const isPcTab = key === "pc"
            const isHardwareTab = key === "hardware"
            const activeCategoryFilter = isPcTab ? pcCategoryFilter : hardwareCategoryFilter
            const activeProductFilter = isPcTab ? pcProductFilter : hardwareProductFilter
            const normalizedCategoryFilter = normalizeFilterText(activeCategoryFilter)
            const normalizedProductFilter = normalizeFilterText(
              isPcTab ? deferredPcFilter : isHardwareTab ? deferredHwFilter : activeProductFilter
            )

            const visibleSections = (isPcTab || isHardwareTab)
              ? sections
                  .map((section) => ({
                    ...section,
                    options: section.options.filter((option) => {
                      const fallbackCategory =
                        isHardwareTab && (section.id === "services" || section.id === "warranties")
                          ? ""
                          : section.title
                      const normalizedOptionCategory = normalizeFilterText(
                        option.categoryName || fallbackCategory
                      )
                      const categoryMatches =
                        normalizedCategoryFilter === "all" ||
                        (normalizedOptionCategory.length > 0 &&
                          normalizedOptionCategory === normalizedCategoryFilter)

                      const searchable = [
                        option.name,
                        option.description ?? "",
                        ...(option.specs ?? []),
                      ]
                        .join(" ")
                        .toLowerCase()
                      const nameMatches = searchable.includes(normalizedProductFilter)
                      return categoryMatches && nameMatches
                    }),
                  }))
                  .filter((section) => section.options.length > 0)
              : sections

            const categoryOptions = isPcTab ? pcCategoryOptions : hardwareCategoryOptions

            return (
              <TabsContent key={key} value={key} className="mt-6 space-y-6">
                {isPcTab || isHardwareTab ? (
                  <div className="grid gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-3 md:grid-cols-2 dark:border-slate-800/70 dark:bg-slate-900/60">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Filtrar por categoría
                      </label>
                      <select
                        value={activeCategoryFilter}
                        onChange={(e) => {
                          if (isPcTab) {
                            onPcCategoryFilterChange(e.target.value)
                          } else {
                            onHardwareCategoryFilterChange(e.target.value)
                          }
                        }}
                        className="h-9 w-full cursor-pointer rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-850"
                      >
                        <option value="all">Todas las categorías</option>
                        {categoryOptions.map((cat) => (
                          <option key={cat} value={normalizeFilterText(cat)}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Buscar producto
                      </label>
                      <Input
                        value={activeProductFilter}
                        onChange={(e) => {
                          if (isPcTab) {
                            onPcProductFilterChange(e.target.value)
                          } else {
                            onHardwareProductFilterChange(e.target.value)
                          }
                        }}
                        placeholder="Nombre, marca, modelo..."
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                ) : null}

                {visibleSections.length === 0 && (isPcTab || isHardwareTab) ? (
                  <div className="rounded-xl border border-dashed border-slate-300/70 bg-slate-50/70 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                    No hay productos que coincidan con los filtros en esta sección.
                  </div>
                ) : null}

                {visibleSections.map((section) => (
                  <div key={section.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {section.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {section.description}
                        </p>
                      </div>
                      {selection[section.id]?.length ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                          Seleccionados {selection[section.id]?.length}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {section.options.map((option) => {
                        const isSelected = (selection[section.id] ?? []).some(
                          (item) => item.id === option.id
                        )
                        return (
                          <Tooltip key={option.id}>
                            <TooltipTrigger asChild>
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => onProductToggle(option)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault()
                                    onProductToggle(option)
                                  }
                                }}
                                className={cn(
                                  "group relative flex cursor-pointer gap-4 rounded-2xl border p-4 text-left transition-all",
                                  "border-slate-200/70 bg-white/90 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-lg",
                                  "dark:border-slate-800/70 dark:bg-slate-900/70 dark:hover:border-cyan-700/70",
                                  isSelected &&
                                    "border-cyan-400 bg-cyan-50/60 dark:border-cyan-500/60 dark:bg-cyan-950/30",
                                  (option.id === "service-assembly-free" ||
                                    option.id === "warranty-12-free") &&
                                    "border-emerald-300/70 bg-emerald-50/40 dark:border-emerald-700/60 dark:bg-emerald-950/20"
                                )}
                              >
                                <div className="relative h-20 w-24 overflow-hidden rounded-xl border border-slate-200/70 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                                  <Image
                                    alt={option.name}
                                    src={option.image}
                                    fill
                                    sizes="(max-width: 768px) 40vw, 96px"
                                    className="object-cover"
                                  />
                                  {option.highlight && (
                                    <span className="absolute left-2 top-2 rounded-full bg-cyan-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                                      Pro
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                      {option.name}
                                    </h4>
                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                      {option.price.toFixed(2)}
                                    </span>
                                  </div>
                                  {(option.id === "service-assembly-free" ||
                                    option.id === "warranty-12-free") && (
                                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                                      Incluido
                                    </span>
                                  )}
                                  {option.specs && option.specs.length > 0 && (
                                    <ul className="list-inside list-disc space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                                      {option.specs.slice(0, 3).map((spec, idx) => (
                                        <li key={idx}>{spec}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              {option.description || option.name}
                            </TooltipContent>
                          </Tooltip>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </TabsContent>
            )
          })}
        </Tabs>
      </CardContent>
    </Card>
  )
})
