"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ColumnDef, Row } from "@tanstack/react-table";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

import type { DashboardUser, UserRole } from "./users.api";
import { updateUserAdmin } from "./users.api";

export type UserRow = DashboardUser & { createdAt: string };

type ColumnOptions = {
  canManageUsers: boolean;
  isGlobalSuperAdmin: boolean;
  organizationId: number | null;
  onUserUpdated: (user: DashboardUser) => void;
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "EMPLOYEE", label: "Empleado" },
];

const STATUS_OPTIONS: { value: "ACTIVO" | "INACTIVO"; label: string }[] = [
  { value: "ACTIVO", label: "Activo" },
  { value: "INACTIVO", label: "Inactivo" },
];

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function buildUserColumns({
  canManageUsers,
  isGlobalSuperAdmin,
  organizationId,
  onUserUpdated,
}: ColumnOptions): ColumnDef<UserRow>[] {
  const baseColumns: ColumnDef<UserRow>[] = [
    {
      accessorKey: "username",
      filterFn: "includesString",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Usuario
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "email",
      filterFn: "includesString",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Correo
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "role",
      filterFn: "includesString",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Rol
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "status",
      filterFn: "includesString",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Estado
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "createdAt",
      filterFn: "includesString",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Creado
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span>{formatDate(row.original.createdAt)}</span>,
    },
  ];

  if (!canManageUsers) {
    return baseColumns;
  }

  return [
    ...baseColumns,
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <ManageUserActions
          row={row}
          isGlobalSuperAdmin={isGlobalSuperAdmin}
          organizationId={organizationId}
          onUserUpdated={onUserUpdated}
        />
      ),
    },
  ];
}

function ManageUserActions({
  row,
  isGlobalSuperAdmin,
  organizationId,
  onUserUpdated,
}: {
  row: Row<UserRow>;
  isGlobalSuperAdmin: boolean;
  organizationId: number | null;
  onUserUpdated: (user: DashboardUser) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [roleValue, setRoleValue] = useState<UserRole>(
    row.original.role as UserRole,
  );
  const [statusValue, setStatusValue] = useState<"ACTIVO" | "INACTIVO">(
    (row.original.status as "ACTIVO" | "INACTIVO") ?? "ACTIVO",
  );

  const availableRoles = ROLE_OPTIONS;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setRoleValue(row.original.role as UserRole);
      setStatusValue(
        (row.original.status as "ACTIVO" | "INACTIVO") ?? "ACTIVO",
      );
    }
    setIsOpen(open);
  };

  const handleSubmit = async () => {
    const payload: { role?: UserRole; status?: "ACTIVO" | "INACTIVO" } = {};
    if (roleValue !== row.original.role) {
      payload.role = roleValue;
    }
    if (statusValue !== row.original.status) {
      payload.status = statusValue;
    }

    if (!payload.role && !payload.status) {
      toast.info("No hay cambios para guardar.");
      return;
    }

    try {
      setIsSaving(true);
      const updated = await updateUserAdmin(
        row.original.id,
        payload,
        organizationId,
      );
      onUserUpdated(updated);
      toast.success("Usuario actualizado.");
      setIsOpen(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el usuario.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar rol y estado</DialogTitle>
          <DialogDescription>
            Solo los super administradores pueden modificar estos valores.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="user-role-select">Rol</Label>
            <Select
              value={roleValue}
              onValueChange={(value) => setRoleValue(value as UserRole)}
            >
              <SelectTrigger id="user-role-select">
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-status-select">Estado</Label>
            <Select
              value={statusValue}
              onValueChange={(value) =>
                setStatusValue(value as "ACTIVO" | "INACTIVO")
              }
            >
              <SelectTrigger id="user-status-select">
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
