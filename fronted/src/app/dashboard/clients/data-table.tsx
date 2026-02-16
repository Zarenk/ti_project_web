"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
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
import { DateRange } from "react-day-picker";

import { CalendarDatePicker } from "@/components/calendar-date-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/app/hooks/useDebounce";
import { DataTablePagination } from "@/components/data-table-pagination";
import type { ClientRow } from "./columns";
import { buildClientColumns } from "./columns";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TValue>({ columns, data }: DataTableProps<ClientRow, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [nameFilter, setNameFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [typeNumberFilter, setTypeNumberFilter] = React.useState("");
  const [selectedDateRange, setSelectedDateRange] = React.useState<DateRange | undefined>();
  const [showRecentOnly, setShowRecentOnly] = React.useState(false);

  const debouncedName = useDebounce(nameFilter, 400);
  const debouncedType = useDebounce(typeFilter, 400);
  const debouncedTypeNumber = useDebounce(typeNumberFilter, 400);

  const filteredData = React.useMemo(() => {
    const hasDateRange = Boolean(selectedDateRange?.from && selectedDateRange?.to);
    const recentThreshold = (() => {
      if (!showRecentOnly) return null;
      const now = new Date();
      const recent = new Date(now);
      recent.setDate(now.getDate() - 7);
      return recent;
    })();

    return data.filter((client) => {
      if (!showRecentOnly && !hasDateRange) {
        return true;
      }

      if (!client.createdAt) {
        return !showRecentOnly && !hasDateRange;
      }

      const createdAtDate = new Date(client.createdAt);

      if (Number.isNaN(createdAtDate.getTime())) {
        return !showRecentOnly && !hasDateRange;
      }

      if (recentThreshold && createdAtDate < recentThreshold) {
        return false;
      }

      if (hasDateRange) {
        const from = selectedDateRange?.from as Date;
        const to = selectedDateRange?.to as Date;

        if (createdAtDate < from || createdAtDate > to) {
          return false;
        }
      }

      return true;
    });
  }, [data, showRecentOnly, selectedDateRange]);

  React.useEffect(() => {
    setColumnFilters([
      { id: "name", value: debouncedName },
      { id: "type", value: debouncedType },
      { id: "typeNumber", value: debouncedTypeNumber },
    ]);
  }, [debouncedName, debouncedType, debouncedTypeNumber]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-4 md:flex-row">
          <Input
            placeholder="Filtrar por nombre..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="h-9 w-full md:w-[200px]"
          />
          <Input
            placeholder="Filtrar por tipo..."
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 w-full md:w-[150px]"
          />
          <Input
            placeholder="Filtrar por número..."
            value={typeNumberFilter}
            onChange={(e) => setTypeNumberFilter(e.target.value)}
            className="h-9 w-full md:w-[200px]"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="recent-only"
              checked={showRecentOnly}
              onCheckedChange={(checked) => setShowRecentOnly(checked === true)}
            />
            <Label htmlFor="recent-only" className="text-sm font-normal">
              Últimos 7 días
            </Label>
          </div>
          <CalendarDatePicker
            date={selectedDateRange}
            onDateSelect={setSelectedDateRange}
            variant="outline"
            numberOfMonths={2}
            className="h-9"
          />
        </div>
      </div>

      <div className="rounded-md border border-slate-200 dark:border-slate-800">
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
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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
                  No se encontraron clientes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  );
}

interface ClientsDataTableProps {
  data: ClientRow[];
  onClientUpdated: (client: ClientRow) => void;
  onClientDeleted: (id: number) => void;
}

export function ClientsDataTable({ data, onClientUpdated, onClientDeleted }: ClientsDataTableProps) {
  const columns = React.useMemo(
    () => buildClientColumns({ onClientUpdated, onClientDeleted }),
    [onClientUpdated, onClientDeleted]
  );

  return <DataTable columns={columns} data={data} />;
}
