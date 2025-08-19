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

  useEffect(() => {
    fetchCreative(id)
      .then(setCreative)
      .catch(() => setError("Failed to load creative"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading)
    return (
      <Card>
        <CardContent>Loading...</CardContent>
      </Card>
    )
  if (error || !creative)
    return (
      <Card>
        <CardContent className="text-red-500">{error ?? "Not found"}</CardContent>
      </Card>
    )

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{creative.name}</h1>
      <ReferenceImageUpload />
    </div>
  )
}