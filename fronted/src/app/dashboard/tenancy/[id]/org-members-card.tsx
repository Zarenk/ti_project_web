"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Shield, ShieldAlert, Crown, UserMinus, UsersRound } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getOrganizationMembers,
  removeMemberFromOrg,
  type OrgMember,
} from "../tenancy.api"

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Dueño",
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MEMBER: "Miembro",
  VIEWER: "Visor",
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  SUPER_ADMIN: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  ADMIN: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  MEMBER: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  VIEWER: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
}

function RoleIcon({ role }: { role: string }) {
  if (role === "OWNER") return <Crown className="size-3.5" />
  if (role === "SUPER_ADMIN") return <ShieldAlert className="size-3.5" />
  return <Shield className="size-3.5" />
}

interface OrgMembersCardProps {
  organizationId: number
  organizationName: string
}

export function OrgMembersCard({ organizationId, organizationName }: OrgMembersCardProps) {
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDialog, setConfirmDialog] = useState<OrgMember | null>(null)
  const [removing, setRemoving] = useState(false)

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

  const handleRemove = useCallback(async () => {
    if (!confirmDialog) return
    setRemoving(true)
    try {
      await removeMemberFromOrg(organizationId, confirmDialog.userId)
      toast.success(`${confirmDialog.username} fue desvinculado de la organización.`)
      setConfirmDialog(null)
      void loadMembers()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al desvincular"
      toast.error(msg)
    } finally {
      setRemoving(false)
    }
  }, [confirmDialog, organizationId, loadMembers])

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
            <UsersRound className="size-5 text-sky-600 dark:text-slate-100" />
            Miembros de la organización
            {!loading && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {members.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                            ROLE_COLORS[member.membershipRole] ?? ROLE_COLORS.MEMBER
                          }`}
                        >
                          {ROLE_LABELS[member.membershipRole] ?? member.membershipRole}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground break-words">
                        {member.email}
                      </p>
                    </div>
                    {!isProtected && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                        onClick={() => setConfirmDialog(member)}
                        aria-label={`Desvincular a ${member.username}`}
                      >
                        <UserMinus className="size-4" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmDialog !== null} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <UserMinus className="h-5 w-5 flex-shrink-0" />
              Desvincular miembro
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de desvincular a{" "}
              <strong>{confirmDialog?.username}</strong> ({confirmDialog?.email}) de la
              organización <strong>{organizationName}</strong>?
              <br />
              <span className="mt-2 block text-xs text-muted-foreground">
                El usuario perderá acceso a esta organización y sus datos permanecerán intactos.
                Podrá unirse a otra organización o crear la suya propia.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(null)}
              disabled={removing}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removing}
              className="cursor-pointer gap-2"
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
    </>
  )
}
