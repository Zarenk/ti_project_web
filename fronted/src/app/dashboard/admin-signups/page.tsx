"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Shield,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Ban,
  Search,
  TrendingUp,
  TrendingDown,
  Timer,
  MailCheck,
  Globe,
  Trash2,
  CalendarPlus,
  ChevronDown,
  SlidersHorizontal,
  X,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  Mail,
  BarChart3,
  FileText,
  ShieldAlert,
  DollarSign,
} from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { getUserDataFromToken } from "@/lib/auth"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ManualPagination } from "@/components/data-table-pagination"

import {
  fetchSignupStats,
  fetchSignupAttempts,
  fetchTrials,
  fetchBlocklist,
  removeBlocklistEntry,
  manualVerifyEmail,
  extendTrial,
  type SignupStats,
  type SignupAttempt,
  type TrialOrg,
  type BlocklistEntry,
} from "./admin-signups.api"
import { AdminOverviewTab } from "./admin-overview-tab"
import { AdminSunatTab } from "./admin-sunat-tab"
import { AdminSecurityTab } from "./admin-security-tab"
import { AdminFinancialTab } from "./admin-financial-tab"
import { AdminTransfersTab } from "./admin-transfers-tab"

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDateShort(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function daysRemaining(iso: string | null): number {
  if (!iso) return 0
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
  SUCCESS: { label: "Exitoso", variant: "default", icon: CheckCircle2 },
  PENDING: { label: "Pendiente", variant: "secondary", icon: Clock },
  FAILED: { label: "Fallido", variant: "destructive", icon: XCircle },
  BLOCKED: { label: "Bloqueado", variant: "outline", icon: Ban },
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AdminSignupsPage() {
  const router = useRouter()
  const { authPending, sessionExpiring } = useAuth()
  const queryClient = useQueryClient()
  const [authChecked, setAuthChecked] = useState(false)

  // Auth guard
  useEffect(() => {
    if (authPending || sessionExpiring) return
    getUserDataFromToken().then((session) => {
      if (!session || session.role !== "SUPER_ADMIN_GLOBAL") {
        router.replace("/unauthorized")
        return
      }
      setAuthChecked(true)
    })
  }, [authPending, sessionExpiring, router])

  // Tab state
  const [activeTab, setActiveTab] = useState("overview")

  // Attempts state
  const [attemptsPage, setAttemptsPage] = useState(1)
  const [attemptsSearch, setAttemptsSearch] = useState("")
  const [attemptsStatus, setAttemptsStatus] = useState("ALL")
  const [attemptsSearchInput, setAttemptsSearchInput] = useState("")

  // Trials state
  const [trialsPage, setTrialsPage] = useState(1)
  const [trialsSearch, setTrialsSearch] = useState("")
  const [trialsSearchInput, setTrialsSearchInput] = useState("")

  // Blocklist state
  const [blocklistPage, setBlocklistPage] = useState(1)

  // Extend trial dialog
  const [extendDialog, setExtendDialog] = useState<{ orgId: number; orgName: string; currentEnd: string | null } | null>(null)
  const [extendDays, setExtendDays] = useState(7)

  // Mobile filters
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const enabled = authChecked && !authPending && !sessionExpiring

  // ── Queries ──────────────────────────────────────────────────────────────

  const statsQuery = useQuery({
    queryKey: queryKeys.adminSignups.stats(),
    queryFn: fetchSignupStats,
    enabled,
    refetchInterval: 30_000, // Real-time: refresh every 30s
  })

  const attemptsQuery = useQuery({
    queryKey: queryKeys.adminSignups.attempts({ page: attemptsPage, status: attemptsStatus, search: attemptsSearch }),
    queryFn: () => fetchSignupAttempts({ page: attemptsPage, limit: 15, status: attemptsStatus, search: attemptsSearch }),
    enabled,
  })

  const trialsQuery = useQuery({
    queryKey: queryKeys.adminSignups.trials({ page: trialsPage, search: trialsSearch }),
    queryFn: () => fetchTrials({ page: trialsPage, limit: 15, search: trialsSearch }),
    enabled,
  })

  const blocklistQuery = useQuery({
    queryKey: queryKeys.adminSignups.blocklist({ page: blocklistPage }),
    queryFn: () => fetchBlocklist({ page: blocklistPage, limit: 15 }),
    enabled,
  })

  // ── Mutations ────────────────────────────────────────────────────────────

  const verifyMutation = useMutation({
    mutationFn: manualVerifyEmail,
    onSuccess: () => {
      toast.success("Email verificado manualmente")
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSignups.root() })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const unblockMutation = useMutation({
    mutationFn: removeBlocklistEntry,
    onSuccess: () => {
      toast.success("Entrada desbloqueada")
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSignups.root() })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const extendMutation = useMutation({
    mutationFn: ({ orgId, days }: { orgId: number; days: number }) => extendTrial(orgId, days),
    onSuccess: (data) => {
      toast.success(`Trial extendido hasta ${formatDate(data.newTrialEndsAt)}`)
      setExtendDialog(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSignups.root() })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ── Search handlers ──────────────────────────────────────────────────────

  const handleAttemptsSearch = useCallback(() => {
    setAttemptsSearch(attemptsSearchInput)
    setAttemptsPage(1)
  }, [attemptsSearchInput])

  const handleTrialsSearch = useCallback(() => {
    setTrialsSearch(trialsSearchInput)
    setTrialsPage(1)
  }, [trialsSearchInput])

  const handleRefreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.adminSignups.root() })
    queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboard.root() })
  }, [queryClient])

  const stats = statsQuery.data

  // Active filters count for mobile
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (attemptsSearch.trim()) count++
    if (attemptsStatus !== "ALL") count++
    return count
  }, [attemptsSearch, attemptsStatus])

  if (!authChecked) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 space-y-6 w-full min-w-0">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Panel Administrador</h1>
            <p className="text-sm text-muted-foreground">Sistema completo de auditoría y monitoreo</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer gap-1.5 self-start sm:self-auto"
          onClick={handleRefreshAll}
          disabled={statsQuery.isFetching}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", statsQuery.isFetching && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          title="Registros hoy"
          value={stats?.signupsToday ?? 0}
          icon={Users}
          subtitle={stats ? `Ayer: ${stats.signupsYesterday}` : undefined}
          trend={stats && stats.signupsYesterday > 0
            ? ((stats.signupsToday - stats.signupsYesterday) / stats.signupsYesterday) * 100
            : undefined}
          loading={statsQuery.isLoading}
        />
        <StatCard
          title="Exitosos hoy"
          value={stats?.successToday ?? 0}
          icon={CheckCircle2}
          iconClass="text-emerald-500"
          loading={statsQuery.isLoading}
        />
        <StatCard
          title="Pendientes verificación"
          value={stats?.pendingVerification ?? 0}
          icon={MailCheck}
          iconClass="text-amber-500"
          loading={statsQuery.isLoading}
        />
        <StatCard
          title="Trials activos"
          value={stats?.activeTrials ?? 0}
          icon={Timer}
          subtitle={stats?.expiringTrials ? `${stats.expiringTrials} por expirar` : undefined}
          iconClass="text-blue-500"
          loading={statsQuery.isLoading}
        />
        <StatCard
          title="Bloqueados"
          value={stats?.activeBlocklistEntries ?? 0}
          icon={Ban}
          iconClass="text-red-500"
          loading={statsQuery.isLoading}
        />
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0">
        <div className="overflow-x-auto w-full min-w-0 -mx-1 px-1">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="overview" className="cursor-pointer gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5 hidden sm:block" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="registros" className="cursor-pointer gap-1.5 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 hidden sm:block" />
              Registros
              {stats?.signupsThisWeek ? (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{stats.signupsThisWeek}</Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="sunat" className="cursor-pointer gap-1.5 text-xs sm:text-sm">
              <FileText className="h-3.5 w-3.5 hidden sm:block" />
              SUNAT
            </TabsTrigger>
            <TabsTrigger value="seguridad" className="cursor-pointer gap-1.5 text-xs sm:text-sm">
              <ShieldAlert className="h-3.5 w-3.5 hidden sm:block" />
              Seguridad
            </TabsTrigger>
            <TabsTrigger value="financiero" className="cursor-pointer gap-1.5 text-xs sm:text-sm">
              <DollarSign className="h-3.5 w-3.5 hidden sm:block" />
              Financiero
            </TabsTrigger>
            <TabsTrigger value="trials" className="cursor-pointer gap-1.5 text-xs sm:text-sm">
              <Timer className="h-3.5 w-3.5 hidden sm:block" />
              Trials
              {stats?.activeTrials ? (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{stats.activeTrials}</Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="blocklist" className="cursor-pointer gap-1.5 text-xs sm:text-sm">
              <Ban className="h-3.5 w-3.5 hidden sm:block" />
              Blocklist
            </TabsTrigger>
            <TabsTrigger value="transferencias" className="cursor-pointer gap-1.5 text-xs sm:text-sm">
              <ArrowUpRight className="h-3.5 w-3.5 hidden sm:block" />
              Transferencias
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Overview Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-4 w-full min-w-0">
          <AdminOverviewTab enabled={enabled} />
        </TabsContent>


        {/* ── SUNAT Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="sunat" className="mt-4 w-full min-w-0">
          <AdminSunatTab enabled={enabled} />
        </TabsContent>

        {/* ── Security Tab ────────────────────────────────────────────────── */}
        <TabsContent value="seguridad" className="mt-4 w-full min-w-0">
          <AdminSecurityTab enabled={enabled} />
        </TabsContent>

        {/* ── Financial Tab ───────────────────────────────────────────────── */}
        <TabsContent value="financiero" className="mt-4 w-full min-w-0">
          <AdminFinancialTab enabled={enabled} />
        </TabsContent>

        {/* ── Registros Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="registros" className="mt-4 space-y-4 w-full min-w-0">
          {/* Mobile: compact search + filter toggle */}
          <div className="flex gap-2 sm:hidden w-full min-w-0">
            <Input
              placeholder="Buscar email, dominio, IP..."
              value={attemptsSearchInput}
              onChange={(e) => setAttemptsSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAttemptsSearch()}
              className="h-9 text-sm flex-1 min-w-0"
            />
            <Button
              variant={mobileFiltersOpen ? "secondary" : "outline"}
              size="sm"
              className="h-9 gap-1.5 cursor-pointer flex-shrink-0 relative"
              onClick={() => setMobileFiltersOpen((prev) => !prev)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="text-xs">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", mobileFiltersOpen && "rotate-180")} />
            </Button>
          </div>

          {/* Mobile: collapsible filter panel */}
          <div className={cn("sm:hidden overflow-hidden transition-all duration-300 ease-in-out",
            mobileFiltersOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}>
            <div className="space-y-2 pt-1 pb-0.5">
              <Select value={attemptsStatus} onValueChange={(v) => { setAttemptsStatus(v); setAttemptsPage(1) }}>
                <SelectTrigger className="h-9 text-sm cursor-pointer">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="cursor-pointer">Todos</SelectItem>
                  <SelectItem value="SUCCESS" className="cursor-pointer">Exitosos</SelectItem>
                  <SelectItem value="PENDING" className="cursor-pointer">Pendientes</SelectItem>
                  <SelectItem value="FAILED" className="cursor-pointer">Fallidos</SelectItem>
                  <SelectItem value="BLOCKED" className="cursor-pointer">Bloqueados</SelectItem>
                </SelectContent>
              </Select>
              {(attemptsSearch || attemptsStatus !== "ALL") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAttemptsSearch("")
                    setAttemptsSearchInput("")
                    setAttemptsStatus("ALL")
                    setAttemptsPage(1)
                    setMobileFiltersOpen(false)
                  }}
                  className="h-8 w-full text-xs text-muted-foreground cursor-pointer"
                >
                  <X className="h-3 w-3 mr-1" /> Limpiar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Desktop: full filter bar */}
          <div className="hidden sm:flex items-center gap-3 w-full min-w-0">
            <div className="relative flex-1 min-w-0 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email, dominio o IP..."
                value={attemptsSearchInput}
                onChange={(e) => setAttemptsSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAttemptsSearch()}
                className="pl-9 h-9"
              />
            </div>
            <Select value={attemptsStatus} onValueChange={(v) => { setAttemptsStatus(v); setAttemptsPage(1) }}>
              <SelectTrigger className="w-[140px] h-9 cursor-pointer">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="cursor-pointer">Todos</SelectItem>
                <SelectItem value="SUCCESS" className="cursor-pointer">Exitosos</SelectItem>
                <SelectItem value="PENDING" className="cursor-pointer">Pendientes</SelectItem>
                <SelectItem value="FAILED" className="cursor-pointer">Fallidos</SelectItem>
                <SelectItem value="BLOCKED" className="cursor-pointer">Bloqueados</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9 cursor-pointer" onClick={handleAttemptsSearch}>
              <Search className="h-3.5 w-3.5 mr-1" /> Buscar
            </Button>
          </div>

          {/* Attempts table */}
          <Card className="border shadow-sm w-full min-w-0 overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden md:table-cell">Dominio</TableHead>
                    <TableHead className="hidden lg:table-cell">IP</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                    <TableHead className="hidden lg:table-cell">Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attemptsQuery.isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <div className="h-5 w-full animate-pulse rounded bg-muted" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : !attemptsQuery.data?.items?.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                        <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                        No hay registros
                      </TableCell>
                    </TableRow>
                  ) : (
                    attemptsQuery.data.items.map((attempt, idx) => (
                      <AttemptRow key={attempt.id} attempt={attempt} index={idx} />
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {attemptsQuery.data && attemptsQuery.data.totalPages > 1 && (
            <ManualPagination
              currentPage={attemptsQuery.data.page}
              totalPages={attemptsQuery.data.totalPages}
              pageSize={15}
              totalItems={attemptsQuery.data.total}
              onPageChange={setAttemptsPage}
              onPageSizeChange={() => {}}
            />
          )}
        </TabsContent>

        {/* ── Trials Tab ────────────────────────────────────────────────────── */}
        <TabsContent value="trials" className="mt-4 space-y-4 w-full min-w-0">
          <div className="flex items-center gap-3 w-full min-w-0">
            <div className="relative flex-1 min-w-0 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar organización..."
                value={trialsSearchInput}
                onChange={(e) => setTrialsSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTrialsSearch()}
                className="pl-9 h-9"
              />
            </div>
            <Button variant="outline" size="sm" className="h-9 cursor-pointer" onClick={handleTrialsSearch}>
              <Search className="h-3.5 w-3.5 mr-1" /> Buscar
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0">
            {trialsQuery.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 space-y-3">
                    <div className="h-5 w-2/3 rounded bg-muted" />
                    <div className="h-4 w-1/2 rounded bg-muted" />
                    <div className="h-3 w-full rounded bg-muted" />
                  </CardContent>
                </Card>
              ))
            ) : !trialsQuery.data?.items?.length ? (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                <Timer className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                No hay trials activos
              </div>
            ) : (
              trialsQuery.data.items.map((trial) => (
                <TrialCard
                  key={trial.id}
                  trial={trial}
                  onExtend={() => setExtendDialog({
                    orgId: trial.organizationId,
                    orgName: trial.organization.name,
                    currentEnd: trial.trialEndsAt,
                  })}
                  onVerify={(userId) => verifyMutation.mutate(userId)}
                  verifying={verifyMutation.isPending}
                />
              ))
            )}
          </div>

          {trialsQuery.data && trialsQuery.data.totalPages > 1 && (
            <ManualPagination
              currentPage={trialsQuery.data.page}
              totalPages={trialsQuery.data.totalPages}
              pageSize={15}
              totalItems={trialsQuery.data.total}
              onPageChange={setTrialsPage}
              onPageSizeChange={() => {}}
            />
          )}
        </TabsContent>

        {/* ── Blocklist Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="blocklist" className="mt-4 space-y-4 w-full min-w-0">
          <Card className="border shadow-sm w-full min-w-0 overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="hidden sm:table-cell">Razón</TableHead>
                    <TableHead className="hidden md:table-cell">Expira</TableHead>
                    <TableHead className="hidden sm:table-cell">Creado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blocklistQuery.isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <div className="h-5 w-full animate-pulse rounded bg-muted" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : !blocklistQuery.data?.items?.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                        <Ban className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                        No hay entradas bloqueadas
                      </TableCell>
                    </TableRow>
                  ) : (
                    blocklistQuery.data.items.map((entry) => (
                      <BlocklistRow
                        key={entry.id}
                        entry={entry}
                        onUnblock={() => unblockMutation.mutate(entry.id)}
                        unblocking={unblockMutation.isPending}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {blocklistQuery.data && blocklistQuery.data.totalPages > 1 && (
            <ManualPagination
              currentPage={blocklistQuery.data.page}
              totalPages={blocklistQuery.data.totalPages}
              pageSize={15}
              totalItems={blocklistQuery.data.total}
              onPageChange={setBlocklistPage}
              onPageSizeChange={() => {}}
            />
          )}
        </TabsContent>

        {/* ── Transferencias Tab ───────────────────────────────────────────── */}
        <TabsContent value="transferencias" className="mt-4 w-full min-w-0">
          <AdminTransfersTab />
        </TabsContent>
      </Tabs>

      {/* ── Extend Trial Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!extendDialog} onOpenChange={(open) => !open && setExtendDialog(null)}>
        <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              Extender Trial
            </DialogTitle>
            <DialogDescription>
              Extender período de prueba para <strong>{extendDialog?.orgName}</strong>.
              {extendDialog?.currentEnd && (
                <span className="block mt-1 text-xs">
                  Expira actualmente: {formatDate(extendDialog.currentEnd)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1}
              max={90}
              value={extendDays}
              onChange={(e) => setExtendDays(Number(e.target.value) || 7)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">días adicionales</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialog(null)} className="cursor-pointer">
              Cancelar
            </Button>
            <Button
              onClick={() => extendDialog && extendMutation.mutate({ orgId: extendDialog.orgId, days: extendDays })}
              disabled={extendMutation.isPending}
              className="cursor-pointer"
            >
              {extendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Extender
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Sub-Components ─────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  iconClass,
  loading,
}: {
  title: string
  value: number
  icon: typeof Users
  subtitle?: string
  trend?: number
  iconClass?: string
  loading?: boolean
}) {
  return (
    <Card className="border shadow-sm transition-all duration-300 hover:shadow-md">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
            {loading ? (
              <div className="h-7 w-16 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-xl sm:text-2xl font-bold tabular-nums">{value}</p>
            )}
          </div>
          <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted/60", iconClass)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {(subtitle || trend !== undefined) && (
          <div className="mt-2 flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
            {trend !== undefined && (
              <span className={cn(
                "flex items-center gap-0.5 font-medium",
                trend > 0 ? "text-emerald-600 dark:text-emerald-400" : trend < 0 ? "text-red-500" : ""
              )}>
                {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                {trend > 0 ? "+" : ""}{Math.round(trend)}%
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AttemptRow({ attempt, index }: { attempt: SignupAttempt; index: number }) {
  const cfg = STATUS_CONFIG[attempt.status] ?? STATUS_CONFIG.PENDING
  const StatusIcon = cfg.icon

  return (
    <TableRow
      className="animate-in fade-in slide-in-from-bottom-1 duration-300"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          <span className="truncate max-w-[200px]">{attempt.email}</span>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{attempt.domain}</TableCell>
      <TableCell className="hidden lg:table-cell">
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{attempt.ip ?? "—"}</code>
      </TableCell>
      <TableCell>
        <Badge variant={cfg.variant} className="gap-1 text-[10px] sm:text-xs">
          <StatusIcon className="h-3 w-3" />
          {cfg.label}
        </Badge>
      </TableCell>
      <TableCell className="hidden sm:table-cell text-muted-foreground text-xs whitespace-nowrap">
        {formatDateShort(attempt.createdAt)}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {attempt.errorMessage ? (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-red-500 truncate max-w-[180px] inline-block cursor-default">
                  {attempt.errorMessage}
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs text-xs">
                {attempt.errorMessage}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  )
}

function TrialCard({
  trial,
  onExtend,
  onVerify,
  verifying,
}: {
  trial: TrialOrg
  onExtend: () => void
  onVerify: (userId: number) => void
  verifying: boolean
}) {
  const days = daysRemaining(trial.trialEndsAt)
  const isExpiringSoon = days <= 3 && days >= 0
  const isExpired = days < 0
  const owner = trial.organization.users[0]
  const company = trial.organization.companies[0]
  const progressPct = trial.trialEndsAt
    ? Math.max(0, Math.min(100, ((14 - days) / 14) * 100))
    : 0

  return (
    <Card className={cn(
      "border shadow-sm transition-all duration-300 hover:shadow-md w-full min-w-0 overflow-hidden",
      isExpiringSoon && "border-amber-300/60 dark:border-amber-700/40",
      isExpired && "border-red-300/60 dark:border-red-700/40 opacity-80",
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{trial.organization.name}</h3>
            {company && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className="text-[10px] h-5">{company.businessVertical}</Badge>
              </div>
            )}
          </div>
          <Badge
            variant={isExpired ? "destructive" : isExpiringSoon ? "secondary" : "default"}
            className="flex-shrink-0 text-[10px]"
          >
            {isExpired ? "Expirado" : `${days}d restantes`}
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isExpired ? "bg-red-500" : isExpiringSoon ? "bg-amber-500" : "bg-primary"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{formatDateShort(trial.createdAt)}</span>
            <span>{trial.trialEndsAt ? formatDateShort(trial.trialEndsAt) : "—"}</span>
          </div>
        </div>

        {/* Owner info */}
        {owner && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
            <Mail className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{owner.email}</span>
            {owner.emailVerifiedAt ? (
              <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-emerald-500" />
            ) : (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 flex-shrink-0 cursor-pointer"
                      onClick={() => onVerify(owner.id)}
                      disabled={verifying}
                    >
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    Clic para verificar email manualmente
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs cursor-pointer flex-1 gap-1"
            onClick={onExtend}
          >
            <CalendarPlus className="h-3 w-3" />
            Extender
          </Button>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer flex-shrink-0"
                  onClick={() => window.open(`/dashboard/tenancy/${trial.organizationId}`, "_blank")}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Ver organización</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
}

function BlocklistRow({
  entry,
  onUnblock,
  unblocking,
}: {
  entry: BlocklistEntry
  onUnblock: () => void
  unblocking: boolean
}) {
  const type = entry.ip ? "IP" : entry.domain ? "Dominio" : entry.deviceHash ? "Device" : "—"
  const value = entry.ip ?? entry.domain ?? (entry.deviceHash ? entry.deviceHash.substring(0, 12) + "..." : "—")
  const isActive = !entry.blockedUntil || new Date(entry.blockedUntil) > new Date()

  return (
    <TableRow className={cn(!isActive && "opacity-50")}>
      <TableCell>
        <Badge variant="outline" className="text-[10px]">{type}</Badge>
      </TableCell>
      <TableCell>
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{value}</code>
      </TableCell>
      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{entry.reason ?? "—"}</TableCell>
      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
        {entry.blockedUntil ? formatDateShort(entry.blockedUntil) : "Permanente"}
      </TableCell>
      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatDateShort(entry.createdAt)}</TableCell>
      <TableCell className="text-right">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={onUnblock}
                disabled={unblocking}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Desbloquear</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  )
}
