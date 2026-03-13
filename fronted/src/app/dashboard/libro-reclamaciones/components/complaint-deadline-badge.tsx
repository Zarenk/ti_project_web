"use client"

import { Badge } from "@/components/ui/badge"

interface Props {
  remainingDays: number
  status: string
}

export function ComplaintDeadlineBadge({ remainingDays, status }: Props) {
  if (status === "RESPONDED") {
    return <Badge variant="default">Respondido</Badge>
  }

  if (remainingDays <= 0) {
    return <Badge variant="destructive">Vencido</Badge>
  }

  if (remainingDays <= 3) {
    return (
      <Badge className="bg-red-500 text-white hover:bg-red-600">
        {remainingDays}d restantes
      </Badge>
    )
  }

  if (remainingDays <= 5) {
    return (
      <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">
        {remainingDays}d restantes
      </Badge>
    )
  }

  return (
    <Badge variant="secondary">
      {remainingDays}d restantes
    </Badge>
  )
}
