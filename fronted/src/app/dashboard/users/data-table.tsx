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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/app/hooks/useDebounce";
import { DataTablePagination } from "@/components/data-table-pagination";
import type { DashboardUser } from "./users.api";
import { columns as userColumns } from "./columns";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

type UserRow = DashboardUser & { createdAt: string };

export function DataTable<TValue>({ columns, data }: DataTableProps<UserRow, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [usernameFilter, setUsernameFilter] = React.useState("");
  const [emailFilter, setEmailFilter] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  const debouncedUsername = useDebounce(usernameFilter, 400);
  const debouncedEmail = useDebounce(emailFilter, 400);
  const debouncedRole = useDebounce(roleFilter, 400);
  const debouncedStatus = useDebounce(statusFilter, 400);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
  });

  React.useEffect(() => {
    table.getColumn("username")?.setFilterValue(
      debouncedUsername ? debouncedUsername.trim() : undefined,
    );
  }, [debouncedUsername, table]);

  React.useEffect(() => {
    table.getColumn("email")?.setFilterValue(
      debouncedEmail ? debouncedEmail.trim() : undefined,
    );
  }, [debouncedEmail, table]);

  React.useEffect(() => {
    table.getColumn("role")?.setFilterValue(
      debouncedRole ? debouncedRole.trim() : undefined,
    );
  }, [debouncedRole, table]);

  React.useEffect(() => {
    table.getColumn("status")?.setFilterValue(
      debouncedStatus ? debouncedStatus.trim().toUpperCase() : undefined,
    );
  }, [debouncedStatus, table]);

  const isFiltered = React.useMemo(
    () =>
      Boolean(
        debouncedUsername || debouncedEmail || debouncedRole || debouncedStatus,
      ),
    [debouncedEmail, debouncedRole, debouncedStatus, debouncedUsername],
  );

  const handleResetFilters = () => {
    setUsernameFilter("");
    setEmailFilter("");
    setRoleFilter("");
    setStatusFilter("");
    table.resetColumnFilters();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Filtrar por usuario"
            value={usernameFilter}
            onChange={(event) => setUsernameFilter(event.target.value)}
          />
          <Input
            placeholder="Filtrar por correo"
            value={emailFilter}
            onChange={(event) => setEmailFilter(event.target.value)}
          />
          <Input
            placeholder="Filtrar por rol"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          />
          <Input
            placeholder="Filtrar por estado"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          />
        </div>
        {isFiltered && (
          <div className="flex justify-end">
            <Button variant="ghost" onClick={handleResetFilters}>
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
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
                  No hay usuarios para mostrar.
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

export function UsersDataTable({ data }: { data: UserRow[] }) {
  return <DataTable columns={userColumns} data={data} />;
}
