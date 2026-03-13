"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Loader2,
  Shield,
  ShieldAlert,
  Crown,
  UserMinus,
  UserPlus,
  UsersRound,
  ArrowRightLeft,
  Bell,
  Check,
  X,
  ChevronDown,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAuth } from "@/context/auth-context"
import {
  getOrganizationMembers,
  addMemberToOrg,
  removeMemberFromOrg,
  getPendingMembershipRequests,
  approveMembershipRequest,
  rejectMembershipRequest,
  moveMemberBetweenOrgs,
  listOrganizations,
  type OrgMember,
  type MembershipRequestItem,
  type OrganizationResponse,
} from "../tenancy.api"

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Dueño",
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MEMBER: "Miembro",
  VIEWER: "Visor",
}

const ROLE_COLORS: Record<string, string> = {
  OWNER:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  SUPER_ADMIN:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  ADMIN: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  MEMBER:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  VIEWER:
    "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
}

function RoleIcon({ role }: { role: string }) {
  if (role === "OWNER") return <Crown className="size-3.5" />
  if (role === "SUPER_ADMIN") return <ShieldAlert className="size-3.5" />
  return <Shield className="size-3.5" />
}

interface OrgMembersCardProps {
  organizationId: number
  organizationName: string
  /** Called after a member is successfully moved to another organization */
  onTransferComplete?: () => void
}

export function OrgMembersCard({
  organizationId,
  organizationName,
  onTransferComplete,
}: OrgMembersCardProps) {
  const { role: userRole } = useAuth()
  const isSuperAdminGlobal = userRole === "SUPER_ADMIN_GLOBAL"
  const isSuperAdmin =
    userRole === "SUPER_ADMIN_GLOBAL" || userRole === "SUPER_ADMIN_ORG"

  // ── Members state ──
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)

  // ── Dialogs ──
  const [confirmDialog, setConfirmDialog] = useState<OrgMember | null>(null)
  const [removing, setRemoving] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addEmail, setAddEmail] = useState("")
  const [addRole, setAddRole] = useState("EMPLOYEE")
  const [adding, setAdding] = useState(false)

  // ── Move member dialog (SUPER_ADMIN_GLOBAL only) ──
  const [moveDialog, setMoveDialog] = useState<OrgMember | null>(null)
  const [moveToOrgId, setMoveToOrgId] = useState<string>("")
  const [moveRole, setMoveRole] = useState("EMPLOYEE")
  const [moveReason, setMoveReason] = useState("")
  const [moving, setMoving] = useState(false)
  const [allOrgs, setAllOrgs] = useState<OrganizationResponse[]>([])

  // ── Pending requests state ──
  const [requests, setRequests] = useState<MembershipRequestItem[]>([])
  const [requestsOpen, setRequestsOpen] = useState(false)
  const [, setLoadingRequests] = useState(false)
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(
    null,
  )

  // ── Load members ──
  const loadMembers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getOrganizationMembers(organizationId)
      setMembers(data)
    } catch (err) {
      console.error(err)
      toast.error("No se pudieron cargar los miembros.")
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  // ── Load pending requests ──
  const loadRequests = useCallback(async () => {
    if (!isSuperAdmin) return
    try {
      setLoadingRequests(true)
      const data = await getPendingMembershipRequests(organizationId)
      setRequests(data)
    } catch {
      // silently fail — requests panel is secondary
    } finally {
      setLoadingRequests(false)
    }
  }, [organizationId, isSuperAdmin])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  // ── Load orgs for move dialog ──
  useEffect(() => {
    if (!isSuperAdminGlobal) return
    listOrganizations()
      .then(setAllOrgs)
      .catch(() => {})
  }, [isSuperAdminGlobal])

  // ── Handlers ──
  const handleAdd = useCallback(async () => {
    if (!addEmail.trim()) return
    setAdding(true)
    try {
      const result = await addMemberToOrg(
        organizationId,
        addEmail.trim(),
        addRole,
      )
      toast.success(
        `${result.username} fue agregado como ${ROLE_LABELS[result.membershipRole] ?? result.membershipRole}.`,
      )
      setAddDialogOpen(false)
      setAddEmail("")
      setAddRole("MEMBER")
      void loadMembers()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al agregar miembro",
      )
    } finally {
      setAdding(false)
    }
  }, [addEmail, addRole, organizationId, loadMembers])

  const handleRemove = useCallback(async () => {
    if (!confirmDialog) return
    setRemoving(true)
    try {
      await removeMemberFromOrg(organizationId, confirmDialog.userId)
      toast.success(
        `${confirmDialog.username} fue desvinculado de la organización.`,
      )
      setConfirmDialog(null)
      void loadMembers()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al desvincular",
      )
    } finally {
      setRemoving(false)
    }
  }, [confirmDialog, organizationId, loadMembers])

  const handleMove = useCallback(async () => {
    if (!moveDialog || !moveToOrgId) return
    setMoving(true)
    try {
      const result = await moveMemberBetweenOrgs({
        targetUserId: moveDialog.userId,
        fromOrganizationId: organizationId,
        toOrganizationId: Number(moveToOrgId),
        role: moveRole,
        reason: moveReason || undefined,
      })
      toast.success(
        `${moveDialog.username} fue movido de ${result.fromOrganization} a ${result.toOrganization}.`,
      )
      setMoveDialog(null)
      setMoveToOrgId("")
      setMoveRole("MEMBER")
      setMoveReason("")
      void loadMembers()
      onTransferComplete?.()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al mover usuario",
      )
    } finally {
      setMoving(false)
    }
  }, [moveDialog, moveToOrgId, moveRole, moveReason, organizationId, loadMembers, onTransferComplete])

  const handleApproveRequest = useCallback(
    async (requestId: number) => {
      setProcessingRequestId(requestId)
      try {
        const result = await approveMembershipRequest(requestId)
        toast.success(`Solicitud aprobada para ${result.organizationName}.`)
        void loadRequests()
        void loadMembers()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Error al aprobar",
        )
      } finally {
        setProcessingRequestId(null)
      }
    },
    [loadRequests, loadMembers],
  )

  const handleRejectRequest = useCallback(
    async (requestId: number) => {
      setProcessingRequestId(requestId)
      try {
        await rejectMembershipRequest(requestId)
        toast.success("Solicitud rechazada.")
        void loadRequests()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Error al rechazar",
        )
      } finally {
        setProcessingRequestId(null)
      }
    },
    [loadRequests],
  )

  const otherOrgs = allOrgs.filter((o) => o.id !== organizationId)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
            <UsersRound className="size-5 flex-shrink-0 text-sky-600 dark:text-slate-100" />
            <span className="break-words">Miembros de la organización</span>
            {!loading && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {members.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={() => setAddDialogOpen(true)}
          >
            <UserPlus className="size-4" />
            <span className="hidden sm:inline">Agregar</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ── Pending Requests Panel ── */}
          {isSuperAdmin && requests.length > 0 && (
            <Collapsible open={requestsOpen} onOpenChange={setRequestsOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-left transition-colors hover:bg-amber-100 dark:border-amber-800/50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Bell className="size-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Solicitudes pendientes
                    </span>
                    <Badge className="bg-amber-600 text-white text-[10px] px-1.5">
                      {requests.length}
                    </Badge>
                  </div>
                  <ChevronDown
                    className={`size-4 flex-shrink-0 text-amber-600 dark:text-amber-400 transition-transform duration-200 ${requestsOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-2">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-lg border border-amber-100 bg-white p-3 dark:border-amber-900/30 dark:bg-slate-900/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium break-words">
                          {req.requester.username}{" "}
                          <span className="text-muted-foreground font-normal">
                            ({req.requester.email})
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {req.type === "SELF_REQUEST"
                            ? "Solicita unirse"
                            : req.type === "ADMIN_MOVE"
                              ? `Mover desde ${req.fromOrganization?.name ?? "—"}`
                              : "Agregar por admin"}
                          {req.reason && (
                            <span className="block mt-0.5 italic">
                              &ldquo;{req.reason}&rdquo;
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/30 cursor-pointer"
                                disabled={processingRequestId === req.id}
                                onClick={() => handleApproveRequest(req.id)}
                              >
                                {processingRequestId === req.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Check className="size-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Aprobar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30 cursor-pointer"
                                disabled={processingRequestId === req.id}
                                onClick={() => handleRejectRequest(req.id)}
                              >
                                <X className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Rechazar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* ── Members List ── */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay miembros registrados.
            </p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => {
                const isProtected = member.membershipRole === "OWNER"
                return (
                  <div
                    key={member.membershipId}
                    className="flex items-center gap-3 rounded-lg border p-3 w-full min-w-0 overflow-hidden transition-colors hover:bg-muted/30"
                  >
                    <div className="flex size-9 items-center justify-center rounded-full bg-muted flex-shrink-0">
                      <RoleIcon role={member.membershipRole} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium break-words">
                          {member.username}
                        </span>
                        <Badge
                          className={`text-[10px] px-1.5 py-0 ${
                            ROLE_COLORS[member.membershipRole] ??
                            ROLE_COLORS.MEMBER
                          }`}
                        >
                          {ROLE_LABELS[member.membershipRole] ??
                            member.membershipRole}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground break-words">
                        {member.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Move button — only for SUPER_ADMIN_GLOBAL and non-OWNER */}
                      {isSuperAdminGlobal && !isProtected && (
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-sky-600 cursor-pointer transition-colors"
                                onClick={() => setMoveDialog(member)}
                                aria-label={`Mover a ${member.username}`}
                              >
                                <ArrowRightLeft className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Mover a otra organización
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {/* Remove button */}
                      {!isProtected && (
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                                onClick={() => setConfirmDialog(member)}
                                aria-label={`Desvincular a ${member.username}`}
                              >
                                <UserMinus className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Desvincular</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Remove member dialog ── */}
      <Dialog
        open={confirmDialog !== null}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <UserMinus className="h-5 w-5 flex-shrink-0" />
              Desvincular miembro
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de desvincular a{" "}
              <strong>{confirmDialog?.username}</strong> (
              {confirmDialog?.email}) de la organización{" "}
              <strong>{organizationName}</strong>?
              <br />
              <span className="mt-2 block text-xs text-muted-foreground">
                El usuario perderá acceso a esta organización. Sus datos
                (ventas, entradas, registros) permanecerán intactos para
                auditoría.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(null)}
              disabled={removing}
              className="cursor-pointer w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removing}
              className="cursor-pointer gap-2 w-full sm:w-auto"
            >
              {removing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Desvinculando...
                </>
              ) : (
                "Desvincular"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add member dialog ── */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogOpen(false)
            setAddEmail("")
            setAddRole("MEMBER")
          }
        }}
      >
        <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 flex-shrink-0 text-sky-600" />
              Agregar miembro
            </DialogTitle>
            <DialogDescription>
              Ingresa el email de un usuario ya registrado para agregarlo a{" "}
              <strong>{organizationName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-email">Email del usuario</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && addEmail.trim()) {
                    e.preventDefault()
                    void handleAdd()
                  }
                }}
                disabled={adding}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-role">Rol en la organización</Label>
              <Select
                value={addRole}
                onValueChange={setAddRole}
                disabled={adding}
              >
                <SelectTrigger id="add-role" className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN" className="cursor-pointer">
                    Administrador
                  </SelectItem>
                  <SelectItem value="EMPLOYEE" className="cursor-pointer">
                    Empleado
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={adding}
              className="cursor-pointer w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              disabled={adding || !addEmail.trim()}
              className="cursor-pointer gap-2 w-full sm:w-auto"
            >
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Agregando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Agregar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Move member dialog (SUPER_ADMIN_GLOBAL only) ── */}
      <Dialog
        open={moveDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMoveDialog(null)
            setMoveToOrgId("")
            setMoveRole("MEMBER")
            setMoveReason("")
          }
        }}
      >
        <DialogContent className="sm:max-w-lg w-[calc(100vw-2rem)] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 flex-shrink-0 text-sky-600" />
              Mover usuario entre organizaciones
            </DialogTitle>
            <DialogDescription>
              Mover a <strong>{moveDialog?.username}</strong> (
              {moveDialog?.email}) desde{" "}
              <strong>{organizationName}</strong> a otra organización. Se
              desactivará la membresía actual y se creará una nueva.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="move-org">Organización destino</Label>
              <Select
                value={moveToOrgId}
                onValueChange={setMoveToOrgId}
                disabled={moving}
              >
                <SelectTrigger id="move-org" className="cursor-pointer">
                  <SelectValue placeholder="Selecciona organización" />
                </SelectTrigger>
                <SelectContent>
                  {otherOrgs.map((org) => (
                    <SelectItem
                      key={org.id}
                      value={String(org.id)}
                      className="cursor-pointer"
                    >
                      {org.name}
                    </SelectItem>
                  ))}
                  {otherOrgs.length === 0 && (
                    <SelectItem value="" disabled>
                      No hay otras organizaciones
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="move-role">Rol en la nueva organización</Label>
              <Select
                value={moveRole}
                onValueChange={setMoveRole}
                disabled={moving}
              >
                <SelectTrigger id="move-role" className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN" className="cursor-pointer">
                    Administrador
                  </SelectItem>
                  <SelectItem value="EMPLOYEE" className="cursor-pointer">
                    Empleado
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="move-reason">
                Motivo{" "}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </Label>
              <textarea
                id="move-reason"
                placeholder="Ej: Transferencia al área de ventas..."
                value={moveReason}
                onChange={(e) => setMoveReason(e.target.value)}
                disabled={moving}
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/30">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <strong>Importante:</strong> El usuario perderá acceso a{" "}
                {organizationName} y será agregado a la organización destino
                sin datos previos. Los registros históricos se conservan para
                auditoría.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setMoveDialog(null)}
              disabled={moving}
              className="cursor-pointer w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMove}
              disabled={moving || !moveToOrgId}
              className="cursor-pointer gap-2 w-full sm:w-auto"
            >
              {moving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Moviendo...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4" />
                  Mover usuario
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
