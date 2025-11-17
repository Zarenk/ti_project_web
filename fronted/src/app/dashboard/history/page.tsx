"use client";

import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { getAuthToken } from "@/utils/auth-token";

import { DataTable } from "./data-table";
import { activityColumns, type Activity } from "./activity-columns";
import { columns, type History } from "./columns";
import { getUserActivity, getUserHistory } from "./history.api";

interface HistoryEntry {
  id: number;
  action: string;
  stockChange: number;
  previousStock: number | null;
  newStock: number | null;
  createdAt: string;
  user: { username: string };
  inventory: {
    product: { name: string };
    storeOnInventory: {
      store: { name: string };
      stock: number;
    }[];
  };
}

async function getUserIdFromToken(): Promise<number | null> {
  const token = await getAuthToken();
  if (!token) {
    return null;
  }

  try {
    const decoded: { sub: string | number } = jwtDecode(token);
    const id = Number(decoded.sub);
    if (Number.isNaN(id)) return null;
    return id;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}

export default function UserHistory(): React.ReactElement {
  const [history, setHistory] = useState<History[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { version } = useTenantSelection();

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      if (cancelled) return;

      setLoading(true);
      setError(null);

      try {
        const id = await getUserIdFromToken();
        if (!id) {
          if (!cancelled) {
            const message =
              "No se pudo obtener el ID del usuario. Inicia sesion nuevamente.";
            setError(message);
            toast.error(message);
            setHistory([]);
            setActivity([]);
          }
          return;
        }

        const [historyData, activityData] = await Promise.all([
          getUserHistory(id),
          getUserActivity(id),
        ]);

        if (cancelled) return;

        const mappedHistory = historyData.map((entry: HistoryEntry) => ({
          id: entry.id,
          username: entry.user.username,
          action: entry.action,
          product: entry.inventory.product.name,
          stores: entry.inventory.storeOnInventory
            .map((s) => s.store.name)
            .join(", "),
          previousStock: entry.previousStock ?? 0,
          stockChange: entry.stockChange,
          newStock: entry.inventory.storeOnInventory
            .map((s) => s.stock)
            .join(", "),
          createdAt: entry.createdAt,
        })) as History[];

        const mappedActivity = activityData.map((entry: any) => ({
          id: entry.id,
          username: entry.actorEmail ?? "",
          action: entry.action,
          entityType: entry.entityType,
          summary: entry.summary,
          createdAt: entry.createdAt,
        })) as Activity[];

        if (!cancelled) {
          setHistory(mappedHistory);
          setActivity(mappedActivity);
        }
      } catch (err) {
        console.error("Error:", err);
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo cargar el historial del usuario.";
        setError(message);
        toast.error(message);
        setHistory([]);
        setActivity([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [version]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Historial del Usuario</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="mb-4 text-sm text-destructive">{error}</p>
          ) : null}
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <p className="text-muted-foreground">
              No hay historial disponible para este usuario.
            </p>
          ) : (
            <div className="overflow-auto">
              <DataTable columns={columns} data={history} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-xl">Actividad del Usuario</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-muted-foreground">
              No hay actividad disponible para este usuario.
            </p>
          ) : (
            <div className="overflow-auto">
              <DataTable columns={activityColumns} data={activity} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
