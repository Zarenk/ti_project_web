"use client"

import { ReactNode, useEffect, useState } from "react";
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
import { getAuthHeaders } from "@/utils/auth-token";
import { formatInTimeZone } from "date-fns-tz";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

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
}

export default function Actividad() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (search) params.append("q", search);
        const res = await fetch(
          `${BACKEND_URL}/api/activity?${params.toString()}`,
          {
            headers,
            credentials: "include",
          },
        );
        if (res.status === 403) {
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
  }, [page, search]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <RequireAdmin>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por usuario, entidad o acción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Button variant="outline" onClick={() => setSearch("")}>
            Limpiar filtros
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : logs.length === 0 ? (
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
                    <TableHead>Resumen</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatTimestamp(log.createdAt)}</TableCell>
                      <TableCell>{log.actorEmail || "-"}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.entityType || "-"}</TableCell>
                      <TableCell>{log.entityId || "-"}</TableCell>
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
              {logs.map((log) => (
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
