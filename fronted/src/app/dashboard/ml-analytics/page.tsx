"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Activity,
  Brain,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Clock,
  Cog,
  Loader2,
  Package,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Square,
  Timer,
  Users,
  XCircle,
  Zap,
} from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { PageGuideButton } from "@/components/page-guide-dialog"
import { mlAnalyticsGuideSteps } from "./ml-guide-steps"
import { useMLAnalytics } from "./use-ml-analytics"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { DemandForecastResult, BasketRule, PriceCheckResult, ClientSegment, TrainingStatus, MLProduct } from "./ml-analytics.api"

// ── Period options for demand forecast ──────────────────────────────────────

type ForecastPeriod = { key: string; label: string; shortLabel: string; days: number }

const FORECAST_PERIODS: ForecastPeriod[] = [
  { key: "week", label: "Semana", shortLabel: "7D", days: 7 },
  { key: "month", label: "Mes", shortLabel: "30D", days: 30 },
  { key: "quarter", label: "Trimestre", shortLabel: "90D", days: 90 },
]

// ── Section IDs ──────────────────────────────────────────────────────────────

type SectionId = "status" | "demand" | "basket" | "prices" | "segments"

const sections: { id: SectionId; label: string; icon: typeof Brain }[] = [
  { id: "status", label: "Estado de Modelos", icon: Brain },
  { id: "demand", label: "Prediccion de Demanda", icon: Activity },
  { id: "basket", label: "Productos Relacionados", icon: ShoppingBasket },
  { id: "prices", label: "Detector de Precios", icon: ShieldCheck },
  { id: "segments", label: "Segmentos de Clientes", icon: Users },
]

// ── Color palette for charts ─────────────────────────────────────────────────

const SEGMENT_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

// ── Main Page ────────────────────────────────────────────────────────────────

export default function MLAnalyticsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("status")
  const ml = useMLAnalytics()

  if (ml.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!ml.authorized) return null

  return (
    <div className="w-full min-w-0 overflow-hidden">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary flex-shrink-0" />
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Panel de IA</h1>
            <PageGuideButton steps={mlAnalyticsGuideSteps} tooltipLabel="Guia del panel IA" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Modelos de Machine Learning entrenados sobre tus datos transaccionales
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="grid gap-6 lg:gap-8 lg:grid-cols-[260px_1fr] w-full min-w-0">
          {/* Sidebar */}
          <aside className="h-fit lg:sticky lg:top-24">
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                return (
                  <motion.button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors cursor-pointer ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium text-sm">{section.label}</span>
                  </motion.button>
                )
              })}
            </nav>
          </aside>

          {/* Content */}
          <main className="w-full min-w-0 overflow-hidden">
            <div key={activeSection} className="w-full min-w-0 animate-in fade-in slide-in-from-bottom-1 duration-200">
              {activeSection === "status" && (
                <StatusSection
                  status={ml.status}
                  loading={ml.statusLoading}
                  reloading={ml.reloading}
                  onReload={ml.handleReload}
                  trainingStatus={ml.trainingStatus}
                  isTraining={ml.isTraining}
                  onStartTraining={ml.handleStartTraining}
                  onCancelTraining={ml.handleCancelTraining}
                  onToggleCron={ml.handleToggleCron}
                />
              )}
              {activeSection === "demand" && (
                <DemandSection
                  result={ml.demandResult}
                  loading={ml.demandLoading}
                  onSearch={ml.searchDemand}
                  products={ml.products}
                  demandProductIds={ml.demandProductIds}
                />
              )}
              {activeSection === "basket" && (
                <BasketSection
                  rules={ml.basketRules}
                  loading={ml.basketLoading}
                  onSearch={ml.searchBasket}
                  products={ml.products}
                />
              )}
              {activeSection === "prices" && (
                <PriceSection
                  result={ml.priceResult}
                  loading={ml.priceLoading}
                  onSearch={ml.searchPrice}
                  products={ml.products}
                />
              )}
              {activeSection === "segments" && (
                <SegmentsSection
                  segments={ml.segments}
                  loading={ml.segmentsLoading}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Section 1: Model Status
// ══════════════════════════════════════════════════════════════════════════════

const MODEL_LABELS: Record<string, { label: string; description: string }> = {
  demand: { label: "Demanda", description: "Prediccion de demanda por producto (Prophet / Media Movil)" },
  baskets: { label: "Canasta", description: "Reglas de asociacion de productos comprados juntos (Apriori)" },
  prices: { label: "Precios", description: "Deteccion de anomalias estadisticas en precios" },
  products: { label: "Productos", description: "Clasificacion automatica por nombre (TF-IDF + SVM)" },
  clients: { label: "Clientes", description: "Segmentacion RFM con K-Means" },
}

function StatusSection({
  status,
  loading,
  reloading,
  onReload,
  trainingStatus,
  isTraining,
  onStartTraining,
  onCancelTraining,
  onToggleCron,
}: {
  status: Record<string, { loaded: boolean; count?: number }>
  loading: boolean
  reloading: boolean
  onReload: () => Promise<void>
  trainingStatus: TrainingStatus | null
  isTraining: boolean
  onStartTraining: (steps?: string[]) => Promise<void>
  onCancelTraining: () => Promise<void>
  onToggleCron: (enabled: boolean) => Promise<void>
}) {
  const models = Object.keys(MODEL_LABELS)

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(0)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}m ${secs}s`
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Estado de Modelos</h2>
          <p className="text-sm text-muted-foreground">Modelos ML cargados en el servidor</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onReload}
            disabled={reloading}
            size="sm"
            variant="outline"
            className="gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${reloading ? "animate-spin" : ""}`} />
            {reloading ? "Recargando..." : "Recargar"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0">
          {models.map((key) => {
            const modelStatus = status[key]
            const meta = MODEL_LABELS[key]
            const isLoaded = modelStatus?.loaded ?? false
            const count = modelStatus?.count ?? 0

            return (
              <motion.div key={key} whileHover={{ scale: 1.02 }} transition={{ duration: 0.15 }}>
                <Card className="w-full min-w-0 overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm font-medium">{meta.label}</CardTitle>
                      <Badge
                        variant={isLoaded ? "default" : "destructive"}
                        className={`text-xs flex-shrink-0 ${!isLoaded ? "animate-pulse" : ""}`}
                      >
                        {isLoaded ? "Cargado" : "Sin datos"}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">{meta.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {isLoaded ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      )}
                      <span className="text-2xl font-bold tabular-nums">{count}</span>
                      <span className="text-xs text-muted-foreground">registros</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── Training Controls ──────────────────────────────────────────────── */}
      <Card className="w-full min-w-0 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary flex-shrink-0" />
            <CardTitle className="text-base">Entrenamiento Automatico</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Exporta datos, entrena todos los modelos ML y recarga los resultados automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Action button */}
          <Button
            onClick={() => onStartTraining()}
            disabled={isTraining || reloading}
            className="gap-2 cursor-pointer w-full sm:w-auto bg-primary hover:bg-primary/90 transition-all duration-150 active:scale-[0.98]"
          >
            {isTraining ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrenando...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Entrenar todos los modelos
              </>
            )}
          </Button>

          {/* ── Animated Progress Bar ─────────────────────────────────────────── */}
          <AnimatePresence>
            {isTraining && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <TrainingProgressBar
                  currentStep={trainingStatus?.currentStep ?? null}
                  completedSteps={trainingStatus?.completedSteps ?? []}
                  totalSteps={trainingStatus?.totalSteps ?? 5}
                  onCancel={onCancelTraining}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Schedule toggle */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t">
            <div className="min-w-0">
              <p className="text-sm font-medium">Entrenamiento programado</p>
              <p className="text-xs text-muted-foreground">
                {trainingStatus?.schedule.nextDescription || "Todos los dias a las 3:00 AM"}
              </p>
            </div>
            <Switch
              checked={trainingStatus?.schedule.enabled ?? false}
              onCheckedChange={onToggleCron}
              className="cursor-pointer flex-shrink-0"
            />
          </div>

          {/* Last training result */}
          {trainingStatus?.lastRun && !isTraining && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pt-2 border-t space-y-2"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Ultimo entrenamiento: {formatDate(trainingStatus.lastRun)}</span>
              </div>
              {trainingStatus.lastDuration != null && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Timer className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Duracion: {formatDuration(trainingStatus.lastDuration)}</span>
                </div>
              )}
              {trainingStatus.lastResult && (
                <div className="flex flex-wrap gap-2">
                  {trainingStatus.lastResult.summary.successful > 0 && (
                    <Badge variant="default" className="text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {trainingStatus.lastResult.summary.successful} exitosos
                    </Badge>
                  )}
                  {trainingStatus.lastResult.summary.failed > 0 && (
                    <Badge variant="destructive" className="text-xs gap-1">
                      <XCircle className="h-3 w-3" />
                      {trainingStatus.lastResult.summary.failed} con errores
                    </Badge>
                  )}
                </div>
              )}
              {/* Per-model results */}
              {trainingStatus.lastResult?.training && Object.keys(trainingStatus.lastResult.training).length > 0 && (
                <div className="grid gap-1.5 text-xs">
                  {Object.entries(trainingStatus.lastResult.training).map(([key, res]) => (
                    <div key={key} className="flex items-center gap-2 w-full min-w-0">
                      {res.status === "ok" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                      )}
                      <span className="font-medium">{MODEL_LABELS[key]?.label || key}</span>
                      {res.message && (
                        <span className="text-muted-foreground truncate min-w-0">— {res.message}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Training Progress Bar
// ══════════════════════════════════════════════════════════════════════════════

const TRAINING_STEPS = [
  { key: "demand", label: "Demanda", icon: Activity },
  { key: "baskets", label: "Canasta", icon: ShoppingBasket },
  { key: "prices", label: "Precios", icon: ShieldCheck },
  { key: "products", label: "Productos", icon: Package },
  { key: "clients", label: "Clientes", icon: Users },
]

function TrainingProgressBar({
  currentStep,
  completedSteps,
  totalSteps,
  onCancel,
}: {
  currentStep: string | null
  completedSteps: string[]
  totalSteps: number
  onCancel?: () => void
}) {
  const completedSet = new Set(completedSteps)
  const completedCount = completedSteps.length
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0

  // Detect which step is currently active
  const activeStepKey = TRAINING_STEPS.find(
    (s) => !completedSet.has(s.key) && currentStep && !currentStep.includes("Exportando") && !currentStep.includes("Datos exportados")
  )?.key

  const isExporting = currentStep?.includes("Exportando") || currentStep?.includes("Datos exportados")

  return (
    <div className="rounded-xl border bg-card/50 p-3 sm:p-4 space-y-3 w-full min-w-0 overflow-hidden">
      {/* Header with percentage + stop button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Cog className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
          <span className="text-sm font-medium truncate">
            {isExporting ? "Exportando datos..." : currentStep || "Iniciando..."}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs font-mono text-muted-foreground tabular-nums">
            {completedCount}/{totalSteps}
          </span>
          {onCancel && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.2 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                onClick={onCancel}
                title="Detener entrenamiento"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main progress bar */}
      <div className="relative h-2.5 rounded-full bg-muted overflow-hidden w-full">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary to-primary/80"
          initial={{ width: "0%" }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        {/* Shimmer effect while training */}
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div
            className="h-full w-1/3 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"
            style={{ animationTimingFunction: "ease-in-out" }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="grid grid-cols-5 gap-1 sm:gap-2 w-full min-w-0">
        {TRAINING_STEPS.map((step) => {
          const isDone = completedSet.has(step.key)
          const isActive = step.key === activeStepKey && !isExporting
          const Icon = step.icon

          return (
            <motion.div
              key={step.key}
              className={`
                flex flex-col items-center gap-1 rounded-lg p-1.5 sm:p-2 transition-colors duration-300
                ${isDone ? "bg-green-500/10" : isActive ? "bg-primary/10" : "bg-muted/30"}
              `}
              animate={isActive ? { scale: [1, 1.03, 1] } : {}}
              transition={isActive ? { repeat: Infinity, duration: 1.5 } : {}}
            >
              <div className={`
                relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all duration-300
                ${isDone
                  ? "bg-green-500 text-white"
                  : isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }
              `}>
                {isDone ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </motion.div>
                ) : isActive ? (
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
              </div>
              <span className={`
                text-[10px] sm:text-xs font-medium text-center leading-tight transition-colors duration-300
                ${isDone ? "text-green-600 dark:text-green-400" : isActive ? "text-primary" : "text-muted-foreground"}
              `}>
                {step.label}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Product Search Combobox (shared)
// ══════════════════════════════════════════════════════════════════════════════

function ProductCombobox({
  products,
  selectedId,
  onSelect,
  disabled,
  placeholder = "Buscar producto...",
  highlightIds,
  highlightLabel = "Datos ML",
}: {
  products: MLProduct[]
  selectedId: number | null
  onSelect: (product: MLProduct) => void
  disabled?: boolean
  placeholder?: string
  highlightIds?: Set<number>
  highlightLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const selected = products.find((p) => p.id === selectedId)

  const filtered = useMemo(() => {
    const base = search.trim()
      ? products.filter((p) => {
          const q = search.toLowerCase().trim()
          return (
            p.name.toLowerCase().includes(q) ||
            p.id.toString().includes(q) ||
            (p.categoryName && p.categoryName.toLowerCase().includes(q))
          )
        })
      : products

    // Sort: highlighted products first, then by name
    if (highlightIds && highlightIds.size > 0) {
      const sorted = [...base].sort((a, b) => {
        const aHas = highlightIds.has(a.id) ? 0 : 1
        const bHas = highlightIds.has(b.id) ? 0 : 1
        if (aHas !== bHas) return aHas - bHas
        return a.name.localeCompare(b.name)
      })
      return sorted.slice(0, 50)
    }

    return base.slice(0, 50)
  }, [products, search, highlightIds])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between cursor-pointer min-w-0 h-9 text-sm font-normal"
        >
          <span className="truncate min-w-0 flex items-center gap-1.5">
            {selected ? (
              <>
                <span className="font-medium truncate">{selected.name}</span>
                <span className="text-muted-foreground flex-shrink-0">#{selected.id}</span>
                {highlightIds?.has(selected.id) && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    {highlightLabel}
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 flex-shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Nombre, ID o categoria..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
              {products.length === 0 ? "Cargando productos..." : "Sin resultados"}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((product) => {
                const hasData = highlightIds?.has(product.id)
                return (
                  <CommandItem
                    key={product.id}
                    value={`${product.id}-${product.name}`}
                    onSelect={() => {
                      onSelect(product)
                      setOpen(false)
                      setSearch("")
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={`mr-2 h-3.5 w-3.5 flex-shrink-0 ${
                        selectedId === product.id ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm truncate">{product.name}</span>
                        {hasData && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex-shrink-0 leading-4">
                            {highlightLabel}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate">
                        #{product.id}
                        {product.categoryName && ` · ${product.categoryName}`}
                        {product.priceSell > 0 && ` · S/${product.priceSell.toFixed(2)}`}
                      </span>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Section 2: Demand Forecast
// ══════════════════════════════════════════════════════════════════════════════

function DemandSection({
  result,
  loading,
  onSearch,
  products,
  demandProductIds,
}: {
  result: DemandForecastResult | null
  loading: boolean
  onSearch: (productId: number, days?: number) => Promise<void>
  products: MLProduct[]
  demandProductIds: Set<number>
}) {
  const [selectedProduct, setSelectedProduct] = useState<MLProduct | null>(null)
  const [activePeriod, setActivePeriod] = useState<ForecastPeriod>(FORECAST_PERIODS[0])

  // Auto-trigger analysis on product select
  const handleProductSelect = (product: MLProduct) => {
    setSelectedProduct(product)
    onSearch(product.id, activePeriod.days)
  }

  // Change period and re-fetch
  const handlePeriodChange = (period: ForecastPeriod) => {
    setActivePeriod(period)
    if (selectedProduct) {
      onSearch(selectedProduct.id, period.days)
    }
  }

  // Total forecast summary
  const forecastTotal = useMemo(() => {
    if (!result?.forecast?.length) return null
    const total = result.forecast.reduce((sum, r) => sum + r.yhat, 0)
    const avg = total / result.forecast.length
    return { total: total.toFixed(1), avg: avg.toFixed(1), days: result.forecast.length }
  }, [result])

  return (
    <div className="space-y-6 w-full min-w-0">
      <div>
        <h2 className="text-lg font-semibold">Prediccion de Demanda</h2>
        <p className="text-sm text-muted-foreground">
          Forecast de ventas — selecciona un producto para analizar
          {demandProductIds.size > 0 && (
            <span className="ml-1 text-emerald-600 dark:text-emerald-400">
              ({demandProductIds.size} productos con datos)
            </span>
          )}
        </p>
      </div>

      {/* Product search + Period selector */}
      <div className="space-y-3 w-full min-w-0">
        <div className="w-full min-w-0">
          <Label className="text-sm">Producto</Label>
          <div className="mt-1">
            <ProductCombobox
              products={products}
              selectedId={selectedProduct?.id ?? null}
              onSelect={handleProductSelect}
              disabled={loading}
              highlightIds={demandProductIds}
              highlightLabel="Forecast"
            />
          </div>
        </div>

        {/* Period tabs */}
        <div className="flex items-center gap-2 w-full min-w-0">
          <span className="text-xs text-muted-foreground flex-shrink-0">Periodo:</span>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            {FORECAST_PERIODS.map((period) => {
              const isActive = activePeriod.key === period.key
              const isAvailable = period.key === "quarter" ? (result?.method === "prophet") : true
              return (
                <TooltipProvider key={period.key} delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => isAvailable && handlePeriodChange(period)}
                        disabled={!isAvailable || loading}
                        className={`
                          px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer
                          ${isActive
                            ? "bg-background text-foreground shadow-sm"
                            : isAvailable
                              ? "text-muted-foreground hover:text-foreground hover:bg-background/50"
                              : "text-muted-foreground/40 cursor-not-allowed"
                          }
                          disabled:cursor-not-allowed disabled:opacity-50
                        `}
                      >
                        <span className="hidden sm:inline">{period.label}</span>
                        <span className="sm:hidden">{period.shortLabel}</span>
                      </button>
                    </TooltipTrigger>
                    {!isAvailable && (
                      <TooltipContent side="bottom" className="text-xs">
                        Solo disponible con Prophet (requiere 30+ dias de historial)
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </div>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground flex-shrink-0" />}
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
          {!result.available ? (
            <Card className="w-full min-w-0 overflow-hidden">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Activity className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p>No hay datos de prediccion para este producto.</p>
                <p className="text-xs mt-1">Asegurate de haber entrenado el modelo de demanda.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{result.method === "prophet" ? "Prophet" : "Media Movil"}</Badge>
                <Badge variant="outline" className="text-xs tabular-nums">
                  {result.forecast?.length ?? 0} dias
                </Badge>
                {forecastTotal && (
                  <>
                    <Badge variant="outline" className="text-xs tabular-nums gap-1">
                      <Activity className="h-3 w-3" />
                      Total: {forecastTotal.total} uds
                    </Badge>
                    <Badge variant="outline" className="text-xs tabular-nums gap-1">
                      Promedio: {forecastTotal.avg} uds/dia
                    </Badge>
                  </>
                )}
              </div>

              {/* Chart */}
              <Card className="w-full min-w-0 overflow-hidden">
                <CardContent className="pt-4 pb-2 px-2 sm:px-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={result.forecast ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="ds"
                        tickFormatter={(v) => {
                          const d = new Date(v)
                          return `${d.getDate()}/${d.getMonth() + 1}`
                        }}
                        className="text-xs"
                        interval={activePeriod.days > 30 ? Math.floor(activePeriod.days / 10) : "preserveStartEnd"}
                      />
                      <YAxis className="text-xs" />
                      <RechartsTooltip
                        contentStyle={{ fontSize: 12 }}
                        labelFormatter={(v) => {
                          const d = new Date(v)
                          return d.toLocaleDateString("es-PE", { weekday: "short", day: "2-digit", month: "short" })
                        }}
                        formatter={(value: number, name: string) => {
                          const labels: Record<string, string> = {
                            yhat: "Demanda estimada",
                            yhat_upper: "Maximo estimado",
                            yhat_lower: "Minimo estimado",
                          }
                          return [value.toFixed(1), labels[name] || name]
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="yhat_upper"
                        name="yhat_upper"
                        stroke="none"
                        fill="#6366f1"
                        fillOpacity={0.1}
                        isAnimationActive={true}
                        animationDuration={800}
                      />
                      <Area
                        type="monotone"
                        dataKey="yhat_lower"
                        name="yhat_lower"
                        stroke="none"
                        fill="#ffffff"
                        fillOpacity={1}
                        isAnimationActive={true}
                        animationDuration={800}
                      />
                      <Area
                        type="monotone"
                        dataKey="yhat"
                        name="yhat"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.2}
                        strokeWidth={2}
                        isAnimationActive={true}
                        animationDuration={800}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Table */}
              <Card className="w-full min-w-0 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Detalle diario</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto max-h-[320px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card z-10">
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-4">Fecha</th>
                        <th className="text-right py-2 px-2">Demanda</th>
                        <th className="text-right py-2 px-2">Min</th>
                        <th className="text-right py-2 pl-2">Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(result.forecast ?? []).map((row) => (
                        <tr key={row.ds} className="border-b border-border/50">
                          <td className="py-1.5 pr-4 whitespace-nowrap">{new Date(row.ds).toLocaleDateString("es-PE")}</td>
                          <td className="py-1.5 px-2 text-right font-medium tabular-nums">{row.yhat.toFixed(1)}</td>
                          <td className="py-1.5 px-2 text-right text-muted-foreground tabular-nums">{row.yhat_lower.toFixed(1)}</td>
                          <td className="py-1.5 pl-2 text-right text-muted-foreground tabular-nums">{row.yhat_upper.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Section 3: Basket Analysis
// ══════════════════════════════════════════════════════════════════════════════

function BasketSection({
  rules,
  loading,
  onSearch,
  products,
}: {
  rules: BasketRule[]
  loading: boolean
  onSearch: (productId: number) => Promise<void>
  products: MLProduct[]
}) {
  const [selectedProduct, setSelectedProduct] = useState<MLProduct | null>(null)

  // Auto-trigger on select
  const handleProductSelect = (product: MLProduct) => {
    setSelectedProduct(product)
    onSearch(product.id)
  }

  const chartData = rules.map((rule, i) => ({
    name: rule.productNames?.join(", ") || `Regla ${i + 1}`,
    lift: parseFloat(rule.lift.toFixed(2)),
    confidence: parseFloat((rule.confidence * 100).toFixed(1)),
  }))

  return (
    <div className="space-y-6 w-full min-w-0">
      <div>
        <h2 className="text-lg font-semibold">Productos Relacionados</h2>
        <p className="text-sm text-muted-foreground">Analisis de canasta — productos comprados juntos frecuentemente</p>
      </div>

      <div className="w-full min-w-0">
        <Label className="text-sm">Producto</Label>
        <div className="mt-1">
          <ProductCombobox
            products={products}
            selectedId={selectedProduct?.id ?? null}
            onSelect={handleProductSelect}
            disabled={loading}
          />
        </div>
      </div>

      {loading && <Skeleton className="h-64 rounded-xl" />}

      {!loading && rules.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
          {/* Horizontal bar chart */}
          <Card className="w-full min-w-0 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Lift por regla de asociacion</CardTitle>
              <CardDescription className="text-xs">Mayor lift = mayor probabilidad de compra conjunta</CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-4 pb-2">
              <ResponsiveContainer width="100%" height={Math.max(180, rules.length * 50)}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" className="text-xs" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    className="text-xs"
                    tick={{ fontSize: 10 }}
                  />
                  <RechartsTooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="lift" fill="#6366f1" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Rules list */}
          <div className="space-y-2">
            {rules.map((rule, i) => (
              <Card key={i} className="w-full min-w-0 overflow-hidden">
                <CardContent className="py-3 px-4">
                  <div className="flex flex-col gap-2 w-full min-w-0">
                    <p className="text-sm break-words">
                      Quienes compran este producto tambien compran: <strong>{rule.productNames?.join(", ") || rule.productIds.join(", ")}</strong>
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        Confianza: {(rule.confidence * 100).toFixed(1)}%
                      </Badge>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        Lift: {rule.lift.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!loading && rules.length === 0 && selectedProduct && (
        <Card className="w-full min-w-0 overflow-hidden">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No se encontraron reglas de asociacion para <strong>{selectedProduct.name}</strong>.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Section 4: Price Anomaly Detector
// ══════════════════════════════════════════════════════════════════════════════

function PriceSection({
  result,
  loading,
  onSearch,
  products,
}: {
  result: PriceCheckResult | null
  loading: boolean
  onSearch: (productId: number, price: number) => Promise<void>
  products: MLProduct[]
}) {
  const [selectedProduct, setSelectedProduct] = useState<MLProduct | null>(null)
  const [price, setPrice] = useState("")

  const handleSearch = () => {
    const p = parseFloat(price)
    if (selectedProduct && !isNaN(p) && p > 0) onSearch(selectedProduct.id, p)
  }

  // Auto-fill price and auto-trigger when product is selected
  const handleProductSelect = (product: MLProduct) => {
    setSelectedProduct(product)
    const autoPrice = product.priceSell > 0 ? product.priceSell : parseFloat(price)
    if (product.priceSell > 0) {
      setPrice(product.priceSell.toFixed(2))
    }
    // Auto-trigger if we have a valid price
    if (!isNaN(autoPrice) && autoPrice > 0) {
      onSearch(product.id, autoPrice)
    }
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      <div>
        <h2 className="text-lg font-semibold">Detector de Precios</h2>
        <p className="text-sm text-muted-foreground">Verifica si un precio esta dentro del rango normal</p>
      </div>

      <div className="flex flex-col gap-3 w-full min-w-0">
        <div className="flex flex-col sm:flex-row gap-3 w-full min-w-0">
          <div className="w-full sm:flex-1 min-w-0">
            <Label className="text-sm">Producto</Label>
            <div className="mt-1">
              <ProductCombobox
                products={products}
                selectedId={selectedProduct?.id ?? null}
                onSelect={handleProductSelect}
                disabled={loading}
              />
            </div>
          </div>
          <div className="w-full sm:w-40 min-w-0">
            <Label htmlFor="price-value" className="text-sm">Precio (S/)</Label>
            <Input
              id="price-value"
              type="number"
              min={0.01}
              step={0.01}
              placeholder="Ej: 25.50"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 h-9"
            />
          </div>
        </div>
        <Button
          onClick={handleSearch}
          disabled={loading || !selectedProduct || !price}
          className="gap-2 cursor-pointer w-full sm:w-auto sm:self-start transition-all duration-150 active:scale-[0.98]"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Verificar precio
        </Button>
      </div>

      {loading && <Skeleton className="h-48 rounded-xl" />}

      {result && !loading && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
          {!result.available ? (
            <Card className="w-full min-w-0 overflow-hidden">
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay datos de precio para este producto. Entrena el modelo de precios primero.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Result badge */}
              <Card className={`w-full min-w-0 overflow-hidden border-2 ${result.isAnomaly ? "border-red-500/30 bg-red-500/5" : "border-green-500/30 bg-green-500/5"}`}>
                <CardContent className="py-4 px-4">
                  <div className="flex items-start gap-3 w-full min-w-0">
                    {result.isAnomaly ? (
                      <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">
                        {result.isAnomaly ? "Anomalia detectada" : "Precio normal"}
                      </p>
                      {result.reason && (
                        <p className="text-xs text-muted-foreground mt-1 break-words">{result.reason}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Price gauge */}
              {result.stats && (
                <Card className="w-full min-w-0 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Rango de precios historicos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PriceGauge
                      price={parseFloat(price)}
                      min={result.stats.min}
                      max={result.stats.max}
                      p5={result.stats.p5}
                      p95={result.stats.p95}
                      mean={result.stats.mean}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
                      <StatMini label="Minimo" value={`S/${result.stats.min.toFixed(2)}`} />
                      <StatMini label="P5" value={`S/${result.stats.p5.toFixed(2)}`} />
                      <StatMini label="Media" value={`S/${result.stats.mean.toFixed(2)}`} />
                      <StatMini label="P95" value={`S/${result.stats.p95.toFixed(2)}`} />
                      <StatMini label="Maximo" value={`S/${result.stats.max.toFixed(2)}`} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function PriceGauge({
  price,
  min,
  max,
  p5,
  p95,
  mean,
}: {
  price: number
  min: number
  max: number
  p5: number
  p95: number
  mean: number
}) {
  const range = max - min
  if (range <= 0) return null

  const toPercent = (v: number) => Math.max(0, Math.min(100, ((v - min) / range) * 100))
  const pricePos = toPercent(price)
  const p5Pos = toPercent(p5)
  const p95Pos = toPercent(p95)
  const isAnomaly = price < p5 || price > p95

  return (
    <div className="relative h-8 w-full rounded-full bg-muted overflow-hidden">
      {/* Normal range */}
      <div
        className="absolute top-0 h-full bg-green-500/20 rounded-full"
        style={{ left: `${p5Pos}%`, width: `${p95Pos - p5Pos}%` }}
      />
      {/* Price marker */}
      <div
        className={`absolute top-0 h-full w-1 ${isAnomaly ? "bg-red-500" : "bg-green-500"}`}
        style={{ left: `${pricePos}%` }}
      />
      {/* Price label */}
      <div
        className="absolute -top-5 text-[10px] font-bold tabular-nums"
        style={{ left: `${pricePos}%`, transform: "translateX(-50%)" }}
      >
        S/{price.toFixed(2)}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Section 5: Client Segments
// ══════════════════════════════════════════════════════════════════════════════

function SegmentsSection({
  segments,
  loading,
}: {
  segments: Record<string, ClientSegment>
  loading: boolean
}) {
  const entries = Object.entries(segments)
  const hasData = entries.length > 0

  const pieData = entries.map(([key, seg]) => ({
    name: seg.label || key,
    value: seg.count,
  }))

  return (
    <div className="space-y-6 w-full min-w-0">
      <div>
        <h2 className="text-lg font-semibold">Segmentos de Clientes</h2>
        <p className="text-sm text-muted-foreground">Segmentacion RFM (Recencia, Frecuencia, Monto) con K-Means</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : !hasData ? (
        <Card className="w-full min-w-0 overflow-hidden">
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay datos de segmentacion. Entrena el modelo de clientes primero.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
          {/* Pie chart */}
          <Card className="w-full min-w-0 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Distribucion de segmentos</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-4 pb-2">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive
                    animationDuration={800}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Segments table */}
          <Card className="w-full min-w-0 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Metricas por segmento</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-3">Segmento</th>
                    <th className="text-right py-2 px-2">Clientes</th>
                    <th className="text-right py-2 px-2">Monto prom.</th>
                    <th className="text-right py-2 px-2">Frecuencia</th>
                    <th className="text-right py-2 pl-2">Recencia (dias)</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(([key, seg], i) => (
                    <tr key={key} className="border-b border-border/50">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
                          />
                          <span className="font-medium whitespace-nowrap">{seg.label || key}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">{seg.count}</td>
                      <td className="py-2 px-2 text-right tabular-nums">S/{seg.avg_monetary?.toFixed(2) ?? "0.00"}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{seg.avg_frequency?.toFixed(1) ?? "0"}</td>
                      <td className="py-2 pl-2 text-right tabular-nums">{seg.avg_recency?.toFixed(0) ?? "0"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
