"use client"

import { useEffect, useMemo, useState, type ComponentType } from "react"
import Link from "next/link"
import {
  Building2,
  Store as StoreIcon,
  ShieldCheck,
  UploadCloud,
  CheckCircle,
  Circle,
  RefreshCcw,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { DemoDataStatus, OnboardingProgress, OnboardingStepKey } from "@/types/onboarding"
import {
  clearDemoData,
  fetchOnboardingProgress,
  seedDemoData,
  updateOnboardingStep,
} from "@/lib/onboarding-progress"
import { getCurrentTenant } from "@/app/dashboard/tenancy/tenancy.api"

type StepDefinition = {
  key: OnboardingStepKey
  title: string
  description: string
  icon: ComponentType<{ className?: string }>
  helper?: string
}

const STEP_CONFIG: StepDefinition[] = [
  {
    key: "companyProfile",
    title: "Datos de la empresa",
    description: "Logo, razón social, RUC y dirección fiscal.",
    icon: Building2,
    helper: "Estos datos alimentan tus plantillas de comprobantes y la cabecera del portal público.",
  },
  {
    key: "storeSetup",
    title: "Tiendas y almacenes",
    description: "Registra la tienda principal y notas de logística.",
    icon: StoreIcon,
    helper: "Puedes agregar más tiendas luego, pero define al menos la principal para los flujos de inventario.",
  },
  {
    key: "sunatSetup",
    title: "Conectar SUNAT",
    description: "Usuarios SOL, certificado digital y ambiente.",
    icon: ShieldCheck,
    helper: "Toda la información se cifra y podrás actualizarla en Configuración → SUNAT en cualquier momento.",
  },
  {
    key: "dataImport",
    title: "Importar datos o usar demo",
    description: "Elige si cargar catálogos propios o usar datos demo por industria.",
    icon: UploadCloud,
    helper: "Puedes limpiar los datos demo cuando estés listo para operar con tus propios registros.",
  },
]

const demoStatusLabel: Record<DemoDataStatus, string> = {
  NONE: "Sin datos demo",
  SEEDED: "Datos demo cargados",
  CLEANING: "Limpiando datos demo",
}

type CompanyFormState = {
  legalName: string
  ruc: string
  address: string
  logoUrl: string
}

type StoreFormState = {
  primaryStore: string
  additionalStores: string
  warehouseNotes: string
}

type SunatFormState = {
  environment: "BETA" | "PRODUCCION"
  solUser: string
  solPassword: string
  certificateStatus: string
  contactEmail: string
}

type DataFormState = {
  dataStrategy: "demo" | "csv" | "manual"
  industry: "retail" | "services" | "manufacturing" | "other"
  csvFileName: string
  importNotes: string
}

const defaultCompanyForm: CompanyFormState = {
  legalName: "",
  ruc: "",
  address: "",
  logoUrl: "",
}

const defaultStoreForm: StoreFormState = {
  primaryStore: "",
  additionalStores: "",
  warehouseNotes: "",
}

const defaultSunatForm: SunatFormState = {
  environment: "BETA",
  solUser: "",
  solPassword: "",
  certificateStatus: "",
  contactEmail: "",
}

const defaultDataForm: DataFormState = {
  dataStrategy: "demo",
  industry: "retail",
  csvFileName: "",
  importNotes: "",
}

function formatDate(value?: string | null) {
  if (!value) return null
  try {
    return new Intl.DateTimeFormat("es-PE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  } catch {
    return value
  }
}

export default function OnboardingWizardPage() {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingStep, setSavingStep] = useState<OnboardingStepKey | null>(null)
  const [clearingDemo, setClearingDemo] = useState(false)
  const [seedingDemo, setSeedingDemo] = useState(false)
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(defaultCompanyForm)
  const [storeForm, setStoreForm] = useState<StoreFormState>(defaultStoreForm)
  const [sunatForm, setSunatForm] = useState<SunatFormState>(defaultSunatForm)
  const [dataForm, setDataForm] = useState<DataFormState>(defaultDataForm)

  useEffect(() => {
    loadProgress()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProgress() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchOnboardingProgress()
      setProgress(response)
      hydrateForms(response)
      await prefillFromTenantContext()
    } catch (err) {
      console.error(err)
      setError("No se pudo cargar el estado del onboarding.")
    } finally {
      setLoading(false)
    }
  }

  function hydrateForms(data: OnboardingProgress) {
    setCompanyForm(
      mergeForm(defaultCompanyForm, (data.companyProfile?.data as Record<string, any> | null) ?? null),
    )
    setStoreForm(
      mergeForm(defaultStoreForm, (data.storeSetup?.data as Record<string, any> | null) ?? null),
    )
    setSunatForm(
      mergeForm(defaultSunatForm, (data.sunatSetup?.data as Record<string, any> | null) ?? null),
    )
    setDataForm(
      mergeForm(defaultDataForm, (data.dataImport?.data as Record<string, any> | null) ?? null),
    )
  }

  async function prefillFromTenantContext() {
    try {
      const info = await getCurrentTenant()
      setCompanyForm((prev) => {
        if (prev.legalName?.trim()) return prev
        const suggestedName = info.company?.name ?? info.organization?.name ?? ""
        if (!suggestedName) return prev
        return { ...prev, legalName: suggestedName }
      })
    } catch (err) {
      console.warn("No se pudo obtener la organizacion actual para precargar el asistente", err)
    }
  }

  function mergeForm<T extends Record<string, any>>(defaults: T, source: Record<string, any> | null): T {
    if (!source) return { ...defaults }
    const next: T = { ...defaults }
    Object.keys(defaults).forEach((key) => {
      const incoming = source[key]
      if (incoming === undefined || incoming === null) return
      if (typeof defaults[key] === "string") {
        next[key] = String(incoming) as T[Extract<keyof T, string>]
      } else {
        next[key] = incoming as T[Extract<keyof T, string>]
      }
    })
    return next
  }

  const completedCount = useMemo(() => {
    if (!progress) return 0
    return STEP_CONFIG.filter((cfg) => progress[cfg.key]?.completed).length
  }, [progress])

  const percent = useMemo(() => {
    if (!progress) return 0
    return Math.round((completedCount / STEP_CONFIG.length) * 100)
  }, [completedCount, progress])

  const demoStatus = progress?.demoStatus ?? "NONE"

  const currentStepKey = useMemo(() => {
    if (!progress) return STEP_CONFIG[0]?.key
    const pending = STEP_CONFIG.find((cfg) => !progress[cfg.key]?.completed)
    return pending?.key ?? STEP_CONFIG[STEP_CONFIG.length - 1]?.key
  }, [progress])

  async function handleSaveStep(step: OnboardingStepKey, markComplete: boolean) {
    try {
      setSavingStep(step)
      const payload = getPayload(step)
      const updated = await updateOnboardingStep({
        step,
        completed: markComplete,
        payload,
      })
      setProgress(updated)
      hydrateForms(updated)
      toast.success(markComplete ? "Paso guardado y marcado como completo." : "Paso configurado como pendiente.")
    } catch (err) {
      console.error(err)
      toast.error("No se pudo guardar el paso.")
    } finally {
      setSavingStep(null)
    }
  }

  async function handleClearDemo() {
    if (progress?.demoStatus === "NONE") {
      toast.info("No hay datos demo que limpiar.")
      return
    }
    const confirmed = window.confirm(
      "Se eliminarán todos los registros marcados como demo. Esta acción no se puede deshacer. ¿Deseas continuar?",
    )
    if (!confirmed) return
    try {
      setClearingDemo(true)
      const updated = await clearDemoData("wizard-clear")
      setProgress(updated)
      hydrateForms(updated)
      toast.success("Datos demo limpiados correctamente.")
    } catch (err) {
      console.error(err)
      toast.error("No se pudo limpiar los datos demo.")
    } finally {
      setClearingDemo(false)
    }
  }

  async function handleSeedDemo() {
    try {
      setSeedingDemo(true)
      const updated = await seedDemoData(dataForm.industry)
      setProgress(updated)
      hydrateForms(updated)
      toast.success("Datos demo cargados correctamente.")
    } catch (err) {
      console.error(err)
      toast.error("No se pudo cargar los datos demo.")
    } finally {
      setSeedingDemo(false)
    }
  }

  function getPayload(step: OnboardingStepKey): Record<string, any> {
    switch (step) {
      case "companyProfile":
        return companyForm
      case "storeSetup":
        return storeForm
      case "sunatSetup":
        return sunatForm
      case "dataImport":
        return dataForm
      default:
        return {}
    }
  }

  const isSaving = (step: OnboardingStepKey) => savingStep === step

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <RefreshCcw className="h-6 w-6 animate-spin text-sky-500" />
        <p className="text-sm text-slate-500">Cargando asistente de onboarding...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 text-center">
        <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">Ocurrió un problema</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
        <Button onClick={loadProgress}>Reintentar</Button>
      </div>
    )
  }

  if (!progress) {
    return null
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-500 dark:text-slate-300">
              Asistente inicial
            </p>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Configura tu entorno</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Completa los cuatro pasos para liberar todas las funcionalidades y ocultar este asistente.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Progreso</p>
            <p className="text-3xl font-semibold text-slate-900 dark:text-white">{percent}%</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {completedCount}/{STEP_CONFIG.length} pasos completados
            </p>
          </div>
        </div>
        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-white/70 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-6 grid gap-3 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-4">
          {STEP_CONFIG.map((cfg, idx) => {
            const state = progress[cfg.key]
            const completed = Boolean(state?.completed)
            const Icon = cfg.icon
            return (
              <div
                key={cfg.key}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                  completed
                    ? "border-emerald-200 bg-white text-emerald-700 dark:border-emerald-600/40 dark:bg-emerald-900/20"
                    : "border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-900/50"
                }`}
              >
                {completed ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-300" />
                )}
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Paso {idx + 1}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      completed ? "text-emerald-700 dark:text-emerald-200" : "text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {cfg.title}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <section className="grid gap-6">
        {STEP_CONFIG.map((cfg) => {
          const state = progress[cfg.key]
          const completed = Boolean(state?.completed)
          const Icon = cfg.icon
          return (
            <Card key={cfg.key} id={cfg.key} className="border-slate-200 dark:border-slate-800">
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-sky-100 p-2 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-xl">{cfg.title}</CardTitle>
                      <Badge variant={completed ? "default" : "outline"} className="text-xs">
                        {completed ? "Completado" : "Pendiente"}
                      </Badge>
                      {currentStepKey === cfg.key && !completed ? (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                          Paso actual
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <CardDescription>{cfg.description}</CardDescription>
                  {cfg.helper ? <p className="text-sm text-slate-500 dark:text-slate-400">{cfg.helper}</p> : null}
                </div>
                <div className="flex flex-col items-start gap-1 text-xs text-slate-500 dark:text-slate-400">
                  {state?.updatedAt ? (
                    <span>Última actualización: {formatDate(state.updatedAt)}</span>
                  ) : (
                    <span>Aún sin cambios</span>
                  )}
                  {state?.completedAt ? (
                    <span>Completado el {formatDate(state.completedAt)}</span>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {cfg.key === "companyProfile" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="legalName">Razón social</Label>
                      <Input
                        id="legalName"
                        placeholder="Ej. Tecnologías Integradas SAC"
                        value={companyForm.legalName}
                        onChange={(e) => setCompanyForm((prev) => ({ ...prev, legalName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ruc">RUC</Label>
                      <Input
                        id="ruc"
                        maxLength={11}
                        placeholder="11 dígitos"
                        value={companyForm.ruc}
                        onChange={(e) => setCompanyForm((prev) => ({ ...prev, ruc: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Dirección fiscal</Label>
                      <Input
                        id="address"
                        placeholder="Calle, ciudad, provincia"
                        value={companyForm.address}
                        onChange={(e) => setCompanyForm((prev) => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="logoUrl">URL del logo</Label>
                      <Input
                        id="logoUrl"
                        placeholder="https://misitio.com/logo.png"
                        value={companyForm.logoUrl}
                        onChange={(e) => setCompanyForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {cfg.key === "storeSetup" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="primaryStore">Tienda principal</Label>
                      <Input
                        id="primaryStore"
                        placeholder="Ej. Sede Central Lima"
                        value={storeForm.primaryStore}
                        onChange={(e) => setStoreForm((prev) => ({ ...prev, primaryStore: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="additionalStores">Tiendas adicionales</Label>
                      <Input
                        id="additionalStores"
                        placeholder="Ej. Trujillo, Arequipa"
                        value={storeForm.additionalStores}
                        onChange={(e) => setStoreForm((prev) => ({ ...prev, additionalStores: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="warehouseNotes">Notas logísticas</Label>
                      <Textarea
                        id="warehouseNotes"
                        placeholder="Describe si manejas almacenes externos, cross-docking, etc."
                        value={storeForm.warehouseNotes}
                        onChange={(e) => setStoreForm((prev) => ({ ...prev, warehouseNotes: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {cfg.key === "sunatSetup" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Ambiente</Label>
                      <Select
                        value={sunatForm.environment}
                        onValueChange={(value: "BETA" | "PRODUCCION") =>
                          setSunatForm((prev) => ({ ...prev, environment: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona ambiente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BETA">Beta / Homologación</SelectItem>
                          <SelectItem value="PRODUCCION">Producción</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="solUser">Usuario SOL</Label>
                      <Input
                        id="solUser"
                        placeholder="USUARIO123"
                        value={sunatForm.solUser}
                        onChange={(e) => setSunatForm((prev) => ({ ...prev, solUser: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="solPassword">Contraseña SOL</Label>
                      <Input
                        id="solPassword"
                        type="password"
                        value={sunatForm.solPassword}
                        onChange={(e) => setSunatForm((prev) => ({ ...prev, solPassword: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="certificateStatus">Estado del certificado</Label>
                      <Input
                        id="certificateStatus"
                        placeholder="Ej. Certificado vigente hasta 12/2025"
                        value={sunatForm.certificateStatus}
                        onChange={(e) =>
                          setSunatForm((prev) => ({ ...prev, certificateStatus: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="contactEmail">Email de contacto SUNAT</Label>
                      <Input
                        id="contactEmail"
                        placeholder="facturacion@empresa.com"
                        value={sunatForm.contactEmail}
                        onChange={(e) => setSunatForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {cfg.key === "dataImport" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Estrategia de datos</Label>
                      <Select
                        value={dataForm.dataStrategy}
                        onValueChange={(value: "demo" | "csv" | "manual") =>
                          setDataForm((prev) => ({ ...prev, dataStrategy: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona estrategia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="demo">Usar datos demo por industria</SelectItem>
                          <SelectItem value="csv">Enviar CSV propio</SelectItem>
                          <SelectItem value="manual">Ingresar manualmente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Industria</Label>
                      <Select
                        value={dataForm.industry}
                        onValueChange={(value: DataFormState["industry"]) =>
                          setDataForm((prev) => ({ ...prev, industry: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona industria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="retail">Retail / Comercio</SelectItem>
                          <SelectItem value="services">Servicios</SelectItem>
                          <SelectItem value="manufacturing">Manufactura</SelectItem>
                          <SelectItem value="other">Otra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="csvFileName">Nombre del archivo CSV (si aplica)</Label>
                      <Input
                        id="csvFileName"
                        placeholder="inventario_demo.csv"
                        value={dataForm.csvFileName}
                        onChange={(e) => setDataForm((prev) => ({ ...prev, csvFileName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="importNotes">Notas</Label>
                      <Textarea
                        id="importNotes"
                        placeholder="Ej. Necesito cargar 200 SKUs, prefiero que el equipo nos asista con la primera carga."
                        value={dataForm.importNotes}
                        onChange={(e) => setDataForm((prev) => ({ ...prev, importNotes: e.target.value }))}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white/80 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/40">
                        <p className="font-medium text-slate-700 dark:text-slate-100">
                          Estado actual de datos demo:{" "}
                          <span className="font-semibold text-sky-600 dark:text-sky-300">
                            {demoStatusLabel[demoStatus]}
                          </span>
                        </p>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">
                          Usa datos demo para explorar plantillas y reportes. Cuando quieras empezar en limpio, presiona
                          el botón &quot;Limpiar datos demo&quot;.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <Button
                            type="button"
                            onClick={handleSeedDemo}
                            disabled={seedingDemo}
                          >
                            {seedingDemo ? "Cargando..." : "Cargar datos demo"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleClearDemo}
                            disabled={clearingDemo || demoStatus === "CLEANING"}
                          >
                            {clearingDemo ? "Limpiando..." : "Limpiar datos demo"}
                          </Button>
                          <Button asChild variant="ghost" className="text-sky-600 hover:text-sky-700 dark:text-sky-300">
                            <Link href="/dashboard/catalog">Ver catálogo demo</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => handleSaveStep(cfg.key, true)}
                    disabled={isSaving(cfg.key)}
                  >
                    {isSaving(cfg.key) ? "Guardando..." : "Guardar y marcar como completo"}
                  </Button>
                  {completed ? (
                    <Button
                      variant="ghost"
                      onClick={() => handleSaveStep(cfg.key, false)}
                      disabled={isSaving(cfg.key)}
                    >
                      Marcar como pendiente
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>
    </div>
  )
}
