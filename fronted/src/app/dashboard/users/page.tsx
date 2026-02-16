"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { UsersDataTable } from "./data-table";
import { getUsers, type DashboardUser } from "./users.api";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { useAuth } from "@/context/auth-context";
import { TablePageSkeleton } from "@/components/table-page-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpAdminTab } from "./help-admin-tab";
import { HelpTestingPanel } from "./help-testing";
import { HelpLearningDashboard } from "./help-learning";

type UsersState = {
  data: DashboardUser[];
  loading: boolean;
  error: string | null;
};

export default function UsersPage(): React.ReactElement {
  const { version, selection } = useTenantSelection();
  const { role } = useAuth();
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

  const handleUserUpdated = useCallback(
    (updatedUser: DashboardUser) => {
      setState((prev) => ({
        ...prev,
        data: prev.data.map((user) =>
          user.id === updatedUser.id ? { ...user, role: updatedUser.role, status: updatedUser.status } : user,
        ),
      }));
    },
    [],
  );

  const normalizedRole = role?.trim().toUpperCase() ?? "";
  const isGlobalSuperAdmin = normalizedRole === "SUPER_ADMIN_GLOBAL";
  const isOrganizationSuperAdmin = normalizedRole === "SUPER_ADMIN_ORG";
  const canManageUsers = isGlobalSuperAdmin || isOrganizationSuperAdmin;

  const filteredUsers = useMemo(() => {
    return data
      .filter((user) => {
        const hasCredentials =
          Boolean(user.email?.trim()) && Boolean(user.username?.trim());
        const role = typeof user.role === "string" ? user.role.toUpperCase() : "";
        const username = user.username?.trim() || "";

        // Excluir usuarios genéricos automáticos y GUEST
        const isGenericUser = username.startsWith("generic_");

        return hasCredentials && role !== "GUEST" && !isGenericUser;
      })
      .map((user) => ({
        ...user,
        createdAt: user.createdAt ?? "",
      }));
  }, [data]);

  const usersTable = (
    <div className="overflow-x-auto">
      {loading && filteredUsers.length === 0 ? (
        <TablePageSkeleton title={false} filters={1} columns={4} rows={6} actions={false} />
      ) : (
        <UsersDataTable
          data={filteredUsers}
          canManageUsers={canManageUsers}
          isGlobalSuperAdmin={isGlobalSuperAdmin}
          organizationId={selection.orgId}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </div>
  );

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

        {isGlobalSuperAdmin ? (
          <Tabs defaultValue="users">
            <TabsList>
              <TabsTrigger value="users">Usuarios</TabsTrigger>
              <TabsTrigger value="help-assistant">Asistente</TabsTrigger>
              <TabsTrigger value="help-learning">🧠 Auto-Aprendizaje</TabsTrigger>
              <TabsTrigger value="testing">🧪 Testing</TabsTrigger>
            </TabsList>
            <TabsContent value="users">{usersTable}</TabsContent>
            <TabsContent value="help-assistant">
              <HelpAdminTab />
            </TabsContent>
            <TabsContent value="help-learning">
              <HelpLearningDashboard />
            </TabsContent>
            <TabsContent value="testing">
              <HelpTestingPanel />
            </TabsContent>
          </Tabs>
        ) : (
          usersTable
        )}
      </div>
    </section>
  );
}
