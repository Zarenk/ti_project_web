"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  Plus,
  Search,
  Play,
  Pause,
  XCircle,
  RefreshCw,
  RotateCcw,
  Zap,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TablePageSkeleton } from "@/components/table-page-skeleton";
import { useTenantSelection } from "@/context/tenant-selection-context";

import {
  getMemberships,
  createMembership,
  getMembershipEvents,
  applyMembershipEvent,
  getMembers,
  type GymMembership,
  type GymMember,
  type PaginatedResponse,
} from "../gym.api";

// ── Status labels & colors ───────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  PROSPECT: "Prospecto",
  TRIAL: "Prueba",
  ACTIVE: "Activa",
  PAST_DUE: "Vencida (pago)",
  FROZEN: "Congelada",
  PENDING_CANCEL: "Cancelación pendiente",
  CANCELLED: "Cancelada",
  EXPIRED: "Expirada",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PROSPECT: "outline",
  TRIAL: "secondary",
  ACTIVE: "default",
  PAST_DUE: "destructive",
  FROZEN: "secondary",
  PENDING_CANCEL: "destructive",
  CANCELLED: "destructive",
  EXPIRED: "secondary",
};

const EVENT_LABELS: Record<string, { label: string; icon: typeof Play }> = {
  START_TRIAL: { label: "Iniciar prueba", icon: Play },
  PURCHASE: { label: "Comprar", icon: CreditCard },
  PAYMENT_SUCCESS: { label: "Pago exitoso", icon: Zap },
  PAYMENT_FAILED: { label: "Pago fallido", icon: XCircle },
  FREEZE: { label: "Congelar", icon: Pause },
  UNFREEZE: { label: "Descongelar", icon: Play },
  REQUEST_CANCEL: { label: "Solicitar cancelación", icon: XCircle },
  CONFIRM_CANCEL: { label: "Confirmar cancelación", icon: XCircle },
  REVOKE_CANCEL: { label: "Revocar cancelación", icon: RotateCcw },
  EXPIRE: { label: "Expirar", icon: XCircle },
  RENEW: { label: "Renovar", icon: RefreshCw },
  REACTIVATE: { label: "Reactivar", icon: RefreshCw },
};

export default function GymMembershipsPage() {
  const { selection } = useTenantSelection();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [members, setMembers] = useState<GymMember[]>([]);
  const [createForm, setCreateForm] = useState({
    memberId: "",
    planName: "",
    startDate: "",
    endDate: "",
    price: "",
    maxFreezes: "2",
    gracePeriodDays: "7",
  });
  const [savingCreate, setSavingCreate] = useState(false);

  // Transition dialog
  const [transitionTarget, setTransitionTarget] =
    useState<GymMembership | null>(null);
  const [validEvents, setValidEvents] = useState<string[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [applyingEvent, setApplyingEvent] = useState(false);

  const { data = { items: [], total: 0, page: 1, pageSize: 20 }, isLoading: loading } = useQuery({
    queryKey: [...queryKeys.gym.memberships(selection.orgId, selection.companyId), { status: statusFilter, page }],
    queryFn: async () => {
      return getMemberships({
        status: statusFilter !== "all" ? statusFilter : undefined,
        page,
        pageSize: 20,
      });
    },
    enabled: selection.orgId !== null,
  });

  const invalidateMemberships = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.gym.memberships(selection.orgId, selection.companyId) });
  };

  // ── Create ───────────────────────────────────────────────────────────────

  const openCreate = async () => {
    setShowCreate(true);
    try {
      const res = await getMembers({ pageSize: 500, status: "ACTIVE" });
      setMembers(res.items);
    } catch {
      toast.error("Error al cargar miembros");
    }
  };

  const handleCreate = async () => {
    if (
      !createForm.memberId ||
      !createForm.planName.trim() ||
      !createForm.startDate ||
      !createForm.endDate ||
      !createForm.price
    ) {
      toast.error("Completa todos los campos requeridos");
      return;
    }
    setSavingCreate(true);
    try {
      await createMembership({
        memberId: parseInt(createForm.memberId, 10),
        planName: createForm.planName.trim(),
        startDate: createForm.startDate,
        endDate: createForm.endDate,
        price: parseFloat(createForm.price),
        maxFreezes: parseInt(createForm.maxFreezes, 10) || 0,
        gracePeriodDays: parseInt(createForm.gracePeriodDays, 10) || 7,
      });
      toast.success("Membresía creada");
      setShowCreate(false);
      setCreateForm({
        memberId: "",
        planName: "",
        startDate: "",
        endDate: "",
        price: "",
        maxFreezes: "2",
        gracePeriodDays: "7",
      });
      invalidateMemberships();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al crear membresía",
      );
    } finally {
      setSavingCreate(false);
    }
  };

  // ── Transitions ──────────────────────────────────────────────────────────

  const openTransition = async (membership: GymMembership) => {
    setTransitionTarget(membership);
    setLoadingEvents(true);
    try {
      const result = await getMembershipEvents(membership.id);
      setValidEvents(result.validEvents);
    } catch {
      toast.error("Error al cargar eventos");
      setValidEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleApplyEvent = async (event: string) => {
    if (!transitionTarget) return;
    setApplyingEvent(true);
    try {
      const result = await applyMembershipEvent(transitionTarget.id, event);
      toast.success(
        `${STATUS_LABELS[result.previousStatus] || result.previousStatus} → ${STATUS_LABELS[result.status] || result.status}`,
      );
      setTransitionTarget(null);
      invalidateMemberships();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al aplicar evento",
      );
    } finally {
      setApplyingEvent(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("es-PE");
  };

  const formatCurrency = (amount: number) =>
    `S/ ${amount.toFixed(2)}`;

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Membresías</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Administra planes y estados de membresía
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Membresía
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading && data.items.length === 0 ? (
        <TablePageSkeleton
          title={false}
          filters={1}
          columns={7}
          rows={8}
          actions={false}
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Miembro</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No se encontraron membresías.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((ms) => (
                    <TableRow key={ms.id}>
                      <TableCell className="font-medium">
                        {ms.member
                          ? `${ms.member.firstName} ${ms.member.lastName}`
                          : `ID ${ms.memberId}`}
                      </TableCell>
                      <TableCell>{ms.planName}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[ms.status] || "outline"}>
                          {STATUS_LABELS[ms.status] || ms.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(ms.startDate)}</TableCell>
                      <TableCell>{formatDate(ms.endDate)}</TableCell>
                      <TableCell>{formatCurrency(ms.price)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openTransition(ms)}
                        >
                          Transición
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {data.total} membresía{data.total !== 1 ? "s" : ""} en total
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="flex items-center px-2 text-sm">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Membresía</DialogTitle>
            <DialogDescription>
              Asigna un plan de membresía a un miembro
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Miembro *</Label>
              <Select
                value={createForm.memberId}
                onValueChange={(v) =>
                  setCreateForm((f) => ({ ...f, memberId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un miembro" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.firstName} {m.lastName}
                      {m.dni ? ` (${m.dni})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nombre del plan *</Label>
              <Input
                value={createForm.planName}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, planName: e.target.value }))
                }
                placeholder="Ej: Plan Mensual, Trimestral, Anual"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha inicio *</Label>
                <Input
                  type="date"
                  value={createForm.startDate}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha fin *</Label>
                <Input
                  type="date"
                  value={createForm.endDate}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Precio (S/) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={createForm.price}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, price: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Máx. congelaciones</Label>
                <Input
                  type="number"
                  min="0"
                  value={createForm.maxFreezes}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, maxFreezes: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Días de gracia</Label>
                <Input
                  type="number"
                  min="0"
                  value={createForm.gracePeriodDays}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      gracePeriodDays: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              disabled={savingCreate}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={savingCreate}>
              {savingCreate ? "Creando..." : "Crear Membresía"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transition Dialog */}
      <Dialog
        open={!!transitionTarget}
        onOpenChange={(open) => !open && setTransitionTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transición de Estado</DialogTitle>
            <DialogDescription>
              {transitionTarget && (
                <>
                  <span className="font-medium">
                    {transitionTarget.member
                      ? `${transitionTarget.member.firstName} ${transitionTarget.member.lastName}`
                      : `Membresía #${transitionTarget.id}`}
                  </span>
                  {" — "}
                  <Badge
                    variant={
                      STATUS_VARIANT[transitionTarget.status] || "outline"
                    }
                  >
                    {STATUS_LABELS[transitionTarget.status] ||
                      transitionTarget.status}
                  </Badge>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingEvents ? (
              <p className="text-center text-sm text-muted-foreground">
                Cargando eventos disponibles...
              </p>
            ) : validEvents.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                No hay transiciones disponibles desde este estado.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {validEvents.map((evt) => {
                  const info = EVENT_LABELS[evt] || {
                    label: evt,
                    icon: Zap,
                  };
                  const Icon = info.icon;
                  return (
                    <Button
                      key={evt}
                      variant="outline"
                      className="justify-start gap-2"
                      disabled={applyingEvent}
                      onClick={() => handleApplyEvent(evt)}
                    >
                      <Icon className="h-4 w-4" />
                      {info.label}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
