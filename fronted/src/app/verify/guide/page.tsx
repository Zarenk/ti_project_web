"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  ShieldCheck,
  Building2,
  FileText,
  User,
  MapPin,
  Truck,
  ArrowLeft,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Scale,
} from "lucide-react"

interface GuideVerifyData {
  id: number
  serie: string
  correlativo: string
  motivoTraslado: string
  fechaTraslado: string
  modalidadTraslado: string | null
  puntoPartida: string
  puntoPartidaDireccion: string | null
  puntoPartidaUbigeo: string | null
  puntoLlegada: string
  puntoLlegadaDireccion: string | null
  puntoLlegadaUbigeo: string | null
  destinatarioTipoDocumento: string
  destinatarioNumeroDocumento: string
  destinatarioRazonSocial: string
  transportistaTipoDocumento: string
  transportistaNumeroDocumento: string
  transportistaRazonSocial: string
  transportistaNumeroPlaca: string
  pesoBrutoTotal: number | null
  pesoBrutoUnidad: string | null
  remitenteRuc: string
  remitenteRazonSocial: string
  cdrAceptado: boolean | null
  cdrCode: string | null
  cdrDescription: string | null
  createdAt: string
  guideData: any
}

const MOTIVO_MAP: Record<string, string> = {
  "01": "Venta",
  "02": "Compra",
  "03": "Venta con entrega a terceros",
  "04": "Traslado entre establecimientos",
  "05": "Consignacion",
  "06": "Devolucion",
  "07": "Recojo de bienes transformados",
  "08": "Importacion",
  "09": "Exportacion",
  "13": "Otros",
  "14": "Venta sujeta a confirmacion",
  "17": "Traslado de bienes para transformacion",
  "18": "Traslado emisor itinerante",
  "19": "Traslado zona primaria",
}

const MODALIDAD_MAP: Record<string, string> = {
  "01": "Transporte publico",
  "02": "Transporte privado",
}

const DOC_TYPE_MAP: Record<string, string> = {
  "1": "DNI",
  "4": "Carnet de Extranjeria",
  "6": "RUC",
  "7": "Pasaporte",
  "A": "Cedula Diplomatica",
}

const UM_MAP: Record<string, string> = {
  NIU: "Unidad",
  KGM: "Kilogramos",
  LTR: "Litros",
  MTR: "Metros",
  BX: "Cajas",
}

function SunatStatusBadge({ data }: { data: GuideVerifyData }) {
  if (data.cdrAceptado) {
    return (
      <Badge className="gap-1 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Aceptado por SUNAT
      </Badge>
    )
  }
  if (data.cdrCode) {
    return (
      <Badge variant="destructive" className="gap-1 text-xs">
        <XCircle className="w-3.5 h-3.5" />
        Rechazado
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1 text-xs">
      <Clock className="w-3.5 h-3.5" />
      Pendiente
    </Badge>
  )
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function VerifyGuidePage() {
  const searchParams = useSearchParams()
  const ruc = searchParams.get("ruc")
  const serie = searchParams.get("serie")
  const num = searchParams.get("num")

  const [data, setData] = useState<GuideVerifyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!ruc || !serie || !num) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(
      `/api/public/verify-guide?ruc=${encodeURIComponent(ruc)}&serie=${encodeURIComponent(serie)}&correlativo=${encodeURIComponent(num)}`,
    )
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
  }, [ruc, serie, num])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4 py-16 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-muted-foreground">Verificando guia de remision...</p>
        </div>
      </div>
    )
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4 py-16 max-w-md flex flex-col items-center gap-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-center">Guia de remision no encontrada</h1>
          <p className="text-sm text-muted-foreground text-center">
            No se encontro una guia de remision con los datos proporcionados.
            Verifica que el enlace o codigo QR sea correcto.
          </p>
          <Link href="/verify">
            <Button variant="outline" className="cursor-pointer mt-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Buscar otro documento
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const items: { codigo: string; descripcion: string; cantidad: number; unidadMedida: string }[] =
    data.guideData?.items || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-2xl w-full min-w-0">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-center text-slate-800 dark:text-slate-100">
            Guia de Remision Verificada
          </h1>
          <SunatStatusBadge data={data} />
        </div>

        <div className="flex flex-col gap-4 w-full min-w-0">
          {/* Remitente Card */}
          <Card className="w-full min-w-0 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: "100ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4 flex-shrink-0" />
                Remitente
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <p className="font-semibold text-base break-words">{data.remitenteRazonSocial}</p>
              <p className="text-sm text-muted-foreground mt-1">
                RUC: <span className="font-mono">{data.remitenteRuc}</span>
              </p>
            </CardContent>
          </Card>

          {/* Documento Card */}
          <Card className="w-full min-w-0 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: "200ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <FileText className="w-4 h-4 flex-shrink-0" />
                Guia de Remision Electronica
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="outline" className="text-xs uppercase">
                  GRE
                </Badge>
                <span className="font-mono font-semibold text-sm">
                  {data.serie}-{data.correlativo}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                <span className="text-muted-foreground">Fecha de traslado</span>
                <span className="text-right">{formatDate(data.fechaTraslado)}</span>
                <span className="text-muted-foreground">Fecha de emision</span>
                <span className="text-right">{formatDate(data.createdAt)}</span>
                <span className="text-muted-foreground">Motivo de traslado</span>
                <span className="text-right">{MOTIVO_MAP[data.motivoTraslado] || data.motivoTraslado}</span>
                <span className="text-muted-foreground">Modalidad</span>
                <span className="text-right">
                  {data.modalidadTraslado
                    ? MODALIDAD_MAP[data.modalidadTraslado] || data.modalidadTraslado
                    : "\u2014"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Route Card */}
          <Card className="w-full min-w-0 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: "300ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                Ruta de Traslado
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <div className="flex flex-col gap-3">
                <div className="w-full min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Punto de Partida
                  </p>
                  <p className="text-sm break-words">
                    {data.puntoPartidaDireccion || data.puntoPartida}
                  </p>
                  {data.puntoPartidaUbigeo && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ubigeo: {data.puntoPartidaUbigeo}
                    </p>
                  )}
                </div>
                <Separator />
                <div className="w-full min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Punto de Llegada
                  </p>
                  <p className="text-sm break-words">
                    {data.puntoLlegadaDireccion || data.puntoLlegada}
                  </p>
                  {data.puntoLlegadaUbigeo && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ubigeo: {data.puntoLlegadaUbigeo}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Destinatario Card */}
          <Card className="w-full min-w-0 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: "400ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4 flex-shrink-0" />
                Destinatario
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <p className="font-medium text-sm break-words">{data.destinatarioRazonSocial}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {DOC_TYPE_MAP[data.destinatarioTipoDocumento] || data.destinatarioTipoDocumento}:{" "}
                <span className="font-mono">{data.destinatarioNumeroDocumento}</span>
              </p>
            </CardContent>
          </Card>

          {/* Transportista Card */}
          <Card className="w-full min-w-0 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: "500ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <Truck className="w-4 h-4 flex-shrink-0" />
                Transportista
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <p className="font-medium text-sm break-words">{data.transportistaRazonSocial}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {DOC_TYPE_MAP[data.transportistaTipoDocumento] || data.transportistaTipoDocumento}:{" "}
                <span className="font-mono">{data.transportistaNumeroDocumento}</span>
              </p>
              {data.transportistaNumeroPlaca && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Placa: <span className="font-mono font-semibold">{data.transportistaNumeroPlaca}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Items Card */}
          {items.length > 0 && (
            <Card className="w-full min-w-0 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: "600ms" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Package className="w-4 h-4 flex-shrink-0" />
                  Bienes Trasladados
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-hidden">
                <div className="space-y-3">
                  {items.map((item, i) => (
                    <div key={i} className="w-full min-w-0">
                      <div className="flex justify-between items-start gap-2 w-full min-w-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium break-words">{item.descripcion}</p>
                          {item.codigo && (
                            <p className="text-xs text-muted-foreground font-mono">{item.codigo}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold whitespace-nowrap">
                            {item.cantidad} {UM_MAP[item.unidadMedida] || item.unidadMedida}
                          </p>
                        </div>
                      </div>
                      {i < items.length - 1 && <Separator className="mt-3" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weight Card */}
          {data.pesoBrutoTotal != null && data.pesoBrutoTotal > 0 && (
            <Card className="w-full min-w-0 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: "650ms" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Scale className="w-4 h-4 flex-shrink-0" />
                  Peso Bruto Total
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-hidden">
                <p className="text-lg font-bold">
                  {data.pesoBrutoTotal} {data.pesoBrutoUnidad || "KGM"}
                </p>
              </CardContent>
            </Card>
          )}

          {/* SUNAT Status Card */}
          <Card className="w-full min-w-0 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: "700ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                Estado SUNAT
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <SunatStatusBadge data={data} />
              </div>
              {data.cdrCode && (
                <p className="text-xs text-muted-foreground">
                  Codigo: {data.cdrCode}
                </p>
              )}
              {data.cdrDescription && (
                <p className="text-xs text-muted-foreground mt-0.5 break-words">
                  {data.cdrDescription}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-center mt-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: "800ms" }}>
            <Link href="/verify">
              <Button variant="outline" className="cursor-pointer">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Buscar otro documento
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
