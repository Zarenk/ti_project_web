"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Campaign, Creative, fetchCampaign } from "../../ads.api"
import { useRBAC } from "@/app/hooks/use-rbac"

export default function CampaignPage() {
  const params = useParams()
  const id = Number(params.id)
  const [data, setData] = useState<{ campaign: Campaign; creatives: Creative[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canCreate = useRBAC(["admin", "marketing"])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchCampaign(id)
      .then(setData)
      .catch(() => setError("Failed to load campaign"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading)
    return (
      <Card>
        <CardContent>Loading...</CardContent>
      </Card>
    )
  if (error || !data)
    return (
      <Card>
        <CardContent className="text-red-500">{error ?? "Not found"}</CardContent>
      </Card>
    )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{data.campaign.name}</h1>
        {canCreate && <Button>Create Creative</Button>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.creatives.map((cr) => (
          <Card key={cr.id}>
            <CardHeader>
              <CardTitle>{cr.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/ads/creative/${cr.id}`}>
                <Button variant="outline">View</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.creatives.length === 0 && (
        <Card>
          <CardContent>No creatives found.</CardContent>
        </Card>
      )}
    </div>
  )
}
