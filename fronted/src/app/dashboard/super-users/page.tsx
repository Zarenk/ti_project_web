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

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Administrador" },
  { value: "SUPER_ADMIN_ORG", label: "Super Admin de organizacion" },
] as const

export default function SuperUsersAdminPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<typeof ROLE_OPTIONS[number]["value"]>("ADMIN")
  const [organizationId, setOrganizationId] = useState("")
  const [status, setStatus] = useState("ACTIVO")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function checkAccess() {
      const session = await getUserDataFromToken()
      if (!session || !(await isTokenValid())) {
        router.replace("/login?returnTo=/dashboard/super-users")
        return
      }
      if (session.role !== "SUPER_ADMIN_GLOBAL") {
        router.replace("/unauthorized")
      }
    }
    void checkAccess()
  }, [router])

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.trim().length >= 8
  }, [email, password])

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
        organizationId: organizationId.trim()
          ? Number.parseInt(organizationId.trim(), 10)
          : undefined,
      }

      if (payload.organizationId !== undefined && Number.isNaN(payload.organizationId)) {
        toast.error("El identificador de organizacion debe ser numerico")
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
                <Label htmlFor="password">Contrasena</Label>
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
                <Label htmlFor="organizationId">Organizacion (opcional)</Label>
                <Input
                  id="organizationId"
                  value={organizationId}
                  onChange={(event) => setOrganizationId(event.target.value)}
                  placeholder="ID numerico"
                />
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
