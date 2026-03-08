"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Loader2, MapPin, Plus, Search, X } from "lucide-react";

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
import { PageGuideButton } from "@/components/page-guide-dialog";
import { CLIENTS_GUIDE_STEPS } from "./clients-guide-steps";
import { queryKeys } from "@/lib/query-keys";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { lookupSunatDocument, type LookupResponse } from "@/app/dashboard/sales/sales.api";
import { cn } from "@/lib/utils";

const DOCUMENT_TYPES = [
  { value: "DNI", label: "DNI" },
  { value: "RUC", label: "RUC" },
  { value: "CE", label: "Carnet de Extranjería" },
  { value: "PASAPORTE", label: "Pasaporte" },
  { value: "OTRO", label: "Otro" },
];

export default function ClientsPage(): React.ReactElement {
  const { selection } = useTenantSelection();
  const queryClient = useQueryClient();

  const { data: clientsData = [], isLoading, error } = useQuery<ClientRow[]>({
    queryKey: queryKeys.clients.list(selection.orgId, selection.companyId),
    queryFn: async () => {
      const clients = await getClients();
      return clients
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
    },
    enabled: selection.orgId !== null,
  });

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientType, setNewClientType] = useState("DNI");
  const [newClientTypeNumber, setNewClientTypeNumber] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [sunatDialogOpen, setSunatDialogOpen] = useState(false);
  const [sunatSearchValue, setSunatSearchValue] = useState("");
  const [sunatSearchResult, setSunatSearchResult] = useState<LookupResponse | null>(null);
  const [sunatSearchError, setSunatSearchError] = useState<string | null>(null);
  const [sunatSearchLoading, setSunatSearchLoading] = useState(false);

  const invalidateClients = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.clients.root(selection.orgId, selection.companyId),
    });
  }, [queryClient, selection.orgId, selection.companyId]);

  const handleClientUpdated = useCallback(() => {
    invalidateClients();
  }, [invalidateClients]);

  const handleClientDeleted = useCallback(() => {
    invalidateClients();
  }, [invalidateClients]);

  const resetSunatDialog = () => {
    setSunatSearchValue("");
    setSunatSearchResult(null);
    setSunatSearchError(null);
    setSunatSearchLoading(false);
  };

  const handleSunatSearch = async () => {
    const value = sunatSearchValue.trim();
    if (!/^\d{8}$|^\d{11}$/.test(value)) {
      setSunatSearchError("Ingresa un DNI (8 dígitos) o RUC (11 dígitos).");
      setSunatSearchResult(null);
      return;
    }
    setSunatSearchLoading(true);
    setSunatSearchError(null);
    setSunatSearchResult(null);
    try {
      const result = await lookupSunatDocument(value);
      setSunatSearchResult(result);
    } catch (error) {
      setSunatSearchError(
        error instanceof Error ? error.message : "No se pudo consultar el documento.",
      );
    } finally {
      setSunatSearchLoading(false);
    }
  };

  const handleSelectSunatResult = (result: LookupResponse) => {
    if (result.name && !result.name.startsWith("(")) {
      setNewClientName(result.name);
    }
    setNewClientType(result.type === "RUC" ? "RUC" : "DNI");
    setNewClientTypeNumber(result.identifier ?? "");
    setNewClientAddress(result.address ?? "");
    setSunatDialogOpen(false);
    resetSunatDialog();
    toast.success("Datos aplicados desde SUNAT.");
  };

  const resetCreateDialog = () => {
    setNewClientName("");
    setNewClientType("DNI");
    setNewClientTypeNumber("");
    setNewClientAddress("");
  };

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
      await createClient({
        name: newClientName.trim(),
        type: newClientType,
        typeNumber: newClientTypeNumber.trim(),
        adress: newClientAddress.trim() || undefined,
      });

      toast.success("Cliente creado exitosamente");
      setShowCreateDialog(false);
      resetCreateDialog();
      invalidateClients();
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
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
            <PageGuideButton steps={CLIENTS_GUIDE_STEPS} tooltipLabel="Guía de clientes" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Gestiona los clientes de tu sistema
          </p>
        </div>
        <Dialog
          open={showCreateDialog}
          onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (!open) resetCreateDialog();
          }}
        >
          <DialogTrigger asChild>
            <Button className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] overflow-hidden border border-slate-200/70 bg-white dark:border-slate-800/70 dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Cliente</DialogTitle>
              <DialogDescription>
                Ingresa los datos del nuevo cliente
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 w-full min-w-0">
              <div className="space-y-2 w-full min-w-0">
                <Label htmlFor="client-name">Nombre completo *</Label>
                <div className="flex items-center gap-1.5 w-full min-w-0">
                  <Input
                    id="client-name"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Nombre del cliente"
                    className="flex-1 min-w-0"
                  />
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 cursor-pointer flex-shrink-0 text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                          onClick={() => {
                            setSunatSearchValue(newClientTypeNumber.trim());
                            setSunatSearchResult(null);
                            setSunatSearchError(null);
                            setSunatDialogOpen(true);
                          }}
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">Consulta SUNAT</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-type">Tipo de documento *</Label>
                <Select value={newClientType} onValueChange={setNewClientType}>
                  <SelectTrigger id="client-type" className="cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value} className="cursor-pointer">
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
              {newClientAddress && (
                <div className="space-y-2">
                  <Label htmlFor="client-address">Dirección</Label>
                  <Input
                    id="client-address"
                    value={newClientAddress}
                    onChange={(e) => setNewClientAddress(e.target.value)}
                    placeholder="Dirección del cliente"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => setShowCreateDialog(false)}
                disabled={createLoading}
              >
                Cancelar
              </Button>
              <Button className="cursor-pointer" onClick={handleCreateClient} disabled={createLoading}>
                {createLoading ? "Creando..." : "Crear Cliente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── SUNAT Lookup Dialog ── */}
        <Dialog
          open={sunatDialogOpen}
          onOpenChange={(open) => {
            setSunatDialogOpen(open);
            if (!open) resetSunatDialog();
          }}
        >
          <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
                Consulta SUNAT
              </DialogTitle>
              <DialogDescription>
                Ingresa un DNI (8 dígitos) o RUC (11 dígitos) para buscar datos del cliente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 w-full min-w-0">
              <div className="flex gap-2">
                <Input
                  value={sunatSearchValue}
                  onChange={(e) => setSunatSearchValue(e.target.value)}
                  placeholder="Ej: 20519857538"
                  className="font-mono flex-1 min-w-0"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleSunatSearch();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleSunatSearch}
                  disabled={sunatSearchLoading}
                  className="cursor-pointer flex-shrink-0"
                >
                  {sunatSearchLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {sunatSearchError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 w-full min-w-0 overflow-hidden">
                  <X className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive break-words">{sunatSearchError}</p>
                </div>
              )}

              {sunatSearchResult ? (
                <div
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer w-full min-w-0 overflow-hidden",
                    "transition-all duration-200 ease-out",
                    "hover:bg-primary/5 hover:border-primary/30 hover:shadow-sm",
                    "active:scale-[0.98]",
                    "animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
                  )}
                  onClick={() => handleSelectSunatResult(sunatSearchResult)}
                >
                  <div className="flex items-start justify-between gap-2 w-full min-w-0">
                    <div className="flex flex-col gap-1 w-full min-w-0 overflow-hidden">
                      <p className="text-sm font-semibold break-words leading-snug">
                        {sunatSearchResult.name}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground">
                        {sunatSearchResult.type}: {sunatSearchResult.identifier}
                      </p>
                    </div>
                    {sunatSearchResult.status && (
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 tracking-wide",
                          sunatSearchResult.status === "ACTIVO"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/15 text-red-600 dark:text-red-400",
                        )}
                      >
                        {sunatSearchResult.status}
                      </span>
                    )}
                  </div>

                  {sunatSearchResult.address && sunatSearchResult.address !== "—" && (
                    <div className="flex items-start gap-1.5 mt-2 pt-2 border-t w-full min-w-0 overflow-hidden">
                      <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground break-words leading-relaxed">
                        {sunatSearchResult.address}
                      </p>
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    Clic para aplicar datos al formulario
                  </p>
                </div>
              ) : !sunatSearchLoading && !sunatSearchError ? (
                <div className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border border-dashed text-center">
                  <Search className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Ingresa un documento y presiona buscar.
                  </p>
                </div>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && clientsData.length === 0 ? (
        <TablePageSkeleton title={false} filters={3} columns={5} rows={6} actions={false} />
      ) : (
        <ClientsDataTable
          data={clientsData}
          onClientUpdated={handleClientUpdated}
          onClientDeleted={handleClientDeleted}
        />
      )}

      {error && (
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : "No se pudieron cargar los clientes."}
        </p>
      )}
    </div>
  );
}
