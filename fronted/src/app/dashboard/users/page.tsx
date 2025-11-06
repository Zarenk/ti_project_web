"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { UsersDataTable } from "./data-table";
import { getUsers, type DashboardUser } from "./users.api";
import { useTenantSelection } from "@/context/tenant-selection-context";

type UsersState = {
  data: DashboardUser[];
  loading: boolean;
  error: string | null;
};

export default function UsersPage(): React.ReactElement {
  const { version } = useTenantSelection();
  const [{ data, loading, error }, setState] = useState<UsersState>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const users = await getUsers();
        if (!cancelled) {
          setState({ data: users, loading: false, error: null });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudieron cargar los usuarios.";
        if (!cancelled) {
          setState({ data: [], loading: false, error: message });
          toast.error(message);
        }
      }
    };

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [version]);

  const filteredUsers = useMemo(() => {
    return data
      .filter((user) => {
        const hasCredentials =
          Boolean(user.email?.trim()) && Boolean(user.username?.trim());
        const role = typeof user.role === "string" ? user.role.toUpperCase() : "";
        return hasCredentials && role !== "GUEST";
      })
      .map((user) => ({
        ...user,
        createdAt: user.createdAt ?? "",
      }));
  }, [data]);

  return (
    <section className="py-6">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Usuarios</h1>
          {loading ? (
            <span className="text-sm text-muted-foreground">Actualizando...</span>
          ) : error ? (
            <span className="text-sm text-destructive">{error}</span>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          {loading && filteredUsers.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
              Cargando usuarios...
            </div>
          ) : (
            <UsersDataTable data={filteredUsers} />
          )}
        </div>
      </div>
    </section>
  );
}
