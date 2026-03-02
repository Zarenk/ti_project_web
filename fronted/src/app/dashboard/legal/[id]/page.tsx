"use client"

import { useState, useEffect, useRef, use } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Trash2,
  FileText,
  Calendar,
  Users,
  Clock,
  StickyNote,
  Scale,
  Upload,
  Download,
  Plus,
  X,
  Check,
  Pencil,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  getLegalMatter,
  deleteLegalMatter,
  updateLegalMatter,
  uploadLegalDocument,
  updateLegalDocument,
  deleteLegalDocument,
  downloadLegalDocument,
  createLegalEvent,
  updateLegalEvent,
  deleteLegalEvent,
  createLegalNote,
  updateLegalNote,
  deleteLegalNote,
  createLegalTimeEntry,
  updateLegalTimeEntry,
  deleteLegalTimeEntry,
  addLegalParty,
  updateLegalParty,
  deleteLegalParty,
  type LegalMatterDetail,
  type LegalMatterParty,
  type LegalDocument,
  type LegalEvent,
  type LegalNote,
  type LegalTimeEntry,
} from "../legal-matters.api"

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  SUSPENDED: "Suspendido",
  ARCHIVED: "Archivado",
  CLOSED: "Cerrado",
  WON: "Ganado",
  LOST: "Perdido",
  SETTLED: "Conciliado",
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  ACTIVE: "bg-green-100 text-green-800",
  SUSPENDED: "bg-yellow-100 text-yellow-800",
  ARCHIVED: "bg-slate-100 text-slate-800",
  CLOSED: "bg-blue-100 text-blue-800",
  WON: "bg-emerald-100 text-emerald-800",
  LOST: "bg-red-100 text-red-800",
  SETTLED: "bg-purple-100 text-purple-800",
}

const AREA_LABELS: Record<string, string> = {
  CIVIL: "Civil",
  PENAL: "Penal",
  LABORAL: "Laboral",
  COMERCIAL: "Comercial",
  TRIBUTARIO: "Tributario",
  ADMINISTRATIVO: "Administrativo",
  CONSTITUCIONAL: "Constitucional",
  FAMILIA: "Familia",
  AMBIENTAL: "Ambiental",
  ADUANERO: "Aduanero",
  MIGRATORIO: "Migratorio",
  OTRO: "Otro",
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
}

const PARTY_ROLE_LABELS: Record<string, string> = {
  DEMANDANTE: "Demandante",
  DEMANDADO: "Demandado",
  TERCERO: "Tercero",
  LITISCONSORTE: "Litisconsorte",
  MINISTERIO_PUBLICO: "Min. Publico",
  TESTIGO: "Testigo",
  PERITO: "Perito",
  OTRO: "Otro",
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  AUDIENCIA: "Audiencia",
  PLAZO_PROCESAL: "Plazo Procesal",
  NOTIFICACION: "Notificacion",
  DILIGENCIA: "Diligencia",
  VENCIMIENTO: "Vencimiento",
  RESOLUCION: "Resolucion",
  SENTENCIA: "Sentencia",
  APELACION: "Apelacion",
  CASACION: "Casacion",
  OTRO: "Otro",
}

const EVENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
  RESCHEDULED: "Reprogramado",
}

const EVENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  RESCHEDULED: "bg-blue-100 text-blue-800",
}

const DOC_TYPE_LABELS: Record<string, string> = {
  DEMANDA: "Demanda",
  CONTESTACION: "Contestacion",
  RECURSO: "Recurso",
  ESCRITO: "Escrito",
  RESOLUCION: "Resolucion",
  SENTENCIA: "Sentencia",
  CARTA_NOTARIAL: "Carta Notarial",
  CONTRATO: "Contrato",
  PODER: "Poder",
  ACTA: "Acta",
  PERICIA: "Pericia",
  DICTAMEN: "Dictamen",
  OTRO: "Otro",
}

function formatDate(date: string | null) {
  if (!date) return "\u2014"
  return new Date(date).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatDateTime(date: string | null) {
  if (!date) return "\u2014"
  return new Date(date).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function LegalMatterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [matter, setMatter] = useState<LegalMatterDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    area: "",
    priority: "",
    court: "",
    judge: "",
    jurisdiction: "",
    internalCode: "",
    externalCode: "",
    caseValue: "",
    currency: "",
  })

  async function reload() {
    try {
      const data = await getLegalMatter(Number(id))
      setMatter(data)
    } catch (err: any) {
      toast.error(err?.message || "Error al cargar el expediente")
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const data = await getLegalMatter(Number(id))
        setMatter(data)
      } catch (err: any) {
        toast.error(err?.message || "Error al cargar el expediente")
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id])

  async function handleStatusChange(newStatus: string) {
    if (!matter) return
    try {
      await updateLegalMatter(matter.id, { status: newStatus })
      setMatter((prev) => (prev ? { ...prev, status: newStatus } : prev))
      toast.success(`Estado actualizado a ${STATUS_LABELS[newStatus] || newStatus}`)
    } catch (err: any) {
      toast.error(err?.message || "Error al actualizar el estado")
    }
  }

  function startEditing() {
    if (!matter) return
    setEditForm({
      title: matter.title,
      description: matter.description || "",
      area: matter.area,
      priority: matter.priority,
      court: matter.court || "",
      judge: matter.judge || "",
      jurisdiction: matter.jurisdiction || "",
      internalCode: matter.internalCode || "",
      externalCode: matter.externalCode || "",
      caseValue: matter.caseValue?.toString() || "",
      currency: matter.currency,
    })
    setEditing(true)
  }

  async function handleSaveEdit() {
    if (!matter) return
    if (!editForm.title.trim()) {
      toast.error("El titulo es obligatorio")
      return
    }
    try {
      await updateLegalMatter(matter.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        area: editForm.area,
        priority: editForm.priority,
        court: editForm.court.trim() || null,
        judge: editForm.judge.trim() || null,
        jurisdiction: editForm.jurisdiction.trim() || null,
        internalCode: editForm.internalCode.trim() || null,
        externalCode: editForm.externalCode.trim() || null,
        caseValue: editForm.caseValue ? parseFloat(editForm.caseValue) : null,
        currency: editForm.currency,
      })
      toast.success("Expediente actualizado")
      setEditing(false)
      await reload()
    } catch (err: any) {
      toast.error(err?.message || "Error al actualizar")
    }
  }

  async function handleDelete() {
    if (!matter) return
    if (
      !confirm(
        "¿Estas seguro de eliminar este expediente? Esta accion no se puede deshacer.",
      )
    ) {
      return
    }
    try {
      await deleteLegalMatter(matter.id)
      toast.success("Expediente eliminado")
      router.push("/dashboard/legal")
    } catch (err: any) {
      toast.error(err?.message || "Error al eliminar")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Cargando expediente...</p>
      </div>
    )
  }

  if (!matter) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <Scale className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Expediente no encontrado</p>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/legal")}
        >
          Volver a expedientes
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{matter.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {matter.internalCode && (
                <span className="text-sm text-muted-foreground">
                  {matter.internalCode}
                </span>
              )}
              {matter.externalCode && (
                <span className="text-sm text-muted-foreground">
                  | Exp. {matter.externalCode}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      {/* Status & Badges */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Estado:</span>
          <Select value={matter.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Badge variant="outline">
          {AREA_LABELS[matter.area] || matter.area}
        </Badge>
        <Badge className={PRIORITY_COLORS[matter.priority] || ""}>
          {PRIORITY_LABELS[matter.priority] || matter.priority}
        </Badge>
      </div>

      {/* Edit Mode or Info Cards */}
      {editing ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Editar Expediente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Titulo *</Label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <Label>Area Legal</Label>
                <Select value={editForm.area} onValueChange={(v) => setEditForm((f) => ({ ...f, area: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(AREA_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descripcion</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label>Prioridad</Label>
                <Select value={editForm.priority} onValueChange={(v) => setEditForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Codigo Interno</Label>
                <Input
                  value={editForm.internalCode}
                  onChange={(e) => setEditForm((f) => ({ ...f, internalCode: e.target.value }))}
                />
              </div>
              <div>
                <Label>Exp. Judicial</Label>
                <Input
                  value={editForm.externalCode}
                  onChange={(e) => setEditForm((f) => ({ ...f, externalCode: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label>Juzgado</Label>
                <Input
                  value={editForm.court}
                  onChange={(e) => setEditForm((f) => ({ ...f, court: e.target.value }))}
                />
              </div>
              <div>
                <Label>Juez</Label>
                <Input
                  value={editForm.judge}
                  onChange={(e) => setEditForm((f) => ({ ...f, judge: e.target.value }))}
                />
              </div>
              <div>
                <Label>Jurisdiccion</Label>
                <Input
                  value={editForm.jurisdiction}
                  onChange={(e) => setEditForm((f) => ({ ...f, jurisdiction: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Cuantia</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.caseValue}
                  onChange={(e) => setEditForm((f) => ({ ...f, caseValue: e.target.value }))}
                />
              </div>
              <div>
                <Label>Moneda</Label>
                <Select value={editForm.currency} onValueChange={(v) => setEditForm((f) => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PEN">PEN - Soles</SelectItem>
                    <SelectItem value="USD">USD - Dolares</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveEdit}>
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Info Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Juzgado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{matter.court || "No asignado"}</p>
                {matter.judge && (
                  <p className="text-sm text-muted-foreground">
                    Juez: {matter.judge}
                  </p>
                )}
                {matter.jurisdiction && (
                  <p className="text-sm text-muted-foreground">
                    {matter.jurisdiction}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">
                  {matter.client?.name || "Sin cliente"}
                </p>
                {matter.client?.typeNumber && (
                  <p className="text-sm text-muted-foreground">
                    {matter.client.typeNumber}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cuantia</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">
                  {matter.caseValue
                    ? `${matter.currency} ${matter.caseValue.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
                    : "No especificada"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Abierto: {formatDate(matter.openedAt)}
                </p>
              </CardContent>
            </Card>
          </div>

          {matter.description && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm whitespace-pre-wrap">{matter.description}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Tabs */}
      <Tabs defaultValue="parties" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="parties" className="gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Partes</span>
            <Badge
              variant="secondary"
              className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
            >
              {matter.parties.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documentos</span>
            <Badge
              variant="secondary"
              className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
            >
              {matter.documents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-1">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Eventos</span>
            <Badge
              variant="secondary"
              className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
            >
              {matter.events.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="time" className="gap-1">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Horas</span>
            <Badge
              variant="secondary"
              className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
            >
              {matter.timeEntries.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1">
            <StickyNote className="h-4 w-4" />
            <span className="hidden sm:inline">Notas</span>
            <Badge
              variant="secondary"
              className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
            >
              {matter.notes.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Parties Tab */}
        <TabsContent value="parties" className="mt-4">
          <PartiesTab
            matterId={matter.id}
            parties={matter.parties}
            onUpdate={reload}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4">
          <DocumentsTab
            matterId={matter.id}
            documents={matter.documents}
            onUpdate={reload}
          />
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="mt-4">
          <EventsTab
            matterId={matter.id}
            events={matter.events}
            onUpdate={reload}
          />
        </TabsContent>

        {/* Time Entries Tab */}
        <TabsContent value="time" className="mt-4">
          <TimeEntriesTab
            matterId={matter.id}
            timeEntries={matter.timeEntries}
            onUpdate={reload}
          />
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-4">
          <NotesTab
            matterId={matter.id}
            notes={matter.notes}
            onUpdate={reload}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Parties Tab Component ────────────────────────────────

function PartiesTab({
  matterId,
  parties,
  onUpdate,
}: {
  matterId: number
  parties: LegalMatterParty[]
  onUpdate: () => Promise<void>
}) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [pName, setPName] = useState("")
  const [pRole, setPRole] = useState("DEMANDANTE")
  const [pDocNumber, setPDocNumber] = useState("")
  const [pPhone, setPPhone] = useState("")
  const [pEmail, setPEmail] = useState("")
  const [pLawyer, setPLawyer] = useState("")

  function resetForm() {
    setPName("")
    setPRole("DEMANDANTE")
    setPDocNumber("")
    setPPhone("")
    setPEmail("")
    setPLawyer("")
    setShowForm(false)
    setEditingId(null)
  }

  function startEdit(party: LegalMatterParty) {
    setPName(party.name)
    setPRole(party.role)
    setPDocNumber(party.documentNumber || "")
    setPPhone(party.phone || "")
    setPEmail(party.email || "")
    setPLawyer(party.lawyerName || "")
    setEditingId(party.id)
    setShowForm(false)
  }

  async function handleCreate() {
    if (!pName.trim()) {
      toast.error("El nombre de la parte es obligatorio")
      return
    }
    try {
      setSaving(true)
      await addLegalParty(matterId, {
        name: pName.trim(),
        role: pRole,
        documentNumber: pDocNumber.trim() || undefined,
        phone: pPhone.trim() || undefined,
        email: pEmail.trim() || undefined,
        lawyerName: pLawyer.trim() || undefined,
      })
      toast.success("Parte agregada")
      resetForm()
      await onUpdate()
    } catch (err: any) {
      toast.error(err?.message || "Error al agregar la parte")
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!editingId || !pName.trim()) {
      toast.error("El nombre de la parte es obligatorio")
      return
    }
    try {
      setSaving(true)
      await updateLegalParty(matterId, editingId, {
        name: pName.trim(),
        role: pRole,
        documentNumber: pDocNumber.trim() || null,
        phone: pPhone.trim() || null,
        email: pEmail.trim() || null,
        lawyerName: pLawyer.trim() || null,
      })
      toast.success("Parte actualizada")
      resetForm()
      await onUpdate()
    } catch (err: any) {
      toast.error(err?.message || "Error al actualizar la parte")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteParty(partyId: number) {
    if (!confirm("¿Eliminar esta parte?")) return
    try {
      await deleteLegalParty(matterId, partyId)
      toast.success("Parte eliminada")
      await onUpdate()
    } catch (err: any) {
      toast.error(err?.message || "Error al eliminar")
    }
  }

  const partyFormFields = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <Label>Nombre *</Label>
        <Input
          value={pName}
          onChange={(e) => setPName(e.target.value)}
          placeholder="Nombre completo"
        />
      </div>
      <div>
        <Label>Rol</Label>
        <Select value={pRole} onValueChange={setPRole}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PARTY_ROLE_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>DNI/RUC</Label>
        <Input
          value={pDocNumber}
          onChange={(e) => setPDocNumber(e.target.value)}
          placeholder="Documento de identidad"
        />
      </div>
      <div>
        <Label>Telefono</Label>
        <Input
          value={pPhone}
          onChange={(e) => setPPhone(e.target.value)}
          placeholder="Telefono"
        />
      </div>
      <div>
        <Label>Email</Label>
        <Input
          value={pEmail}
          onChange={(e) => setPEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
        />
      </div>
      <div>
        <Label>Abogado</Label>
        <Input
          value={pLawyer}
          onChange={(e) => setPLawyer(e.target.value)}
          placeholder="Nombre del abogado"
        />
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Partes Procesales</CardTitle>
        {!showForm && editingId === null && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Parte
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Nueva Parte</span>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {partyFormFields}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={resetForm}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={saving}>
                {saving ? "Guardando..." : "Agregar"}
              </Button>
            </div>
          </div>
        )}

        {parties.length === 0 && !showForm ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No hay partes registradas
          </p>
        ) : (
          <div className="space-y-3">
            {parties.map((party) =>
              editingId === party.id ? (
                <div
                  key={party.id}
                  className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Editar Parte</span>
                    <Button variant="ghost" size="icon" onClick={resetForm}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {partyFormFields}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={resetForm}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={party.id}
                  className="flex items-start justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{party.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {PARTY_ROLE_LABELS[party.role] || party.role}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {party.documentNumber && (
                        <span>Doc: {party.documentNumber}</span>
                      )}
                      {party.phone && <span>Tel: {party.phone}</span>}
                      {party.email && <span>{party.email}</span>}
                      {party.lawyerName && (
                        <span>Abogado: {party.lawyerName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(party)}
                    >
                      <Pencil className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteParty(party.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Documents Tab Component ─────────────────────────────

function DocumentsTab({
  matterId,
  documents,
  onUpdate,
}: {
  matterId: number
  documents: LegalDocument[]
  onUpdate: () => Promise<void>
}) {
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [docTitle, setDocTitle] = useState("")
  const [docDescription, setDocDescription] = useState("")
  const [docType, setDocType] = useState("OTRO")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function resetUploadForm() {
    setDocTitle("")
    setDocDescription("")
    setDocType("OTRO")
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    setShowForm(false)
  }

  function startEdit(doc: LegalDocument) {
    setDocTitle(doc.title)
    setDocDescription(doc.description || "")
    setDocType(doc.type)
    setEditingId(doc.id)
    setShowForm(false)
  }

  function cancelEdit() {
    setDocTitle("")
    setDocDescription("")
    setDocType("OTRO")
    setEditingId(null)
  }

  async function handleUpload() {
    if (!selectedFile || !docTitle.trim()) {
      toast.error("Selecciona un archivo y escribe un titulo")
      return
    }
    try {
      setUploading(true)
      await uploadLegalDocument(matterId, selectedFile, {
        title: docTitle.trim(),
        description: docDescription.trim() || undefined,
        type: docType,
      })
      toast.success("Documento subido correctamente")
      resetUploadForm()
      await onUpdate()
    } catch (err: any) {
      toast.error(err?.message || "Error al subir el documento")
    } finally {
      setUploading(false)
    }
  }

  async function handleSaveEdit() {
    if (!editingId || !docTitle.trim()) {
      toast.error("El titulo es obligatorio")
      return
    }
    try {
      setUploading(true)
      await updateLegalDocument(editingId, {
        title: docTitle.trim(),
        description: docDescription.trim() || undefined,
        type: docType,
      })
      toast.success("Documento actualizado")
      cancelEdit()
      await onUpdate()
    } catch (err: any) {
      toast.error(err?.message || "Error al actualizar el documento")
    } finally {
      setUploading(false)
    }
  }

  async function handleDownloadDoc(docId: number) {
    try {
      await downloadLegalDocument(docId)
    } catch (err: any) {
      toast.error(err?.message || "Error al descargar el documento")
    }
  }

  async function handleDeleteDoc(docId: number) {
    if (!confirm("¿Eliminar este documento?")) return
    try {
      await deleteLegalDocument(docId)
      toast.success("Documento eliminado")
      await onUpdate()
    } catch (err: any) {
      toast.error(err?.message || "Error al eliminar")
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Documentos</CardTitle>
        {!showForm && editingId === null && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Subir Documento
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Nuevo Documento</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetUploadForm}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <Label>Archivo *</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.odt,.txt,.xlsx,.xls,.jpg,.jpeg,.png"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Titulo *</Label>
                <Input
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Titulo del documento"
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOC_TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descripcion</Label>
              <Input
                value={docDescription}
                onChange={(e) => setDocDescription(e.target.value)}
                placeholder="Descripcion opcional"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetUploadForm}
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={handleUpload} disabled={uploading}>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Subiendo..." : "Subir"}
              </Button>
            </div>
          </div>
        )}

        {documents.length === 0 && !showForm ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No hay documentos subidos
          </p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) =>
              editingId === doc.id ? (
                <div
                  key={doc.id}
                  className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Editar Documento</span>
                    <Button variant="ghost" size="icon" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Titulo *</Label>
                      <Input
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        placeholder="Titulo del documento"
                      />
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select value={docType} onValueChange={setDocType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DOC_TYPE_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Descripcion</Label>
                    <Input
                      value={docDescription}
                      onChange={(e) => setDocDescription(e.target.value)}
                      placeholder="Descripcion opcional"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={cancelEdit}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={uploading}>
                      <Save className="mr-2 h-4 w-4" />
                      {uploading ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {DOC_TYPE_LABELS[doc.type] || doc.type}
                        </Badge>
                        {doc.fileName && <span>{doc.fileName}</span>}
                        {doc.fileSize && (
                          <span>{formatFileSize(doc.fileSize)}</span>
                        )}
                        <span>{formatDate(doc.createdAt)}</span>
                        {doc.uploadedBy && (
                          <span>por {doc.uploadedBy.username}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Descargar"
                      onClick={() => handleDownloadDoc(doc.id)}
                    >
                      <Download className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar"
                      onClick={() => startEdit(doc)}
                    >
                      <Pencil className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Eliminar"
                      onClick={() => handleDeleteDoc(doc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Events Tab Component ────────────────────────────────

function toLocalDatetime(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function EventsTab({
  matterId,
  events,
  onUpdate,
}: {
  matterId: number
  events: LegalEvent[]
  onUpdate: () => Promise<void>
}) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [evTitle, setEvTitle] = useState("")
  const [evType, setEvType] = useState("OTRO")
  const [evDescription, setEvDescription] = useState("")
  const [evLocation, setEvLocation] = useState("")
  const [evScheduledAt, setEvScheduledAt] = useState("")
  const [evEndAt, setEvEndAt] = useState("")

  function resetForm() {
    setEvTitle("")
    setEvType("OTRO")
    setEvDescription("")
    setEvLocation("")
    setEvScheduledAt("")
    setEvEndAt("")
    setShowForm(false)
    setEditingId(null)
  }

  function startEdit(event: LegalEvent) {
    setEvTitle(event.title)
    setEvType(event.type)
    setEvDescription(event.description || "")
    setEvLocation(event.location || "")
    setEvScheduledAt(toLocalDatetime(event.scheduledAt))
    setEvEndAt(toLocalDatetime(event.endAt))
    setEditingId(event.id)
    setShowForm(false)
  }

  async function handleCreate() {
    if (!evTitle.trim() || !evScheduledAt) {
      toast.error("El titulo y la fecha son obligatorios")
      return
    }
    try {
      setSaving(true)
      await createLegalEvent({
        matterId,
        title: evTitle.trim(),
        type: evType,
        description: evDescription.trim() || undefined,
        location: evLocation.trim() || undefined,
        scheduledAt: new Date(evScheduledAt).toISOString(),
        endAt: evEndAt ? new Date(evEndAt).toISOString() : undefined,
      })
      toast.success("Evento creado")
      resetForm()
      await onUpdate()
    } catch (err: any) {
      toast.error(err?.message || "Error al crear el evento")
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!editingId || !evTitle.trim() || !evScheduledAt) {
      toast.error("El titulo y la fecha son obligatorios")
      return
    }
    try {
      setSaving(true)
      await updateLegalEvent(editingId, {
        title: evTitle.trim(),
        type: evType,
        description: evDescription.trim() || null,
        location: evLocation.trim() || null,
        scheduledAt: new Date(evScheduledAt).toISOString(),
        endAt: evEndAt ? new Date(evEndAt).toISOString() : null,
      })
      toast.success("Evento actualizado")
      resetForm()
      await onUpdate()
    } catch (err: any) {
      toast.error(err?.message || "Error al actualizar el evento")
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete(eventId: number) {
    try {
      await updateLegalEvent(eventId, { status: "COMPLETED" })
      toast.success("Evento marcado como completado")
      await onUpdate()
    } catch (err: any) {
      toast.error(err?.message || "Error al actualizar")
    }
  }

  async function handleDeleteEvent(eventId: number) {
    if (!confirm("¿Eliminar este evento?")) return
    try {
      await deleteLegalEvent(eventId)
      toast.success("Evento eliminado")
      await onUpdate()
    } catch (err: any) {
      toast.error(err?.message || "Error al eliminar")
    }
  }

  const eventFormFields = (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Titulo *</Label>
          <Input
            value={evTitle}
            onChange={(e) => setEvTitle(e.target.value)}
            placeholder="Ej: Audiencia de pruebas"
          />
        </div>
        <div>
          <Label>Tipo</Label>
          <Select value={evType} onValueChange={setEvType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Fecha/Hora Inicio *</Label>
          <Input
            type="datetime-local"
            value={evScheduledAt}
            onChange={(e) => setEvScheduledAt(e.target.value)}
          />
        </div>
        <div>
          <Label>Fecha/Hora Fin</Label>
          <Input
            type="datetime-local"
            value={evEndAt}
            onChange={(e) => setEvEndAt(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label>Ubicacion</Label>
        <Input
          value={evLocation}
          onChange={(e) => setEvLocation(e.target.value)}
          placeholder="Ej: Sala 3, Corte Superior de Lima"
        />
      </div>
      <div>
        <Label>Descripcion</Label>
        <Textarea
          value={evDescription}
          onChange={(e) => setEvDescription(e.target.value)}
          placeholder="Notas adicionales..."
          rows={2}
        />
      </div>
    </>
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Eventos Procesales</CardTitle>
        {!showForm && editingId === null && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Evento
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Nuevo Evento</span>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {eventFormFields}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={resetForm}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={saving}>
                {saving ? "Guardando..." : "Crear Evento"}
              </Button>
            </div>
          </div>
        )}

        {events.length === 0 && !showForm ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No hay eventos registrados
          </p>
        ) : (
          <div className="space-y-2">
            {events.map((event) =>
              editingId === event.id ? (
                <div
                  key={event.id}
                  className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Editar Evento</span>
                    <Button variant="ghost" size="icon" onClick={resetForm}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {eventFormFields}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={resetForm}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={event.id}
                  className="flex items-start justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{event.title}</span>
                      <Badge
                        className={EVENT_STATUS_COLORS[event.status] || ""}
                      >
                        {EVENT_STATUS_LABELS[event.status] || event.status}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span>
                        {EVENT_TYPE_LABELS[event.type] || event.type}
                      </span>
                      <span>{formatDateTime(event.scheduledAt)}</span>
                      {event.location && <span>{event.location}</span>}
                      {event.assignedTo && (
                        <span>Resp: {event.assignedTo.username}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar evento"
                      onClick={() => startEdit(event)}
                    >
                      <Pencil className="h-4 w-4 text-blue-500" />
                    </Button>
                    {event.status === "PENDING" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Marcar completado"
                        onClick={() => handleComplete(event.id)}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Time Entries Tab Component ──────────────────────────

function TimeEntriesTab({
  matterId,
  timeEntries,
  onUpdate,
}: {
  matterId: number
  timeEntries: LegalTimeEntry[]
  onUpdate: () => Promise<void>
}) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [teDescription, setTeDescription] = useState("")
  const [teHours, setTeHours] = useState("")
  const [teRate, setTeRate] = useState("")
  const [teBillable, setTeBillable] = useState(true)
  const [teDate, setTeDate] = useState(
    new Date().toISOString().split("T")[0],
  )

  function resetForm() {
    setTeDescription("")
    setTeHours("")
    setTeRate("")
    setTeBillable(true)
    setTeDate(new Date().toISOString().split("T")[0])
    setShowForm(false)
    setEditingId(null)
  }

  function startEdit(entry: LegalTimeEntry) {
    setTeDescription(entry.description)
    setTeHours(String(entry.hours))
    setTeRate(entry.rate != null ? String(entry.rate) : "")
    setTeBillable(entry.billable)
    setTeDate(entry.date ? entry.date.split("T")[0] : new Date().toISOString().split("T")[0])
    setEditingId(entry.id)
    setShowForm(false)
  }

  async function handleCreate() {
    if (!teDescription.trim() || !teHours) {
      toast.error("La descripcion y las horas son obligatorias")
      return
    }
    try {
      setSaving(true)
      await createLegalTimeEntry({
        matterId,
        description: teDescription.trim(),
        hours: parseFloat(teHours),
        rate: teRate ? parseFloat(teRate) : undefined,
        billable: teBillable,
        date: teDate || undefined,
      })
      toast.success("Registro de horas creado")
      resetForm()
      await onUpdate()
    } catch (err: any) {
      toast.error(err?.message || "Error al crear registro")
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!editingId || !teDescription.trim() || !teHours) {
      toast.error("La descripcion y las horas son obligatorias")
      return
    }
    try {
      setSaving(true)
      await updateLegalTimeEntry(editingId, {
        description: teDescription.trim(),
        hours: parseFloat(teHours),
        rate: teRate ? parseFloat(teRate) : null,
        billable: teBillable,
        date: teDate || undefined,
      })
      toast.success("Registro actualizado")
      resetForm()
      await onUpdate()
    } catch (err: any) {
      toast.error(err?.message || "Error al actualizar registro")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteEntry(entryId: number) {
    if (!confirm("¿Eliminar este registro de horas?")) return
    try {
      await deleteLegalTimeEntry(entryId)
      toast.success("Registro eliminado")
      await onUpdate()
    } catch (err: any) {
      toast.error(err?.message || "Error al eliminar")
    }
  }

  const totalHours = timeEntries.reduce((sum, e) => sum + e.hours, 0)
  const totalAmount = timeEntries.reduce(
    (sum, e) => sum + (e.amount ?? 0),
    0,
  )

  const timeEntryFormFields = (
    <>
      <div>
        <Label>Descripcion *</Label>
        <Input
          value={teDescription}
          onChange={(e) => setTeDescription(e.target.value)}
          placeholder="Ej: Revision de expediente y preparacion de escrito"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <Label>Horas *</Label>
          <Input
            type="number"
            step="0.25"
            min="0.25"
            value={teHours}
            onChange={(e) => setTeHours(e.target.value)}
            placeholder="1.5"
          />
        </div>
        <div>
          <Label>Tarifa/hora</Label>
          <Input
            type="number"
            step="0.01"
            value={teRate}
            onChange={(e) => setTeRate(e.target.value)}
            placeholder="150.00"
          />
        </div>
        <div>
          <Label>Fecha</Label>
          <Input
            type="date"
            value={teDate}
            onChange={(e) => setTeDate(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer pb-2">
            <Checkbox
              checked={teBillable}
              onCheckedChange={(v) => setTeBillable(v === true)}
            />
            <span className="text-sm">Facturable</span>
          </label>
        </div>
      </div>
    </>
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Registro de Horas</CardTitle>
          {timeEntries.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Total: {totalHours.toFixed(1)}h
              {totalAmount > 0 && ` | S/ ${totalAmount.toFixed(2)}`}
            </p>
          )}
        </div>
        {!showForm && editingId === null && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Registrar Horas
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Nuevo Registro</span>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {timeEntryFormFields}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={resetForm}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={saving}>
                {saving ? "Guardando..." : "Registrar"}
              </Button>
            </div>
          </div>
        )}

        {timeEntries.length === 0 && !showForm ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No hay registros de horas
          </p>
        ) : (
          <div className="space-y-2">
            {timeEntries.map((entry) =>
              editingId === entry.id ? (
                <div
                  key={entry.id}
                  className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Editar Registro</span>
                    <Button variant="ghost" size="icon" onClick={resetForm}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {timeEntryFormFields}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={resetForm}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={entry.id}
                  className="flex items-start justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{entry.description}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {entry.user && <span>{entry.user.username}</span>}
                      <span>{formatDate(entry.date)}</span>
                      {entry.billable && (
                        <Badge variant="outline" className="text-xs">
                          Facturable
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="text-right">
                      <p className="font-medium">{entry.hours}h</p>
                      {entry.amount != null && (
                        <p className="text-sm text-muted-foreground">
                          S/ {entry.amount.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(entry)}
                    >
                      <Pencil className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteEntry(entry.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Notes Tab Component ─────────────────────────────────

function NotesTab({
  matterId,
  notes,
  onUpdate,
}: {
  matterId: number
  notes: LegalNote[]
  onUpdate: () => Promise<void>
}) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [noteContent, setNoteContent] = useState("")
  const [notePrivate, setNotePrivate] = useState(false)

  function resetForm() {
    setNoteContent("")
    setNotePrivate(false)
    setShowForm(false)
    setEditingId(null)
  }

  function startEdit(note: LegalNote) {
    setNoteContent(note.content)
    setNotePrivate(note.isPrivate)
    setEditingId(note.id)
    setShowForm(false)
  }

  async function handleCreate() {
    if (!noteContent.trim()) {
      toast.error("El contenido de la nota es obligatorio")
      return
    }
    try {
      setSaving(true)
      await createLegalNote({
        matterId,
        content: noteContent.trim(),
        isPrivate: notePrivate,
      })
      toast.success("Nota creada")
      resetForm()
      await onUpdate()
    } catch (err: any) {
      toast.error(err?.message || "Error al crear la nota")
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!editingId || !noteContent.trim()) {
      toast.error("El contenido de la nota es obligatorio")
      return
    }
    try {
      setSaving(true)
      await updateLegalNote(editingId, {
        content: noteContent.trim(),
        isPrivate: notePrivate,
      })
      toast.success("Nota actualizada")
      resetForm()
      await onUpdate()
    } catch (err: any) {
      toast.error(err?.message || "Error al actualizar la nota")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteNote(noteId: number) {
    if (!confirm("¿Eliminar esta nota?")) return
    try {
      await deleteLegalNote(noteId)
      toast.success("Nota eliminada")
      await onUpdate()
    } catch (err: any) {
      toast.error(err?.message || "Error al eliminar")
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Notas</CardTitle>
        {!showForm && editingId === null && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Nota
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Nueva Nota</span>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Escribe una nota sobre el expediente..."
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={notePrivate}
                  onCheckedChange={(v) => setNotePrivate(v === true)}
                />
                <span className="text-sm">Nota privada</span>
              </label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleCreate} disabled={saving}>
                  {saving ? "Guardando..." : "Guardar Nota"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {notes.length === 0 && !showForm ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No hay notas registradas
          </p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) =>
              editingId === note.id ? (
                <div
                  key={note.id}
                  className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Editar Nota</span>
                    <Button variant="ghost" size="icon" onClick={resetForm}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <Textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Contenido de la nota..."
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={notePrivate}
                        onCheckedChange={(v) => setNotePrivate(v === true)}
                      />
                      <span className="text-sm">Nota privada</span>
                    </label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={resetForm}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? "Guardando..." : "Guardar"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={note.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {note.createdBy?.username || "Sistema"}
                    </span>
                    <div className="flex items-center gap-2">
                      {note.isPrivate && (
                        <Badge variant="outline" className="text-xs">
                          Privada
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(note.createdAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => startEdit(note)}
                      >
                        <Pencil className="h-3 w-3 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                </div>
              ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
