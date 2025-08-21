"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Campaign, Creative, fetchCampaign, createCreative } from "../../ads.api"
import { useRBAC } from "@/app/hooks/use-rbac"

const statusLabels: Record<string, string> = {
  active: "Activa",
  paused: "Pausada",
}

export default function CampaignPage() {
  const params = useParams()
  const id = Number(params.id)
  const [data, setData] = useState<{ campaign: Campaign; creatives: Creative[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canCreate = useRBAC(["admin", "marketing"])
  const organizationId = 1

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchCampaign(organizationId, id)
      .then(setData)
      .catch(() => setError("Error al cargar la campaña"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading)
    return (
      <Card>
        <CardContent>Cargando...</CardContent>
      </Card>
    )
  if (error || !data)
    return (
      <Card>
        <CardContent className="text-red-500">{error ?? "No encontrada"}</CardContent>
      </Card>
    )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {data.campaign.name}
          <Badge variant={data.campaign.status === "active" ? "default" : "secondary"}>
            {statusLabels[data.campaign.status] ?? data.campaign.status}
          </Badge>
        </h1>
        {canCreate && (
          <Button
            onClick={async () => {
              const name = prompt("Creative name?")
              if (!name) return
              try {
                const created = await createCreative(organizationId, id, { name })
                setData((prev) =>
                  prev
                    ? { ...prev, creatives: [...prev.creatives, created] }
                    : prev,
                )
              } catch {
                setError("Failed to create creative")
              }
            }}
          >
            Create Creative
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.creatives.map((cr) => (
          <Card key={cr.id}>
            <CardHeader>
              <CardTitle>{cr.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/ads/creative/${cr.id}`}>
                <Button variant="outline">Ver detalles</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.creatives.length === 0 && (
        <Card>
          <CardContent>No se encontraron creatividades.</CardContent>
        </Card>
      )}
    </div>
  )
}
