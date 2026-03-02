"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, CheckCircle2, XCircle, Clock } from "lucide-react"
import type { LearningSession } from "../help-training.api"

interface LearningSessionsTableProps {
  sessions: LearningSession[]
}

export function LearningSessionsTable({
  sessions,
}: LearningSessionsTableProps) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <MessageSquare className="mb-3 h-10 w-10" />
          <p className="text-lg font-medium">Sin sesiones registradas</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Últimas sesiones ({sessions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-start gap-3 rounded-md border p-3"
              >
                <div className="mt-0.5">
                  {session.matchFound ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-medium">
                    {session.query}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    {session.section && (
                      <Badge variant="outline" className="text-[10px]">
                        {session.section}
                      </Badge>
                    )}

                    {session.source && (
                      <Badge
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {session.source}
                      </Badge>
                    )}

                    {session.confidence != null && (
                      <span className="text-[10px] text-muted-foreground">
                        conf: {(session.confidence * 100).toFixed(0)}%
                      </span>
                    )}

                    {session.responseTimeMs != null && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {session.responseTimeMs}ms
                      </span>
                    )}

                    {session.wasHelpful != null && (
                      <Badge
                        variant={session.wasHelpful ? "default" : "destructive"}
                        className="text-[10px]"
                      >
                        {session.wasHelpful ? "Útil" : "No útil"}
                      </Badge>
                    )}
                  </div>

                  <p className="text-[10px] text-muted-foreground">
                    {new Date(session.timestamp).toLocaleString("es-PE")}
                    {" · "}Usuario #{session.userId}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
