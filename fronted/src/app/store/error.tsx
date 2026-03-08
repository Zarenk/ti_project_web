"use client"

import { useEffect } from "react"
import Link from "next/link"
import { ShoppingBag, RefreshCw, Home } from "lucide-react"

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[StoreError]", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <ShoppingBag className="h-8 w-8 text-destructive" />
      </div>

      <h2 className="text-xl font-semibold text-foreground">
        Error al cargar la tienda
      </h2>

      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "Ocurrió un error al cargar los productos. Intenta de nuevo."}
      </p>

      <div className="mt-2 flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          Intentar de nuevo
        </button>
        <Link
          href="/store"
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors cursor-pointer"
        >
          <Home className="h-4 w-4" />
          Volver a la tienda
        </Link>
      </div>
    </div>
  )
}
