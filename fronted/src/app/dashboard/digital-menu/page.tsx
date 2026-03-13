"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { queryKeys } from "@/lib/query-keys"
import {
  Palette,
  Store,
  Clock,
  FolderTree,
  UtensilsCrossed,
  MapPin,
  Share2,
  Save,
  Loader2,
  ChevronDown,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { PageGuideButton } from "@/components/page-guide-dialog"
import { DIGITAL_MENU_GUIDE_STEPS } from "./digital-menu-guide-steps"
import { useMenuConfig } from "./use-menu-config"
import {
  getMenuCategories,
  getMenuProducts,
  type MenuConfigData,
  type MenuCategory,
  type MenuProduct,
} from "./digital-menu.api"
import { AppearanceSection } from "./sections/appearance-section"
import { BrandingSection } from "./sections/branding-section"
import { HoursSection } from "./sections/hours-section"
import { CategoriesSection } from "./sections/categories-section"
import { DishesSection } from "./sections/dishes-section"
import { FooterSection } from "./sections/footer-section"
import { SharingSection } from "./sections/sharing-section"

type SectionId = "branding" | "appearance" | "hours" | "categories" | "dishes" | "footer" | "sharing"

const SECTIONS: { id: SectionId; label: string; icon: typeof Palette }[] = [
  { id: "branding", label: "Marca", icon: Store },
  { id: "appearance", label: "Apariencia", icon: Palette },
  { id: "hours", label: "Horarios", icon: Clock },
  { id: "categories", label: "Categorias", icon: FolderTree },
  { id: "dishes", label: "Platos", icon: UtensilsCrossed },
  { id: "footer", label: "Contacto y Redes", icon: MapPin },
  { id: "sharing", label: "Compartir", icon: Share2 },
]

const SECTION_STORAGE_KEY = "dashboard.digital-menu.section"

function getStoredSection(): SectionId {
  if (typeof window === "undefined") return "branding"
  try {
    const stored = window.sessionStorage.getItem(SECTION_STORAGE_KEY)
    if (stored && SECTIONS.some((s) => s.id === stored)) return stored as SectionId
  } catch {}
  return "branding"
}

export default function DigitalMenuPage() {
  const [activeSection, setActiveSection] = useState<SectionId>(getStoredSection)
  const { config, isLoading, isSaving, save } = useMenuConfig()
  const { selection } = useTenantSelection()

  // Local draft state for editing
  const [draft, setDraft] = useState<MenuConfigData | null>(null)

  // Sync config → draft when loaded
  useEffect(() => {
    if (config && !draft) setDraft(config)
  }, [config, draft])

  // Persist active section
  useEffect(() => {
    try {
      window.sessionStorage.setItem(SECTION_STORAGE_KEY, activeSection)
    } catch {}
  }, [activeSection])

  // Fetch categories and products for editor
  const categoriesQuery = useQuery<MenuCategory[]>({
    queryKey: [...queryKeys.categories.root(selection.orgId, selection.companyId), "menu-editor"],
    queryFn: getMenuCategories,
    enabled: selection.orgId !== null,
  })

  const productsQuery = useQuery<MenuProduct[]>({
    queryKey: [...queryKeys.products.root(selection.orgId, selection.companyId), "menu-editor"],
    queryFn: getMenuProducts,
    enabled: selection.orgId !== null,
  })

  const handleChange = useCallback((patch: Partial<MenuConfigData>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const handleSave = useCallback(() => {
    if (!draft) return
    save(draft)
    // After save, draft will re-sync from config via query cache
  }, [draft, save])

  const isDirty = useMemo(() => {
    if (!config || !draft) return false
    return JSON.stringify(config) !== JSON.stringify(draft)
  }, [config, draft])

  if (isLoading || !draft) {
    return <DigitalMenuSkeleton />
  }

  return (
    <div className="min-h-screen bg-background w-full min-w-0 overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Carta Digital</h1>
            <PageGuideButton
              steps={DIGITAL_MENU_GUIDE_STEPS}
              tooltipLabel="Guia de la carta"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="cursor-pointer gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Mobile section selector */}
        <MobileSectionSelector
          activeSection={activeSection}
          onSelect={setActiveSection}
        />

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block h-fit sticky top-24 space-y-1">
            {SECTIONS.map((section) => {
              const Icon = section.icon
              const isActive = section.id === activeSection
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`
                    flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left cursor-pointer
                    transition-colors duration-150
                    ${isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  <Icon
                    className={`h-4 w-4 flex-shrink-0 ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span className="text-sm">{section.label}</span>
                </button>
              )
            })}
          </aside>

          {/* Content area */}
          <main className="w-full min-w-0 overflow-hidden">
            <div key={activeSection} className="animate-fade-in">
              {activeSection === "branding" && (
                <BrandingSection config={draft} onChange={handleChange} />
              )}
              {activeSection === "appearance" && (
                <AppearanceSection config={draft} onChange={handleChange} />
              )}
              {activeSection === "hours" && (
                <HoursSection config={draft} onChange={handleChange} />
              )}
              {activeSection === "categories" && (
                <CategoriesSection
                  config={draft}
                  onChange={handleChange}
                  availableCategories={categoriesQuery.data ?? []}
                />
              )}
              {activeSection === "dishes" && (
                <DishesSection
                  config={draft}
                  onChange={handleChange}
                  products={productsQuery.data ?? []}
                />
              )}
              {activeSection === "footer" && (
                <FooterSection config={draft} onChange={handleChange} />
              )}
              {activeSection === "sharing" && (
                <SharingSection
                  config={draft}
                  onChange={handleChange}
                  orgId={selection.orgId}
                  companyId={selection.companyId}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Sticky save bar (mobile) */}
      {isDirty && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-sm px-4 py-3">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full cursor-pointer gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      )}
    </div>
  )
}

/* ─── Mobile Section Selector ────────────────────────────────────────── */

function MobileSectionSelector({
  activeSection,
  onSelect,
}: {
  activeSection: SectionId
  onSelect: (id: SectionId) => void
}) {
  const [open, setOpen] = useState(false)
  const activeItem = SECTIONS.find((s) => s.id === activeSection)
  const ActiveIcon = activeItem?.icon ?? Palette

  return (
    <div className="lg:hidden mb-4 w-full min-w-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-left cursor-pointer transition-colors hover:bg-muted/50 active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground flex-shrink-0">
            <ActiveIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{activeItem?.label ?? "Seleccionar"}</p>
            <p className="text-[11px] text-muted-foreground">
              {SECTIONS.indexOf(activeItem!) + 1} de {SECTIONS.length} secciones
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-[400px] opacity-100 mt-2" : "max-h-0 opacity-0"
        }`}
      >
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {SECTIONS.map((section, idx) => {
            const Icon = section.icon
            const isActive = section.id === activeSection
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  onSelect(section.id)
                  setOpen(false)
                }}
                className={`
                  flex w-full items-center gap-3 px-3.5 py-2.5 text-left cursor-pointer transition-colors
                  ${isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"}
                  ${idx < SECTIONS.length - 1 ? "border-b border-border/50" : ""}
                `}
              >
                <Icon
                  className={`h-4 w-4 flex-shrink-0 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span className={`text-sm ${isActive ? "font-semibold" : "font-normal"}`}>
                  {section.label}
                </span>
                {isActive && (
                  <Check className="h-3.5 w-3.5 ml-auto text-primary flex-shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─── Skeleton ───────────────────────────────────────────────────────── */

function DigitalMenuSkeleton() {
  return (
    <div className="min-h-screen bg-background w-full min-w-0">
      <header className="sticky top-0 z-40 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </header>
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-2.5">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4" style={{ width: `${70 + i * 12}px` }} />
              </div>
            ))}
          </aside>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72 mt-1" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
