"use client"

import { ReactNode, useEffect, useMemo, useState } from "react";
import RequireAdmin from "@/components/require-admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { startOfDay, endOfDay, format } from "date-fns";
import { getAuthHeaders } from "@/utils/auth-token";
import { formatInTimeZone } from "date-fns-tz";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import {
  listOrganizationsWithCompanies,
  OrganizationCompaniesOverview,
} from "@/app/dashboard/tenancy/tenancy.api";

import { BACKEND_URL } from "@/lib/utils";

interface AuditLog {
  id: string;
  actorEmail: string | null;
  entityType: string | null;
  entityId: string | null;
  action: string;
  summary: string | null;
  diff: any;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
  organization?: { id: number; name: string | null } | null;
  company?: { id: number; name: string | null } | null;
}

export default function Actividad() {
  const { role } = useAuth();
  const isSuperAdmin = role === "SUPER_ADMIN_GLOBAL";
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [search, setSearch] = useState("");
  const [specificDate, setSpecificDate] = useState<Date | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [orgsError, setOrgsError] = useState<string | null>(null);
  const [orgOptions, setOrgOptions] = useState<OrganizationCompaniesOverview[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [hideContextUpdates, setHideContextUpdates] = useState(true);

  const formatTimestamp = (value: string) =>
    formatInTimeZone(new Date(value), "America/Lima", "yyyy-MM-dd HH:mm");

  const ActivityDetailDialog = ({ log, trigger }: { log: AuditLog; trigger: ReactNode }) => (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de actividad</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">IP:</span> {log.ip || "-"}
          </div>
          <div>
            <span className="font-medium">User Agent:</span> {log.userAgent || "-"}
          </div>
          {log.diff?.message && (
            <div>
              <span className="font-medium">Mensaje:</span> {log.diff.message}
            </div>
          )}
        </div>
        {log.diff && (
          <pre className="mt-4 max-h-60 overflow-auto rounded bg-slate-100 p-2 text-xs dark:bg-slate-800">
            {JSON.stringify(log.diff, null, 2)}
          </pre>
        )}
      </DialogContent>
    </Dialog>
  );

  const handleSpecificDateSelect = (date: Date | undefined) => {
    if (!date) {
      setSpecificDate(undefined);
      return;
    }
    setSpecificDate(startOfDay(date));
    setPage(1);
  };

 const handleSpecificDateClear = () => {
   setSpecificDate(undefined);
   setPage(1);
 };

const matchesCategory = (log: AuditLog, filter: string) => {
  if (filter === "all") return true;
  const summary = (log.summary ?? "").toLowerCase();
  switch (filter) {
    case "created":
      return summary.includes("cre") || summary.includes("ingres");
    case "updates":
      return summary.includes("modific") || summary.includes("actualiz");
    case "deleted":
      return summary.includes("elim");
    case "sales":
      return summary.includes("venta") || summary.includes("factura");
    case "inventory":
      return summary.includes("invent") || summary.includes("almac");
    default:
      return true;
  }
};

const isContextUpdateLog = (log: AuditLog) => {
  const summary = (log.summary ?? "").toLowerCase();
  if (!summary) return false;
  if (summary.includes("actualizo el contexto")) return true;
  if (summary.includes("contexto a org")) return true;
  if (summary.includes("actualizó el contexto")) return true;
  return false;
};

  useEffect(() => {
    if (!isSuperAdmin) {
      setOrgOptions([]);
      setSelectedOrgId("");
      setSelectedCompanyId("");
      return;
    }

    let cancelled = false;
    const loadOrgs = async () => {
      setOrgsLoading(true);
      try {
        const data = await listOrganizationsWithCompanies();
        if (!cancelled) {
          setOrgOptions(data);
          setOrgsError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setOrgOptions([]);
          setOrgsError("No se pudieron obtener las organizaciones");
        }
      } finally {
        if (!cancelled) {
          setOrgsLoading(false);
        }
      }
    };

    loadOrgs();
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  const companyOptions = useMemo(() => {
    if (!selectedOrgId) return [];
    const org = orgOptions.find((org) => String(org.id) === String(selectedOrgId));
    return org?.companies ?? [];
  }, [orgOptions, selectedOrgId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const overrides =
          isSuperAdmin && selectedOrgId
            ? {
                orgId: Number(selectedOrgId),
                companyId: selectedCompanyId ? Number(selectedCompanyId) : undefined,
              }
            : undefined;
        const headers = await getAuthHeaders(overrides);
        if (!("Authorization" in headers)) {
          setLogs([]);
          setTotal(0);
          setError(null);
          return;
        }
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (search) params.append("q", search);
        if (specificDate) {
          params.append("dateFrom", startOfDay(specificDate).toISOString());
          params.append("dateTo", endOfDay(specificDate).toISOString());
        }
        if (hideContextUpdates) {
          params.append("excludeContextUpdates", "true");
        }
        const res = await fetch(
          `${BACKEND_URL}/api/activity?${params.toString()}`,
          {
            headers,
            credentials: "include",
          },
        );
        if (res.status === 401) {
          setLogs([]);
          setTotal(0);
          setError(null);
        } else if (res.status === 403) {
          setError("No tienes permisos para ver esta sección.");
          setLogs([]);
          setTotal(0);
        } else if (!res.ok) {
          throw new Error("Error al cargar");
        } else {
          const json = await res.json();
          setLogs(json.items);
          setTotal(json.total);
          setError(null);
        }
      } catch (e) {
        setError("No se pudo cargar la actividad");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page, search, specificDate, categoryFilter, isSuperAdmin, selectedOrgId, selectedCompanyId, hideContextUpdates]);

  const filteredLogs = logs.filter(
    (log) =>
      matchesCategory(log, categoryFilter) &&
      (!hideContextUpdates || !isContextUpdateLog(log)),
  );
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <RequireAdmin>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Buscar por usuario, entidad o acción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:max-w-sm"
            />
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Filtrar categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las actividades</SelectItem>
                <SelectItem value="created">Ingresos / creaciones</SelectItem>
                <SelectItem value="updates">Modificaciones</SelectItem>
                <SelectItem value="deleted">Eliminaciones</SelectItem>
                <SelectItem value="sales">Ventas / facturación</SelectItem>
                <SelectItem value="inventory">Inventario / almacén</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setSearch("")}>
              Limpiar búsqueda
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start sm:w-[220px]"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {specificDate
                    ? format(specificDate, "dd/MM/yyyy")
                    : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={specificDate}
                  onSelect={handleSpecificDateSelect}
                  initialFocus
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
            {specificDate ? (
              <Button variant="ghost" size="sm" onClick={handleSpecificDateClear}>
                Limpiar fecha
              </Button>
            ) : null}
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Switch
                id="hide-context-updates"
                checked={hideContextUpdates}
                onCheckedChange={(checked) => {
                  setHideContextUpdates(checked);
                  setPage(1);
                }}
                aria-label="Ocultar actualizaciones de contexto"
              />
              <Label htmlFor="hide-context-updates" className="text-xs font-medium">
                Ocultar actualizaciones de contexto
              </Label>
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {isSuperAdmin && orgsError && (
          <p className="text-sm text-red-600">{orgsError}</p>
        )}
        {isSuperAdmin && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={selectedOrgId || "all"}
              onValueChange={(value) => {
                const nextValue = value === "all" ? "" : value;
                setSelectedOrgId(nextValue);
                setSelectedCompanyId("");
                setPage(1);
              }}
              disabled={orgsLoading}
            >
              <SelectTrigger className="w-full sm:w-[260px]">
                <SelectValue
                  placeholder={
                    orgsLoading ? "Cargando organizaciones..." : "Todas las organizaciones"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las organizaciones</SelectItem>
                {orgOptions.map((org) => (
                  <SelectItem key={org.id} value={String(org.id)}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedCompanyId || "all"}
              onValueChange={(value) => {
                const nextValue = value === "all" ? "" : value;
                setSelectedCompanyId(nextValue);
                setPage(1);
              }}
              disabled={!selectedOrgId || companyOptions.length === 0}
            >
              <SelectTrigger className="w-full sm:w-[260px]">
                <SelectValue
                  placeholder={
                    !selectedOrgId
                      ? "Selecciona una organización"
                      : companyOptions.length === 0
                        ? "Sin empresas disponibles"
                        : "Todas las empresas"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las empresas</SelectItem>
                {companyOptions.map((company) => (
                  <SelectItem key={company.id} value={String(company.id)}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {loading ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : filteredLogs.length === 0 ? (
          <p className="text-sm text-slate-500">Sin actividad registrada.</p>
        ) : (
          <div className="space-y-2">
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Accion</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Organizaci&oacute;n</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Resumen</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatTimestamp(log.createdAt)}</TableCell>
                      <TableCell>{log.actorEmail || "-"}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.entityType || "-"}</TableCell>
                      <TableCell>{log.entityId || "-"}</TableCell>
                      <TableCell>{log.organization?.name ?? "-"}</TableCell>
                      <TableCell>{log.company?.name ?? "-"}</TableCell>
                      <TableCell>{log.summary || "-"}</TableCell>
                      <TableCell>
                        <ActivityDetailDialog
                          log={log}
                          trigger={
                            <Button variant="outline" size="sm">
                              Ver detalle
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 md:hidden">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="space-y-3 rounded-lg border bg-muted/30 p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Fecha/Hora</span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatTimestamp(log.createdAt)}
                    </span>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-foreground">Acci�n:</span>
                      <span className="text-right">{log.action}</span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-foreground">Usuario:</span>
                      <span className="truncate text-right">{log.actorEmail || "-"}</span>
                    </div>
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <span className="font-medium text-foreground">Entidad:</span>
                      <span className="text-right">{log.entityType || "-"}</span>
                    </div>
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <span className="font-medium text-foreground">ID:</span>
                      <span className="text-right">{log.entityId || "-"}</span>
                    </div>
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <span className="font-medium text-foreground">Organización:</span>
                      <span className="text-right">
                        {log.organization?.name ?? "-"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <span className="font-medium text-foreground">Empresa:</span>
                      <span className="text-right">
                        {log.company?.name ?? "-"}
                      </span>
                    </div>
                  </div>
                  {log.summary ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{log.summary}</p>
                  ) : null}
                  <ActivityDetailDialog
                    log={log}
                    trigger={
                      <Button variant="outline" size="sm" className="w-full">
                        Ver detalle
                      </Button>
                    }
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm text-slate-500">
                Página {page} de {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </RequireAdmin>
  );
}
