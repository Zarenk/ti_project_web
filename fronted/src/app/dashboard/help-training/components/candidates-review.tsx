"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Loader2,
  Inbox,
} from "lucide-react"
import { toast } from "sonner"
import { reviewCandidate } from "../help-training.api"
import type { HelpAnalytics } from "../help-training.api"

interface CandidatesReviewProps {
  candidates: HelpAnalytics["candidates"]
  onReviewed: () => void
}

export function CandidatesReview({
  candidates,
  onReviewed,
}: CandidatesReviewProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editAnswer, setEditAnswer] = useState("")
  const [loadingId, setLoadingId] = useState<number | null>(null)

  const pending = candidates.filter((c) => c.status === "PENDING")

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

  function startEditing(candidate: HelpAnalytics["candidates"][0]) {
    setEditingId(candidate.id)
    setEditAnswer(candidate.answer)
  }

  if (pending.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Inbox className="mb-3 h-10 w-10" />
          <p className="text-lg font-medium">Sin candidatos pendientes</p>
          <p className="text-sm">
            Los candidatos aparecen cuando el sistema detecta preguntas frecuentes sin respuesta.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
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
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">
                    {candidate.question}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{candidate.section}</Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ThumbsUp className="h-3 w-3" />
                      {candidate.positiveVotes}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ThumbsDown className="h-3 w-3" />
                      {candidate.negativeVotes}
                    </span>
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

              <div className="flex gap-2">
                <Button
                  size="sm"
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
    </div>
  )
}
