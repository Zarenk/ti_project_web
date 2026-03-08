"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="text-lg font-semibold">Algo salio mal</h2>
          <p className="text-sm text-gray-500">
            Se ha producido un error inesperado. Nuestro equipo ha sido
            notificado.
          </p>
          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white cursor-pointer hover:bg-blue-700 transition-colors"
            onClick={reset}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
