"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Journal, fetchJournals, deleteJournal } from "./journals.api";
import { JournalForm } from "./journal-form";
import { Input } from "@/components/ui/input";
import { BACKEND_URL } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/utils/auth-token";
import { formatGlosa } from "./formatGlosa";
import { formatDisplayGlosa } from "./formatDisplayGlosa";

const sortByDateDesc = <T extends { date: string }>(arr: T[]) =>
  arr
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

type EntryLineDetail = {
  date: string;
  account: string;
  description?: string;
  debit: number;
  credit: number;
  quantity?: number;
};

type DailyLine = EntryLineDetail & {
  date: string;
  provider?: string;
  voucher?: string;
  documentType?: string;
  series?: string[];
  entryId?: number;
  invoiceUrl?: string;
  entryDescription?: string;
  sale?: Sale;
  entryLines?: EntryLineDetail[];
};

const accountNames: Record<string, string> = {
  "1011": "Caja",
  "1041": "Banco – Yape/Transferencia",
  "1212": "Cuentas por cobrar",
  "2011": "Mercaderías",
  "4011": "IGV por pagar",
  "6911": "Costo de ventas",
  "7011": "Ventas",
};

type Sale = {
  date: string;
  serie: string;
  correlativo: string;
  tipoComprobante: string;
  customerName: string;
  total: number;
  payments: { method: string; amount: number }[];
  items: {
    qty: number;
    unitPrice: number;
    costUnit: number;
    productName: string;
    series: string[];
  }[];
  voucher?: string;
  pdfUrl?: string;
};

const dedupeVoucherValue = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const repeatedWithDash = trimmed.match(/^(.+?)(?:\s*[-–]\s*\1)+$/);
  if (repeatedWithDash) {
    return repeatedWithDash[1];
  }

  const repeatedWithSpaces = trimmed.match(/^(.+?)(?:\s+\1)+$/);
  if (repeatedWithSpaces) {
    return repeatedWithSpaces[1];
  }

  return trimmed;
};

const buildVoucher = (
  serie?: string | null,
  correlativo?: string | null
): string | undefined => {
  const serieValue = dedupeVoucherValue(serie);
  const correlativoValue = dedupeVoucherValue(correlativo);

  if (serieValue && correlativoValue) {
    return dedupeVoucherValue(`${serieValue}-${correlativoValue}`) ??
      `${serieValue}-${correlativoValue}`;
  }

  return serieValue ?? correlativoValue ?? undefined;
};

const normalizeVoucherKey = (value?: string | null): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const trimmed = value.toString().trim();
  if (!trimmed) {
    return undefined;
  }

  const sanitized = trimmed.replace(/[–—−]/g, "-").replace(/\s+/g, "");
  const parts = sanitized.split("-").filter(Boolean);

  if (parts.length >= 2) {
    const serie = parts[0]?.toUpperCase();
    const correlativoRaw = parts.slice(1).join("-");
    const correlativoDigits = correlativoRaw.replace(/\D+/g, "");

    if (correlativoDigits) {
      const numeric = parseInt(correlativoDigits, 10);
      if (!Number.isNaN(numeric)) {
        return `${serie}-${numeric}`;
      }
    }

    return `${serie}-${correlativoRaw.toUpperCase()}`;
  }

  const onlyPart = parts[0] ?? sanitized;
  if (/^\d+$/.test(onlyPart)) {
    return String(parseInt(onlyPart, 10));
  }

  return onlyPart.toUpperCase();
};

const buildInvoiceUrl = (invoiceUrl?: string | null): string | undefined => {
  if (!invoiceUrl) {
    return undefined;
  }
  const trimmed = invoiceUrl.trim();
  if (!trimmed) {
    return undefined;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return trimmed.startsWith('/')
    ? `${BACKEND_URL}${trimmed}`
    : `${BACKEND_URL}/${trimmed}`;
};

const COMPANY_RUC = "20519857538";

const buildSalePdfUrl = (sale: Sale): string | undefined => {
  const tipo = sale.tipoComprobante?.toLowerCase();
  const serie = sale.serie?.toString().trim();
  const correlativo = sale.correlativo?.toString().trim();

  if (!tipo || !serie || !correlativo) {
    return undefined;
  }

  const typeInfo = tipo.includes("boleta")
    ? { folder: "boleta", code: "03" }
    : tipo.includes("factura")
    ? { folder: "factura", code: "01" }
    : null;

  if (!typeInfo) {
    return undefined;
  }

  const fileName = `${COMPANY_RUC}-${typeInfo.code}-${serie}-${correlativo}.pdf`;
  return `${BACKEND_URL}/api/sunat/pdf/${typeInfo.folder}/${fileName}`;
};

function buildJournalFromSale(sale: Sale): DailyLine[] {
  const totalSale = sale.items.reduce(
    (sum, i) => sum + i.qty * (i.unitPrice ?? 0),
    0
  );
  const payments =
    sale.payments && sale.payments.length > 0
      ? sale.payments
      : [{ method: "Efectivo", amount: totalSale }];

  const lines: DailyLine[] = [];

  const paymentMethodMap: Record<number, string> = {
    [-1]: "EN EFECTIVO",
    [-2]: "TRANSFERENCIA",
    [-3]: "PAGO CON VISA",
    [-4]: "YAPE",
    [-5]: "PLIN",
    [-6]: "OTRO MEDIO DE PAGO",
  };

  for (const item of sale.items) {
    const itemTotal = Number((item.qty * (item.unitPrice ?? 0)).toFixed(2));
    const itemBase = Number((itemTotal / 1.18).toFixed(2));
    const itemIgv = Number((itemTotal - itemBase).toFixed(2));
    const itemCost = Number((item.qty * (item.costUnit ?? 0)).toFixed(2));
    const productName = item.productName ?? "producto";
    const seriesPart =
      item.series && item.series.length > 0
        ? ` (${item.series.join(", ")})`
        : "";
    const voucher = buildVoucher(sale.serie, sale.correlativo);
    const saleDesc = `Venta ${productName}${seriesPart}${voucher ? ` ${voucher}` : ""}`;
    const formattedSale = formatDisplayGlosa({
      baseDescription: saleDesc,
      voucher,
      serie: sale.serie,
      tipoComprobante: sale.tipoComprobante ?? null,
    });
    const revenueBase = formatGlosa({
      account: "7011",
      serie: sale.serie,
      correlativo: sale.correlativo,
      productName,
    });
    const formattedRevenue = formatDisplayGlosa({
      baseDescription: revenueBase,
      voucher,
      serie: sale.serie,
      tipoComprobante: sale.tipoComprobante ?? null,
    });

    for (const p of payments) {
      const proportion = p.amount / totalSale || 0;
      const amount = Number((itemTotal * proportion).toFixed(2));
      const account =
        p.method && p.method.toLowerCase() === "efectivo" ? "1011" : "1041";
      lines.push({
        date: sale.date,
        account,
        description: formattedSale.description ?? saleDesc,
        debit: amount,
        credit: 0,
        quantity: item.qty,
        provider: sale.customerName ?? undefined,
        documentType: formattedSale.documentType,
        series: formattedSale.series.length > 0 ? formattedSale.series : item.series ?? [],
        voucher,
        sale,
      });
    }

    lines.push(
      {
        date: sale.date,
        account: "7011",
        description: formattedRevenue.description ?? revenueBase,
        debit: 0,
        credit: itemBase,
        quantity: item.qty,
        documentType: formattedRevenue.documentType ?? formattedSale.documentType,
        series: formattedSale.series.length > 0 ? formattedSale.series : item.series ?? [],
        provider: sale.customerName ?? undefined,
        voucher,
        sale,
      },
      {
        date: sale.date,
        account: "4011",
        description: formattedSale.description ?? saleDesc,
        debit: 0,
        credit: itemIgv,
        quantity: item.qty,
        documentType: formattedSale.documentType,
        series: formattedSale.series.length > 0 ? formattedSale.series : item.series ?? [],
        provider: sale.customerName ?? undefined,
        voucher,
        sale,
      },
      {
        date: sale.date,
        account: "6911",
        description: formattedSale.description ?? saleDesc,
        debit: itemCost,
        credit: 0,
        quantity: item.qty,
        documentType: formattedSale.documentType,
        series: formattedSale.series.length > 0 ? formattedSale.series : item.series ?? [],
        provider: sale.customerName ?? undefined,
        voucher,
        sale,
      },
      {
        date: sale.date,
        account: "2011",
        description: formattedSale.description ?? saleDesc,
        debit: 0,
        credit: itemCost,
        quantity: item.qty,
        documentType: formattedSale.documentType,
        series: formattedSale.series.length > 0 ? formattedSale.series : item.series ?? [],
        provider: sale.customerName ?? undefined,
        voucher,
        sale,
      }
    );
  }

  return lines;
}

export default function JournalsPage() {
  const router = useRouter();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Journal | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [dailyLines, setDailyLines] = useState<DailyLine[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [selectedLine, setSelectedLine] = useState<DailyLine | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Journal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchJournals()
      .then((js) => setJournals(sortByDateDesc(js)))
      .catch(() => setJournals([]));
  }, []);

  useEffect(() => {
    const loadDaily = async () => {
      setDailyLoading(true);
      try {
        const headers = await getAuthHeaders();
        if (!headers.Authorization) {
          setDailyLines([]);
          router.push("/login");
          return;
        }
        const from = new Date(`${selectedDate}T00:00:00.000Z`).toISOString();
        const to = new Date(`${selectedDate}T23:59:59.999Z`).toISOString();
        const params = new URLSearchParams({ from, to, page: "1", size: "500" });
        const salesParams = new URLSearchParams({ from, to });
        const [res, salesRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/accounting/entries?${params.toString()}`, {
            headers,
          }),
          fetch(`${BACKEND_URL}/api/sales/transactions?${salesParams.toString()}`, {
            headers,
          }),
        ]);

        if (res.status === 401 || salesRes.status === 401) {
          setDailyLines([]);
          router.push("/login");
          return;
        }

        let lines: DailyLine[] = [];
        let sales: Sale[] = [];
        if (salesRes.ok) {
          try {
            sales = await salesRes.json();
          } catch {
            sales = [];
          }
        }

        const salesByVoucher = new Map<string, Sale>();
        for (const sale of sales) {
          const saleVoucher = buildVoucher(sale.serie, sale.correlativo);
          const normalizedSaleVoucher = normalizeVoucherKey(saleVoucher);
          if (normalizedSaleVoucher) {
            const saleWithExtras: Sale = {
              ...sale,
              voucher: saleVoucher,
              pdfUrl: sale.pdfUrl ?? buildSalePdfUrl(sale),
            };
            salesByVoucher.set(normalizedSaleVoucher, saleWithExtras);
          }
        }

        if (res.ok) {
          const json = await res.json();
          lines = (json.data ?? []).flatMap((e: any) => {
            const voucher = buildVoucher(e.serie ?? undefined, e.correlativo ?? undefined);
            const normalizedVoucher = normalizeVoucherKey(voucher);
            const sale = normalizedVoucher ? salesByVoucher.get(normalizedVoucher) : undefined;
            const entryLines: EntryLineDetail[] = (e.lines ?? []).map((line: any) => {
              const formattedLine = formatDisplayGlosa({
                baseDescription: line.description,
                provider: e.provider,
                voucher,
                serie: e.serie,
                tipoComprobante: e.tipoComprobante,
              });

              return {
                account: line.account,
                description: formattedLine.description ?? line.description,
                debit: Number(line.debit ?? 0),
                credit: Number(line.credit ?? 0),
                quantity:
                  line.quantity !== undefined && line.quantity !== null
                    ? Number(line.quantity)
                    : undefined,
              };
            });

            return (e.lines ?? []).map((l: any, idx: number) => {
              const formatted = formatDisplayGlosa({
                baseDescription: l.description ?? e.description ?? undefined,
                provider: e.provider ?? undefined,
                voucher,
                serie: e.serie ?? undefined,
                tipoComprobante: (e as any).tipoComprobante ?? null,
              });

              const entryLine = entryLines[idx] ?? {
                account: l.account,
                description: l.description ?? undefined,
                debit: Number(l.debit ?? 0),
                credit: Number(l.credit ?? 0),
                quantity:
                  l.quantity !== undefined && l.quantity !== null
                    ? Number(l.quantity)
                    : undefined,
              };

              const saleSeries =
                sale?.items
                  ?.flatMap((item) => item.series ?? [])
                  .filter((serie): serie is string => typeof serie === "string")
                  .map((serie) => serie.trim())
                  .filter((serie) => serie.length > 0) ?? [];

              const formattedSeries = (formatted.series ?? []).flatMap((serie) => {
                if (!serie) return [];
                const trimmed = serie.trim();
                if (!trimmed) return [];

                const plusPattern = /^(.*?)(?:\s*\+\s*\d+\s*(?:ítems?|items?))$/i;
                const plusOnlyPattern = /^\+\s*\d+\s*(?:ítems?|items?)$/i;

                if (plusOnlyPattern.test(trimmed)) {
                  return [];
                }

                const match = trimmed.match(plusPattern);
                if (match) {
                  const base = match[1]?.trim();
                  return base ? [base] : [];
                }

                return [trimmed];
              });

              const combinedSeries = Array.from(
                new Set([...saleSeries, ...formattedSeries])
              );

              const entryInvoiceUrl = buildInvoiceUrl(e.invoiceUrl);
              const invoiceUrl = entryInvoiceUrl ?? sale?.pdfUrl;

              return {
                date: e.date,
                account: entryLine.account,
                description: formatted.description,
                debit: entryLine.debit,
                credit: entryLine.credit,
                quantity: entryLine.quantity,
                provider: e.provider ?? undefined,
                voucher,
                documentType: formatted.documentType ?? sale?.tipoComprobante ?? undefined,
                series: combinedSeries,
                entryId: e.id,
                invoiceUrl,
                entryDescription: e.description ?? undefined,
                sale: sale ?? undefined,
                entryLines,
              } as DailyLine;
            });
          });
        }

        setDailyLines(sortByDateDesc(lines));
      } catch {
        setDailyLines([]);
      } finally {
        setDailyLoading(false);
      }
    };
    loadDaily();
  }, [selectedDate]);

  const totals = useMemo(() => {
    return dailyLines.reduce(
      (acc, l) => {
        acc.debit += l.debit || 0;
        acc.credit += l.credit || 0;
        return acc;
      },
      { debit: 0, credit: 0 }
    );
  }, [dailyLines]);

  const handleCreate = (journal: Journal) => {
    setJournals((prev) => sortByDateDesc([...prev, journal]));
  };

  const handleUpdate = (journal: Journal) => {
    setJournals((prev) =>
      sortByDateDesc(prev.map((j) => (j.id === journal.id ? journal : j)))
    );
  };

  const performDelete = async (id: string) => {
    await deleteJournal(id);
    setJournals((prev) => sortByDateDesc(prev.filter((j) => j.id !== id)));
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await performDelete(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete journal entry', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle className="leading-tight">Diario del Día</CardTitle>
            <p className="text-sm text-muted-foreground">{new Date(selectedDate).toLocaleDateString("es-PE")}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Fecha</span>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 w-[180px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-[120px]">Fecha y hora</TableHead>
                  <TableHead className="min-w-[200px]">Cuenta</TableHead>
                  <TableHead className="min-w-[320px]">Glosa</TableHead>
                  <TableHead className="text-right w-[100px]">Cantidad</TableHead>
                  <TableHead className="text-right w-[140px]">Debe</TableHead>
                  <TableHead className="text-right w-[140px]">Haber</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-80" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : dailyLines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      Sin movimientos para la fecha seleccionada.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {dailyLines.map((l, idx) => (
                      <TableRow key={idx} className="odd:bg-muted/5">
                        <TableCell>{new Date(l.date).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium">
                              {l.account}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {accountNames[l.account] ?? ""}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell
                          className="text-sm cursor-zoom-in"
                          onDoubleClick={() => setSelectedLine(l)}
                        >
                          <div>{l.description ?? "-"}</div>
                          {l.documentType && (
                            <div className="mt-1 text-xs font-medium text-muted-foreground">
                              Tipo: {l.documentType}
                            </div>
                          )}
                          {l.series && l.series.length > 0 && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Series: {l.series.join(", ")}
                            </div>
                          )}
                          <div className="mt-2 text-xs text-muted-foreground">
                            Doble clic para ver detalle
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{l.quantity ? l.quantity : ""}</TableCell>
                        <TableCell className="text-right">
                          {l.debit ? l.debit.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
                        </TableCell>
                        <TableCell className="text-right">
                          {l.credit ? l.credit.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-medium">Totales</TableCell>
                      <TableCell className="text-right font-medium">
                        {totals.debit.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {totals.credit.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Diarios del día</CardTitle>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Diario
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha y hora</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Glosa</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {journals.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell>{new Date(j.date).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell>{j.description}</TableCell>
                    <TableCell className="text-right"></TableCell>
                    <TableCell className="text-right"></TableCell>
                    <TableCell className="text-right">
                      {Number(j.amount ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(j)}
                        aria-label="Editar"
                        className="group relative cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                        <span
                          className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-muted px-2 py-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          Editar
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(j)}
                        aria-label="Eliminar"
                        className="group relative cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span
                          className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-destructive px-2 py-1 text-xs text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          Eliminar
                        </span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => {
        if (!open && !isDeleting) {
          setDeleteTarget(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar asiento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion borrara el asiento seleccionado. Esta operacion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <JournalForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />
      <JournalForm
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        defaultValues={editing ?? undefined}
        onUpdate={handleUpdate}
      />

      <Dialog open={!!selectedLine} onOpenChange={(open) => !open && setSelectedLine(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de glosa</DialogTitle>
            {(selectedLine?.description || selectedLine?.entryDescription) && (
              <DialogDescription>
                {selectedLine?.description ?? selectedLine?.entryDescription}
              </DialogDescription>
            )}
          </DialogHeader>
          {selectedLine && (
            <div className="space-y-6">
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Fecha y hora</p>
                  <p className="font-medium">
                    {new Date(selectedLine.date).toLocaleString("es-PE", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Cuenta</p>
                  <p className="font-medium">{selectedLine.account}</p>
                </div>
                {selectedLine.documentType && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Tipo de comprobante</p>
                    <p className="font-medium">{selectedLine.documentType}</p>
                  </div>
                )}
                {selectedLine.voucher && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Comprobante</p>
                    <p className="font-medium">{selectedLine.voucher}</p>
                  </div>
                )}
                {(selectedLine.provider || selectedLine.sale?.customerName) && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {selectedLine.provider ? "Proveedor" : "Cliente"}
                    </p>
                    <p className="font-medium">
                      {selectedLine.provider ?? selectedLine.sale?.customerName}
                    </p>
                  </div>
                )}
                {selectedLine.quantity !== undefined && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Cantidad</p>
                    <p className="font-medium">{selectedLine.quantity}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Debe</p>
                  <p className="font-medium">
                    {selectedLine.debit
                      ? selectedLine.debit.toLocaleString("es-PE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "0.00"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Haber</p>
                  <p className="font-medium">
                    {selectedLine.credit
                      ? selectedLine.credit.toLocaleString("es-PE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "0.00"}
                  </p>
                </div>
              </div>

              {selectedLine.series && selectedLine.series.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Series asociadas</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedLine.series.map((serie) => (
                      <span
                        key={serie}
                        className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs"
                      >
                        {serie}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedLine.sale && selectedLine.sale.items.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold">Ítems del comprobante</p>
                    {selectedLine.sale.total !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        Total: {selectedLine.sale.total.toLocaleString("es-PE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    )}
                  </div>
                  <div className="max-h-56 overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Precio unitario</TableHead>
                          <TableHead className="text-right">Importe</TableHead>
                          <TableHead>Series</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedLine.sale.items.map((item, index) => {
                          const amount = Number(
                            ((item.qty ?? 0) * (item.unitPrice ?? 0)).toFixed(2)
                          );
                          return (
                            <TableRow key={`${item.productName}-${index}`}>
                              <TableCell className="max-w-[180px] whitespace-normal">
                                {item.productName}
                              </TableCell>
                              <TableCell className="text-right">{item.qty}</TableCell>
                              <TableCell className="text-right">
                                {item.unitPrice?.toLocaleString("es-PE", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell className="text-right">
                                {amount.toLocaleString("es-PE", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell className="max-w-[160px] whitespace-normal">
                                {item.series && item.series.length > 0
                                  ? item.series.join(", ")
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {selectedLine.entryLines && selectedLine.entryLines.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Detalle contable</p>
                  <div className="max-h-64 overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cuenta</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead className="text-right">Debe</TableHead>
                          <TableHead className="text-right">Haber</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedLine.entryLines.map((line, index) => (
                          <TableRow key={`${line.account}-${index}`}>
                            <TableCell>{line.account}</TableCell>
                            <TableCell className="max-w-[220px] whitespace-normal">
                              {line.description ?? "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {line.debit.toLocaleString("es-PE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className="text-right">
                              {line.credit.toLocaleString("es-PE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
          {(selectedLine?.invoiceUrl || selectedLine?.voucher) && (
            <DialogFooter>
              {selectedLine?.invoiceUrl && (
                <Button asChild variant="outline">
                  <a
                    href={selectedLine.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir comprobante
                  </a>
                </Button>
              )}
              {!selectedLine?.invoiceUrl && selectedLine?.voucher && (
                <span className="text-xs text-muted-foreground">
                  No se encontró un enlace de comprobante para {selectedLine.voucher}.
                </span>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

