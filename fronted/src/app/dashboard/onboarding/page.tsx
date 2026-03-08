"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { z } from "zod"
import {
  Building2,
  Store as StoreIcon,
  ShieldCheck,
  UploadCloud,
  CheckCircle,
  Circle,
  RefreshCcw,
  Search,
  Loader2,
  MapPin,
  X,
  FileSpreadsheet,
  ArrowRight,
  SkipForward,
  ChevronLeft,
  ChevronRight,
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
import type { DemoDataStatus, OnboardingProgress, OnboardingStepKey } from "@/types/onboarding"
import {
  clearDemoData,
  fetchOnboardingProgress,
  seedDemoData,
  updateOnboardingStep,
} from "@/lib/onboarding-progress"
import { getCurrentTenant } from "@/app/dashboard/tenancy/tenancy.api"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { queryKeys } from "@/lib/query-keys"
import { lookupSunatDocument, type LookupResponse } from "@/app/dashboard/sales/sales.api"
import { uploadProductImage } from "@/app/dashboard/products/products.api"
import { importExcelFile, commitImportedExcelData } from "@/app/dashboard/inventory/inventory.api"
import { cn } from "@/lib/utils"

/* ─── Zod Schemas ─── */

const companySchema = z.object({
  legalName: z.string().min(3, "La razón social debe tener al menos 3 caracteres"),
  ruc: z.string().regex(/^\d{11}$/, "El RUC debe tener exactamente 11 dígitos"),
  address: z.string().optional().or(z.literal("")),
  logoUrl: z.string().optional().or(z.literal("")),
})

const storeSchema = z.object({
  primaryStore: z.string().min(2, "La tienda principal es obligatoria"),
  additionalStores: z.string().optional().or(z.literal("")),
  warehouseNotes: z.string().optional().or(z.literal("")),
})

const sunatSchema = z.object({
  environment: z.enum(["BETA", "PRODUCCION"]),
  solUser: z.string().optional().or(z.literal("")),
  solPassword: z.string().optional().or(z.literal("")),
  certificateStatus: z.string().optional().or(z.literal("")),
  contactEmail: z.string().optional().or(z.literal("")),
})

const dataSchema = z.object({
  dataStrategy: z.enum(["demo", "csv", "manual"], { required_error: "Selecciona una estrategia" }),
  industry: z.enum(["retail", "services", "manufacturing", "other"]),
  importNotes: z.string().optional().or(z.literal("")),
})

const schemaMap: Record<OnboardingStepKey, z.ZodSchema> = {
  companyProfile: companySchema,
  storeSetup: storeSchema,
  sunatSetup: sunatSchema,
  dataImport: dataSchema,
}

function formatZodErrors(error: z.ZodError): Record<string, string> {
  const map: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".")
    if (!map[key]) map[key] = issue.message
  }
  return map
}

/* ─── Step Config ─── */

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

/* ─── Form Types ─── */

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
  importNotes: string
}

const defaultCompanyForm: CompanyFormState = { legalName: "", ruc: "", address: "", logoUrl: "" }
const defaultStoreForm: StoreFormState = { primaryStore: "", additionalStores: "", warehouseNotes: "" }
const defaultSunatForm: SunatFormState = { environment: "BETA", solUser: "", solPassword: "", certificateStatus: "", contactEmail: "" }
const defaultDataForm: DataFormState = { dataStrategy: "demo", industry: "retail", importNotes: "" }

function formatDate(value?: string | null) {
  if (!value) return null
  try {
    return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  } catch {
    return value
  }
}

/* ─── Component ─── */

export default function OnboardingWizardPage() {
  const { selection } = useTenantSelection()
  const queryClient = useQueryClient()

  // Core state
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [savingStep, setSavingStep] = useState<OnboardingStepKey | null>(null)
  const [clearingDemo, setClearingDemo] = useState(false)
  const [seedingDemo, setSeedingDemo] = useState(false)

  // Form states
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(defaultCompanyForm)
  const [storeForm, setStoreForm] = useState<StoreFormState>(defaultStoreForm)
  const [sunatForm, setSunatForm] = useState<SunatFormState>(defaultSunatForm)
  const [dataForm, setDataForm] = useState<DataFormState>(defaultDataForm)

  // Validation errors: stepKey → { fieldName → message }
  const [fieldErrors, setFieldErrors] = useState<Record<string, Record<string, string>>>({})

  // SUNAT lookup state
  const [sunatDialogOpen, setSunatDialogOpen] = useState(false)
  const [sunatSearchValue, setSunatSearchValue] = useState("")
  const [sunatSearchResult, setSunatSearchResult] = useState<LookupResponse | null>(null)
  const [sunatSearchError, setSunatSearchError] = useState<string | null>(null)
  const [sunatSearchLoading, setSunatSearchLoading] = useState(false)

  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null)

  // CSV upload state
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvPreview, setCsvPreview] = useState<any[] | null>(null)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvError, setCsvError] = useState<string | null>(null)
  const [csvSuccess, setCsvSuccess] = useState(false)

  // Wizard navigation state
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [wizardInitialized, setWizardInitialized] = useState(false)

  // Metrics tracking: time spent per step
  const stepEnteredAt = useRef<number>(Date.now())
  const accumulatedTime = useRef<Record<string, number>>({})

  const trackStepTime = useCallback((leavingIndex: number) => {
    const key = STEP_CONFIG[leavingIndex]?.key
    if (!key) return
    const elapsed = Date.now() - stepEnteredAt.current
    accumulatedTime.current[key] = (accumulatedTime.current[key] ?? 0) + elapsed
  }, [])

  const navigateToStep = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= STEP_CONFIG.length) return
    trackStepTime(activeStepIndex)
    setActiveStepIndex(newIndex)
    stepEnteredAt.current = Date.now()
  }, [activeStepIndex, trackStepTime])

  const onboardingKey = queryKeys.onboarding.progress(selection.orgId, selection.companyId)

  const { isLoading: loading, error: queryError } = useQuery({
    queryKey: onboardingKey,
    queryFn: async () => {
      const response = await fetchOnboardingProgress()
      setProgress(response)
      hydrateForms(response)
      await prefillFromTenantContext()
      return response
    },
    enabled: selection.orgId !== null,
  })

  const error = queryError ? "No se pudo cargar el estado del onboarding." : null

  function loadProgress() {
    queryClient.invalidateQueries({ queryKey: onboardingKey })
  }

  // Initialize wizard to first incomplete step
  useEffect(() => {
    if (!progress || wizardInitialized) return
    const firstPending = STEP_CONFIG.findIndex((cfg) => !progress[cfg.key]?.completed)
    setActiveStepIndex(firstPending >= 0 ? firstPending : STEP_CONFIG.length - 1)
    stepEnteredAt.current = Date.now()
    setWizardInitialized(true)
  }, [progress, wizardInitialized])

  function hydrateForms(data: OnboardingProgress) {
    setCompanyForm(mergeForm(defaultCompanyForm, (data.companyProfile?.data as Record<string, any> | null) ?? null))
    setStoreForm(mergeForm(defaultStoreForm, (data.storeSetup?.data as Record<string, any> | null) ?? null))
    setSunatForm(mergeForm(defaultSunatForm, (data.sunatSetup?.data as Record<string, any> | null) ?? null))
    setDataForm(mergeForm(defaultDataForm, (data.dataImport?.data as Record<string, any> | null) ?? null))
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

  /* ─── Validation ─── */

  function validateStep(step: OnboardingStepKey): boolean {
    const schema = schemaMap[step]
    const payload = getPayload(step)
    const result = schema.safeParse(payload)
    if (result.success) {
      setFieldErrors((prev) => ({ ...prev, [step]: {} }))
      return true
    }
    const errors = formatZodErrors(result.error)
    setFieldErrors((prev) => ({ ...prev, [step]: errors }))
    return false
  }

  function getFieldError(step: OnboardingStepKey, field: string): string | undefined {
    return fieldErrors[step]?.[field]
  }

  function clearFieldError(step: OnboardingStepKey, field: string) {
    setFieldErrors((prev) => {
      const stepErrors = { ...prev[step] }
      delete stepErrors[field]
      return { ...prev, [step]: stepErrors }
    })
  }

  /* ─── Save Step ─── */

  async function handleSaveStep(step: OnboardingStepKey, markComplete: boolean) {
    if (markComplete) {
      if (!validateStep(step)) {
        toast.error("Completa los campos obligatorios antes de guardar.")
        return
      }
    }
    try {
      setSavingStep(step)
      // Include metrics in the payload
      trackStepTime(activeStepIndex)
      const basePayload = getPayload(step)
      const payload = {
        ...basePayload,
        _metrics: {
          timeSpentMs: accumulatedTime.current[step] ?? 0,
          viewedAt: new Date().toISOString(),
        },
      }
      const updated = await updateOnboardingStep({ step, completed: markComplete, payload })
      setProgress(updated)
      hydrateForms(updated)
      toast.success(markComplete ? "Paso guardado y marcado como completo." : "Paso configurado como pendiente.")

      // Auto-advance to next incomplete step after completing
      if (markComplete) {
        const nextPending = STEP_CONFIG.findIndex(
          (cfg) => cfg.key !== step && !updated[cfg.key]?.completed,
        )
        if (nextPending >= 0) {
          setActiveStepIndex(nextPending)
          stepEnteredAt.current = Date.now()
        }
      }
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : "No se pudo guardar el paso."
      toast.error(message)
    } finally {
      setSavingStep(null)
    }
  }

  /* ─── Demo Data ─── */

  async function handleClearDemo() {
    if (progress?.demoStatus === "NONE") {
      toast.info("No hay datos demo que limpiar.")
      return
    }
    const confirmed = window.confirm("Se eliminarán todos los registros marcados como demo. Esta acción no se puede deshacer. ¿Deseas continuar?")
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

  /* ─── SUNAT Lookup ─── */

  function resetSunatDialog() {
    setSunatSearchValue("")
    setSunatSearchResult(null)
    setSunatSearchError(null)
    setSunatSearchLoading(false)
  }

  async function handleSunatSearch() {
    const value = sunatSearchValue.trim()
    if (!/^\d{8}$|^\d{11}$/.test(value)) {
      setSunatSearchError("Ingresa un DNI (8 dígitos) o RUC (11 dígitos).")
      setSunatSearchResult(null)
      return
    }
    setSunatSearchLoading(true)
    setSunatSearchError(null)
    setSunatSearchResult(null)
    try {
      const result = await lookupSunatDocument(value)
      setSunatSearchResult(result)
    } catch (err) {
      setSunatSearchError(err instanceof Error ? err.message : "No se pudo consultar el documento.")
    } finally {
      setSunatSearchLoading(false)
    }
  }

  function handleSelectSunatResult(result: LookupResponse) {
    if (result.name && !result.name.startsWith("(")) {
      setCompanyForm((prev) => ({ ...prev, legalName: result.name }))
    }
    setCompanyForm((prev) => ({
      ...prev,
      ruc: result.identifier ?? prev.ruc,
      address: result.address ?? prev.address,
    }))
    // Clear validation errors for auto-filled fields
    setFieldErrors((prev) => ({ ...prev, companyProfile: {} }))
    setSunatDialogOpen(false)
    resetSunatDialog()
    toast.success("Datos de la empresa aplicados desde SUNAT.")
  }

  /* ─── Logo Upload ─── */

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    setLogoUploadError(null)
    try {
      const { url } = await uploadProductImage(file)
      setCompanyForm((prev) => ({ ...prev, logoUrl: url }))
    } catch (err) {
      setLogoUploadError(err instanceof Error ? err.message : "Error al subir imagen")
    } finally {
      setUploadingLogo(false)
      e.target.value = ""
    }
  }

  /* ─── CSV/Excel Upload ─── */

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvUploading(true)
    setCsvError(null)
    setCsvPreview(null)
    setCsvSuccess(false)
    try {
      const result = await importExcelFile(file)
      setCsvPreview(result.preview ?? [])
      toast.success(`Archivo cargado: ${result.preview?.length ?? 0} filas detectadas.`)
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : "Error al procesar archivo.")
    } finally {
      setCsvUploading(false)
      e.target.value = ""
    }
  }

  async function handleCsvCommit() {
    if (!csvPreview || csvPreview.length === 0) return
    setCsvImporting(true)
    setCsvError(null)
    try {
      await commitImportedExcelData(csvPreview, 0, 0, null)
      setCsvSuccess(true)
      setCsvPreview(null)
      toast.success("Datos importados correctamente.")
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : "Error al importar datos.")
    } finally {
      setCsvImporting(false)
    }
  }

  /* ─── Payload Builder ─── */

  function getPayload(step: OnboardingStepKey): Record<string, any> {
    switch (step) {
      case "companyProfile": return companyForm
      case "storeSetup": return storeForm
      case "sunatSetup": return sunatForm
      case "dataImport": return dataForm
      default: return {}
    }
  }

  const isSaving = (step: OnboardingStepKey) => savingStep === step

  const isSunatEmpty = !sunatForm.solUser.trim() && !sunatForm.solPassword.trim() && !sunatForm.certificateStatus.trim()

  /* ─── Render ─── */

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
        <Button onClick={loadProgress} className="cursor-pointer">Reintentar</Button>
      </div>
    )
  }

  if (!progress) return null

  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        {/* ── Progress Header ── */}
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
              <p className="text-xs text-slate-500 dark:text-slate-400">{completedCount}/{STEP_CONFIG.length} pasos completados</p>
            </div>
          </div>
          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-white/70 dark:bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>
          {/* Step navigation pills */}
          <div className="mt-6 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2 md:grid-cols-4">
            {STEP_CONFIG.map((cfg, idx) => {
              const state = progress[cfg.key]
              const completed = Boolean(state?.completed)
              const isActive = idx === activeStepIndex
              return (
                <button
                  type="button"
                  key={cfg.key}
                  onClick={() => navigateToStep(idx)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-left cursor-pointer",
                    "transition-all duration-200 ease-out",
                    isActive
                      ? "border-sky-400 bg-white ring-2 ring-sky-200 shadow-sm dark:border-sky-500 dark:bg-slate-900/80 dark:ring-sky-800"
                      : completed
                        ? "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:shadow-sm dark:border-emerald-600/40 dark:bg-emerald-900/20 dark:hover:border-emerald-500/60"
                        : "border-slate-200 bg-white/70 hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-600",
                  )}
                >
                  {completed ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  ) : isActive ? (
                    <div className="h-4 w-4 rounded-full border-2 border-sky-500 flex items-center justify-center flex-shrink-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                    </div>
                  ) : (
                    <Circle className="h-4 w-4 text-slate-300 flex-shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Paso {idx + 1}</span>
                    <span className={cn(
                      "text-sm font-medium break-words",
                      isActive ? "text-sky-700 dark:text-sky-200" : completed ? "text-emerald-700 dark:text-emerald-200" : "text-slate-900 dark:text-slate-100",
                    )}>{cfg.title}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Active Step Card ── */}
        <section className="grid gap-6">
          {(() => {
            const cfg = STEP_CONFIG[activeStepIndex]
            if (!cfg) return null
            const state = progress[cfg.key]
            const completed = Boolean(state?.completed)
            const Icon = cfg.icon
            return (
              <Card key={cfg.key} id={cfg.key} className="border-slate-200 dark:border-slate-800 w-full min-w-0 overflow-hidden animate-in fade-in-0 slide-in-from-right-2 duration-300">
                <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex flex-col gap-2 w-full min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-sky-100 p-2 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200 flex-shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <CardTitle className="text-xl">
                          <span className="text-slate-400 dark:text-slate-500 font-normal mr-1">Paso {activeStepIndex + 1}/{STEP_CONFIG.length}</span>
                          {cfg.title}
                        </CardTitle>
                        <Badge variant={completed ? "default" : "outline"} className="text-xs">
                          {completed ? "Completado" : "Pendiente"}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>{cfg.description}</CardDescription>
                    {cfg.helper && <p className="text-sm text-slate-500 dark:text-slate-400">{cfg.helper}</p>}
                  </div>
                  <div className="flex flex-col items-start gap-1 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                    {state?.updatedAt ? <span>Última actualización: {formatDate(state.updatedAt)}</span> : <span>Aún sin cambios</span>}
                    {state?.completedAt && <span>Completado el {formatDate(state.completedAt)}</span>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 overflow-hidden">
                  {/* ── Paso 1: Datos de la empresa ── */}
                  {cfg.key === "companyProfile" && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="legalName">Razón social <span className="text-red-500">*</span></Label>
                        <Input
                          id="legalName"
                          placeholder="Ej. Tecnologías Integradas SAC"
                          value={companyForm.legalName}
                          onChange={(e) => {
                            setCompanyForm((prev) => ({ ...prev, legalName: e.target.value }))
                            clearFieldError("companyProfile", "legalName")
                          }}
                        />
                        {getFieldError("companyProfile", "legalName") && (
                          <p className="text-xs text-red-500">{getFieldError("companyProfile", "legalName")}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ruc">RUC <span className="text-red-500">*</span></Label>
                        <div className="flex items-center gap-1.5 w-full min-w-0">
                          <Input
                            id="ruc"
                            maxLength={11}
                            placeholder="11 dígitos"
                            className="flex-1 min-w-0 font-mono"
                            value={companyForm.ruc}
                            onChange={(e) => {
                              setCompanyForm((prev) => ({ ...prev, ruc: e.target.value.replace(/\D/g, "").slice(0, 11) }))
                              clearFieldError("companyProfile", "ruc")
                            }}
                          />
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 cursor-pointer flex-shrink-0 text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                                  onClick={() => {
                                    setSunatSearchValue(companyForm.ruc.trim())
                                    setSunatSearchResult(null)
                                    setSunatSearchError(null)
                                    setSunatDialogOpen(true)
                                  }}
                                >
                                  <Search className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">Consulta SUNAT</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        {getFieldError("companyProfile", "ruc") && (
                          <p className="text-xs text-red-500">{getFieldError("companyProfile", "ruc")}</p>
                        )}
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
                        <Label>Logo de la empresa</Label>
                        <div className="flex items-center gap-4 w-full min-w-0">
                          {companyForm.logoUrl && (
                            <div className="relative h-16 w-16 rounded-lg border overflow-hidden flex-shrink-0 bg-white dark:bg-slate-800">
                              <img src={companyForm.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                              <button
                                type="button"
                                onClick={() => setCompanyForm((prev) => ({ ...prev, logoUrl: "" }))}
                                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-200">
                            <UploadCloud className="h-4 w-4" />
                            {uploadingLogo ? "Subiendo..." : "Subir logo"}
                            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                          </label>
                        </div>
                        {logoUploadError && <p className="text-xs text-red-500">{logoUploadError}</p>}
                      </div>
                    </div>
                  )}

                  {/* ── Paso 2: Tiendas ── */}
                  {cfg.key === "storeSetup" && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="primaryStore">Tienda principal <span className="text-red-500">*</span></Label>
                        <Input
                          id="primaryStore"
                          placeholder="Ej. Sede Central Lima"
                          value={storeForm.primaryStore}
                          onChange={(e) => {
                            setStoreForm((prev) => ({ ...prev, primaryStore: e.target.value }))
                            clearFieldError("storeSetup", "primaryStore")
                          }}
                        />
                        {getFieldError("storeSetup", "primaryStore") && (
                          <p className="text-xs text-red-500">{getFieldError("storeSetup", "primaryStore")}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="additionalStores">Tiendas adicionales</Label>
                        <Input
                          id="additionalStores"
                          placeholder="Ej. Trujillo, Arequipa (separadas por coma)"
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

                  {/* ── Paso 3: SUNAT (opcional) ── */}
                  {cfg.key === "sunatSetup" && (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-800/40 dark:bg-amber-950/20">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          <strong>Este paso es opcional.</strong> Si no tienes credenciales SUNAT aún, puedes completarlo después desde{" "}
                          <Link href="/dashboard/settings" className="underline font-medium cursor-pointer">Configuración → SUNAT</Link>.
                        </p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Ambiente</Label>
                          <Select
                            value={sunatForm.environment}
                            onValueChange={(value: "BETA" | "PRODUCCION") => setSunatForm((prev) => ({ ...prev, environment: value }))}
                          >
                            <SelectTrigger className="cursor-pointer"><SelectValue placeholder="Selecciona ambiente" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BETA" className="cursor-pointer">Beta / Homologación</SelectItem>
                              <SelectItem value="PRODUCCION" className="cursor-pointer">Producción</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="solUser">Usuario SOL</Label>
                          <Input id="solUser" placeholder="USUARIO123" value={sunatForm.solUser} onChange={(e) => setSunatForm((prev) => ({ ...prev, solUser: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="solPassword">Contraseña SOL</Label>
                          <Input id="solPassword" type="password" value={sunatForm.solPassword} onChange={(e) => setSunatForm((prev) => ({ ...prev, solPassword: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="certificateStatus">Estado del certificado</Label>
                          <Input id="certificateStatus" placeholder="Ej. Certificado vigente hasta 12/2026" value={sunatForm.certificateStatus} onChange={(e) => setSunatForm((prev) => ({ ...prev, certificateStatus: e.target.value }))} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="contactEmail">Email de contacto SUNAT</Label>
                          <Input id="contactEmail" placeholder="facturacion@empresa.com" value={sunatForm.contactEmail} onChange={(e) => setSunatForm((prev) => ({ ...prev, contactEmail: e.target.value }))} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Paso 4: Importar datos ── */}
                  {cfg.key === "dataImport" && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Estrategia de datos <span className="text-red-500">*</span></Label>
                        <Select
                          value={dataForm.dataStrategy}
                          onValueChange={(value: "demo" | "csv" | "manual") => {
                            setDataForm((prev) => ({ ...prev, dataStrategy: value }))
                            clearFieldError("dataImport", "dataStrategy")
                            setCsvPreview(null)
                            setCsvError(null)
                            setCsvSuccess(false)
                          }}
                        >
                          <SelectTrigger className="cursor-pointer"><SelectValue placeholder="Selecciona estrategia" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="demo" className="cursor-pointer">Usar datos demo por industria</SelectItem>
                            <SelectItem value="csv" className="cursor-pointer">Importar archivo Excel/CSV</SelectItem>
                            <SelectItem value="manual" className="cursor-pointer">Ingresar manualmente</SelectItem>
                          </SelectContent>
                        </Select>
                        {getFieldError("dataImport", "dataStrategy") && (
                          <p className="text-xs text-red-500">{getFieldError("dataImport", "dataStrategy")}</p>
                        )}
                      </div>
                      {dataForm.dataStrategy === "demo" && (
                        <div className="space-y-2">
                          <Label>Industria</Label>
                          <Select
                            value={dataForm.industry}
                            onValueChange={(value: DataFormState["industry"]) => setDataForm((prev) => ({ ...prev, industry: value }))}
                          >
                            <SelectTrigger className="cursor-pointer"><SelectValue placeholder="Selecciona industria" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="retail" className="cursor-pointer">Retail / Comercio</SelectItem>
                              <SelectItem value="services" className="cursor-pointer">Servicios</SelectItem>
                              <SelectItem value="manufacturing" className="cursor-pointer">Manufactura</SelectItem>
                              <SelectItem value="other" className="cursor-pointer">Otra</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Demo section */}
                      {dataForm.dataStrategy === "demo" && (
                        <div className="md:col-span-2">
                          <div className="rounded-xl border border-dashed border-slate-300 bg-white/80 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/40">
                            <p className="font-medium text-slate-700 dark:text-slate-100">
                              Estado actual de datos demo:{" "}
                              <span className="font-semibold text-sky-600 dark:text-sky-300">{demoStatusLabel[demoStatus]}</span>
                            </p>
                            <p className="mt-1 text-slate-500 dark:text-slate-400">
                              Usa datos demo para explorar plantillas y reportes. Cuando quieras empezar en limpio, presiona &quot;Limpiar datos demo&quot;.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-3">
                              <Button type="button" className="cursor-pointer" onClick={handleSeedDemo} disabled={seedingDemo}>
                                {seedingDemo ? "Cargando..." : "Cargar datos demo"}
                              </Button>
                              <Button type="button" variant="outline" className="cursor-pointer" onClick={handleClearDemo} disabled={clearingDemo || demoStatus === "CLEANING"}>
                                {clearingDemo ? "Limpiando..." : "Limpiar datos demo"}
                              </Button>
                              <Button asChild variant="ghost" className="cursor-pointer text-sky-600 hover:text-sky-700 dark:text-sky-300">
                                <Link href="/dashboard/catalog">Ver catálogo demo</Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* CSV/Excel upload section */}
                      {dataForm.dataStrategy === "csv" && (
                        <div className="md:col-span-2 space-y-4">
                          <div className="rounded-xl border border-dashed border-slate-300 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                            <div className="flex flex-col items-center gap-3 text-center">
                              <FileSpreadsheet className="h-8 w-8 text-slate-400" />
                              <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Importar desde Excel/CSV</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sube un archivo con tus productos para cargarlos automáticamente.</p>
                              </div>
                              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                                <UploadCloud className="h-4 w-4" />
                                {csvUploading ? "Procesando..." : "Seleccionar archivo"}
                                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleCsvUpload} disabled={csvUploading} />
                              </label>
                            </div>
                          </div>

                          {csvError && (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800/40">
                              <X className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-red-600 dark:text-red-400 break-words">{csvError}</p>
                            </div>
                          )}

                          {csvPreview && csvPreview.length > 0 && (
                            <div className="space-y-3">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                Vista previa: {csvPreview.length} filas detectadas
                              </p>
                              <div className="overflow-x-auto rounded-lg border max-h-48">
                                <table className="w-full text-xs">
                                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                                    <tr>
                                      {Object.keys(csvPreview[0] ?? {}).slice(0, 6).map((col) => (
                                        <th key={col} className="px-2 py-1.5 text-left font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">{col}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {csvPreview.slice(0, 5).map((row, i) => (
                                      <tr key={i} className="border-t">
                                        {Object.values(row).slice(0, 6).map((val: any, j) => (
                                          <td key={j} className="px-2 py-1 text-slate-600 dark:text-slate-300 whitespace-nowrap max-w-[120px] truncate">{String(val ?? "")}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <Button className="cursor-pointer" onClick={handleCsvCommit} disabled={csvImporting}>
                                {csvImporting ? "Importando..." : `Confirmar importación (${csvPreview.length} filas)`}
                              </Button>
                            </div>
                          )}

                          {csvSuccess && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40">
                              <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                              <p className="text-sm text-emerald-700 dark:text-emerald-300">Datos importados correctamente.</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Manual strategy section */}
                      {dataForm.dataStrategy === "manual" && (
                        <div className="md:col-span-2">
                          <div className="rounded-xl border border-dashed border-slate-300 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">
                              Puedes empezar a cargar datos manualmente desde:
                            </p>
                            <div className="flex flex-col gap-2">
                              {[
                                { label: "Productos", href: "/dashboard/products" },
                                { label: "Inventario", href: "/dashboard/inventory" },
                                { label: "Clientes", href: "/dashboard/clients" },
                              ].map((link) => (
                                <Link
                                  key={link.href}
                                  href={link.href}
                                  className="inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 font-medium cursor-pointer"
                                >
                                  <ArrowRight className="h-3.5 w-3.5" />
                                  {link.label}
                                </Link>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="importNotes">Notas</Label>
                        <Textarea
                          id="importNotes"
                          placeholder="Ej. Necesito cargar 200 SKUs, prefiero que el equipo nos asista con la primera carga."
                          value={dataForm.importNotes}
                          onChange={(e) => setDataForm((prev) => ({ ...prev, importNotes: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* ── Action Buttons + Navigation ── */}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-3">
                      {cfg.key === "sunatSetup" && isSunatEmpty ? (
                        <Button
                          className="cursor-pointer gap-2"
                          variant="secondary"
                          onClick={() => handleSaveStep(cfg.key, true)}
                          disabled={isSaving(cfg.key)}
                        >
                          {isSaving(cfg.key) ? "Guardando..." : (
                            <>
                              <SkipForward className="h-4 w-4" />
                              Saltar por ahora
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          className="cursor-pointer"
                          onClick={() => handleSaveStep(cfg.key, true)}
                          disabled={isSaving(cfg.key)}
                        >
                          {isSaving(cfg.key) ? "Guardando..." : "Guardar y marcar como completo"}
                        </Button>
                      )}
                      {completed && (
                        <Button
                          variant="ghost"
                          className="cursor-pointer"
                          onClick={() => handleSaveStep(cfg.key, false)}
                          disabled={isSaving(cfg.key)}
                        >
                          Marcar como pendiente
                        </Button>
                      )}
                    </div>

                    {/* Wizard navigation */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer gap-1.5"
                        onClick={() => navigateToStep(activeStepIndex - 1)}
                        disabled={activeStepIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Anterior</span>
                      </Button>
                      <span className="text-xs text-muted-foreground tabular-nums px-1">
                        {activeStepIndex + 1} / {STEP_CONFIG.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer gap-1.5"
                        onClick={() => navigateToStep(activeStepIndex + 1)}
                        disabled={activeStepIndex === STEP_CONFIG.length - 1}
                      >
                        <span className="hidden sm:inline">Siguiente</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })()}
        </section>
      </div>

      {/* ── SUNAT Lookup Dialog ── */}
      <Dialog
        open={sunatDialogOpen}
        onOpenChange={(open) => {
          setSunatDialogOpen(open)
          if (!open) resetSunatDialog()
        }}
      >
        <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
              Consulta SUNAT
            </DialogTitle>
            <DialogDescription>
              Ingresa un RUC (11 dígitos) para buscar los datos de tu empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 w-full min-w-0">
            <div className="flex gap-2">
              <Input
                value={sunatSearchValue}
                onChange={(e) => setSunatSearchValue(e.target.value)}
                placeholder="Ej: 20519857538"
                className="font-mono flex-1 min-w-0"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); void handleSunatSearch() }
                }}
              />
              <Button type="button" onClick={handleSunatSearch} disabled={sunatSearchLoading} className="cursor-pointer flex-shrink-0">
                {sunatSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {sunatSearchError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 w-full min-w-0 overflow-hidden">
                <X className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive break-words">{sunatSearchError}</p>
              </div>
            )}

            {sunatSearchResult ? (
              <div
                className={cn(
                  "p-3 rounded-lg border cursor-pointer w-full min-w-0 overflow-hidden",
                  "transition-all duration-200 ease-out",
                  "hover:bg-primary/5 hover:border-primary/30 hover:shadow-sm",
                  "active:scale-[0.98]",
                )}
                onClick={() => handleSelectSunatResult(sunatSearchResult)}
              >
                <div className="flex items-start justify-between gap-2 w-full min-w-0">
                  <div className="flex flex-col gap-1 w-full min-w-0 overflow-hidden">
                    <p className="text-sm font-semibold break-words leading-snug">{sunatSearchResult.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{sunatSearchResult.type}: {sunatSearchResult.identifier}</p>
                  </div>
                  {sunatSearchResult.status && (
                    <span className={cn(
                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 tracking-wide",
                      sunatSearchResult.status === "ACTIVO" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-red-500/15 text-red-600 dark:text-red-400",
                    )}>
                      {sunatSearchResult.status}
                    </span>
                  )}
                </div>
                {sunatSearchResult.address && sunatSearchResult.address !== "—" && (
                  <div className="flex items-start gap-1.5 mt-2 pt-2 border-t w-full min-w-0 overflow-hidden">
                    <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground break-words leading-relaxed">{sunatSearchResult.address}</p>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-2 text-center">Clic para aplicar datos al formulario</p>
              </div>
            ) : !sunatSearchLoading && !sunatSearchError ? (
              <div className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border border-dashed text-center">
                <Search className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Ingresa un RUC y presiona buscar.</p>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
