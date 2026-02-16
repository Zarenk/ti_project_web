"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type ClientRow = {
  id: number;
  name: string;
  type: string;
  typeNumber: string;
  image?: string;
  createdAt: string;
};

type ColumnOptions = {
  onClientUpdated: (client: ClientRow) => void;
  onClientDeleted: (id: number) => void;
};

const DOCUMENT_TYPES = [
  { value: "DNI", label: "DNI" },
  { value: "RUC", label: "RUC" },
  { value: "CE", label: "Carnet de Extranjería" },
  { value: "PASAPORTE", label: "Pasaporte" },
  { value: "OTRO", label: "Otro" },
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

function EditClientDialog({ client, onClientUpdated }: { client: ClientRow; onClientUpdated: (client: ClientRow) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(client.name);
  const [type, setType] = useState(client.type || "DNI");
  const [typeNumber, setTypeNumber] = useState(client.typeNumber || "");

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    if (!typeNumber.trim()) {
      toast.error("El número de documento es requerido");
      return;
    }

    setLoading(true);
    try {
      const { updateClient } = await import("./clients.api");
      const updated = await updateClient(client.id.toString(), {
        name: name.trim(),
        type,
        typeNumber: typeNumber.trim(),
      });

      onClientUpdated({ ...client, ...updated });
      toast.success("Cliente actualizado");
      setOpen(false);
    } catch (error) {
      toast.error("Error al actualizar el cliente");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="border border-slate-200/70 bg-white dark:border-slate-800/70 dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>Actualiza la información del cliente</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre completo</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del cliente"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-type">Tipo de documento</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="edit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((dt) => (
                  <SelectItem key={dt.value} value={dt.value}>
                    {dt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-number">Número de documento</Label>
            <Input
              id="edit-number"
              value={typeNumber}
              onChange={(e) => setTypeNumber(e.target.value)}
              placeholder="Número de documento"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteClientDialog({ client, onClientDeleted }: { client: ClientRow; onClientDeleted: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { deleteClient } = await import("./clients.api");
      await deleteClient(client.id.toString());
      onClientDeleted(client.id);
      toast.success("Cliente eliminado");
      setOpen(false);
    } catch (error) {
      toast.error("Error al eliminar el cliente");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="border border-slate-200/70 bg-white dark:border-slate-800/70 dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle>Eliminar Cliente</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que deseas eliminar a <strong>{client.name}</strong>? Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function buildClientColumns({ onClientUpdated, onClientDeleted }: ColumnOptions): ColumnDef<ClientRow>[] {
  return [
    {
      accessorKey: "name",
      filterFn: "includesString",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nombre
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "type",
      filterFn: "includesString",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Tipo Doc.
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span>{row.original.type || "-"}</span>,
    },
    {
      accessorKey: "typeNumber",
      filterFn: "includesString",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Número Doc.
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span>{row.original.typeNumber || "-"}</span>,
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
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <EditClientDialog client={row.original} onClientUpdated={onClientUpdated} />
          <DeleteClientDialog client={row.original} onClientDeleted={onClientDeleted} />
        </div>
      ),
    },
  ];
}
