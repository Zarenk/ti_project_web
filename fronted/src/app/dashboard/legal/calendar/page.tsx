"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  Bell,
  BellOff,
  Lock,
  Trash2,
  Pencil,
  X,
  StickyNote,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { PageGuideButton } from "@/components/page-guide-dialog"
import { LEGAL_CALENDAR_GUIDE_STEPS } from "./legal-calendar-guide-steps"
import {
  getAllLegalEvents,
  getCalendarNotes,
  createCalendarNote,
  updateCalendarNote,
  deleteCalendarNote,
  type LegalEventWithMatter,
  type CalendarNote,
} from "../legal-matters.api"

// ── Constants ────────────────────────────────────────────

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

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
  COMPLETED: "bg-green-100 text-green-800 border-green-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-300",
  RESCHEDULED: "bg-blue-100 text-blue-800 border-blue-300",
}

const TYPE_DOT_COLORS: Record<string, string> = {
  AUDIENCIA: "bg-purple-500",
  PLAZO_PROCESAL: "bg-red-500",
  NOTIFICACION: "bg-blue-500",
  DILIGENCIA: "bg-orange-500",
  VENCIMIENTO: "bg-red-600",
  RESOLUCION: "bg-cyan-500",
  SENTENCIA: "bg-emerald-500",
  APELACION: "bg-amber-500",
  CASACION: "bg-pink-500",
  OTRO: "bg-gray-400",
}

const TYPE_BORDER_COLORS: Record<string, string> = {
  AUDIENCIA: "border-l-purple-500",
  PLAZO_PROCESAL: "border-l-red-500",
  NOTIFICACION: "border-l-blue-500",
  DILIGENCIA: "border-l-orange-500",
  VENCIMIENTO: "border-l-red-600",
  SENTENCIA: "border-l-emerald-500",
  OTRO: "border-l-gray-400",
}

const NOTE_COLORS = [
  { value: "#64748b", label: "Gris", tw: "bg-slate-500" },
  { value: "#3b82f6", label: "Azul", tw: "bg-blue-500" },
  { value: "#10b981", label: "Verde", tw: "bg-emerald-500" },
  { value: "#f59e0b", label: "Ambar", tw: "bg-amber-500" },
  { value: "#f43f5e", label: "Rosa", tw: "bg-rose-500" },
  { value: "#8b5cf6", label: "Morado", tw: "bg-violet-500" },
]

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const WEEKDAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// ── Main Component ───────────────────────────────────────

export default function LegalCalendarPage() {
  const router = useRouter()

  // Calendar state
  const now = useMemo(() => new Date(), [])
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Data
  const [events, setEvents] = useState<LegalEventWithMatter[]>([])
  const [notes, setNotes] = useState<CalendarNote[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("ALL")

  // Note form
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [editingNote, setEditingNote] = useState<CalendarNote | null>(null)
  const [noteContent, setNoteContent] = useState("")
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0].value)
  const [noteReminderAt, setNoteReminderAt] = useState("")
  const [noteIsPrivate, setNoteIsPrivate] = useState(false)
  const [savingNote, setSavingNote] = useState(false)

  const todayKey = toDateKey(now)

  // ── Data Loading ─────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const from = new Date(currentYear, currentMonth, 1).toISOString()
      const to = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString()

      const [eventsData, notesData] = await Promise.all([
        getAllLegalEvents({
          from,
          to,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
        }),
        getCalendarNotes(from, to),
      ])

      setEvents(eventsData)
      setNotes(notesData)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al cargar datos"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [currentYear, currentMonth, statusFilter])

  useEffect(() => {
    setLoading(true)
    void loadData()
  }, [loadData])

  // ── Calendar Navigation ──────────────────────────────

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
    setSelectedDate(null)
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
    setSelectedDate(null)
  }

  function goToday() {
    setCurrentYear(now.getFullYear())
    setCurrentMonth(now.getMonth())
    setSelectedDate(todayKey)
  }

  // ── Calendar Grid ────────────────────────────────────

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    let startDay = firstDay.getDay() - 1
    if (startDay < 0) startDay = 6

    const days: { date: number; key: string; isCurrentMonth: boolean }[] = []

    const prevMonthLast = new Date(currentYear, currentMonth, 0).getDate()
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevMonthLast - i
      days.push({ date: d, key: `prev-${d}`, isCurrentMonth: false })
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      days.push({ date: d, key: dateStr, isCurrentMonth: true })
    }

    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      days.push({ date: d, key: `next-${d}`, isCurrentMonth: false })
    }

    return days
  }, [currentYear, currentMonth])

  // ── Data by Date ─────────────────────────────────────

  const eventsByDate = useMemo(() => {
    const map: Record<string, LegalEventWithMatter[]> = {}
    for (const ev of events) {
      const d = new Date(ev.scheduledAt)
      const key = toDateKey(d)
      if (!map[key]) map[key] = []
      map[key].push(ev)
    }
    return map
  }, [events])

  const notesByDate = useMemo(() => {
    const map: Record<string, CalendarNote[]> = {}
    for (const note of notes) {
      // Use string slice to avoid timezone shift:
      // "2026-02-20T00:00:00.000Z".slice(0,10) → "2026-02-20"
      const key = note.date.slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(note)
    }
    return map
  }, [notes])

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] ?? [] : []
  const selectedNotes = selectedDate ? notesByDate[selectedDate] ?? [] : []

  // ── Note CRUD ────────────────────────────────────────

  function resetNoteForm() {
    setShowNoteForm(false)
    setEditingNote(null)
    setNoteContent("")
    setNoteColor(NOTE_COLORS[0].value)
    setNoteReminderAt("")
    setNoteIsPrivate(false)
  }

  function startEditNote(note: CalendarNote) {
    setEditingNote(note)
    setNoteContent(note.content)
    setNoteColor(note.color ?? NOTE_COLORS[0].value)
    setNoteReminderAt(
      note.reminderAt
        ? new Date(note.reminderAt).toISOString().slice(0, 16)
        : "",
    )
    setNoteIsPrivate(note.isPrivate)
    setShowNoteForm(true)
  }

  async function handleSaveNote() {
    if (!noteContent.trim() || !selectedDate) return
    setSavingNote(true)
    try {
      if (editingNote) {
        await updateCalendarNote(editingNote.id, {
          content: noteContent.trim(),
          color: noteColor,
          reminderAt: noteReminderAt || null,
          isPrivate: noteIsPrivate,
        })
        toast.success("Nota actualizada")
      } else {
        await createCalendarNote({
          date: selectedDate,
          content: noteContent.trim(),
          color: noteColor,
          reminderAt: noteReminderAt || undefined,
          isPrivate: noteIsPrivate,
        })
        toast.success("Nota creada")
      }
      resetNoteForm()
      await loadData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al guardar nota"
      toast.error(message)
    } finally {
      setSavingNote(false)
    }
  }

  async function handleDeleteNote(id: number) {
    try {
      await deleteCalendarNote(id)
      toast.success("Nota eliminada")
      await loadData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al eliminar nota"
      toast.error(message)
    }
  }

  // ── Render ───────────────────────────────────────────

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Calendario Legal</h1>
        <PageGuideButton
          steps={LEGAL_CALENDAR_GUIDE_STEPS}
          tooltipLabel="Guia del calendario"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
        {/* ── Calendar Grid ────────────────────────────── */}
        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="min-w-[180px] text-center text-lg">
                {MONTHS[currentMonth]} {currentYear}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="PENDING">Pendientes</SelectItem>
                  <SelectItem value="COMPLETED">Completados</SelectItem>
                  <SelectItem value="CANCELLED">Cancelados</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={goToday}>
                Hoy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden">
                {Array.from({ length: 49 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[72px] animate-pulse bg-muted/50"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden bg-border/50">
                {/* Weekday headers */}
                {WEEKDAYS.map((wd) => (
                  <div
                    key={wd}
                    className="bg-muted/30 px-2 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    {wd}
                  </div>
                ))}

                {/* Days */}
                {calendarDays.map((day) => {
                  const dayEvents = day.isCurrentMonth
                    ? eventsByDate[day.key] ?? []
                    : []
                  const dayNotes = day.isCurrentMonth
                    ? notesByDate[day.key] ?? []
                    : []
                  const isToday = day.key === todayKey
                  const isSelected = day.key === selectedDate
                  const totalItems = dayEvents.length + dayNotes.length

                  // Build dots: up to 4 event dots + note dots
                  const dots: string[] = []
                  for (const ev of dayEvents.slice(0, 3)) {
                    dots.push(TYPE_DOT_COLORS[ev.type] ?? TYPE_DOT_COLORS.OTRO)
                  }
                  for (const n of dayNotes.slice(0, 4 - dots.length)) {
                    dots.push(n.color ? "" : "bg-slate-400")
                  }

                  return (
                    <button
                      key={day.key}
                      type="button"
                      disabled={!day.isCurrentMonth}
                      onClick={() =>
                        day.isCurrentMonth && setSelectedDate(day.key)
                      }
                      className={[
                        "relative min-h-[76px] bg-background p-1.5 text-left transition-all duration-150",
                        !day.isCurrentMonth
                          ? "text-muted-foreground/30 cursor-default"
                          : "hover:bg-accent/60 cursor-pointer",
                        isSelected
                          ? "ring-2 ring-primary ring-inset bg-primary/5"
                          : "",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                          isToday
                            ? "bg-primary text-primary-foreground font-bold shadow-sm"
                            : "",
                        ].join(" ")}
                      >
                        {day.date}
                      </span>

                      {/* Dots */}
                      {totalItems > 0 && (
                        <div className="mt-1 flex items-center justify-center gap-1">
                          {dots.map((dotClass, i) => {
                            const noteForDot = i >= dayEvents.length
                              ? dayNotes[i - dayEvents.length]
                              : null
                            return (
                              <span
                                key={i}
                                className={`h-1.5 w-1.5 rounded-full ${dotClass}`}
                                style={
                                  noteForDot?.color
                                    ? { backgroundColor: noteForDot.color }
                                    : undefined
                                }
                              />
                            )
                          })}
                          {totalItems > 4 && (
                            <span className="text-[9px] text-muted-foreground leading-none">
                              +{totalItems - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
              {Object.entries(TYPE_DOT_COLORS).slice(0, 6).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${color}`} />
                  {EVENT_TYPE_LABELS[type] ?? type}
                </div>
              ))}
              <div className="flex items-center gap-1">
                <StickyNote className="h-2.5 w-2.5" />
                Notas
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Side Panel ───────────────────────────────── */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start animate-in fade-in slide-in-from-right-2 duration-300 delay-150">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarIcon className="h-4 w-4" />
                {selectedDate
                  ? new Date(selectedDate + "T12:00:00").toLocaleDateString(
                      "es-PE",
                      { weekday: "long", day: "numeric", month: "long" },
                    )
                  : "Selecciona un dia"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CalendarIcon className="mb-3 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    Haz clic en un dia para ver eventos y notas
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Events Section */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Eventos ({selectedEvents.length})
                    </h3>
                    {selectedEvents.length === 0 ? (
                      <p className="py-3 text-center text-xs text-muted-foreground/60">
                        Sin eventos
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedEvents.map((event, idx) => (
                          <div
                            key={event.id}
                            className={[
                              "rounded-lg border border-l-4 p-3 cursor-pointer transition-all duration-200 hover:bg-accent/50 hover:shadow-sm",
                              TYPE_BORDER_COLORS[event.type] ?? TYPE_BORDER_COLORS.OTRO,
                              `animate-in fade-in slide-in-from-left-2`,
                            ].join(" ")}
                            style={{ animationDelay: `${idx * 50}ms` }}
                            onClick={() =>
                              router.push(
                                `/dashboard/legal/${event.matterId}`,
                              )
                            }
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-medium leading-tight">
                                {event.title}
                              </span>
                              <Badge
                                className={`shrink-0 text-[10px] ${STATUS_COLORS[event.status] ?? ""}`}
                              >
                                {EVENT_STATUS_LABELS[event.status] ??
                                  event.status}
                              </Badge>
                            </div>
                            <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(event.scheduledAt)}
                                {event.endAt &&
                                  ` - ${formatTime(event.endAt)}`}
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {event.location}
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {EVENT_TYPE_LABELS[event.type] ?? event.type}
                                </Badge>
                                {event.reminderAt && (
                                  <Bell className="h-3 w-3 text-amber-500" />
                                )}
                              </div>
                              {event.matter && (
                                <p className="truncate">
                                  {event.matter.internalCode
                                    ? `${event.matter.internalCode} - `
                                    : ""}
                                  {event.matter.title}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Separator */}
                  <div className="border-t" />

                  {/* Notes Section */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <StickyNote className="h-3.5 w-3.5" />
                        Notas ({selectedNotes.length})
                      </h3>
                      {!showNoteForm && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => {
                            resetNoteForm()
                            setShowNoteForm(true)
                          }}
                        >
                          <Plus className="h-3 w-3" />
                          Agregar
                        </Button>
                      )}
                    </div>

                    {selectedNotes.length === 0 && !showNoteForm && (
                      <div className="flex flex-col items-center py-4 text-center">
                        <StickyNote className="mb-2 h-8 w-8 text-muted-foreground/20" />
                        <p className="text-xs text-muted-foreground/60">
                          Sin notas para este dia
                        </p>
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-1 h-auto p-0 text-xs"
                          onClick={() => {
                            resetNoteForm()
                            setShowNoteForm(true)
                          }}
                        >
                          Agregar nota
                        </Button>
                      </div>
                    )}

                    {/* Existing Notes */}
                    {selectedNotes.length > 0 && (
                      <div className="space-y-2">
                        {selectedNotes.map((note, idx) => (
                          <div
                            key={note.id}
                            className="group rounded-lg border p-3 transition-all duration-200 hover:shadow-sm animate-in fade-in slide-in-from-left-2"
                            style={{
                              borderLeftWidth: 4,
                              borderLeftColor: note.color ?? "#64748b",
                              animationDelay: `${idx * 50}ms`,
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                {note.content}
                              </p>
                              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => startEditNote(note)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteNote(note.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                              {note.isPrivate && (
                                <span className="flex items-center gap-0.5">
                                  <Lock className="h-2.5 w-2.5" />
                                  Privada
                                </span>
                              )}
                              {note.reminderAt && (
                                <span className="flex items-center gap-0.5">
                                  {note.reminderSent ? (
                                    <BellOff className="h-2.5 w-2.5 text-muted-foreground" />
                                  ) : (
                                    <Bell className="h-2.5 w-2.5 text-amber-500" />
                                  )}
                                  {new Date(note.reminderAt).toLocaleString(
                                    "es-PE",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                              )}
                              {note.createdBy && (
                                <span>{note.createdBy.username}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Note Form */}
                    {showNoteForm && (
                      <div className="mt-2 space-y-3 rounded-lg border bg-muted/20 p-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">
                            {editingNote ? "Editar nota" : "Nueva nota"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={resetNoteForm}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>

                        <Textarea
                          placeholder="Escribe tu nota..."
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          className="min-h-[80px] resize-none text-sm"
                          autoFocus
                        />

                        {/* Color Picker */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Color:
                          </span>
                          <div className="flex gap-1.5">
                            {NOTE_COLORS.map((c) => (
                              <button
                                key={c.value}
                                type="button"
                                onClick={() => setNoteColor(c.value)}
                                className={[
                                  "h-5 w-5 rounded-full border-2 transition-transform",
                                  c.tw,
                                  noteColor === c.value
                                    ? "scale-125 border-foreground"
                                    : "border-transparent hover:scale-110",
                                ].join(" ")}
                                title={c.label}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Reminder */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            Recordatorio (opcional)
                          </Label>
                          <Input
                            type="datetime-local"
                            value={noteReminderAt}
                            onChange={(e) => setNoteReminderAt(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        {/* Privacy */}
                        <div className="flex items-center gap-2">
                          <Switch
                            id="note-private"
                            checked={noteIsPrivate}
                            onCheckedChange={setNoteIsPrivate}
                          />
                          <Label htmlFor="note-private" className="text-xs">
                            Solo para mi
                          </Label>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={resetNoteForm}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            disabled={
                              !noteContent.trim() || savingNote
                            }
                            onClick={handleSaveNote}
                          >
                            {savingNote
                              ? "Guardando..."
                              : editingNote
                                ? "Actualizar"
                                : "Guardar"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
