"use client";

import { useEffect, useMemo, useState } from "react";
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

type DailyLine = {
  date: string;
  account: string;
  description?: string;
  debit: number;
  credit: number;
  provider?: string;
  voucher?: string;
};

const accountNames: Record<string, string> = {
  "1011": "Caja",
  "1212": "Cuentas por cobrar",
  "2011": "Mercaderías",
  "4011": "IGV por pagar",
  "6911": "Costo de ventas",
  "7011": "Ventas",
};

export default function JournalsPage() {
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
    fetchJournals().then(setJournals).catch(() => setJournals([]));
  }, []);

  useEffect(() => {
    const loadDaily = async () => {
      setDailyLoading(true);
      try {
        const from = new Date(`${selectedDate}T00:00:00.000Z`).toISOString();
        const to = new Date(`${selectedDate}T23:59:59.999Z`).toISOString();
        const params = new URLSearchParams({ from, to, page: "1", size: "500" });
        const res = await fetch(`${BACKEND_URL}/api/accounting/entries?${params.toString()}`);
        if (!res.ok) {
          setDailyLines([]);
          return;
        }
        const json = await res.json();
        const lines: DailyLine[] = (json.data ?? []).flatMap((e: any) =>
          (e.lines ?? []).map((l: any) => {
            const voucher = e.serie && e.correlativo ? `${e.serie}-${e.correlativo}` : undefined;
            const baseDesc = l.description ?? e.description ?? undefined;
            const extra = e.provider ? ` (${e.provider}${voucher ? ` · ${voucher}` : ""})` : voucher ? ` (${voucher})` : "";
            return {
              date: e.date,
              account: l.account,
              description: baseDesc ? `${baseDesc}${extra}` : extra || undefined,
              debit: Number(l.debit ?? 0),
              credit: Number(l.credit ?? 0),
              provider: e.provider ?? undefined,
              voucher,
            } as DailyLine;
          })
        );
        setDailyLines(lines);
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
    setJournals((prev) => [...prev, journal]);
  };

  const handleUpdate = (journal: Journal) => {
    setJournals((prev) => prev.map((j) => (j.id === journal.id ? journal : j)));
  };

  const handleDelete = async (id: string) => {
    await deleteJournal(id);
    setJournals((prev) => prev.filter((j) => j.id !== id));
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
                  <TableHead className="w-[120px]">Fecha</TableHead>
                  <TableHead className="min-w-[200px]">Cuenta</TableHead>
                  <TableHead className="min-w-[320px]">Glosa</TableHead>
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
                    </TableRow>
                  ))
                ) : dailyLines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      Sin movimientos para la fecha seleccionada.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {dailyLines.map((l, idx) => (
                      <TableRow key={idx} className="odd:bg-muted/5">
                        <TableCell>{new Date(l.date).toLocaleDateString("es-PE")}</TableCell>
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
                        <TableCell className="text-right">
                          {l.debit ? l.debit.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
                        </TableCell>
                        <TableCell className="text-right">
                          {l.credit ? l.credit.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium">Totales</TableCell>
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
                  <TableHead>Fecha</TableHead>
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
                    <TableCell>{new Date(j.date).toLocaleDateString()}</TableCell>
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
