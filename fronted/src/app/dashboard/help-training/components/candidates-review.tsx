"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Loader2,
  Inbox,
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"
import { reviewCandidate, overrideArbiterDecision } from "../help-training.api"
import type { HelpAnalytics } from "../help-training.api"

interface CandidatesReviewProps {
  candidates: HelpAnalytics["candidates"]
  onReviewed: () => void
}

type Candidate = HelpAnalytics["candidates"][0]

const DECISION_BADGES: Record<
  string,
  { label: string; variant: "default" | "destructive" | "outline" | "secondary" }
> = {
  AUTO_APPROVED: { label: "Auto-aprobado", variant: "default" },
  AUTO_REJECTED: { label: "Auto-rechazado", variant: "destructive" },
  DEGRADED: { label: "Degradado", variant: "secondary" },
  MANUAL: { label: "Manual", variant: "outline" },
}

function scoreColor(score: number | null): string {
  if (score == null) return "bg-muted"
  if (score >= 0.8) return "bg-green-500"
  if (score >= 0.5) return "bg-amber-500"
  return "bg-red-500"
}

function scoreColorText(score: number | null): string {
  if (score == null) return "text-muted-foreground"
  if (score >= 0.8) return "text-green-600 dark:text-green-400"
  if (score >= 0.5) return "text-amber-600 dark:text-amber-400"
  return "text-red-600 dark:text-red-400"
}

function ScoreBar({ candidate }: { candidate: Candidate }) {
  const score = candidate.qualityScore
  if (score == null) return null

  const factors = candidate.scoreFactors
  const pct = Math.round(score * 100)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Progress
              value={pct}
              className={`h-1.5 w-20 cursor-pointer [&>div]:${scoreColor(score)}`}
            />
            <span className={`text-xs font-medium ${scoreColorText(score)}`}>
              {pct}%
            </span>
          </div>
        </TooltipTrigger>
        {factors && (
          <TooltipContent side="bottom" className="text-xs">
            <div className="space-y-0.5">
              <p>Satisfacción: {Math.round((factors.satisfaction ?? 0) * 100)}%</p>
              <p>Volumen: {Math.round((factors.volume ?? 0) * 100)}%</p>
              <p>Recencia: {Math.round((factors.recency ?? 0) * 100)}%</p>
              <p>Profundidad: {Math.round((factors.depth ?? 0) * 100)}%</p>
              <p>Latencia: {Math.round((factors.latency ?? 0) * 100)}%</p>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}

export function CandidatesReview({
  candidates,
  onReviewed,
}: CandidatesReviewProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editAnswer, setEditAnswer] = useState("")
  const [loadingId, setLoadingId] = useState<number | null>(null)

  const pending = candidates
    .filter((c) => c.status === "PENDING")
    .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0))

  const processed = candidates.filter((c) =>
    c.status !== "PENDING" && c.arbiterDecision != null,
  )

  async function handleReview(
    id: number,
    status: "APPROVED" | "REJECTED",
    answer?: string,
  ) {
    setLoadingId(id)
    try {
      await reviewCandidate(id, status, answer)
      toast.success(
        status === "APPROVED"
          ? "Candidato aprobado y agregado al KB"
          : "Candidato rechazado",
      )
      setEditingId(null)
      setEditAnswer("")
      onReviewed()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al revisar candidato",
      )
    } finally {
      setLoadingId(null)
    }
  }

  async function handleOverride(id: number, decision: "APPROVED" | "REJECTED") {
    setLoadingId(id)
    try {
      await overrideArbiterDecision(id, decision)
      toast.success(
        decision === "APPROVED"
          ? "Override: candidato aprobado"
          : "Override: candidato rechazado",
      )
      onReviewed()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al aplicar override",
      )
    } finally {
      setLoadingId(null)
    }
  }

  function startEditing(candidate: Candidate) {
    setEditingId(candidate.id)
    setEditAnswer(candidate.answer)
  }

  return (
    <div className="space-y-6">
      {/* Pending Section */}
      {pending.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Inbox className="mb-3 h-10 w-10" />
            <p className="text-lg font-medium">Sin candidatos pendientes</p>
            <p className="text-sm">
              Los candidatos aparecen cuando el sistema detecta preguntas frecuentes sin respuesta.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {pending.length} candidato{pending.length !== 1 ? "s" : ""} pendiente
            {pending.length !== 1 ? "s" : ""} de revisión
          </p>

          {pending.map((candidate) => {
            const isEditing = editingId === candidate.id
            const isLoading = loadingId === candidate.id

            return (
              <Card key={candidate.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <CardTitle className="text-base font-medium">
                        {candidate.question}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{candidate.section}</Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ThumbsUp className="h-3 w-3" />
                          {candidate.positiveVotes}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ThumbsDown className="h-3 w-3" />
                          {candidate.negativeVotes}
                        </span>
                        <ScoreBar candidate={candidate} />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isEditing ? (
                    <Textarea
                      value={editAnswer}
                      onChange={(e) => setEditAnswer(e.target.value)}
                      rows={4}
                    />
                  ) : (
                    <p className="rounded-md bg-muted/50 p-3 text-sm">
                      {candidate.answer}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="cursor-pointer"
                      onClick={() =>
                        handleReview(
                          candidate.id,
                          "APPROVED",
                          isEditing ? editAnswer : undefined,
                        )
                      }
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      )}
                      Aprobar
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      className="cursor-pointer"
                      onClick={() => handleReview(candidate.id, "REJECTED")}
                      disabled={isLoading}
                    >
                      <XCircle className="mr-1 h-3.5 w-3.5" />
                      Rechazar
                    </Button>

                    {!isEditing && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => startEditing(candidate)}
                        disabled={isLoading}
                      >
                        <Edit3 className="mr-1 h-3.5 w-3.5" />
                        Editar
                      </Button>
                    )}

                    {isEditing && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="cursor-pointer"
                        onClick={() => {
                          setEditingId(null)
                          setEditAnswer("")
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </>
      )}

      {/* Processed Section (auto-decided by arbiter) */}
      {processed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Procesados por el árbitro ({processed.length})
          </h3>
          {processed.map((candidate) => {
            const badge = DECISION_BADGES[candidate.arbiterDecision ?? ""]
            const isLoading = loadingId === candidate.id
            const isApproved = candidate.status === "APPROVED"

            return (
              <Card key={candidate.id} className="opacity-80">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <CardTitle className="text-sm font-medium">
                        {candidate.question}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {candidate.section}
                        </Badge>
                        {badge && (
                          <Badge variant={badge.variant} className="text-[10px]">
                            {badge.label}
                          </Badge>
                        )}
                        <ScoreBar candidate={candidate} />
                      </div>
                    </div>
                    {/* Override button */}
                    {candidate.arbiterDecision !== "MANUAL" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 cursor-pointer text-xs"
                        disabled={isLoading}
                        onClick={() =>
                          handleOverride(
                            candidate.id,
                            isApproved ? "REJECTED" : "APPROVED",
                          )
                        }
                      >
                        {isLoading ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-1 h-3 w-3" />
                        )}
                        {isApproved ? "Rechazar" : "Aprobar"}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {candidate.answer}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
