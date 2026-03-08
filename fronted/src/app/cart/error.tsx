"use client"

import { useEffect } from "react"
import Link from "next/link"
import { ShoppingCart, RefreshCw, Store } from "lucide-react"

export default function CartError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[CartError]", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <ShoppingCart className="h-8 w-8 text-destructive" />
      </div>

      <h2 className="text-xl font-semibold text-foreground">
        Error al cargar el carrito
      </h2>

      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "Ocurrió un error al cargar tu carrito. Intenta de nuevo."}
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
          <Store className="h-4 w-4" />
          Ir a la tienda
        </Link>
      </div>
    </div>
  )
}
