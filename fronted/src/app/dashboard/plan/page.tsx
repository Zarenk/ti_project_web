"use client"

import type { JSX } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const COMPANY_MANAGER = "Milagros Chipoco"
const ACCOUNT_LEVEL = "Premium"
const COMPANY_NAME = "ECOTERRA"

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)
}

export default function PlanPage(): JSX.Element {
  const today = new Date()
  const expiryDate = new Date(today)
  expiryDate.setMonth(expiryDate.getMonth() + 1)

  return (
    <div className="container mx-auto max-w-3xl space-y-8 py-10">
      <header className="space-y-2">
        <Badge className="rounded-full bg-sky-600 px-4 py-1 text-sm font-semibold uppercase tracking-wide">
          Detalles del plan
        </Badge>
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Mi plan</h1>
          <p className="text-muted-foreground">
            Revisa tu suscripcion actual y la informacion comercial asignada a tu empresa.
          </p>
        </div>
      </header>

      <Card className="border-2">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl">Resumen de la suscripcion</CardTitle>
          <CardDescription>
            Datos visibles unicamente para el administrador. Contacta a soporte si necesitas realizar ajustes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company-admin">Administrador de la empresa</Label>
            <Input id="company-admin" value={COMPANY_MANAGER} readOnly className="font-medium" />
          </div>
          <div className="space-y-2">
            <Label>Nivel de cuenta</Label>
            <div className="flex items-center gap-2">
              <Input value={ACCOUNT_LEVEL.toUpperCase()} readOnly className="font-semibold uppercase" />
              <Badge variant="outline" className="border-sky-500 text-sky-600">
                Activa
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-name">Empresa asociada</Label>
            <Input id="company-name" value={COMPANY_NAME} readOnly className="font-medium" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="renewal-date">Vigencia hasta</Label>
            <Input id="renewal-date" value={formatDate(expiryDate)} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="activation-date">Ultima renovacion</Label>
            <Input id="activation-date" value={formatDate(today)} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-contact">Contacto asignado</Label>
            <Input id="support-contact" value="Equipo Comercial TI" readOnly />
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Esta informacion es referencial y puede actualizarse mediante el equipo de soporte comercial.
          </div>
          <Button variant="outline" className="rounded-full">
            Solicitar actualizacion
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}