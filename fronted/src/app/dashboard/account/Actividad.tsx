"use client"

import { useEffect, useState } from "react";
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Resumen</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {formatInTimeZone(
                        new Date(log.createdAt),
                        "America/Lima",
                        "yyyy-MM-dd HH:mm",
                      )}
                    </TableCell>
                    <TableCell>{log.actorEmail || "-"}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.entityType || "-"}</TableCell>
                    <TableCell>{log.entityId || "-"}</TableCell>
                    <TableCell>{log.summary || "-"}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Ver detalle
                          </Button>
                        </DialogTrigger>
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
                          </div>
                          {log.diff && (
                            <pre className="mt-4 max-h-60 overflow-auto rounded bg-slate-100 p-2 text-xs dark:bg-slate-800">
                              {JSON.stringify(log.diff, null, 2)}
                            </pre>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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