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
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

import {
  assignOrganizationSuperAdmin,
  getOrganization,
  searchUsers,
  type OrganizationResponse,
  type UserSummary,
} from "../tenancy.api"

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })

export default function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const { id } = usePromise(params)
  const organizationId = Number(id)

  const [organization, setOrganization] = useState<OrganizationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<UserSummary[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [assigningUserId, setAssigningUserId] = useState<number | null>(null)

  const latestQueryRef = useRef(0)

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

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
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

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
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
      ) : organization ? (
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
                      {organization.code ?? "Ã¢â‚¬â€"}
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
                              {assigningUserId === user.id ? "AsignandoÃ¢â‚¬Â¦" : isCurrent ? "Asignado" : "Asignar"}
                            </Button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      ) : null}
    </div>
  )
}