"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useTenantSelection } from "@/context/tenant-selection-context"

import { PaymentMethodCard } from "./payment-methods-card"
import { PaymentMethodModal } from "./payment-method-modal"
import { fetchPaymentMethods, markPaymentMethodAsDefault, removePaymentMethod, type BillingPaymentMethod } from "../billing.api"
import { useAccountAccessGuard } from "../use-account-access"

export default function PaymentMethodsPage() {
  const accessReady = useAccountAccessGuard()
  const { selection } = useTenantSelection()
  const organizationId = selection?.orgId ?? null

  const [methods, setMethods] = useState<BillingPaymentMethod[]>([])
  const [loading, setLoading] = useState(false)
  const [managerOpen, setManagerOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<BillingPaymentMethod | null>(null)

  const refresh = useCallback(() => {
    if (!organizationId) {
      setMethods([])
      return
    }
    setLoading(true)
    fetchPaymentMethods(organizationId)
      .then(setMethods)
      .catch((error) => {
        console.error(error)
        toast.error(error instanceof Error ? error.message : "No pudimos cargar los metodos de pago")
      })
      .finally(() => setLoading(false))
  }, [organizationId])

  useEffect(() => {
    if (!accessReady) return
    refresh()
  }, [accessReady, refresh])

  const sorted = useMemo(() => {
    return methods.slice().sort((a, b) => (a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1))
  }, [methods])

  const handleDefault = async (method: BillingPaymentMethod) => {
    if (!organizationId) return
    try {
      await markPaymentMethodAsDefault(organizationId, method.id)
      toast.success("Metodo definido como predeterminado")
      refresh()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el metodo")
    }
  }

  const handleRemove = async (method: BillingPaymentMethod) => {
    if (!organizationId) return
    try {
      await removePaymentMethod(organizationId, method.id)
      toast.success("Metodo eliminado")
      refresh()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el metodo")
    }
  }

  if (!accessReady) {
    return <PaymentMethodsSkeleton />
  }

  if (!organizationId) {
    return (
      <div className="min-h-[100svh] w-full bg-gradient-to-b from-sky-50 via-cyan-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <header className="w-full border-b bg-gradient-to-r from-white via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:border-slate-700">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between md:py-8">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Configuracion de cuenta</p>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Metodos de pago</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Selecciona una organizacion desde el selector superior para administrar tus tarjetas o cuentas bancarias.
              </p>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-12 text-slate-600 dark:text-slate-300">
          Esta seccion requiere que elijas una organizacion en el conmutador de equipos.
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-[100svh] w-full bg-gradient-to-b from-sky-50 via-cyan-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <header className="w-full border-b bg-gradient-to-r from-white via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:border-slate-700">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between md:py-8">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Configuracion de cuenta</p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Metodos de pago</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Administra las tarjetas guardadas y define cual se usara por defecto para los cobros.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/dashboard/account/billing">Ver facturacion</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/account/plan">Consumo del plan</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex justify-end">
          <Dialog
            open={managerOpen}
            onOpenChange={(open) => {
              setManagerOpen(open)
              if (!open) setSelectedMethod(null)
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedMethod(null)}>Agregar nuevo metodo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedMethod ? "Editar metodo" : "Agregar metodo de pago"}</DialogTitle>
                <DialogDescription>
                  Completa los campos para registrar tu tarjeta o cuenta. Tambien puedes sincronizarla desde el PSP si ya existe.
                </DialogDescription>
              </DialogHeader>
              <PaymentMethodModal
                key={selectedMethod?.id ?? "new"}
                organizationId={organizationId}
                method={selectedMethod}
                onSuccess={() => {
                  setManagerOpen(false)
                  setSelectedMethod(null)
                  refresh()
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <PaymentMethodsSkeleton />
        ) : sorted.length === 0 ? (
          <Card className="border-sky-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-100">Aun no registras metodos</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-300">
              Agrega una tarjeta o sincroniza el metodo usado en MercadoPago para habilitar cobros automaticos.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sorted.map((method) => (
              <PaymentMethodCard
                key={method.id}
                method={method}
                onMarkDefault={() => handleDefault(method)}
                onDelete={() => handleRemove(method)}
                onEdit={() => {
                  setSelectedMethod(method)
                  setManagerOpen(true)
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function PaymentMethodsSkeleton() {
  return (
    <div className="max-w-5xl space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={`method-skeleton-${index}`} className="h-32 w-full rounded-xl" />
      ))}
    </div>
  )
}
