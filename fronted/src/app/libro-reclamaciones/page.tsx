"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { BookOpen } from "lucide-react"
import { ComplaintForm } from "./complaint-form"
import { ComplaintSuccess } from "./complaint-success"
import {
  getCompanyForComplaint,
  type CompanyComplaintInfo,
  type ComplaintSubmitResult,
} from "./complaint-api"

export default function LibroReclamacionesPage() {
  const searchParams = useSearchParams()
  const slug = searchParams.get("slug") || ""

  const [company, setCompany] = useState<CompanyComplaintInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [result, setResult] = useState<ComplaintSubmitResult | null>(null)

  const loadCompany = useCallback(async () => {
    if (!slug) {
      setError("No se proporcionó identificador de empresa.")
      setLoading(false)
      return
    }
    try {
      const data = await getCompanyForComplaint(slug)
      setCompany(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar la empresa."
      )
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    loadCompany()
  }, [loadCompany])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-destructive">Error</h1>
          <p className="mt-2 text-muted-foreground">
            {error || "Empresa no encontrada."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Libro de Reclamaciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hoja de Reclamación — {company.name}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Conforme al Decreto Supremo N° 011-2011-PCM y sus modificatorias
          </p>
        </div>

        {result ? (
          <ComplaintSuccess result={result} companyName={company.name} />
        ) : (
          <ComplaintForm
            slug={slug}
            company={company}
            onSuccess={setResult}
          />
        )}
      </div>
    </div>
  )
}
