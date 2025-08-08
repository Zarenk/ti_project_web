"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mail, Phone, Shield, CalendarClock, LogIn, CheckCircle2, UserRound } from 'lucide-react'
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getLastAccessFromToken } from "@/lib/auth"
import { getProfile, updateProfile, changePassword } from "./account.api"

export default function Page() {
  const [user, setUser] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    rol: "",
    tipoUsuario: "Interno",
    estado: "Activo",
    creadoEl: "",
    ultimoInicio: "",
  })

  const [formDatos, setFormDatos] = useState({
    nombre: "",
    correo: "",
    telefono: "",
  })

  const [formPass, setFormPass] = useState({
    actual: "",
    nueva: "",
    confirmar: "",
  })
  const [savingDatos, setSavingDatos] = useState(false)
  const [savingPass, setSavingPass] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getProfile()
        const last = getLastAccessFromToken()
        setUser({
          nombre: data.username,
          correo: data.email,
          telefono: data.client?.phone || "",
          rol: data.role,
          tipoUsuario: "Interno",
          estado: "Activo",
          creadoEl: data.createdAt,
          ultimoInicio: last ? last.toLocaleString("es-ES") : "",
        })
        setFormDatos({
          nombre: data.username,
          correo: data.email,
          telefono: data.client?.phone || "",
        })
      } catch (error) {
        console.error(error)
        toast("Error: No se pudo cargar el perfil.")
      }
    }
    loadProfile()
  }, [])

  function handleDatosSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formDatos.nombre.trim()) {
      toast("Nombre requerido\nPor favor, introduce tu nombre completo.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formDatos.correo)) {
      toast("Correo inválido\nIntroduce un correo electrónico válido.")
      return
    }
    setSavingDatos(true)
    updateProfile({ username: formDatos.nombre.trim(), email: formDatos.correo.trim(), phone: formDatos.telefono.trim() })
      .then(() => {
        setUser((u) => ({
          ...u,
          nombre: formDatos.nombre.trim(),
          correo: formDatos.correo.trim(),
          telefono: formDatos.telefono.trim(),
        }))
        toast("Tus datos personales se han actualizado correctamente.")
      })
      .catch(() => toast("Error: No se pudieron guardar los cambios."))
      .finally(() => setSavingDatos(false))
  }

  function handlePassSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formPass.actual || !formPass.nueva || !formPass.confirmar) {
      toast("Campos incompletos. Completa todos los campos para actualizar la contraseña.")
      return
    }
    if (formPass.nueva.length < 8) {
      toast("Contraseña débil: La nueva contraseña debe tener al menos 8 caracteres.")
      return
    }
    if (formPass.nueva !== formPass.confirmar) {
      toast("No coincide: La confirmación de la contraseña no coincide.")
      return
    }
    if (formPass.nueva === formPass.actual) {
      toast("Sin cambios: La nueva contraseña no puede ser igual a la contraseña actual.")
      return
    }
    setSavingPass(true)
    changePassword(formPass.actual, formPass.nueva)
      .then(() => {
        setFormPass({ actual: "", nueva: "", confirmar: "" })
        toast("Tu contraseña se ha actualizado correctamente.")
      })
      .catch(() => toast("Error: No se pudo actualizar la contraseña."))
      .finally(() => setSavingPass(false))
  }

  const initials = user.nombre
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div className="min-h-[100svh] w-full bg-gradient-to-b from-sky-50 via-cyan-50 to-white">
      <header
        className={cn(
          "w-full border-b",
          "bg-gradient-to-r from-white via-sky-50 to-cyan-50",
          "supports-[backdrop-filter]:backdrop-blur-sm"
        )}
      >
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="size-14 border shadow-sm">
                <AvatarImage alt={`Foto de ${user.nombre}`} src="/placeholder.svg?height=112&width=112" />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="animate-in fade-in slide-in-from-left-1">
                <h1 className="text-xl font-semibold text-slate-800 md:text-2xl">{user.nombre}</h1>
                <div className="mt-1 flex items-center gap-2">
                  <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">{user.rol}</Badge>
                  <span className="text-xs text-slate-500">Tipo: {user.tipoUsuario}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="rounded-full border-sky-200 text-sky-700 hover:bg-sky-100 hover:text-sky-800"
              >
                Ver actividad
              </Button>
              <Button
                className="rounded-full bg-sky-600 text-white hover:bg-sky-700"
                onClick={() => handleDatosSubmit(new Event('submit') as unknown as React.FormEvent)}
              >
                Guardar todo
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-12 md:gap-8 md:py-10">
        {/* Columna principal */}
        <section className="md:col-span-8 space-y-6">
          {/* Información de la cuenta (lectura) */}
          <Card className="border-sky-100 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-slate-800">Información de la cuenta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="Nombre completo" value={user.nombre} icon={<UserRound className="size-4" />} />
                <InfoRow label="Correo electrónico" value={user.correo} icon={<Mail className="size-4" />} />
                {user.telefono && (
                  <InfoRow label="Número de teléfono" value={user.telefono} icon={<Phone className="size-4" />} />
                )}
                <InfoRow label="Rol" value={user.rol} icon={<Shield className="size-4" />} />
                <InfoRow
                  label="Fecha de creación"
                  value={user.creadoEl ? new Date(user.creadoEl).toLocaleDateString("es-ES", { dateStyle: "long" }) : ""}
                  icon={<CalendarClock className="size-4" />}
                />
                <InfoRow label="Estado" value={user.estado} icon={<CheckCircle2 className="size-4 text-emerald-500" />} />
              </div>
            </CardContent>
          </Card>

          {/* Formularios de edición */}
          <Card className="border-sky-100 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-slate-800">Editar perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Datos personales */}
              <section aria-labelledby="datos-personales">
                <div className="mb-3">
                  <h3 id="datos-personales" className="text-sm font-medium text-slate-700">
                    Datos personales
                  </h3>
                  <p className="text-xs text-slate-500">Actualiza tu nombre, correo y teléfono.</p>
                </div>
                <form onSubmit={handleDatosSubmit} className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input
                      id="nombre"
                      placeholder="Nombre completo"
                      value={formDatos.nombre}
                      onChange={(e) => setFormDatos((f) => ({ ...f, nombre: e.target.value }))}
                      className="bg-white focus-visible:ring-sky-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="correo">Correo electrónico</Label>
                    <Input
                      id="correo"
                      type="email"
                      placeholder="correo@empresa.com"
                      value={formDatos.correo}
                      onChange={(e) => setFormDatos((f) => ({ ...f, correo: e.target.value }))}
                      className="bg-white focus-visible:ring-sky-300"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="telefono">Número de teléfono</Label>
                    <Input
                      id="telefono"
                      placeholder="+34 600 000 000"
                      value={formDatos.telefono}
                      onChange={(e) => setFormDatos((f) => ({ ...f, telefono: e.target.value }))}
                      className="bg-white focus-visible:ring-sky-300"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <Button
                      type="submit"
                      disabled={savingDatos}
                      className="rounded-full bg-sky-600 text-white transition-shadow hover:bg-sky-700 hover:shadow-sm"
                    >
                      {savingDatos ? "Guardando..." : "Guardar cambios"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-full text-sky-700 hover:bg-sky-100"
                      onClick={() =>
                        setFormDatos({ nombre: user.nombre, correo: user.correo, telefono: user.telefono })
                      }
                    >
                      Deshacer
                    </Button>
                  </div>
                </form>
              </section>

              <Separator className="bg-sky-100" />

              {/* Contraseña */}
              <section aria-labelledby="seguridad">
                <div className="mb-3">
                  <h3 id="seguridad" className="text-sm font-medium text-slate-700">
                    Contraseña
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cambia tu contraseña. Asegúrate de usar una contraseña segura.
                  </p>
                </div>
                <form onSubmit={handlePassSubmit} className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="actual">Contraseña actual</Label>
                    <Input
                      id="actual"
                      type="password"
                      placeholder="Introduce tu contraseña actual"
                      value={formPass.actual}
                      onChange={(e) => setFormPass((f) => ({ ...f, actual: e.target.value }))}
                      className="bg-white focus-visible:ring-sky-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nueva">Nueva contraseña</Label>
                    <Input
                      id="nueva"
                      type="password"
                      placeholder="Nueva contraseña"
                      value={formPass.nueva}
                      onChange={(e) => setFormPass((f) => ({ ...f, nueva: e.target.value }))}
                      className="bg-white focus-visible:ring-sky-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmar">Confirmar contraseña</Label>
                    <Input
                      id="confirmar"
                      type="password"
                      placeholder="Repite la nueva contraseña"
                      value={formPass.confirmar}
                      onChange={(e) => setFormPass((f) => ({ ...f, confirmar: e.target.value }))}
                      className="bg-white focus-visible:ring-sky-300"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <Button
                      type="submit"
                      disabled={savingPass}
                      className="rounded-full bg-cyan-600 text-white transition-shadow hover:bg-cyan-700 hover:shadow-sm"
                    >
                      {savingPass ? "Actualizando..." : "Actualizar contraseña"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-full text-sky-700 hover:bg-sky-100"
                      onClick={() => setFormPass({ actual: "", nueva: "", confirmar: "" })}
                    >
                      Limpiar
                    </Button>
                  </div>
                </form>
              </section>
            </CardContent>
            <CardFooter className="text-xs text-slate-500">
              Los cambios se aplican únicamente a este usuario dentro del sistema interno.
            </CardFooter>
          </Card>
        </section>

        {/* Columna lateral: resumen */}
        <aside className="md:col-span-4 space-y-6">
          <Card className="border-sky-100 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-slate-800">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SummaryItem
                icon={<LogIn className="size-4 text-sky-600" />}
                label="Último inicio de sesión"
                value={user.ultimoInicio}
              />
              <SummaryItem
                icon={<CheckCircle2 className="size-4 text-emerald-600" />}
                label="Estado"
                value={user.estado}
              />
              <SummaryItem icon={<Shield className="size-4 text-cyan-600" />} label="Rol" value={user.rol} />
              <Separator className="bg-sky-100" />
              <div className="rounded-lg bg-sky-50/70 p-3 text-xs text-slate-600">
                Mantén tu información actualizada para garantizar una mejor experiencia en el intranet.
              </div>
            </CardContent>
          </Card>

          <Card className="border-sky-100 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-slate-800">Contacto rápido</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button variant="outline" className="justify-start rounded-lg hover:bg-sky-50">
                <Mail className="mr-2 size-4 text-sky-700" />
                Enviar correo
              </Button>
              <Button variant="outline" className="justify-start rounded-lg hover:bg-sky-50">
                <Phone className="mr-2 size-4 text-sky-700" />
                Llamar
              </Button>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  )
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-sky-100 bg-white p-3 shadow-xs transition-colors hover:bg-sky-50/40">
      <div className="mt-1 rounded-md bg-sky-100 p-1.5 text-sky-700">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="truncate text-sm font-medium text-slate-800">{value}</div>
      </div>
    </div>
  )
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-md bg-sky-50 p-2 text-sky-700 shadow-sm">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="truncate text-sm font-medium text-slate-800">{value}</div>
      </div>
    </div>
  )
}