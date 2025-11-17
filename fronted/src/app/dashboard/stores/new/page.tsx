"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantSelection } from "@/context/tenant-selection-context";

import { getStore } from "../stores.api";
import StoreForm from "./store-form";

type LoadedStore = Awaited<ReturnType<typeof getStore>> | null;

function resolveStoreId(
  paramsId: string | string[] | undefined,
  queryId: string | null,
): string | null {
  if (Array.isArray(paramsId)) {
    return paramsId[0] ?? null;
  }
  if (paramsId && paramsId.trim().length > 0) {
    return paramsId;
  }
  if (queryId && queryId.trim().length > 0) {
    return queryId;
  }
  return null;
}

export default function StoresNewPage(): React.ReactElement {
  const params = useParams<{ id?: string | string[] }>();
  const search = useSearchParams();
  const { version } = useTenantSelection();

  const storeId = useMemo(
    () => resolveStoreId(params?.id, search?.get("id") ?? null),
    [params?.id, search],
  );

  const [store, setStore] = useState<LoadedStore>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(storeId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchStore = async () => {
      if (!storeId) {
        setStore(null);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getStore(storeId);
        if (!cancelled) {
          setStore(data);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo cargar la informacion de la tienda.";
        if (!cancelled) {
          setStore(null);
          setError(message);
        }
        toast.error(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchStore();

    return () => {
      cancelled = true;
    };
  }, [storeId, version]);

  const title = storeId ? "Actualizar Tienda" : "Crear Tienda";

  return (
    <div className="flex min-h-screen items-start justify-center p-3">
      <Card className="w-full max-w-lg sm:max-w-md md:max-w-lg lg:max-w-2xl">
        <CardHeader className="pb-2 sm:pb-2">
          <CardTitle className="pt-5 text-center text-xl font-bold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, index) => (
                <Skeleton key={index} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <StoreForm store={store} storeId={storeId} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
