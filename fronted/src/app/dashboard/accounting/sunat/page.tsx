"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AccountingModeToggle } from "@/components/accounting-mode-toggle"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  FileCheck,
  Clock,
} from "lucide-react"
import Link from "next/link"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { PageGuideButton } from "@/components/page-guide-dialog"
import { SUNAT_GUIDE_STEPS } from "./sunat-guide-steps"
import { getCompanyDetail } from "@/app/dashboard/tenancy/tenancy.api"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function SUNATPage() {
  const [exportingPLE, setExportingPLE] = useState(false)
  const [loading, setLoading] = useState(true)
  const [companyData, setCompanyData] = useState<{
    ruc: string
    razonSocial: string
  } | null>(null)

  const { selection } = useTenantSelection()

  useEffect(() => {
    async function loadCompanyData() {
      if (!selection.companyId) {
        setLoading(false)
        return
      }

      try {
        const company = await getCompanyDetail(selection.companyId)
        if (company) {
          setCompanyData({
            ruc: company.sunatRuc || company.taxId || "Sin RUC",
            razonSocial: company.sunatBusinessName || company.legalName || company.name,
          })
        }
      } catch (error) {
        console.error("Error loading company data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadCompanyData()
  }, [selection.companyId])

  // Calculate current period and next declaration date
  const today = new Date()
  const currentPeriod = format(today, "yyyy-MM")
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 15)
  const daysUntilDeclaration = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const complianceData = {
    ruc: companyData?.ruc || "Cargando...",
    razonSocial: companyData?.razonSocial || "Cargando...",
    periodo: currentPeriod,
    estadoLibros: "AL_DIA" as const,
    proximaDeclaracion: format(nextMonth, "yyyy-MM-dd"),
    diasRestantes: daysUntilDeclaration,
  }

  const pleBooks = [
    {
      id: "5.1",
      name: "Libro Diario",
      description: "Registro cronológico de todas las operaciones",
      status: "AL_DIA" as const,
      ultimaActualizacion: "Hoy",
      registros: 245,
    },
    {
      id: "5.3",
      name: "Libro Mayor",
      description: "Movimientos agrupados por cuenta contable",
      status: "AL_DIA" as const,
      ultimaActualizacion: "Hoy",
      registros: 89,
    },
    {
      id: "3.1",
      name: "Libro de Inventarios y Balances",
      description: "Balance General y Estado de Resultados",
      status: "PENDIENTE" as const,
      ultimaActualizacion: "Hace 3 días",
      registros: 0,
    },
    {
      id: "8.1",
      name: "Registro de Compras",
      description: "Todas tus facturas de compra",
      status: "AL_DIA" as const,
      ultimaActualizacion: "Hoy",
      registros: 45,
    },
    {
      id: "14.1",
      name: "Registro de Ventas",
      description: "Todas tus facturas de venta",
      status: "AL_DIA" as const,
      ultimaActualizacion: "Hoy",
      registros: 123,
    },
  ]

  const handleExportPLE = async (bookId: string) => {
    setExportingPLE(true)
    // TODO: Implement actual export
    setTimeout(() => setExportingPLE(false), 2000)
  }

  const getStatusBadge = (status: "AL_DIA" | "PENDIENTE" | "ATRASADO") => {
    switch (status) {
      case "AL_DIA":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Al día</Badge>
      case "PENDIENTE":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendiente</Badge>
      case "ATRASADO":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Atrasado</Badge>
    }
  }

  const getStatusColor = (status: "AL_DIA" | "PENDIENTE" | "ATRASADO") => {
    switch (status) {
      case "AL_DIA":
        return "border-green-200 dark:border-green-800"
      case "PENDIENTE":
        return "border-yellow-200 dark:border-yellow-800"
      case "ATRASADO":
        return "border-red-200 dark:border-red-800"
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">SUNAT</h1>
            <PageGuideButton steps={SUNAT_GUIDE_STEPS} tooltipLabel="Guía de SUNAT" />
          </div>
          <p className="text-muted-foreground mt-1">
            Cumplimiento tributario y exportaciones PLE
          </p>
        </div>
        <AccountingModeToggle variant="compact" />
      </div>

      {/* Company Info & Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RUC</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <>
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-48 mt-1" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{complianceData.ruc}</div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {complianceData.razonSocial}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Periodo Actual</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceData.periodo}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Febrero 2026
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado de Libros</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Al Día</div>
            <p className="text-xs text-muted-foreground mt-1">
              Todos los registros actualizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próxima Declaración</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceData.diasRestantes} días</div>
            <p className="text-xs text-muted-foreground mt-1">
              Vence: {complianceData.proximaDeclaracion}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Alert/Info */}
      <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/40 h-fit">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                ¿Qué son los libros electrónicos PLE?
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
                Son archivos que SUNAT te pide mensualmente con toda tu información contable.
                Desde aquí puedes descargarlos en el formato oficial (TXT) para subirlos al portal de SUNAT.
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
                <strong>Importante:</strong> Debes generar y enviar estos libros antes del día 15 de cada mes
                (para el mes anterior).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PLE Books */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Libros Electrónicos (PLE)</CardTitle>
              <CardDescription>Archivos para enviar a SUNAT</CardDescription>
            </div>
            <Button
              onClick={() => handleExportPLE("all")}
              disabled={exportingPLE}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar Todos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pleBooks.map((book) => (
              <div
                key={book.id}
                className={`p-4 rounded-lg border-2 ${getStatusColor(book.status)} bg-card`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">
                            PLE {book.id} - {book.name}
                          </h4>
                          {getStatusBadge(book.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {book.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground ml-8">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {book.ultimaActualizacion}
                      </span>
                      <span>{book.registros} registros</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExportPLE(book.id)}
                      disabled={exportingPLE || book.status === "PENDIENTE"}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar TXT
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/dashboard/accounting/${book.id.includes('5.1') ? 'journals' : book.id.includes('5.3') ? 'reports/ledger' : book.id.includes('8.1') ? 'entries' : book.id.includes('14.1') ? '../sales' : 'chart'}`}>
                        Ver detalles
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Help */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">¿Cómo envío los archivos a SUNAT?</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>
                  Haz clic en "Descargar TXT" en el libro que necesites
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>
                  Ve a <a href="https://www.sunat.gob.pe" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.sunat.gob.pe</a> → SOL → Declaraciones
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>
                  Busca "PLE - Programa de Libros Electrónicos"
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  4
                </span>
                <span>
                  Sube el archivo TXT descargado
                </span>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recordatorios Importantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">
                    Plazo de entrega
                  </p>
                  <p className="text-yellow-800 dark:text-yellow-200 mt-1">
                    Los libros electrónicos deben enviarse antes del día 15 del mes siguiente al periodo declarado.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Generación automática
                  </p>
                  <p className="text-green-800 dark:text-green-200 mt-1">
                    Los archivos se generan automáticamente desde tus ventas y compras registradas.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Access to Technical Modules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Módulos técnicos de contabilidad</CardTitle>
          <CardDescription>Para contadores y usuarios avanzados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button variant="outline" asChild>
              <Link href="/dashboard/accounting/chart">Plan de Cuentas</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/accounting/entries">Asientos Contables</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/accounting/journals">Libro Diario</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
