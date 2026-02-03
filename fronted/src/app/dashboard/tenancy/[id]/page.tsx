"use client"

import { use as usePromise, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Layers,
  Loader2,
  Search,
  ShieldCheck,
  UsersRound,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/progress"

import {
  assignOrganizationSuperAdmin,
  getOrganization,
  searchUsers,
  type OrganizationResponse,
  type UserSummary,
} from "../tenancy.api"
import { fetchSubscriptionSummary } from "@/lib/subscription-summary"
import type { SubscriptionSummary } from "@/types/subscription"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { TENANT_SELECTION_EVENT, type TenantSelectionChangeDetail } from "@/utils/tenant-preferences"

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })

const getSubscriptionStatusColor = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
    case "TRIAL":
      return "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300"
    case "PAST_DUE":
      return "border-amber-600 text-amber-700 dark:border-amber-400 dark:text-amber-300"
    case "CANCELED":
      return "border-rose-600 text-rose-700 dark:border-rose-400 dark:text-rose-300"
    default:
      return "border-slate-600 text-slate-700 dark:border-slate-400 dark:text-slate-300"
  }
}

const getSubscriptionStatusLabel = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "Activa"
    case "TRIAL":
      return "Periodo de prueba"
    case "PAST_DUE":
      return "Vencida"
    case "CANCELED":
      return "Cancelada"
    default:
      return status
  }
}

const getSubscriptionStatusIcon = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
    case "TRIAL":
      return <Clock className="size-5 text-blue-600 dark:text-blue-400" />
    case "PAST_DUE":
      return <AlertCircle className="size-5 text-amber-600 dark:text-amber-400" />
    case "CANCELED":
      return <AlertCircle className="size-5 text-rose-600 dark:text-rose-400" />
    default:
      return <CreditCard className="size-5 text-slate-600 dark:text-slate-400" />
  }
}

export default function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const { selection } = useTenantSelection()
  const { id } = usePromise(params)
  const organizationId = Number(id)
  const [manualSelectionOrgId, setManualSelectionOrgId] = useState<number | null>(null)
  const isRedirecting =
    Number.isFinite(organizationId) &&
    manualSelectionOrgId != null &&
    selection.orgId === manualSelectionOrgId &&
    selection.orgId !== organizationId

  const [organization, setOrganization] = useState<OrganizationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<UserSummary[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [assigningUserId, setAssigningUserId] = useState<number | null>(null)

  const latestQueryRef = useRef(0)
  const didMountRef = useRef(false)
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<TenantSelectionChangeDetail>).detail
      if (detail?.source !== "manual") {
        return
      }
      const nextOrgId = detail.orgId ?? null
      setManualSelectionOrgId(nextOrgId)
      if (nextOrgId != null && nextOrgId !== organizationId) {
        router.replace(`/dashboard/tenancy/${nextOrgId}`)
      }
    }
    window.addEventListener(TENANT_SELECTION_EVENT, handler as EventListener)
    return () => window.removeEventListener(TENANT_SELECTION_EVENT, handler as EventListener)
  }, [organizationId, router])

  useEffect(() => {
    if (!Number.isFinite(organizationId)) {
      return
    }
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    if (selection.orgId != null && selection.orgId === organizationId) {
      setManualSelectionOrgId(null)
      return
    }
    if (
      manualSelectionOrgId != null &&
      selection.orgId === manualSelectionOrgId &&
      selection.orgId !== organizationId
    ) {
      router.replace(`/dashboard/tenancy/${selection.orgId}`)
    }
  }, [organizationId, selection.orgId, manualSelectionOrgId, router])

  const loadOrganization = useCallback(async () => {
    if (!Number.isFinite(organizationId)) {
      setError("Identificador de organizacion invalido")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await getOrganization(organizationId)
      setOrganization(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cargar la organizacion"
      setError(message)
      setOrganization(null)
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void loadOrganization()
  }, [loadOrganization])

  const loadSubscription = useCallback(async () => {
    if (!Number.isFinite(organizationId)) {
      setSubscriptionError("Identificador de organizacion invalido")
      setSubscriptionLoading(false)
      return
    }

    setSubscriptionLoading(true)
    setSubscriptionError(null)

    try {
      const data = await fetchSubscriptionSummary(organizationId)
      setSubscription(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cargar la suscripcion"
      setSubscriptionError(message)
      setSubscription(null)
    } finally {
      setSubscriptionLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void loadSubscription()
  }, [loadSubscription])

  useEffect(() => {
    const trimmed = searchTerm.trim()

    if (trimmed.length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    const currentQuery = ++latestQueryRef.current

    const handle = setTimeout(() => {
      void searchUsers(trimmed)
        .then((users) => {
          if (latestQueryRef.current === currentQuery) {
            setSearchResults(users)
          }
        })
        .catch(() => {
          if (latestQueryRef.current === currentQuery) {
            setSearchResults([])
            toast.error("No se pudo realizar la busqueda de usuarios")
          }
        })
        .finally(() => {
          if (latestQueryRef.current === currentQuery) {
            setSearchLoading(false)
          }
        })
    }, 400)

    return () => clearTimeout(handle)
  }, [searchTerm])

  const handleAssign = useCallback(
    async (userId: number) => {
      if (!Number.isFinite(organizationId)) {
        toast.error("Identificador de organizacion invalido")
        return
      }

      setAssigningUserId(userId)
      try {
        const updated = await assignOrganizationSuperAdmin(organizationId, userId)
        setOrganization(updated)
        setSearchTerm("")
        setSearchResults([])
        toast.success("Super admin asignado correctamente")
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudo asignar el super admin"
        toast.error(message)
      } finally {
        setAssigningUserId(null)
      }
    },
    [organizationId],
  )

  const superAdminLabel = useMemo(() => {
    if (!organization?.superAdmin) {
      return "Sin super admin asignado"
    }
    return `${organization.superAdmin.username} (${organization.superAdmin.email})`
  }, [organization?.superAdmin])

  const subscriptionExpiredAt = useMemo(() => {
    if (!subscription) {
      return null
    }
    return (
      subscription.billing.currentPeriodEnd ??
      subscription.trial.endsAt ??
      null
    )
  }, [subscription])

  const subscriptionPeriodLabel = useMemo(() => {
    if (!subscription) {
      return null
    }
    const { status } = subscription.plan
    if (status === "TRIAL") {
      const endsAt = subscription.trial.endsAt ?? subscription.billing.currentPeriodEnd
      return endsAt ? `Finaliza: ${formatDate(endsAt)}` : null
    }
    if (status === "ACTIVE") {
      const endsAt = subscription.billing.currentPeriodEnd
      return endsAt ? `Renueva: ${formatDate(endsAt)}` : null
    }
    return null
  }, [subscription])

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {isRedirecting ? (
        <Card className="border-dashed border-slate-200 dark:border-slate-700/60">
          <CardContent className="flex items-center gap-3 py-6 text-sm text-slate-600 dark:text-slate-300">
            <Loader2 className="size-4 animate-spin" />
            Actualizando organizacion seleccionada...
          </CardContent>
        </Card>
      ) : (
      <div className="mb-6 flex items-center gap-2">
        <Button
          variant="ghost"
          className="gap-2 px-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-4" /> Volver
        </Button>
        <span className="text-sm text-slate-400">/</span>
        <Link href="/dashboard/tenancy" className="text-sm text-slate-600 hover:underline">
          Organizaciones
        </Link>
      </div>
      )}

      {!isRedirecting && loading ? (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !isRedirecting && error ? (
        <Card className="border-dashed border-rose-200 dark:border-rose-700/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-300">
              <ShieldCheck className="size-5" />
              No se pudo cargar la organizacion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-slate-600 dark:text-slate-300">{error}</p>
            <Button onClick={() => void loadOrganization()} className="gap-2">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : !isRedirecting && organization ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-slate-900 dark:text-slate-100">
                  <Building2 className="size-5 text-sky-600 dark:text-slate-100" />
                  {organization.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Codigo
                    </p>
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      {organization.code ?? "Sin Codigo"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Estado
                    </p>
                    <Badge
                      variant="outline"
                      className={
                        organization.status === "ACTIVE"
                          ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
                          : "border-amber-600 text-amber-700 dark:border-amber-400 dark:text-amber-300"
                      }
                    >
                      {organization.status === "ACTIVE" ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Creada
                    </p>
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      {formatDate(organization.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Actualizada
                    </p>
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      {formatDate(organization.updatedAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Usuarios asociados
                    </p>
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      {organization.membershipCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Super admin actual
                    </p>
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      {superAdminLabel}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
                  <Layers className="size-5 text-sky-600 dark:text-slate-100" />
                  Unidades organizativas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                {organization.units.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    La organizacion aun no tiene unidades registradas.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {organization.units.map((unit) => (
                      <li
                        key={unit.id}
                        className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-100">{unit.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Codigo: {unit.code ?? "Sin Codigo"}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              unit.status === "ACTIVE"
                                ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
                                : "border-amber-600 text-amber-700 dark:border-amber-400 dark:text-amber-300"
                            }
                          >
                            {unit.status === "ACTIVE" ? "Activa" : "Inactiva"}
                          </Badge>
                        </div>
                        {unit.parentUnitId ? (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Depende de la unidad ID {unit.parentUnitId}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
                  <ShieldCheck className="size-5 text-sky-600 dark:text-slate-100" />
                  Asignar super admin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="user-search" className="text-xs text-slate-500 dark:text-slate-400">
                    Buscar usuario por nombre o correo
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      id="user-search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Ingresa al menos 2 caracteres"
                      className="flex-1"
                    />
                    <Search className="size-4 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-3">
                  {searchLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
                      <Loader2 className="size-4 animate-spin" /> Buscando usuarios administradores
                    </div>
                  ) : searchResults.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Escribe al menos dos caracteres para iniciar la busqueda.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {searchResults.map((user) => {
                        const isCurrent = organization.superAdmin?.id === user.id

                        return (
                          <li
                            key={user.id}
                            className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700"
                          >
                            <div>
                              <p className="font-medium text-slate-800 dark:text-slate-100">
                                {user.username}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                            </div>
                            <Button
                              size="sm"
                              variant={isCurrent ? "outline" : "default"}
                              disabled={isCurrent || assigningUserId === user.id}
                              onClick={() => handleAssign(user.id)}
                            >
                              {assigningUserId === user.id ? "Asignando Usuario" : isCurrent ? "Asignado" : "Asignar"}
                            </Button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>

            {subscriptionLoading ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
                    <CreditCard className="size-5 text-sky-600 dark:text-slate-100" />
                    Suscripción
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ) : subscriptionError ? (
              <Card className="border-dashed border-rose-200 dark:border-rose-700/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-300">
                    <AlertCircle className="size-5" />
                    Suscripción
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-slate-600 dark:text-slate-300">{subscriptionError}</p>
                  <Button size="sm" onClick={() => void loadSubscription()}>
                    Reintentar
                  </Button>
                </CardContent>
              </Card>
            ) : subscription ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
                    <CreditCard className="size-5 text-sky-600 dark:text-slate-100" />
                    Suscripción
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Plan Status */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Plan actual
                      </p>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={`flex items-center gap-2 ${getSubscriptionStatusColor(
                            subscription.plan.status,
                          )}`}
                        >
                          {getSubscriptionStatusIcon(subscription.plan.status)}
                          {getSubscriptionStatusLabel(subscription.plan.status)}
                        </Badge>
                        {subscription.plan.status === "PAST_DUE" && subscriptionExpiredAt ? (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Venció: {formatDate(subscriptionExpiredAt)}
                          </p>
                        ) : subscriptionPeriodLabel ? (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {subscriptionPeriodLabel}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      {subscription.plan.name}
                    </p>
                    {subscription.plan.price && (
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {subscription.plan.currency} {subscription.plan.price} /{" "}
                        {subscription.plan.interval === "MONTHLY" ? "mes" : "año"}
                      </p>
                    )}
                    <div className="pt-3">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/dashboard/account/plan?orgId=${organizationId}&focus=plan#plan-selection`}>
                          Actualizar suscripcion
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Trial Information */}
                  {subscription.trial.isTrial && (
                    <>
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Periodo de prueba
                        </p>
                        <div className="flex items-center gap-2">
                          <Clock className="size-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                            {subscription.trial.daysLeft !== null && subscription.trial.daysLeft > 0
                              ? `${subscription.trial.daysLeft} días restantes`
                              : "Prueba finalizada"}
                          </span>
                        </div>
                        {subscription.trial.endsAt && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Finaliza: {formatDate(subscription.trial.endsAt)}
                          </p>
                        )}
                      </div>

                      <Separator />
                    </>
                  )}

                  {/* Billing Period */}
                  {subscription.billing.currentPeriodStart && subscription.billing.currentPeriodEnd && (
                    <>
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Período de facturación
                        </p>
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          <p>
                            Desde: <span className="font-medium">{formatDate(subscription.billing.currentPeriodStart)}</span>
                          </p>
                          <p>
                            Hasta: <span className="font-medium">{formatDate(subscription.billing.currentPeriodEnd)}</span>
                          </p>
                        </div>
                      </div>

                      <Separator />
                    </>
                  )}

                  {/* Quotas */}
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Uso de recursos
                    </p>

                    {/* Users Quota */}
                    {subscription.quotas.users !== null && (
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm text-slate-700 dark:text-slate-200">
                            Usuarios
                          </span>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {subscription.usage.users} / {subscription.quotas.users}
                          </span>
                        </div>
                        <Progress
                          value={(subscription.usage.users / subscription.quotas.users) * 100}
                          className="h-2"
                        />
                      </div>
                    )}

                    {/* Invoices Quota */}
                    {subscription.quotas.invoices !== null && (
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm text-slate-700 dark:text-slate-200">
                            Facturas
                          </span>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {subscription.usage.invoices} / {subscription.quotas.invoices}
                          </span>
                        </div>
                        <Progress
                          value={(subscription.usage.invoices / subscription.quotas.invoices) * 100}
                          className="h-2"
                        />
                      </div>
                    )}

                    {/* Storage Quota */}
                    {subscription.quotas.storageMB !== null && (
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm text-slate-700 dark:text-slate-200">
                            Almacenamiento
                          </span>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {(subscription.usage.storageMB / 1024).toFixed(2)} GB /{" "}
                            {(subscription.quotas.storageMB / 1024).toFixed(2)} GB
                          </span>
                        </div>
                        <Progress
                          value={(subscription.usage.storageMB / subscription.quotas.storageMB) * 100}
                          className="h-2"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  )
}
