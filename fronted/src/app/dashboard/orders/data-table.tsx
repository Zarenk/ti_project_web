"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { CalendarDatePicker } from "@/components/calendar-date-picker";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTablePagination } from "@/components/data-table-pagination";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData extends { createdAt: string; code: string; client: string }, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [search, setSearch] = useState("");
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
  const [status, setStatus] = useState<string>("PENDING");

  const filteredData = useMemo(() => {
    let result = data;
    if (status && status !== "ALL") {
      result = result.filter((item) => (item as any).status === status);
    }
    if (selectedDateRange?.from && selectedDateRange?.to) {
      const from = new Date(selectedDateRange.from);
      const to = new Date(selectedDateRange.to);
      result = result.filter((item) => {
        const date = new Date((item as any).createdAt);
        return date >= from && date <= to;
      });
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((item) =>
        (item as any).code.toLowerCase().includes(s) ||
        (item as any).client.toLowerCase().includes(s)
      );
    }
    return result;
  }, [data, search, selectedDateRange, status]);

  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
  });

  const handleDateSelect = (range: DateRange | undefined) => {
    setSelectedDateRange(range);
  };

  const isFiltered = !!search || !!selectedDateRange || status !== "PENDING";

  const handleResetFilters = () => {
    setSearch("");
    setSelectedDateRange(undefined);
    setStatus("PENDING");
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 px-4">
        <Input
          placeholder="Buscar orden o cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-1/3"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pendientes</SelectItem>
            <SelectItem value="COMPLETED">Completadas</SelectItem>
            <SelectItem value="DENIED">Denegadas</SelectItem>
            <SelectItem value="ALL">Todas</SelectItem>
          </SelectContent>
        </Select>
        <CalendarDatePicker
          className="h-9 w-[250px]"
          variant="outline"
          date={selectedDateRange || { from: undefined, to: undefined }}
          onDateSelect={handleDateSelect}
        />
        {isFiltered && (
          <Button variant="ghost" onClick={handleResetFilters} className="h-8 px-2 lg:px-3">
            Reset
          </Button>
        )}
      </div>
      <div className="rounded-md border mx-4">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No hay datos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="py-4">
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}