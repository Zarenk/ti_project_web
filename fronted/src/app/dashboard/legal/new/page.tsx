"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Briefcase,
  FileText,
  Gavel,
  Loader2,
  Mail,
  Phone,
  Plus,
  Save,
  Search,
  Scale,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { PageGuideButton } from "@/components/page-guide-dialog"
import { LEGAL_FORM_GUIDE_STEPS } from "./legal-form-guide-steps"
import { createLegalMatter } from "../legal-matters.api"
import { getRegisteredClients } from "../../clients/clients.api"

/* ─── Constants ─────────────────────────────────────────── */

const AREAS = [
  { value: "CIVIL", label: "Civil" },
  { value: "PENAL", label: "Penal" },
  { value: "LABORAL", label: "Laboral" },
  { value: "COMERCIAL", label: "Comercial" },
  { value: "TRIBUTARIO", label: "Tributario" },
  { value: "ADMINISTRATIVO", label: "Administrativo" },
  { value: "CONSTITUCIONAL", label: "Constitucional" },
  { value: "FAMILIA", label: "Familia" },
  { value: "AMBIENTAL", label: "Ambiental" },
  { value: "ADUANERO", label: "Aduanero" },
  { value: "MIGRATORIO", label: "Migratorio" },
  { value: "OTRO", label: "Otro" },
]

const PRIORITIES = [
  { value: "LOW", label: "Baja", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  { value: "MEDIUM", label: "Media", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "HIGH", label: "Alta", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  { value: "URGENT", label: "Urgente", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
]

const PARTY_ROLES = [
  { value: "DEMANDANTE", label: "Demandante" },
  { value: "DEMANDADO", label: "Demandado" },
  { value: "TERCERO", label: "Tercero" },
  { value: "LITISCONSORTE", label: "Litisconsorte" },
  { value: "MINISTERIO_PUBLICO", label: "Ministerio Publico" },
  { value: "TESTIGO", label: "Testigo" },
  { value: "PERITO", label: "Perito" },
  { value: "OTRO", label: "Otro" },
]

/* ─── Types ─────────────────────────────────────────────── */

interface PartyForm {
  name: string
  role: string
  documentNumber: string
  email: string
  phone: string
}

interface ClientOption {
  id: number
  name: string
  typeNumber?: string | null
  type?: string | null
}

interface FormErrors {
  title?: string
  parties?: Record<number, { name?: string }>
}

/* ─── Helpers ───────────────────────────────────────────── */

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="mt-1 text-[12px] font-medium text-red-500 animate-in fade-in slide-in-from-top-1 duration-200">
      {message}
    </p>
  )
}

/* ─── Page ──────────────────────────────────────────────── */

export default function NewLegalMatterPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  // Client search
  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientId, setClientId] = useState<number | null>(null)
  const [clientSearch, setClientSearch] = useState("")
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)

  // Form fields
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [area, setArea] = useState("CIVIL")
  const [priority, setPriority] = useState("MEDIUM")
  const [court, setCourt] = useState("")
  const [judge, setJudge] = useState("")
  const [jurisdiction, setJurisdiction] = useState("")
  const [internalCode, setInternalCode] = useState("")
  const [externalCode, setExternalCode] = useState("")
  const [caseValue, setCaseValue] = useState("")
  const [currency, setCurrency] = useState("PEN")

  // Parties
  const [parties, setParties] = useState<PartyForm[]>([])

  useEffect(() => {
    getRegisteredClients()
      .then((data: ClientOption[]) => setClients(data || []))
      .catch(() => {})
  }, [])

  const filteredClients = clients.filter(
    (c) =>
      c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.typeNumber?.toLowerCase().includes(clientSearch.toLowerCase()),
  )

  // Clear specific field error on change
  const clearError = useCallback(
    (field: keyof FormErrors) => {
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev }
          delete next[field]
          return next
        })
      }
    },
    [errors],
  )

  function addParty() {
    setParties((prev) => [
      ...prev,
      { name: "", role: "DEMANDANTE", documentNumber: "", email: "", phone: "" },
    ])
  }

  function removeParty(index: number) {
    setParties((prev) => prev.filter((_, i) => i !== index))
    setErrors((prev) => {
      const next = { ...prev }
      if (next.parties) {
        delete next.parties[index]
        if (Object.keys(next.parties).length === 0) delete next.parties
      }
      return next
    })
  }

  function updateParty(index: number, field: keyof PartyForm, value: string) {
    setParties((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    )
    if (field === "name" && errors.parties?.[index]?.name) {
      setErrors((prev) => {
        const next = { ...prev }
        if (next.parties?.[index]) {
          delete next.parties[index].name
        }
        return next
      })
    }
  }

  function validate(): boolean {
    const newErrors: FormErrors = {}

    if (!title.trim()) {
      newErrors.title = "El titulo del expediente es obligatorio"
    }

    const partyErrors: Record<number, { name?: string }> = {}
    parties.forEach((p, i) => {
      if (!p.name.trim()) {
        partyErrors[i] = { name: "El nombre de la parte es obligatorio" }
      }
    })
    if (Object.keys(partyErrors).length > 0) {
      newErrors.parties = partyErrors
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) {
      toast.error("Revisa los campos marcados en rojo")
      return
    }

    try {
      setSaving(true)
      const data = {
        title: title.trim(),
        description: description.trim() || undefined,
        area,
        priority,
        court: court.trim() || undefined,
        judge: judge.trim() || undefined,
        jurisdiction: jurisdiction.trim() || undefined,
        internalCode: internalCode.trim() || undefined,
        externalCode: externalCode.trim() || undefined,
        caseValue: caseValue ? parseFloat(caseValue) : undefined,
        currency,
        clientId: clientId ?? undefined,
        parties: parties
          .filter((p) => p.name.trim())
          .map((p) => ({
            name: p.name.trim(),
            role: p.role,
            documentNumber: p.documentNumber.trim() || undefined,
            email: p.email.trim() || undefined,
            phone: p.phone.trim() || undefined,
          })),
      }

      const created = await createLegalMatter(data)
      toast.success("Expediente creado exitosamente")
      router.push(`/dashboard/legal/${created.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al crear el expediente"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const selectedPriority = PRIORITIES.find((p) => p.value === priority)

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
              <Scale className="h-5 w-5 text-rose-600" />
              Nuevo Expediente
            </h1>
            <p className="text-sm text-muted-foreground">
              Registra un nuevo caso legal con toda su informacion
            </p>
          </div>
        </div>
        <PageGuideButton steps={LEGAL_FORM_GUIDE_STEPS} tooltipLabel="Guia del formulario" />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ─── Main Column (2/3) ─── */}
          <div className="space-y-6 lg:col-span-2">
            {/* Card: Informacion General */}
            <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/40">
                    <FileText className="h-4 w-4 text-rose-600" />
                  </div>
                  Informacion General
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Titulo */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">
                    Titulo del Expediente <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      clearError("title")
                    }}
                    placeholder="Ej: Demanda por incumplimiento de contrato - Garcia vs Lopez"
                    className={cn(
                      "transition-colors",
                      errors.title && "border-red-500 focus-visible:ring-red-500",
                    )}
                  />
                  <FieldError message={errors.title} />
                </div>

                {/* Descripcion */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Descripcion
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descripcion general del caso, antecedentes relevantes..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <Separator />

                {/* Area, Prioridad, Moneda */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Area Legal</Label>
                    <Select value={area} onValueChange={setArea}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AREAS.map((a) => (
                          <SelectItem key={a.value} value={a.value}>
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Prioridad</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
                        <SelectValue>
                          {selectedPriority && (
                            <span className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-block h-2 w-2 rounded-full",
                                  priority === "LOW" && "bg-slate-400",
                                  priority === "MEDIUM" && "bg-blue-500",
                                  priority === "HIGH" && "bg-amber-500",
                                  priority === "URGENT" && "bg-red-500",
                                )}
                              />
                              {selectedPriority.label}
                            </span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            <span className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-block h-2 w-2 rounded-full",
                                  p.value === "LOW" && "bg-slate-400",
                                  p.value === "MEDIUM" && "bg-blue-500",
                                  p.value === "HIGH" && "bg-amber-500",
                                  p.value === "URGENT" && "bg-red-500",
                                )}
                              />
                              {p.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Moneda</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PEN">PEN - Soles</SelectItem>
                        <SelectItem value="USD">USD - Dolares</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Codigos */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="internalCode" className="text-sm font-medium">
                      Codigo Interno
                    </Label>
                    <Input
                      id="internalCode"
                      value={internalCode}
                      onChange={(e) => setInternalCode(e.target.value)}
                      placeholder="Ej: EXP-2026-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="externalCode" className="text-sm font-medium">
                      Nro. Expediente Judicial
                    </Label>
                    <Input
                      id="externalCode"
                      value={externalCode}
                      onChange={(e) => setExternalCode(e.target.value)}
                      placeholder="Ej: 00123-2026-0-1801-JR-CI-01"
                    />
                  </div>
                </div>

                {/* Cuantia */}
                <div className="space-y-2 sm:max-w-xs">
                  <Label htmlFor="caseValue" className="text-sm font-medium">
                    Cuantia ({currency})
                  </Label>
                  <Input
                    id="caseValue"
                    type="number"
                    step="0.01"
                    min="0"
                    value={caseValue}
                    onChange={(e) => setCaseValue(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card: Informacion Judicial */}
            <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100 fill-mode-both">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/40">
                    <Gavel className="h-4 w-4 text-violet-600" />
                  </div>
                  Informacion Judicial
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="court" className="text-sm font-medium">
                      Juzgado
                    </Label>
                    <Input
                      id="court"
                      value={court}
                      onChange={(e) => setCourt(e.target.value)}
                      placeholder="Ej: 1er Juzgado Civil de Lima"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="judge" className="text-sm font-medium">
                      Juez
                    </Label>
                    <Input
                      id="judge"
                      value={judge}
                      onChange={(e) => setJudge(e.target.value)}
                      placeholder="Nombre del juez"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jurisdiction" className="text-sm font-medium">
                    Jurisdiccion
                  </Label>
                  <Input
                    id="jurisdiction"
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    placeholder="Ej: Corte Superior de Justicia de Lima"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card: Partes Procesales */}
            <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200 fill-mode-both">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950/40">
                      <Users className="h-4 w-4 text-sky-600" />
                    </div>
                    Partes Procesales
                    {parties.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {parties.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addParty}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar Parte
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {parties.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-10 text-center">
                    <Users className="mb-3 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Sin partes registradas
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      Agrega demandantes, demandados y otras partes del proceso
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addParty}
                      className="mt-4 gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar primera parte
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {parties.map((party, index) => (
                      <div
                        key={index}
                        className="rounded-lg border bg-muted/20 p-4 transition-all animate-in fade-in slide-in-from-top-2 duration-200"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-[11px] font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                              {index + 1}
                            </div>
                            <span className="text-sm font-medium">
                              {party.name.trim() || `Parte ${index + 1}`}
                            </span>
                            {party.role && (
                              <Badge variant="outline" className="text-[10px]">
                                {PARTY_ROLES.find((r) => r.value === party.role)?.label ?? party.role}
                              </Badge>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-500"
                            onClick={() => removeParty(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                              Nombre <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              value={party.name}
                              onChange={(e) => updateParty(index, "name", e.target.value)}
                              placeholder="Nombre completo"
                              className={cn(
                                "h-9 text-sm",
                                errors.parties?.[index]?.name &&
                                  "border-red-500 focus-visible:ring-red-500",
                              )}
                            />
                            <FieldError message={errors.parties?.[index]?.name} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Rol</Label>
                            <Select
                              value={party.role}
                              onValueChange={(v) => updateParty(index, "role", v)}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PARTY_ROLES.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">DNI/RUC</Label>
                            <Input
                              value={party.documentNumber}
                              onChange={(e) =>
                                updateParty(index, "documentNumber", e.target.value)
                              }
                              placeholder="Documento"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Email</Label>
                            <Input
                              type="email"
                              value={party.email}
                              onChange={(e) => updateParty(index, "email", e.target.value)}
                              placeholder="correo@ejemplo.com"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Telefono</Label>
                            <Input
                              value={party.phone}
                              onChange={(e) => updateParty(index, "phone", e.target.value)}
                              placeholder="+51 999 999 999"
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ─── Sidebar Column (1/3) ─── */}
          <div className="space-y-6">
            {/* Client selector */}
            <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150 fill-mode-both lg:sticky lg:top-4">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                    <User className="h-4 w-4 text-emerald-600" />
                  </div>
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {clientId ? (
                  <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                        <User className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {clients.find((c) => c.id === clientId)?.name ?? "Cliente"}
                        </p>
                        {clients.find((c) => c.id === clientId)?.typeNumber && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {clients.find((c) => c.id === clientId)?.typeNumber}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setClientId(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nombre o documento..."
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value)
                          setClientDropdownOpen(e.target.value.length > 0)
                        }}
                        onFocus={() => {
                          if (clientSearch.length > 0) setClientDropdownOpen(true)
                        }}
                        onBlur={() => {
                          setTimeout(() => setClientDropdownOpen(false), 200)
                        }}
                        className="pl-9"
                      />
                    </div>
                    {clientDropdownOpen && filteredClients.length > 0 && (
                      <div className="max-h-48 overflow-y-auto rounded-lg border animate-in fade-in slide-in-from-top-1 duration-150">
                        {filteredClients.slice(0, 8).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                            onClick={() => {
                              setClientId(c.id)
                              setClientSearch("")
                              setClientDropdownOpen(false)
                            }}
                          >
                            <span className="font-medium">{c.name}</span>
                            {c.typeNumber && (
                              <span className="text-[11px] text-muted-foreground">
                                {c.typeNumber}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {clientDropdownOpen && clientSearch && filteredClients.length === 0 && (
                      <p className="py-3 text-center text-xs text-muted-foreground">
                        No se encontraron clientes
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Opcional. Vincula este expediente a un cliente registrado.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary card */}
            <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200 fill-mode-both lg:sticky lg:top-[calc(1rem+var(--client-card-h,280px))]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Area</span>
                  <Badge variant="outline">{AREAS.find((a) => a.value === area)?.label}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Prioridad</span>
                  {selectedPriority && (
                    <Badge className={cn("text-[11px]", selectedPriority.color)}>
                      {selectedPriority.label}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Moneda</span>
                  <span className="font-medium">{currency}</span>
                </div>
                {caseValue && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cuantia</span>
                    <span className="font-medium">
                      {currency === "PEN" ? "S/" : "$"}{" "}
                      {parseFloat(caseValue).toLocaleString("es-PE", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Partes</span>
                  <span className="font-medium">{parties.length}</span>
                </div>
                {clientId && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="max-w-[140px] truncate font-medium">
                      {clients.find((c) => c.id === clientId)?.name ?? "—"}
                    </span>
                  </div>
                )}

                <Separator />

                <div className="flex flex-col gap-2 pt-1">
                  <Button type="submit" disabled={saving} className="w-full gap-2">
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {saving ? "Guardando..." : "Crear Expediente"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.back()}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
