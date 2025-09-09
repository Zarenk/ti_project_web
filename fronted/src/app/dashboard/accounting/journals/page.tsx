"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { Journal, fetchJournals, deleteJournal } from "./journals.api";
import { JournalForm } from "./journal-form";
import { Input } from "@/components/ui/input";
import { BACKEND_URL } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/utils/auth-token";
import { formatGlosa } from "./formatGlosa";

const sortByDateDesc = <T extends { date: string }>(arr: T[]) =>
  arr
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

type DailyLine = {
  date: string;
  account: string;
  description?: string;
  debit: number;
  credit: number;
  quantity: number;
  provider?: string;
  voucher?: string;
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
    const saleDesc = `Venta ${productName}${seriesPart} ${sale.serie}-${sale.correlativo}`;

    for (const p of payments) {
      const proportion = p.amount / totalSale || 0;
      const amount = Number((itemTotal * proportion).toFixed(2));
      const account =
        p.method && p.method.toLowerCase() === "efectivo" ? "1011" : "1041";
      lines.push({
        date: sale.date,
        account,
        description: saleDesc,
        debit: amount,
        credit: 0,
        quantity: item.qty,
      });
    }

    lines.push(
      {
        date: sale.date,
        account: "7011",
        description: formatGlosa({
          account: "7011",
          serie: sale.serie,
          correlativo: sale.correlativo,
          productName,
        }),
        debit: 0,
        credit: itemBase,
        quantity: item.qty,
      },
      {
        date: sale.date,
        account: "4011",
        description: saleDesc,
        debit: 0,
        credit: itemIgv,
        quantity: item.qty,
      },
      {
        date: sale.date,
        account: "6911",
        description: saleDesc,
        debit: itemCost,
        credit: 0,
        quantity: item.qty,
      },
      {
        date: sale.date,
        account: "2011",
        description: saleDesc,
        debit: 0,
        credit: itemCost,
        quantity: item.qty,
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
        if (res.ok) {
          const json = await res.json();
          lines = (json.data ?? []).flatMap((e: any) =>
            (e.lines ?? []).map((l: any) => {
              const voucher = e.serie && e.correlativo ? `${e.serie}-${e.correlativo}` : undefined;
              const baseDesc = l.description ?? e.description ?? undefined;
              const extra = e.provider
                ? ` (${e.provider}${voucher ? ` · ${voucher}` : ""})`
                : voucher
                ? ` (${voucher})`
                : "";
              return {
                date: e.date,
                account: l.account,
                description: baseDesc ? `${baseDesc}${extra}` : extra || undefined,
                debit: Number(l.debit ?? 0),
                credit: Number(l.credit ?? 0),
                quantity: Number(l.quantity ?? 0),
                provider: e.provider ?? undefined,
                voucher,
              } as DailyLine;
            })
          );
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

  const handleDelete = async (id: string) => {
    await deleteJournal(id);
    setJournals((prev) => sortByDateDesc(prev.filter((j) => j.id !== id)));
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
                        <TableCell className="text-sm">{l.description ?? "-"}</TableCell>
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
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(j.id)}
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
