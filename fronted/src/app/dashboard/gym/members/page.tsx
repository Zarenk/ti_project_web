"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Users } from "lucide-react";
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
  DialogTrigger,
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
import { useDebounce } from "@/app/hooks/useDebounce";

import {
  getMembers,
  createMember,
  updateMember,
  deleteMember,
  type GymMember,
  type PaginatedResponse,
} from "../gym.api";

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dni: string;
  dateOfBirth: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
};

const emptyForm: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dni: "",
  dateOfBirth: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  notes: "",
};

export default function GymMembersPage() {
  const { selection } = useTenantSelection();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchTerm, 400);

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<GymMember | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data = { items: [], total: 0, page: 1, pageSize: 20 }, isLoading: loading } = useQuery({
    queryKey: [...queryKeys.gym.members(selection.orgId, selection.companyId), { search: debouncedSearch, status: statusFilter, page }],
    queryFn: async () => {
      return getMembers({
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        page,
        pageSize: 20,
      });
    },
    enabled: selection.orgId !== null,
  });

  const invalidateMembers = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.gym.members(selection.orgId, selection.companyId) });
  };

  const openCreate = () => {
    setEditingMember(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (member: GymMember) => {
    setEditingMember(member);
    setForm({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email ?? "",
      phone: member.phone ?? "",
      dni: member.dni ?? "",
      dateOfBirth: member.dateOfBirth
        ? member.dateOfBirth.slice(0, 10)
        : "",
      emergencyContactName: member.emergencyContactName ?? "",
      emergencyContactPhone: member.emergencyContactPhone ?? "",
      notes: member.notes ?? "",
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("Nombre y apellido son requeridos");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      };
      if (form.email) payload.email = form.email.trim();
      if (form.phone) payload.phone = form.phone.trim();
      if (form.dni) payload.dni = form.dni.trim();
      if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
      if (form.emergencyContactName)
        payload.emergencyContactName = form.emergencyContactName.trim();
      if (form.emergencyContactPhone)
        payload.emergencyContactPhone = form.emergencyContactPhone.trim();
      if (form.notes) payload.notes = form.notes.trim();

      if (editingMember) {
        await updateMember(editingMember.id, payload);
        toast.success("Miembro actualizado");
      } else {
        await createMember(payload as Parameters<typeof createMember>[0]);
        toast.success("Miembro registrado");
      }
      setShowDialog(false);
      invalidateMembers();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al guardar miembro",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member: GymMember) => {
    if (
      !confirm(
        `¿Desactivar a ${member.firstName} ${member.lastName}?`,
      )
    )
      return;
    try {
      await deleteMember(member.id);
      toast.success("Miembro desactivado");
      invalidateMembers();
    } catch {
      toast.error("Error al desactivar miembro");
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("es-PE");
  };

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Miembros</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Gestiona los miembros del gimnasio
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Miembro
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, DNI, email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ACTIVE">Activos</SelectItem>
            <SelectItem value="INACTIVE">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading && data.items.length === 0 ? (
        <TablePageSkeleton
          title={false}
          filters={2}
          columns={6}
          rows={8}
          actions={false}
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Membresía</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No se encontraron miembros.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {m.firstName} {m.lastName}
                      </TableCell>
                      <TableCell>{m.dni || "-"}</TableCell>
                      <TableCell>{m.email || "-"}</TableCell>
                      <TableCell>{m.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            m.status === "ACTIVE" ? "default" : "secondary"
                          }
                        >
                          {m.status === "ACTIVE" ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {m.memberships && m.memberships.length > 0 ? (
                          <Badge variant="outline">
                            {m.memberships[0].planName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Sin membresía
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(m)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDelete(m)}
                          >
                            Desactivar
                          </Button>
                        </div>
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
              {data.total} miembro{data.total !== 1 ? "s" : ""} en total
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

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMember ? "Editar Miembro" : "Nuevo Miembro"}
            </DialogTitle>
            <DialogDescription>
              {editingMember
                ? "Actualiza los datos del miembro"
                : "Registra un nuevo miembro del gimnasio"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <Label>Apellido *</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                  placeholder="Apellido"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>DNI</Label>
                <Input
                  value={form.dni}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dni: e.target.value }))
                  }
                  placeholder="12345678"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha de nacimiento</Label>
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dateOfBirth: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="email@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="999 999 999"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contacto de emergencia</Label>
                <Input
                  value={form.emergencyContactName}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      emergencyContactName: e.target.value,
                    }))
                  }
                  placeholder="Nombre del contacto"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono de emergencia</Label>
                <Input
                  value={form.emergencyContactPhone}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      emergencyContactPhone: e.target.value,
                    }))
                  }
                  placeholder="999 999 999"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Observaciones adicionales"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving
                ? "Guardando..."
                : editingMember
                  ? "Guardar Cambios"
                  : "Registrar Miembro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
