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
import type { DashboardUser } from "./users.api";
import { buildUserColumns, type UserRow } from "./columns";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

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
  const [selectedDateRange, setSelectedDateRange] = React.useState<DateRange | undefined>();
  const [showRecentOnly, setShowRecentOnly] = React.useState(false);

  const debouncedUsername = useDebounce(usernameFilter, 400);
  const debouncedEmail = useDebounce(emailFilter, 400);
  const debouncedRole = useDebounce(roleFilter, 400);
  const debouncedStatus = useDebounce(statusFilter, 400);

  const filteredData = React.useMemo(() => {
    const hasDateRange = Boolean(selectedDateRange?.from && selectedDateRange?.to);
    const recentThreshold = (() => {
      if (!showRecentOnly) return null;
      const now = new Date();
      const recent = new Date(now);
      recent.setDate(now.getDate() - 7);
      return recent;
    })();

    return data.filter((user) => {
      if (!showRecentOnly && !hasDateRange) {
        return true;
      }

      if (!user.createdAt) {
        return !showRecentOnly && !hasDateRange;
      }

      const createdAtDate = new Date(user.createdAt);

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
  }, [data, selectedDateRange, showRecentOnly]);

  const table = useReactTable({
    data: filteredData,
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
        debouncedUsername ||
          debouncedEmail ||
          debouncedRole ||
          debouncedStatus ||
          showRecentOnly ||
          (selectedDateRange?.from && selectedDateRange?.to),
      ),
    [
      debouncedEmail,
      debouncedRole,
      debouncedStatus,
      debouncedUsername,
      selectedDateRange,
      showRecentOnly,
    ],
  );

  const handleResetFilters = () => {
    setUsernameFilter("");
    setEmailFilter("");
    setRoleFilter("");
    setStatusFilter("");
    setSelectedDateRange(undefined);
    setShowRecentOnly(false);
    table.resetColumnFilters();
  };

  const handleDateSelect = React.useCallback((range: { from: Date; to: Date }) => {
    setSelectedDateRange({ from: range.from, to: range.to });
  }, []);

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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="recent-users-filter"
              checked={showRecentOnly}
              onCheckedChange={(value) => setShowRecentOnly(Boolean(value))}
            />
            <Label htmlFor="recent-users-filter" className="text-sm font-medium">
              Mostrar usuarios recientes (últimos 7 días)
            </Label>
          </div>
          <CalendarDatePicker
            className="h-9 w-full lg:w-auto"
            variant="outline"
            date={selectedDateRange ?? { from: undefined, to: undefined }}
            onDateSelect={handleDateSelect}
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

export function UsersDataTable({
  data,
  canManageUsers,
  isGlobalSuperAdmin,
  organizationId,
  onUserUpdated,
}: {
  data: UserRow[];
  canManageUsers: boolean;
  isGlobalSuperAdmin: boolean;
  organizationId: number | null;
  onUserUpdated: (user: DashboardUser) => void;
}) {
  const columns = React.useMemo(
    () =>
      buildUserColumns({
        canManageUsers,
        isGlobalSuperAdmin,
        organizationId,
        onUserUpdated,
      }),
    [canManageUsers, isGlobalSuperAdmin, organizationId, onUserUpdated],
  );

  return <DataTable columns={columns} data={data} />;
}
