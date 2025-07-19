"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
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
import { DataTablePagination } from "../../../components/data-table-pagination";
import { DateRange } from "react-day-picker";
import { CalendarDatePicker } from "@/components/calendar-date-picker";
import { useMemo, useState } from "react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData extends { createdAt: string }, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);

  const filteredData = useMemo(() => {
    if (!selectedDateRange?.from || !selectedDateRange?.to) {
      return data;
    }
    const from = new Date(selectedDateRange.from);
    const to = new Date(selectedDateRange.to);
    return data.filter((item) => {
      const itemDate = new Date((item as any).createdAt);
      return itemDate >= from && itemDate <= to;
    });
  }, [data, selectedDateRange]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort(
      (a, b) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime()
    );
  }, [filteredData]);

  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data: sortedData,
    columns,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      columnFilters,
      pagination,
    },
    onPaginationChange: setPagination,
  });

  const handleDateSelect = (range: DateRange | undefined) => {
    setSelectedDateRange(range);
  };

  const handleResetFilters = () => {
    table.getColumn("username")?.setFilterValue("");
    setSelectedDateRange(undefined);
    table.resetColumnFilters();
  };

  const isFiltered =
    !!table.getColumn("username")?.getFilterValue() ||
    !!selectedDateRange ||
    table.getState().columnFilters.length > 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 px-4">
        <Input
          placeholder="Filtrar por usuario..."
          value={(table.getColumn("username")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("username")?.setFilterValue(event.target.value)}
          className="w-full sm:w-1/3"
        />
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
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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