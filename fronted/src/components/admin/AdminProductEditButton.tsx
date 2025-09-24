"use client"

import { useCallback, type MouseEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

interface AdminProductEditButtonProps {
  productId: number
  className?: string
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
}

export function AdminProductEditButton({
  productId,
  className,
  onClick,
}: AdminProductEditButtonProps) {
  const router = useRouter()
  const { role } = useAuth()

  const isAdmin = role?.toUpperCase() === "ADMIN"

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
      if (onClick) {
        onClick(event)
        return
      }
      router.push(`/dashboard/products/${productId}/edit`)
    },
    [onClick, productId, router],
  )

  if (!isAdmin) {
    return null
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      aria-label="Editar producto"
      title="Editar producto"
      onClick={handleClick}
      className={cn("h-8 w-8 rounded-full shadow-sm", className)}
    >
      <Pencil className="h-4 w-4" />
    </Button>
  )
}