"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Info,
  Layers,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

import {
  createOrganization,
  type CreateOrganizationPayload,
  type OrganizationUnitInput,
} from "../tenancy.api"

type MutableUnit = OrganizationUnitInput & { key: string }

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Activa" },
  { value: "INACTIVE", label: "Inactiva" },
]

function generateUnitKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 10)
}

function createUnit(partial: Partial<OrganizationUnitInput> = {}): MutableUnit {
  return {
    key: generateUnitKey(),
    name: partial.name ?? "",
    code: partial.code ?? "",
    status: partial.status ?? STATUS_OPTIONS[0]?.value ?? "ACTIVE",
  }
}

export default function NewOrganizationPage() {
  const router = useRouter()
  const [organization, setOrganization] = useState({
    name: "",
    code: "",
    status: STATUS_OPTIONS[0]?.value ?? "ACTIVE",
  })
  const [units, setUnits] = useState<MutableUnit[]>([createUnit({ name: "General" })])
  const [submitting, setSubmitting] = useState(false)

  const activeUnits = useMemo(
    () => units.filter((unit) => unit.status === "ACTIVE").length,
    [units],
  )

  const handleOrganizationChange = (field: "name" | "code" | "status", value: string) => {
    setOrganization((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleUnitChange = (key: string, field: "name" | "code" | "status", value: string) => {
    setUnits((prev) =>
      prev.map((unit) => (unit.key === key ? { ...unit, [field]: value } : unit)),
    )
  }

  const addUnit = () => {
    setUnits((prev) => [...prev, createUnit()])
  }

  const removeUnit = (key: string) => {
    setUnits((prev) => (prev.length === 1 ? prev : prev.filter((unit) => unit.key !== key)))
  }

  const buildPayload = (): CreateOrganizationPayload => ({
    name: organization.name.trim(),
    code: organization.code.trim() || undefined,
    status: organization.status,
    units: units
      .map((unit) => ({
        name: unit.name.trim(),
        code: unit.code.trim() ? unit.code.trim() : null,
        status: unit.status,
      }))
      .filter((unit) => unit.name.length > 0),
  })

  const validatePayload = (payload: CreateOrganizationPayload) => {
    if (!payload.name) {
      throw new Error("El nombre de la organización es obligatorio.")
    }
    if (!payload.units.length) {
      throw new Error("Debes definir al menos una unidad organizativa con nombre.")
    }
  }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    if (submitting) return

    const payload = buildPayload()

    try {
      validatePayload(payload)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Formulario inválido"
      toast.error(message)
      return
    }

    setSubmitting(true)

    try {
      const response = await createOrganization(payload)
      toast.success(`Organización "${response.name}" creada correctamente.`)
      router.push(`/dashboard/tenancy/${response.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear la organización"
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-3">
        <Badge className="rounded-full bg-sky-100 text-sky-700 dark:bg-slate-800 dark:text-slate-200">
          Gestión multi-tenant
        </Badge>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Crear nueva organización
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Registra un nuevo tenant, define sus unidades operativas y garantiza que los usuarios
              trabajen en un espacio aislado del resto de clientes.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-6">
          <Card className="border-sky-100 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg text-slate-900 dark:text-slate-100">
                <Building2 className="size-5 text-sky-600 dark:text-slate-100" />
                Información de la organización
              </CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Estos datos identifican al tenant y se utilizarán en auditorías y listados del
                sistema.
              </p>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="org-name" className="text-slate-700 dark:text-slate-200">
                  Nombre <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="org-name"
                  placeholder="Ej. Corporación Andes"
                  value={organization.name}
                  onChange={(event) => handleOrganizationChange("name", event.target.value)}
                  required
                  className="bg-white focus-visible:ring-sky-300 dark:bg-slate-900 dark:border-slate-700 dark:focus-visible:ring-slate-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-code" className="text-slate-700 dark:text-slate-200">
                  Código interno
                </Label>
                <Input
                  id="org-code"
                  placeholder="Sigla u otro identificador"
                  value={organization.code}
                  onChange={(event) => handleOrganizationChange("code", event.target.value)}
                  className="bg-white focus-visible:ring-sky-300 dark:bg-slate-900 dark:border-slate-700 dark:focus-visible:ring-slate-600"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-200">Estado</Label>
                <Select
                  value={organization.status}
                  onValueChange={(value) => handleOrganizationChange("status", value)}
                >
                  <SelectTrigger className="bg-white focus-visible:ring-sky-300 dark:bg-slate-900 dark:border-slate-700 dark:focus-visible:ring-slate-600">
                    <SelectValue placeholder="Selecciona el estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="text-xs text-slate-500 dark:text-slate-400">
              Los cambios sobre el estado impactan el acceso global del tenant. Puedes modificarlos
              en cualquier momento.
            </CardFooter>
          </Card>

          <Card className="border-sky-100 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg text-slate-900 dark:text-slate-100">
                <Layers className="size-5 text-sky-600 dark:text-slate-100" />
                Unidades organizativas
              </CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Define áreas o sucursales que se crearán junto con la organización. Puedes agregar
                más unidades luego desde la consola administrativa.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4">
                {units.map((unit, index) => (
                  <div
                    key={unit.key}
                    className={cn(
                      "rounded-lg border border-sky-100 bg-sky-50/50 p-4 shadow-xs transition-colors dark:border-slate-700 dark:bg-slate-900/70",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-100">
                        <ClipboardList className="size-4 text-sky-600 dark:text-slate-300" />
                        Unidad #{index + 1}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeUnit(unit.key)}
                        disabled={units.length === 1}
                        className="text-slate-500 hover:text-rose-500 disabled:opacity-50"
                        aria-label="Eliminar unidad"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-[2fr,1fr,1fr]">
                      <div className="space-y-2">
                        <Label
                          htmlFor={`unit-name-${unit.key}`}
                          className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400"
                        >
                          Nombre de la unidad
                        </Label>
                        <Input
                          id={`unit-name-${unit.key}`}
                          placeholder="Ej. Sucursal Lima Centro"
                          value={unit.name}
                          onChange={(event) => handleUnitChange(unit.key, "name", event.target.value)}
                          className="bg-white focus-visible:ring-sky-300 dark:bg-slate-950 dark:border-slate-700 dark:focus-visible:ring-slate-600"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor={`unit-code-${unit.key}`}
                          className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400"
                        >
                          Código
                        </Label>
                        <Input
                          id={`unit-code-${unit.key}`}
                          placeholder="Opcional"
                          value={unit.code ?? ""}
                          onChange={(event) => handleUnitChange(unit.key, "code", event.target.value)}
                          className="bg-white focus-visible:ring-sky-300 dark:bg-slate-950 dark:border-slate-700 dark:focus-visible:ring-slate-600"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Estado
                        </Label>
                        <Select
                          value={unit.status ?? STATUS_OPTIONS[0]?.value ?? "ACTIVE"}
                          onValueChange={(value) => handleUnitChange(unit.key, "status", value)}
                        >
                          <SelectTrigger className="bg-white focus-visible:ring-sky-300 dark:bg-slate-950 dark:border-slate-700 dark:focus-visible:ring-slate-600">
                            <SelectValue placeholder="Estado" />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addUnit}
                className="w-full gap-2 rounded-full border-sky-200 bg-white text-sky-700 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Plus className="size-4" />
                Añadir otra unidad
              </Button>
            </CardContent>
            <CardFooter className="text-xs text-slate-500 dark:text-slate-400">
              Puedes reorganizar o agregar unidades adicionales más adelante desde el módulo de
              administración avanzada.
            </CardFooter>
          </Card>
        </section>

        <aside className="space-y-6">
          <Card className="border-sky-100 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
                <ShieldCheck className="size-5 text-emerald-600" />
                Resumen de configuración
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-sky-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="space-y-1">
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    Estado operativo
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Controla si los usuarios pueden iniciar sesión bajo esta organización.
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    organization.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
                  )}
                >
                  {
                    STATUS_OPTIONS.find((option) => option.value === organization.status)?.label ??
                    organization.status
                  }
                </Badge>
              </div>

              <Separator className="bg-sky-100 dark:bg-slate-700" />

              <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-3 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="size-4 text-sky-600 dark:text-slate-100" />
                  Unidades activas
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {activeUnits} de {units.length} unidades se crearán como disponibles desde el día
                  uno. Puedes designar unidades adicionales cuando el equipo lo requiera.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-sky-100 dark:border-slate-700 dark:bg-slate-900/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
                <Info className="size-5 text-sky-600 dark:text-slate-100" />
                Buenas prácticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p className="rounded-lg bg-sky-50/80 p-3 dark:bg-slate-900/70">
                Verifica que el código de organización sea único: se utilizará en scripts de seeds,
                pipelines y accesos de integración.
              </p>
              <p className="rounded-lg bg-sky-50/80 p-3 dark:bg-slate-900/70">
                Define al menos una unidad operativa por organización. El equipo de soporte usa esta
                información para delimitar permisos y métricas.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-cyan-600 text-white shadow-sm transition hover:bg-cyan-700 hover:shadow dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                {submitting ? "Creando organización..." : "Crear organización"}
              </Button>
            </CardFooter>
          </Card>
        </aside>
      </form>
    </div>
  )
}
