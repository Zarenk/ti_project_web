"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import {
  createOrganization,
  type CreateOrganizationPayload,
  type OrganizationUnitInput,
  validateCompanyFields,
  validateOrganizationName,
} from "../tenancy.api"
import { TENANT_ORGANIZATIONS_EVENT, setTenantSelection } from "@/utils/tenant-preferences"

type MutableUnit = OrganizationUnitInput & { key: string }
type MutableCompany = {
  key: string
  name: string
  legalName: string
  taxId: string
  status: string
}

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

function createCompanyDraft(partial: Partial<MutableCompany> = {}): MutableCompany {
  return {
    key: generateUnitKey(),
    name: partial.name ?? "",
    legalName: partial.legalName ?? "",
    taxId: partial.taxId ?? "",
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
  const [companies, setCompanies] = useState<MutableCompany[]>([createCompanyDraft()])
  const [submitting, setSubmitting] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [organizationNameValidation, setOrganizationNameValidation] = useState<{
    status?: "idle" | "checking" | "valid" | "invalid"
    message?: string
  }>({})
  const [companyValidation, setCompanyValidation] = useState<
    Record<
      string,
      {
        taxIdStatus?: "idle" | "checking" | "valid" | "invalid"
        taxIdMessage?: string
        legalNameStatus?: "idle" | "checking" | "valid" | "invalid"
        legalNameMessage?: string
      }
    >
  >({})
  const companyValidationTimeouts = useRef<Map<string, number>>(new Map())
  const organizationValidationTimeout = useRef<number | null>(null)
  const VALIDATION_DEBOUNCE_MS = 1000

  const activeUnits = useMemo(
    () => units.filter((unit) => unit.status === "ACTIVE").length,
    [units],
  )
  const activeCompanies = useMemo(
    () => companies.filter((company) => company.status === "ACTIVE").length,
    [companies],
  )

  const renderFieldChip = (filled: boolean, required?: boolean) => (
    <span
      className={cn(
        "ml-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        filled
          ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
          : required
            ? "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
            : "border-border/60 bg-muted/30 text-muted-foreground",
      )}
    >
      {filled ? <CheckCircle2 className="h-3 w-3" /> : null}
      {filled ? "Listo" : required ? "Requerido" : "Opcional"}
    </span>
  )

  const renderValidationChip = (
    status: "idle" | "checking" | "valid" | "invalid" | undefined,
    fallbackFilled = false,
  ) => {
    if (status === "invalid") {
      return (
        <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-rose-200/70 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
          <Info className="h-3 w-3" />
          Ya existe
        </span>
      )
    }
    if (status === "checking") {
      return (
        <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <span className="flex items-center gap-0.5">
            <span className="h-1 w-1 animate-pulse rounded-full bg-amber-600" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-amber-600 [animation-delay:120ms]" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-amber-600 [animation-delay:240ms]" />
          </span>
          Validando
        </span>
      )
    }
    if (status === "valid") {
      return renderFieldChip(true)
    }
    return renderFieldChip(fallbackFilled)
  }

  const renderRequiredValidationChip = (
    status: "idle" | "checking" | "valid" | "invalid" | undefined,
    filled: boolean,
  ) => {
    if (status === "invalid") {
      return (
        <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-rose-200/70 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
          <Info className="h-3 w-3" />
          Ya existe
        </span>
      )
    }
    if (status === "checking") {
      return (
        <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <span className="flex items-center gap-0.5">
            <span className="h-1 w-1 animate-pulse rounded-full bg-amber-600" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-amber-600 [animation-delay:120ms]" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-amber-600 [animation-delay:240ms]" />
          </span>
          Validando
        </span>
      )
    }
    if (status === "valid") {
      return renderFieldChip(true, true)
    }
    return renderFieldChip(filled, true)
  }

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

  const handleCompanyChange = (
    key: string,
    field: "name" | "legalName" | "taxId" | "status",
    value: string,
  ) => {
    setCompanies((prev) =>
      prev.map((company) =>
        company.key === key ? { ...company, [field]: value } : company,
      ),
    )
  }

  const updateCompanyValidation = (
    key: string,
    patch: {
      taxIdStatus?: "idle" | "checking" | "valid" | "invalid"
      taxIdMessage?: string
      legalNameStatus?: "idle" | "checking" | "valid" | "invalid"
      legalNameMessage?: string
    },
  ) => {
    setCompanyValidation((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }))
  }

  useEffect(() => {
    const trimmedName = organization.name.trim()
    if (organizationValidationTimeout.current) {
      window.clearTimeout(organizationValidationTimeout.current)
    }

    if (trimmedName.length < 3) {
      setOrganizationNameValidation({ status: "idle", message: undefined })
      return
    }

    organizationValidationTimeout.current = window.setTimeout(async () => {
      try {
        setOrganizationNameValidation({ status: "checking", message: undefined })
        const result = await validateOrganizationName({ name: trimmedName })
        if (!result.nameAvailable) {
          setOrganizationNameValidation({
            status: "invalid",
            message: "Ya existe una organizacion con ese nombre.",
          })
        } else {
          setOrganizationNameValidation({ status: "valid", message: undefined })
        }
      } catch (error) {
        console.error(error)
        setOrganizationNameValidation({ status: "idle", message: undefined })
      }
    }, VALIDATION_DEBOUNCE_MS)

    return () => {
      if (organizationValidationTimeout.current) {
        window.clearTimeout(organizationValidationTimeout.current)
      }
    }
  }, [organization.name])

  useEffect(() => {
    companies.forEach((company) => {
      const normalizedTaxId = company.taxId.replace(/\D/g, "")
      const legalNameInput = company.legalName.trim()
      const existingTimeout = companyValidationTimeouts.current.get(company.key)
      if (existingTimeout) {
        window.clearTimeout(existingTimeout)
      }

      const hasLegalNameInput = legalNameInput.length >= 3
      const hasTaxIdInput = normalizedTaxId.length > 0

      if (!hasLegalNameInput) {
        updateCompanyValidation(company.key, {
          legalNameStatus: "idle",
          legalNameMessage: undefined,
        })
      } else {
        updateCompanyValidation(company.key, {
          legalNameStatus: "idle",
          legalNameMessage: undefined,
        })
      }

      if (!hasTaxIdInput) {
        updateCompanyValidation(company.key, { taxIdStatus: "idle", taxIdMessage: undefined })
      } else if (normalizedTaxId.length < 11) {
        updateCompanyValidation(company.key, {
          taxIdStatus: "idle",
          taxIdMessage: undefined,
        })
      }

      const shouldValidateTaxId = normalizedTaxId.length === 11
      const shouldValidateLegalName = hasLegalNameInput
      if (!shouldValidateTaxId && !shouldValidateLegalName) {
        return
      }
      const timeout = window.setTimeout(async () => {
        try {
          const payload: { taxId?: string; legalName?: string } = {}
          if (shouldValidateTaxId) payload.taxId = normalizedTaxId
          if (shouldValidateLegalName) payload.legalName = legalNameInput
          if (shouldValidateTaxId) {
            updateCompanyValidation(company.key, {
              taxIdStatus: "checking",
              taxIdMessage: undefined,
            })
          }
          if (shouldValidateLegalName) {
            updateCompanyValidation(company.key, {
              legalNameStatus: "checking",
              legalNameMessage: undefined,
            })
          }
          const result = await validateCompanyFields(payload)
          if (shouldValidateTaxId) {
            if (!result.taxIdAvailable) {
              updateCompanyValidation(company.key, {
                taxIdStatus: "invalid",
                taxIdMessage: "Ya existe una empresa con ese RUC/NIT.",
              })
            } else {
              updateCompanyValidation(company.key, {
                taxIdStatus: "valid",
                taxIdMessage: undefined,
              })
            }
          }
          if (shouldValidateLegalName) {
            if (!result.legalNameAvailable) {
              updateCompanyValidation(company.key, {
                legalNameStatus: "invalid",
                legalNameMessage:
                  "Ya existe una empresa con esa razon social en la organizacion.",
              })
            } else {
              updateCompanyValidation(company.key, {
                legalNameStatus: "valid",
                legalNameMessage: undefined,
              })
            }
          }
        } catch (error) {
          console.error(error)
          updateCompanyValidation(company.key, {
            taxIdStatus: "idle",
            taxIdMessage: undefined,
            legalNameStatus: "idle",
            legalNameMessage: undefined,
          })
        }
      }, VALIDATION_DEBOUNCE_MS)

      companyValidationTimeouts.current.set(company.key, timeout)
    })

    return () => {
      companyValidationTimeouts.current.forEach((timeout) => window.clearTimeout(timeout))
    }
  }, [companies])

  const addUnit = () => {
    setUnits((prev) => [...prev, createUnit()])
  }

  const addCompany = () => {
    setCompanies((prev) => [...prev, createCompanyDraft()])
  }

  const removeUnit = (key: string) => {
    setUnits((prev) => (prev.length === 1 ? prev : prev.filter((unit) => unit.key !== key)))
  }

  const removeCompany = (key: string) => {
    setCompanies((prev) =>
      prev.length === 1 ? prev : prev.filter((company) => company.key !== key),
    )
  }

  const buildPayload = (): CreateOrganizationPayload => ({
    name: organization.name.trim(),
    code: organization.code.trim() || undefined,
    status: organization.status,
    units: units
      .map((unit) => {
        const unitCode = unit.code?.trim() ?? ""
        return {
          name: unit.name.trim(),
          code: unitCode ? unitCode : null,
          status: unit.status,
        }
      })
      .filter((unit) => unit.name.length > 0),
    companies: companies
      .map((company) => ({
        name: company.name.trim(),
        legalName: company.legalName.trim() || null,
        taxId: company.taxId.replace(/\D/g, "") || null,
        status: company.status.trim() || undefined,
      }))
      .filter((company) => company.name.length > 0),
  })

  const validatePayload = (payload: CreateOrganizationPayload) => {
    if (!payload.name) {
      throw new Error("El nombre de la organización es obligatorio.")
    }
    if (organizationNameValidation.status === "invalid") {
      throw new Error("El nombre de la organizaci?n ya existe en el sistema.")
    }
    if (organizationNameValidation.status === "checking") {
      throw new Error("A?n estamos verificando el nombre de la organizaci?n. Espera un momento.")
    }
    if (!payload.units.length) {
      throw new Error("Debes definir al menos una unidad organizativa con nombre.")
    }
    companies.forEach((company, index) => {
      const trimmedName = company.name.trim()
      const normalizedTaxId = company.taxId.replace(/\D/g, "")
      if (trimmedName.length === 0) {
        throw new Error(`La empresa #${index + 1} necesita un nombre comercial.`)
      }
      if (normalizedTaxId.length !== 0 && normalizedTaxId.length < 11) {
        throw new Error(`El RUC de la empresa #${index + 1} debe tener 11 dÃ­gitos.`)
      }
      const validation = companyValidation[company.key]
      if (validation?.taxIdStatus === "invalid") {
        throw new Error(`El RUC de la empresa #${index + 1} ya existe en el sistema.`)
      }
      if (validation?.taxIdStatus === "checking") {
        throw new Error(
          `AÃºn estamos verificando el RUC de la empresa #${index + 1}. Espera un momento.`,
        )
      }
      if (validation?.legalNameStatus === "invalid") {
        throw new Error(`La razon social de la empresa #${index + 1} ya existe en el sistema.`)
      }
      if (validation?.legalNameStatus === "checking" && company.legalName.trim().length >= 3) {
        throw new Error(
          `AÃºn estamos verificando la razon social de la empresa #${index + 1}. Espera un momento.`,
        )
      }
    })
  }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    if (submitting) return

    setShowErrors(true)
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
      const primaryCompany = response.companies?.[0] ?? null
      setTenantSelection({
        orgId: response.id,
        companyId: primaryCompany?.id ?? null,
      })
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(TENANT_ORGANIZATIONS_EVENT))
      }
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

      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
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
                <div className="flex items-center gap-2">
                  <Label htmlFor="org-name" className="text-slate-700 dark:text-slate-200">
                    Nombre <span className="text-rose-500">*</span>
                    {renderRequiredValidationChip(
                      organizationNameValidation.status,
                      Boolean(organization.name.trim()),
                    )}
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-pointer items-center text-slate-400">
                          <Info className="size-4" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="rounded-lg bg-white/95 text-xs text-slate-700 shadow-lg dark:bg-slate-900 dark:text-slate-200">
                        Nombre visible para los usuarios del tenant.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="org-name"
                  placeholder="Ej. Corporación Andes"
                  value={organization.name}
                  onChange={(event) => handleOrganizationChange("name", event.target.value)}
                  aria-invalid={showErrors && !organization.name.trim()}
                  className={cn(
                    "cursor-text bg-white focus-visible:ring-sky-300 dark:bg-slate-900 dark:border-slate-700 dark:focus-visible:ring-slate-600",
                    showErrors &&
                      !organization.name.trim() &&
                      "border-rose-400 ring-1 ring-rose-200/70 dark:border-rose-500 dark:ring-rose-500/20",
                    organizationNameValidation.status === "invalid" &&
                      "border-rose-400 ring-1 ring-rose-200/70 dark:border-rose-500 dark:ring-rose-500/20",
                  )}
                />

                {organizationNameValidation.status === "checking" ? (
                  <p className="text-xs text-amber-600">Validando nombre...</p>
                ) : organizationNameValidation.status === "invalid" ? (
                  <p className="text-xs text-rose-500">
                    {organizationNameValidation.message ??
                      "Ya existe una organizacion con ese nombre."}
                  </p>
                ) : null}

                {showErrors && !organization.name.trim() ? (
                  <div className="flex items-center gap-2 rounded-lg border border-rose-200/70 bg-rose-50/70 px-3 py-2 text-xs text-rose-700 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
                    <Info className="size-4 text-rose-500" />
                    Completa este campo para continuar.
                  </div>
                ) : null}
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
                <Building2 className="size-5 text-sky-600 dark:text-slate-100" />
                Empresas iniciales
              </CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Registra una o mas empresas junto con la organizacion para agilizar la puesta en
                marcha del tenant.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4">
                {companies.map((company, index) => {
      const normalizedTaxId = company.taxId.replace(/\D/g, "")
      const taxIdValid = normalizedTaxId.length === 0 || normalizedTaxId.length === 11
      const validation = companyValidation[company.key]
      return (
                    <div
                      key={company.key}
                      className="rounded-lg border border-sky-100 bg-sky-50/50 p-4 shadow-xs transition-colors dark:border-slate-700 dark:bg-slate-900/70"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-100">
                          <ClipboardList className="size-4 text-sky-600 dark:text-slate-300" />
                          Empresa #{index + 1}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCompany(company.key)}
                          disabled={companies.length === 1}
                          className="cursor-pointer text-slate-500 hover:text-rose-500 disabled:opacity-50"
                          aria-label="Eliminar empresa"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`company-name-${company.key}`}
                              className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400"
                            >
                              Nombre comercial
                              {renderFieldChip(Boolean(company.name.trim()), true)}
                            </Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex cursor-pointer items-center text-slate-400">
                                    <Info className="size-4" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="rounded-lg bg-white/95 text-xs text-slate-700 shadow-lg dark:bg-slate-900 dark:text-slate-200">
                                  Este nombre es visible para los usuarios de la organizaci??n.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Input
                            id={`company-name-${company.key}`}
                            placeholder="Ej. Mi Empresa SAC"
                            value={company.name}
                            onChange={(event) =>
                              handleCompanyChange(company.key, "name", event.target.value)
                            }
                            className="cursor-text bg-white focus-visible:ring-sky-300 dark:bg-slate-950 dark:border-slate-700 dark:focus-visible:ring-slate-600"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`company-legal-${company.key}`}
                              className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400"
                            >
                              Razon social (opcional)
                              {renderValidationChip(
                                validation?.legalNameStatus,
                                Boolean(company.legalName.trim()),
                              )}
                            </Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex cursor-pointer items-center text-slate-400">
                                    <Info className="size-4" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="rounded-lg bg-white/95 text-xs text-slate-700 shadow-lg dark:bg-slate-900 dark:text-slate-200">
                                  Raz??n social usada en documentos fiscales.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        <Input
                          id={`company-legal-${company.key}`}
                          placeholder="Ej. Mi Empresa Sociedad An??nima"
                          value={company.legalName}
                          onChange={(event) =>
                            handleCompanyChange(company.key, "legalName", event.target.value)
                          }
                          className={cn(
                            "cursor-text bg-white focus-visible:ring-sky-300 dark:bg-slate-950 dark:border-slate-700 dark:focus-visible:ring-slate-600",
                            validation?.legalNameStatus === "invalid" &&
                              "border-rose-400 dark:border-rose-500",
                          )}
                        />
                        {validation?.legalNameStatus === "checking" ? (
                          <p className="text-xs text-amber-600">Validando razon social...</p>
                        ) : validation?.legalNameStatus === "invalid" ? (
                          <p className="text-xs text-rose-500">
                            {validation.legalNameMessage ??
                              "Ya existe una empresa con esa razon social."}
                          </p>
                        ) : null}
                      </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`company-tax-${company.key}`}
                              className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400"
                            >
                              RUC / NIT (opcional)
                              {renderValidationChip(
                                validation?.taxIdStatus,
                                normalizedTaxId.length === 11,
                              )}
                            </Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex cursor-pointer items-center text-slate-400">
                                    <Info className="size-4" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="rounded-lg bg-white/95 text-xs text-slate-700 shadow-lg dark:bg-slate-900 dark:text-slate-200">
                                  Solo acepta 11 d??gitos cuando se completa.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Input
                            id={`company-tax-${company.key}`}
                            placeholder="Ingrese el identificador fiscal"
                            value={normalizedTaxId}
                            onChange={(event) =>
                              handleCompanyChange(
                                company.key,
                                "taxId",
                                event.target.value.replace(/\D/g, "").slice(0, 11),
                              )
                            }
                            inputMode="numeric"
                            maxLength={11}
                            className={cn(
                              "cursor-text bg-white focus-visible:ring-sky-300 dark:bg-slate-950 dark:border-slate-700 dark:focus-visible:ring-slate-600",
                              (!taxIdValid || validation?.taxIdStatus === "invalid") &&
                                "border-rose-400 dark:border-rose-500",
                            )}
                          />
                          {!taxIdValid ? (
                            <p className="text-xs text-rose-500">
                              El RUC debe tener exactamente 11 digitos.
                            </p>
                          ) : validation?.taxIdStatus === "checking" ? (
                            <p className="text-xs text-amber-600">
                              Verificando RUC...
                            </p>
                          ) : validation?.taxIdStatus === "invalid" ? (
                            <p className="text-xs text-rose-500">
                              {validation.taxIdMessage ?? "Ya existe una empresa con ese RUC/NIT."}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Estado
                              {renderFieldChip(Boolean(company.status), true)}
                            </Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex cursor-pointer items-center text-slate-400">
                                    <Info className="size-4" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="rounded-lg bg-white/95 text-xs text-slate-700 shadow-lg dark:bg-slate-900 dark:text-slate-200">
                                  Define si la empresa estar?? activa al crearse.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Select
                            value={company.status}
                            onValueChange={(value) =>
                              handleCompanyChange(company.key, "status", value)
                            }
                          >
                            <SelectTrigger className="cursor-pointer bg-white focus-visible:ring-sky-300 dark:bg-slate-950 dark:border-slate-700 dark:focus-visible:ring-slate-600">
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
                  )
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addCompany}
                className="w-full cursor-pointer gap-2 rounded-full border-sky-200 bg-white text-sky-700 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Plus className="size-4" />
                Añadir otra empresa
              </Button>
            </CardContent>
            <CardFooter className="text-xs text-slate-500 dark:text-slate-400">
              {activeCompanies} de {companies.length} empresas quedaran activas al crear la
              organizacion.
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
                        className="cursor-pointer text-slate-500 hover:text-rose-500 disabled:opacity-50"
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
                className="w-full cursor-pointer gap-2 rounded-full border-sky-200 bg-white text-sky-700 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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
                className="group relative w-full cursor-pointer rounded-full bg-cyan-600 text-white shadow-sm transition hover:bg-cyan-700 hover:shadow dark:bg-slate-700 dark:hover:bg-slate-600"
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
