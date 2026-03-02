"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Activity,
  BarChart3,
  Brain,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Users,
  XCircle,
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
import { PageGuideButton } from "@/components/page-guide-dialog"
import { mlAnalyticsGuideSteps } from "./ml-guide-steps"
import { useMLAnalytics } from "./use-ml-analytics"
import type { DemandForecastResult, BasketRule, PriceCheckResult, ClientSegment } from "./ml-analytics.api"

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
            <AnimatePresence mode="sync" initial={false}>
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="w-full min-w-0"
              >
                {activeSection === "status" && (
                  <StatusSection
                    status={ml.status}
                    loading={ml.statusLoading}
                    reloading={ml.reloading}
                    onReload={ml.handleReload}
                  />
                )}
                {activeSection === "demand" && (
                  <DemandSection
                    result={ml.demandResult}
                    loading={ml.demandLoading}
                    onSearch={ml.searchDemand}
                  />
                )}
                {activeSection === "basket" && (
                  <BasketSection
                    rules={ml.basketRules}
                    loading={ml.basketLoading}
                    onSearch={ml.searchBasket}
                  />
                )}
                {activeSection === "prices" && (
                  <PriceSection
                    result={ml.priceResult}
                    loading={ml.priceLoading}
                    onSearch={ml.searchPrice}
                  />
                )}
                {activeSection === "segments" && (
                  <SegmentsSection
                    segments={ml.segments}
                    loading={ml.segmentsLoading}
                  />
                )}
              </motion.div>
            </AnimatePresence>
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
}: {
  status: Record<string, { loaded: boolean; count?: number }>
  loading: boolean
  reloading: boolean
  onReload: () => Promise<void>
}) {
  const models = Object.keys(MODEL_LABELS)

  return (
    <div className="space-y-6 w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Estado de Modelos</h2>
          <p className="text-sm text-muted-foreground">Modelos ML cargados en el servidor</p>
        </div>
        <Button
          onClick={onReload}
          disabled={reloading}
          size="sm"
          className="gap-2 cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${reloading ? "animate-spin" : ""}`} />
          {reloading ? "Recargando..." : "Recargar modelos"}
        </Button>
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

      {/* Training instructions */}
      <Card className="w-full min-w-0 overflow-hidden border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Como entrenar los modelos</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>1. Instalar dependencias: <code className="bg-muted px-1 py-0.5 rounded">pip install -r backend/ml/requirements-training.txt</code></p>
          <p>2. Exportar datos: <code className="bg-muted px-1 py-0.5 rounded">python backend/ml/training/export_all.py</code></p>
          <p>3. Entrenar modelos (ejemplo): <code className="bg-muted px-1 py-0.5 rounded">python backend/ml/training/train_demand_forecast.py</code></p>
          <p>4. Hacer clic en &quot;Recargar modelos&quot; arriba para cargar los resultados sin reiniciar.</p>
        </CardContent>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Section 2: Demand Forecast
// ══════════════════════════════════════════════════════════════════════════════

function DemandSection({
  result,
  loading,
  onSearch,
}: {
  result: DemandForecastResult | null
  loading: boolean
  onSearch: (productId: number) => Promise<void>
}) {
  const [productId, setProductId] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = parseInt(productId, 10)
    if (!isNaN(id) && id > 0) onSearch(id)
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      <div>
        <h2 className="text-lg font-semibold">Prediccion de Demanda</h2>
        <p className="text-sm text-muted-foreground">Forecast de ventas para los proximos 7 dias</p>
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-3 w-full min-w-0">
        <div className="flex-1 min-w-0">
          <Label htmlFor="demand-product" className="text-sm">ID del Producto</Label>
          <Input
            id="demand-product"
            type="number"
            min={1}
            placeholder="Ej: 42"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button type="submit" disabled={loading || !productId} className="gap-2 cursor-pointer flex-shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar
        </Button>
      </form>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      )}

      {result && !loading && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {!result.available ? (
            <Card className="w-full min-w-0 overflow-hidden">
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay datos de prediccion para este producto. Asegurate de haber entrenado el modelo de demanda.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{result.method === "prophet" ? "Prophet" : "Media Movil"}</Badge>
                <span className="text-xs text-muted-foreground">{result.forecast?.length ?? 0} dias de forecast</span>
              </div>

              {/* Chart */}
              <Card className="w-full min-w-0 overflow-hidden">
                <CardContent className="pt-4 pb-2 px-2 sm:px-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={result.forecast ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="ds"
                        tickFormatter={(v) => {
                          const d = new Date(v)
                          return `${d.getDate()}/${d.getMonth() + 1}`
                        }}
                        className="text-xs"
                      />
                      <YAxis className="text-xs" />
                      <RechartsTooltip
                        contentStyle={{ fontSize: 12 }}
                        labelFormatter={(v) => {
                          const d = new Date(v)
                          return d.toLocaleDateString("es-PE")
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="yhat_upper"
                        stroke="none"
                        fill="#6366f1"
                        fillOpacity={0.1}
                        isAnimationActive={true}
                        animationDuration={800}
                      />
                      <Area
                        type="monotone"
                        dataKey="yhat_lower"
                        stroke="none"
                        fill="#ffffff"
                        fillOpacity={1}
                        isAnimationActive={true}
                        animationDuration={800}
                      />
                      <Area
                        type="monotone"
                        dataKey="yhat"
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
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
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
        </motion.div>
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
}: {
  rules: BasketRule[]
  loading: boolean
  onSearch: (productId: number) => Promise<void>
}) {
  const [productId, setProductId] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = parseInt(productId, 10)
    if (!isNaN(id) && id > 0) onSearch(id)
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

      <form onSubmit={handleSubmit} className="flex items-end gap-3 w-full min-w-0">
        <div className="flex-1 min-w-0">
          <Label htmlFor="basket-product" className="text-sm">ID del Producto</Label>
          <Input
            id="basket-product"
            type="number"
            min={1}
            placeholder="Ej: 15"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button type="submit" disabled={loading || !productId} className="gap-2 cursor-pointer flex-shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar
        </Button>
      </form>

      {loading && <Skeleton className="h-64 rounded-xl" />}

      {!loading && rules.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
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
        </motion.div>
      )}

      {!loading && rules.length === 0 && productId && (
        <Card className="w-full min-w-0 overflow-hidden">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Busca un producto para ver sus reglas de asociacion.
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
}: {
  result: PriceCheckResult | null
  loading: boolean
  onSearch: (productId: number, price: number) => Promise<void>
}) {
  const [productId, setProductId] = useState("")
  const [price, setPrice] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = parseInt(productId, 10)
    const p = parseFloat(price)
    if (!isNaN(id) && id > 0 && !isNaN(p) && p > 0) onSearch(id, p)
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      <div>
        <h2 className="text-lg font-semibold">Detector de Precios</h2>
        <p className="text-sm text-muted-foreground">Verifica si un precio esta dentro del rango normal</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-end gap-3 w-full min-w-0">
        <div className="w-full sm:flex-1 min-w-0">
          <Label htmlFor="price-product" className="text-sm">ID del Producto</Label>
          <Input
            id="price-product"
            type="number"
            min={1}
            placeholder="Ej: 10"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="w-full sm:flex-1 min-w-0">
          <Label htmlFor="price-value" className="text-sm">Precio (S/)</Label>
          <Input
            id="price-value"
            type="number"
            min={0.01}
            step={0.01}
            placeholder="Ej: 25.50"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button type="submit" disabled={loading || !productId || !price} className="gap-2 cursor-pointer flex-shrink-0 w-full sm:w-auto">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Verificar
        </Button>
      </form>

      {loading && <Skeleton className="h-48 rounded-xl" />}

      {result && !loading && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
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
        </motion.div>
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
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
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
        </motion.div>
      )}
    </div>
  )
}
