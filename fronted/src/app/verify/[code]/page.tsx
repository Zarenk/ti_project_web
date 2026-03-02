"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Navbar from "@/components/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  ShieldCheck,
  Building2,
  FileText,
  User,
  Package,
  Receipt,
  Download,
  ArrowLeft,
  Loader2,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react"

interface VerifyData {
  verificationCode: string
  comprobante: {
    tipo: string
    serie: string
    correlativo: string
    moneda: string
    fechaEmision: string | null
    total: number | null
  }
  emisor: {
    razonSocial: string
    ruc: string | null
    direccion: string | null
    telefono: string | null
    logo: string | null
  }
  cliente: {
    nombre: string | null
    tipoDocumento: string | null
  }
  items: {
    producto: string
    sku: string | null
    cantidad: number
    precioUnitario: number
    subtotal: number
  }[]
  montos: {
    gravada: number
    igv: number
    exonerada: number
    inafecta: number
    total: number
  }
  sunat: {
    estado: string
    codigo: string | null
    descripcion: string | null
    ambiente: string | null
    fecha: string | null
  } | null
  hasPdf: boolean
}

function SunatStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    ACCEPTED: { label: "Aceptado por SUNAT", variant: "default", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    PENDING: { label: "Pendiente", variant: "secondary", icon: <Clock className="w-3.5 h-3.5" /> },
    REJECTED: { label: "Rechazado", variant: "destructive", icon: <XCircle className="w-3.5 h-3.5" /> },
    OBSERVED: { label: "Observado", variant: "outline", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    SENT: { label: "Enviado", variant: "secondary", icon: <Clock className="w-3.5 h-3.5" /> },
    SENDING: { label: "Enviando", variant: "secondary", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
  }
  const s = map[status] ?? { label: status, variant: "outline" as const, icon: null }
  return (
    <Badge variant={s.variant} className="gap-1 text-xs">
      {s.icon}
      {s.label}
    </Badge>
  )
}

function formatCurrency(amount: number | null, currency = "PEN") {
  if (amount == null) return "—"
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "PEN",
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function VerifyDetailPage() {
  const params = useParams<{ code: string }>()
  const code = params.code
  const [data, setData] = useState<VerifyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!code) return
    setLoading(true)
    fetch(`/api/public/verify/${encodeURIComponent(code)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found")
        return res.json()
      })
      .then((d) => {
        setData(d)
        setNotFound(false)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [code])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <Navbar />
        <div className="container mx-auto px-4 py-16 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-muted-foreground">Verificando comprobante...</p>
        </div>
      </div>
    )
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <Navbar />
        <div className="container mx-auto px-4 py-16 max-w-md flex flex-col items-center gap-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-center">Comprobante no encontrado</h1>
          <p className="text-sm text-muted-foreground text-center">
            No se encontró un comprobante con el código proporcionado.
            Verifica que el enlace o código QR sea correcto.
          </p>
          <Link href="/verify">
            <Button variant="outline" className="cursor-pointer mt-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Buscar otro comprobante
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const currency = data.comprobante.moneda

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl w-full min-w-0">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-center text-slate-800 dark:text-slate-100">
            Comprobante Verificado
          </h1>
          {data.sunat && <SunatStatusBadge status={data.sunat.estado} />}
        </div>

        <div className="flex flex-col gap-4 w-full min-w-0">
          {/* Emisor Card */}
          <Card className="w-full min-w-0 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: "100ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4 flex-shrink-0" />
                Emisor
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <p className="font-semibold text-base break-words">{data.emisor.razonSocial}</p>
              {data.emisor.ruc && (
                <p className="text-sm text-muted-foreground mt-1">
                  RUC: <span className="font-mono">{data.emisor.ruc}</span>
                </p>
              )}
              {data.emisor.direccion && (
                <p className="text-sm text-muted-foreground mt-0.5 break-words">
                  {data.emisor.direccion}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Comprobante Card */}
          <Card className="w-full min-w-0 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: "200ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <FileText className="w-4 h-4 flex-shrink-0" />
                Comprobante
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs uppercase">
                  {data.comprobante.tipo}
                </Badge>
                <span className="font-mono font-semibold text-sm">
                  {data.comprobante.serie}-{data.comprobante.correlativo}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-1 text-sm">
                <span className="text-muted-foreground">Fecha de emisión</span>
                <span className="text-right">{formatDate(data.comprobante.fechaEmision)}</span>
                <span className="text-muted-foreground">Moneda</span>
                <span className="text-right">{currency}</span>
              </div>
            </CardContent>
          </Card>

          {/* Cliente Card */}
          {data.cliente.nombre && (
            <Card className="w-full min-w-0 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: "300ms" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4 flex-shrink-0" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-hidden">
                <p className="font-medium text-sm break-words">{data.cliente.nombre}</p>
                {data.cliente.tipoDocumento && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tipo de documento: {data.cliente.tipoDocumento}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Items Card */}
          <Card className="w-full min-w-0 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: "400ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <Package className="w-4 h-4 flex-shrink-0" />
                Detalle de Productos
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <div className="space-y-3">
                {data.items.map((item, i) => (
                  <div key={i} className="w-full min-w-0">
                    <div className="flex justify-between items-start gap-2 w-full min-w-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium break-words">{item.producto}</p>
                        {item.sku && (
                          <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                        )}
                      </div>
                      <p className="text-sm font-semibold whitespace-nowrap flex-shrink-0">
                        {formatCurrency(item.subtotal, currency)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.cantidad} x {formatCurrency(item.precioUnitario, currency)}
                    </p>
                    {i < data.items.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Montos Card */}
          <Card className="w-full min-w-0 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: "500ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <Receipt className="w-4 h-4 flex-shrink-0" />
                Resumen
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Op. Gravada</span>
                  <span>{formatCurrency(data.montos.gravada, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IGV (18%)</span>
                  <span>{formatCurrency(data.montos.igv, currency)}</span>
                </div>
                {data.montos.exonerada > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Op. Exonerada</span>
                    <span>{formatCurrency(data.montos.exonerada, currency)}</span>
                  </div>
                )}
                {data.montos.inafecta > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Op. Inafecta</span>
                    <span>{formatCurrency(data.montos.inafecta, currency)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(data.montos.total, currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SUNAT Status Card */}
          {data.sunat && (
            <Card className="w-full min-w-0 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: "600ms" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  Estado SUNAT
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <SunatStatusBadge status={data.sunat.estado} />
                  {data.sunat.ambiente && (
                    <Badge variant="outline" className="text-xs">
                      {data.sunat.ambiente}
                    </Badge>
                  )}
                </div>
                {data.sunat.descripcion && (
                  <p className="text-xs text-muted-foreground break-words">
                    {data.sunat.descripcion}
                  </p>
                )}
                {data.sunat.fecha && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Enviado: {formatDate(data.sunat.fecha)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: "700ms" }}>
            {data.hasPdf && (
              <a
                href={`/api/public/verify/${encodeURIComponent(code)}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button className="w-full cursor-pointer" variant="default">
                  <Download className="mr-2 h-4 w-4" />
                  Descargar PDF
                </Button>
              </a>
            )}
            <Link href="/verify" className="flex-1">
              <Button variant="outline" className="w-full cursor-pointer">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Buscar otro comprobante
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
