"use client"

import { useEffect } from "react"
import Link from "next/link"
import { CreditCard, RefreshCw, ShoppingCart } from "lucide-react"

export default function PaymentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[PaymentError]", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <CreditCard className="h-8 w-8 text-destructive" />
      </div>

      <h2 className="text-xl font-semibold text-foreground">
        Error en el proceso de pago
      </h2>

      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "Ocurrió un error durante el proceso de pago. No se realizó ningún cargo."}
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
          href="/cart"
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors cursor-pointer"
        >
          <ShoppingCart className="h-4 w-4" />
          Volver al carrito
        </Link>
      </div>
    </div>
  )
}
