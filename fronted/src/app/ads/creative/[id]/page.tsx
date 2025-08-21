"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Creative, fetchCreative } from "../../ads.api"
import ReferenceImageUpload from "../../components/reference-image-upload"

export default function CreativePage() {
  const params = useParams()
  const id = Number(params.id)
  const [creative, setCreative] = useState<Creative | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const organizationId = 1

  useEffect(() => {
    fetchCreative(organizationId, id)
      .then(setCreative)
      .catch(() => setError("Error al cargar la creatividad"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading)
    return (
      <Card>
        <CardContent>Cargando...</CardContent>
      </Card>
    )
  if (error || !creative)
    return (
      <Card>
        <CardContent className="text-red-500">{error ?? "No encontrada"}</CardContent>
      </Card>
    )

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{creative.name}</h1>
      <p className="text-muted-foreground">
        Sube una imagen de referencia para generar la creatividad.
      </p>
      <ReferenceImageUpload />
    </div>
  )
}