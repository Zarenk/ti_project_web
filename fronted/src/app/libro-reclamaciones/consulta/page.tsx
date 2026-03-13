"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Loader2, Search } from "lucide-react"
import {
  lookupComplaintStatus,
  type ComplaintStatusResult,
} from "../complaint-api"

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  PENDING: { label: "Pendiente", variant: "secondary" },
  RESPONDED: { label: "Respondido", variant: "default" },
  OVERDUE: { label: "Vencido", variant: "destructive" },
}

export default function ConsultaPage() {
  const searchParams = useSearchParams()
  const initialCode = searchParams.get("code") || ""

  const [code, setCode] = useState(initialCode)
  const [result, setResult] = useState<ComplaintStatusResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const search = useCallback(async (trackingCode: string) => {
    if (!trackingCode.trim()) return
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const data = await lookupComplaintStatus(trackingCode.trim())
      setResult(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se encontró el reclamo."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialCode) search(initialCode)
  }, [initialCode, search])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    search(code)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Consulta de Reclamo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingrese su código de seguimiento para ver el estado
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mb-8 flex gap-2">
          <div className="flex-1">
            <Label htmlFor="code" className="sr-only">
              Código de seguimiento
            </Label>
            <Input
              id="code"
              placeholder="Ej: LR-A1B2C3D4"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} className="cursor-pointer">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </form>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-lg border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm">
                Nº {result.correlativeNumber}
              </span>
              <Badge variant={STATUS_MAP[result.status]?.variant ?? "secondary"}>
                {STATUS_MAP[result.status]?.label ?? result.status}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo:</span>
                <span>{result.complaintType === "RECLAMO" ? "Reclamo" : "Queja"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Proveedor:</span>
                <span>{result.providerLegalName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha registro:</span>
                <span>
                  {new Date(result.createdAt).toLocaleDateString("es-PE")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha límite:</span>
                <span>
                  {new Date(result.deadlineDate).toLocaleDateString("es-PE")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Días hábiles restantes:</span>
                <span
                  className={
                    result.remainingBusinessDays <= 0
                      ? "font-bold text-destructive"
                      : result.remainingBusinessDays <= 3
                        ? "font-bold text-yellow-600"
                        : ""
                  }
                >
                  {result.remainingBusinessDays <= 0
                    ? "Vencido"
                    : result.remainingBusinessDays}
                </span>
              </div>
            </div>

            {result.responseText && (
              <div className="mt-4 rounded-md border-l-4 border-primary bg-muted/50 p-4">
                <h3 className="mb-2 font-semibold text-sm">
                  Respuesta del proveedor
                </h3>
                <p className="whitespace-pre-wrap text-sm">
                  {result.responseText}
                </p>
                {result.responseDate && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Respondido el{" "}
                    {new Date(result.responseDate).toLocaleDateString("es-PE")}
                  </p>
                )}
              </div>
            )}

            {!result.responseText && result.status === "PENDING" && (
              <p className="text-sm text-muted-foreground italic">
                El proveedor aún no ha respondido a su reclamo.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
