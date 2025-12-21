"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Mail,
  Phone,
  Shield,
  CalendarClock,
  LogIn,
  CheckCircle2,
  UserRound,
  ImageUp,
  BookOpen,
  BarChart3,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getLastAccessFromToken, isTokenValid, getUserDataFromToken } from "@/lib/auth"
import { getProfile, updateProfile, changePassword, uploadProfileImage } from "./account.api"
import Actividad from "./Actividad"
import { Switch } from "@/components/ui/switch"
import { shouldRememberContext, updateContextPreferences } from "@/utils/context-preferences"
import { userContextStorage } from "@/utils/user-context-storage"
import { trackEvent } from "@/lib/analytics"
import { ACCOUNT_ALLOWED_ROLES } from "./use-account-access"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function Page() {
  const [user, setUser] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    imagen: "",
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
  const [rememberContext, setRememberContext] = useState(() => shouldRememberContext())
  const [savingDatos, setSavingDatos] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showActividad, setShowActividad] = useState(false)
  const activityAllowedRoles = new Set(["ADMIN", "SUPER_ADMIN_GLOBAL", "SUPER_ADMIN_ORG"])
  const allowedRoles = ACCOUNT_ALLOWED_ROLES
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { logout } = useAuth()

  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      const session = await getUserDataFromToken()
      if (!session || !(await isTokenValid())) {
        router.replace('/login')
        return
      }
      const normalizedRole = (session.role ?? "").toUpperCase()
      if (!allowedRoles.has(normalizedRole)) {
        router.push('/unauthorized')
        return
      }
      try {
        const profile = await getProfile()
        const last = await getLastAccessFromToken()
        setUser({
          nombre: profile.username,
          correo: profile.email,
          telefono: profile.client?.phone || "",
          imagen: profile.client?.image || "",
          rol: profile.role,
          tipoUsuario: "Interno",
          estado: "Activo",
          creadoEl: profile.createdAt,
          ultimoInicio: last ? last.toLocaleString("es-ES") : "",
        })
        setFormDatos({
          nombre: profile.username,
          correo: profile.email,
          telefono: profile.client?.phone || "",
        })
      } catch (error) {
        console.error(error)
        toast("Error: No se pudo cargar el perfil.")
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [allowedRoles, router])

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

  async function handlePassSubmit(e: React.FormEvent) {
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
    try {
      await changePassword(formPass.actual, formPass.nueva)
      setFormPass({ actual: "", nueva: "", confirmar: "" })
      toast("Tu contraseña se ha actualizado correctamente.")
      await logout()
      router.push('/login')
    } catch (error) {
      console.error(error)
      toast("Error: No se pudo actualizar la contraseña.")
    } finally {
      setSavingPass(false)
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { url } = await uploadProfileImage(file)
      await updateProfile({ image: url })
      setUser((u) => ({ ...u, imagen: url }))
      toast("Tu imagen de perfil se ha actualizado correctamente.")
    } catch (error) {
      console.error(error)
      toast("Error: No se pudo actualizar la imagen.")
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleRememberContextChange = (value: boolean) => {
    setRememberContext(value)
    updateContextPreferences({ rememberLastContext: value })
    if (!value) {
      userContextStorage.clearContext({ silent: true })
      toast("Dejaremos de recordar autom?ticamente tu ?ltima organizaci?n.")
    } else {
      toast("Recordaremos tu ?ltima organizaci?n y empresa seleccionada.")
    }
    trackEvent("context_preference_changed", { rememberLastContext: value })
  }

  const initials = user.nombre
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  if (loading) {
    return (
      <div className="min-h-[100svh] w-full bg-gradient-to-b from-sky-50 via-cyan-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <header className="w-full border-b bg-gradient-to-r from-white via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 supports-[backdrop-filter]:backdrop-blur-sm dark:border-slate-700">
          <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Skeleton className="size-14 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-28 rounded-full" />
                <Skeleton className="h-9 w-28 rounded-full" />
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-12 md:gap-8 md:py-10">
          <section className="md:col-span-8 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-56" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-40 rounded-full" />
                  <Skeleton className="h-9 w-28 rounded-full" />
                </div>
              </CardContent>
            </Card>
          </section>
          <section className="md:col-span-4 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-[100svh] w-full bg-gradient-to-b from-sky-50 via-cyan-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <header
        className={cn(
          "w-full border-b",
          "bg-gradient-to-r from-white via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950",
          "supports-[backdrop-filter]:backdrop-blur-sm",
          "dark:border-slate-700"
        )}
      >
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="size-14 border shadow-sm">
                  <AvatarImage alt={`Foto de ${user.nombre}`} src={user.imagen || "/placeholder.svg?height=112&width=112"} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  size="icon"
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border border-sky-200 bg-white text-sky-700 hover:bg-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageUp className="h-3 w-3" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
              <div className="animate-in fade-in slide-in-from-left-1">
                <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 md:text-2xl">{user.nombre}</h1>
                <div className="mt-1 flex items-center gap-2">
                  <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-slate-700 dark:text-slate-200">
                    {user.rol}
                  </Badge>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Tipo: {user.tipoUsuario}</span>
                </div>
              </div>
            </div>
            <div className="w-full overflow-x-auto md:overflow-visible">
              <div className="flex min-w-max items-center gap-3 py-3 pr-2 md:min-w-full md:flex-wrap md:justify-end lg:flex-nowrap">
                {activityAllowedRoles.has((user.rol ?? "").toUpperCase()) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="rounded-full border-sky-200 text-sky-700 hover:bg-sky-100 hover:text-sky-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                        onClick={() => setShowActividad((v) => !v)}
                      >
                        Actividad
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Muestra u oculta tu actividad reciente.</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      className="rounded-full bg-white text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
                      asChild
                    >
                      <Link href="/dashboard/account/billing">Facturación</Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Consulta pagos y comprobantes de tu cuenta.</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      className="rounded-full bg-white text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
                      asChild
                    >
                      <Link href="/dashboard/account/payment-methods">Métodos de Pago</Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Administra las tarjetas o cuentas asociadas.</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      className="rounded-full bg-white text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
                      asChild
                    >
                      <Link href="/dashboard/account/exports">Exportaciones</Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Descarga respaldos y reportes disponibles.</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      className="rounded-full bg-white text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
                      asChild
                    >
                      <Link href="/dashboard/account/plan">Consumo</Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Revisa tu uso y capacidad asignada.</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="rounded-full bg-sky-600 text-white hover:bg-sky-700 dark:bg-slate-700 dark:hover:bg-slate-600 cursor-pointer"
                      onClick={() => handleDatosSubmit(new Event('submit') as unknown as React.FormEvent)}
                    >
                      Guardar todo
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Guarda cualquier cambio pendiente en tu cuenta.</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-12 md:gap-8 md:py-10">      
        {showActividad ? (
          <div className="md:col-span-12">
            <Actividad />
          </div>
        ) : (
          <>
            {/* Columna principal */}
            <section className="md:col-span-8 space-y-6">
              {/* Información de la cuenta (lectura) */}
              <Card className="border-sky-100 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-800 dark:text-slate-100">Información de la cuenta</CardTitle>
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
              <Card className="border-sky-100 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-800 dark:text-slate-100">Editar perfil</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Datos personales */}
                  <section aria-labelledby="datos-personales">
                    <div className="mb-3">
                      <h3 id="datos-personales" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Datos personales
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Actualiza tu nombre, correo y teléfono.</p>
                    </div>
                    <form onSubmit={handleDatosSubmit} className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="nombre">Nombre</Label>
                        <Input
                          id="nombre"
                          placeholder="Nombre completo"
                          value={formDatos.nombre}
                          onChange={(e) => setFormDatos((f) => ({ ...f, nombre: e.target.value }))}
                          className="bg-white focus-visible:ring-sky-300 dark:bg-slate-900 dark:border-slate-700 dark:focus-visible:ring-slate-600"
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
                          className="bg-white focus-visible:ring-sky-300 dark:bg-slate-900 dark:border-slate-700 dark:focus-visible:ring-slate-600"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="telefono">Número de teléfono</Label>
                        <Input
                          id="telefono"
                          placeholder="+34 600 000 000"
                          value={formDatos.telefono}
                          onChange={(e) => setFormDatos((f) => ({ ...f, telefono: e.target.value }))}
                          className="bg-white focus-visible:ring-sky-300 dark:bg-slate-900 dark:border-slate-700 dark:focus-visible:ring-slate-600"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="submit"
                              disabled={savingDatos}
                              className="rounded-full bg-sky-600 text-white transition-shadow hover:bg-sky-700 hover:shadow-sm dark:bg-slate-700 dark:hover:bg-slate-600 cursor-pointer"
                            >
                              {savingDatos ? "Guardando..." : "Guardar cambios"}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Actualiza tus datos personales.</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              className="rounded-full text-sky-700 hover:bg-sky-100 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                              onClick={() =>
                                setFormDatos({ nombre: user.nombre, correo: user.correo, telefono: user.telefono })
                              }
                            >
                              Deshacer
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Restaura la información original del perfil.</TooltipContent>
                        </Tooltip>
                      </div>
                    </form>
                  </section>

                  <Separator className="bg-sky-100 dark:bg-slate-700" />

                  {/* Contraseña */}
                  <section aria-labelledby="seguridad">
                    <div className="mb-3">
                      <h3 id="seguridad" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Contraseña
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
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
                          className="bg-white focus-visible:ring-sky-300 dark:bg-slate-900 dark:border-slate-700 dark:focus-visible:ring-slate-600"
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
                          className="bg-white focus-visible:ring-sky-300 dark:bg-slate-900 dark:border-slate-700 dark:focus-visible:ring-slate-600"
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
                          className="bg-white focus-visible:ring-sky-300 dark:bg-slate-900 dark:border-slate-700 dark:focus-visible:ring-slate-600"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="submit"
                              disabled={savingPass}
                              className="rounded-full bg-cyan-600 text-white transition-shadow hover:bg-cyan-700 hover:shadow-sm dark:bg-slate-700 dark:hover:bg-slate-600 cursor-pointer"
                            >
                              {savingPass ? "Actualizando..." : "Actualizar contraseña"}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Guarda tu nueva contraseña segura.</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              className="rounded-full text-sky-700 hover:bg-sky-100 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                              onClick={() => setFormPass({ actual: "", nueva: "", confirmar: "" })}
                            >
                              Limpiar
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Borra los campos del formulario de seguridad.</TooltipContent>
                        </Tooltip>
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
              <Card className="border-sky-100 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-800 dark:text-slate-100">Resumen</CardTitle>
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
                  <Separator className="bg-sky-100 dark:bg-slate-700" />
                  <div className="rounded-lg bg-sky-50/70 p-3 text-xs text-slate-600 dark:bg-slate-700/70 dark:text-slate-300">
                    Mantén tu información actualizada para garantizar una mejor experiencia en el intranet.
                  </div>
                </CardContent>
              </Card>

              <Card className="border-sky-100 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-800 dark:text-slate-100">Contacto rápido</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start rounded-lg hover:bg-sky-50 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        <Mail className="mr-2 size-4 text-sky-700 dark:text-slate-200" />
                        Enviar correo
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Inicia un correo con los datos del usuario.</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start rounded-lg hover:bg-sky-50 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        <Phone className="mr-2 size-4 text-sky-700 dark:text-slate-200" />
                        Llamar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Contacta al usuario por teléfono.</TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>

              <Card className="border-sky-100 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-800 dark:text-slate-100">
                    Preferencias de contexto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        Recordar última organización
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Guarda tu última organización y empresa seleccionada para reanudar el trabajo más rápido.
                      </p>
                    </div>
                    <Switch
                      checked={rememberContext}
                      onCheckedChange={handleRememberContextChange}
                      aria-label="Recordar última organización"
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 dark:from-slate-700 dark:to-slate-500 cursor-pointer"
                          asChild
                        >
                          <Link href="/dashboard/account/context-history">
                            <BookOpen className="size-4" />
                            Historial completo
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Revisa el historial detallado de contextos.</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex items-center gap-2 rounded-full border-sky-200 px-4 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          asChild
                        >
                          <Link href="/dashboard/account/context-dashboard">
                            <BarChart3 className="size-4" />
                            Panel de métricas
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Visualiza métricas y patrones del contexto.</TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>


            </aside>
          </>
        )}
      </main>
      </div>
    </TooltipProvider>
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
      <div className="rounded-md bg-sky-50 p-2 text-sky-700 shadow-sm dark:bg-slate-700 dark:text-slate-200">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
        <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{value}</div>
      </div>
    </div>
  )
}
