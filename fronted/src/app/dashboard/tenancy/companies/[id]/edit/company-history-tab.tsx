"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ManualPagination } from "@/components/data-table-pagination";
import { BACKEND_URL } from "@/lib/utils";
import { Download, Send } from "lucide-react";

import type { SunatEnvironment } from "../../../tenancy.api";
import type { useSunatHistory } from "./use-sunat-history";

type HistoryHook = ReturnType<typeof useSunatHistory>;

interface CompanyHistoryTabProps {
  history: HistoryHook;
}

function renderSunatStatusBadge(status: string) {
  const normalized = status.toUpperCase();
  const base = "px-2 py-1 text-xs font-semibold rounded-full";
  if (normalized === "SENT")
    return <span className={`${base} bg-emerald-100 text-emerald-800`}>ENVIADO</span>;
  if (normalized === "FAILED")
    return <span className={`${base} bg-red-100 text-red-800`}>FALLIDO</span>;
  if (normalized === "SENDING")
    return <span className={`${base} bg-blue-100 text-blue-800`}>ENVIANDO</span>;
  return <span className={`${base} bg-slate-100 text-slate-800`}>{normalized}</span>;
}

export function CompanyHistoryTab({ history }: CompanyHistoryTabProps) {
  return (
    <div className="space-y-8">
      {/* ── Envíos SUNAT ──────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold">Envíos SUNAT</p>
            <p className="text-xs text-muted-foreground">
              Historial de envíos electrónicos realizados.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 overflow-hidden dark:border-slate-700">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-muted/40 px-4 py-3 text-sm dark:border-slate-800">
            <Input
              value={history.sunatLogQuery}
              onChange={(e) => history.setSunatLogQuery(e.target.value)}
              placeholder="Buscar por serie, ticket o documento"
              className="w-full flex-1 min-w-[180px]"
            />
            <Select
              value={history.sunatLogStatusFilter}
              onValueChange={(v) => history.setSunatLogStatusFilter(v as "ALL" | string)}
            >
              <SelectTrigger className="w-[150px] cursor-pointer">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="cursor-pointer">Todos los estados</SelectItem>
                {history.availableLogStatuses.map((s) => (
                  <SelectItem key={s} value={s} className="cursor-pointer">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={history.sunatLogEnvironmentFilter}
              onValueChange={(v) =>
                history.setSunatLogEnvironmentFilter(v as "ALL" | SunatEnvironment)
              }
            >
              <SelectTrigger className="w-[160px] cursor-pointer">
                <SelectValue placeholder="Ambiente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="cursor-pointer">Todos</SelectItem>
                <SelectItem value="BETA" className="cursor-pointer">Beta</SelectItem>
                <SelectItem value="PROD" className="cursor-pointer">Producción</SelectItem>
              </SelectContent>
            </Select>
            <span className="ml-auto text-xs text-muted-foreground">
              {history.filteredSunatLogs.length} registros
            </span>
          </div>

          {/* Content */}
          {history.sunatLogsLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Cargando envíos...</div>
          ) : history.filteredSunatLogs.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              {history.sunatLogs.length === 0
                ? "Aún no se registran envíos SUNAT para esta empresa."
                : "No se encontraron envíos con los filtros seleccionados."}
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.paginatedSunatLogs.map((log) => (
                  <div key={log.id} className="p-4 flex flex-col gap-2 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-semibold">
                          {log.documentType?.toUpperCase()}{" "}
                          {(log.serie ?? "----") + "-" + (log.correlativo ?? "----")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("es-PE", { hour12: false })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderSunatStatusBadge(log.status)}
                        {log.status !== "SENT" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            disabled={history.retryingId === log.id}
                            onClick={() => history.handleRetry(log.id)}
                          >
                            {history.retryingId === log.id ? "Reintentando..." : "Reintentar"}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        Ambiente:{" "}
                        <span className="font-medium">
                          {log.environment === "PROD" ? "Producción" : "Beta"}
                        </span>
                      </span>
                      {log.ticket && <span>Ticket: {log.ticket}</span>}
                      {log.zipFilePath && (
                        <span>ZIP: {log.zipFilePath.split(/[/\\]/).pop()}</span>
                      )}
                      {log.errorMessage && (
                        <span className="text-red-600 dark:text-red-400">
                          Error: {log.errorMessage}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 px-4 py-2 dark:border-slate-800">
                <ManualPagination
                  currentPage={history.sunatLogPage}
                  totalPages={history.totalLogPages}
                  pageSize={history.logsPageSize}
                  totalItems={history.filteredSunatLogs.length}
                  onPageChange={history.setSunatLogPage}
                  onPageSizeChange={() => {}}
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── PDFs almacenados ──────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold">PDFs almacenados</p>
          <p className="text-xs text-muted-foreground">
            Archivos PDF registrados para los comprobantes de esta empresa.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 overflow-hidden dark:border-slate-700">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-muted/40 px-4 py-3 text-sm dark:border-slate-800">
            <Input
              value={history.sunatPdfQuery}
              onChange={(e) => history.setSunatPdfQuery(e.target.value)}
              placeholder="Buscar por nombre de archivo"
              className="w-full flex-1 min-w-[180px]"
            />
            <Select value={history.sunatPdfTypeFilter} onValueChange={history.setSunatPdfTypeFilter}>
              <SelectTrigger className="w-[180px] cursor-pointer">
                <SelectValue placeholder="Tipo de comprobante" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="cursor-pointer">Todos los tipos</SelectItem>
                {history.availablePdfTypes.map((t) => (
                  <SelectItem key={t} value={t} className="cursor-pointer">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-auto text-xs text-muted-foreground">
              {history.filteredSunatPdfs.length} archivos
            </span>
          </div>

          {/* Content */}
          {history.sunatPdfsLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Cargando PDFs...</div>
          ) : history.filteredSunatPdfs.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              {history.sunatPdfs.length === 0
                ? "Aún no se registran PDFs para esta empresa."
                : "No se encontraron PDFs con los filtros seleccionados."}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Tipo</th>
                      <th className="px-3 py-2 font-medium">Archivo</th>
                      <th className="px-3 py-2 font-medium">Fecha</th>
                      <th className="px-3 py-2 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {history.paginatedSunatPdfs.map((pdf) => {
                      const downloadUrl = `${BACKEND_URL}/api/sunat/pdf/${encodeURIComponent(pdf.type)}/${encodeURIComponent(pdf.filename)}`;
                      return (
                        <tr key={pdf.id} className="transition-colors hover:bg-muted/30">
                          <td className="px-3 py-2 capitalize">{pdf.type}</td>
                          <td className="px-3 py-2 break-all">{pdf.filename}</td>
                          <td className="px-3 py-2">
                            {new Date(pdf.createdAt).toLocaleString("es-PE", { hour12: false })}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button asChild variant="outline" size="sm" className="cursor-pointer">
                              <a href={downloadUrl} target="_blank" rel="noreferrer">
                                <Download className="h-4 w-4 mr-2" />
                                Descargar
                              </a>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 px-4 py-2 dark:border-slate-800">
                <ManualPagination
                  currentPage={history.sunatPdfPage}
                  totalPages={history.totalPdfPages}
                  pageSize={history.pdfPageSize}
                  totalItems={history.filteredSunatPdfs.length}
                  onPageChange={history.setSunatPdfPage}
                  onPageSizeChange={() => {}}
                />
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}