'use client'

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { getAllTipoCambio } from './exchange.api';
import { DataTablePagination } from '@/components/data-table-pagination';
import { ReactNode } from 'react';
import { CalendarDatePicker } from '@/components/calendar-date-picker';
import { DateRange } from 'react-day-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenantSelection } from '@/context/tenant-selection-context';

interface TipoCambio {
  id: number;
  fecha: string;
  moneda: string;
  valor: number;
}

export default function TipoCambioTable() {
  const [data, setData] = useState<TipoCambio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
  const { version } = useTenantSelection();

  const filteredData = useMemo(() => {
    if (!selectedDateRange?.from || !selectedDateRange?.to) return data;
    const from = new Date(selectedDateRange.from);
    const to = new Date(selectedDateRange.to);
    return data.filter((item) => {
      const itemDate = new Date(item.fecha);
      return itemDate >= from && itemDate <= to;
    });
  }, [data, selectedDateRange]);

  const columns = useMemo<ColumnDef<TipoCambio, ReactNode>[]>(
    () => [
      {
        accessorKey: 'fecha',
        header: () => 'Fecha',
        cell: ({ row }) => <span>{format(new Date(row.original.fecha), 'yyyy-MM-dd')}</span>,
      },
      {
        accessorKey: 'moneda',
        header: () => 'Moneda',
        cell: ({ row }) => <span>{row.original.moneda}</span>,
      },
      {
        accessorKey: 'valor',
        header: () => 'Valor en Soles',
        cell: ({ row }) => <span>S/. {row.original.valor.toFixed(4)}</span>,
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  useEffect(() => {
    setGlobalFilter('');
    setSelectedDateRange(undefined);
  }, [version]);

  const fetchTipoCambio = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await getAllTipoCambio();
      setData(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error('Error cargando datos de tipo de cambio:', err);
      const message = err instanceof Error ? err.message : 'No se pudo cargar el historial de tipos de cambio.';
      setError(message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTipoCambio();
  }, [fetchTipoCambio, version]);

  return (
    <div className="max-w-4xl mx-auto mt-10 px-4">
      <Card className="shadow-xl">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4">Historial de Tipos de Cambio</h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <Input
              placeholder="Buscar moneda..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-sm"
            />
            <div className="w-full sm:w-[250px]">
              <div className="relative z-50 sm:max-w-[250px] max-w-full overflow-x-hidden overflow-y-visible sm:overflow-visible">
                <CalendarDatePicker
                  className="w-full"
                  variant="outline"
                  date={selectedDateRange || { from: undefined, to: undefined }}
                  onDateSelect={setSelectedDateRange}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        No hay datos disponibles.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="py-6">
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}
