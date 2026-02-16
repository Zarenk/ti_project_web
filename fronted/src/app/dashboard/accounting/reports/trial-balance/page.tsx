"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarDatePicker } from "@/components/calendar-date-picker";
import { DateRange } from "react-day-picker";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { authFetch } from "@/utils/auth-fetch";
import { useTenantSelection } from "@/context/tenant-selection-context";

interface TrialBalanceRow {
  account: string;
  debit: number;
  credit: number;
}

type LedgerLine = {
  accountCode: string;
  debit?: number;
  credit?: number;
  date: string;
};

export default function TrialBalancePage() {
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const { version } = useTenantSelection();

  const totals = useMemo(() => {
    const debit = rows.reduce((s, r) => s + (r.debit || 0), 0);
    const credit = rows.reduce((s, r) => s + (r.credit || 0), 0);
    return { debit, credit, equal: Math.abs(debit - credit) < 0.005 };
  }, [rows]);

  const exportCsv = () => {
    try {
      const header = "Account,Debit,Credit\n";
      const content = rows
        .map(
          (r) =>
            `${JSON.stringify(r.account)},${r.debit.toFixed(2)},${r.credit.toFixed(2)}`,
        )
        .join("\n");
      const totalLine = `Totals,${totals.debit.toFixed(2)},${totals.credit.toFixed(2)}`;
      const csv = header + content + "\n" + totalLine;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "trial-balance.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export CSV", err);
    }
  };

  async function fetchAccountsMap(): Promise<Record<string, string>> {
    try {
      const res = await authFetch("/accounting/accounts", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed accounts");
      const data: any[] = await res.json();
      const map: Record<string, string> = {};
      const walk = (node: any) => {
        map[node.code] = node.name;
        node.children?.forEach(walk);
      };
      data.forEach(walk);
      return map;
    } catch (e) {
      console.warn("No se pudo cargar cuentas. Se mostrará solo el código.");
      return {};
    }
  }

  async function fetchLedger(range?: DateRange): Promise<LedgerLine[]> {
    const params = new URLSearchParams();
    if (range?.from) params.set("from", range.from.toISOString().split("T")[0]);
    if (range?.to) params.set("to", range.to.toISOString().split("T")[0]);
    params.set("size", "10000");
    params.set("page", "1");
    const res = await authFetch(
      `/accounting/reports/ledger?${params.toString()}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error("Failed ledger");
    const data = await res.json();
    return (data?.data || []) as LedgerLine[];
  }

  const load = useCallback(
    async (range?: DateRange) => {
      setLoading(true);
      setError(null);
      try {
        const [accountsMap, lines] = await Promise.all([
          fetchAccountsMap(),
          fetchLedger(range),
        ]);

        const grouped = new Map<string, { debit: number; credit: number }>();
        for (const l of lines) {
          const key = l.accountCode;
          const prev = grouped.get(key) || { debit: 0, credit: 0 };
          grouped.set(key, {
            debit: prev.debit + (l.debit || 0),
            credit: prev.credit + (l.credit || 0),
          });
        }

        const computed: TrialBalanceRow[] = Array.from(grouped.entries())
          .map(([code, sums]) => ({
            account: accountsMap[code] ? `${code} - ${accountsMap[code]}` : code,
            debit: Number(sums.debit.toFixed(2)),
            credit: Number(sums.credit.toFixed(2)),
          }))
          .sort((a, b) => a.account.localeCompare(b.account));

        setRows(computed);
      } catch (err) {
        console.error("Failed to load trial balance", err);
        setError("No se pudo cargar el Balance de Comprobación");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [version],
  );

  useEffect(() => {
    load(dateRange);
  }, [dateRange, load]);

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      load(dateRange);
    }, 5000);
    const onFocus = () => load(dateRange);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [dateRange, load]);

  return (
    <Card className="shadow-sm border border-blue-100/40 dark:border-blue-900/20">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-slate-900 dark:to-slate-900 rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
            Balance de Comprobación
          </Badge>
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <CalendarDatePicker
            className="h-9 w-[250px]"
            variant="outline"
            date={dateRange || { from: undefined, to: undefined }}
            onDateSelect={setDateRange}
          />
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <FileDown className="mr-2 size-4" />
            Exportar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loading ? (
          <p className="text-muted-foreground">Cargando balance…</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <Table>
              <TableHeader>
                <TableRow className="bg-blue-50/60 dark:bg-slate-900/60">
                  <TableHead className="w-1/2">Cuenta</TableHead>
                  <TableHead className="w-1/4 text-right">Débito</TableHead>
                  <TableHead className="w-1/4 text-right">Crédito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.account}>
                    <TableCell>{row.account}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.debit, "PEN")}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.credit, "PEN")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Total débito:</span>
            <span>{formatCurrency(totals.debit, "PEN")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Total crédito:</span>
            <span>{formatCurrency(totals.credit, "PEN")}</span>
          </div>
          <Badge
            variant={totals.equal ? "secondary" : "destructive"}
            className="self-start sm:self-auto"
          >
            {totals.equal ? "Balances equilibrados" : "Descuadre detectado"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
