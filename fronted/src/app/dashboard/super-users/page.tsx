"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, Check } from "lucide-react"

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
  const [showErrors, setShowErrors] = useState(false)

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
    setShowErrors(false)
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

  const emailValid =
    email.trim().length > 0 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())
  const usernameValid = username.trim().length >= 3
  const passwordValid = password.trim().length >= 8
  const roleValid = Boolean(role)
  const organizationValid =
    !requiresOrganizationSelection || normalizedOrganizationId.length > 0

  const canSubmit = useMemo(() => {
    return (
      emailValid &&
      usernameValid &&
      passwordValid &&
      roleValid &&
      organizationValid
    )
  }, [emailValid, usernameValid, passwordValid, roleValid, organizationValid])

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    if (!canSubmit || submitting) {
      setShowErrors(true)
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        email: email.trim(),
        username: username.trim(),
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

  const renderRequiredChip = (filled: boolean) => (
    <span
      className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        filled
          ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
          : "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
      }`}
    >
      {filled ? <Check className="mr-1 h-3 w-3" /> : null}
      {filled ? "Listo" : "Requerido"}
    </span>
  )

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10">
      <Card className="border-slate-200/70 bg-slate-50/40 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Crear usuario privilegiado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Los super administradores globales pueden crear usuarios con rol <strong>ADMIN</strong> o
            <strong> SUPER_ADMIN_ORG</strong>. Luego, desde la vista de detalle de la organizacion,
            asigna a estos usuarios como super admin unico para el tenant correspondiente.
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="email" className="flex items-center">
                  Correo electronico
                  {renderRequiredChip(emailValid)}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="usuario@empresa.com"
                  required
                />
                {showErrors && !emailValid ? (
                  <p className="inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Ingresa un correo valido.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center">
                  Nombre de usuario
                  {renderRequiredChip(usernameValid)}
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="usuario"
                  required
                />
                {showErrors && !usernameValid ? (
                  <p className="inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    El nombre de usuario debe tener al menos 3 caracteres.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center">
                  Contrasena
                  {renderRequiredChip(passwordValid)}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimo 8 caracteres"
                  required
                />
                {showErrors && !passwordValid ? (
                  <p className="inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    La contrasena debe tener al menos 8 caracteres.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center">
                  Rol
                  {renderRequiredChip(roleValid)}
                </Label>
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
                <Label htmlFor="organizationId" className="flex items-center">
                  {requiresOrganizationSelection ? "Organizacion" : "Organizacion (opcional)"}
                  {requiresOrganizationSelection
                    ? renderRequiredChip(organizationValid)
                    : null}
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
                {requiresOrganizationSelection && showErrors && !organizationValid ? (
                  <p className="inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Selecciona una organizacion.
                  </p>
                ) : requiresOrganizationSelection && !organizationsLoading && organizations.length === 0 ? (
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
              <Button
                type="submit"
                disabled={!canSubmit || submitting}
                className="w-full cursor-pointer bg-emerald-600 text-white transition-colors hover:bg-emerald-700 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-70 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-600 sm:w-auto"
              >
                {submitting ? "Creando usuario..." : "Crear usuario"}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
