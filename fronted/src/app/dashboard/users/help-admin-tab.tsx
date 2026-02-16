"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  MessageSquare,
  BookOpen,
  ThumbsUp,
  TrendingUp,
  Check,
  X,
  Pencil,
  AlertTriangle,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  getHelpAnalytics,
  reviewCandidate,
  type HelpAnalytics,
} from "./help-admin.api"

function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export function HelpAdminTab() {
  const [data, setData] = useState<HelpAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [editDialog, setEditDialog] = useState<{
    id: number
    question: string
    answer: string
  } | null>(null)
  const [editedAnswer, setEditedAnswer] = useState("")
  const [processing, setProcessing] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const analytics = await getHelpAnalytics()
      setData(analytics)
    } catch {
      toast.error("Error al cargar analytics del asistente")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleReview = async (id: number, status: "APPROVED" | "REJECTED", answer?: string) => {
    try {
      setProcessing(id)
      await reviewCandidate(id, status, answer)
      toast.success(status === "APPROVED" ? "Respuesta aprobada" : "Respuesta rechazada")
      setEditDialog(null)
      void load()
    } catch {
      toast.error("Error al procesar candidato")
    } finally {
      setProcessing(null)
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-14 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6 py-4">
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          icon={<MessageSquare className="h-5 w-5" />}
          label="Consultas (7d)"
          value={data.queries7d}
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Consultas (30d)"
          value={data.queries30d}
        />
        <MetricCard
          icon={<BookOpen className="h-5 w-5" />}
          label="Resueltas por KB"
          value={`${data.kbPercent}%`}
          sub="estatica + verificadas"
        />
        <MetricCard
          icon={<ThumbsUp className="h-5 w-5" />}
          label="Satisfaccion"
          value={`${data.satisfactionPercent}%`}
          sub="feedbacks positivos"
        />
      </div>

      {/* Two-column insights */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top unanswered */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Preguntas sin respuesta estatica
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topUnanswered.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin datos aun</p>
            ) : (
              <div className="space-y-2">
                {data.topUnanswered.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-slate-700 dark:text-slate-300">{item.question}</p>
                      <Badge variant="outline" className="mt-0.5 text-[10px]">{item.section}</Badge>
                    </div>
                    <span className="shrink-0 font-medium text-amber-600">{item.count}x</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top negative */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <X className="h-4 w-4 text-red-500" />
              Respuestas con feedback negativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topNegative.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin datos aun</p>
            ) : (
              <div className="space-y-2">
                {data.topNegative.map((item, i) => (
                  <div key={i} className="text-xs">
                    <p className="truncate text-slate-700 dark:text-slate-300">{item.question}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{item.section}</Badge>
                      <span className="text-red-500">{item.negCount} negativos</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Candidates for review */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">
          Candidatos para la base de conocimiento
          {data.candidates.length > 0 && (
            <Badge className="ml-2" variant="secondary">{data.candidates.length}</Badge>
          )}
        </h3>

        {data.candidates.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No hay candidatos pendientes. Las respuestas de IA con 3+ votos positivos apareceran aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.candidates.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                        {c.question}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{c.section}</Badge>
                        <span className="text-[10px] text-emerald-600">+{c.positiveVotes}</span>
                        {c.negativeVotes > 0 && (
                          <span className="text-[10px] text-red-500">-{c.negativeVotes}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="mb-3 rounded bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {c.answer}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs"
                      disabled={processing === c.id}
                      onClick={() => void handleReview(c.id, "APPROVED")}
                    >
                      <Check className="mr-1 h-3 w-3" /> Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={processing === c.id}
                      onClick={() => {
                        setEditDialog({ id: c.id, question: c.question, answer: c.answer })
                        setEditedAnswer(c.answer)
                      }}
                    >
                      <Pencil className="mr-1 h-3 w-3" /> Editar y aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-red-500 hover:text-red-600"
                      disabled={processing === c.id}
                      onClick={() => void handleReview(c.id, "REJECTED")}
                    >
                      <X className="mr-1 h-3 w-3" /> Rechazar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editDialog} onOpenChange={(open) => { if (!open) setEditDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Editar respuesta antes de aprobar</DialogTitle>
          </DialogHeader>
          {editDialog && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Pregunta:</p>
                <p className="text-sm">{editDialog.question}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Respuesta:</p>
                <textarea
                  value={editedAnswer}
                  onChange={(e) => setEditedAnswer(e.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-slate-700"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDialog(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!editedAnswer.trim() || processing === editDialog?.id}
              onClick={() => {
                if (editDialog) {
                  void handleReview(editDialog.id, "APPROVED", editedAnswer.trim())
                }
              }}
            >
              Aprobar con cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
