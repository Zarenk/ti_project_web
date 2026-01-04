'use client'

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Download, Info, Loader2, ShieldAlert, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { cn } from "@/lib/utils"
import {
  OrganizationVerticalInfo,
  VerticalCompatibilityResult,
  VerticalName,
  checkCompanyVerticalCompatibility,
  updateCompanyVertical,
} from "./tenancy.api"
import { VERTICAL_CONFIG_INVALIDATE_EVENT } from "@/hooks/use-vertical-config"
import { VerticalStatusIndicator } from "./vertical-status-indicator"

const VERTICAL_OPTIONS: Array<{
  value: VerticalName
  label: string
  description: string
  enabled: boolean
}> = [
  {
    value: "GENERAL",
    label: "General",
    description: "Configuracion estandar para todo tipo de negocio.",
    enabled: true,
  },
  {
    value: "RETAIL",
    label: "Retail",
    description: "Tiendas fisicas y comercio minorista con variantes.",
    enabled: true,
  },
  {
    value: "RESTAURANTS",
    label: "Restaurantes",
    description: "Optimizado para menu, mesas y pedidos de cocina (muy pronto).",
    enabled: false,
  },
  {
    value: "SERVICES",
    label: "Servicios",
    description: "Consultorias y gestion de proyectos (muy pronto).",
    enabled: false,
  },
  {
    value: "MANUFACTURING",
    label: "Manufactura",
    description: "Produccion y control de planta (muy pronto).",
    enabled: false,
  },
]

type CompatibilityState = {
  target: VerticalName
  result: VerticalCompatibilityResult
}

type Props = {
  organizationId: number
  companyId: number
  info: OrganizationVerticalInfo
}

const VERTICAL_EFFECT_MESSAGES: Partial<Record<VerticalName, string>> = {
  GENERAL:
    "Los formularios vuelven al esquema general. Los campos extra del vertical anterior se ocultarán.",
  RETAIL:
    "Los formularios de productos e inventario ahora solicitarán talla y color por cada variante.",
  RESTAURANTS:
    "Se habilitarán módulos de mesas y cocina. Configura estaciones y tiempos de preparación.",
  SERVICES:
    "El inventario pasa a solo lectura y se prioriza la gestión de citas y proyectos.",
  MANUFACTURING:
    "Se activan órdenes de trabajo, BOM y paneles de producción.",
}

const MIGRATION_ASSISTANT_PATH = "/dashboard/products/migration"
const VERTICAL_NOTICE_STORAGE_PREFIX = "vertical-notice:v1"
const VERTICAL_NOTICE_EVENT = "vertical-change:notice"
const REFRESH_EVENTS = [
  VERTICAL_CONFIG_INVALIDATE_EVENT,
  "tenant-context:refresh",
  "site-settings:refresh",
] as const

const ACTION_BUTTON_CLASS =
  "cursor-pointer transition-transform hover:-translate-y-[1px] hover:shadow-[0_10px_25px_rgba(15,23,42,0.18)] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400 dark:hover:shadow-[0_10px_25px_rgba(8,47,73,0.65)]"

export function VerticalManagementPanel({ organizationId, companyId, info }: Props) {
  const router = useRouter()
  const [selectedVertical, setSelectedVertical] = useState<VerticalName>(info.businessVertical)
  const [compatibility, setCompatibility] = useState<CompatibilityState | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [migrationMode, setMigrationMode] = useState<"auto" | "manual">("auto")
  const [postChangeNotice, setPostChangeNotice] = useState<string | null>(null)
  const [acceptRisk, setAcceptRisk] = useState(false)
  const [isSubmitting, startTransition] = useTransition()
  const persistGlobalNotice = useCallback(
    (message: string) => {
      if (typeof window === "undefined") {
        return
      }
      try {
        const key = `${VERTICAL_NOTICE_STORAGE_PREFIX}:${companyId}`
        window.localStorage.setItem(
          key,
          JSON.stringify({
            message,
            updatedAt: Date.now(),
          }),
        )
        window.dispatchEvent(
          new CustomEvent(VERTICAL_NOTICE_EVENT, {
            detail: { companyId },
          }),
        )
      } catch {
        /* ignore storage failures */
      }
    },
    [companyId],
  )

  const currentOption = useMemo(
    () => VERTICAL_OPTIONS.find((option) => option.value === info.businessVertical),
    [info.businessVertical],
  )

  const targetOption = useMemo(
    () => VERTICAL_OPTIONS.find((option) => option.value === selectedVertical),
    [selectedVertical],
  )

  useEffect(() => {
    setAcceptRisk(false)
    setReason("")
      setCompatibility((prev) => (prev && prev.target === selectedVertical ? prev : null))
    setPostChangeNotice(null)
  }, [selectedVertical])

  const handleCompatibilityCheck = async () => {
    if (selectedVertical === info.businessVertical) {
      toast.info("La empresa ya usa este vertical.")
      return
    }
    if (!targetOption?.enabled) {
      toast.warning("Este vertical aun no esta disponible.")
      return
    }

    setIsChecking(true)
    try {
      const result = await checkCompanyVerticalCompatibility(companyId, selectedVertical)
      setCompatibility({ target: selectedVertical, result })

      if (result.errors.length > 0) {
        toast.error("Hay bloqueos que debes resolver antes de cambiar el vertical.")
      } else if (result.warnings.length > 0) {
        toast.warning("Se detectaron advertencias. Revisa el detalle antes de continuar.")
      } else {
        toast.success("Compatibilidad validada. Puedes continuar con el cambio.")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo validar la compatibilidad."
      toast.error(message)
    } finally {
      setIsChecking(false)
    }
  }

  const compatibilityForSelection =
    compatibility && compatibility.target === selectedVertical ? compatibility.result : null

  const hasCompatibility = Boolean(compatibilityForSelection)
  const hasErrors = Boolean(compatibilityForSelection?.errors.length)
  const requiresRiskAck = (compatibilityForSelection?.warnings.length ?? 0) > 0
  const canApplyChange =
    selectedVertical !== info.businessVertical && hasCompatibility && !hasErrors

  const reasonIsValid = reason.trim().length >= 8
  const confirmDisabled = isSubmitting || !reasonIsValid || (requiresRiskAck && !acceptRisk)

  const openDialog = () => {
    if (!canApplyChange) {
      toast.info("Valida la compatibilidad y resuelve los errores antes de continuar.")
      return
    }
    setDialogOpen(true)
  }

  const handleDownloadReport = () => {
    if (!compatibilityForSelection) {
      toast.info("Genera primero el reporte de compatibilidad.")
      return
    }
    const payload = {
      organizationId,
      companyId,
      targetVertical: selectedVertical,
      generatedAt: new Date().toISOString(),
      result: compatibilityForSelection,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `compatibilidad-vertical-${organizationId}-${companyId}-${selectedVertical}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleConfirmChange = () => {
    if (!compatibilityForSelection) {
      toast.info("Valida la compatibilidad antes de confirmar.")
      return
    }

    startTransition(async () => {
      try {
        const formattedReason = `${reason.trim()} [migracion:${migrationMode}]`
        await updateCompanyVertical(companyId, {
          vertical: selectedVertical,
          reason: formattedReason,
          force: requiresRiskAck ? true : undefined,
        })
        const effectMessage =
          VERTICAL_EFFECT_MESSAGES[selectedVertical] ??
          "La plataforma aplico la configuracion del nuevo vertical."

        toast.success("Vertical actualizado correctamente.", {
          description: effectMessage,
          action: {
            label: "Ver productos legacy",
            onClick: () => router.push(MIGRATION_ASSISTANT_PATH),
          },
        })

        if (compatibilityForSelection.warnings.length > 0) {
          toast.warning("Advertencias pendientes", {
            description: compatibilityForSelection.warnings.join(" · "),
          })
        }

        REFRESH_EVENTS.forEach((eventName) =>
          window.dispatchEvent(new Event(eventName)),
        )

        setDialogOpen(false)
        setCompatibility(null)
        const noticeMessage = `${effectMessage} Revisa el asistente de migración para completar los datos requeridos.`
        setPostChangeNotice(noticeMessage)
        persistGlobalNotice(noticeMessage)
        router.refresh()
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo cambiar el vertical."
        toast.error(message)
      }
    })
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white/70 p-4 text-xs dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Vertical actual
          </p>
          <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {info.config?.displayName ?? currentOption?.label ?? info.businessVertical}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {info.config?.description ?? currentOption?.description ?? "Configuracion personalizada"}
          </p>
        </div>
        <Badge variant="outline" className="self-start text-[11px] uppercase">
          {info.businessVertical}
        </Badge>
      </div>

      {postChangeNotice && (
        <Alert className="border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-100">
          <AlertTitle>Configuración actualizada</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 text-xs">
            <span>{postChangeNotice}</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/dashboard/products">Ir a productos</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href={MIGRATION_ASSISTANT_PATH}>Asistente de migración</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Separator className="bg-slate-200 dark:bg-slate-800" />

      <div className="space-y-2">
        <Label className="text-xs font-medium text-slate-600 dark:text-slate-200">
          Selecciona el vertical objetivo
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                Conoce el impacto del cambio antes de confirmarlo.
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              Cambiar de vertical ajusta módulos y formularios. Valida compatibilidad y completa la migración antes de activar la validación estricta.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Select
          value={selectedVertical}
          onValueChange={(value) => setSelectedVertical(value as VerticalName)}
        >
          <SelectTrigger
            className={cn(
              "w-full cursor-pointer text-sm font-semibold transition-colors",
              "border-slate-200 bg-slate-50/80 text-slate-800 hover:border-slate-300 hover:bg-white",
              "dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-50 dark:hover:border-slate-500 dark:hover:bg-slate-900",
            )}
          >
            <SelectValue placeholder="Elige un vertical" />
          </SelectTrigger>
          <SelectContent className="border-slate-200 bg-white/95 text-slate-800 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-50">
            {VERTICAL_OPTIONS.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={!option.enabled}
                className={cn(
                  "group cursor-pointer rounded-md px-3 py-2 text-left text-sm transition",
                  "data-[state=checked]:border data-[state=checked]:border-slate-300 data-[state=checked]:bg-slate-100 dark:data-[state=checked]:border-slate-600 dark:data-[state=checked]:bg-slate-800",
                  option.enabled
                    ? "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 dark:hover:text-white"
                    : "cursor-not-allowed opacity-45",
                )}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">{option.label}</span>
                  <span className="text-[11px] text-muted-foreground dark:text-slate-400">
                    {option.description}
                  </span>
                  {!option.enabled && (
                    <span className="text-[10px] uppercase tracking-wide text-amber-600">
                      Próximamente
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedVertical !== info.businessVertical && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {VERTICAL_EFFECT_MESSAGES[selectedVertical] ??
            "El cambio aplicará configuraciones específicas de este vertical."}
        </p>
      )}

      <TooltipProvider>
        <div className="flex flex-wrap items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCompatibilityCheck}
                disabled={isChecking}
                className={ACTION_BUTTON_CLASS}
              >
                {isChecking && <Loader2 className="mr-2 size-4 animate-spin" />}
                Validar compatibilidad
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              Ejecuta una verificacion previa para detectar bloqueos o advertencias antes de
              cambiar el vertical.
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                onClick={openDialog}
                disabled={!canApplyChange}
                className={ACTION_BUTTON_CLASS}
              >
                Cambiar vertical
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              Abre el asistente para confirmar el motivo del cambio y registrar la accion en la
              bitacora.
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                disabled={!compatibilityForSelection}
                onClick={handleDownloadReport}
                className={ACTION_BUTTON_CLASS}
              >
                <Download className="mr-2 size-4" />
                Descargar reporte
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              Descarga un resumen JSON con los hallazgos de compatibilidad para archivarlo o
              compartirlo con tu equipo.
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {compatibilityForSelection && (
        <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex items-center justify-between text-[11px] uppercase text-slate-500 dark:text-slate-400">
            <span>Resultado de compatibilidad</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Tiempo estimado: {compatibilityForSelection.estimatedDowntime} min
            </span>
          </div>

          {compatibilityForSelection.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Errores detectados</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                  {compatibilityForSelection.errors.map((error, index) => (
                    <li key={`error-${index}`}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {compatibilityForSelection.warnings.length > 0 && (
            <Alert className="border-amber-400 bg-amber-50 text-amber-900">
              <TriangleAlert className="size-4" />
              <AlertTitle>Advertencias</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                  {compatibilityForSelection.warnings.map((warning, index) => (
                    <li key={`warning-${index}`}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
              Impacto en datos
            </p>
            <ScrollArea className="h-32 rounded-md border border-dashed border-slate-200 p-2 dark:border-slate-700">
              <div className="space-y-2 text-xs">
                {compatibilityForSelection.dataImpact.tables.map((table) => (
                  <div
                    key={table.name}
                    className="flex flex-col rounded-md bg-white/80 p-2 shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:bg-slate-900/80"
                  >
                    <div className="flex items-center justify-between text-[11px] uppercase text-slate-500 dark:text-slate-400">
                      <span>{table.name}</span>
                      <span>{table.recordCount} registros</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                      {table.willBeHidden && <Badge variant="secondary">Solo lectura</Badge>}
                      {table.willBeMigrated && <Badge variant="secondary">Requiere migracion</Badge>}
                      {table.backupRecommended && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                          Recomendar backup
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {compatibilityForSelection.dataImpact.customFields.length > 0 && (
                  <div className="rounded-md bg-white/80 p-2 text-[11px] dark:bg-slate-900/80">
                    <p className="font-semibold text-slate-600 dark:text-slate-200">
                      Campos personalizados
                    </p>
                    <ul className="mt-1 list-disc pl-4">
                      {compatibilityForSelection.dataImpact.customFields.map((field, index) => (
                        <li key={`field-${index}`}>
                          {field.entity}: {field.field}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {compatibilityForSelection.dataImpact.integrations.length > 0 && (
                  <div className="rounded-md bg-white/80 p-2 text-[11px] dark:bg-slate-900/80">
                    <p className="font-semibold text-slate-600 dark:text-slate-200">
                      Integraciones activas
                    </p>
                    <p>{compatibilityForSelection.dataImpact.integrations.join(", ")}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
          Estado de migracion
        </p>
        <VerticalStatusIndicator
          organizationId={organizationId}
          companyId={companyId}
          info={info}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cambiar vertical a {targetOption?.label ?? selectedVertical}</DialogTitle>
            <DialogDescription>
              Confirma el motivo del cambio. Esta accion se registrara en la bitacora.
            </DialogDescription>
          </DialogHeader>

          {requiresRiskAck && (
            <Alert className="border-amber-400 bg-amber-50 text-amber-900">
              <ShieldAlert className="size-4" />
              <AlertTitle>Advertencias pendientes</AlertTitle>
              <AlertDescription>
                Debes reconocer los riesgos antes de continuar. Revisa el reporte para mas detalle.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="change-reason">Motivo del cambio</Label>
              <Textarea
                id="change-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Describe por que necesitas cambiar el vertical..."
              />
              {!reasonIsValid && (
                <p className="text-[11px] text-amber-600">
                  Describe el motivo con al menos 8 caracteres.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Scripts de migración</Label>
              <Select
                value={migrationMode}
                onValueChange={(value) => setMigrationMode(value as "auto" | "manual")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el modo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Ejecutar automáticamente al confirmar</SelectItem>
                  <SelectItem value="manual">
                    Ejecutar manualmente desde el asistente
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Puedes optar por ejecutar los scripts inmediatamente o hacerlo luego en el asistente de migración.
              </p>
            </div>
            {requiresRiskAck && (
              <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-600 dark:text-slate-200">
                <Checkbox
                  id="risk-ack"
                  checked={acceptRisk}
                  onCheckedChange={(value) => setAcceptRisk(Boolean(value))}
                />
                <span>Confirmo que revise las advertencias y acepto continuar bajo mi responsabilidad.</span>
              </label>
            )}
          </div>

          {isSubmitting && (
            <Alert className="border-slate-300 bg-slate-50 text-slate-700">
              <Loader2 className="size-4 animate-spin" />
              <AlertTitle>Procesando cambio…</AlertTitle>
              <AlertDescription>
                Estamos actualizando la configuracion. Esto puede tardar algunos segundos.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" size="sm" onClick={handleDownloadReport}>
              <Download className="mr-2 size-4" />
              Descargar reporte
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmChange} disabled={confirmDisabled}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Confirmar cambio
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
