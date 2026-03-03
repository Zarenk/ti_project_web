"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, ShieldCheck, Search, FileText, Truck } from "lucide-react"

type DocType = "comprobante" | "guia"

export default function VerifySearchPage() {
  const [docType, setDocType] = useState<DocType>("comprobante")
  const [ruc, setRuc] = useState("")
  const [serie, setSerie] = useState("")
  const [correlativo, setCorrelativo] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedRuc = ruc.trim()
    const trimmedSerie = serie.trim().toUpperCase()
    const trimmedCorrelativo = correlativo.trim()

    if (!trimmedRuc || !trimmedSerie || !trimmedCorrelativo) {
      toast.error("Completa todos los campos para buscar.")
      return
    }

    setLoading(true)
    try {
      if (docType === "guia") {
        const res = await fetch(
          `/api/public/verify-guide?ruc=${encodeURIComponent(trimmedRuc)}&serie=${encodeURIComponent(trimmedSerie)}&correlativo=${encodeURIComponent(trimmedCorrelativo)}`,
        )
        if (!res.ok) {
          toast.error("Guía de remisión no encontrada. Verifica los datos ingresados.")
          return
        }
        router.push(
          `/verify/guide?ruc=${encodeURIComponent(trimmedRuc)}&serie=${encodeURIComponent(trimmedSerie)}&num=${encodeURIComponent(trimmedCorrelativo)}`,
        )
      } else {
        const res = await fetch(
          `/api/public/verify?ruc=${encodeURIComponent(trimmedRuc)}&serie=${encodeURIComponent(trimmedSerie)}&correlativo=${encodeURIComponent(trimmedCorrelativo)}`,
        )
        if (!res.ok) {
          toast.error("Comprobante no encontrado. Verifica los datos ingresados.")
          return
        }
        const data = await res.json()
        if (data?.verificationCode) {
          router.push(`/verify/${data.verificationCode}`)
        } else {
          toast.error("Comprobante no encontrado.")
        }
      }
    } catch {
      toast.error(
        docType === "guia"
          ? "Error al buscar la guía de remisión."
          : "Error al buscar el comprobante.",
      )
    } finally {
      setLoading(false)
    }
  }

  const isGuia = docType === "guia"

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-md">
        <div className="flex flex-col items-center gap-3 mb-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100">
            Verificar Documento Electrónico
          </h1>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Ingresa los datos del documento para verificar su autenticidad
          </p>
        </div>

        {/* Document type selector */}
        <div className="flex rounded-full bg-muted/60 p-1 mb-4 animate-in fade-in-0 slide-in-from-bottom-5 duration-600 w-full min-w-0 overflow-hidden">
          <button
            type="button"
            onClick={() => setDocType("comprobante")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
              !isGuia
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Comprobante</span>
          </button>
          <button
            type="button"
            onClick={() => setDocType("guia")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
              isGuia
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Truck className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Guía de Remisión</span>
          </button>
        </div>

        <Card className="border shadow-lg animate-in fade-in-0 slide-in-from-bottom-6 duration-700 w-full min-w-0 overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              Búsqueda Manual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ruc" className="text-sm">
                  RUC del Emisor
                </Label>
                <Input
                  id="ruc"
                  placeholder="20XXXXXXXXX"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  maxLength={11}
                  className="font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="serie" className="text-sm">
                    Serie
                  </Label>
                  <Input
                    id="serie"
                    placeholder={isGuia ? "T001" : "F001"}
                    value={serie}
                    onChange={(e) => setSerie(e.target.value)}
                    maxLength={4}
                    className="font-mono uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="correlativo" className="text-sm">
                    Correlativo
                  </Label>
                  <Input
                    id="correlativo"
                    placeholder="001"
                    value={correlativo}
                    onChange={(e) => setCorrelativo(e.target.value)}
                    maxLength={10}
                    className="font-mono"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full cursor-pointer mt-2"
                aria-busy={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                {loading
                  ? "Buscando..."
                  : isGuia
                    ? "Verificar Guía"
                    : "Verificar Comprobante"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-6 animate-in fade-in-0 duration-1000">
          También puedes escanear el código QR del documento impreso
          para acceder directamente a la verificación.
        </p>
      </div>
    </div>
  )
}
