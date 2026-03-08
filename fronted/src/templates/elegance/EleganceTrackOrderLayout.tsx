"use client"

import { useState } from "react"
import { Search, Package } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { TrackOrderLayoutProps } from "../types"

export default function EleganceTrackOrderLayout(_props: TrackOrderLayoutProps) {
  const [trackingCode, setTrackingCode] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
  }

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 py-12 md:py-24">
      <div className="text-center mb-10">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/5">
            <Package className="h-5 w-5 text-primary/70" />
          </div>
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/70 mb-3">
          Seguimiento
        </p>
        <h1 className="text-2xl font-extralight tracking-tight text-foreground sm:text-3xl">
          Rastrea tu pedido
        </h1>
        <div className="mx-auto mt-4 h-px w-12 bg-border" />
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          Ingresa tu código de seguimiento para ver el estado de tu pedido.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={trackingCode}
          onChange={(e) => setTrackingCode(e.target.value)}
          placeholder="Código de seguimiento"
          className="h-12 flex-1 rounded-full border-border/30 px-5 text-sm font-mono transition-colors duration-300 focus:border-primary/50"
        />
        <Button
          type="submit"
          className="h-12 rounded-full px-6 text-xs font-medium uppercase tracking-[0.1em] cursor-pointer"
        >
          <Search className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Buscar</span>
        </Button>
      </form>
    </div>
  )
}
