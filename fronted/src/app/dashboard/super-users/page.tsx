"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { isTokenValid, getUserDataFromToken } from "@/lib/auth"
import { createManagedUser } from "./super-users.api"
import { listOrganizations, type OrganizationResponse } from "../tenancy/tenancy.api"
import { useTenantSelection } from "@/context/tenant-selection-context"

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Administrador" },
  { value: "SUPER_ADMIN_ORG", label: "Super Admin de organizacion" },
] as const

export default function SuperUsersAdminPage() {
  const router = useRouter()
  const { version } = useTenantSelection()
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<typeof ROLE_OPTIONS[number]["value"]>("ADMIN")
  const [organizationId, setOrganizationId] = useState("")
  const [organizations, setOrganizations] = useState<OrganizationResponse[]>([])
  const [organizationsLoading, setOrganizationsLoading] = useState(false)
  const [status, setStatus] = useState("ACTIVO")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (role !== "SUPER_ADMIN_ORG") {
      if (organizationId !== "") {
        setOrganizationId("")
      }
      return
    }

    if (organizationId.trim().length === 0 && organizations.length === 1) {
      setOrganizationId(String(organizations[0].id))
    }
  }, [role, organizations, organizationId])

  useEffect(() => {
    setEmail("")
    setUsername("")
    setPassword("")
    setRole("ADMIN")
    setStatus("ACTIVO")
    setOrganizationId("")
    setSubmitting(false)
  }, [version])

  useEffect(() => {
    let cancelled = false

    async function checkAccess() {
      if (!cancelled) {
        setOrganizations([])
        setOrganizationsLoading(true)
      }

      const session = await getUserDataFromToken()
      if (!session || !(await isTokenValid())) {
        router.replace("/login?returnTo=/dashboard/super-users")
        return
      }

      if (session.role !== "SUPER_ADMIN_GLOBAL") {
        router.replace("/unauthorized")
        return
      }

      try {
        const list = await listOrganizations()
        if (!cancelled) {
          setOrganizations(list)
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error cargando organizaciones", error)
          toast.error("No se pudieron cargar las organizaciones disponibles.")
          setOrganizations([])
        }
      } finally {
        if (!cancelled) {
          setOrganizationsLoading(false)
        }
      }
    }

    void checkAccess()

    return () => {
      cancelled = true
    }
  }, [router, version])

  const requiresOrganizationSelection = role === "SUPER_ADMIN_ORG"
  const normalizedOrganizationId = organizationId.trim()
  const organizationSelectValue =
    normalizedOrganizationId.length > 0
      ? normalizedOrganizationId
      : requiresOrganizationSelection
        ? ""
        : "none"

  const canSubmit = useMemo(() => {
    const basicValid = email.trim().length > 0 && password.trim().length >= 8
    const organizationValid =
      !requiresOrganizationSelection || normalizedOrganizationId.length > 0
    return basicValid && organizationValid
  }, [email, password, normalizedOrganizationId, requiresOrganizationSelection])

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    if (!canSubmit || submitting) {
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        email: email.trim(),
        username: username.trim() || undefined,
        password,
        role,
        status: status.trim() || undefined,
        organizationId: normalizedOrganizationId.length > 0
          ? Number.parseInt(normalizedOrganizationId, 10)
          : undefined,
      }

      if (payload.organizationId !== undefined && Number.isNaN(payload.organizationId)) {
        toast.error("El identificador de organizacion debe ser numerico")
        setSubmitting(false)
        return
      }

      if (requiresOrganizationSelection && payload.organizationId == null) {
        toast.error("Selecciona una organizacion para este usuario")
        setSubmitting(false)
        return
      }

      await createManagedUser(payload)
      toast.success("Usuario creado correctamente")
      setEmail("")
      setUsername("")
      setPassword("")
      setOrganizationId("")
      setRole("ADMIN")
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el usuario"
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Card className="border-sky-100 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Crear usuario privilegiado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Los super administradores globales pueden crear usuarios con rol <strong>ADMIN</strong> o
            <strong> SUPER_ADMIN_ORG</strong>. Luego, desde la vista de detalle de la organizacion,
            asigna a estos usuarios como super admin unico para el tenant correspondiente.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="email">Correo electronico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="usuario@empresa.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Nombre de usuario (opcional)</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="usuario"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimo 8 caracteres"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select value={role} onValueChange={(value) => setRole(value as typeof role)}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizationId">
                  {requiresOrganizationSelection ? "Organizacion" : "Organizacion (opcional)"}
                </Label>
                <Select
                  value={organizationSelectValue === "" ? undefined : organizationSelectValue}
                  onValueChange={(value) => setOrganizationId(value === "none" ? "" : value)}
                  disabled={organizationsLoading || (requiresOrganizationSelection && organizations.length === 0)}
                >
                  <SelectTrigger id="organizationId">
                    <SelectValue
                      placeholder={
                        organizationsLoading
                          ? "Cargando organizaciones..."
                          : organizations.length === 0
                            ? "No hay organizaciones disponibles"
                            : "Selecciona una organizacion"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {!requiresOrganizationSelection ? (
                      <SelectItem value="none">Sin organizacion</SelectItem>
                    ) : null}
                    {organizations.length === 0 ? (
                      <SelectItem value="__empty" disabled>
                        No hay organizaciones
                      </SelectItem>
                    ) : (
                      organizations.map((org) => (
                        <SelectItem key={org.id} value={String(org.id)}>
                          {org.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {requiresOrganizationSelection && !organizationsLoading && organizations.length === 0 ? (
                  <p className="text-xs text-red-600">Crea una organizacion antes de asignarla.</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado (opcional)</Label>
                <Input
                  id="status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  placeholder="ACTIVO"
                />
              </div>
            </div>
            <CardFooter className="px-0 pt-4">
              <Button type="submit" disabled={!canSubmit || submitting} className="w-full sm:w-auto">
                {submitting ? "Creando usuario..." : "Crear usuario"}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
