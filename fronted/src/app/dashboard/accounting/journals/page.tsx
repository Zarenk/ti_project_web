"use client";

import React, { useEffect, useState } from "react";
import { Plus, FileDown, Filter, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  JournalEntry,
  getJournalEntries,
  exportPLE,
  JournalEntryFilters,
} from "./journals.api";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { cn } from "@/lib/utils";
import { JournalEntryForm } from "./JournalEntryForm";
import { PageGuideButton } from "@/components/page-guide-dialog";
import { JOURNALS_GUIDE_STEPS } from "./journals-guide-steps";

type PeriodView = "day" | "month" | "year";

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  POSTED: "Contabilizado",
  VOID: "Anulado",
};

const statusIcons: Record<string, React.ReactNode> = {
  DRAFT: <Clock className="h-4 w-4" />,
  POSTED: <CheckCircle2 className="h-4 w-4" />,
  VOID: <XCircle className="h-4 w-4" />,
};

const sourceLabels: Record<string, string> = {
  SALE: "Venta",
  PURCHASE: "Compra",
  ADJUSTMENT: "Ajuste",
  MANUAL: "Manual",
};

interface ParsedDescription {
  type: string;
  invoice?: string;
  entity?: string; // Cliente o Proveedor
  products?: string;
  paymentMethod?: string;
  raw: string;
}

function parseDescription(description: string): ParsedDescription {
  // Current format: "Venta -F001-123 | Cliente XYZ | Efectivo"
  // or: "Compra -56 | Proveedor ABC | Contado"
  const parts = description.split(" | ");

  if (parts.length === 3) {
    const [typePart, entity, paymentMethod] = parts;
    const typeMatch = typePart.match(/^(Venta|Compra)\s+-(.+)$/);

    if (!typeMatch) {
      return { type: "unknown", raw: description };
    }

    return {
      type: typeMatch[1],
      invoice: typeMatch[2],
      entity: entity.trim(),
      paymentMethod: paymentMethod.trim(),
      raw: description,
    };
  }

  // Unknown format
  return { type: "unknown", raw: description };
}

function DescriptionTags({ description }: { description: string }) {
  const parsed = parseDescription(description);

  if (parsed.type === "unknown") {
    return <div className="max-w-[300px] truncate" title={parsed.raw}>{parsed.raw}</div>;
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap max-w-[400px]">
      <span className="text-sm text-muted-foreground">{parsed.type}</span>
      {parsed.invoice && (
        <Badge
          variant="outline"
          className="text-xs font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
        >
          {parsed.invoice}
        </Badge>
      )}
      {parsed.entity && (
        <Badge
          variant="outline"
          className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
        >
          {parsed.entity}
        </Badge>
      )}
      {parsed.paymentMethod && (
        <Badge
          variant="outline"
          className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
        >
          {parsed.paymentMethod}
        </Badge>
      )}
    </div>
  );
}

function ModernTooltip({ children, content }: { children: React.ReactNode; content: string }) {
  // Parse items separated by " | "
  const items = content.includes(" | ") ? content.split(" | ") : [content];
  const hasMultipleItems = items.length > 1;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-lg p-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/50 shadow-2xl backdrop-blur-sm overflow-hidden"
        sideOffset={8}
      >
        <div className="p-4">
          {hasMultipleItems ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-700/50">
                <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                <p className="text-xs font-semibold text-slate-200">
                  Información completa
                </p>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded-md bg-slate-800/40 hover:bg-slate-800/60 transition-colors"
                  >
                    <span className="text-blue-400 text-xs font-mono mt-0.5">•</span>
                    <p className="text-xs text-slate-300 leading-relaxed flex-1">
                      {item.trim()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-300 leading-relaxed">
              {content}
            </p>
          )}
        </div>
        <div className="h-1 bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-blue-500/50" />
      </TooltipContent>
    </Tooltip>
  );
}

export default function JournalsPage() {
  const { version } = useTenantSelection();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());
  const [periodView, setPeriodView] = useState<PeriodView>("day");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [filters, setFilters] = useState<JournalEntryFilters>({});
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    loadEntries();
  }, [version, selectedDate, periodView, filters]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const from = getDateRange().from;
      const to = getDateRange().to;

      const result = await getJournalEntries({
        from,
        to,
        ...filters,
      });

      setEntries(result.data);
    } catch (error) {
      console.error("Error loading journal entries:", error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    // Parse la fecha seleccionada en hora local
    const [year, month, day] = selectedDate.split('-').map(Number);
    let from: string;
    let to: string;

    if (periodView === "day") {
      // Crear fechas en hora local, no UTC
      const fromDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      const toDate = new Date(year, month - 1, day, 23, 59, 59, 999);
      from = fromDate.toISOString();
      to = toDate.toISOString();
    } else if (periodView === "month") {
      from = new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString();
      to = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
    } else {
      from = new Date(year, 0, 1, 0, 0, 0, 0).toISOString();
      to = new Date(year, 11, 31, 23, 59, 59, 999).toISOString();
    }

    return { from, to };
  };

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEntries(newExpanded);
  };

  const handleExportPLE = async (format: "5.1" | "6.1") => {
    try {
      const { from, to } = getDateRange();
      await exportPLE(from, to, format);
    } catch (error) {
      console.error("Error exporting PLE:", error);
    }
  };

  const totals = entries.reduce(
    (acc, entry) => {
      if (entry.status !== "VOID") {
        // Asegurar conversión a número para evitar concatenación de strings
        acc.debit += Number(entry.debitTotal) || 0;
        acc.credit += Number(entry.creditTotal) || 0;
      }
      return acc;
    },
    { debit: 0, credit: 0 }
  );

  const balanceOk = Math.abs(totals.debit - totals.credit) < 0.01;

  return (
    <TooltipProvider>
      <div className="space-y-4">
      {/* Header con filtros */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="leading-tight">Libro Diario</CardTitle>
                <PageGuideButton steps={JOURNALS_GUIDE_STEPS} tooltipLabel="Guía del libro diario" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Registro cronológico de asientos contables
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Vista de período */}
              <Select
                value={periodView}
                onValueChange={(value) => setPeriodView(value as PeriodView)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Día</SelectItem>
                  <SelectItem value="month">Mes</SelectItem>
                  <SelectItem value="year">Año</SelectItem>
                </SelectContent>
              </Select>

              {/* Selector de fecha */}
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-[180px]"
              />

              {/* Exportación PLE */}
              <Select onValueChange={(value) => handleExportPLE(value as "5.1" | "6.1")}>
                <SelectTrigger className="w-[160px]">
                  <FileDown className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Exportar PLE" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5.1">PLE 5.1 - Diario</SelectItem>
                  <SelectItem value="6.1">PLE 6.1 - Mayor</SelectItem>
                </SelectContent>
              </Select>

              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Nuevo Asiento
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filtros adicionales */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={(filters.sources && filters.sources.length > 0) ? filters.sources[0] : "all"}
              onValueChange={(value) =>
                setFilters({ ...filters, sources: value === "all" ? undefined : [value] })
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="SALE">Ventas</SelectItem>
                <SelectItem value="PURCHASE">Compras</SelectItem>
                <SelectItem value="ADJUSTMENT">Ajustes</SelectItem>
                <SelectItem value="MANUAL">Manuales</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={(filters.statuses && filters.statuses.length > 0) ? filters.statuses[0] : "all"}
              onValueChange={(value) =>
                setFilters({ ...filters, statuses: value === "all" ? undefined : [value as any] })
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="DRAFT">Borrador</SelectItem>
                <SelectItem value="POSTED">Contabilizado</SelectItem>
                <SelectItem value="VOID">Anulado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Indicador de balance */}
          <div className="flex items-center justify-between rounded-md border p-3 bg-muted/20">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Debe:</span>{" "}
                <span className="font-medium">
                  {totals.debit.toLocaleString("es-PE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Haber:</span>{" "}
                <span className="font-medium">
                  {totals.credit.toLocaleString("es-PE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
            <Badge
              variant={balanceOk ? "default" : "destructive"}
              className="flex items-center gap-1"
            >
              {balanceOk ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Balanceado
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3" />
                  Desbalanceado
                </>
              )}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de asientos */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="w-[120px]">Fecha</TableHead>
                  <TableHead className="w-[100px]">Correlativo</TableHead>
                  <TableHead className="w-[100px]">CUO</TableHead>
                  <TableHead className="min-w-[200px]">Descripción</TableHead>
                  <TableHead className="w-[100px]">Origen</TableHead>
                  <TableHead className="w-[120px]">Estado</TableHead>
                  <TableHead className="text-right w-[120px]">Debe</TableHead>
                  <TableHead className="text-right w-[120px]">Haber</TableHead>
                  <TableHead className="text-right w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No hay asientos contables para el período seleccionado
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => {
                    const isExpanded = expandedEntries.has(entry.id);
                    const fullDescription = entry.description || "";

                    return (
                      <React.Fragment key={entry.id}>
                        <TableRow
                          className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            entry.status === "VOID" && "opacity-50"
                          )}
                          onClick={() => toggleExpanded(entry.id)}
                        >
                          <TableCell>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(entry.date).toLocaleDateString("es-PE")}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs">{entry.correlativo}</code>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs">{entry.cuo}</code>
                          </TableCell>
                          <TableCell>
                            {fullDescription ? (
                              <ModernTooltip content={fullDescription}>
                                <div className="cursor-help">
                                  <DescriptionTags description={fullDescription} />
                                </div>
                              </ModernTooltip>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {sourceLabels[entry.source]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                entry.status === "POSTED"
                                  ? "default"
                                  : entry.status === "VOID"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="flex items-center gap-1 w-fit"
                            >
                              {statusIcons[entry.status]}
                              {statusLabels[entry.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {entry.debitTotal.toLocaleString("es-PE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {entry.creditTotal.toLocaleString("es-PE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                              Editar
                            </Button>
                          </TableCell>
                        </TableRow>

                        {/* Líneas expandidas */}
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={10} className="bg-muted/20 p-0">
                              <div className="px-4 py-3">
                                <p className="text-sm font-medium mb-2">Detalle de líneas:</p>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-[120px]">Cuenta</TableHead>
                                      <TableHead>Descripción</TableHead>
                                      <TableHead className="text-right w-[120px]">Debe</TableHead>
                                      <TableHead className="text-right w-[120px]">Haber</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {entry.lines.map((line, idx) => {
                                      const descriptionText = line.description || "-";
                                      const isLongDescription = descriptionText.length > 60;

                                      return (
                                        <TableRow key={idx} className="text-sm">
                                          <TableCell>
                                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                              {line.account?.code || "-"}
                                            </code>
                                          </TableCell>
                                          <TableCell>
                                            {isLongDescription ? (
                                              <ModernTooltip content={descriptionText}>
                                                <div className="max-w-md truncate cursor-help text-sm">
                                                  {descriptionText}
                                                </div>
                                              </ModernTooltip>
                                            ) : (
                                              <div className="text-sm">{descriptionText}</div>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-right font-mono">
                                            {line.debit > 0
                                              ? line.debit.toLocaleString("es-PE", {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                })
                                              : ""}
                                          </TableCell>
                                          <TableCell className="text-right font-mono">
                                            {line.credit > 0
                                              ? line.credit.toLocaleString("es-PE", {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                })
                                              : ""}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                                {entry.sunatStatus && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Estado SUNAT: {entry.sunatStatus}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Formulario de creación de asientos */}
      <JournalEntryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => {
          loadEntries();
          setFormOpen(false);
        }}
      />
      </div>
    </TooltipProvider>
  );
}
