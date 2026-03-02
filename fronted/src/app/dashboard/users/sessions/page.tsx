"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import {
  Users,
  RefreshCw,
  Circle,
  Clock,
  Shield,
  ShieldCheck,
  Building2,
  Search,
  Wifi,
  WifiOff,
  UserCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { PageGuideButton } from "@/components/page-guide-dialog"
import { SESSIONS_GUIDE_STEPS } from "./sessions-guide-steps"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"
import { getUserDataFromToken } from "@/lib/auth"
import { getActiveSessions, type ActiveSession } from "../users.api"

/* ── Role config ── */

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN_GLOBAL: "Super Admin Global",
  SUPER_ADMIN_ORG: "Super Admin Org",
  ADMIN: "Administrador",
  EMPLOYEE: "Empleado",
  CLIENT: "Cliente",
  GUEST: "Invitado",
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN_GLOBAL:
    "border-violet-500/30 bg-violet-500/5 text-violet-600 dark:text-violet-400",
  SUPER_ADMIN_ORG:
    "border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400",
  ADMIN:
    "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400",
  EMPLOYEE:
    "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
}

function getRoleIcon(role: string) {
  if (role === "SUPER_ADMIN_GLOBAL") return ShieldCheck
  if (role === "SUPER_ADMIN_ORG") return Shield
  return UserCheck
}

function getActivityStatus(lastActiveAt: string): "online" | "idle" {
  const diff = Date.now() - new Date(lastActiveAt).getTime()
  return diff < 2 * 60 * 1000 ? "online" : "idle"
}

/* ── Page ── */

export default function ActiveSessionsPage() {
  const router = useRouter()
  const { authPending, sessionExpiring } = useAuth()

  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [isGlobal, setIsGlobal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // ─ Auth check
  useEffect(() => {
    if (authPending || sessionExpiring) return

    getUserDataFromToken().then((session) => {
      if (!session) {
        router.replace("/login")
        return
      }
      const role = session.role?.toUpperCase()
      if (role !== "SUPER_ADMIN_GLOBAL" && role !== "SUPER_ADMIN_ORG") {
        router.replace("/unauthorized")
        return
      }
      setIsGlobal(role === "SUPER_ADMIN_GLOBAL")
    })
  }, [authPending, sessionExpiring, router])

  // ─ Fetch sessions
  const fetchSessions = useCallback(async () => {
    setError(null)
    try {
      const data = await getActiveSessions()
      setSessions(data)
      setLastRefresh(new Date())
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al cargar sesiones"
      setError(msg)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchSessions().finally(() => setLoading(false))
  }, [fetchSessions])

  // ─ Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSessions()
    }, 30_000)
    return () => clearInterval(interval)
  }, [fetchSessions])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchSessions()
    setRefreshing(false)
  }

  // ─ Filter
  const filtered = sessions.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.username.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q) ||
      s.organizations.some((o) => o.name.toLowerCase().includes(q))
    )
  })

  // ─ Stats
  const onlineCount = sessions.filter(
    (s) => getActivityStatus(s.lastActiveAt) === "online",
  ).length
  const idleCount = sessions.length - onlineCount
  const orgCount = new Set(
    sessions.flatMap((s) => s.organizations.map((o) => o.id)),
  ).size

  return (
    <TooltipProvider delayDuration={120}>
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Wifi className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">
                  Sesiones Activas
                </h1>
                <PageGuideButton steps={SESSIONS_GUIDE_STEPS} tooltipLabel="Guía de sesiones" />
              </div>
              <p className="text-sm text-muted-foreground">
                {isGlobal
                  ? "Usuarios conectados en todas las organizaciones"
                  : "Usuarios conectados en tu organización"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lastRefresh && (
              <span className="hidden text-xs text-muted-foreground sm:block">
                Actualizado{" "}
                {formatDistanceToNow(lastRefresh, {
                  addSuffix: true,
                  locale: es,
                })}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="cursor-pointer gap-1.5"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
              />
              Actualizar
            </Button>
          </div>
        </div>

        {/* ── Stats cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums leading-tight">
                  {loading ? <Skeleton className="h-7 w-8" /> : sessions.length}
                </div>
                <p className="text-xs text-muted-foreground">Total activos</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <Circle className="h-4 w-4 fill-emerald-500 text-emerald-500" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums leading-tight text-emerald-600 dark:text-emerald-400">
                  {loading ? <Skeleton className="h-7 w-8" /> : onlineCount}
                </div>
                <p className="text-xs text-muted-foreground">En línea</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums leading-tight text-amber-600 dark:text-amber-400">
                  {loading ? <Skeleton className="h-7 w-8" /> : idleCount}
                </div>
                <p className="text-xs text-muted-foreground">Inactivos</p>
              </div>
            </CardContent>
          </Card>

          {isGlobal && (
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                  <Building2 className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold tabular-nums leading-tight text-blue-600 dark:text-blue-400">
                    {loading ? <Skeleton className="h-7 w-8" /> : orgCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Organizaciones</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Sessions list ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Usuarios conectados
                {!loading && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {filtered.length}
                  </Badge>
                )}
              </CardTitle>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuario, email, org..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-1.5">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <WifiOff className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="cursor-pointer"
                >
                  Reintentar
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <WifiOff className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {search
                    ? "No se encontraron usuarios con esa búsqueda"
                    : "No hay usuarios activos en este momento"}
                </p>
              </div>
            ) : (
              filtered.map((session) => {
                const status = getActivityStatus(session.lastActiveAt)
                const RoleIcon = getRoleIcon(session.role)
                const roleColor =
                  ROLE_COLORS[session.role] ??
                  "border-muted-foreground/30 text-muted-foreground"
                const initials = session.username
                  .split(/[\s._-]/)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)

                return (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/20"
                  >
                    {/* Avatar with status indicator */}
                    <div className="relative">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                        {initials}
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 block h-3.5 w-3.5 rounded-full border-2 border-background",
                              status === "online"
                                ? "bg-emerald-500"
                                : "bg-amber-400",
                            )}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {status === "online" ? "En línea" : "Inactivo"}
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {session.username}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 gap-1 text-[10px] font-medium",
                            roleColor,
                          )}
                        >
                          <RoleIcon className="h-2.5 w-2.5" />
                          {ROLE_LABELS[session.role] ?? session.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{session.email}</span>
                        {isGlobal && session.organizations.length > 0 && (
                          <>
                            <span className="text-muted-foreground/30">·</span>
                            <span className="flex items-center gap-1 truncate">
                              <Building2 className="h-3 w-3 shrink-0" />
                              {session.organizations
                                .map((o) => o.name)
                                .join(", ")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Last active */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs",
                            status === "online"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                          )}
                        >
                          {status === "online" ? (
                            <Circle className="h-2 w-2 fill-current" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          <span className="hidden sm:inline">
                            {status === "online"
                              ? "En línea"
                              : formatDistanceToNow(
                                  new Date(session.lastActiveAt),
                                  { addSuffix: true, locale: es },
                                )}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Última actividad:{" "}
                        {formatDistanceToNow(new Date(session.lastActiveAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* ── Footer note ── */}
        {!loading && sessions.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Se muestran usuarios con actividad en los últimos 5 minutos · Auto-actualización cada 30 segundos
          </p>
        )}
      </div>
    </TooltipProvider>
  )
}
