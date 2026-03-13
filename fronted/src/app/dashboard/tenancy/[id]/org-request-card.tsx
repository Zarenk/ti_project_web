"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Send, Building2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/context/auth-context"
import {
  createMembershipRequest,
  listOrganizations,
  type OrganizationResponse,
} from "../tenancy.api"

interface OrgRequestCardProps {
  currentOrganizationId: number
}

export function OrgRequestCard({ currentOrganizationId }: OrgRequestCardProps) {
  const { role } = useAuth()
  const isSuperAdmin =
    role === "SUPER_ADMIN_GLOBAL" || role === "SUPER_ADMIN_ORG"

  // Super admins manage directly — they don't need to request
  if (isSuperAdmin) return null

  return <OrgRequestCardInner currentOrganizationId={currentOrganizationId} />
}

function OrgRequestCardInner({
  currentOrganizationId,
}: {
  currentOrganizationId: number
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [orgs, setOrgs] = useState<OrganizationResponse[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    listOrganizations()
      .then(setOrgs)
      .catch(() => {})
  }, [])

  const otherOrgs = orgs.filter((o) => o.id !== currentOrganizationId)

  const handleSubmit = useCallback(async () => {
    if (!selectedOrgId) return
    setSubmitting(true)
    try {
      const result = await createMembershipRequest(
        Number(selectedOrgId),
        reason || undefined,
      )
      toast.success(
        `Solicitud enviada a ${result.organizationName}. Un administrador la revisará.`,
      )
      setDialogOpen(false)
      setSelectedOrgId("")
      setReason("")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al enviar solicitud",
      )
    } finally {
      setSubmitting(false)
    }
  }, [selectedOrgId, reason])

  if (otherOrgs.length === 0) return null

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
            <Building2 className="size-5 flex-shrink-0 text-sky-600 dark:text-slate-100" />
            <span className="break-words">Solicitar cambio de organización</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Si necesitas unirte a otra organización, envía una solicitud que
            será revisada por un administrador.
          </p>
          <Button
            variant="outline"
            className="cursor-pointer gap-2 w-full sm:w-auto"
            onClick={() => setDialogOpen(true)}
          >
            <Send className="size-4" />
            Enviar solicitud
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false)
            setSelectedOrgId("")
            setReason("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 flex-shrink-0 text-sky-600" />
              Solicitar unirse a organización
            </DialogTitle>
            <DialogDescription>
              Selecciona la organización a la que deseas unirte. Tu solicitud
              será revisada por un administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="req-org">Organización destino</Label>
              <Select
                value={selectedOrgId}
                onValueChange={setSelectedOrgId}
                disabled={submitting}
              >
                <SelectTrigger id="req-org" className="cursor-pointer">
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
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-reason">
                Motivo{" "}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </Label>
              <Input
                id="req-reason"
                placeholder="Ej: Necesito acceso para colaborar en..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
              className="cursor-pointer w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedOrgId}
              className="cursor-pointer gap-2 w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar solicitud
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
