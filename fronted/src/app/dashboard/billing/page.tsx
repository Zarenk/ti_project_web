"use client"

import type { JSX } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface BillingRecord {
  id: string
  concept: string
  amount: number
  issuedAt: Date
  status: "Cancelado"
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value)
}

function buildSampleBilling(): BillingRecord[] {
  const today = new Date()
  return [0, 10, 20, 27].map((offset, index) => {
    const issuedAt = new Date(today)
    issuedAt.setDate(issuedAt.getDate() + offset)
    return {
      id: `REC-${2025 + index}`,
      concept: index % 2 === 0 ? "Renovacion de plan Premium" : "Modulo adicional de soporte",
      amount: index % 2 === 0 ? 100 : 100,
      issuedAt,
      status: "Cancelado" as const,
    }
  })
}

export default function BillingPage(): JSX.Element {
  const records = buildSampleBilling()
  const nextRenewal = records[records.length - 1]?.issuedAt ?? new Date()

  return (
    <div className="container mx-auto max-w-5xl space-y-10 py-10">
      <header className="space-y-2">
        <Badge className="rounded-full bg-amber-500 px-4 py-1 text-sm font-semibold uppercase tracking-wide text-white">
          Facturacion
        </Badge>
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Historial de pagos</h1>
          <p className="text-muted-foreground">
            Visualiza los comprobantes emitidos recientemente. Esta vista es solo referencial hasta integrar el backend.
          </p>
        </div>
      </header>

      <Card className="border-2">
        <CardHeader className="space-y-3">
          <CardTitle>Resumen de facturacion</CardTitle>
          <CardDescription>
            Todos los montos se muestran en soles (PEN). Contacta a soporte si detectas alguna diferencia en tus recibos.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="billing-plan">Plan activo</Label>
            <Input id="billing-plan" value="Premium" readOnly className="font-medium" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-company">Empresa facturada</Label>
            <Input id="billing-company" value="ECOTERRA" readOnly className="font-medium" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-manager">Responsable comercial</Label>
            <Input id="billing-manager" value="Milagros Chipoco" readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-next">Proxima renovacion estimada</Label>
            <Input id="billing-next" value={formatDate(nextRenewal)} readOnly />
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Una vez habilitada la pasarela de pagos, podros descargar recibos oficiales y solicitar notas de credito en linea.
          </p>
          <Button variant="outline" className="rounded-full">
            Exportar historial
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Pagos recientes</CardTitle>
          <CardDescription>Tabla resumida de los pagos confirmados en el ultimo mes.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Comprobante</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead className="w-32">Fecha</TableHead>
                <TableHead className="w-28 text-right">Importe</TableHead>
                <TableHead className="w-32">Estado</TableHead>
                <TableHead className="w-28 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.id}</TableCell>
                  <TableCell>{record.concept}</TableCell>
                  <TableCell>{formatDate(record.issuedAt)}</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-600">
                    {formatCurrency(record.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-100 text-emerald-700">{record.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-sky-600">
                      Descargar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}