"use client";

import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantSelection } from "@/context/tenant-selection-context";

import { getStore } from "../stores.api";
import StoreForm from "./store-form";
import { PageGuideButton } from "@/components/page-guide-dialog";
import { STORE_FORM_GUIDE_STEPS } from "./store-form-guide-steps";

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
  const { selection } = useTenantSelection();

  const storeId = useMemo(
    () => resolveStoreId(params?.id, search?.get("id") ?? null),
    [params?.id, search],
  );

  const { data: store = null, isLoading: loading, error: queryError } = useQuery({
    queryKey: [...queryKeys.stores.root(selection.orgId, selection.companyId), "detail", storeId],
    queryFn: async () => {
      try {
        return await getStore(storeId!);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo cargar la informacion de la tienda.";
        toast.error(message);
        throw err;
      }
    },
    enabled: selection.orgId !== null && Boolean(storeId),
  });

  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "No se pudo cargar la informacion de la tienda."
    : null;

  const title = storeId ? "Actualizar Tienda" : "Crear Tienda";

  return (
    <div className="flex min-h-screen items-start justify-center p-3">
      <Card className="w-full max-w-lg sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl">
        <CardHeader className="pb-2 sm:pb-2">
          <CardTitle className="flex items-center justify-center gap-2 pt-5 text-xl font-bold">
            {title}
            <PageGuideButton steps={STORE_FORM_GUIDE_STEPS} tooltipLabel="Guía del formulario" />
          </CardTitle>
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
