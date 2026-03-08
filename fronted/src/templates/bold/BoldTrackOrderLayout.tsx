"use client"

import { useState } from "react"
import { Search, Package } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { TrackOrderLayoutProps } from "../types"

export default function BoldTrackOrderLayout(_props: TrackOrderLayoutProps) {
  const [trackingCode, setTrackingCode] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
  }

  return (
    <div className="bg-slate-950 text-white min-h-[60vh] flex items-center">
      <div className="mx-auto max-w-xl w-full px-4 sm:px-6 lg:px-8 py-12 md:py-24">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 shadow-[0_0_20px_rgba(var(--primary-rgb,99,102,241),0.1)]">
              <Package className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Rastrea tu{" "}
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              pedido
            </span>
          </h1>
          <p className="mt-3 text-sm text-white/40 leading-relaxed">
            Ingresa tu código de seguimiento para ver el estado actual.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={trackingCode}
            onChange={(e) => setTrackingCode(e.target.value)}
            placeholder="Código de seguimiento"
            className="h-12 flex-1 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono focus:bg-white/10 transition-colors duration-200"
          />
          <Button
            type="submit"
            className="h-12 rounded-xl px-6 bg-gradient-to-r from-primary to-purple-500 text-sm font-semibold transition-all duration-200 hover:shadow-[0_0_20px_rgba(var(--primary-rgb,99,102,241),0.4)] hover:scale-105 cursor-pointer"
          >
            <Search className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Buscar</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
