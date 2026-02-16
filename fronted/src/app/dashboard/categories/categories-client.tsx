"use client";

import { useEffect, useMemo, useState } from "react";

import { DataTable } from "./data-table";
import { columns, type Categories } from "./columns";
import { getCategories } from "./categories.api";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { TablePageSkeleton } from "@/components/table-page-skeleton";

type RawCategory = {
  id: string | number;
  name?: string | null;
  description?: string | null;
  status?: string | null;
  image?: string | null;
  createdAt?: string | Date | null;
};

export function CategoriesClient(): React.ReactElement {
  const { version } = useTenantSelection();
  const [categories, setCategories] = useState<Categories[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCategories() {
      setLoading(true);
      setError(null);
      try {
        const response = await getCategories();
        if (cancelled) return;
        const normalized = (Array.isArray(response) ? response : []).map(
          (item: RawCategory): Categories => ({
            id: String(item.id),
            name: item.name?.trim() ?? "Sin nombre",
            description: item.description ?? "",
            status: item.status ?? "ACTIVO",
            image: item.image ?? "",
            createdAt: item.createdAt
              ? new Date(item.createdAt)
              : new Date(),
          }),
        );
        setCategories(normalized);
      } catch (err) {
        if (cancelled) return;
        console.error("Error cargando categorias:", err);
        setError("No se pudieron cargar las categorias.");
        setCategories([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [version]);

  const content = useMemo(() => {
    if (loading) {
      return <TablePageSkeleton title={false} columns={3} rows={5} actions={false} />;
    }

    if (error) {
      return (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-6 text-destructive">
          {error}
        </div>
      );
    }

    return <DataTable columns={columns} data={categories} />;
  }, [categories, error, loading]);

  return (
    <section className="py-2 sm:py-6">
      <div className="container mx-auto px-1 sm:px-6 lg:px-8">
        <h1 className="px-5 text-2xl font-bold sm:text-3xl lg:text-4xl mb-4 sm:mb-6">
          Categorias
        </h1>
        {content}
      </div>
    </section>
  );
}
