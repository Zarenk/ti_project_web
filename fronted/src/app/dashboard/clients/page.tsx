"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { ClientsDataTable } from "./data-table";
import { getClients, createClient } from "./clients.api";
import type { ClientRow } from "./columns";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { TablePageSkeleton } from "@/components/table-page-skeleton";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ClientsState = {
  data: ClientRow[];
  loading: boolean;
  error: string | null;
};

const DOCUMENT_TYPES = [
  { value: "DNI", label: "DNI" },
  { value: "RUC", label: "RUC" },
  { value: "CE", label: "Carnet de Extranjería" },
  { value: "PASAPORTE", label: "Pasaporte" },
  { value: "OTRO", label: "Otro" },
];

export default function ClientsPage(): React.ReactElement {
  const { version } = useTenantSelection();
  const [{ data, loading, error }, setState] = useState<ClientsState>({
    data: [],
    loading: true,
    error: null,
  });

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientType, setNewClientType] = useState("DNI");
  const [newClientTypeNumber, setNewClientTypeNumber] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadClients = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const clients = await getClients();
        if (!cancelled) {
          // Filter out clients with generic users
          const filteredClients = clients
            .filter((client: any) => {
              const username = client.user?.username?.trim() || "";
              return !username.startsWith("generic_");
            })
            .map((client: any) => ({
              id: client.id,
              name: client.name || "-",
              type: client.type || "-",
              typeNumber: client.typeNumber || "-",
              image: client.image,
              createdAt: client.createdAt || "",
            }));

          setState({ data: filteredClients, loading: false, error: null });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudieron cargar los clientes.";
        if (!cancelled) {
          setState({ data: [], loading: false, error: message });
          toast.error(message);
        }
      }
    };

    void loadClients();

    return () => {
      cancelled = true;
    };
  }, [version]);

  const handleClientUpdated = useCallback((updatedClient: ClientRow) => {
    setState((prev) => ({
      ...prev,
      data: prev.data.map((client) =>
        client.id === updatedClient.id ? updatedClient : client
      ),
    }));
  }, []);

  const handleClientDeleted = useCallback((id: number) => {
    setState((prev) => ({
      ...prev,
      data: prev.data.filter((client) => client.id !== id),
    }));
  }, []);

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    if (!newClientTypeNumber.trim()) {
      toast.error("El número de documento es requerido");
      return;
    }

    setCreateLoading(true);
    try {
      const newClient = await createClient({
        name: newClientName.trim(),
        type: newClientType,
        typeNumber: newClientTypeNumber.trim(),
      });

      setState((prev) => ({
        ...prev,
        data: [
          ...prev.data,
          {
            id: newClient.id,
            name: newClient.name,
            type: newClient.type || "-",
            typeNumber: newClient.typeNumber || "-",
            image: newClient.image,
            createdAt: newClient.createdAt || new Date().toISOString(),
          },
        ],
      }));

      toast.success("Cliente creado exitosamente");
      setShowCreateDialog(false);
      setNewClientName("");
      setNewClientType("DNI");
      setNewClientTypeNumber("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al crear el cliente";
      toast.error(message);
      console.error(err);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Gestiona los clientes de tu sistema
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="border border-slate-200/70 bg-white dark:border-slate-800/70 dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Cliente</DialogTitle>
              <DialogDescription>
                Ingresa los datos del nuevo cliente
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Nombre completo *</Label>
                <Input
                  id="client-name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Nombre del cliente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-type">Tipo de documento *</Label>
                <Select value={newClientType} onValueChange={setNewClientType}>
                  <SelectTrigger id="client-type">
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
                <Label htmlFor="client-number">Número de documento *</Label>
                <Input
                  id="client-number"
                  value={newClientTypeNumber}
                  onChange={(e) => setNewClientTypeNumber(e.target.value)}
                  placeholder="Número de documento"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={createLoading}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateClient} disabled={createLoading}>
                {createLoading ? "Creando..." : "Crear Cliente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading && data.length === 0 ? (
        <TablePageSkeleton title={false} filters={3} columns={5} rows={6} actions={false} />
      ) : (
        <ClientsDataTable
          data={data}
          onClientUpdated={handleClientUpdated}
          onClientDeleted={handleClientDeleted}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
